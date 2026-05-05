ALTER TABLE public.sweep_jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sweep_jobs;