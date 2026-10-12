-- The "Profiles are public unless banned" policy calls public.is_admin(), and Postgres
-- requires EXECUTE on it for every role the policy applies to, including anon.
-- For anonymous callers auth.uid() is null, so is_admin() always returns false: safe to grant.
grant execute on function public.is_admin() to anon;
