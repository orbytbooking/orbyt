# Customer Auth Business Isolation Fix

## Overview
Fixed customer login and signup to ensure proper business isolation. Customers can now sign up and log in with business-specific accounts, allowing the same email to be used across different businesses.

## Changes Made

### 1. Database Migration
**File:** `database/fix_customer_email_uniqueness_for_business_isolation.sql`

- Removed the global UNIQUE constraint on `email` column
- Added unique constraint on `(email, business_id)` combination
- Added unique constraint on `(auth_user_id, business_id)` combination
- This allows the same email to exist for different businesses while preventing duplicates within the same business

**Action Required:** Run this SQL script in your Supabase SQL Editor.

### 2. Customer Auth Page (`src/app/customer-auth/page.tsx`)
- **Signup:** 
  - Now requires `business` parameter from URL
  - Checks for existing customers by both email and auth_user_id for the specific business
  - Creates customer record with proper business_id association
  - Better error handling for duplicate accounts

- **Login:**
  - Requires `business` parameter from URL
  - Filters customer lookup by both `auth_user_id` AND `business_id`
  - Validates customer belongs to the current business context
  - Redirects to dashboard with business parameter

- **Auto-redirect:**
  - Updated to filter by business_id when checking existing session
  - Redirects include business context in URL

### 3. Login Page (`src/app/login/page.tsx`)
- **Signup:**
  - Now requires `business` parameter from URL (no fallback to any business)
  - Checks for existing customers before creating new record
  - Better error messages for business-specific account conflicts

- **Login:**
  - Requires `business` parameter from URL
  - Filters customer lookup by business_id
  - Redirects include business context

### 4. Customer Account Hook (`src/hooks/useCustomerAccount.ts`)
- Now accepts and uses `businessId` from URL search params
- Filters customer queries by `business_id`
- All redirects include business context
- Properly handles cases where business context is missing

## How It Works

1. **Signup Flow:**
   - User accesses `/customer-auth?business=<business-id>` or `/login?business=<business-id>`
   - User fills out signup form
   - System checks if email/auth_user_id already exists for this specific business
   - If not, creates new customer record with `business_id`
   - If yes, shows appropriate error message

2. **Login Flow:**
   - User accesses `/customer-auth?business=<business-id>` or `/login?business=<business-id>`
   - User enters credentials
   - System authenticates via Supabase Auth
   - System looks up customer record matching both `auth_user_id` AND `business_id`
   - If found and matches, redirects to dashboard with business context
   - If not found for this business, shows error

3. **Business Isolation:**
   - Same email can be used for different businesses
   - Each business gets its own customer record
   - Customer records are isolated by `business_id`
   - All queries filter by `business_id` to ensure proper isolation

## Additional Fixes for Login Issue

### Problem: "Customer account not found" after signup
**Root Cause:** Login query wasn't filtering by `business_id` before calling `.single()`, which could fail if multiple customer records exist.

**Fix Applied:**
- Updated login query to filter by both `auth_user_id` AND `business_id` from the start
- Added better error handling and verification after signup
- Added verification step to confirm customer record was created

### RLS Policy Fix
**File:** `database/ensure_customer_signup_rls_policy.sql`

- Ensures the "Allow customer signup" RLS policy exists
- This policy allows authenticated users to insert their own customer record
- **Action Required:** Run this SQL script if customer signup is failing with permission errors

## Testing Checklist

- [ ] Run database migration script (`fix_customer_email_uniqueness_for_business_isolation.sql`)
- [ ] Run RLS policy script (`ensure_customer_signup_rls_policy.sql`)
- [ ] Test signup with same email for different businesses
- [ ] Test login immediately after signup (should work now)
- [ ] Test login with business context
- [ ] Test login without business context (should fail gracefully)
- [ ] Test signup without business context (should fail gracefully)
- [ ] Verify redirects include business parameter
- [ ] Verify customer dashboard loads with business context
- [ ] Test that customers can't access other businesses' data
- [ ] Check browser console for any errors during signup/login

## Important Notes

1. **URL Structure:** All customer auth URLs must include `?business=<business-id>` parameter
2. **Database:** The migration must be run before the code changes will work properly
3. **Existing Data:** If you have existing customers, they should already have `business_id` set. The migration won't affect existing data.
4. **Supabase Auth:** Email uniqueness is still enforced at the Supabase Auth level (one email = one auth user), but customers can have multiple customer records for different businesses.

## Migration Instructions

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `database/fix_customer_email_uniqueness_for_business_isolation.sql`
3. Run the script
4. Verify the constraints were created:
   ```sql
   SELECT indexname, indexdef 
   FROM pg_indexes 
   WHERE tablename = 'customers' 
   AND indexname LIKE '%unique%';
   ```

## Rollback (if needed)

If you need to rollback:
```sql
-- Drop the new unique indexes
DROP INDEX IF EXISTS idx_customers_email_business_unique;
DROP INDEX IF EXISTS idx_customers_auth_user_business_unique;

-- Restore original unique constraint on email
ALTER TABLE public.customers 
ADD CONSTRAINT customers_email_key UNIQUE (email);
```
