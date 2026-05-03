CREATE OR REPLACE FUNCTION public.get_bot_username()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bot_username FROM public.bot_config WHERE is_active = true LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_bot_username() TO anon, authenticated;