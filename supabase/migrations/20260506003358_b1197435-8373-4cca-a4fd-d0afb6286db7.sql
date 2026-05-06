ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payer_id uuid,
  ADD COLUMN IF NOT EXISTS payer_username text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

UPDATE public.payments SET paid_at = COALESCE(paid_at, created_at);