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

async function fixBusinessOwner() {
  console.log('🔧 Fixing Business Owner for Dashboard Access...\n');
  
  try {
    // Get current authenticated user (you'll need to provide your user ID)
    // For now, let's show the current setup and you can tell me which user should be the owner
    
    console.log('📊 Current Business Setup:');
    const { data: businesses } = await supabase
      .from('businesses')
      .select('*');
    
    businesses?.forEach(b => {
      console.log(`Business: ${b.name}`);
      console.log(`  ID: ${b.id}`);
      console.log(`  Current Owner: ${b.owner_id}`);
      console.log('');
    });
    
    console.log('👋 To fix this, you need to:');
    console.log('1. Either login as the correct owner (76f6a2f5-5feb-4b1a-801c-d27f7212c611)');
    console.log('2. Or update the business owner to your current user ID');
    console.log('3. Or create a new business with your current user');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixBusinessOwner();
