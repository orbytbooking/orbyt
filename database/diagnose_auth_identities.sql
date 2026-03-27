-- Run when Auth logs show:
--   "unable to find user from email identity for duplicates: User not found"
-- GoTrue checks auth.identities for duplicate emails; orphaned rows break createUser.

-- 1) Orphan identities: identity row points to a missing auth.users row
SELECT i.id AS identity_id, i.user_id, i.provider, i.identity_data
FROM auth.identities i
LEFT JOIN auth.users u ON u.id = i.user_id
WHERE u.id IS NULL;

-- 2) Rows for a specific email (adjust email). Email is usually in identity_data.
SELECT i.id, i.user_id, i.provider, i.identity_data, u.email AS users_table_email
FROM auth.identities i
LEFT JOIN auth.users u ON u.id = i.user_id
WHERE LOWER(TRIM(COALESCE(i.identity_data->>'email', ''))) =
      LOWER(TRIM('replace-with-email@example.com'));
