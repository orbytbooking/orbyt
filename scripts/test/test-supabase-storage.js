// Test script to verify Supabase Storage bucket configuration
// Run this in browser console to test your bucket

console.log('🔍 Testing Supabase Storage Configuration...');
console.log('');

// Test 1: Check if Supabase client is configured
function checkSupabaseConfig() {
  console.log('📋 Supabase Configuration:');
  console.log('- URL:', process.env?.NEXT_PUBLIC_SUPABASE_URL || 'Check .env file');
  console.log('- Storage URL:', 'https://gpalzskadkrfedlwqobq.storage.supabase.co/storage/v1/s3');
  console.log('- Bucket should be: avatars');
}

// Test 2: Test bucket access
async function testBucketAccess() {
  try {
    // This will test if we can access the avatars bucket
    const { data, error } = await supabase.storage
      .from('avatars')
      .list('', { limit: 10 });
    
    if (error) {
      console.log('❌ Bucket Access Error:', error.message);
      return false;
    } else {
      console.log('✅ Bucket accessible');
      console.log('- Files in bucket:', data?.length || 0);
      return true;
    }
  } catch (err) {
    console.log('❌ Bucket Test Failed:', err.message);
    return false;
  }
}

// Test 3: Test upload permissions
async function testUploadPermissions() {
  try {
    const testFile = new Blob(['test'], { type: 'text/plain' });
    const fileName = `test-${Date.now()}.txt`;
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, testFile);
    
    if (error) {
      console.log('❌ Upload Permission Error:', error.message);
      return false;
    } else {
      console.log('✅ Upload permissions working');
      
      // Clean up test file
      await supabase.storage
        .from('avatars')
        .remove([fileName]);
      
      return true;
    }
  } catch (err) {
    console.log('❌ Upload Test Failed:', err.message);
    return false;
  }
}

// Test 4: Check public URL generation
function testPublicUrl() {
  const testPath = 'avatars/test-image.jpg';
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(testPath);
  
  console.log('✅ Public URL format:');
  console.log('- Example:', data.publicUrl);
  console.log('- Should start with:', 'https://gpalzskadkrfedlwqobq.supabase.co/storage/v1/object/public/avatars/');
}

// Run all tests
async function runStorageTests() {
  checkSupabaseConfig();
  console.log('');
  
  const bucketOk = await testBucketAccess();
  console.log('');
  
  if (bucketOk) {
    const uploadOk = await testUploadPermissions();
    console.log('');
    testPublicUrl();
  }
  
  console.log('');
  console.log('🎯 NEXT STEPS:');
  console.log('1. If bucket access fails → Run setup_storage.sql');
  console.log('2. If upload fails → Check RLS policies');
  console.log('3. Try uploading an image in the UI');
  console.log('4. Check browser console for upload logs');
}

// Helper function to create supabase client in browser
const supabase = window.supabase || (() => {
  // Try to access the global supabase client
  if (typeof window !== 'undefined' && window.location) {
    return {
      storage: {
        from: (bucket) => ({
          list: () => Promise.resolve({ data: [], error: null }),
          upload: () => Promise.resolve({ data: null, error: { message: 'Client not available' } }),
          remove: () => Promise.resolve({ data: null, error: null }),
          getPublicUrl: (path) => ({ 
            data: { 
              publicUrl: `https://gpalzskadkrfedlwqobq.supabase.co/storage/v1/object/public/${bucket}/${path}` 
            } 
          })
        })
      }
    };
  }
  return null;
})();

runStorageTests();
