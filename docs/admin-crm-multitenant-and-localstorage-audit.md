# Admin CRM: Multitenant Isolation & localStorage Audit

Summary of what in the admin CRM is **not yet business-isolated (multitenant)** and what is **still dependent on localStorage**.

---

## 1. Not business-isolated (multitenant) or using localStorage for business context

### 1.1 Using `localStorage.getItem('currentBusinessId')` instead of `useBusiness()`

These pages read business context from localStorage instead of the shared `BusinessContext`. That breaks when the user switches business in the UI (context updates but localStorage does not) and is not multitenant-safe.

| Location | Issue |
|----------|--------|
| **`src/app/admin/add-provider/page.tsx`** | Uses `localStorage.getItem('currentBusinessId')` for the business when creating a provider. Does not use `useBusiness()`. |
| **`src/app/admin/settings/industries/form-1/service-category/new/page.tsx`** | Fetches industry with `localStorage.getItem('currentBusinessId')` in a `useEffect` instead of `currentBusiness` from `useBusiness()`. |

**Recommendation:** Use `useBusiness()` and `currentBusiness?.id` everywhere in admin. Stop reading/writing `currentBusinessId` from localStorage for tenant context (auth/login and onboarding can keep setting it for legacy fallbacks elsewhere if needed).

---

### 1.2 localStorage keys not scoped by business (data can leak across tenants)

These storage keys are **global** (no `business_id` in the key). If an admin switches business, they can see or overwrite another business’s data.

| Location | Keys | Risk |
|----------|------|------|
| **`src/app/admin/providers/[id]/page.tsx`** | `adminProviderSettings`, `adminProviderAvatars`, `adminProviderSchedules`, `adminProviderFiles` | Provider settings, avatars, schedules, and files are shared across all businesses. Switching business does not change data. |
| **`src/app/admin/customers/[id]/page.tsx`** | `adminCustomers`, `adminBookings`, `adminCustomerExtras`, `customerInvoices_${id}`, `customerDriveFiles_${id}` | Customers, bookings, extras, invoices, and drive files are global. Same cross-tenant leak. |
| **`src/app/admin/customers/page.tsx`** | `adminCustomers` | Customer list is global. |

**Recommendation:** Either remove these localStorage flows and use only DB/APIs scoped by `business_id`, or (if keeping a temporary fallback) scope keys by business, e.g. `adminProviderSettings_${businessId}` and only read/write when `currentBusiness?.id` matches.

---

## 2. Still dependent on localStorage (data or critical UI)

### 2.1 Admin CRM data in localStorage (should move to DB / API)

| Location | What is stored | Note |
|----------|----------------|------|
| **`admin/providers/[id]/page.tsx`** | Provider settings, avatars, schedules, files (maps keyed by provider id) | Primary persistence is localStorage; not business-scoped. |
| **`admin/customers/[id]/page.tsx`** | Customers list, bookings, customer extras, invoices, drive files | Load/save from localStorage; not business-scoped. |
| **`admin/customers/page.tsx`** | Customer list | Writes to `adminCustomers` on update. |
| **`admin/profile/page.tsx`** | adminEmail, adminName, adminPhone, adminCompany, adminLocation, adminBio, adminRole, emailNotifications, pushNotifications, adminTheme | Profile/UI prefs; comment says “minimal localStorage fallback” and picture is DB-only. |
| **`admin/settings/account/page.tsx`** | emailNotifications, pushNotifications, adminTheme | UI preferences only. |
| **`admin/settings/reserve-slot/page.tsx`** | Reserve-slot settings via `RESERVE_SLOT_STORAGE_KEY` and locations | Full settings in localStorage. |
| **`admin/settings/industries/form-1/pricing-parameter/new/page.tsx`** | Variables and “all data” keys | localStorage read/write. |
| **`admin/settings/industries/form-1/pricing-parameter/manage-variables/page.tsx`** | Variables key | localStorage. |
| **`admin/settings/industries/form-1/locations/page.tsx`** | Locations (with DB fallback) | localStorage as fallback/sync. |
| **`admin/settings/industries/form-1/service-category/new/page.tsx`** | Pricing parameters, extras, providers | Fetched “from localStorage” (legacy). |
| **`admin/settings/industries/form-1/extras/new/page.tsx`** | Legacy localStorage loading | Backwards compatibility. |
| **`admin/settings/industries/form-1/migrate/page.tsx`** | Counts of localStorage data per module | Migration UI; reads localStorage. |
| **`admin/marketing/coupons/new/page.tsx`** | `industries` | Loads from localStorage. |
| **`admin/marketing/coupons/[id]/edit/page.tsx`** | `industries` | Same. |
| **`admin/leads/page.tsx`** | `customStatuses` | Custom statuses in localStorage. |

