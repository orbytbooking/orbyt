# Step-by-Step: Getting API Credentials for Stripe & Authorize.net

Use this guide in your meeting (or share with your client) to collect everything needed for integration testing and production.

---

## Part 1: Stripe

Stripe is used so each business can accept card payments. You need **API keys** from the Stripe Dashboard.

### 1.1 Create or log into a Stripe account

1. Go to **https://dashboard.stripe.com**
2. Sign up (or log in) with the email that will own the Stripe account.
3. Complete any identity/verification steps Stripe asks for (needed for live payments later).

### 1.2 Switch between Test and Live mode

- At the top of the Stripe Dashboard you’ll see a toggle: **Test mode** (default) vs **Live mode**.
- **For integration testing:** leave it on **Test mode**.
- **For real payments:** switch to **Live mode** (after account is fully activated).

### 1.3 Get your API keys

1. In the left sidebar, click **Developers**.
2. Click **API keys**.
3. You’ll see two keys:
   - **Publishable key**  
     - Starts with `pk_test_` (test) or `pk_live_` (live).  
     - Safe to use in frontend (e.g. Stripe.js).  
     - Copy and save this; in our app this goes in the **Publish key** field.
   - **Secret key**  
     - Click **Reveal live key** or **Reveal test key**.  
     - Starts with `sk_test_` or `sk_live_`.  
     - **Never** share this or put it in frontend code.  
     - Copy and save; in our app this goes in the **Secret key** field.

### 1.4 What to give the developer (per business)

| What we need        | Where it is in Stripe              | Example (test)     |
|---------------------|------------------------------------|--------------------|
| Publishable key     | Developers → API keys (top card)  | `pk_test_51...`    |
| Secret key          | Developers → API keys (Reveal)    | `sk_test_51...`    |

- **Testing:** Use **test** keys (`pk_test_...`, `sk_test_...`).
- **Production:** Use **live** keys (`pk_live_...`, `sk_live_...`) from the same page when in **Live mode**.

### 1.5 Optional: Platform Stripe account (for billing businesses)

If the platform itself will charge businesses (subscriptions, fees):

1. Use a **separate** Stripe account for the platform (or the main company account).
2. Get that account’s **live** Publishable and Secret keys the same way (Developers → API keys, in Live mode).
3. Those keys go in **platform** config (e.g. env vars), not per-business.

---

## Part 2: Authorize.net

Authorize.net is used so each business can accept cards via their own merchant account. You need **API Login ID**, **Transaction Key**, and (optional) **Public Client Key**.

### 2.1 Create or log into an Authorize.net account

1. Go to **https://www.authorize.net** (or **https://developer.authorize.net** for sandbox).
2. Sign up for:
   - **Sandbox** (testing): https://sandbox.authorize.net  
   - **Production** (live): use the main Authorize.net merchant signup.
3. Log into the correct environment (sandbox vs production).

### 2.2 Get API Login ID and Transaction Key

1. In the merchant account, go to **Account** in the main menu.
2. Click **API Credentials & Keys** (or **Settings** → **Security Settings** → **API Credentials & Keys**, depending on layout).
3. In the **API Login ID and Transaction Key** section:
   - **API Login ID**  
     - A string like `5KP5uB7m6`.  
     - Copy it; this is the **API Login ID** we use in the app.
   - **Transaction Key**  
     - Click **New Transaction Key** if you don’t have one (or to rotate).  
     - Copy the key **once** (Authorize.net may not show it again).  
     - This is the **Transaction key** we use in the app. Store it securely.

### 2.3 Get Public Client Key (optional, for Accept.js / hosted forms)

1. Still under **API Credentials & Keys** (or **Manage Public Client Key**).
2. Find **Public Client Key**.
3. If there isn’t one, click **Generate Public Client Key** and select the same API Login ID.
4. Copy the key; this is the **Public Client Key** we use in the app (optional field).

### 2.4 Sandbox vs Production

- **Sandbox:** Use the **sandbox** Authorize.net account; get API Login ID + Transaction Key (and Public Client Key) from there. Use these for **testing**.
- **Production:** Use the **live** merchant account and its API Login ID + Transaction Key (and Public Client Key). Use these only when going **live**.

### 2.5 What to give the developer (per business)

| What we need        | Where it is in Authorize.net                    |
|---------------------|-------------------------------------------------|
| API Login ID        | Account → API Credentials & Keys               |
| Transaction Key     | Same page; create/reveal Transaction Key       |
| Public Client Key   | Same area; Generate Public Client Key (optional)|

In our app you’ll enter these in **Settings → Connect Payment Gateways → Authorize.Net** (API Login ID, Transaction key, Public Client Key).

---

## Quick checklist for your meeting

**Stripe (per business)**  
- [ ] Publishable key (`pk_test_...` or `pk_live_...`)  
- [ ] Secret key (`sk_test_...` or `sk_live_...`)  
- [ ] Confirmed Test vs Live mode  

**Authorize.net (per business)**  
- [ ] API Login ID  
- [ ] Transaction Key  
- [ ] Public Client Key (optional)  
- [ ] Confirmed Sandbox vs Production  

**Stripe (platform, if applicable)**  
- [ ] Platform Stripe account created  
- [ ] Live Publishable + Secret keys for platform billing  

After you have these, enter them in the app (Connect Payment Gateways) so we can run end-to-end integration tests.
