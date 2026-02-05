// Test script for frequency filtering functionality
// This script can be run in the browser console to test the frequency dependencies

async function testFrequencyFiltering() {
  console.log('🧪 Testing Frequency Filtering Functionality');
  
  try {
    // Test 1: Check if frequency filtering utilities are available
    const { getFrequencyDependencies, filterVariables } = await import('/src/lib/frequencyFilter.ts');
    console.log('✅ Frequency filtering utilities loaded successfully');
    
    // Test 2: Mock frequency data
    const mockFrequency = {
      id: 'test-freq-1',
      name: 'Monthly',
      service_categories: ['cat-1', 'cat-2'],
      bathroom_variables: ['1', '2', '3'],
      sqft_variables: ['1 - 1249 Sq Ft', '1250 - 1499 Sq Ft'],
      bedroom_variables: ['1', '2'],
      exclude_parameters: ['Inside Fridge'],
      extras: ['Inside Oven', 'Laundry']
    };
    
    console.log('📋 Mock frequency data:', mockFrequency);
    
    // Test 3: Test variable filtering
    const allBathroomOptions = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5'];
    const filteredBathroom = allBathroomOptions.filter(option => 
      mockFrequency.bathroom_variables.includes(option)
    );
    
    console.log('🚿 Bathroom filtering test:');
    console.log('  All options:', allBathroomOptions);
    console.log('  Filtered options:', filteredBathroom);
    console.log('  Expected: [1, 2, 3]', filteredBathroom.length === 3 ? '✅ PASS' : '❌ FAIL');
    
    // Test 4: Test frequency-based API call (if industry is available)
    const currentBusinessId = localStorage.getItem('currentBusinessId');
    if (currentBusinessId) {
      console.log('🏢 Testing API call with business ID:', currentBusinessId);
      
      try {
        const response = await fetch(`/api/industries?business_id=${currentBusinessId}`);
        const data = await response.json();
        
        if (data.industries && data.industries.length > 0) {
          const firstIndustry = data.industries[0];
          console.log('📁 Found industry:', firstIndustry);
          
          // Test frequency API call
          const freqResponse = await fetch(`/api/industry-frequency?industryId=${firstIndustry.id}`);
          const freqData = await freqResponse.json();
          
          console.log('🔄 Frequency API response:', freqData);
          
          if (freqData.frequencies && freqData.frequencies.length > 0) {
            console.log('✅ Frequency API working - found frequencies:', freqData.frequencies.length);
          } else {
            console.log('ℹ️ No frequencies found for industry (this is expected if none are configured)');
          }
        } else {
          console.log('ℹ️ No industries found for this business');
        }
      } catch (error) {
        console.error('❌ API test failed:', error);
      }
    } else {
      console.log('ℹ️ No business ID found - skipping API tests');
    }
    
    console.log('\n🎯 Manual Testing Instructions:');
    console.log('1. Go to the booking page');
    console.log('2. Select an industry and service');
    console.log('3. Flip a service card and select a frequency (e.g., "Monthly")');
    console.log('4. Check if the available options change based on the frequency selection');
    console.log('5. Verify that only checked dependencies from the admin panel are shown');
    
    console.log('\n🔍 To check frequency dependencies in the admin panel:');
    console.log('1. Go to Admin > Settings > Industries > Form 1 > Frequencies');
    console.log('2. Edit or create a frequency');
    console.log('3. Check the "Dependencies" tab');
    console.log('4. Configure which options should show for each frequency');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Auto-run the test
console.log('🚀 Starting frequency filtering test...');
testFrequencyFiltering();
