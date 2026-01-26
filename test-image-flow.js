// Test script to verify image upload flow
// Run this in browser console after uploading an image

console.log('🔍 Testing Image Upload Flow...');
console.log('');

// 1. Check if profile picture is stored in database
async function checkDatabaseProfile() {
  try {
    const response = await fetch('/api/admin/profile');
    const data = await response.json();
    
    console.log('📊 Database Profile Data:');
    console.log('- Profile exists:', !!data.profile);
    console.log('- Profile picture URL:', data.profile?.profile_picture || 'Not set');
    console.log('- Is Supabase URL:', data.profile?.profile_picture?.startsWith('https://') || false);
    console.log('- Is Blob URL:', data.profile?.profile_picture?.startsWith('blob:') || false);
    
    return data.profile?.profile_picture;
  } catch (error) {
    console.error('❌ Error checking database:', error);
    return null;
  }
}

// 2. Check localStorage
function checkLocalStorage() {
  console.log('');
  console.log('💾 LocalStorage Check:');
  
  const profilePic = localStorage.getItem('adminProfilePicture');
  console.log('- Profile picture in localStorage:', profilePic || 'Not found');
  console.log('- Is Blob URL:', profilePic?.startsWith('blob:') || false);
  console.log('- Is Supabase URL:', profilePic?.startsWith('https://') || false);
  
  return profilePic;
}

// 3. Check current React state
function checkReactState() {
  console.log('');
  console.log('⚛️  React State Check:');
  console.log('- Check the profile picture in the UI');
  console.log('- It should match the database URL, not localStorage');
}

// Run all checks
async function runVerification() {
  const dbUrl = await checkDatabaseProfile();
  const lsUrl = checkLocalStorage();
  checkReactState();
  
  console.log('');
  console.log('✅ VERIFICATION RESULTS:');
  console.log('');
  
  if (dbUrl && dbUrl.startsWith('https://')) {
    console.log('✅ Image properly stored in database with Supabase URL');
  } else {
    console.log('❌ Image NOT properly stored in database');
  }
  
  if (!lsUrl) {
    console.log('✅ No image in localStorage (correct)');
  } else if (lsUrl.startsWith('blob:')) {
    console.log('❌ Blob URL still in localStorage (incorrect)');
  } else {
    console.log('⚠️  Other URL in localStorage');
  }
  
  console.log('');
  console.log('🎯 Expected Flow:');
  console.log('1. Upload → Supabase Storage → Get Public URL');
  console.log('2. Save URL to Database (NOT localStorage)');
  console.log('3. Load from Database → Display in UI');
}

runVerification();
