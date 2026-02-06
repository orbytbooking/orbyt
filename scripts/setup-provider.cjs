const { createClient } = require('@supabase/supabase-js');

// Use environment variables directly
const supabaseUrl = 'https://gpalzskadkrfedlwqobq.supabase.co';
const supabaseKey = 'sb_service_role_key_here'; // You'll need to add this

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupProvider() {
  try {
    // Get the user from auth.users table (this is your current user)
    console.log('Looking up user with email: orbytbooking@gmail.com');
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'orbytbooking@gmail.com')
      .single();

    if (userError || !user) {
      console.error('User not found:', userError);
      return;
    }

    console.log('Found user:', user);

    // Check if provider profile exists
    const { data: existingProvider, error: providerError } = await supabase
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (providerError && providerError.code !== 'PGRST116') {
      console.error('Error checking provider:', providerError);
      return;
    }

    if (existingProvider) {
      console.log('Provider profile already exists:', existingProvider);
      return;
    }

    // Get a business ID (use first available business)
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)
      .single();

    if (businessError || !business) {
      console.error('No business found. Creating a test business first...');
      
      // Create a test business
      const { data: newBusiness, error: createError } = await supabase
        .from('businesses')
        .insert({
          name: 'Test Business',
          owner_id: user.id,
          is_active: true,
          plan: 'starter'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating business:', createError);
        return;
      }

      console.log('Created test business:', newBusiness);
      var businessId = newBusiness.id;
    } else {
      var businessId = business.id;
    }

    // Create provider profile
    const { data: newProvider, error: createProviderError } = await supabase
      .from('service_providers')
      .insert({
        user_id: user.id,
        business_id: businessId,
        first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Test',
        last_name: user.user_metadata?.full_name?.split(' ')[1] || 'Provider',
        email: user.email,
        phone: user.user_metadata?.phone || '+1234567890',
        is_active: true,
        is_verified: true,
        rating: 5.0,
        completed_jobs: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createProviderError) {
      console.error('Error creating provider:', createProviderError);
      return;
    }

    console.log('✅ Successfully created provider profile:', newProvider);
    console.log('Provider ID:', newProvider.id);
    console.log('Business ID:', newProvider.business_id);

  } catch (error) {
    console.error('Setup error:', error);
  }
}

setupProvider();
