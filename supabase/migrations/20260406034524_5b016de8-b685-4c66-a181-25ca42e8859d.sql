ALTER TABLE public.escrows
ADD COLUMN IF NOT EXISTS buyer_username TEXT,
ADD COLUMN IF NOT EXISTS seller_username TEXT;

CREATE INDEX IF NOT EXISTS idx_escrows_buyer_username_lower ON public.escrows (lower(buyer_username));
CREATE INDEX IF NOT EXISTS idx_escrows_seller_username_lower ON public.escrows (lower(seller_username));

ALTER TABLE public.escrow_messages
ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'user',
ADD COLUMN IF NOT EXISTS message_label TEXT;

CREATE TABLE IF NOT EXISTS public.telegram_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL UNIQUE,
  telegram_username TEXT,
  flow TEXT NOT NULL,
  step TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  linked_profile_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_sessions_expires_at ON public.telegram_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_telegram_sessions_linked_profile_id ON public.telegram_sessions (linked_profile_id);

ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view telegram sessions" ON public.telegram_sessions;
CREATE POLICY "Admins can view telegram sessions"
ON public.telegram_sessions
FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage telegram sessions" ON public.telegram_sessions;
CREATE POLICY "Admins can manage telegram sessions"
ON public.telegram_sessions
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_telegram_sessions_updated_at ON public.telegram_sessions;
CREATE TRIGGER update_telegram_sessions_updated_at
BEFORE UPDATE ON public.telegram_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.escrow_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escrow_id UUID NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  release_type TEXT NOT NULL DEFAULT 'text',
  title TEXT,
  content TEXT,
  file_url TEXT,
  requires_moderator_review BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escrow_releases_escrow_id ON public.escrow_releases (escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_releases_sender_id ON public.escrow_releases (sender_id);

ALTER TABLE public.escrow_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties and staff can view escrow releases" ON public.escrow_releases;
CREATE POLICY "Parties and staff can view escrow releases"
ON public.escrow_releases
FOR SELECT
USING (public.is_escrow_party(escrow_id) OR public.is_admin_or_moderator());

DROP POLICY IF EXISTS "Sellers and staff can create escrow releases" ON public.escrow_releases;
CREATE POLICY "Sellers and staff can create escrow releases"
ON public.escrow_releases
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    public.is_admin_or_moderator()
    OR EXISTS (
      SELECT 1
      FROM public.escrows e
      WHERE e.id = escrow_id
        AND e.seller_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Owners and staff can update escrow releases" ON public.escrow_releases;
CREATE POLICY "Owners and staff can update escrow releases"
ON public.escrow_releases
FOR UPDATE
USING (auth.uid() = sender_id OR public.is_admin_or_moderator())
WITH CHECK (auth.uid() = sender_id OR public.is_admin_or_moderator());

DROP POLICY IF EXISTS "Staff can delete escrow releases" ON public.escrow_releases;
CREATE POLICY "Staff can delete escrow releases"
ON public.escrow_releases
FOR DELETE
USING (public.is_admin_or_moderator());

DROP TRIGGER IF EXISTS update_escrow_releases_updated_at ON public.escrow_releases;
CREATE TRIGGER update_escrow_releases_updated_at
BEFORE UPDATE ON public.escrow_releases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.link_pending_escrows_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.telegram_username IS NULL OR btrim(NEW.telegram_username) = '' THEN
    RETURN NEW;
  END IF;

  UPDATE public.escrows
  SET buyer_id = NEW.id,
      updated_at = now()
  WHERE buyer_id IS NULL
    AND buyer_username IS NOT NULL
    AND lower(buyer_username) = lower(NEW.telegram_username);

  UPDATE public.escrows
  SET seller_id = NEW.id,
      updated_at = now()
  WHERE seller_id IS NULL
    AND seller_username IS NOT NULL
    AND lower(seller_username) = lower(NEW.telegram_username);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_pending_escrows_for_profile_trigger ON public.profiles;
CREATE TRIGGER link_pending_escrows_for_profile_trigger
AFTER INSERT OR UPDATE OF telegram_username ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.link_pending_escrows_for_profile();

UPDATE public.escrows e
SET buyer_id = p.id,
    updated_at = now()
FROM public.profiles p
WHERE e.buyer_id IS NULL
  AND e.buyer_username IS NOT NULL
  AND p.telegram_username IS NOT NULL
  AND lower(e.buyer_username) = lower(p.telegram_username);

UPDATE public.escrows e
SET seller_id = p.id,
    updated_at = now()
FROM public.profiles p
WHERE e.seller_id IS NULL
  AND e.seller_username IS NOT NULL
  AND p.telegram_username IS NOT NULL
  AND lower(e.seller_username) = lower(p.telegram_username);