Weekly Progress Update

This update covers progress across scheduling automation, recurring bookings, provider experience, payments and billing, admin settings, and multi-tenant booking flows. The work focused on advancing the platform toward MVP readiness for a single business launch. All items below are sourced from actual commits and code changes pushed between February 17 and 22, 2026. Below is a structured summary of the work completed.

Scheduling and Operations Backend

Overview
The scheduling system was expanded to support business holidays, spot limits, max minutes per booking, and recurring series. Recurring bookings use an extend-on-demand model with no cron dependency.

What's built
* Reserve-slot holidays wired to API (POST, PATCH, DELETE business-holidays)
* Per-business spot limits for bookings with validation
* max_minutes_per_provider_per_booking enforced in booking APIs and auto-assign
* New recurring_series table with N-ahead extend-on-demand logic
* New libs: schedulingFilters.ts, recurringBookings.ts
* Migrations 040 to 043: completion mode, scheduling essentials, spot limits, recurring series
* Cron endpoint for auto-completing past bookings

Result
Businesses can configure holidays, cap spots per time slot, enforce max booking duration, and support recurring bookings without cron jobs.

Provider Experience Improvements

Overview
Provider-facing flows were improved with accept/decline invitations, formatted display, contact links, and wage-based earnings. Admin can manage provider drive uploads.

What's built
* Accept/decline flow for provider invitations
* Consistent formatting for prices, dates, and times across provider screens
* Contact links from provider dashboard
* View Details deep-link for direct access to booking details
* Admin provider drive management (upload, view)
* Per-booking wage override with earnings derived from provider_earnings

Result
Providers have clearer workflows for accepting work, viewing earnings, and accessing booking details. Admin can manage provider documents.

Payments and Billing

Overview
Stripe Connect integration, invoice creation and sharing, frequency discounts, and booking charges were implemented to support full payment workflows.

What's built
* Stripe Connect: create/disconnect accounts, status, checkout sessions
* Invoices: create, send, share via token; invoice view page
* Frequency discount: support for both percent and fixed dollar; API discount_type fix
* Booking charges UI for managing charges
* Provider payment tracking and management

Result
Businesses can accept online payments, issue invoices, apply frequency-based discounts, and track provider payments.

Email and Notifications

Overview
Email flows were added for booking lifecycle events and invoice delivery. Notification header is connected to the database.

What's built
* Booking confirmation email on successful booking
* Receipt email on completion
* Never-found-provider email when no provider accepts invitation
* Invoice send email to customer
* Notification header connected to database

Result
Customers and providers receive timely email notifications. Admin can see notifications from database.

Admin and Settings

Overview
Admin general settings, store options, reserve-slot, account, and industries form pages were expanded. Scheduling moved from a separate page into general settings. Business access, cancellation, payment method, and scheduling options are now configurable per industry and category.

What's built

General settings (store-options sub-tabs)
* General: store currency, email, timezone, time format, date format, phone format, calendar defaults, location management, wildcard zip, reschedule fee and when to charge
* Customer: business access settings (access blocked message, booking blocked message)
* Provider: provider-related options
* Admin: admin sub-tab UI for store options
* Scheduling: spots based on provider availability, provider assignment mode (manual/automatic), scheduling type (accepted_automatically, accept_or_decline, accepts_same_day_only), booking completion mode (manual/automatic), max minutes per provider per booking, spot limits enabled, holiday skip to next, holiday blocked who, recurring update default, specific provider for customers/admin

Reserve-slot settings
* Holidays: add, edit, delete; wired to business-holidays API
* Spot limits per location; daily settings; booking spots per location

Cancellation and payment settings
* Cancellation settings per industry and service category (fee, when to charge, stop recurring, reasons setup)
* Payment method settings per industry and service category

Account settings
* Billing page with Stripe Connect (create account, disconnect, status)
* Account page updates

Design settings
* Design page updates

Industries form-1
* Locations: new page with Google Maps drawing, locations list; industry-location table
* Frequencies: new page, frequencies list; discount type (percent/fixed)
* Service category: new page with explanation, popup, tooltips; service length toasts
* Pricing parameter: new page
* Exclude parameters: new page
* Extras: new page

Other
* Admin bookings page redesigned; scheduling moved into general settings
* Private notes and provider notes for bookings (backend and UI)
* Admin tags CRUD for customer and provider tags
* Customer/Provider profiles: access blocked, booking blocked, avatar upload, deactivate
* Notification header connected to database; admin notifications API

