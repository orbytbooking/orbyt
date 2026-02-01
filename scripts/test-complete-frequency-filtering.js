// Comprehensive test script for frequency filtering in both customer and admin booking
// This script can be run in the browser console to test the complete functionality

function testCompleteFrequencyFiltering() {
  console.log('🧪 Testing Complete Frequency Filtering System');
  console.log('===========================================');
  
  // Test 1: Check if we're on the correct page
  const currentPath = window.location.pathname;
  console.log(`📍 Current page: ${currentPath}`);
  
  if (currentPath.includes('/book-now')) {
    console.log('✅ On Customer Booking Page');
    testCustomerBookingPage();
  } else if (currentPath.includes('/admin/add-booking')) {
    console.log('✅ On Admin Booking Page');
    testAdminBookingPage();
  } else {
    console.log('ℹ️ Navigate to either /book-now or /admin/add-booking to test');
  }
  
  function testCustomerBookingPage() {
    console.log('\n🎯 Testing Customer Booking Page Frequency Filtering');
    
    // Test 1: Check if FrequencyAwareServiceCard is loaded
    const serviceCards = document.querySelectorAll('[class*="cardContainer"]');
    console.log(`Found ${serviceCards.length} service cards`);
    
    // Test 2: Look for frequency dropdowns
    const frequencySelects = document.querySelectorAll('select');
    console.log(`Found ${frequencySelects.length} select elements`);
    
    // Test 3: Check for dynamic field visibility
    console.log('\n📋 Manual Testing Steps for Customer Booking:');
    console.log('1. Select an industry (e.g., Home Cleaning)');
    console.log('2. Click on a service card to flip it');
    console.log('3. Select a frequency (e.g., "Monthly")');
    console.log('4. Observe field visibility:');
    console.log('   - Bathroom field should only show checked bathroom options');
    console.log('   - Sq Ft field should only show checked sqft options');
    console.log('   - Bedroom field should only show checked bedroom options');
    console.log('   - Extras section should only show checked extras');
    console.log('   - If no options checked for a category, the entire field/section should be hidden');
    
    // Helper function to check field visibility
    window.checkCustomerFieldVisibility = function() {
      const fields = {};
      const bathroomField = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.includes('Bathroom'))?.closest('div');
      const sqftField = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.includes('Area Size'))?.closest('div');
      const bedroomField = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.includes('Bedroom'))?.closest('div');
      const extrasField = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.includes('Extras'))?.closest('div');
      
      fields.bathroom = bathroomField ? 'visible' : 'hidden';
      fields.sqft = sqftField ? 'visible' : 'hidden';
      fields.bedroom = bedroomField ? 'visible' : 'hidden';
      fields.extras = extrasField ? 'visible' : 'hidden';
      
      console.log('Customer booking field visibility:', fields);
      return fields;
    };
  }
  
  function testAdminBookingPage() {
    console.log('\n🎯 Testing Admin Booking Page Frequency Filtering');
    
    // Test 1: Check for frequency buttons
    const frequencyButtons = document.querySelectorAll('button');
    const frequencyButtonCount = Array.from(frequencyButtons).filter(btn => 
      ['Monthly', 'Weekly', 'Daily', 'One-Time', '2x per week'].includes(btn.textContent?.trim() || '')
    ).length;
    console.log(`Found ${frequencyButtonCount} frequency buttons`);
    
    // Test 2: Check for variable category fields
    const variableLabels = Array.from(document.querySelectorAll('label')).filter(label => 
      ['Bathroom', 'Sq Ft', 'Bedroom'].includes(label.textContent?.trim() || '')
    );
    console.log(`Found ${variableLabels.length} variable category fields:`, 
      variableLabels.map(label => label.textContent?.trim()));
    
    // Test 3: Check for extras section
    const extrasLabel = Array.from(document.querySelectorAll('label')).find(label => 
      label.textContent?.includes('Extras')
    );
    console.log(`Extras section: ${extrasLabel ? 'visible' : 'hidden'}`);
    
    console.log('\n📋 Manual Testing Steps for Admin Booking:');
    console.log('1. Select a frequency (e.g., "Monthly")');
    console.log('2. Observe which variable categories appear:');
    console.log('   - Only categories with checked options should be visible');
    console.log('   - Within each category, only checked options should appear');
    console.log('   - If no options checked for a category, the entire category should be hidden');
    console.log('3. Check Extras section:');
    console.log('   - Only checked extras should be visible');
    console.log('   - If no extras checked, the entire section should be hidden');
    console.log('4. Try different frequencies to see different field combinations');
    
    // Helper function to check admin field visibility
    window.checkAdminFieldVisibility = function() {
      const fields = {};
      const bathroomField = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.trim() === 'Bathroom')?.closest('div');
      const sqftField = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.trim() === 'Sq Ft')?.closest('div');
      const bedroomField = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.trim() === 'Bedroom')?.closest('div');
      const extrasField = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.includes('Extras'))?.closest('div');
      
      fields.bathroom = bathroomField ? 'visible' : 'hidden';
      fields.sqft = sqftField ? 'visible' : 'hidden';
      fields.bedroom = bedroomField ? 'visible' : 'hidden';
      fields.extras = extrasField ? 'visible' : 'hidden';
      
      console.log('Admin booking field visibility:', fields);
      return fields;
    };
  }
  
  console.log('\n🔍 Expected Behavior Summary:');
  console.log('============================');
  console.log('✅ Fields only appear when options are checked for the selected frequency');
  console.log('✅ If no options checked for a category, the entire field/section is hidden');
  console.log('✅ Only checked options appear in dropdowns and checkboxes');
  console.log('✅ Works in both customer booking (/book-now) and admin booking (/admin/add-booking)');
  console.log('✅ Real-time filtering when frequency changes');
  
  console.log('\n⚙️ Admin Configuration Required:');
  console.log('==================================');
  console.log('1. Go to Admin > Settings > Industries > Form 1 > Frequencies');
  console.log('2. Edit or create a frequency (e.g., "Monthly")');
  console.log('3. In Dependencies tab, check specific options:');
  console.log('   - Variables > Bathroom: Check specific bathroom numbers');
  console.log('   - Variables > Sq Ft: Check specific square footage ranges');
  console.log('   - Variables > Bedroom: Check specific bedroom counts');
  console.log('   - Extras: Check specific extra services');
  console.log('4. Save and test in both booking pages');
  
  console.log('\n💡 Debug Commands:');
  console.log('==================');
  console.log('Run these commands in browser console:');
  console.log('- Customer booking: window.checkCustomerFieldVisibility()');
  console.log('- Admin booking: window.checkAdminFieldVisibility()');
  console.log('- Check network tab for API calls to /api/industry-frequency');
  
  console.log('\n🎉 Testing Complete!');
}

// Auto-run the test
testCompleteFrequencyFiltering();
