# Business Logo/Image Upload Setup Guide

This guide will help you set up the complete business logo upload functionality for your application.

## 📋 Overview

The system includes:
- Database schema updates for storing logo URLs
- Supabase Storage bucket setup
- API endpoints for image upload/delete
- React components for image management
- Integration with business settings

## 🗄️ Database Setup

### 1. Add Logo Column to Businesses Table
Run this SQL in your Supabase SQL editor:

```sql
-- File: database/add_business_logo_column.sql
ALTER TABLE public.businesses ADD COLUMN logo_url text;

-- Add comment to describe the column
COMMENT ON COLUMN public.businesses.logo_url IS 'URL to the business logo image stored in Supabase Storage';
```

### 2. Setup Storage Bucket
Run this SQL to create the storage bucket and security policies:

```sql
-- File: database/setup_business_logos_storage.sql
-- Create the storage bucket for business logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Row Level Security policies (included in the file)
-- ... (see full file for all policies)
```

## 🔧 API Endpoints

### 1. Business Update API
**File:** `src/app/api/admin/business/route.ts`
- Updated to include `logo_url` field
- Handles business information updates

### 2. Logo Upload API
**File:** `src/app/api/admin/business/upload-logo/route.ts`
- **POST**: Upload new logo
- **DELETE**: Remove existing logo
- Features:
  - File validation (type, size)
  - Secure storage in Supabase
  - Business ownership verification
  - Automatic URL generation

## 🎨 Frontend Components

### 1. Business Logo Upload Component
**File:** `src/components/admin/BusinessLogoUpload.tsx`
- Drag & drop or click to upload
- Image preview
- Delete functionality
- Loading states
- Error handling
- File validation

### 2. Updated Business Context
**File:** `src/contexts/BusinessContext.tsx`
- Added `logo_url` to Business interface
- Maintains type safety

### 3. Settings Page Integration
**File:** `src/app/admin/settings/general/page.tsx`
- Complete business information form
- Logo upload section
- Real-time updates
- Form validation

## 🚀 Usage Instructions

### For Users:

1. **Navigate to Settings**
   - Go to Admin → Settings → General

2. **Upload Logo**
   - Click "Upload Logo" button
   - Select image file (JPEG, PNG, GIF, WebP)
   - Wait for upload completion
   - Logo will appear in preview

3. **Update Business Info**
   - Fill in business details
   - Click "Save Changes"
   - All information including logo URL is saved

### For Developers:

1. **Database Migration**
   ```bash
   # Run SQL files in Supabase SQL editor
   # 1. add_business_logo_column.sql
   # 2. setup_business_logos_storage.sql
   ```

2. **Component Usage**
   ```tsx
   import BusinessLogoUpload from '@/components/admin/BusinessLogoUpload';
   
   <BusinessLogoUpload 
     businessId={businessId}
     currentLogo={currentLogo}
     onLogoUpdate={(logoUrl) => {
       // Handle logo update
     }}
   />
   ```

3. **API Integration**
   ```javascript
   // Upload logo
   const formData = new FormData();
   formData.append('file', file);
   formData.append('businessId', businessId);
   
   const response = await fetch('/api/admin/business/upload-logo', {
     method: 'POST',
     body: formData,
   });
   ```

## 🔒 Security Features

- **Authentication Required**: All endpoints require user authentication
- **Business Ownership**: Users can only upload logos for their own businesses
- **File Validation**: Type and size restrictions enforced
- **Secure Storage**: Files stored in Supabase Storage with RLS policies
- **Public Access**: Logos are publicly accessible for display

## 📁 File Structure

```
├── database/
│   ├── add_business_logo_column.sql
│   └── setup_business_logos_storage.sql
├── src/
│   ├── app/api/admin/business/
│   │   ├── route.ts (updated)
│   │   └── upload-logo/route.ts (new)
│   ├── components/admin/
│   │   └── BusinessLogoUpload.tsx (new)
│   ├── contexts/
│   │   └── BusinessContext.tsx (updated)
│   └── app/admin/settings/general/
│       └── page.tsx (updated)
```

## 🎯 Features

### Upload Features:
- ✅ Drag & drop support
- ✅ File type validation (JPEG, PNG, GIF, WebP)
- ✅ File size limit (5MB)
- ✅ Image preview
- ✅ Progress indicators
- ✅ Error handling

### Storage Features:
- ✅ Secure Supabase Storage integration
- ✅ Automatic public URL generation
- ✅ Business-specific folder structure
- ✅ File overwrite protection

### UI/UX Features:
- ✅ Responsive design
- ✅ Loading states
- ✅ Success/error messages
- ✅ Hover effects
- ✅ Delete confirmation

## 🔧 Configuration

### Environment Variables
Ensure these are set in your `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Storage Bucket
- **Name**: `business-logos`
- **Public**: Yes
- **File Size Limit**: 5MB
- **Allowed Types**: JPEG, PNG, GIF, WebP

## 🐛 Troubleshooting

### Common Issues:

1. **Upload Fails**
   - Check authentication status
   - Verify bucket exists
   - Check file size and type

2. **Logo Not Displaying**
   - Verify bucket is public
   - Check RLS policies
   - Confirm URL format

3. **Permission Errors**
   - Ensure user owns the business
   - Check RLS policies on storage
   - Verify service role key

### Debug Commands:
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'business-logos';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'objects';

-- Check business logo URLs
SELECT id, name, logo_url FROM businesses WHERE logo_url IS NOT NULL;
```

## 📈 Next Steps

1. **Test the upload functionality**
2. **Add logo display to other pages**
3. **Implement logo optimization**
4. **Add bulk upload for multiple businesses**
5. **Create logo gallery management**

## 🎉 Ready to Use!

Once you've run the SQL migrations and deployed the code, the business logo upload functionality is ready to use. Users can now upload and manage their business logos through the settings page.
