CREATE TABLE IF NOT EXISTS public.keepalive_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'cron',
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.keepalive_pings TO service_role;
GRANT SELECT ON public.keepalive_pings TO authenticated;

ALTER TABLE public.keepalive_pings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view keepalive pings" ON public.keepalive_pings;
CREATE POLICY "Admins can view keepalive pings"
ON public.keepalive_pings FOR SELECT TO authenticated
USING (public.is_admin());

CREATE INDEX IF NOT EXISTS keepalive_pings_created_at_idx ON public.keepalive_pings (created_at DESC);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;