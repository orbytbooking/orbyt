# Worldpay HPP API – What the docs say and why we get 401

Summary of the **official** Hosted Payment Pages API docs and how they explain our errors.

---

## 1. How to use the API (from the docs)

### Step 1: Get credentials (prerequisite)

- **Worldpay eCommerce:** Get your API credentials from the **[dashboard](https://dashboard.worldpay.com/)**.
- **Enterprise:** Get them from your **Implementation Manager**.

There is no mention of “Account Token” or “Acceptor ID” from the developer portal for this API.

### Step 2: Set headers

Exactly:

```
Authorization: {your_credentials}
Content-Type: application/vnd.worldpay.payment_pages-v1.hal+json
Accept: application/vnd.worldpay.payment_pages-v1.hal+json
```

- **Authorization:** Replace `{your_credentials}` with your **base64-encoded Basic Auth username and password you have received from us** (i.e. from the dashboard or Implementation Manager).
- **Content-Type** and **Accept** must match and be the value above.

The OpenAPI spec lists **BasicAuth** as the only security scheme for this API. There is no Bearer or API key in the docs.

### Step 3: POST the request

- **URL (test):** `POST https://try.access.worldpay.com/payment_pages`
- **Body (minimal):** JSON with:
  - `transactionReference` (string, 1–64 chars)
  - `merchant.entity` (string, 1–32 chars) – **see below**
  - `narrative.line1` (string, 1–24 chars)
  - `value.currency` (e.g. `"USD"`)
  - `value.amount` (integer, e.g. cents)

Optional but recommended: `resultURLs` (successURL, cancelURL, etc.), `description`, `expiry`.

### Entity (critical)

From the docs:

> **merchant.entity** – You can find your entity in your [Dashboard](https://dashboard.worldpay.com/) under **"Developer Tools"**. **Using your own entity reference causes the transaction to fail.**

So:

- Entity must be the value from **Dashboard → Developer Tools**, not something you choose or invent.
- The example in the docs is `"POxxxxxxxxx"` (alphanumeric, not a raw number).
- If you use the wrong entity (e.g. a different system’s ID or a number that isn’t your dashboard entity), the request can fail with auth/access errors.

---

## 2. Why we get 401 (from the docs)

The docs and error references say:

- **401** = **authentication problem**.
- Typical causes:
  - **Missing or invalid Authorization header** – must be Basic Auth with base64-encoded **username and password you have received from us** (dashboard or Implementation Manager).
  - Wrong or self-made credentials (e.g. portal login, or Account Token/Acceptor ID used as username/password) are not what “received from us” means.
- Other checks:
  - Use the correct environment (test: `try.access.worldpay.com`, live: `access.worldpay.com`).
  - Use **Accept: application/vnd.worldpay.payment_pages-v1.hal+json**.
  - DNS whitelisting for the Worldpay URLs (no IP whitelisting).

So 401 here means: the server does not accept the credentials we send as valid for this API.

---

## 3. What we’re doing vs what the docs require

| Requirement (docs) | What we did | Result |
|--------------------|-------------|--------|
| Basic Auth = base64(username:password) **from dashboard / Implementation Manager** | Tried Bearer with Account Token; tried Basic with AcceptorId:AccountToken or email:password from developer portal | 401 – credentials not the “username and password you have received from us” |
| Entity from **Dashboard → Developer Tools** (e.g. POxxx) | Used Acceptor ID (e.g. 364808794) from developer portal API Credentials table | Entity may be wrong – “using your own entity reference causes the transaction to fail” |
| Credentials from **dashboard.worldpay.com** (eCommerce) or **Implementation Manager** (Enterprise) | Credentials from **developer.worldpay.com** API Credentials (Account Token, Acceptor ID) | Different source than the one the docs describe for HPP |

So the errors are consistent with:

1. Using credentials that are **not** the HPP “username and password” from the dashboard or Implementation Manager.
2. Using an **entity** that is **not** the one from Dashboard → Developer Tools (e.g. using Acceptor ID instead of the dashboard entity like POxxx).

---

## 4. What to do (per the docs)

1. **Get the right credentials**
   - Log in at **https://dashboard.worldpay.com/** (eCommerce).
   - Go to **Developer Tools** (or equivalent) and find **API credentials** (often “Try” and “Live”).
   - Use the **API username** and **API password** shown there (not portal login, not Account Token).
   - Set:  
     `WORLDPAY_BASIC_AUTH` = Base64(`<API username>:<API password>`).

2. **Get the right entity**
   - In the same **Dashboard → Developer Tools**, find your **entity** (often like `POxxxxxxxxx`).
   - Set:  
     `WORLDPAY_ENTITY` = that exact value (not Acceptor ID from the developer portal).

3. **Use only Basic Auth for this API**
   - Do **not** use Bearer or Account Token for the Authorization header; the docs only specify Basic Auth for HPP.

4. **If you don’t have dashboard access**
   - The docs say eCommerce credentials come from the dashboard and Enterprise from the Implementation Manager.
   - If you only have a developer account and no dashboard/merchant account, you need Worldpay to either:
     - Give you access to the dashboard (eCommerce), or  
     - Provide **test** HPP credentials (username, password, entity) for `POST https://try.access.worldpay.com/payment_pages` (e.g. via support or Implementation Manager).

---

## 5. References

- [Hosted Payment Pages OpenAPI](https://developer.worldpay.com/products/access/hosted-payment-pages/openapi) – Basic Auth, entity, required fields.
- [Setup a payment](https://developer.worldpay.com/products/access/hosted-payment-pages/setup-a-payment) – Get credentials from dashboard / IM, set headers, entity from Developer Tools.
- [Worldpay error responses](https://developer.worldpay.com/products/reference/worldpay-error-responses) – 401 = authentication problem; fix credentials/headers.
