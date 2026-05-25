# “Database error checking email” / `createUser` fails (Supabase)

If **`auth.admin.createUser`** returns **`Database error checking email`** or **`unexpected_failure`**, the failure is **inside Supabase Auth / Postgres**, not in Stripe or Next.js.

## Auth logs: `unable to find user from email identity for duplicates: User not found`

If **Logs → Auth** shows this exact `error` string (often with `500: Database error checking email`), Supabase Auth (GoTrue) is checking **`auth.identities`** for duplicate emails and ended up in a bad state: it expected a linked **`auth.users`** row and **did not find it**.

**Typical cause:** **Orphan `auth.identities` rows** — `identity.user_id` points to a user id that **no longer exists** in `auth.users` (partial delete, bad import, or rare platform glitch).

**What to do**

1. In **SQL Editor**, run **`database/diagnose_auth_identities.sql`** (or the queries below).
2. If you see **orphan** identities (`LEFT JOIN auth.users` → no matching user), those rows are unsafe for Auth’s duplicate check.
3. **Backup / note the rows**, then remove only the **orphan** identity rows (usually `DELETE FROM auth.identities WHERE id = '…'` for each orphan `id`).  
   - Do **not** delete rows you don’t understand; if unsure, open a **Supabase support** ticket with the query results.
4. Retry **Authentication → Create user** with the same email.

```sql
-- Orphan identities (most important)
SELECT i.id, i.user_id, i.provider, i.identity_data
FROM auth.identities i
LEFT JOIN auth.users u ON u.id = i.user_id
WHERE u.id IS NULL;
```

After cleanup, **`createUser`** / Dashboard **Add user** should work again if this was the only issue.

## 0. Quick test: disable the customer signup trigger (local / staging only)

If you ever installed **`create_customer_on_signup_trigger.sql`**, an **`AFTER INSERT` on `auth.users`** can interfere with some Auth flows depending on project state.

In **Supabase → SQL Editor**, run:

`database/migrations/076_disable_auth_users_customer_trigger.sql`

Then **retry** onboarding → pay → finalize.

- If signup **works**, the trigger (or its function) was involved — fix **`074_customer_signup_trigger_skip_if_no_business.sql`** (re-apply function), then **recreate the trigger** from `database/create_customer_on_signup_trigger.sql` when you need customer auto-signup again.

- If it **still fails**, the cause is something else (another trigger, Auth hook, or DB issue) — continue below.

**Note:** Deferred owner signup calls `createUser` **without** `role: customer` on the first insert, so the customer trigger’s `IF role = 'customer'` branch usually **does not run**. If **076** doesn’t change anything, rely on **Postgres logs** (below) and **Authentication → Hooks** in the dashboard to find the real error.

## 1. Check Postgres logs

**Supabase Dashboard → Logs → Postgres Logs** (or **Database** → **Logs**)

Look for errors at the same time you hit **finalize** or **webhook**. Often you’ll see:

- A **trigger** on `auth.users` raising an error
- A **constraint** violation
- A **function** used by Auth hooks failing

## 2. List triggers on `auth.users`

Run in **SQL Editor**:

```sql
-- See database/diagnose_auth_users_triggers.sql in this repo
```

Review each trigger’s function. **Fix or remove** triggers that assume `role = 'customer'` or that insert into `public.customers` / `public.profiles` when metadata is still empty.

This repo includes:

- `database/migrations/074_customer_signup_trigger_skip_if_no_business.sql` — safe customer trigger when no business exists yet.

## 3. Apply migration 074 (if you use customer signup trigger)

If you installed `create_customer_on_signup_trigger.sql` earlier, run **`074`** so customer inserts don’t break `auth.users` inserts.

## 4. Auth hooks (Dashboard)

**Authentication → Hooks** (or **Database** webhooks on Auth): if a **Postgres** or **HTTP** hook runs on signup and errors, **createUser** can fail with a generic message.

## 5. Retry after code change

The app creates users in **two steps** where possible: **createUser** with email/password only, then **updateUser** for `full_name` / `role: owner`. Restart **`npm run dev`** and try checkout again.

## 6. Still stuck?

- Try **Authentication → Users → Add user** in the Dashboard with the **same email**. If that also fails, the problem is **100% project DB / triggers**, not the app.
- **Supabase** support forums / ticket with Postgres log lines.
