# Worldpay API usage in this app

## Developer account vs merchant account

- **Developer account only (no live merchant yet):** Use **test/sandbox** credentials from the developer portal (API Credentials → Hosted Payment Pages for the **Try** environment). Set `WORLDPAY_BASE_URL=https://try.access.worldpay.com`. The entity and service key/token must come from the **same test row** in the portal.
- **Live merchant account:** You’ll get live credentials and entity; switch to `WORLDPAY_BASE_URL=https://access.worldpay.com` and use those.

---

## Which Worldpay product we use

We use **Worldpay Access – Hosted Payment Pages (HPP)** only.

- **Product:** [Hosted Payment Pages (HPP)](https://developer.worldpay.com/products/access/hosted-payment-pages/openapi)
- **Platform:** Access (not “Worldpay for Platforms”, which is a different product with different credentials).

---

## API calls we make (only one)

| Purpose              | Method | URL                                      | Used in |
|----------------------|--------|------------------------------------------|--------|
| Create payment page  | POST   | `{base}/payment_pages`                   | Checkout flow |

**Base URL:**

- Test: `https://try.access.worldpay.com`
- Live: `https://access.worldpay.com`

So the full endpoint is:

- Test: `https://try.access.worldpay.com/payment_pages`
- Live: `https://access.worldpay.com/payment_pages`

**Headers we send:**

- `Authorization: Basic <base64-credentials>`
- `Accept: application/vnd.worldpay.payment_pages-v1.hal+json`
- `Content-Type: application/vnd.worldpay.payment_pages-v1.hal+json`
- `WP-CorrelationId: <transactionReference>` (max 64 chars)

**Body (JSON):** `transactionReference`, `merchant.entity`, `narrative.line1`, `value` (currency, amount), `description`, `resultURLs`, `expiry`.

---

## Where it’s implemented

1. **`src/lib/payments/createCheckout.ts`**  
   - Builds auth from env, builds payload, calls `POST {base}/payment_pages`, returns the payment `url`.  
   - Used by the unified checkout.

2. **`src/app/api/payments/create-checkout/route.ts`**  
   - Calls `createCheckout()` when the business uses Worldpay (no direct Worldpay HTTP call here).

3. **`src/app/api/worldpay/create-checkout-session/route.ts`**  
   - Standalone route that does the same `POST {base}/payment_pages` call with the same auth and payload shape (duplicate of the logic in `createCheckout.ts`).

There are **no other** Worldpay API calls (no webhooks, no payment status/query, no refunds in code).

---

## Credentials required by the official docs

For **Worldpay Access** (the product we use), the docs say:

- **Authentication:** Basic auth.
- **Value:** Base64 of `username:password`.
- **Source:** Credentials are **provided by your Worldpay Implementation Manager** (assigned when you onboard with Access / HPP).

The **Developer portal “API Credentials”** page (Account Token, Acceptor ID, Application ID, Account ID) may be:

- For the same Access account but used in a different way (e.g. client SDK or other APIs), or
- For a different Worldpay product (e.g. Worldpay for Platforms).

If the Account Token from that page does not work as Basic auth for `POST .../payment_pages`, you need the **Implementation Manager username and password** for **Worldpay Access – Hosted Payment Pages**.

---

## Env vars we read for Worldpay

- `WORLDPAY_BASE_URL` – optional; default test: `https://try.access.worldpay.com`
- `WORLDPAY_ENTITY` – required; merchant entity (from onboarding) or Acceptor ID
- `WORLDPAY_BASIC_AUTH` – Base64 of `username:password`, **or** raw Account Token (we then encode as `:token` for Basic)
- `WORLDPAY_ACCOUNT_TOKEN` – optional; raw Account Token (we encode as `:token` for Basic)
- `WORLDPAY_AUTH_ENTITY_USER` – optional; if `true`, we use Base64 of `entity:token` instead of `:token`

---

## Checklist to fix 401 “accessDenied”

1. Confirm you’re on **Worldpay Access** (developer.worldpay.com, product “Hosted Payment Pages”), not “Worldpay for Platforms”.
2. Use **test** credentials with `WORLDPAY_BASE_URL=https://try.access.worldpay.com` and **live** credentials with `WORLDPAY_BASE_URL=https://access.worldpay.com`.
3. If the **Account Token** from API Credentials still gives 401, contact Worldpay (or your **Implementation Manager**) and ask for **Hosted Payment Pages (Access) Basic auth credentials** (username + password) and the **merchant entity**.
4. Set `WORLDPAY_BASIC_AUTH` to Base64 of `username:password` and `WORLDPAY_ENTITY` to the entity they give you.
