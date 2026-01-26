import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = 'https://gpalzskadkrfedlwqobq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYWx6c2thZGtyZmVkbHdxb2JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5Njg3NywiZXhwIjoyMDg0NTcyODc3fQ.DEBEmRaiuYAmqzuve-4WO7j_OI388BM_wMsCwT9OBmE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testNewUpload() {
  console.log('🧪 Testing new upload with fixed path...');
  
  try {
    const userId = '76f6a2f5-5feb-4b1a-801c-d27f7212c611';
    
    // Create a simple test image buffer (1x1 PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    
    const fileName = `${userId}-${Date.now()}.png`;
    const filePath = fileName; // Direct path, no subfolder
    
    console.log('📤 Uploading test image to:', filePath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, testImageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return;
    }
    
    console.log('✅ Upload successful:', uploadData);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    console.log('🔗 Public URL:', publicUrl);
    
    // Update profile with new picture
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        profile_picture: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Profile update failed:', updateError);
      return;
    }
    
    console.log('✅ Profile updated successfully!');
    console.log('📸 New profile picture URL:', updatedProfile.profile_picture);
    
    // Test the URL
    try {
      const response = await fetch(publicUrl, { method: 'HEAD' });
      console.log('🌐 Image URL accessibility:', response.status);
    } catch (fetchError) {
      console.error('❌ Error accessing image URL:', fetchError.message);
    }
    
    console.log('🎉 New upload test completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testNewUpload();
