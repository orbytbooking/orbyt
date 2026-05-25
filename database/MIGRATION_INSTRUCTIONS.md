# Customer Authentication Migration - Run This

## ⚠️ IMPORTANT: Which Script to Run

**DO NOT RUN:** `full_schema.sql` - This is for reference only and will cause errors

**DO RUN:** `add_customer_auth_fields.sql` - This is the migration script

## Step-by-Step Instructions

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents below:

```sql
-- Add additional fields to customers table for authentication
-- This ensures customers can have proper authentication through Supabase

-- Add avatar field for profile pictures
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Add notification preferences
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;

-- Add index on auth_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON public.customers(auth_user_id);

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can read their own data
CREATE POLICY IF NOT EXISTS "Customers can view own data"
ON public.customers
FOR SELECT
USING (auth.uid() = auth_user_id);

-- Policy: Customers can update their own data
CREATE POLICY IF NOT EXISTS "Customers can update own data"
ON public.customers
FOR UPDATE
USING (auth.uid() = auth_user_id);

-- Policy: Business owners and admins can view their customers
CREATE POLICY IF NOT EXISTS "Business owners can view their customers"
ON public.customers
FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Policy: Business owners and admins can insert customers
CREATE POLICY IF NOT EXISTS "Business owners can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Policy: Business owners and admins can update their customers
CREATE POLICY IF NOT EXISTS "Business owners can update their customers"
ON public.customers
FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);
```

5. Click **Run** or press `Ctrl+Enter`
6. Verify success message appears

### Option 2: Command Line

```bash
# Navigate to your project directory
cd c:\Users\demes\Desktop\orbyt

# Run the migration
psql -h your-db-host -U postgres -d postgres -f database/add_customer_auth_fields.sql
```

## Verify Migration Success

After running the migration, verify the columns were added:

```sql
-- Check the customers table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers'
ORDER BY ordinal_position;
```

You should see these new columns:
- `avatar` (text)
- `email_notifications` (boolean, default: true)
- `sms_notifications` (boolean, default: true)
- `push_notifications` (boolean, default: true)

## Troubleshooting

### Error: "relation already exists"
- You're running the wrong script
- Run `add_customer_auth_fields.sql` instead of `full_schema.sql`

### Error: "column already exists"
- The migration uses `IF NOT EXISTS` so this shouldn't happen
- If it does, the column is already there - safe to ignore

### Error: "policy already exists"
- The migration uses `IF NOT EXISTS` so this shouldn't happen
- If it does, the policy is already there - safe to ignore

## What This Migration Does

✅ Adds 4 new columns to existing `customers` table
✅ Creates performance indexes
✅ Enables Row Level Security
✅ Creates security policies
✅ Does NOT modify existing data
✅ Does NOT recreate the table

## After Migration

Once the migration is complete, your customer login portal will be fully functional with database authentication!

Test by:
1. Going to `http://localhost:3000/login`
2. Creating a new customer account
3. Logging in
4. Checking that data persists in the database
