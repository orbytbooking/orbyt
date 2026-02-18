// Simple test to check if the API endpoint exists
const testAPIEndpoint = async () => {
  try {
    console.log('Testing API endpoint existence...');
    
    const response = await fetch('http://localhost:3000/api/providers/available');
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, response.headers);
    
    const text = await response.text();
    console.log(`Response body (first 200 chars):`, text.substring(0, 200));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testAPIEndpoint();