### 2.2 Admin hiring/components (localStorage-backed)

| Component | Key(s) | What is stored |
|-----------|--------|----------------|
| **`components/admin/hiring/ReportsTab.tsx`** | `APPLICANTS_KEY` | Applicants. |
| **`components/admin/hiring/QuizzesTab.tsx`** | `STORAGE_KEY` | Quizzes. |
| **`components/admin/hiring/ProspectsTab.tsx`** | `STORAGE_KEY` | Prospects. |
| **`components/admin/hiring/OnboardingTab.tsx`** | `STORAGE_KEY`, `COLUMNS_KEY` | Applicants, column config. |
| **`components/admin/hiring/InterviewsTab.tsx`** | `STORAGE_KEY` | Interviews. |
| **`components/admin/hiring/ContactsTab.tsx`** | `APPLICANTS_KEY` | Contacts. |
| **`components/admin/JobOpeningsManager.tsx`** | `JOB_OPENINGS_STORAGE_KEY` | Job openings. |
| **`components/admin/JobFormManager.tsx`** | `JOB_FORM_STORAGE_KEY` | Job form fields. |
| **`components/admin/FAQsManager.tsx`** | `FAQS_STORAGE_KEY` | FAQs. |

These are not (in the audit) keyed by `business_id`, so they are not multitenant-safe.

---

## 3. Already using business context correctly (reference)

These admin pages use `useBusiness()` and pass `currentBusiness.id` or `currentBusiness?.id` to APIs / Supabase, so they are business-aware:

- **dashboard** – uses `useBusiness()`
- **providers list** – `currentBusiness.id`, `.eq('business_id', currentBusinessId)`
- **bookings** – `currentBusiness?.id` in query
- **marketing** – `currentBusiness.id` / `currentBusiness?.id` in API calls and Supabase
- **add-booking** – `currentBusiness.id` for industries and APIs
- **profile** – `currentBusiness?.id` for business_id
- **settings (account, your-info, industries, form-1 variants, etc.)** – use `currentBusiness` from `useBusiness()` for API calls
- **customers list** – `.eq('business_id', currentBusiness?.id)` and `business_id` in payload
- **add-provider** – **exception:** still uses localStorage for business ID (see 1.1)

---

## 4. Recommendations (short)

1. **Business context**  
   - Replace every `localStorage.getItem('currentBusinessId')` in admin with `useBusiness().currentBusiness?.id`.  
   - Ensure `add-provider` and service-category new page use `useBusiness()`.

2. **Multitenant safety**  
   - Scope any remaining admin localStorage keys by `business_id`, or remove them and use only DB/APIs that filter by `business_id`.  
   - Prioritize: provider detail (settings, avatars, schedules, files) and customer detail (customers, bookings, extras, invoices, drive files).

3. **Move critical data off localStorage**  
   - Prefer DB/API for: provider settings/schedules/files, customer data, bookings, invoices, customer drive files, reserve-slot settings, industries/coupons/leads data, and hiring (applicants, quizzes, prospects, onboarding, interviews, contacts, job openings, job form, FAQs).  
   - Keep in localStorage only non-critical UI preferences (e.g. theme, notification toggles) if desired, and ensure they don’t drive tenant-specific data.

4. **Hiring and settings**  
   - Add `business_id` to any DB/API used for hiring and industry/settings, and scope localStorage by `business_id` if still used as a cache/fallback.

This audit focuses on the admin CRM; the same patterns (business context from context vs localStorage, and business-scoped keys) should be applied elsewhere (e.g. `useWebsiteConfig`, `useLandingPageData`, `book-now`, `my-website`) for full multitenancy.
