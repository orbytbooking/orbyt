# Platform billing (Orbyt workspace subscriptions)

Businesses pay **Orbyt** for their workspace plan. That revenue can go through **Stripe** or **Authorize.Net** (your **platform** merchant account). This is separate from **customer booking** payments (each tenant may use Stripe Connect or their own Stripe / Authorize.Net keys under **Admin → Billing**).

---

## Choose a provider (environment)

| Env | Effect |
|-----|--------|
| `PLATFORM_BILLING_PROVIDER=stripe` | Platform checkout uses Stripe only (needs Stripe Price IDs). |
| `PLATFORM_BILLING_PROVIDER=authorize_net` | Platform checkout uses Authorize.Net Accept Hosted + ARB. |
| *(unset)* | If `PLATFORM_AUTHORIZE_NET_API_LOGIN_ID` **and** `PLATFORM_AUTHORIZE_NET_TRANSACTION_KEY` are set → **Authorize.Net**. Otherwise → **Stripe**. |

**Authorize.Net sandbox vs live:** `AUTHORIZE_NET_ENVIRONMENT=production` for live API; omit or use non-`production` for sandbox (`apitest.authorize.net`).

**App URL:** `NEXT_PUBLIC_APP_URL` must match the public site (used for Accept Hosted return URLs).

---

## 1. Database

Run migrations (in order as needed):

- `071_platform_subscription_stripe.sql` — Stripe columns on plans / `platform_subscriptions` / `platform_payments`
- `075_pending_owner_onboarding.sql` — deferred owner signup (encrypted password until payment completes)
- `105_platform_billing_authorize_net.sql` — Authorize.Net columns + `platform_authorize_net_checkout_sessions` (required for platform Authorize.Net)

Pending passwords use a key derived from **`SUPABASE_SERVICE_ROLE_KEY`**. Optionally set **`PENDING_OWNER_SECRET`**.

Plans are **Starter**, **Growth**, **Premium** — slugs `starter`, `growth`, `premium`. Amounts in **`platform_subscription_plans.amount_cents`**. For **Authorize.Net platform checkout**, each paid plan must have **`amount_cents` > 0** (no $0 hosted checkout).

---

## 2A. Stripe (platform)

1. **Products → Prices** — recurring prices matching `platform_subscription_plans.billing_interval` (`monthly` / `yearly`).
2. **Link prices:** set `platform_subscription_plans.stripe_price_id` **or** env `STRIPE_PLATFORM_PRICE_STARTER`, `STRIPE_PLATFORM_PRICE_GROWTH`, `STRIPE_PLATFORM_PRICE_PREMIUM` (legacy: `STRIPE_PLATFORM_PRICE_PRO` / `STRIPE_PLATFORM_PRICE_ENTERPRISE`).
3. **Customer portal** — [Stripe Billing portal](https://dashboard.stripe.com/settings/billing/portal) for “Manage subscription”.
4. **Webhooks** — `https://<your-domain>/api/stripe/webhook` — at least: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`. Set **`STRIPE_WEBHOOK_SECRET`**.

**Env:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for embedded platform checkout.

Local dev: **`docs/STRIPE_LOCAL_WEBHOOKS.md`**.

---

## 2B. Authorize.Net (platform)

Use a **dedicated Orbyt merchant account** (not a tenant’s booking keys).

### Credentials (server only)

| Variable | Source |
|----------|--------|
| `PLATFORM_AUTHORIZE_NET_API_LOGIN_ID` | Merchant UI → API Credentials & Keys |
| `PLATFORM_AUTHORIZE_NET_TRANSACTION_KEY` | Same (may only show once when generated) |

### Account capabilities (must be enabled)

- **Accept Hosted** — `getHostedPaymentPage` for the first charge.
- **Customer Information Manager (CIM)** — hosted request uses `createProfile: true` so ARB can use stored payment profiles.
- **Automated Recurring Billing (ARB)** — recurring workspace fee after the first payment.

### Return URL / transaction id

After payment, the browser should hit **`/api/platform/billing/authorize-net/return`** with a **transaction id** (common query names: `transId`, `transaction_id`, …) or POST body fields the gateway sends. If the id is missing, configure Authorize.Net return / relay settings or extend the route to match your merchant’s response format.

### What you do **not** need for current platform code

- **Public Client Key** — not used for this server-side Accept Hosted flow (tenants may still use it in admin Billing for their own integration).
- **Stripe Price IDs** — not used for platform billing when Authorize.Net is selected.

### Limitations (current app)

- **Self-serve portal** (card update / cancel) is **not** wired for platform Authorize.Net — `/api/platform/billing/portal` returns 501; owners contact support or use the Authorize.Net merchant UI.
- **ARB renewal** charges may not appear in `platform_payments` until you add **Authorize.Net webhooks** (future work).

---

## 3. App routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/platform/billing/status?businessId=` | Plan + subscription + `platformBillingProvider` (owner) |
| `POST` | `/api/platform/billing/ensure-subscription` | `{ businessId, planSlug? }` — upsert `platform_subscriptions` |
| `POST` | `/api/platform/billing/create-checkout` | Logged-in owner → Stripe **or** Authorize.Net (from `PLATFORM_BILLING_PROVIDER` / env) |
| `POST` | `/api/platform/billing/create-checkout-pending` | Deferred signup → same provider |
| `GET`/`POST` | `/api/platform/billing/authorize-net/return` | Authorize.Net return handler (completes ARB + DB sync) |
| `POST` | `/api/auth/pending-owner-register` | Saves onboarding → `{ pendingId }` |
| `POST` | `/api/auth/finalize-pending-checkout` | Stripe: `{ stripeSessionId }` — Authorize.Net: `{ pendingOwnerId, provider: "authorize_net" }` |
| `POST` | `/api/platform/billing/portal` | Stripe Customer Portal only (501 if platform is Authorize.Net) |

**Deferred signup (Stripe):** … → Stripe → webhook `processPendingOwnerCheckout` → `/auth/onboarding/complete?stripe_session_id=…` → finalize.

**Deferred signup (Authorize.Net):** … → Accept Hosted → `/api/platform/billing/authorize-net/return` → user + business created → redirect to `/auth/onboarding/complete?pending_id=…&provider=authorize_net` → finalize.

---

## 4. Admin UI

**Admin → Settings → Account → Plans** (`BillingPlatformSubscription`) — upgrade flow and (Stripe only) “Manage subscription”.

---

## 5. Tenant vs platform (do not confuse)

| Integration | Where it lives | Env / DB |
|-------------|----------------|----------|
| **Orbyt SaaS fee** (this doc) | `PLATFORM_*` Authorize.Net **or** main Stripe + `STRIPE_SECRET_KEY` | Server env |
| **Booking payments** | Per business: Stripe Connect / keys **or** tenant Authorize.Net in **Admin → Billing** | `businesses.*` |

Tenants can keep **Stripe as an option** for bookings regardless of platform billing provider.

---

## 6. References

- Tenant Authorize.Net credential steps: **`docs/INTEGRATION_CREDENTIALS_GUIDE.md`** (Part 2) — same *types* of keys as platform, different env names (`PLATFORM_*` for Orbyt only).
- Env template: **`.env.example`**.
