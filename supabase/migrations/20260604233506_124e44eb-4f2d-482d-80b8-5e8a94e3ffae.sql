
CREATE TABLE public.scam_reports (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  handle text not null,
  reporter_email text,
  reporter_name text,
  description text not null,
  evidence_url text,
  amount_lost numeric,
  crypto_type text,
  status text not null default 'pending',
  verified_by uuid,
  verified_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX scam_reports_handle_idx ON public.scam_reports (lower(handle));
CREATE INDEX scam_reports_platform_idx ON public.scam_reports (platform);
CREATE INDEX scam_reports_status_idx ON public.scam_reports (status);

GRANT SELECT, INSERT ON public.scam_reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scam_reports TO authenticated;
GRANT ALL ON public.scam_reports TO service_role;

ALTER TABLE public.scam_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_insert_scam_reports" ON public.scam_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "public_read_verified" ON public.scam_reports
  FOR SELECT TO anon, authenticated USING (status = 'verified');

CREATE POLICY "admin_read_all" ON public.scam_reports
  FOR SELECT TO authenticated USING (public.is_admin_or_moderator());

CREATE POLICY "admin_update" ON public.scam_reports
  FOR UPDATE TO authenticated USING (public.is_admin_or_moderator());

CREATE POLICY "admin_delete" ON public.scam_reports
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_scam_reports_updated_at BEFORE UPDATE ON public.scam_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public RPC: aggregate verified report count for a handle (case-insensitive)
CREATE OR REPLACE FUNCTION public.search_scam_reports(_handle text)
RETURNS TABLE(
  id uuid,
  platform text,
  handle text,
  description text,
  amount_lost numeric,
  crypto_type text,
  evidence_url text,
  verified_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, platform, handle, description, amount_lost, crypto_type, evidence_url, verified_at, created_at
  FROM public.scam_reports
  WHERE status = 'verified'
    AND lower(handle) = lower(btrim(_handle))
  ORDER BY verified_at DESC NULLS LAST, created_at DESC;
$$;
