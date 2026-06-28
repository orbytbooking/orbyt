# Orbyt CRM — Implementation Plan

**Created:** June 2026  
**Context:** Live on Vercel production. Core booking + gift cards work; security gaps and fake settings UI remain.

**Recommended order:** Phase 1 (security) → Phase 2 (trust + gift card gaps) → Phase 3 (revenue features).

---

## Overview

| Phase | Name | Duration | Outcome |
|-------|------|----------|---------|
| **1** | Production safe | 2–3 days | No public abuse of APIs; cron locked down |
| **2** | Trust + gift cards | 3–4 days | Settings persist; resend + coupon rules work |
| **3** | Gift card lifecycle | 3–5 days | Cancel/refund restores balance; optional scheduled send |
| **4** | Revenue (defer) | 1–2 weeks | Customer `/gift-cards` purchase; daily discounts in pricing |

**PR strategy:** One PR per bullet in Phase 1–2 when possible — easier review and rollback.

---

## Phase 1 — Production safe (P0)

**Goal:** Close routes that work without a logged-in admin session. No new customer-facing features.

### 1.1 Shared helper — block dev routes in production

**Task:** Add `src/lib/devRouteGuard.ts`:

```ts
// Returns 404 NextResponse in production, else null (allow handler to continue)
export function blockInProduction(): NextResponse | null
```

Optional: also allow `DEV_API_SECRET` bearer for local debugging against prod builds.

**Acceptance:**
- [x] Helper exported and unit-testable (or smoke-tested manually)
- [x] Documented in this file’s testing section

---

### 1.2 Lock down test / debug APIs

Apply `blockInProduction()` at top of each handler (or delete routes if unused).

| Route | File | Action |
|-------|------|--------|
| `GET /api/test-env` | `src/app/api/test-env/route.ts` | Block in prod |
| `GET /api/test-db` | `src/app/api/test-db/route.ts` | Block in prod |
| `GET/POST /api/test` | `src/app/api/test/route.ts` | Block in prod |
| `GET /api/test/gift-cards` | `src/app/api/test/gift-cards/route.ts` | Block in prod |
| `POST /api/test/invitation` | `src/app/api/test/invitation/route.ts` | Block in prod |
| `GET /api/test/debug-invitations` | `src/app/api/test/debug-invitations/route.ts` | Block in prod |
| `GET /api/test-email` | `src/app/api/test-email/route.ts` | Block in prod |
| `POST /api/test-campaign-email` | `src/app/api/test-campaign-email/route.ts` | Block in prod |

**Acceptance:**
- [x] `curl https://www.orbytservice.com/api/test-env` → 404 (or 401)
- [x] Local `npm run dev` — routes still work if needed for dev

**PR:** `fix: disable test API routes in production`

---

### 1.3 Require CRON_SECRET in production

**File:** `src/app/api/cron/auto-complete-bookings/route.ts`

**Change:** If `NODE_ENV === 'production'` and `!CRON_SECRET`, return 500 with clear log (misconfiguration). If secret set, require `Authorization: Bearer <CRON_SECRET>`.

**Vercel:** Confirm `CRON_SECRET` is set in Production env; cron job sends header.

**Acceptance:**
- [x] Unauthenticated POST to cron URL in prod → 401
- [x] Vercel cron still completes bookings when secret matches

**PR:** `fix: require CRON_SECRET for auto-complete cron in production`

---

### 1.4 Auth on `/api/admin/providers/*`

**Pattern** (copy from `src/app/api/admin/customers/[id]/route.ts`):

1. `const ctx = await requireAdminTenantContext(request)` — early return if `NextResponse`
2. `assertBusinessIdMatchesContext(bodyOrQueryBusinessId, ctx.businessId)`
3. Use `ctx.supabase` instead of ad-hoc service client where possible

