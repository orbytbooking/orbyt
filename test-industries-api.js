// Test script to check available industries
const testIndustriesAPI = async () => {
  try {
    console.log('Testing industries API...');
    
    const businessId = '879ec172-e1dd-475d-b57d-0033fae0b30e';
    
    console.log(`Fetching industries for business: ${businessId}`);
    
    const response = await fetch(
      `http://localhost:3000/api/industries?business_id=${businessId}`
    );
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      const errorData = await response.json();
      console.error('Error details:', errorData);
      return;
    }
    
    const data = await response.json();
    console.log('Available industries:', JSON.stringify(data, null, 2));
    
    if (data.industries && data.industries.length > 0) {
      console.log('\nIndustry Details:');
      data.industries.forEach((industry, index) => {
        console.log(`${index + 1}. ${industry.name} (ID: ${industry.id})`);
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testIndustriesAPI();
