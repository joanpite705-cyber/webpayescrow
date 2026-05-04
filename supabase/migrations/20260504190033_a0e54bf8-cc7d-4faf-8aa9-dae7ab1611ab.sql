CREATE TABLE IF NOT EXISTS public.app_config (
  id integer PRIMARY KEY DEFAULT 1,
  walletconnect_project_id text,
  alchemy_api_key text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_config_singleton CHECK (id = 1)
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage app_config" ON public.app_config
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.app_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_walletconnect_project_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT walletconnect_project_id FROM public.app_config WHERE id = 1;
$$;