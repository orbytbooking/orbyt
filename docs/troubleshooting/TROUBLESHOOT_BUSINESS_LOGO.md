# Business Logo Upload Troubleshooting Guide

## 🚨 Issue: Images not being stored in database

### **Step 1: Run Database Migrations**

You MUST run these SQL files in your Supabase SQL editor in order:

#### 1. Add Logo Column
```sql
-- Run this first: database/add_business_logo_column.sql
ALTER TABLE public.businesses ADD COLUMN logo_url text;
COMMENT ON COLUMN public.businesses.logo_url IS 'URL to the business logo image stored in Supabase Storage';
```

#### 2. Setup Storage Bucket
```sql
-- Run this second: database/setup_business_logos_storage.sql
-- (This creates the bucket and RLS policies)
```

### **Step 2: Verify Setup**

Run this diagnostic SQL to check if everything is set up correctly:

```sql
-- Check if logo_url column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
  AND table_schema = 'public'
  AND column_name = 'logo_url';

-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'business-logos';

-- Check current businesses
SELECT id, name, logo_url FROM public.businesses LIMIT 3;
```

### **Step 3: Test API Endpoint**

Check the browser console for errors when uploading. The API should log debug information.

### **Step 4: Common Issues & Solutions**

#### ❌ **Issue: "column logo_url does not exist"**
**Solution:** Run the `add_business_logo_column.sql` migration

#### ❌ **Issue: "bucket business-logos does not exist"**
**Solution:** Run the `setup_business_logos_storage.sql` migration

#### ❌ **Issue: "permission denied for storage.objects"**
**Solution:** Check RLS policies in the storage setup SQL

#### ❌ **Issue: "new row violates row-level security policy"**
**Solution:** Ensure user owns the business they're trying to update

#### ❌ **Issue: "No file provided" error**
**Solution:** Check if file is being properly sent from frontend

#### ❌ **Issue: "Business ID is required" error**
**Solution:** Ensure `currentBusiness` is loaded in BusinessContext

### **Step 5: Manual Testing**

#### Test Database Update Directly:
```sql
-- Test if you can manually update a business
UPDATE public.businesses 
SET logo_url = 'https://example.com/test.jpg' 
WHERE id = 'your-business-id-uuid';

-- Verify the update
SELECT logo_url FROM public.businesses WHERE id = 'your-business-id-uuid';
```

#### Test Storage Upload Directly:
```sql
-- Check if you can insert into storage (this tests permissions)
INSERT INTO storage.objects (bucket_id, name, owner_id)
VALUES ('business-logos', 'test-file.jpg', auth.uid());
```

### **Step 6: Frontend Debugging**

Check these in the browser:

1. **Network Tab**: Look for failed requests to `/api/admin/business/upload-logo`
2. **Console**: Look for JavaScript errors
3. **BusinessContext**: Ensure `currentBusiness` has an `id`

### **Step 7: Environment Variables**

Ensure these are set in `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Step 8: Quick Fix Script**

If nothing else works, run this complete setup:

```sql
-- Complete Business Logo Setup Script

-- 1. Add column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN logo_url text;
        COMMENT ON COLUMN public.businesses.logo_url IS 'URL to the business logo image stored in Supabase Storage';
    END IF;
END $$;

-- 2. Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 3. Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload logos for their businesses" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their business logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view business logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their business logos" ON storage.objects;

-- 4. Create new policies
CREATE POLICY "Users can upload logos for their businesses"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'business-logos' AND
  auth.role() = 'authenticated' AND
  (split_part(name, '/', 1))::text IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update their business logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'business-logos' AND
  auth.role() = 'authenticated' AND
  (split_part(name, '/', 1))::text IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view business logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'business-logos');

CREATE POLICY "Users can delete their business logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'business-logos' AND
  auth.role() = 'authenticated' AND
  (split_part(name, '/', 1))::text IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);

-- 5. Grant permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- 6. Verify setup
SELECT 'Setup Complete' as status;
```

### **Step 9: Test Upload**

After running the setup:

1. Go to `/admin/settings/general`
2. Try uploading a small image (under 1MB)
3. Check browser console for errors
4. Check network tab for API response

### **Still Not Working?**

Check these specific things:

1. **Business Ownership**: Ensure you're logged in as the business owner
2. **File Size**: Try with a very small image (under 100KB)
3. **File Type**: Use a simple JPEG or PNG
4. **Browser Console**: Look for specific error messages
5. **API Response**: Check what the server returns

### **Debug Commands**

Run these to verify everything is working:

```sql
-- Check your user ID and businesses
SELECT 
  auth.uid() as current_user_id,
  (SELECT id FROM businesses WHERE owner_id = auth.uid() LIMIT 1) as your_business_id;

-- Test if you can update your business
UPDATE public.businesses 
SET logo_url = 'test-url' 
WHERE owner_id = auth.uid()
RETURNING id, name, logo_url;
```

The most common issue is not running the database migrations. Run the SQL scripts first!
