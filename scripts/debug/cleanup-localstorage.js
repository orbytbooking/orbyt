// Run this script in your browser console to clean up blob URLs from localStorage
// Open your browser dev tools (F12), go to Console tab, and paste this code

console.log('🧹 Cleaning up blob URLs from localStorage...');

// Check and clean adminLogo
const adminLogo = localStorage.getItem('adminLogo');
if (adminLogo) {
  if (adminLogo.startsWith('blob:')) {
    console.log('❌ Found blob URL in adminLogo, removing...');
    localStorage.removeItem('adminLogo');
    console.log('✅ Removed blob URL from adminLogo');
  } else {
    console.log('✅ adminLogo is clean:', adminLogo.substring(0, 50) + '...');
  }
} else {
  console.log('ℹ️ No adminLogo found in localStorage');
}

// Check for any other blob URLs in localStorage
console.log('\n🔍 Checking for other blob URLs in localStorage...');
let foundOtherBlobs = false;
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  if (value && value.startsWith('blob:')) {
    console.log(`❌ Found blob URL in ${key}, removing...`);
    localStorage.removeItem(key);
    foundOtherBlobs = true;
  }
}

if (!foundOtherBlobs) {
  console.log('✅ No other blob URLs found in localStorage');
}

console.log('\n🎉 Cleanup complete! Please refresh the page to see the changes.');
