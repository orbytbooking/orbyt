# Stripe Live Mode – Meeting Guide (Platform Owner)

Use this with your client/platform owner to switch from Stripe **test** mode to **live** mode. Live mode requires a verified Stripe account (business identity), which only the business owner can complete.

---

## 1. Why you’re stuck in test mode

- **Test keys** (`sk_test_...`, `pk_test_...`) don’t move money. They’re for development only.
- **Live keys** (`sk_live_...`, `pk_live_...`) process real payments.
- Stripe **business verification** (ID, address, bank, etc.) is required for live mode. That must be done by the **platform owner** in their own Stripe account. You can’t verify on their behalf.

So: the owner creates/verifies the Stripe account and gives you the **live** API keys; you plug those into the app.

---

## 2. What the platform owner needs to do

### A. Have a Stripe account (or create one)

- Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register).
- Use the **business email** and **legal business name** that will appear on statements and receipts.

### B. Complete Stripe identity verification (required for live)

In [Stripe Dashboard](https://dashboard.stripe.com) → **Settings** → **Account** (or **Activate your account**):

- **Business type**: Sole proprietorship, company, or nonprofit.
- **Business details**: Legal name, address, phone, website (if any).
- **Representative**: Owner/authorized person (name, DOB, last 4 of SSN or national ID where required).
- **Bank account**: For payouts (where Stripe sends money).
- **Identity**: Photo ID if Stripe asks.

Until this is done, Stripe will not enable live mode. No workaround.

### C. Get live API keys

After verification (or if the account is already verified):

1. In Stripe Dashboard, switch from **Test mode** to **Live mode** (toggle top-right).
2. Go to **Developers** → **API keys**.
3. Copy:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`) — treat as a password; never commit to git or share in chat/email.

### D. Create a live webhook (you’ll need the URL from your deployment)

- **Developers** → **Webhooks** → **Add endpoint** (in **Live** mode).
- **Endpoint URL**: your production URL, e.g. `https://yourdomain.com/api/stripe/webhook`.
- **Events to send**: at minimum `checkout.session.completed` (add others your app uses if any).
- After saving, Stripe shows a **Signing secret** (starts with `whsec_...`). The owner (or you, with access) copies this for the app’s env.

---

## 3. What you need from the client (summary)

| Item | Who provides | Where they get it |
|------|----------------|-------------------|
| **Live Publishable key** | Platform owner | Dashboard → Developers → API keys (Live) → Publishable key |
| **Live Secret key** | Platform owner | Dashboard → Developers → API keys (Live) → Secret key |
| **Live Webhook signing secret** | Platform owner (or you, with access) | Dashboard → Developers → Webhooks (Live) → endpoint → Signing secret |
| **Verified Stripe account** | Platform owner | Complete verification in Dashboard (Settings / Activate) |

**Secure handoff:** Prefer a password manager, secure file share, or encrypted channel — not plain email or Slack for the **secret** key.

---

## 4. What you do in the app (after you have the keys)

Your app already reads these env vars (see `.env.example`). For **live**:

1. **Production environment** (e.g. Vercel, Railway, or your host):
   - `STRIPE_SECRET_KEY` = `sk_live_...` (from client)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...` (from client)
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...` (from the **live** webhook endpoint)

2. **Webhook URL** (so client can create the endpoint):
   - Production: `https://<your-production-domain>/api/stripe/webhook`
   - Tell the client this URL when they add the webhook in Stripe (Live).

3. **Stripe Connect** (your app uses Connect for businesses/providers):
   - Connect accounts are created under the **platform** Stripe account (the one whose live keys you use). So the same account that gives you `sk_live_` / `pk_live_` is the Connect platform. No extra “Connect” keys — just the same live keys.
   - After switching to live keys, the platform owner (or each business) may need to complete Stripe Connect onboarding again in **live** (e.g. “Connect account” in Admin → Settings → Billing), because test Connect accounts don’t carry over to live.

4. **Redeploy** after changing env vars so the app uses the new keys.

---

## 5. Quick meeting checklist

- [ ] **Client** has (or will create) a Stripe account with the **business** that will own the platform.
- [ ] **Client** will complete (or has completed) Stripe **identity/business verification** so live mode is enabled.
- [ ] **Client** will provide **live** Publishable key and **live** Secret key (securely).
- [ ] **You** provide the **live webhook URL**: `https://<production-domain>/api/stripe/webhook`.
- [ ] **Client** (or you with access) creates a **live** webhook in Dashboard and provides the **webhook signing secret**.
- [ ] **You** set production env: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (all live values).
- [ ] **You** redeploy; then run a small real payment (e.g. smallest amount) to confirm checkout and webhook.
- [ ] **Stripe Connect**: Confirm with client that they’ll re-onboard in live (Admin → Billing / Connect) if they use Connect.

---

## 6. Optional: keep test and live separate

- **Development:** Keep using `sk_test_` / `pk_test_` and test webhook in `.env` (or `.env.local`) so you can develop without touching real money.
- **Production:** Use only live keys and live webhook secret in the production env. Your app already shows “Stripe test mode” vs “Stripe live mode” in the Billing UI based on the publishable key prefix.

---

## 7. Links to share with the client

- Create Stripe account: [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
- Dashboard (after login): [https://dashboard.stripe.com](https://dashboard.stripe.com) — use the **Live** toggle and **Developers** → **API keys** and **Webhooks**
- Stripe verification/activation: [https://stripe.com/docs/connect/identity-verification](https://stripe.com/docs/connect/identity-verification) (and in-Dashboard prompts)

---

**TL;DR for the client:** “We need to use your Stripe account in live mode so we can charge real cards. You need to verify your business in Stripe, then give us the live API keys and the webhook signing secret for our production URL. We’ll plug those into the app and then we can test with a real payment.”
