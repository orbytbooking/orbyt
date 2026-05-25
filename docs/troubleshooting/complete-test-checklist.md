# 🧪 Complete Logo System Test Checklist

## 📋 Test Overview
This checklist covers all aspects of the logo upload and display system.

## 🔧 Prerequisites
- [ ] User is logged in
- [ ] Business exists in database
- [ ] Supabase storage bucket is configured
- [ ] Browser console is open (F12)

---

## 🗄️ Database Tests (Run in Supabase SQL Editor)

### ✅ Automated Test
- [ ] Run `run-all-tests.sql` in Supabase SQL Editor
- [ ] Verify all tests pass with ✅ status

### Manual Checks
- [ ] Business table has logo_url column
- [ ] Storage bucket 'business-logos' exists and is public
- [ ] RLS policies are in place
- [ ] No blob URLs in logo_url column

---

## 🌐 Frontend Tests (Run in Browser)

### ✅ Automated Test
- [ ] Go to Admin → Settings → Account → Your Info
- [ ] Open browser console (F12)
- [ ] Paste and run `run-all-frontend-tests.js`
- [ ] Verify all tests show ✅ status

### Manual Tests

#### Test 1: Initial State
- [ ] Page loads without errors
- [ ] Console shows "Logo Debug - Initial state"
- [ ] If logo exists, it displays in preview circle
- [ ] If no logo, shows "No Logo" placeholder

#### Test 2: Logo Upload
- [ ] Click "Browse" button
- [ ] Select image file (JPEG, PNG, GIF, WebP, < 5MB)
- [ ] Filename appears in input field
- [ ] Image preview shows immediately
- [ ] Click "Save Changes"
- [ ] Wait for upload completion
- [ ] Success message appears

#### Test 3: Logo Display
- [ ] Logo displays in preview circle (not "No Logo")
- [ ] Logo displays in admin sidebar
- [ ] Logo displays in customers page header
- [ ] Logo displays in leads page header
- [ ] No console errors related to images

#### Test 4: Persistence
- [ ] Refresh browser (F5)
- [ ] Logo still displays in all locations
- [ ] Console shows logo loading from business data
- [ ] No blob URL errors

#### Test 5: Update Logo
- [ ] Upload a different logo
- [ ] Save changes
- [ ] New logo displays everywhere
- [ ] Old logo is completely replaced

---

## 🔍 Debug Tests

### Console Checks
- [ ] No "ERR_FILE_NOT_FOUND" errors
- [ ] No blob URL errors
- [ ] Logo debug messages appear
- [ ] Network requests succeed

### Network Tab
- [ ] Upload request to `/api/admin/business/upload-logo`
- [ ] Response contains logo_url
- [ ] No failed requests

### Storage Check
- [ ] File appears in Supabase Storage
- [ ] File is accessible via public URL
- [ ] File size and type are correct

---

## 🎯 Success Criteria

### Must Pass ✅
- [ ] Logo uploads to Supabase Storage
- [ ] Logo displays in Business Info section
- [ ] Logo displays in admin sidebar
- [ ] Logo displays in CRM headers
- [ ] Logo persists after refresh
- [ ] No blob URL errors
- [ ] No console errors

### Should Pass ⚠️
- [ ] Logo updates in real-time
- [ ] File validation works
- [ ] Error handling works
- [ ] Loading states display

### Optional 💡
- [ ] Logo displays in other admin sections
- [ ] Logo responsive on different screen sizes
- [ ] Logo alt text is appropriate

---

## 🐛 Troubleshooting Guide

### If Logo Not Displaying
1. Check console for debug messages
2. Verify business data contains logo_url
3. Test logo URL in new browser tab
4. Check for CORS errors

### If Upload Fails
1. Check network tab for failed requests
2. Verify file size < 5MB
3. Verify file type is allowed
4. Check Supabase bucket permissions

### If Blob URL Errors
1. Run cleanup script in console
2. Clear localStorage
3. Refresh page
4. Re-upload logo

### If Logo Not in CRM Sections
1. Navigate to Customers page
2. Navigate to Leads page
3. Check for business headers
4. Verify LogoContext is updating

---

## 📊 Test Results Summary

### Database Tests: ____ / ✅ Passed
### Frontend Tests: ____ / ✅ Passed
### Manual Tests: ____ / ✅ Passed
### Overall Status: ____ / ✅ Complete

---

## 🎉 Final Verification

When all tests pass:
- [ ] Logo system is fully functional
- [ ] Ready for production use
- [ ] Documentation is complete
- [ ] User can successfully upload and manage logos

**Run this complete test suite to verify the entire logo system is working correctly!**
