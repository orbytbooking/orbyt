# Worldpay Hosted Payment Pages – 401 when creating session

**Use this when contacting Worldpay developer support.**

---

## What we're doing

- **API:** Worldpay Access – Hosted Payment Pages (HPP)
- **Endpoint:** `POST https://try.access.worldpay.com/payment_pages`
- **Goal:** Create a hosted payment page session (get redirect URL for the customer)

## Credentials we're using

- From **developer portal** → **API Credentials** → **Hosted Payments** (one row).
- **Acceptor ID:** e.g. `364808794` (used as entity in request body and, when trying Basic auth, as Basic auth username).
- **Account Token:** from "Copy API Key" for that same row (used as Bearer token, or as Basic auth password when trying Basic).

## What we've tried

1. **Bearer auth:** `Authorization: Bearer <Account Token>`, header `WP-Entity-Id: <Acceptor ID>`, body `merchant.entity: <Acceptor ID>`  
   → **401** `"errorName": "unauthorized", "message": "Invalid authentication"`

2. **Basic auth:** `Authorization: Basic <Base64(AcceptorId:AccountToken)>`, body `merchant.entity: <Acceptor ID>` (no WP-Entity-Id header)  
   → **401** `"errorName": "accessDenied", "message": "Access to the requested resource has been denied"`

## Request details (no secrets)

- **Method:** POST  
- **URL:** `https://try.access.worldpay.com/payment_pages`  
- **Headers:**  
  - `Accept: application/vnd.worldpay.payment_pages-v1.hal+json`  
  - `Content-Type: application/vnd.worldpay.payment_pages-v1.hal+json`  
  - `WP-CorrelationId: <unique ref>`  
  - Plus either `Authorization: Bearer <token>` and `WP-Entity-Id: <Acceptor ID>`, or `Authorization: Basic <base64>`  
- **Body:** `transactionReference`, `merchant.entity`, `narrative.line1`, `value` (currency USD, amount in cents), `description`, `resultURLs`, `expiry: 3600`

## Question for Worldpay

We have a **developer account** (no live merchant yet) and are using credentials from the developer portal (API Credentials → Hosted Payments). We need to create hosted payment page sessions against **try.access.worldpay.com**.

Can you confirm:

1. Are the **Hosted Payments** credentials in the developer portal (Account Token + Acceptor ID) intended for **POST /payment_pages** on **try.access.worldpay.com**?
2. For this endpoint, should we use **Bearer** auth with the Account Token and **WP-Entity-Id**, or **Basic** auth (and if Basic, what should the username and password be)?
3. Is there any extra step (e.g. enabling Hosted Payment Pages, or using different test credentials) for a developer-only account?

Thank you.