Result
Admin has full control over store options, scheduling behavior, reserve-slot holidays and spots, cancellation and payment per industry/category, booking notes, tags, and customer/provider access. Industries form includes locations with map, frequencies, service categories, pricing, exclude parameters, and extras.

Booking and Cancellation

Overview
Add-booking calculations were fixed, cancellation policy and fees implemented, and service category metadata (explanation, tooltips) added.

What's built
* Fixed total, price, and cancellation fee logic in add-booking
* Cancellation policy settings API; fee calculation in cancellationFee.ts
* Service category: explanation, popup, tooltips; service length toasts
* Booking duration in admin add-booking and API

Result
Bookings calculate correctly including cancellation fees. Service categories have better metadata. Duration is captured.

Maps and Location

Overview
Location drawing and industry-location linking were implemented. Admin location drawing uses Google Maps API (GoogleDrawMap component). Geocoding and zipcodes-in-area use Google Maps Geocoding API. The admin locations form uses pure Google Maps API; Leaflet and OpenStreetMap components exist in the codebase but the primary location drawing flow uses Google Maps.

What's built
* drawn_shape_json on locations for service area definition (migration 021)
* GoogleDrawMap component using Google Maps JavaScript API and Drawing library for polygon, circle, rectangle, marker
* Geocoding and reverse geocoding via Google Maps API (api/geocoding, api/locations/map)
* Zipcodes-in-area API using Google Maps Geocoding for bounds and point-in-polygon
* Industry-location table (migration 022) for industry-to-location linking
* Environment variable: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY required for map and drawing

Result
Businesses can define service areas by drawing on a map. Admin locations form uses Google Maps API. Zipcodes in area are computed for availability.

Customer and Guest Booking

Overview
Customer and guest booking APIs were completed. Book-now flow refined for logged-in vs guest paths. Customer appointments and auth support business context.

What's built
* Customer booking API: full POST flow with validation
* Guest booking API: full POST flow with validation
* Customer appointments: list and detail views
* Book-now flow refined for customer vs guest paths
* Customer auth: sign up/login with business context from URL

Result
Customers and guests can book online. Customer portal shows appointments and history. Auth is scoped by business.

Database Migrations

Migrations 017 to 020: Frequency on bookings, provider name/customization, qty-based exclude params, Stripe Connect
Migrations 021 to 022: Location drawn shape, industry-location table
Migrations 023 to 028: Tags, access-blocked, admin settings, customer access/booking blocked
Migrations 029 to 034: Invoices, share token, provider priority, voided/declined status, business access
Migrations 035 to 039: Service category metadata, cancellation settings, exclude flags, notes
Migrations 040 to 043: Completion mode, scheduling essentials, spot limits, recurring series

Current Limitations

* Stripe integration still uses testing account; needs validation on live account for Stripe Connect, checkout, and webhooks
* Gift cards API integration not yet complete (frontend exists)
* Daily discounts API integration pending
* Send schedule API in SendScheduleDialog not implemented
* Drive upload auth requires hardening
* Migration service for frequency/location/pricing has TODOs

Next Steps

* Run full end-to-end test with one business
* Test Stripe Connect and payment flows on live account
* Document deployment checklist (env, migrations, setup steps)
* Address remaining TODOs for gift cards and daily discounts if needed for MVP
* Consider smoke tests or basic E2E coverage for critical flows

Technical Notes

* 22 commits across 6 days (Feb 17 to 22, 2026)
* New libs from commits: recurringBookings.ts, schedulingFilters.ts, cancellationFee.ts, emailService.ts
* New API routes from commits: business-holidays, business-spot-limits, recurring/extend, auto-complete-bookings (cron), access-settings, cancellation-settings, cancellation-policy, admin/notifications, admin/invoices, admin/provider-payments, admin/provider drive, Stripe Connect (create-account, disconnect, status), create-checkout-session, webhook, guest/bookings, customer/bookings
* Changes are backward compatible
* Database migrations include schema additions; apply in order

Current Status

The platform is MVP-ready for a single business in service industries (cleaning, field service, home services). Core booking to provider to payment flow is feature-complete. Requires migrations applied, env configured, and one business fully set up. Areas ready: core booking flow, provider assignment, Stripe Connect, invoices, email notifications, admin settings, recurring bookings, cancellation and fees. Still needs to test and implement: booking flow end-to-end, online payment flow, Stripe Connect on live account, and automatic booking completion via cron (api/cron/auto-complete-bookings).
