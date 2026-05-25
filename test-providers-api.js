// Test script to check available providers API
const testProvidersAPI = async () => {
  try {
    console.log('Testing available providers API...');
    
    // Test parameters - you'll need to update these with actual values from your database
    const businessId = '879ec172-e1dd-475d-b57d-0033fae0b30e'; // Update with your business ID
    const serviceId = 'cef67dd7-32d7-49e1-9a25-9a9a9bbfdb07'; // Deep Cleaning service ID
    const date = '2026-02-22'; // Date from browser
    const time = '7:00 AM'; // Time from browser
    
    console.log(`Fetching providers for business: ${businessId}, service: ${serviceId}, date: ${date}, time: ${time}`);
    
    const response = await fetch(
      `http://localhost:3000/api/providers/available?businessId=${businessId}&serviceId=${serviceId}&date=${date}&time=${time}`
    );
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      const errorData = await response.json();
      console.error('Error details:', errorData);
      return;
    }
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.providers) {
      console.log(`\nFound ${data.providers.length} available providers:`);
      data.providers.forEach((provider, index) => {
        console.log(`\n${index + 1}. ${provider.name}`);
        console.log(`   Available: ${provider.isAvailable ? 'Yes' : 'No'}`);
        console.log(`   Rating: ${provider.rating || 'Not rated'}`);
        console.log(`   Completed Jobs: ${provider.completedJobs || 0}`);
        console.log(`   Specialization: ${provider.specialization || 'Not specified'}`);
        console.log(`   Reasons: ${provider.reasons?.join(', ') || 'N/A'}`);
      });
    } else {
      console.log('No providers found or API returned unexpected format');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testProvidersAPI();
