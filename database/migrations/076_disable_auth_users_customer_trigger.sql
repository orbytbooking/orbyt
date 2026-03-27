-- TEMPORARY: remove customer auto-create trigger on auth.users
-- Use this if owner signup / auth.admin.createUser fails with "Database error checking email"
-- and you need to confirm the trigger is the cause.
--
-- After testing:
--   Re-run database/create_customer_on_signup_trigger.sql (or restore trigger) if you still need
--   automatic customer rows on customer signups.
--
-- Safe: business-owner signups do not use role=customer; they are unaffected by this trigger
-- being absent (the trigger only ran for role=customer).

DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
