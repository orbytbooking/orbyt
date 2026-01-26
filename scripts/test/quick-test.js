// Quick test for logo upload setup
// Run with: node quick-test.js

import { createClient } from '@supabase/supabase-js';

// Use the example environment variables
const supabase = createClient(
  'https://gpalzskadkrfedlwqobq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYWx6c2thZGtyZmVkbHdxb2JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5Njg3NywiZXhwIjoyMDg0NTcyODc3fQ.DEBEmRaiuYAmqzuve-4WO7j_OI388BM_wMsCwT9OBmE'
);

async function quickTest() {
  console.log('🧪 Quick logo upload setup test...\n');
  
  try {
    // 1. Check storage bucket
    console.log('📦 Checking business-logos bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error:', bucketError.message);
      return;
    }
    
    const businessLogosBucket = buckets?.find(b => b.name === 'business-logos');
    
    if (!businessLogosBucket) {
      console.error('❌ business-logos bucket NOT found');
      console.log('💡 Run this SQL in Supabase:');
      console.log('   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)');
      console.log('   VALUES (\'business-logos\', \'business-logos\', true, 5242880, ARRAY[\'image/jpeg\', \'image/png\', \'image/gif\', \'image/webp\'])');
      console.log('   ON CONFLICT (id) DO NOTHING;');
      return;
    }
    
    console.log('✅ business-logos bucket exists');
    
    // 2. Check businesses table
    console.log('\n🏢 Checking businesses table...');
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, logo_url')
      .limit(3);
    
    if (businessError) {
      console.error('❌ Error:', businessError.message);
      console.log('💡 Make sure businesses table exists with logo_url column');
      return;
    }
    
    console.log(`✅ Found ${businesses.length} businesses`);
    businesses.forEach(business => {
      const status = business.logo_url ? '📸 Has logo' : '🚫 No logo';
      console.log(`   - ${business.name}: ${status}`);
    });
    
    // 3. Check storage objects
    console.log('\n📁 Checking files in storage...');
    const { data: objects, error: objectsError } = await supabase.storage
      .from('business-logos')
      .list('', { limit: 5 });
    
    if (objectsError) {
      console.error('❌ Error accessing storage:', objectsError.message);
    } else {
      console.log(`✅ Found ${objects.length} files in storage`);
      objects.forEach(obj => {
        console.log(`   - ${obj.name}`);
      });
    }
    
    console.log('\n🎉 Setup check completed!');
    console.log('\n📋 Next steps:');
    console.log('1. ✅ Storage bucket exists');
    console.log('2. ✅ Businesses table accessible');
    console.log('3. 🌐 Test in browser: Admin → Settings → Account → Your Info');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

quickTest();
