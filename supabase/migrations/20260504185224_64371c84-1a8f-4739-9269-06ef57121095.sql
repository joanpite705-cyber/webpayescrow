-- Add email columns to escrows for primary counterpart matching
ALTER TABLE public.escrows
  ADD COLUMN IF NOT EXISTS buyer_email TEXT,
  ADD COLUMN IF NOT EXISTS seller_email TEXT;

CREATE INDEX IF NOT EXISTS idx_escrows_buyer_email_lower ON public.escrows (lower(buyer_email));
CREATE INDEX IF NOT EXISTS idx_escrows_seller_email_lower ON public.escrows (lower(seller_email));

-- Update profile-link trigger to also match by email
CREATE OR REPLACE FUNCTION public.link_pending_escrows_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;

  -- Match by telegram username (existing)
  IF NEW.telegram_username IS NOT NULL AND btrim(NEW.telegram_username) <> '' THEN
    UPDATE public.escrows
    SET buyer_id = NEW.id, updated_at = now()
    WHERE buyer_id IS NULL AND buyer_username IS NOT NULL
      AND lower(buyer_username) = lower(NEW.telegram_username);

    UPDATE public.escrows
    SET seller_id = NEW.id, updated_at = now()
    WHERE seller_id IS NULL AND seller_username IS NOT NULL
      AND lower(seller_username) = lower(NEW.telegram_username);
  END IF;

  -- Match by email (new — primary)
  IF user_email IS NOT NULL THEN
    UPDATE public.escrows
    SET buyer_id = NEW.id, updated_at = now()
    WHERE buyer_id IS NULL AND buyer_email IS NOT NULL
      AND lower(buyer_email) = lower(user_email);

    UPDATE public.escrows
    SET seller_id = NEW.id, updated_at = now()
    WHERE seller_id IS NULL AND seller_email IS NOT NULL
      AND lower(seller_email) = lower(user_email);
  END IF;

  RETURN NEW;
END;
$$;

-- Re-trigger on profile insert (already exists from previous migration; ensure it stays)
DROP TRIGGER IF EXISTS link_pending_escrows_for_profile_trigger ON public.profiles;
CREATE TRIGGER link_pending_escrows_for_profile_trigger
AFTER INSERT OR UPDATE OF telegram_username ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.link_pending_escrows_for_profile();

-- Make telegram_username optional in signup: handle_new_user already nullable; nothing to change.