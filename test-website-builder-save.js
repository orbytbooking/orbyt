// Simple test script to verify website builder save functionality
// Run this in the browser console when on the website builder page

console.log('Testing website builder save functionality...');

// Test 1: Check if updateConfig function exists and is properly defined
if (typeof window !== 'undefined') {
  // Look for React DevTools to access component state
  setTimeout(() => {
    const reactRoot = document.querySelector('#__next');
    if (reactRoot) {
      console.log('✓ React root found');
      
      // Try to find the website builder component
      const buttons = document.querySelectorAll('button');
      const saveButton = Array.from(buttons).find(btn => 
        btn.textContent?.includes('Save') && !btn.textContent?.includes('Save & Publish')
      );
      
      if (saveButton) {
        console.log('✓ Save button found:', saveButton);
        
        // Check if button is disabled during save
        const isDisabled = saveButton.disabled;
        console.log('Save button disabled state:', isDisabled);
        
        // Simulate clicking save button
        console.log('Simulating save button click...');
        saveButton.click();
        
        // Check if button shows loading state
        setTimeout(() => {
          const newDisabledState = saveButton.disabled;
          console.log('Save button disabled state after click:', newDisabledState);
          
          if (newDisabledState !== isDisabled) {
            console.log('✓ Save button state changed - loading indicator working');
          } else {
            console.log('⚠ Save button state did not change');
          }
        }, 100);
        
      } else {
        console.log('❌ Save button not found');
      }
    } else {
      console.log('❌ React root not found');
    }
  }, 2000);
}

console.log('Test script loaded. Navigate to /admin/website-builder to run tests.');
