// Test script to check time slots API
const testTimeSlotsAPI = async () => {
  try {
    console.log('Testing time slots API...');
    
    const businessId = '879ec172-e1dd-475d-b57d-0033fae0b30e';
    const date = '2026-02-22'; // Date from browser
    
    console.log(`Fetching time slots for business: ${businessId}, date: ${date}`);
    
    const response = await fetch(
      `http://localhost:3000/api/time-slots?business_id=${businessId}&date=${date}`
    );
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      const errorData = await response.json();
      console.error('Error details:', errorData);
      return;
    }
    
    const data = await response.json();
    console.log('Time slots response:', JSON.stringify(data, null, 2));
    
    if (data.timeSlots && data.timeSlots.length > 0) {
      console.log(`\nFound ${data.timeSlots.length} time slots:`);
      data.timeSlots.forEach((slot, index) => {
        console.log(`${index + 1}. ${slot}`);
      });
    } else {
      console.log('No time slots found, using defaults');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testTimeSlotsAPI();
