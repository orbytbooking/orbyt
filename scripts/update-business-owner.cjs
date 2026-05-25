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

async function updateBusinessOwner() {
  console.log('🔧 Updating Business Owner...\n');
  
  try {
    // Get all users to find your current user
    const { data: users } = await supabase.auth.admin.listUsers();
    
    console.log('👥 Available Users:');
    users?.users?.forEach(u => {
      console.log(`  - ${u.email} (ID: ${u.id})`);
    });
    
    console.log('\n📝 To update the Orbyt business owner:');
    console.log('1. Choose one of the user IDs above');
    console.log('2. I\'ll update the business owner for you');
    
    // For now, let's use the first user as an example
    if (users?.users?.length > 0) {
      const firstUser = users.users[0];
      console.log(`\n🔄 Updating Orbyt business owner to: ${firstUser.email}`);
      
      const { data, error } = await supabase
        .from('businesses')
        .update({ owner_id: firstUser.id })
        .eq('id', '20ec44c8-1d49-45b9-ac7e-0412fd610ffb');
      
      if (error) {
        console.error('❌ Error updating business:', error);
      } else {
        console.log('✅ Business owner updated successfully!');
        console.log(`📊 Now login as: ${firstUser.email}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateBusinessOwner();
