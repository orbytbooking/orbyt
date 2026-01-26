// Test script to verify authentication fix
import fetch from 'node-fetch';
import FormData from 'form-data';

async function testAuth() {
  try {
    console.log('Testing authentication...');
    
    // Test the business API endpoint first
    const response = await fetch('http://localhost:3001/api/admin/business');
    const data = await response.json();
    
    console.log('Business API Response:', {
      status: response.status,
      ok: response.ok,
      data: data
    });
    
    if (response.ok && data.business) {
      console.log('✅ Business API working');
      console.log('Business ID:', data.business.id);
      console.log('Business Name:', data.business.name);
      
      // Now test the upload endpoint with a mock file
      const form = new FormData();
      form.append('file', Buffer.from('fake image data'), 'test.png');
      form.append('businessId', data.business.id);
      
      const uploadResponse = await fetch('http://localhost:3001/api/admin/business/upload-logo', {
        method: 'POST',
        body: form
      });
      
      const uploadData = await uploadResponse.json();
      
      console.log('Upload API Response:', {
        status: uploadResponse.status,
        ok: uploadResponse.ok,
        data: uploadData
      });
      
      if (uploadResponse.ok) {
        console.log('✅ Upload API authentication working');
      } else {
        console.log('❌ Upload API authentication failed:', uploadData.error);
      }
    } else {
      console.log('❌ Business API failed:', data.error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAuth();
