// Complete Frontend Logo System Test Suite
// Run this in browser console on Admin → Settings → Account → Your Info page

console.log('🧪 STARTING COMPLETE LOGO SYSTEM TESTS...\n');

// Test 1: Check LogoContext State
console.log('=== TEST 1: LogoContext State ===');
try {
  const logoElements = document.querySelectorAll('[alt="Logo preview"]');
  const logoPreview = document.querySelector('img[alt="Logo preview"]');
  const noLogoElement = document.querySelector('.text-xs.text-muted-foreground');
  
  console.log('Logo preview element:', logoPreview);
  console.log('No logo element:', noLogoElement);
  console.log('Logo preview src:', logoPreview?.src || 'Not found');
  console.log('Logo visible:', logoPreview?.offsetParent !== null);
  console.log('No logo visible:', noLogoElement?.offsetParent !== null);
  
  if (logoPreview && logoPreview.src && logoPreview.src !== '') {
    console.log('✅ LogoContext: Logo is displayed');
  } else {
    console.log('❌ LogoContext: Logo not displayed');
  }
} catch (error) {
  console.log('❌ LogoContext test failed:', error.message);
}

// Test 2: Check Business Data Loading
console.log('\n=== TEST 2: Business Data Loading ===');
fetch('/api/admin/business')
  .then(response => response.json())
  .then(data => {
    console.log('Business data response:', data);
    const business = data.business;
    
    if (business && business.logo_url) {
      console.log('✅ Business Data: Logo URL found:', business.logo_url);
      console.log('✅ Business Data: Business name:', business.name);
      
      // Test if logo URL is valid
      if (business.logo_url.startsWith('http')) {
        console.log('✅ Business Data: Valid HTTP URL');
      } else {
        console.log('❌ Business Data: Invalid URL format');
      }
    } else {
      console.log('❌ Business Data: No logo URL found');
      console.log('Business data:', business);
    }
  })
  .catch(error => {
    console.log('❌ Business Data test failed:', error.message);
  });

// Test 3: Check File Upload Functionality
console.log('\n=== TEST 3: File Upload Functionality ===');
const fileInput = document.querySelector('input[type="file"]');
const browseButton = document.querySelector('button[type="button"]');
const filenameInput = document.querySelector('input[readonly]');

console.log('File input element:', fileInput);
console.log('Browse button:', browseButton);
console.log('Filename input:', filenameInput);

if (fileInput && browseButton && filenameInput) {
  console.log('✅ Upload UI: All elements present');
  
  // Test click functionality
  try {
    browseButton.click();
    console.log('✅ Upload UI: Browse button clickable');
  } catch (error) {
    console.log('❌ Upload UI: Browse button not clickable');
  }
} else {
  console.log('❌ Upload UI: Missing elements');
}

// Test 4: Check LocalStorage
console.log('\n=== TEST 4: LocalStorage Check ===');
const storedLogo = localStorage.getItem('adminLogo');
console.log('Stored logo:', storedLogo);

if (storedLogo) {
  if (storedLogo.startsWith('blob:')) {
    console.log('❌ LocalStorage: Contains blob URL (bad)');
  } else if (storedLogo.startsWith('http')) {
    console.log('✅ LocalStorage: Contains HTTP URL (good)');
  } else {
    console.log('⚠️ LocalStorage: Contains other format');
  }
} else {
  console.log('ℹ️ LocalStorage: No logo stored');
}

// Test 5: Check Sidebar Logo
console.log('\n=== TEST 5: Sidebar Logo Check ===');
const sidebarLogo = document.querySelector('img[alt="Logo"]');
console.log('Sidebar logo element:', sidebarLogo);
console.log('Sidebar logo src:', sidebarLogo?.src || 'Not found');

if (sidebarLogo && sidebarLogo.src && sidebarLogo.src !== '') {
  console.log('✅ Sidebar: Logo is displayed');
} else {
  console.log('❌ Sidebar: Logo not displayed');
}

// Test 6: Check Console Errors
console.log('\n=== TEST 6: Console Errors Check ===');
const originalError = console.error;
let errorCount = 0;
console.error = function(...args) {
  errorCount++;
  originalError.apply(console, args);
};

setTimeout(() => {
  console.error = originalError;
  
  if (errorCount === 0) {
    console.log('✅ Console: No errors detected');
  } else {
    console.log(`❌ Console: ${errorCount} errors detected`);
  }
  
  // Test Summary
  console.log('\n=== TEST SUMMARY ===');
  console.log('🧪 All frontend tests completed');
  console.log('📋 Check individual test results above');
  console.log('🎯 Next: Test manual upload if automated tests pass');
  
}, 1000);

// Test 7: Image Loading Test
console.log('\n=== TEST 7: Image Loading Test ===');
const testImages = document.querySelectorAll('img');
testImages.forEach((img, index) => {
  if (img.src && img.src.startsWith('http')) {
    const testImg = new Image();
    testImg.onload = () => {
      console.log(`✅ Image ${index + 1}: Loads successfully (${img.alt})`);
    };
    testImg.onerror = () => {
      console.log(`❌ Image ${index + 1}: Failed to load (${img.alt})`);
    };
    testImg.src = img.src;
  }
});

console.log('\n🧪 Frontend tests initiated. Check results above...');
