# Orbyt — Progress Update  
**Week of February 7–13, 2026**

---

## Summary (in plain language)

This week we moved the product closer to launch. Here's what that means for you:

- **Your website builder** now saves each business's site separately and safely. You can edit the main headline and tagline, see a live preview, upload images, and reset to defaults if you want to start over.
- **Your team (providers)** are now fully in the system: you assign them to bookings from your real team list, and they have their own area to manage their schedule, bookings, profile, and documents.
- **Reports and bookings** in the admin dashboard are connected to real data, so what you see is accurate and stays in sync.
- **Customer sign-up and login** now correctly link customers to your business, and we fixed how the app is built so that login, customer pages, and legal pages (privacy, terms) work reliably when we deploy.

Everything below is written so you can follow along without technical background. At the end there's a **demo flow with a script** you can use to present these updates.

---

## 1. What's new: Website builder

- **Each business has its own website settings.** What you edit is saved only for your business and isn't mixed with others.
- **You can edit the top section (hero)** — including the main headline and the short tagline (e.g. "ORBYT #1 CLEANING SERVICE"). All of that is editable and saved.
- **Live preview.** When you change something in the builder, you can open "My website" and see the result right away, the same way customers will see it.
- **Reset to default.** If you want to start from a clean slate, there's a "Reset to default" option. You still get a confirmation and can undo if needed.
- **Images.** You can upload images for your site; they're stored securely and tied to your business.
- **Header and footer** (logo, company name, etc.) use your branding and stay in sync when you change them.

---

## 2. What's new: Provider portal and admin

