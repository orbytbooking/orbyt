# Stripe webhooks on localhost

Stripe **cannot** send webhooks to `http://localhost:3000` unless you use the **Stripe CLI** to forward events.

If payment succeeds in the Stripe Dashboard but **no Supabase user** is created, the webhook usually never hit your app.

## 1. Forward webhooks to your dev server

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI prints a **signing secret** starting with `whsec_...`. Put that in **`.env`**:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart `npm run dev`. **Important:** this secret changes each time you run `stripe listen` unless you use a fixed endpoint config.

## 2. Production

In [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks), add:

- **URL:** `https://your-domain.com/api/stripe/webhook`
- **Events:** at least `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`

Copy the endpoint **signing secret** into `STRIPE_WEBHOOK_SECRET` for that deployment.

## 3. Recover after a successful payment (no account yet)

1. In Stripe → **Payments** (or **Customers** → payment) open the charge.
2. Find the **Checkout Session** id (`cs_test_...` or `cs_live_...`).
3. Open in your browser (dev):

   `http://localhost:3000/auth/onboarding/complete?stripe_session_id=cs_...`

   That calls **`/api/auth/finalize-pending-checkout`**, which creates the user if the webhook did not.

## 4. Resend a webhook (Dashboard)

**Developers → Events** → open `checkout.session.completed` for that payment → **Resend** to your endpoint (only works if the endpoint URL is reachable, e.g. production or CLI forwarding).
