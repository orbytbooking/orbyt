# Worldpay Hosted Payment Pages – Deep research summary

## 1. Two different places for “credentials”

| Source | What you get | Used for |
|--------|----------------|----------|
| **dashboard.worldpay.com** (eCommerce / merchant dashboard) | **Developer Tools** → **API Credentials**: **API username** and **API password** (and **entity** as `POxxxxxxxxx`) | Official HPP docs: Basic Auth = Base64(username:password). Entity in body = the `POxxx` from Developer Tools. |
| **developer.worldpay.com** (docs / developer portal) | **API Credentials** page: **Account Token** (Copy API Key) + **Acceptor ID**, **Application ID**, **Account ID** per row | Docs do **not** say to use these for HPP server-side Basic Auth. They may be for client SDK, “Try” playground, or a different product. |

**Conclusion:** The 401 may be because the **Hosted Payment Pages** API expects the **username + password** (and **entity** `POxxx`) from the **merchant dashboard** (dashboard.worldpay.com → Developer Tools), not the Account Token + Acceptor ID from the **developer portal** (developer.worldpay.com).

---

## 2. What the official HPP docs say

- **Auth:** **Basic only.**  
  `Authorization: <base64 of username:password>`  
  No Bearer token is documented for HPP.
- **Username/password:**  
  - **eCommerce (SMB):** from **[dashboard.worldpay.com](https://dashboard.worldpay.com/)** → Developer Tools → API Credentials (with **Try** and **Live** credentials).  
  - **Enterprise:** from your **Implementation Manager**.
- **Entity:**  
  - In the request body: `merchant.entity` = **entity from Developer Tools** in the **dashboard**.  
  - Format in docs: **`POxxxxxxxxx`** (letters/numbers), not necessarily the numeric Acceptor ID.
- **Endpoint:**  
  - Test: `https://try.access.worldpay.com/payment_pages`  
  - Live: `https://access.worldpay.com/payment_pages`

So: **Basic Auth** + **entity** from **dashboard** Developer Tools, not necessarily from the developer portal “API Credentials” table.

---

## 3. Dashboard vs developer portal

- **dashboard.worldpay.com**  
  - Merchant/eCommerce dashboard.  
  - Where you **get** API username, password, and entity for HPP.  
  - Has **Try mode** (test) and **Live** credentials.  
  - Developer Tools → entity (e.g. `POxxx`) and API Credentials (username/password).

- **developer.worldpay.com**  
  - Docs and API references.  
  - “API Credentials” page with **Account Token** and **Acceptor ID** (and similar) is **not** clearly described as the HPP server-side Basic Auth.  
  - May be the same login as the dashboard in some regions, or a separate “developer” account.

If you only have a **developer account** (no full merchant/eCommerce account), you may **not** have access to dashboard.worldpay.com and thus no “official” HPP username/password/entity. In that case, try-mode access usually has to be **provisioned** (e.g. by Implementation Manager or support).

---

## 4. What we’ve already tried (and why it can still 401)

- **Bearer + WP-Entity-Id** using Account Token + Acceptor ID from developer portal → 401.  
  - HPP docs do **not** describe Bearer for this API; they describe Basic only.
- **Basic** with **Acceptor ID : Account Token** (from same developer portal row) → 401.  
  - Those values might not be the HPP “username” and “password” expected by the server.
- **Basic** with **email : password** (portal login) → 401.  
  - Portal login is often not the same as API credentials.
- **Entity** set to numeric **Acceptor ID** (e.g. `364808794`).  
  - Docs show entity as **`POxxxxxxxxx`** from **dashboard** Developer Tools; the API may require that format and reject a plain numeric ID.

So 401 can be due to: wrong credential source (developer portal vs dashboard), wrong format (Bearer vs Basic, or wrong Basic username/password), or wrong entity (Acceptor ID vs `POxxx`).

---

## 5. Recommended next steps

1. **Try the merchant dashboard (dashboard.worldpay.com)**  
   - Log in at **https://dashboard.worldpay.com** (and/or **https://dashboard.worldpaypp.com** if you use that).  
   - Go to **Developer Tools** (or equivalent).  
   - Find:  
     - **Entity** (value like `POxxxxxxxxx`).  
     - **API Credentials** (or “Try” / test credentials): **API username** and **API password**.  
   - Use for HPP:  
     - `WORLDPAY_USE_BASIC_AUTH=true`  
     - `WORLDPAY_BASIC_AUTH` = Base64(`<API username>:<API password>`)  
     - `WORLDPAY_ENTITY` = that **entity** (`POxxx`), **not** the Acceptor ID.  
     - `WORLDPAY_BASE_URL=https://try.access.worldpay.com` for test.

2. **If you can’t access the dashboard**  
   - You may only have a “developer” account without a full eCommerce/merchant account.  
   - Contact Worldpay (or your Implementation Manager) and ask for:  
     - **Try (test) Hosted Payment Pages** access, and  
     - **API username**, **API password**, and **entity** (in `POxxx` format) for `POST https://try.access.worldpay.com/payment_pages`.  
   - Use the text in **WORLDPAY_SUPPORT_REQUEST.md** and add: “I only have a developer account; I don’t have dashboard access. Please provide test HPP Basic Auth credentials (username, password, entity) for the Hosted Payment Pages API.”

3. **“New Dashboard” (from the blue banner)**  
   - If the developer portal offers “Switch to our new dashboard environment”, try that and see if it exposes **API username/password** and **entity** (e.g. under Developer Tools or API Credentials) that are clearly for Hosted Payment Pages or “Try” mode.

4. **Entity format**  
   - If you ever get an entity that looks like `PO...`, use that as `WORLDPAY_ENTITY` instead of the numeric Acceptor ID.

---

## 6. References (official)

- [Setup a payment (HPP)](https://developer.worldpay.com/products/access/hosted-payment-pages/setup-a-payment) – Basic Auth, entity from dashboard.  
- [Hosted Payment Pages OpenAPI](https://developer.worldpay.com/products/access/hosted-payment-pages/openapi) – Basic Auth, no Bearer.  
- [API principles](https://developer.worldpay.com/products/access/reference/api-principles) – Try vs Live credentials.  
- Dashboard: [dashboard.worldpay.com](https://dashboard.worldpay.com/) (eCommerce credentials, Developer Tools, entity).

---

## 7. Short summary

- HPP expects **Basic Auth** (username + password) and **entity** (`POxxx` style) from the **merchant dashboard** (or from Implementation Manager), not necessarily the Account Token + Acceptor ID from the **developer portal** API Credentials table.  
- Try **dashboard.worldpay.com** → Developer Tools → API Credentials and entity, and use those for Basic Auth and `merchant.entity`.  
- If you don’t have dashboard access, ask Worldpay for **test HPP credentials** (username, password, entity) for `POST /payment_pages` on try.access.worldpay.com.
