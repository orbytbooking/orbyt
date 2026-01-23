'use client';
import { useState, useEffect } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabaseClient';
import { MultiTenantHelper } from '@/lib/multiTenantSupabase';
import { FiBriefcase, FiUsers, FiCalendar, FiSettings, FiChevronDown } from 'react-icons/fi';

interface DashboardStats {
  totalBookings: number;
  totalUsers: number;
  upcomingAppointments: number;
  revenue: number;
}

export function MultiTenantDashboard() {
  const { currentBusiness, businesses, switchBusiness, hasPermission } = useBusiness();
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    totalUsers: 0,
    upcomingAppointments: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [showBusinessSwitcher, setShowBusinessSwitcher] = useState(false);

  useEffect(() => {
    if (currentBusiness) {
      fetchDashboardStats();
    }
  }, [currentBusiness]);

  const fetchDashboardStats = async () => {
    if (!currentBusiness) return;

    try {
      setLoading(true);
      
      // Set business context for all queries
      MultiTenantHelper.setBusinessContext(currentBusiness.id);

      // Fetch bookings for current business only
      const { data: bookings, error: bookingsError } = MultiTenantHelper.filterBookings(
        supabase.from('bookings').select('*')
      );

      // Fetch team members for current business
      const { data: teamMembers, error: teamError } = await supabase
        .from('tenant_users')
        .select('user_id, role')
        .eq('business_id', currentBusiness.id)
        .eq('is_active', true);

      if (bookingsError) throw bookingsError;
      if (teamError) throw teamError;

      // Calculate stats
      const totalBookings = bookings?.length || 0;
      const totalUsers = (teamMembers?.length || 0) + 1; // +1 for owner
      const upcomingAppointments = bookings?.filter(b => 
        new Date(b.date) >= new Date() && b.status === 'confirmed'
      ).length || 0;
      const revenue = bookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

      setStats({
        totalBookings,
        totalUsers,
        upcomingAppointments,
        revenue
      });

    } catch (error) {
      console.error('Dashboard stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentBusiness) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading business context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Business Switcher */}
      {businesses.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setShowBusinessSwitcher(!showBusinessSwitcher)}
            className="flex items-center space-x-3 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FiBriefcase className="w-4 h-4 text-gray-600" />
            <span className="font-medium">{currentBusiness.name}</span>
            <span className="text-xs text-gray-500 capitalize">({currentBusiness.role})</span>
            <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBusinessSwitcher ? 'rotate-180' : ''}`} />
          </button>

          {showBusinessSwitcher && (
            <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {businesses.map((business) => (
                <button
                  key={business.id}
                  onClick={() => {
                    switchBusiness(business.id);
                    setShowBusinessSwitcher(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                    business.id === currentBusiness.id ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FiBriefcase className="w-4 h-4" />
                    <span>{business.name}</span>
                  </div>
                  <span className="text-xs capitalize">{business.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Business Info Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-xl">
        <h1 className="text-2xl font-bold mb-2">{currentBusiness.name}</h1>
        <p className="opacity-90">
          Welcome back! You're viewing data for <strong>{currentBusiness.name}</strong>
        </p>
        <div className="mt-4 flex items-center space-x-4 text-sm">
          <span className="capitalize">Role: {currentBusiness.role}</span>
          <span>•</span>
          <span>Plan: {currentBusiness.plan}</span>
          <span>•</span>
          <span>ID: {currentBusiness.id.slice(0, 8)}...</span>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
              </div>
              <FiCalendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <FiUsers className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingAppointments}</p>
              </div>
              <FiCalendar className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${stats.revenue.toFixed(2)}</p>
              </div>
              <FiBriefcase className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Permission-Based Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hasPermission('view_bookings') && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <FiCalendar className="w-6 h-6 text-green-600 mb-2" />
              <h3 className="font-medium text-green-900">View Bookings</h3>
              <p className="text-sm text-green-700">You can view all bookings</p>
            </div>
          )}

          {hasPermission('create_bookings') && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <FiCalendar className="w-6 h-6 text-blue-600 mb-2" />
              <h3 className="font-medium text-blue-900">Create Bookings</h3>
              <p className="text-sm text-blue-700">You can create new bookings</p>
            </div>
          )}

          {hasPermission('view_team') && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <FiUsers className="w-6 h-6 text-purple-600 mb-2" />
              <h3 className="font-medium text-purple-900">Manage Team</h3>
              <p className="text-sm text-purple-700">You can view team members</p>
            </div>
          )}
        </div>
      </div>

      {/* Data Isolation Info */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <FiSettings className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Multi-Tenant Data Isolation</h3>
            <p className="text-sm text-blue-700 mt-1">
              This dashboard only shows data for <strong>{currentBusiness.name}</strong>. 
              Your data is completely isolated from other businesses in the system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
