# Business Website Configs Migration

## ⚠️ IMPORTANT: Run This Migration

**DO RUN:** `002_create_business_website_configs.sql` - This creates business isolation for website configs

## Step-by-Step Instructions

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents from `database/migrations/002_create_business_website_configs.sql`

5. Click **Run** or press `Ctrl+Enter`
6. Verify success message appears

### Option 2: Command Line

```bash
# Navigate to your project directory
cd c:\Users\AJ OFRACIO\Desktop\orbyt

# Run migration (if you have psql installed)
psql -h your-db-host -U postgres -d postgres -f database/migrations/002_create_business_website_configs.sql
```

## What This Migration Does

✅ Creates `business_website_configs` table for proper business isolation
✅ Adds Row Level Security policies
✅ Creates indexes for performance
✅ Adds automatic timestamp updates
✅ Ensures each business can only access their own website configs

## After Migration

Once migration is complete, your website builder will have proper business isolation:

1. Each business will have their own website configuration
2. Data is properly isolated between businesses
3. Customer signup will be associated with the correct business
4. Website builder pages will show business-specific content

## Verify Migration Success

After running migration, verify the table was created:

```sql
-- Check business_website_configs table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'business_website_configs'
ORDER BY ordinal_position;
```

You should see these columns:
- `id` (uuid, primary key)
- `business_id` (uuid, foreign key)
- `config` (jsonb)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)
