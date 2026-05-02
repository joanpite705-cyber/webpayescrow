REVOKE EXECUTE ON FUNCTION public.get_public_chains() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_public_tokens() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_chains() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_tokens() TO authenticated;