| File | Methods |
|------|---------|
| `src/app/api/admin/providers/route.ts` | GET, POST |
| `src/app/api/admin/providers/enhanced/route.ts` | GET, POST |
| `src/app/api/admin/providers/legacy/route.ts` | GET |
| `src/app/api/admin/providers/available/route.ts` | GET |
| `src/app/api/admin/providers/realtime-status/route.ts` | GET |
| `src/app/api/admin/providers/[id]/route.ts` | GET, PUT |
| `src/app/api/admin/providers/[id]/create-auth-user/route.ts` | POST |
| `src/app/api/admin/providers/[id]/deactivate/route.ts` | POST |
| `src/app/api/admin/providers/[id]/drive/upload/route.ts` | POST |
| `src/app/api/admin/providers/[id]/avatar/route.ts` | POST (verify) |
| `src/app/api/admin/providers/[id]/availability/route.ts` | verify existing auth |
| `src/app/api/admin/providers/[id]/available-slots/route.ts` | verify existing auth |

**Already gated:** `[id]/impersonate/route.ts` — use as reference.

**Acceptance:**
- [x] Incognito GET `/api/admin/providers?businessId=...` → 401
- [x] Logged-in admin: invite provider, list providers, edit provider still work
- [x] Provider in tenant B not visible when session is tenant A

**PR:** `fix: require admin tenant context on provider APIs`

---

### 1.5 Other open write endpoints

| File | Fix |
|------|-----|
| `src/app/api/drive/upload/route.ts` | Add `requireAdminTenantContext` + ownership check, or return 404 in prod if unused |
| `src/app/api/admin/upload/route.ts` | Only allow `userId === ctx.user.id` (or admin staff role) |
| `src/app/api/admin/fix-providers/route.ts` | `blockInProduction()` + `requireAdminTenantContext`; hide page link in prod nav |
| `src/app/api/bookings/enhanced/route.ts` | `requireAdminTenantContext` on POST, or delete if zero callers |

**Grep before delete:** `rg "bookings/enhanced" src`

**Acceptance:**
- [x] Avatar upload works from Settings → Account for logged-in user
- [x] fix-providers not callable anonymously on production

**PR:** `fix: auth on upload and legacy repair routes`

---

### 1.6 Catalog write APIs — session + business permission

**Pattern** (from `src/app/api/service-categories/route.ts` POST):

```ts
const user = await getAuthenticatedUser();
if (!user) return createUnauthorizedResponse();
const allowed = await userCanManageBookingsForBusiness(supabase, user.id, businessId);
if (!allowed) return createForbiddenResponse();
// then requireIndustryBelongsToBusiness(...)
```

**Apply to POST/PUT/PDELETE on:**

| File |
|------|
| `src/app/api/extras/route.ts` |
| `src/app/api/extras/[id]/route.ts` |
| `src/app/api/extras/reorder/route.ts` |
| `src/app/api/pricing-parameters/route.ts` |
| `src/app/api/pricing-parameters/reorder/route.ts` |
| `src/app/api/pricing-variables/route.ts` |
| `src/app/api/exclude-parameters/route.ts` |
| `src/app/api/form2/extras/route.ts` |
| `src/app/api/form2/extras/[id]/route.ts` |
| `src/app/api/form2/extras/reorder/route.ts` |
| `src/app/api/form2/addons/route.ts` |
| `src/app/api/form2/addons/[id]/route.ts` |
| `src/app/api/form2/addons/reorder/route.ts` |

**Note:** GET for book-now may stay public where intentional; only gate **writes**.

**Acceptance:**
- [x] Admin can still add/edit extras in Settings → Industries
- [x] Unauthenticated POST to `/api/extras` → 401

**PR:** `fix: require admin auth on catalog write APIs`

---

### Phase 1 — Smoke test checklist

Run on **production** after deploy:

```
[ ] /api/test-env → blocked
[ ] /api/admin/providers (no cookie) → 401
[ ] Login → Providers → invite → email received with production URL
[ ] Settings → Industries → save extra → success
[ ] Book-now on DEMO tenant → complete test booking
[ ] Cron auto-complete (if enabled) → still runs
```

**`blockInProduction()` (Phase 1.1):** Returns HTTP 404 when `NODE_ENV === 'production'`. In dev (`npm run dev`), test routes are unchanged. For local debugging against a production build (`npm run build && npm start`), set `DEV_API_SECRET` and pass `Authorization: Bearer <DEV_API_SECRET>` to bypass the guard.

