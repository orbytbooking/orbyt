# Worldpay integration – status update

**To:** Khaled  
**Re:** Worldpay integration (as discussed – multiple payment systems, Worldpay first)

---

## What’s done on our side

- **Worldpay is integrated in the backend.**  
  The app supports both Stripe and Worldpay. When a business is set to use Worldpay, the flow is:

  1. Customer chooses “Pay online” at checkout.  
  2. Our server calls Worldpay’s Hosted Payment Pages API to create a payment session.  
  3. Customer is redirected to Worldpay’s secure page to pay.  
  4. On success, they return to our app and the booking is marked paid and the receipt is sent.

  So the **integration (API calls, redirects, success/cancel handling) is built and ready** on our side.

---

## Current blocker (credentials)

- Worldpay’s API is **rejecting our requests with “Access denied” (401)**.  
  That means the **account/credentials we have are not accepted** for this specific API (Hosted Payment Pages).

- We’re using a **developer account** (from Worldpay’s developer portal). The official docs for Hosted Payment Pages say that this API expects credentials from a **merchant dashboard** (dashboard.worldpay.com), not from the developer portal. So the credentials we have don’t match what this API expects, which is why we get 401.

---

## What’s needed to go live / test with real Worldpay

To actually **create payment sessions and complete test/live payments** with Worldpay, we need **valid credentials for the Hosted Payment Pages API**. That means one of the following:

1. **Worldpay merchant account (recommended if you want to take real payments with Worldpay)**  
   - Sign up at **https://go.worldpay.com/get-started** (or through Worldpay’s normal merchant signup).  
   - After approval, you get access to **dashboard.worldpay.com**, where you can get:
     - **API username** and **API password** (for our server)
     - **Entity ID** (e.g. format like `POxxxxxxxxx`)
   - We plug those into our app and the same integration we built will work.

2. **Test credentials from Worldpay (if you only need to test first)**  
   - If you (or we) contact Worldpay support and ask for **test Hosted Payment Pages** access, they can provide:
     - Test **API username**, **API password**, and **entity** for the test environment (`try.access.worldpay.com`).  
   - We already have a short support-request template we can send them. Once we have those test credentials, we can run full test payments without a full merchant account.

3. **Confirmation that developer credentials are enough (optional)**  
   - We can also ask Worldpay whether the **developer portal** credentials (Reference ID + API key) are allowed for this API and in what format. So far they have not worked; if Worldpay confirms they should work, they can tell us the exact format and we’ll adjust.

---

## Summary for you

| Item | Status |
|------|--------|
| **Backend / API integration** | ✅ Done – Worldpay Hosted Payment Pages flow is implemented (create session, redirect, confirm return, mark paid, send receipt). |
| **Why it doesn’t work yet** | ❌ Worldpay returns “Access denied” because the credentials we have (developer account) are not the ones this API expects. |
| **What we need** | Either: (1) A Worldpay **merchant account** and access to dashboard.worldpay.com to get API username, password, and entity, or (2) **Test HPP credentials** from Worldpay support so we can test without a full merchant signup. |

As soon as we have the correct credentials (from the dashboard or from support), we only need to add them to our config – **no further backend work** is required for the current flow. If you want, we can also draft the exact message to send to Worldpay support asking for test credentials.

---

Thanks,  
[Your name]
