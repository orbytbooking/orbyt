# Logo Upload Setup Checklist

## ✅ Prerequisites

### 1. Database Setup
- [ ] Run `setup_business_logos_storage.sql` in Supabase SQL editor
- [ ] Run `cleanup-blob-urls.sql` to clean any existing blob URLs
- [ ] Verify `businesses` table has `logo_url` column

### 2. Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (for admin operations)

### 3. Storage Bucket Configuration
- [ ] `business-logos` bucket exists
- [ ] Bucket is public (readable by anyone)
- [ ] Row Level Security policies are in place
- [ ] File size limit: 5MB
- [ ] Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

## 🧪 Testing

### 1. Browser Console Test
1. Open your application
2. Press F12 to open developer tools
3. Go to Console tab
4. Paste and run the contents of `test-logo-upload.js`
5. Check for all ✅ success messages

### 2. Manual Upload Test
1. Go to Admin → Settings → Account → Your Info
2. Click "Choose File" for logo
3. Select an image file (JPEG, PNG, GIF, or WebP, under 5MB)
4. Click "Save Changes"
5. Verify the logo appears in the sidebar
6. Refresh the page to confirm persistence

## 🔧 Troubleshooting

### Common Issues

#### "Upload failed: Unauthorized"
- Check user is logged in
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Ensure user owns the business

#### "Upload failed: Bucket not found"
- Run `setup_business_logos_storage.sql`
- Check bucket name spelling

#### "Upload failed: File size too large"
- Ensure image is under 5MB
- Compress image if needed

#### "Logo not showing after upload"
- Check browser console for blob URL errors
- Run `cleanup-localstorage.js` in browser console
- Refresh the page

#### "Database not updated"
- Check Row Level Security policies
- Verify business ID is correct
- Check network tab for API errors

### Debug Steps

1. **Check Storage Bucket**
   ```sql
   SELECT * FROM storage.buckets WHERE name = 'business-logos';
   ```

2. **Check Business Logo URL**
   ```sql
   SELECT id, name, logo_url FROM businesses WHERE logo_url IS NOT NULL;
   ```

3. **Check Storage Objects**
   ```sql
   SELECT * FROM storage.objects WHERE bucket_id = 'business-logos';
   ```

4. **Check Browser Network Tab**
   - Look for `/api/admin/business/upload-logo` requests
   - Check response status and body
   - Verify request payload contains file and businessId

## 📁 File Structure

```
src/
├── app/api/admin/business/upload-logo/route.ts  # Upload API endpoint
├── app/admin/settings/account/your-info/page.tsx # Upload UI
├── components/admin/BusinessLogoUpload.tsx       # Reusable upload component
├── contexts/LogoContext.tsx                      # Logo state management
└── layouts/AdminLayout.tsx                       # Logo display in sidebar

database/
├── setup_business_logos_storage.sql              # Storage bucket setup
└── add_business_logo_column.sql                  # Database column setup
```

## 🎯 Expected Behavior

1. User selects image file
2. Image preview shows immediately (using blob URL temporarily)
3. User clicks "Save Changes"
4. Image uploads to Supabase Storage
5. Database updated with permanent URL
6. UI updates to show permanent URL
7. Logo persists across page refreshes
8. Logo appears in admin sidebar

## 🔄 API Flow

```
Frontend → POST /api/admin/business/upload-logo
         ↓
    1. Validate user authentication
    2. Validate file (type, size)
    3. Upload to Supabase Storage (business-logos bucket)
    4. Get public URL
    5. Update businesses table with logo_url
    6. Return success with URL
         ↓
Frontend updates UI with permanent URL
```
