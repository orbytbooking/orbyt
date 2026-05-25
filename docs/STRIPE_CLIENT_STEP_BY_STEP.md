# How to Get Your Stripe Live Keys (For Platform Owner)

**Use this during the meeting or send it to the client.** One person follows the steps while the other watches or helps.

---

## Before you start

1. Log in to Stripe: **[dashboard.stripe.com](https://dashboard.stripe.com)**
2. Make sure your business is **verified** (Stripe will have asked for business details, ID, bank account). If you see “Activate your account” or “Complete verification,” do that first—otherwise you won’t see Live mode.
3. **Switch to Live mode:** at the **top right** of the dashboard there’s a toggle that says **Test mode** / **Live mode**. Click it so it says **Live mode** (not Test). All steps below must be done in **Live** mode.

---

## Step 1: Get the two API keys

1. In the left sidebar, click **Developers**.
2. Click **API keys**.
3. You’ll see two keys:

   | Key name           | What to do |
   |--------------------|------------|
   | **Publishable key** | Click **Reveal** or copy. It starts with `pk_live_...`. Send this to your developer. |
   | **Secret key**      | Click **Reveal** or copy. It starts with `sk_live_...`. **Keep this private.** Send it to your developer in a secure way (e.g. password manager, secure link), not in a normal chat. |

4. Send both keys to your developer (publishable + secret). They need both for the live site.

---

## Step 2: Create the webhook and get the secret

1. Still in **Developers**, click **Webhooks** (in the left sidebar).
2. Click **Add endpoint** (or **Add an endpoint**).
3. **Endpoint URL:** your developer will give you the exact URL. It will look like:
   - `https://yourdomain.com/api/stripe/webhook`  
   Replace `yourdomain.com` with your real live site domain. If you’re not sure, ask: “What URL should I put here?”
4. **Events to send:** click **Select events** and choose at least:
   - `checkout.session.completed`
   (Your developer may ask for a couple more; they can tell you.)
5. Click **Add endpoint** (or **Save**).
6. On the new webhook’s page, you’ll see **Signing secret** (starts with `whsec_...`). Click **Reveal** and copy it.
7. Send this **Signing secret** to your developer. They need it for the live site.

---

## Quick checklist for the client

- [ ] Logged in at [dashboard.stripe.com](https://dashboard.stripe.com)
- [ ] Toggled to **Live mode** (top right)
- [ ] **Developers** → **API keys** → copied **Publishable key** (`pk_live_...`) and **Secret key** (`sk_live_...`) and sent to developer
- [ ] **Developers** → **Webhooks** → **Add endpoint** with the URL from developer → selected `checkout.session.completed` → copied **Signing secret** (`whsec_...`) and sent to developer

---

## If something doesn’t look the same

- Stripe sometimes changes the dashboard. **Developers** and **API keys** / **Webhooks** are usually in the left menu. If you can’t find them, say what you see and your developer can guide you.
- If you don’t see a **Live mode** toggle, your account may not be fully verified yet. Complete any “Activate” or “Verify” steps Stripe shows.

---

**Short version to send in chat:**  
“Log in to dashboard.stripe.com, switch to Live mode (top right), then go to Developers → API keys and copy the Publishable and Secret keys, and to Developers → Webhooks, add the URL I give you and copy the Signing secret. Send me those three things securely.”
