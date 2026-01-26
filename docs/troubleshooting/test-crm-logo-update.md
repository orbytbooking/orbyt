# CRM Logo Update Test Guide

## 🧪 Test Steps

### 1. Upload New Logo
1. Go to **Admin → Settings → Account → Your Info**
2. Click "Choose File" and select a new logo image
3. Click "Save Changes"
4. Wait for the upload to complete

### 2. Verify Logo Updates in These Locations:

#### ✅ Admin Sidebar (Immediate)
- Look at the left sidebar
- Logo should update immediately after save
- Business name should remain the same

#### ✅ Your Info Page (Immediate)
- Stay on the same page
- Logo preview should show the new image
- Page title should reflect business name

#### ✅ Customers Page (Navigate)
1. Go to **Admin → Customers**
2. Look at the top header section
3. Should see the new logo with business name
4. Header should say "[Business Name] Customers"

#### ✅ Leads Page (Navigate)
1. Go to **Admin → Leads**
2. Look at the top header section
3. Should see the new logo with business name
4. Header should say "[Business Name] Leads"

### 3. Persistence Test
1. **Refresh the browser** (F5 or Ctrl+R)
2. Navigate through different CRM sections
3. Logo should persist across all pages
4. No blob URL errors in console

### 4. Business Context Test
1. Open browser developer tools (F12)
2. Go to Console tab
3. Type: `localStorage.getItem('adminLogo')`
4. Should return the permanent URL (not blob:)

## 🔍 Expected Behavior

### ✅ What Should Work:
- Logo uploads to Supabase Storage
- Database updates with permanent URL
- Logo displays in sidebar immediately
- Logo displays in CRM headers
- Logo persists after page refresh
- No blob URL errors in console

### ❌ What Should Not Happen:
- Blob URLs stored in localStorage
- `ERR_FILE_NOT_FOUND` errors
- Logo not appearing in CRM sections
- Logo disappearing after refresh

## 🐛 Troubleshooting

### If logo doesn't update in CRM:
1. Check browser console for errors
2. Verify logo in database: `SELECT logo_url FROM businesses WHERE id = 'your-business-id'`
3. Check if LogoContext is loading business data
4. Refresh the page to reload contexts

### If blob URL errors appear:
1. Run cleanup script in browser console
2. Clear localStorage: `localStorage.removeItem('adminLogo')`
3. Refresh the page

### If logo doesn't upload:
1. Check network tab for upload errors
2. Verify Supabase bucket exists
3. Check file size (must be < 5MB)
4. Verify file type (JPEG, PNG, GIF, WebP)

## 📋 Test Checklist

- [ ] Logo uploads successfully
- [ ] Logo appears in sidebar
- [ ] Logo appears in customers page header
- [ ] Logo appears in leads page header
- [ ] Logo persists after page refresh
- [ ] No console errors
- [ ] Logo URL is permanent (not blob)
- [ ] Business name displays correctly

## 🎯 Success Criteria

All CRM sections should display the updated business logo immediately after upload and persist across page refreshes. The logo should be stored as a permanent Supabase Storage URL, not a temporary blob URL.
