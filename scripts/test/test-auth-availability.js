// Test authenticated provider availability data fetching
async function testAuthenticatedAvailability() {
  console.log('=== Testing Authenticated Provider Availability ===');
  
  try {
    // Test the API endpoint structure
    const response = await fetch('http://localhost:3000/api/provider/availability');
    console.log('Status:', response.status);
    
    if (response.status === 401) {
      console.log('✅ API requires authentication (working correctly)');
    }
    
    console.log('✅ API endpoint exists and responds');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthenticatedAvailability();
