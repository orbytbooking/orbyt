Demo Flow: Orbyt MVP Platform

This document outlines how to present the working MVP and how to use the platform. Use it for demos, onboarding, or testing. All URLs assume the app is running (e.g. npm run dev) and require the business ID for customer-facing flows.

Prerequisites

* App running (npm run dev)
* Database migrations applied
* One business created; note its business ID
* Admin user (owner) exists and can log in at /auth/login
* Optional: at least one provider invited and one service/location configured for full booking flow

Part 1: Admin (Business Owner)

1. Log in
* Go to /auth/login
* Sign in with the business owner account
* You are redirected to the admin dashboard

2. Dashboard
* View overview: recent bookings, providers, quick actions
* Use "Add Booking" to create a booking from the admin side
* Use "Customers" and "Providers" to manage people
* Use "Settings" to configure the business

3. Settings (one-time or as needed)
* Go to Admin > Settings
* General: Store options (currency, timezone, scheduling type, provider assignment, spot limits, holidays)
* Reserve-slot: Configure holidays and spot limits per location; wire to business-holidays and business-spot-limits
* Account > Billing: Connect Stripe (live keys when ready) for online payments
* Industries: Set up locations (with map drawing), frequencies, service categories, pricing, exclude parameters, extras
* Cancellation and payment method: Configure per industry/service category

4. Providers
* Admin > Providers: List providers
* Add or invite a provider; set availability and services
* Open a provider profile: view earnings, drive, availability; "Access provider portal" opens /provider/login in a new tab

5. Add booking (admin-created)
* Admin > Add Booking (or from Dashboard)
* Select customer (or create), industry, service, date, time, optional provider
* Add notes, set price; submit
* Booking appears on Admin > Bookings

6. Bookings
* Admin > Bookings: Calendar and list view
* Click a booking for details, status, payment, notes
* Actions: Edit, add charge, mark complete, etc.
* Recurring: Extend series or manage from this page

7. Customers
* Admin > Customers: List and search
* Open a customer: profile, booking history, invoices
* Create invoice and send from customer detail

8. Invoices and payments
* Create invoice from customer detail or booking context
* Send invoice (email); customer can open via share link
* Provider payments: Admin > Provider Payments to track and mark paid

Part 2: Customer or Guest Booking (Public)

1. Booking link
* Share the booking URL with the business ID: /book-now?business=YOUR_BUSINESS_ID
* Replace YOUR_BUSINESS_ID with the actual business UUID

2. Book as guest
* Open /book-now?business=YOUR_BUSINESS_ID
* Choose industry, service, frequency (if any), date, time
* Enter contact details (name, email, phone, address)
* Choose payment method (cash or online if Stripe connected)
* Submit; confirmation appears and (if email configured) confirmation email is sent

3. Book as logged-in customer
* Customer sign up or login: /customer-auth?business=YOUR_BUSINESS_ID
* After login, go to /book-now?business=YOUR_BUSINESS_ID or use a link that keeps the business context
* Same flow as guest; booking is tied to the customer account
* View appointments: /customer/appointments (with business context)

4. Customer portal
* After login, customer can open appointments list and history
* Open a booking to see details and status

Part 3: Provider

1. Provider login
* Go to /provider/login (or use link from admin provider profile)
* Sign in with provider credentials (invited by admin and account created)

2. Dashboard
* View today’s bookings, invitations, unassigned jobs (if enabled)
* Accept or decline invitations
* Use "View Details" or contact links to see booking details

3. Bookings
* Provider > Bookings: List of assigned bookings
* See date, time, customer, service, address, notes
* Update status (e.g. start, complete) if the business uses that flow

4. Invitations (if scheduling type is accept_or_decline)
* Provider > Invitations: Pending invitations
* Accept or decline; on accept, booking is assigned to that provider

5. Unassigned (if enabled)
* Provider > Unassigned: List of unassigned bookings
* Provider can "grab" a job to assign themselves

6. Earnings
* Provider > Earnings: View earnings based on completed bookings and wage

Part 4: End-to-End Demo Flow (Suggested Order)

1. Admin sets up business: Settings (scheduling, reserve-slot, Stripe if testing payments), add one provider, set availability, ensure at least one service/location is available.
2. Admin creates a booking: Add Booking for a customer (or use a test customer); show it on Bookings.
3. Customer books online: Open /book-now?business=ID, complete as guest; show confirmation and (if email is on) confirmation email.
4. Provider flow: Log in as provider, show dashboard, accept an invitation or view assigned booking, show earnings.
5. Admin: Show Bookings with the new booking, optional invoice from customer profile, optional booking charge and provider payment.
6. Payments (when Stripe live): Show Connect in Settings > Billing; run a test online payment from book-now; show receipt/status in admin and customer.

Part 5: Key URLs Reference

* Admin login: /auth/login
* Admin dashboard: /admin/dashboard
* Admin bookings: /admin/bookings
* Admin add booking: /admin/add-booking
* Admin customers: /admin/customers
* Admin providers: /admin/providers
* Admin settings: /admin/settings
* Provider login: /provider/login
* Customer auth (login/signup): /customer-auth?business=BUSINESS_ID
* Public booking: /book-now?business=BUSINESS_ID
* Customer appointments: /customer/appointments (after login with business context)

Part 6: What to Call Out in a Demo

* One business, one link: Share /book-now?business=ID and /customer-auth?business=ID so customers always land in the right business.
* Scheduling: Automatic assign vs accept/decline vs manual; show where it’s set (Settings > General > Scheduling).
* Reserve-slot: Holidays and spot limits configured under Settings > Reserve-slot.
* Online payments: Stripe Connect in Settings > Account > Billing; then customers can choose "online" at checkout.
* Recurring: Create or extend recurring series from Add Booking or Bookings.
* Notifications: Admin sees notifications in the header; customers and providers get emails (confirmation, receipt, never-found-provider) when configured.

Notes

* For live payment testing, use Stripe live keys and webhook secret in env and complete Stripe Connect for the business.
* Cron auto-complete (api/cron/auto-complete-bookings) is built but must be scheduled in production (e.g. cron job or scheduler) and tested separately.

MVP readiness for home cleaning

* **Verdict: Yes, ready for a single home-cleaning business.** Core flow is feature-complete: admin setup → customer/guest books → provider assigned → payments and invoices.
* **Home-cleaning fit:** Book-now supports industry "Home Cleaning" (or admin-configured name), service types (e.g. Standard, Deep, Move In/Out), frequency (one-time, weekly, bi-weekly, monthly), key access (someone home / hide keys), and customization (bedrooms, bathrooms, sq m, extras). Recurring series, cancellation policy, and Stripe payments are built in.
* **Before going live:** Apply all DB migrations; set env (Supabase, Stripe, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for service areas); complete Stripe Connect for the business; run one full E2E test (admin setup → book-now → provider → payment). Optional: schedule cron for `api/cron/auto-complete-bookings`; harden drive upload auth if using provider documents.
* **Fixed for MVP:** Notification preferences on the main Settings page are now persisted (API: `/api/admin/notification-preferences`). Update Password is wired to Supabase Auth. Website Builder "Visit Website" and "Customize Design" buttons link to the booking page and design settings. Remaining non-blocking gaps: gift cards and daily discounts APIs incomplete.
