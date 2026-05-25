# 🚀 Deployment Checklist

## MVP / First business launch (home cleaning or single business)

Use this for going live with one business (e.g. home cleaning).

### Environment variables
Set these (e.g. in Vercel or `.env.local`); see `.env.example` for names:
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Stripe:** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (use live keys for real payments)
- **Google Maps:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (for service-area drawing in Settings > Industries > Locations)
- **App:** `NEXT_PUBLIC_APP_URL` (e.g. `https://yourdomain.com`)
- **Email:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (or your provider) for booking and invoice emails

### Database
- Run all migrations in `database/migrations/` in order (001 through 043).
- Ensure one business exists and an admin (owner) user can sign in at `/auth/login`.

### One-time setup after deploy
1. Admin logs in at `/auth/login`.
2. **Settings:** General (currency, timezone, scheduling), Reserve-slot (holidays, spot limits), Industries (add Home Cleaning, locations, services, frequencies, pricing).
3. **Account > Billing:** Complete Stripe Connect so customers can pay online.
4. **Providers:** Invite at least one provider; set availability and services.
5. Share booking link: `/book-now?business=YOUR_BUSINESS_ID`.

### Optional
- Schedule cron for `api/cron/auto-complete-bookings` to auto-complete past bookings.
- See `docs/DEMO_FLOW_MVP.md` for full demo flow and URLs.

---

## Provider Invitation Fix - Deployment Checklist

## ✅ Changes Made
1. **Fixed API routes** - Removed hardcoded Supabase credentials
2. **Enhanced auth user creation** - Proper error handling and cleanup
3. **Updated URLs for production** - All invitation URLs now point to https://www.orbytservice.com
4. **Fixed environment variables** - Cleaned up .env.example

## 📋 Pre-Deployment Checklist

### 1. Environment Variables (Required in Vercel)
Make sure these are set in your Vercel dashboard:
```
NEXT_PUBLIC_SUPABASE_URL=https://gpalzskadkrfedlwqobq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=https://www.orbytservice.com
RESEND_API_KEY=re_MMzU8AP5_36ecKHduvWqazLgxyVErcJvX
RESEND_FROM_EMAIL=noreply@orbytservice.com
```

### 2. Vercel Secrets Required
In your GitHub repository settings, make sure these secrets exist:
```
VERCEL_TOKEN
VERCEL_ORG_ID  
VERCEL_PROJECT_ID
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### 3. Database Verification
- ✅ `provider_invitations` table exists
- ✅ `service_providers` table exists  
- ✅ `auth.users` table exists (Supabase Auth)
- ✅ RLS policies allow service role operations

## 🔄 Deployment Steps

### Option 1: Automatic Deployment (Recommended)
1. Push to main branch:
   ```bash
   git add .
   git commit -m "Fix provider invitation flow - auth user creation and URL handling"
   git push origin main
   ```

### Option 2: Manual Deployment
1. Deploy to Vercel manually:
   ```bash
   npm run build
   vercel --prod
   ```

## 🧪 Post-Deployment Testing

### 1. Test Invitation Flow
1. Go to: https://www.orbytservice.com/admin/add-provider
2. Add a new provider
3. Check email for invitation
4. Click invitation link
5. Should go to: https://www.orbytservice.com/provider/invite?token=...
6. Set password and create account
7. Try login at: https://www.orbytservice.com/provider/login

### 2. Verify Database
- ✅ Provider record created in `service_providers` with valid `user_id`
- ✅ Auth user created in `auth.users`
- ✅ Invitation marked as 'accepted' in `provider_invitations`

### 3. Check Logs
- Vercel function logs for any errors
- Supabase auth logs for user creation
- Email delivery logs (Resend dashboard)

## 🐛 Troubleshooting

### If invitation links still redirect to auth/login:
1. Check if `NEXT_PUBLIC_APP_URL` is set correctly in Vercel
2. Clear browser cache and cookies
3. Check if there are any client-side redirects

### If auth user creation fails:
1. Verify `SUPABASE_SERVICE_ROLE_KEY` has correct permissions
2. Check Supabase Auth settings
3. Review Vercel function logs

### If emails don't arrive:
1. Verify `RESEND_API_KEY` is valid
2. Check Resend dashboard for delivery status
3. Verify sender domain is verified in Resend

## 📊 Expected Behavior After Fix

1. **Admin adds provider** → ✅ Invitation created
2. **Email sent** → ✅ Contains correct production URL
3. **User clicks link** → ✅ Goes to `/provider/invite` (not auth/login)
4. **User sets password** → ✅ Creates auth user AND provider record
5. **User can login** → ✅ Works with created credentials

---

**Ready to deploy! 🚀**
