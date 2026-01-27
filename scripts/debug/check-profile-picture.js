import { createClient } from '@supabase/supabase-js';

// Use environment variables from .env file
const supabaseUrl = 'https://gpalzskadkrfedlwqobq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYWx6c2thZGtyZmVkbHdxb2JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5Njg3NywiZXhwIjoyMDg0NTcyODc3fQ.DEBEmRaiuYAmqzuve-4WO7j_OI388BM_wMsCwT9OBmE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfileData() {
  try {
    console.log('=== PROFILE DATA CHECK ===');
    
    // Check current user profile
    const userId = '76f6a2f5-5feb-4b1a-801c-d27f7212c611';
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }
    
    console.log('Profile data:', JSON.stringify(profile, null, 2));
    
    // Check if profile_picture field exists and has data
    if (profile.profile_picture) {
      console.log('✅ Profile picture found:', profile.profile_picture);
      
      // Test if the URL is accessible
      if (profile.profile_picture.startsWith('https://')) {
        try {
          const response = await fetch(profile.profile_picture, { method: 'HEAD' });
          console.log('Image URL status:', response.status);
        } catch (fetchError) {
          console.error('Error accessing image URL:', fetchError.message);
        }
      }
    } else {
      console.log('❌ No profile picture found');
    }
    
    // Check storage buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
    } else {
      console.log('Available buckets:', buckets.map(b => b.name));
      
      const avatarsBucket = buckets.find(b => b.name === 'avatars');
      if (avatarsBucket) {
        console.log('✅ Avatars bucket exists');
        
        // List files in avatars bucket
        const { data: files, error: filesError } = await supabase.storage.from('avatars').list();
        
        if (filesError) {
          console.error('Error listing files:', filesError);
        } else {
          console.log('Files in avatars bucket:', files);
        }
      } else {
        console.log('❌ Avatars bucket does not exist');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProfileData();
