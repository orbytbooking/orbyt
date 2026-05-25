// Test script to check available services
const testServicesAPI = async () => {
  try {
    console.log('Testing services API...');
    
    const businessId = '879ec172-e1dd-475d-b57d-0033fae0b30e';
    const industryId = 'a80704d4-df77-40be-a9c8-907b7c318fe8'; // Home Cleaning industry ID
    
    console.log(`Fetching services for business: ${businessId}, industry: ${industryId}`);
    
    const response = await fetch(
      `http://localhost:3000/api/service-categories?industryId=${industryId}&businessId=${businessId}`
    );
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      const errorData = await response.json();
      console.error('Error details:', errorData);
      return;
    }
    
    const data = await response.json();
    console.log('Available services:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testServicesAPI();
