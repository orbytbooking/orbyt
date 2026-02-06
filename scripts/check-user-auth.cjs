const { createClient } = require('@supabase/supabase-js');

// Read environment variables from .env file
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserAuth() {
  console.log('🔍 Checking User Authentication & Business Access...\n');
  
  try {
    // Your user ID
    const yourUserId = '76f6a2f5-5feb-4b1a-801c-d27f7212c611';
    
    console.log(`👤 Checking user: ${yourUserId}`);
    
    // Check if user exists and get their details
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(yourUserId);
    
    if (userError) {
      console.error('❌ User error:', userError);
      return;
    }
    
    console.log('✅ User found:');
    console.log(`  Email: ${user.user.email}`);
    console.log(`  Role: ${user.user.user_metadata?.role || 'none'}`);
    console.log(`  Created: ${user.user.created_at}`);
    
    // Check businesses for this user
    console.log('\n🏢 Checking businesses for this user:');
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', yourUserId);
    
    if (businessError) {
      console.error('❌ Business error:', businessError);
    } else {
      console.log(`Found ${businesses?.length || 0} businesses:`);
      businesses?.forEach(b => {
        console.log(`  - ${b.name} (ID: ${b.id})`);
        console.log(`    Active: ${b.is_active}`);
        console.log(`    Created: ${b.created_at}`);
      });
    }
    
    // Check if there's a profiles record
    console.log('\n📋 Checking profiles table:');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', yourUserId);
    
    if (profileError) {
      console.error('❌ Profile error:', profileError);
    } else {
      console.log(`Found ${profiles?.length || 0} profiles:`);
      profiles?.forEach(p => {
        console.log(`  - Role: ${p.role}`);
        console.log(`  Business ID: ${p.business_id}`);
        console.log(`  Active: ${p.is_active}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserAuth();
