// Node.js test script for logo upload functionality
// Run with: node test-upload-terminal.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables. Please check your .env file');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUploadSetup() {
  console.log('🧪 Testing logo upload setup...');
  
  try {
    // 1. Check storage bucket
    console.log('\n📦 Checking storage bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      return;
    }
    
    const businessLogosBucket = buckets?.find(b => b.name === 'business-logos');
    
    if (!businessLogosBucket) {
      console.error('❌ business-logos bucket not found');
      console.log('💡 Please run setup_business_logos_storage.sql in Supabase');
      return;
    }
    
    console.log('✅ business-logos bucket exists');
    console.log(`   - Public: ${businessLogosBucket.public}`);
    console.log(`   - File size limit: ${businessLogosBucket.file_size_limit} bytes`);
    console.log(`   - Allowed types: ${businessLogosBucket.allowed_mime_types?.join(', ')}`);
    
    // 2. Check businesses table
    console.log('\n🏢 Checking businesses table...');
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, logo_url')
      .limit(5);
    
    if (businessError) {
      console.error('❌ Error checking businesses:', businessError);
      return;
    }
    
    console.log(`✅ Found ${businesses.length} businesses`);
    businesses.forEach(business => {
      const status = business.logo_url ? 'Has logo' : 'No logo';
      console.log(`   - ${business.name} (${business.id}): ${status}`);
    });
    
    // 3. Check storage objects
    console.log('\n📁 Checking storage objects...');
    const { data: objects, error: objectsError } = await supabase.storage
      .from('business-logos')
      .list('', { limit: 10 });
    
    if (objectsError) {
      console.error('❌ Error listing storage objects:', objectsError);
      return;
    }
    
    console.log(`✅ Found ${objects.length} files in business-logos bucket`);
    objects.forEach(obj => {
      console.log(`   - ${obj.name} (${obj.created_at})`);
    });
    
    // 4. Test permissions
    console.log('\n🔐 Testing permissions...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('ℹ️ No authenticated user (expected in service role test)');
    } else {
      console.log('✅ Authenticated user:', user?.id);
    }
    
    console.log('\n🎉 Setup test completed!');
    console.log('\nNext steps:');
    console.log('1. Test upload in browser: Admin → Settings → Account → Your Info');
    console.log('2. Or run the browser console test script');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testUploadSetup();
