// Comprehensive debugging script for image upload issues
// Run this in browser console when trying to upload an image

console.log('🔍 DEBUGGING IMAGE UPLOAD ISSUES');
console.log('=====================================');
console.log('');

// 1. Check if user is authenticated
async function checkAuth() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('🔐 Authentication Status:');
    console.log('- User authenticated:', !!user);
    console.log('- User ID:', user?.id || 'Not authenticated');
    console.log('- Auth error:', error?.message || 'None');
    return user;
  } catch (err) {
    console.log('❌ Auth check failed:', err.message);
    return null;
  }
}

// 2. Test direct Supabase Storage access
async function testStorageAccess() {
  try {
    console.log('');
    console.log('📦 Testing Storage Access:');
    
    // Test bucket existence
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    console.log('- Buckets available:', buckets?.map(b => b.name) || 'None');
    console.log('- Bucket error:', bucketError?.message || 'None');
    
    // Test avatars bucket specifically
    const { data: files, error: filesError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 10 });
    console.log('- Files in avatars bucket:', files?.length || 0);
    console.log('- Files error:', filesError?.message || 'None');
    
    return { buckets, files, bucketError, filesError };
  } catch (err) {
    console.log('❌ Storage test failed:', err.message);
    return null;
  }
}

// 3. Test actual upload with a small test file
async function testUpload() {
  try {
    console.log('');
    console.log('📤 Testing Upload:');
    
    // Create a small test file
    const testContent = 'test image content';
    const testBlob = new Blob([testContent], { type: 'image/png' });
    const testFile = new File([testBlob], 'test-upload.png', { type: 'image/png' });
    
    const fileName = `debug-test-${Date.now()}.png`;
    const filePath = `avatars/${fileName}`;
    
    console.log('- Test file name:', fileName);
    console.log('- File path:', filePath);
    console.log('- File size:', testFile.size, 'bytes');
    
    // Attempt upload
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, testFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    console.log('- Upload success:', !!data);
    console.log('- Upload error:', error?.message || 'None');
    
    if (data) {
      // Test getting public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      console.log('- Public URL:', publicUrl);
      
      // Clean up test file
      await supabase.storage.from('avatars').remove([filePath]);
      console.log('- Test file cleaned up');
    }
    
    return { data, error };
  } catch (err) {
    console.log('❌ Upload test failed:', err.message);
    return null;
  }
}

// 4. Check environment variables (client-side only)
function checkEnvironment() {
  console.log('');
  console.log('🌍 Environment Check:');
  console.log('- Supabase URL available:', !!process.env?.NEXT_PUBLIC_SUPABASE_URL);
  console.log('- Anon key available:', !!process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log('- Current URL:', window.location.origin);
}

// 5. Monitor network requests (console instruction)
function showNetworkInstructions() {
  console.log('');
  console.log('🌐 Network Monitoring:');
  console.log('1. Open Network tab in DevTools');
  console.log('2. Try uploading an image');
  console.log('3. Look for requests to:');
  console.log('   - https://gpalzskadkrfedlwqobq.supabase.co/storage/v1/...');
  console.log('4. Check response codes and error messages');
}

// Run all debugging steps
async function runFullDebug() {
  const user = await checkAuth();
  const storage = await testStorageAccess();
  const upload = await testUpload();
  checkEnvironment();
  showNetworkInstructions();
  
  console.log('');
  console.log('🎯 SUMMARY & NEXT STEPS:');
  console.log('');
  
  if (!user) {
    console.log('❌ NOT AUTHENTICATED - Please log in first');
  } else if (storage?.bucketError) {
    console.log('❌ BUCKET ISSUE - Run the SQL in database/check_storage.sql');
  } else if (storage?.filesError) {
    console.log('❌ PERMISSION ISSUE - Check RLS policies');
  } else if (upload?.error) {
    console.log('❌ UPLOAD FAILED - Check error message above');
  } else {
    console.log('✅ ALL TESTS PASSED - Try uploading in the UI');
  }
  
  console.log('');
  console.log('📋 Common Issues:');
  console.log('1. Bucket not created → Run setup SQL');
  console.log('2. RLS policies missing → Run setup SQL');
  console.log('3. Not authenticated → Log in first');
  console.log('4. CORS issues → Check Supabase settings');
  console.log('5. File too large → Check file size limit');
}

// Make supabase available globally for debugging
if (typeof window !== 'undefined') {
  // Try to get supabase from the app context
  const script = document.createElement('script');
  script.textContent = `
    window.debugSupabaseUpload = runFullDebug;
    console.log('🔧 Debug function ready! Run: debugSupabaseUpload()');
  `;
  document.head.appendChild(script);
}

console.log('🔧 Debug script loaded! Run: debugSupabaseUpload()');
