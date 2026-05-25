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

async function createSimpleDashboardAPI() {
  console.log('🔧 Creating Simple Dashboard API Response...\n');
  
  try {
    const businessId = '20ec44c8-1d49-45b9-ac7e-0412fd610ffb';
    
    // Get bookings
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId);
    
    if (bookingError) {
      console.error('❌ Booking error:', bookingError);
      return;
    }
    
    // Get customers
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId);
    
    if (customerError) {
      console.error('❌ Customer error:', customerError);
      return;
    }
    
    // Calculate stats
    const totalBookings = bookings?.length || 0;
    const activeCustomers = customers?.length || 0;
    const completedBookings = bookings?.filter(b => b.status === 'completed') || [];
    const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0);
    const completionRate = totalBookings > 0 ? ((completedBookings.length / totalBookings) * 100).toFixed(1) : '0.0';
    
    // Create stats object
    const stats = {
      totalRevenue: {
        value: `$${totalRevenue.toFixed(2)}`,
        change: '+0.0%',
        icon: 'DollarSign',
        trend: 'up',
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/20'
      },
      totalBookings: {
        value: totalBookings.toString(),
        change: '+0.0%',
        icon: 'Calendar',
        trend: 'up',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20'
      },
      activeCustomers: {
        value: activeCustomers.toString(),
        change: '+0.0%',
        icon: 'Users',
        trend: 'up',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100 dark:bg-cyan-900/20'
      },
      completionRate: {
        value: `${completionRate}%`,
        change: '+0.0%',
        icon: 'TrendingUp',
        trend: 'up',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900/20'
      }
    };
    
    // Transform bookings
    const transformedBookings = bookings?.map(booking => ({
      id: booking.id,
      customer: {
        name: booking.customer_name || 'Unknown Customer',
        email: booking.customer_email || '',
        phone: booking.customer_phone || ''
      },
      service: booking.service || 'General Service',
      date: booking.scheduled_date || booking.created_at?.split('T')[0] || '',
      time: booking.scheduled_time ? 
        booking.scheduled_time.toString().slice(0, 5) + ' ' + 
        (parseInt(booking.scheduled_time.toString().slice(0, 2)) >= 12 ? 'PM' : 'AM') : 
        '12:00 PM',
      status: booking.status || 'pending',
      amount: `$${(booking.total_price || 0).toFixed(2)}`,
      paymentMethod: booking.payment_method,
      notes: booking.notes
    })) || [];
    
    console.log('📊 Dashboard Data Ready:');
    console.log(`  Total Bookings: ${totalBookings}`);
    console.log(`  Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`  Active Customers: ${activeCustomers}`);
    console.log(`  Completion Rate: ${completionRate}%`);
    console.log(`  Bookings to display: ${transformedBookings.length}`);
    
    // Save this data to a temporary file that the dashboard can read
    const dashboardData = {
      success: true,
      data: {
        stats,
        bookings: transformedBookings,
        business_id: businessId
      }
    };
    
    fs.writeFileSync('./temp-dashboard-data.json', JSON.stringify(dashboardData, null, 2));
    console.log('\n✅ Dashboard data saved to temp-dashboard-data.json');
    console.log('📝 Now I\'ll create a simple API endpoint that reads this file');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createSimpleDashboardAPI();
