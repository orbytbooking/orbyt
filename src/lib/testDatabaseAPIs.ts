// Simple test script to verify database APIs are working
// Run this in the browser console on the industry form page

interface TestResult {
  name: string;
  url: string;
}

async function testDatabaseAPIs(): Promise<void> {
  console.log('🧪 Testing Database APIs...');
  
  try {
    // Test 1: Get industry stats from database
    console.log('📊 Testing stats fetch...');
    const industry = 'Cleaning'; // Change this to your industry name
    const businessId = 'your-business-id'; // Change this to your business ID
    
    const industriesResponse = await fetch(`/api/industries?business_id=${businessId}`);
    const industriesData = await industriesResponse.json();
    const currentIndustry = industriesData.industries?.find((ind: any) => ind.name === industry);
    
    if (!currentIndustry) {
      console.error('❌ Industry not found');
      return;
    }
    
    console.log('✅ Industry found:', currentIndustry.name, currentIndustry.id);
    
    // Test all API endpoints
    const tests: TestResult[] = [
      { name: 'Service Categories', url: `/api/service-categories?industryId=${currentIndustry.id}` },
      { name: 'Extras', url: `/api/extras?industryId=${currentIndustry.id}` },
      { name: 'Frequencies', url: `/api/industry-frequency?industryId=${currentIndustry.id}` },
      { name: 'Locations', url: `/api/locations?industryId=${currentIndustry.id}` },
      { name: 'Pricing Parameters', url: `/api/pricing-parameters?industryId=${currentIndustry.id}` }
    ];
    
    for (const test of tests) {
      try {
        const response = await fetch(test.url);
        const data = await response.json();
        
        if (response.ok) {
          const count = data[Object.keys(data)[0]]?.length || 0;
          console.log(`✅ ${test.name}: ${count} items`);
        } else {
          console.log(`❌ ${test.name}: ${data.error}`);
        }
      } catch (error: any) {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
    
    console.log('🎉 Database API testing complete!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error);
  }
}

// Auto-run test
testDatabaseAPIs();

// Also make it available globally
declare global {
  interface Window {
    testDatabaseAPIs: () => Promise<void>;
  }
}

window.testDatabaseAPIs = testDatabaseAPIs;
