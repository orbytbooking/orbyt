# Customer Authentication Migration Guide

## Overview

The customer login portal has been migrated from local storage to database-backed authentication using Supabase. This provides secure, persistent authentication across devices and sessions.

## What Changed

### Before (Local Storage)
- Customer credentials stored in browser `localStorage`
- Authentication state managed with `customerAuth` flag
- Account data stored in `customerAccount` JSON object
- No server-side validation
- Data lost when clearing browser cache

### After (Database Authentication)
- Customer credentials stored securely in Supabase Auth
- Authentication managed by Supabase session tokens
- Account data stored in `customers` table
- Server-side validation and security
- Persistent across devices and browsers

## Database Setup

### 1. Run the Migration Script

Execute the following SQL migration to add necessary fields and security policies:

```bash
# Connect to your Supabase database and run:
psql -h your-db-host -U postgres -d postgres -f database/add_customer_auth_fields.sql
```

Or run it directly in the Supabase SQL Editor:
- Go to Supabase Dashboard → SQL Editor
- Copy contents of `database/add_customer_auth_fields.sql`
- Execute the script

### 2. Verify the Migration

Check that the following were added:
- `avatar` column in `customers` table
- `email_notifications`, `sms_notifications`, `push_notifications` columns
- Row Level Security (RLS) policies for customer data access
- Indexes on `auth_user_id` and `email` for performance

## Updated Components

### 1. Login Page (`src/app/login/page.tsx`)
- **Login**: Uses `supabase.auth.signInWithPassword()`
- **Signup**: Creates Supabase auth user + customer record
- **Password Reset**: Uses `supabase.auth.resetPasswordForEmail()`
- Removed all `localStorage` dependencies

### 2. Customer Account Hook (`src/hooks/useCustomerAccount.ts`)
- Fetches customer data from database on mount
- Listens to Supabase auth state changes
- Updates customer data via database queries
- Password changes use `supabase.auth.updateUser()`

### 3. Navigation Component (`src/components/Navigation.tsx`)
- Checks authentication via Supabase session
- Verifies customer record exists in database
- Listens to auth state changes for real-time updates

### 4. Hero Component (`src/components/Hero.tsx`)
- Updated to use Supabase authentication state
- Removed local storage checks

### 5. Customer Profile Page (`src/app/customer/profile/page.tsx`)
- Removed "Current Password" field (Supabase handles this)
- Password updates use Supabase Auth API
- Profile updates save to database

## Authentication Flow

### Customer Signup
1. User fills out signup form
2. Creates Supabase auth user with email/password
3. Creates customer record in `customers` table
4. Links customer to auth user via `auth_user_id`
5. Sends email confirmation
6. User confirms email to activate account

### Customer Login
1. User enters email/password
2. Supabase validates credentials
3. Returns session token
4. Fetches customer data from database
5. Redirects to customer dashboard

### Session Management
- Sessions are managed by Supabase (stored in cookies)
- Automatic token refresh
- Auth state listeners update UI in real-time
- Logout clears session and redirects to login

## Security Features

### Row Level Security (RLS)
- Customers can only view/update their own data
- Business owners can view/manage their customers
- Enforced at database level

### Password Security
- Passwords hashed by Supabase Auth
- Never stored in plain text
- Password reset via secure email link
- Minimum 6 characters required

## Testing the Migration

### 1. Create a Test Customer Account
```bash
# Go to http://localhost:3000/login
# Click "Sign up"
# Fill in customer details
# Check email for confirmation link
```

### 2. Verify Database Records
```sql
-- Check customer was created
SELECT id, name, email, auth_user_id, status 
FROM customers 
WHERE email = 'test@example.com';

-- Check auth user exists
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'test@example.com';
```

### 3. Test Login Flow
- Log in with test credentials
- Verify redirect to customer dashboard
- Check that customer data loads correctly
- Test logout functionality

### 4. Test Profile Updates
- Update customer name, phone, address
- Verify changes persist in database
- Test notification preferences
- Test password change

## Troubleshooting

### Issue: "Customer account not found"
**Cause**: Auth user exists but no customer record
**Solution**: Create customer record with matching `auth_user_id`

### Issue: "Email not confirmed"
**Cause**: User hasn't clicked confirmation email
**Solution**: Resend confirmation email or manually confirm in Supabase dashboard

### Issue: RLS policy errors
**Cause**: Missing or incorrect RLS policies
**Solution**: Re-run migration script to create policies

### Issue: Session not persisting
**Cause**: Cookie configuration issue
**Solution**: Check Supabase client configuration in `src/lib/supabaseClient.ts`

## Migration Checklist

- [x] Create database migration script
- [x] Update login page to use Supabase auth
- [x] Update useCustomerAccount hook
- [x] Update Navigation component
- [x] Update Hero component
- [x] Update customer profile page
- [x] Remove all localStorage dependencies
- [ ] Run database migration on production
- [ ] Test customer signup flow
- [ ] Test customer login flow
- [ ] Test password reset flow
- [ ] Test profile updates
- [ ] Migrate existing customers (if any)

## Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Next Steps

1. **Run the database migration** in your Supabase project
2. **Test the authentication flow** thoroughly
3. **Update email templates** in Supabase dashboard (optional)
4. **Configure email provider** for production (Resend, SendGrid, etc.)
5. **Set up monitoring** for authentication errors

## Support

For issues or questions:
- Check Supabase Auth documentation: https://supabase.com/docs/guides/auth
- Review Supabase logs in dashboard
- Check browser console for client-side errors
- Review server logs for API errors