---

## Phase 2 — Trust + gift card quick wins (P1)

**Goal:** Stop fake saves; close the highest-impact gift card gaps. No new public pages yet.

### 2.1 Wire Settings → General (Admin tab)

**Status:** Done (code). Run migration `159_admin_general_store_options.sql` on Supabase if not applied yet.

**File:** `src/app/admin/settings/general/page.tsx` (~line 5112 fake save)

**Steps:**
1. Audit which fields are fake: gift card min/max, referral, payment description, etc.
2. Check if columns exist on `business_store_options` or separate table — add migration if missing
3. Extend `GET/PATCH` `src/app/api/admin/store-options/route.ts` with new fields
4. On page load: fetch store options into state
5. On save: `PATCH` API, remove `setTimeout` fake toast

**Acceptance:**
- [x] Change gift card minimum → Save → hard refresh → value persists
- [x] Network tab shows real API call on save

**PR:** `feat: persist general settings admin tab via store-options`

---

### 2.2 Wire Settings → Notifications

**Status:** Done (code).

**File:** `src/app/admin/settings/notifications/page.tsx`

**Steps:**
1. Replace `console.log` save with `PUT /api/admin/notification-preferences` (route exists)
2. Load preferences on mount from same API
3. Resend verification: wire to Resend/domain verification flow or disable button with honest “contact support” until wired

**Acceptance:**
- [x] Toggle notification preference → save → reload → unchanged toggles persist

**PR:** `fix: wire notification preferences save to API`

---

### 2.3 Gift card — resend email

**Status:** Done (code).

**New route:** `POST /api/marketing/gift-cards/instances/[id]/resend`

- Gate: `gateMarketingTenantApi` (same as other gift card routes)
- Load instance + template; call `sendGiftCardEmail()` from `src/lib/sendGiftCardEmail.ts`
- Optional: rate limit (e.g. 3 resends per instance per day)

**UI:** `src/components/admin/marketing/GiftCardInstances.tsx` — Resend button on active instances

**Acceptance:**
- [x] Resend on DEMO instance → email arrives with image + Book now link
- [x] Wrong tenant instance ID → 403

**PR:** `feat: resend gift card email from instances list`

---

### 2.4 Gift card — enforce `allow_gift_cards` on coupons

**Today:** Flag saved in `marketing_coupons.allow_gift_cards` only.

**Steps:**
1. When coupon applied at checkout, pass `allow_gift_cards` to client state
2. In `src/lib/giftCardBooking.ts` (or validate endpoint): if active coupon has `allow_gift_cards === false`, reject gift card apply
3. UI: hide or disable gift card tab when coupon blocks it

**Files to touch:**
- `src/lib/giftCardBooking.ts`
- `src/app/api/guest/gift-card/route.ts` (or validate route)
- `src/app/book-now/BookingPageContent.tsx`
- Admin `AddBookingForm.tsx` if coupon + gift card used there

**Acceptance:**
- [x] Coupon with “allow gift cards” off → gift card rejected with clear message
- [x] Coupon with flag on → gift card works as today

**PR:** `fix: enforce allow_gift_cards coupon rule at checkout`

---

### 2.5 Cleanup — fake daily discounts page

**File:** `src/app/admin/marketing/daily-discounts/page.tsx`

**Option A (recommended):** Redirect to `/admin/marketing?tab=daily-discounts`  
**Option B:** Wire to same logic as `DailyDiscountsForm.tsx`

**Acceptance:**
- [x] Standalone page no longer shows fake success toast

**PR:** `chore: redirect legacy daily-discounts page to marketing tab`

---

### Phase 2 — Smoke test checklist

```
[ ] General settings gift card min → persists after refresh
[ ] Notification preference → persists
[ ] Gift card instance → Resend → email received
[ ] Apply coupon (no gift cards) + try gift card → blocked
[ ] Apply coupon (gift cards allowed) + gift card → works
```

---

## Phase 3 — Gift card lifecycle (when refunds matter)

