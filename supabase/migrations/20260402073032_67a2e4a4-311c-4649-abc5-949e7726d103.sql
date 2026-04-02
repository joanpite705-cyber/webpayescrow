
-- Platform settings table (singleton)
CREATE TABLE public.platform_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  fee_percentage numeric NOT NULL DEFAULT 2.0,
  signup_link text DEFAULT '',
  safety_message text DEFAULT '⚠️ NEVER trade outside this platform. All trades must go through escrow. Report any suspicious activity immediately.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL USING (public.is_admin());
CREATE POLICY "All authenticated can view settings" ON public.platform_settings FOR SELECT TO authenticated USING (true);

INSERT INTO public.platform_settings (id) VALUES (1);

-- Add columns to escrows
ALTER TABLE public.escrows
  ADD COLUMN accepted_at timestamptz,
  ADD COLUMN payment_deadline timestamptz,
  ADD COLUMN fee_amount numeric DEFAULT 0,
  ADD COLUMN seller_wallet_address text,
  ADD COLUMN seller_network text;

-- Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN is_verified boolean DEFAULT false,
  ADD COLUMN positive_ratings integer DEFAULT 0,
  ADD COLUMN negative_ratings integer DEFAULT 0,
  ADD COLUMN language text DEFAULT 'en';

-- Feedback table
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id uuid NOT NULL REFERENCES public.escrows(id),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  rating text NOT NULL CHECK (rating IN ('positive', 'negative')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(escrow_id, from_user)
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feedback" ON public.feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escrow parties can create feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (
  public.is_escrow_party(escrow_id) AND auth.uid() = from_user
);

-- Allow all authenticated users to view other profiles (for counterpart lookup)
CREATE POLICY "Authenticated can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Drop old restrictive select policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Trigger for platform_settings updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update rating counts
CREATE OR REPLACE FUNCTION public.update_rating_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rating = 'positive' THEN
    UPDATE profiles SET positive_ratings = positive_ratings + 1 WHERE id = NEW.to_user;
  ELSE
    UPDATE profiles SET negative_ratings = negative_ratings + 1 WHERE id = NEW.to_user;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_feedback_insert
  AFTER INSERT ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_rating_counts();

-- Enable realtime for escrow_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrows;
