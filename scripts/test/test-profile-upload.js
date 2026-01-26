import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = 'https://gpalzskadkrfedlwqobq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYWx6c2thZGtyZmVkbHdxb2JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5Njg3NywiZXhwIjoyMDg0NTcyODc3fQ.DEBEmRaiuYAmqzuve-4WO7j_OI388BM_wMsCwT9OBmE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProfilePictureUpload() {
  console.log('🧪 Testing profile picture upload functionality...');
  
  try {
    // 1. Check if user exists
    const userId = '76f6a2f5-5feb-4b1a-801c-d27f7212c611';
    console.log('✅ Using test user ID:', userId);
    
    // 2. Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError || !profile) {
      console.error('❌ Profile not found:', profileError);
      return;
    }
    
    console.log('✅ Profile found:', profile.full_name, profile.id);
    console.log('📸 Current profile picture:', profile.profile_picture || 'None');
    
    // 3. Check storage bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const avatarsBucket = buckets?.find(b => b.name === 'avatars');
    
    if (!avatarsBucket) {
      console.error('❌ avatars bucket not found');
      return;
    }
    console.log('✅ avatars bucket exists');
    
    // 4. List files in avatars bucket
    const { data: files } = await supabase.storage.from('avatars').list();
    console.log('📁 Files in avatars bucket:', files);
    
    // 5. Test direct upload to Supabase Storage
    console.log('🔄 Testing direct upload to Supabase...');
    
    // Create a simple test image buffer (1x1 PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    
    const fileName = `test-profile-${Date.now()}.png`;
    const filePath = `avatars/${fileName}`;
    
    console.log('📤 Uploading test image to:', filePath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, testImageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Direct upload failed:', uploadError);
      return;
    }
    
    console.log('✅ Direct upload successful:', uploadData);
    
    // 6. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    console.log('🔗 Public URL:', publicUrl);
    
    // 7. Update profile with new picture
    console.log('💾 Updating profile with new picture...');
    
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
    
    // 8. Verify the update
    const { data: verifyProfile } = await supabase
      .from('profiles')
      .select('profile_picture')
      .eq('id', userId)
      .single();
    
    if (verifyProfile?.profile_picture === publicUrl) {
      console.log('✅ Profile picture verified in database');
    } else {
      console.error('❌ Profile picture not saved correctly');
    }
    
    console.log('🎉 Profile picture upload test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testProfilePictureUpload();