**Status:** Implemented (requires migration `160_gift_card_lifecycle.sql` on Supabase).

### 3.1 Cancel / refund → restore balance

**Rules:**
- Cancel unused instance → balance zeroed, status cancelled, `refund` transaction logged
- Booking cancelled after redemption → restore redeemed amount via `refund_gift_card_for_booking` RPC (not for expired/cancelled cards)
- Expired cards → no restore on booking cancel

**Implementation:**
- `database/migrations/160_gift_card_lifecycle.sql` — RPC + columns
- `src/lib/giftCardLifecycle.ts` — `restoreGiftCardRedemptionForBooking`, shared email helper
- Admin booking cancel + customer cancel → restore hook
- `DELETE` gift card instance → zero balance + refund transaction

**Acceptance:**
- [x] Cancel booking with gift card redemption → balance restored
- [x] Admin cancel instance → cancelled with refund log
- [x] Expired card → no restore on booking cancel

### 3.2 Scheduled gift card send

- Migration adds `scheduled_send_at`, `pending_send` status
- `SendGiftCard.tsx` — schedule date/time POST
- `POST /api/marketing/gift-cards/instances` — defer email when scheduled
- `GET/POST /api/cron/send-scheduled-gift-cards` — cron (Bearer CRON_SECRET)

**Acceptance:**
- [x] Schedule gift card → status `pending_send`, no immediate email
- [x] Cron processes due cards → email sent, status `active`

**Cron setup:** Call `/api/cron/send-scheduled-gift-cards` every 5–15 minutes with `Authorization: Bearer <CRON_SECRET>` (same pattern as auto-complete-bookings).

---

## Phase 4 — Revenue & marketing (defer)

| Item | Effort | When to start |
|------|--------|---------------|
| Public `/gift-cards` purchase page + Stripe/Authorize.Net | L | When selling gift cards online |
| Daily discounts applied in booking price engine | L | When marketing promises day-of-week deals |
| Per-location payment processor | L | Multi-processor tenants only |
| Provider self-signup | L | High provider volume |
| Customer ratings persist | M | If using ratings in operations |
| Hiring prospect file uploads | M | If using hiring module heavily |

---

## Suggested calendar

| Week | Work | PRs |
|------|------|-----|
| **1** | Phase 1.1–1.6 | 4–5 small PRs |
| **2** | Phase 2.1–2.5 | 3–4 PRs |
| **3** | Phase 3.1–3.2 (if needed) | 2 PRs |
| **4+** | Phase 4 as business requires | TBD |

---

## Environment reminders (production)

| Variable | Required for |
|----------|----------------|
| `NEXT_PUBLIC_APP_URL` | Gift card Book now links, invites, checkout return URLs |
| `CRON_SECRET` | Phase 1.3 |
| `RESEND_API_KEY` | Gift card + notification emails |
| Live Stripe / Authorize.Net | Real payments |

See `docs/DEPLOYMENT_CHECKLIST.md` for full deploy steps.

---

## How to execute with Cursor

1. **Phase 1:** Say *“Implement Phase 1.2 — block test routes”* (one section at a time)
2. After each PR: run `npm run build` locally; smoke test on Vercel preview
3. **Phase 2:** Same pattern per subsection
4. Track checkboxes in this file (commit updates optional)

---

## Status tracker

| Section | Status | Done |
|---------|--------|------|
| 1.1 devRouteGuard | Done | [x] |
| 1.2 Test routes | Done | [x] |
| 1.3 CRON_SECRET | Done | [x] |
| 1.4 Provider APIs | Done | [x] |
| 1.5 Upload / fix-providers | Done | [x] |
| 1.6 Catalog writes | Done | [x] |
| 2.1 General settings | Done | [x] |
| 2.2 Notifications | Done | [x] |
| 2.3 Resend gift card | Done | [x] |
| 2.4 allow_gift_cards | Done | [x] |
| 2.5 Daily discounts redirect | Done | [x] |
| 3.x Lifecycle | Done | [x] |
| 4.x Revenue | Deferred | [ ] |
