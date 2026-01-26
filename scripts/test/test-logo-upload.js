// Test script for logo upload functionality
// Run this in your browser console to test the upload process

async function testLogoUpload() {
  console.log('🧪 Testing logo upload functionality...');
  
  try {
    // 1. Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ User not authenticated:', authError);
      return;
    }
    console.log('✅ User authenticated:', user.id);
    
    // 2. Get current business
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .limit(1);
      
    if (businessError || !businesses || businesses.length === 0) {
      console.error('❌ No business found:', businessError);
      return;
    }
    
    const business = businesses[0];
    console.log('✅ Business found:', business.name, business.id);
    
    // 3. Check storage bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const businessLogosBucket = buckets?.find(b => b.name === 'business-logos');
    
    if (!businessLogosBucket) {
      console.error('❌ business-logos bucket not found. Please run setup_business_logos_storage.sql');
      return;
    }
    console.log('✅ business-logos bucket exists');
    
    // 4. Test upload with a sample image
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('TEST', 70, 110);
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('❌ Failed to create test image');
        return;
      }
      
      const file = new File([blob], 'test-logo.png', { type: 'image/png' });
      console.log('✅ Test image created:', file.size, 'bytes');
      
      // 5. Upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessId', business.id);
      
      try {
        const response = await fetch('/api/admin/business/upload-logo', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error('❌ Upload failed:', result);
          return;
        }
        
        console.log('✅ Upload successful!');
        console.log('📸 Logo URL:', result.logo_url);
        console.log('📊 Updated business:', result.business);
        
        // 6. Verify the URL is accessible
        const img = new Image();
        img.onload = () => console.log('✅ Logo URL is accessible');
        img.onerror = () => console.error('❌ Logo URL is not accessible');
        img.src = result.logo_url;
        
        // 7. Check database was updated
        const { data: updatedBusiness } = await supabase
          .from('businesses')
          .select('logo_url')
          .eq('id', business.id)
          .single();
          
        if (updatedBusiness?.logo_url === result.logo_url) {
          console.log('✅ Database updated correctly');
        } else {
          console.error('❌ Database not updated correctly');
        }
        
      } catch (uploadError) {
        console.error('❌ Upload error:', uploadError);
      }
    }, 'image/png');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
console.log('🚀 Starting logo upload test...');
testLogoUpload();
