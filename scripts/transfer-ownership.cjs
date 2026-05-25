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

async function transferOwnership() {
  console.log('🔄 Transferring Orbyt Business Ownership Back to You...\n');
  
  try {
    // Your user ID (ajofracio0723@gmail.com)
    const yourUserId = '76f6a2f5-5feb-4b1a-801c-d27f7212c611';
    
    console.log(`📤 Transferring Orbyt business to user: ${yourUserId}`);
    
    const { data, error } = await supabase
      .from('businesses')
      .update({ owner_id: yourUserId })
      .eq('id', '20ec44c8-1d49-45b9-ac7e-0412fd610ffb'); // Orbyt business ID
    
    if (error) {
      console.error('❌ Error transferring ownership:', error);
    } else {
      console.log('✅ Business ownership transferred successfully!');
      console.log('🎯 You now own the "Orbyt" business with all the bookings');
      console.log('📊 Refresh your dashboard to see the data');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

transferOwnership();