- **Providers (your team) are in the system.** When you add or edit a booking, the list of providers comes from your actual team — no more placeholder or test data.
- **Providers have their own area** where they can:
  - See their **dashboard**
  - Manage their **availability** (when they're available to work)
  - View their **bookings**
  - Update their **profile** and **settings**
  - Use a **drive** for documents
- **Reports in the admin** now pull from real booking data. You can filter by status and date, and the dashboard and bookings screens stay consistent with each other.
- **Admin booking flow** (add booking, dashboard) was updated so everything works smoothly with the real provider list and data.

---

## 3. What's new: Availability (when providers can work)

- Providers can set **which days and times they're available** in an availability screen.
- That schedule is **saved and used** when customers book — so the slots you see are based on real availability.
- The availability screen has **month navigation** and clear time slots, and it stays in sync with the provider's settings.

---

## 4. What we fixed: Reliable login and deployment

- **Customer sign-up and login** now correctly create and link customer accounts to your business.
- We fixed issues that could break **login**, **customer pages**, and **privacy/terms** when the app is deployed. Those pages now load and behave correctly in the live environment.

---

## 5. Other improvements

- **Your public booking page** and **public website** (by business) were updated so service selection and branding work correctly.
- **Admin settings** (design, notifications, general) were adjusted so provider and config options work properly (e.g. no missing buttons, correct data).
- **Old, unused builder screens** were removed so the product is cleaner and easier to maintain.

---

## At a glance

| Area | What it means for you |
|------|------------------------|
| **Website builder** | Edit your site safely per business; live preview; editable hero and tagline; reset to default; images and branding. |
| **Providers** | Real team list for bookings; providers manage their own schedule, bookings, profile, settings, and documents. |
| **Reports and admin** | Dashboard and reports use real data; bookings and provider assignment stay in sync. |
| **Customers and deployment** | Sign-up and login link customers to your business; login and key pages work correctly when we go live. |

---

## Next steps (recommendations)

- Do a full run-through on a test environment: create a booking, check provider availability, and try saving and loading the website builder.
- Do a final check of the provider area (availability, bookings, profile, drive).
- After the next deploy, we'll keep an eye on login, customer, and legal pages to make sure everything stays stable.

---

## Demo flow and script

Use this to **show your client** what was delivered. **Time:** about 10–15 minutes.  
**Before you start:** Be logged in as the business owner (admin), and have at least one provider and one customer set up (or plan to sign up during the demo).

---

### Part 1 — Admin dashboard and bookings (about 2 minutes)

| Step | What you do | What you say (script) |
|------|-------------|------------------------|
| 1 | Go to **Admin** → **Dashboard** | *“Here’s the admin dashboard. We’ve connected it to your real booking data, so the numbers and reports you see are accurate and stay in sync.”* |
| 2 | Open **Bookings** | *“When you look at bookings, the list of team members you can assign now comes from your actual team in the system — no test or fake names.”* |
| 3 | Open **Add booking** (or edit one) | *“So when you assign someone to a booking, you're picking from your real staff list. Everything stays consistent.”* |

---

### Part 2 — Website builder and live preview (about 4 minutes)

| Step | What you do | What you say (script) |
|------|-------------|------------------------|
| 1 | Go to **Admin** → **Settings** → **Website and form design** (or **Website Builder**) | *“This is your website builder. Each business only sees and edits its own site — your changes are saved separately and safely.”* |
| 2 | Edit the **Hero** section: change headline or **Service tag** (e.g. “ORBYT #1 CLEANING SERVICE”) | *“You can edit everything in the top section: the main headline and the short tagline. When you save, it's stored and won't disappear when you refresh.”* |
| 3 | Open **Live preview** (e.g. **My website** or `/my-website` in a new tab) | *“The preview updates in real time. What you change here is what customers see on your public site.”* |
| 4 | (Optional) Use **Reset to default** | *“If you want to start over, we added a ‘Reset to default’ that restores the default layout and branding—and you can still undo it.”* |

---

### Part 3 — Provider portal: schedule and bookings (about 3 minutes)

| Step | What you do | What you say (script) |
|------|-------------|------------------------|
| 1 | Log in as a **provider** (or use provider invite flow) and go to **Provider** → **Dashboard** | *“Your team members have their own area. They can see their dashboard, their schedule, their bookings, profile, settings, and a place for documents.”* |
| 2 | Open **Availability** | *“Here they manage their calendar and time slots. Settings and availability stay in sync, and we have month navigation and slot management.”* |
| 3 | Open **Bookings** | *“They only see the bookings that are assigned to them — same data you see in the admin, just filtered for that person.”* |

---

### Part 4 — Customer side and going live (about 2 minutes)

| Step | What you do | What you say (script) |
|------|-------------|------------------------|
| 1 | Show **Customer login** (`/login` or customer-auth) and **Customer dashboard** (e.g. `/customer/dashboard`) | *“When customers sign up or log in, they're now correctly linked to your business. We also fixed how the app is built so that login and the customer area work properly when we deploy to the live site.”* |
| 2 | (Optional) Show **Privacy policy** or **Terms** page | *“We made sure the privacy and terms pages load correctly in the live environment too, so you're covered on the legal side.”* |

---

### Part 5 — Wrap-up

| Step | What you do | What you say (script) |
|------|-------------|------------------------|
| 1 | Recap | *“So to sum up: your website builder saves per business with a live preview and reset; your team is in the system and they manage their own schedule and bookings; the provider area has availability, bookings, profile, settings, and drive; and we’ve fixed deployment so login, customer, and legal pages work correctly when we go live.”* |

---

**Quick link reference (for you when demoing)**

- **Admin:** Dashboard, Bookings, Website builder (often under Settings)
- **Live preview:** My website
- **Provider:** Dashboard, Availability, Bookings, Profile, Settings, Drive
- **Customer:** Login, Customer dashboard
- **Legal:** Privacy policy, Terms and conditions

---

## Commit details (from each commit message)

Below is each commit’s **subject and full body** (author’s description of the change). The next section maps the same commits to **file-level changes** from the diffs.

---

### 7621bf5 — Feb 7 — Fix business isolation and customer signup issues

- Add business isolation to website config hook
- Fix customer signup to create proper business-associated records
- Create database migration for business website configs
- Update builder login with clearer signup options

---

### fb8d8bd — Feb 7 — Add admin reports API and update dashboard and bookings routes

(No body; subject describes new reports API and dashboard/bookings route updates.)

---

### 2e56496 — Feb 8 — Add website builder functionality and database migrations

(No body; subject describes website builder and DB migrations.)

---

### bcbb0a0 — Feb 10 — feat: implement comprehensive multi-tenant website builder with complete data isolation

**Major features:** Full website builder with drag-and-drop; real-time preview at `/my-website`; multi-tenant data isolation with RLS; image upload with authentication; dynamic header/footer with branding.

**Technical:** Fixed config persistence across reloads; removed double-load issues and localStorage for cross-browser sync; auth for image ops; business-specific logo in header/footer.

**Security:** RLS, business-filtered API queries, path-based file storage isolation, enterprise multi-tenant architecture.

**UI/UX:** Enhanced header (larger logo, alignment); fixed header in editor preview; skeleton loaders; real-time builder ↔ preview updates.

**New:** WebsiteBuilderPage, live preview page, ImageUpload, auth client helper, Navigation/Footer with branding. APIs: `/api/admin/website-config`, `/api/admin/upload-website-image`. DB: `business_website_configs` with RLS, storage policies, business ownership verification.

---

### 4c5af3c — Feb 10 — feat: make all hero text editable and update default branding

**Text:** Added `serviceTag` to Hero and HeroProps; Service Tag input in builder Hero editor; replaced hardcoded “CHICAGO'S #1 CLEANING SERVICE” with `data.serviceTag`; default tag “ORBYT #1 CLEANING SERVICE”.

**Technical:** Hero.tsx `serviceTag` prop with fallback; website-builder Hero editor; consistent branding across components.

---

### c366bf5 — Feb 10 — feat: add reset to default functionality

**Feature:** `resetToDefault` resets config to default; Reset button with RotateCcw in action buttons; resets sections, branding, template; toast feedback; history kept for undo/redo.

**Technical:** defaultConfig from defaultSections and Orbyt defaults (colors, logo, company name, domain); template `'modern'`; reset added to history; success toast.

---

### e2d8a2c — Feb 10 — feat: complete availability management system and enhance website builder

- Comprehensive availability calendar with time slot management
- Real-time sync between settings and availability pages
- `provider_availability` table structure and API endpoints
- Month navigation and debugging tools for calendar
- Website builder functionality and UI enhancements

---

### 02bbed3 — Feb 10 — feat: complete system updates and cleanup

- Update provider dashboard and earnings pages
- Remove deprecated builder pages
- Add development tools and documentation
- Enhance TypeScript configuration
- Clean up project structure

---

### bd895a9 — Feb 10 — Fix provider assignment to use database instead of local storage

- Remove mock providers data from bookings page
- API integration to fetch providers from `service_providers` table
- Loading states and error handling for provider fetching
- Fix missing Button import in settings page
- Business isolation for provider data
- Remove localStorage for provider management

---

### df9d56e — Feb 11 — Update admin booking and dashboard functionality

(No body.)

---

### a54d85e — Feb 11 — Update website builder and admin components

(No body.)

---

### c8a3310 — Feb 13 — Update website builder and authentication pages

(No body.)

---

### 9b28d19 — Feb 13 — Provider portal, admin dashboard, and provider APIs: availability, bookings, profile, settings, drive; migrations and docs

(Subject lists: provider portal, admin dashboard, provider APIs for availability, bookings, profile, settings, drive; migrations and documentation.)

---

### f5233d9 — Feb 13 — Fix customer-auth prerender: force dynamic rendering for route

Force dynamic for customer-auth route to fix Vercel prerender.

---

### c659cf7 — Feb 13 — Fix customer dashboard prerender: force dynamic for /customer routes

Force dynamic for `/customer` routes.

---

### 8494339 — Feb 13 — Fix login page prerender: force dynamic for /login route

Force dynamic for `/login` route.

---

### ba96395 — Feb 13 — Force dynamic rendering for all routes that use useSearchParams or auth context to fix Vercel prerender errors

Force dynamic on all layouts that use useSearchParams or auth context.

---

### 5d2ed9d — Feb 13 — Fix privacy-policy and terms-and-conditions prerender: force dynamic for pages using window.scrollTo

Force dynamic for privacy-policy and terms-and-conditions (window.scrollTo).

---

## Changes by commit (from diffs)

| Date   | Commit  | Files / what changed in code |
|--------|---------|------------------------------|
| **Feb 7**  | 7621bf5 | `database/migrations/002_create_business_website_configs.sql`, `README_002`; `useWebsiteConfig.ts` (business_id scoping); `builder/login/page.tsx`, `login/page.tsx`. |
| **Feb 7**  | fb8d8bd | `api/admin/reports/route.ts` (new), `api/admin/dashboard/route.ts`, `api/bookings/route.ts`; `admin/add-booking`, `dashboard`, `reports` pages. |
| **Feb 8**  | 2e56496 | Migrations: `create_business_website_configs_simple`, `create_website_assets_bucket`, `fix_leads_*`; `api/admin/website-config`, `upload-website-image`, `dashboard`; `admin/website-builder`, `dashboard`; `useWebsiteConfig`; `ImageUpload.tsx`. |
| **Feb 10** | bcbb0a0 | Migration `003_enable_rls_website_configs`; `website-builder/page`, `my-website/page`, `api/admin/website-config`; `Navigation`, `Footer`, `FAQs`, `HowItWorks`, `ImageUpload`; `BusinessContext`, `useWebsiteConfig`; `auth-client.ts`. |
| **Feb 10** | 4c5af3c | `Hero.tsx` (serviceTag prop); `website-builder/page.tsx` (Hero editor + service tag field). |
| **Feb 10** | c366bf5 | `website-builder/page.tsx` (resetToDefault, Reset button, history + toast). |
| **Feb 10** | e2d8a2c | `provider/availability/page.tsx` (calendar, slots, sync with settings). |
| **Feb 10** | 02bbed3 | Provider `dashboard`, `earnings`, `bookings` pages; `api/provider/dashboard`; removed `builder/login`, `builder/page`; `CHANGES_SUMMARY.txt`, ts config, test script. |
| **Feb 10** | bd895a9 | `admin/bookings` (fetch providers from API), `dashboard`, `website-builder`; `admin/settings/*`, `AdminLayout`; `useWebsiteConfig`. |
| **Feb 11** | df9d56e | `admin/add-booking`, `dashboard`; `api/admin/dashboard`, `api/bookings`. |
| **Feb 11** | a54d85e | `admin/customers/[id]`, `marketing`; `api/drive/upload`; `book-now`, `login`, `my-website`, `privacy-policy`, `terms-and-conditions`; `Footer`, `FrequencyAwareServiceCard`, `Navigation`, `QuantitySelector`, `ServiceCard`, `select`; `useLandingPageData`, `useWebsiteConfig`. |
| **Feb 13** | c8a3310 | `website-builder`, `auth/login`, `book-now`, `customer-auth`, `customer/dashboard`, `login`, `my-website`, `website/[businessSlug]`; `Footer`, `Hero`, `HowItWorks`, `Navigation`; `useCustomerAccount`, `useLandingPageData`, `useWebsiteConfig`. |
| **Feb 13** | 9b28d19 | Migrations: provider profile, availability slots/table, timezone, drive files/bucket; docs; scripts (tests, add-timezone); admin dashboard/providers; provider API routes (availability, bookings, drive, drive/upload, generate-slots, generate-slots-from-settings, profile, settings); provider pages (availability, bookings, dashboard, drive, earnings, profile, settings); `ProviderLayoutClient`, `auth-provider-client`, `supabaseProviderClient`. |
| **Feb 13** | f5233d9 | `customer-auth/layout.tsx` → `export const dynamic = 'force-dynamic'`. |
| **Feb 13** | c659cf7 | `customer/layout.tsx` → force-dynamic. |
| **Feb 13** | 8494339 | `login/layout.tsx` → force-dynamic. |
| **Feb 13** | ba96395 | `admin/AdminLayoutClient`, `admin/layout`, `auth/layout`, `book-now/layout`, `my-website/layout`, `provider/ProviderLayoutClient`, `provider/layout`, `website/layout` → force-dynamic. |
| **Feb 13** | 5d2ed9d | `privacy-policy/layout.tsx`, `terms-and-conditions/layout.tsx` → force-dynamic. |

*Progress update based on: (1) each commit’s message and body above, (2) actual file/diff changes in the table. Week of Feb 7–13, 2026.*
