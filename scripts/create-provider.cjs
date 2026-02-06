const { createClient } = require('@supabase/supabase-js');

// Use environment variables directly
const supabaseUrl = 'https://gpalzskadkrfedlwqobq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupProvider() {
  try {
    console.log('🔍 Looking up user with email: orbytbooking@gmail.com');
    
    // Get the user from auth.users table
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      return;
    }

    const user = users.find(u => u.email === 'orbytbooking@gmail.com');
    
    if (!user) {
      console.error('❌ User not found with email: orbytbooking@gmail.com');
      return;
    }

    console.log('✅ Found user:', { id: user.id, email: user.email });

    // Check if provider profile already exists
    const { data: existingProvider, error: providerError } = await supabase
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (providerError && providerError.code !== 'PGRST116') {
      console.error('❌ Error checking provider:', providerError);
      return;
    }

    if (existingProvider) {
      console.log('✅ Provider profile already exists:', existingProvider);
      return;
    }

    // Get a business ID (use first available business)
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)
      .single();

    let businessId;
    if (businessError || !business) {
      console.log('⚠️ No business found. Creating a test business first...');
      
      // Create a test business
      const { data: newBusiness, error: createError } = await supabase
        .from('businesses')
        .insert({
          name: 'Test Business',
          owner_id: user.id,
          is_active: true,
          plan: 'starter',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating business:', createError);
        return;
      }

      console.log('✅ Created test business:', newBusiness);
      businessId = newBusiness.id;
    } else {
      businessId = business.id;
      console.log('✅ Using existing business:', businessId);
    }

    // Create provider profile matching your schema
    const { data: newProvider, error: createProviderError } = await supabase
      .from('service_providers')
      .insert({
        user_id: user.id,
        business_id: businessId,
        first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Test',
        last_name: user.user_metadata?.full_name?.split(' ')[1] || 'Provider',
        email: user.email,
        phone: user.user_metadata?.phone || '+1234567890',
        specialization: 'General Services',
        rating: 5.0,
        completed_jobs: 0,
        status: 'active',
        provider_type: 'individual',
        send_email_notification: false,
        hourly_rate: 25.00,
        payout_method: 'bank_transfer',
        total_earned: 0,
        total_paid_out: 0,
        current_balance: 0,
        availability_status: 'available',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createProviderError) {
      console.error('❌ Error creating provider:', createProviderError);
      return;
    }

    console.log('🎉 Successfully created provider profile:', newProvider);
    console.log('📋 Provider Details:');
    console.log('   - Provider ID:', newProvider.id);
    console.log('   - Business ID:', newProvider.business_id);
    console.log('   - Name:', `${newProvider.first_name} ${newProvider.last_name}`);
    console.log('   - Email:', newProvider.email);
    console.log('   - Status:', newProvider.status);
    console.log('');
    console.log('✅ Your availability page should now work!');

  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

setupProvider();
