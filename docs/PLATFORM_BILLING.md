# Platform billing (Orbyt subscriptions via Stripe)

Businesses pay **Orbyt** for their workspace plan using your **main** Stripe account (`STRIPE_SECRET_KEY`). This is separate from **customer booking** payments (which may use Connect or the business’s own keys).

## 1. Database

Run migrations (in order as needed):

- `database/migrations/071_platform_subscription_stripe.sql` — Stripe columns on plans / `platform_subscriptions` / `platform_payments`
- `database/migrations/075_pending_owner_onboarding.sql` — **deferred owner signup** (email + encrypted password + payload until Stripe payment succeeds)

Pending passwords are encrypted using a key derived from **`SUPABASE_SERVICE_ROLE_KEY`** (no extra env). Optionally set **`PENDING_OWNER_SECRET`** if you want an encryption key independent of service-role rotation.

## 2. Stripe Dashboard

1. **Products → Prices**  
   Create recurring prices for **Pro** and **Enterprise** (monthly or yearly, matching `platform_subscription_plans.billing_interval`).

2. **Link prices** (pick one):
   - Set `platform_subscription_plans.stripe_price_id` in Supabase for each plan row, **or**
   - Set env vars: `STRIPE_PLATFORM_PRICE_STARTER`, `STRIPE_PLATFORM_PRICE_GROWTH`, `STRIPE_PLATFORM_PRICE_PREMIUM` (see `.env.example`).  
     Legacy: `STRIPE_PLATFORM_PRICE_PRO` / `STRIPE_PLATFORM_PRICE_ENTERPRISE` still resolve for Growth / Premium.

Plans are **Starter** ($19), **Growth** ($49), **Premium** ($110) — slugs `starter`, `growth`, `premium`. Run migration `072_platform_plans_starter_growth_premium.sql` if upgrading from `pro`/`enterprise`.

3. **Customer portal**  
   [Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal) — enable so “Manage subscription” works.

4. **Webhooks**  
   Endpoint: `https://<your-domain>/api/stripe/webhook`  
   Subscribe at least to:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`  

   Set `STRIPE_WEBHOOK_SECRET` to the signing secret for this endpoint.

   **Local dev:** Stripe cannot reach `localhost` without the Stripe CLI — see **`docs/STRIPE_LOCAL_WEBHOOKS.md`**. If payment succeeds but no user is created, the webhook likely never hit your machine.

## 3. App routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/platform/billing/status?businessId=` | Current plan + recent platform payments (owner) |
| `POST` | `/api/platform/billing/ensure-subscription` | Body `{ businessId, planSlug? }` — upsert `platform_subscriptions` (owner); used after onboarding creates a business |
| `POST` | `/api/platform/billing/create-checkout` | Body `{ businessId, planSlug, successUrl?, cancelUrl? }` → Stripe Checkout (subscription); requires logged-in owner |
| `POST` | `/api/platform/billing/create-checkout-pending` | Body `{ pendingId, planSlug? }` → Checkout **before** auth user exists (deferred signup) |
| `POST` | `/api/auth/pending-owner-register` | Saves onboarding + encrypted password → `{ pendingId }` |
| `POST` | `/api/auth/finalize-pending-checkout` | After Stripe success: creates session tokens (magic link) |
| `POST` | `/api/platform/billing/portal` | Body `{ businessId }` → Stripe Customer Portal |

### Onboarding (deferred signup)

New owners: **no** `auth.users` row until Stripe payment succeeds. Flow: signup form → onboarding → **`pending-owner-register`** → **`create-checkout-pending`** → Stripe → webhook **`processPendingOwnerCheckout`** creates user + business + billing → browser lands on **`/auth/onboarding/complete`** → **`finalize-pending-checkout`** returns Supabase tokens → dashboard.

Legacy path (already logged in, business exists, payment still pending): **ensure-subscription** + **create-checkout** with cookies.

> If Supabase requires **email confirmation** before a session exists, API calls may return 401 until the user confirms — configure project auth accordingly or test with confirmation disabled.

## 4. Admin UI

**Admin → Settings → Account → Plans** uses `BillingPlatformSubscription` to upgrade and open the portal.

## 5. Behavior

- **Starter** still uses Stripe Checkout for new signups (deferred flow). `amount_cents = 0` in DB is OK if a real **Price ID** is configured.
- After successful Checkout, the webhook syncs `platform_subscriptions`, updates `businesses.plan`, and `invoice.paid` inserts into `platform_payments`.
- Canceling via Stripe sets subscription to canceled and downgrades `businesses.plan` to `starter`.
