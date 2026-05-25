-- Run in Supabase SQL Editor when signUp fails with "Database error saving new user"
--
-- Business-owner signup sends role = 'owner' in user metadata. The repo's customer trigger
-- only runs for role = 'customer', so owner failures usually mean a *different* trigger or
-- hook on auth.users — list them here and inspect their function bodies in Postgres Logs.

SELECT
  t.tgname AS trigger_name,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND NOT t.tgisinternal
ORDER BY t.tgname;
