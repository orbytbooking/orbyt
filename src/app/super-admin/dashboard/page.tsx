'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Settings, 
  HeadphonesIcon,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  LogOut,
  Bell,
  Search,
  Filter,
  Download,
  RefreshCw,
  Shield,
  Globe,
  Zap,
  Activity,
  CreditCard,
  UserPlus,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Star,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  Home,
  FileText,
  HelpCircle,
  Layers,
  Target,
  ZapOff,
  UserCheck,
  Briefcase,
  TrendingUpIcon,
  PieChart,
  Users2,
  MessageSquare,
  ThumbsUp,
  AlertTriangle
} from 'lucide-react';

interface DashboardStats {
  totalBusinesses: number;
  activeBusinesses: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalUsers: number;
  activeUsers: number;
  newBusinessesThisMonth: number;
  churnRate: number;
  trialUsers: number;
  conversionRate: number;
  supportTickets: number;
  avgResponseTime: number;
}

interface Business {
  id: string;
  name: string;
  owner_name: string;
  owner_email: string;
  subscription_status: string;
  trial_ends_at: string | null;
  plan_name: string;
  created_at: string;
  is_featured: boolean;
  monthly_revenue: number;
  total_bookings: number;
  last_active: string;
}

interface PlatformUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  business_count: number;
}

interface SupportTicket {
  id: string;
  subject: string;
  business_name: string;
  priority: string;
  status: string;
  created_at: string;
  assigned_to: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalBusinesses: 0,
    activeBusinesses: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
    activeUsers: 0,
    newBusinessesThisMonth: 0,
    churnRate: 0,
    trialUsers: 0,
    conversionRate: 0,
    supportTickets: 0,
    avgResponseTime: 0,
  });

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('superAdminToken');
    if (!token) {
      router.push('/super-admin/login');
      return;
    }
    
    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      // Mock comprehensive dashboard data
      setStats({
        totalBusinesses: 1247,
        activeBusinesses: 1156,
        totalRevenue: 2847500,
        monthlyRevenue: 342000,
        totalUsers: 8942,
        activeUsers: 6234,
        newBusinessesThisMonth: 87,
        churnRate: 3.2,
        trialUsers: 234,
        conversionRate: 68.5,
        supportTickets: 142,
        avgResponseTime: 2.4,
      });

      setBusinesses([
        {
          id: '1',
          name: 'Sparkling Clean Services',
          owner_name: 'Sarah Johnson',
          owner_email: 'sarah@sparklingclean.com',
          subscription_status: 'active',
          trial_ends_at: null,
          plan_name: 'Professional',
          created_at: '2024-01-15T10:30:00Z',
          is_featured: true,
          monthly_revenue: 149,
          total_bookings: 1247,
          last_active: '2024-02-10T15:30:00Z',
        },
        {
          id: '2',
          name: 'Tech Startup Inc',
          owner_name: 'Michael Chen',
          owner_email: 'michael@techstartup.com',
          subscription_status: 'trial',
          trial_ends_at: '2024-02-15T10:30:00Z',
          plan_name: 'Starter',
          created_at: '2024-02-01T14:20:00Z',
          is_featured: false,
          monthly_revenue: 0,
          total_bookings: 23,
          last_active: '2024-02-09T09:15:00Z',
        },
        {
          id: '3',
          name: 'Elite Cleaners Pro',
          owner_name: 'Emily Rodriguez',
          owner_email: 'emily@elitecleaners.com',
          subscription_status: 'active',
          trial_ends_at: null,
          plan_name: 'Business',
          created_at: '2023-12-10T09:15:00Z',
          is_featured: false,
          monthly_revenue: 299,
          total_bookings: 892,
          last_active: '2024-02-10T18:45:00Z',
        },
      ]);

      setPlatformUsers([
        {
          id: 'admin-1',
          full_name: 'John Admin',
          email: 'john@orbytcrm.com',
          role: 'super_admin',
          is_active: true,
          last_login: '2024-02-10T15:30:00Z',
          created_at: '2023-01-01T00:00:00Z',
          business_count: 0,
        },
        {
          id: 'support-1',
          full_name: 'Sarah Support',
          email: 'sarah@orbytcrm.com',
          role: 'support',
          is_active: true,
          last_login: '2024-02-10T14:20:00Z',
          created_at: '2023-03-15T00:00:00Z',
          business_count: 0,
        },
      ]);

      setSupportTickets([
        {
          id: '1',
          subject: 'Cannot process payments',
          business_name: 'Sparkling Clean Services',
          priority: 'high',
          status: 'open',
          created_at: '2024-02-10T10:30:00Z',
          assigned_to: 'Sarah Support',
        },
        {
          id: '2',
          subject: 'Booking calendar sync issue',
          business_name: 'Elite Cleaners Pro',
          priority: 'medium',
          status: 'in_progress',
          created_at: '2024-02-09T16:45:00Z',
          assigned_to: 'John Admin',
        },
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminUser');
    router.push('/super-admin/login');
  };

  const getSubscriptionStatusBadge = (status: string, trialEndsAt: string | null) => {
    if (trialEndsAt && new Date(trialEndsAt) > new Date()) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Trial</span>;
    }
    
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Active</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> Cancelled</span>;
      case 'suspended':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><AlertCircle className="w-3 h-3 mr-1" /> Suspended</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">High</span>;
      case 'medium':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Medium</span>;
      case 'low':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Low</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { id: 'overview', name: 'Overview', icon: Home, description: 'Platform overview' },
    { id: 'businesses', name: 'Businesses', icon: Building2, description: 'Manage businesses' },
    { id: 'users', name: 'Users', icon: Users2, description: 'User management' },
    { id: 'analytics', name: 'Analytics', icon: PieChart, description: 'Analytics & reports' },
    { id: 'support', name: 'Support', icon: MessageSquare, description: 'Support tickets' },
    { id: 'settings', name: 'Settings', icon: Settings, description: 'Platform settings' },
  ];

  const notifications = [
    { id: 1, title: 'New business registration', description: 'Tech Startup Inc joined', time: '2 min ago', read: false },
    { id: 2, title: 'High priority ticket', description: 'Payment processing issue', time: '15 min ago', read: false },
    { id: 3, title: 'System update completed', description: 'Version 2.1.0 deployed', time: '1 hour ago', read: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex items-center ml-4 lg:ml-0">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                    Super Admin
                  </h1>
                  <p className="text-xs text-gray-500">Orbyt Booking Platform</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search businesses, users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                </button>
                
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div key={notification.id} className={`p-4 hover:bg-gray-50 border-b border-gray-100 ${!notification.read ? 'bg-blue-50' : ''}`}>
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${!notification.read ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <p className="text-xs text-gray-500 mt-1">{notification.description}</p>
                              <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-gray-200">
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View all notifications</button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm font-bold">SA</span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">Super Admin</p>
                    <p className="text-xs text-gray-500">admin@orbytcrm.com</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">Super Admin</p>
                      <p className="text-xs text-gray-500">admin@orbytcrm.com</p>
                    </div>
                    <div className="py-2">
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                        <UserCheck className="h-4 w-4 mr-3 text-gray-400" />
                        Profile Settings
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                        <HelpCircle className="h-4 w-4 mr-3 text-gray-400" />
                        Help & Support
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg border-r border-gray-200 transition-transform duration-300 ease-in-out mt-16 lg:mt-0`}>
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </button>
            ))}
          </nav>

          {/* Quick Stats Sidebar */}
          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-4 text-white">
              <h3 className="font-semibold mb-2">Platform Health</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Uptime</span>
                  <span className="text-sm font-bold">99.9%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Response Time</span>
                  <span className="text-sm font-bold">142ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Error Rate</span>
                  <span className="text-sm font-bold">0.02%</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Sparkles className="h-6 w-6 mr-2 text-yellow-500" />
                    Platform Overview
                  </h2>
                  <p className="text-gray-600 mt-1">Real-time insights into your SaaS platform performance</p>
                </div>
                <div className="mt-4 sm:mt-0 flex space-x-3">
                  <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </button>
                  <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 flex items-center shadow-lg">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </button>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      +7.2%
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.totalBusinesses.toLocaleString()}</h3>
                  <p className="text-sm text-gray-600 mt-1">Total Businesses</p>
                  <p className="text-xs text-gray-500 mt-2">+{stats.newBusinessesThisMonth} new this month</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      +12.5%
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">${stats.monthlyRevenue.toLocaleString()}</h3>
                  <p className="text-sm text-gray-600 mt-1">Monthly Revenue</p>
                  <p className="text-xs text-gray-500 mt-2">MRR growth strong</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Users2 className="h-6 w-6 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      +4.1%
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.activeUsers.toLocaleString()}</h3>
                  <p className="text-sm text-gray-600 mt-1">Active Users</p>
                  <p className="text-xs text-gray-500 mt-2">{((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% engagement</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    </div>
                    <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                      -0.8%
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.churnRate}%</h3>
                  <p className="text-sm text-gray-600 mt-1">Churn Rate</p>
                  <p className="text-xs text-gray-500 mt-2">Improving trend</p>
                </div>
              </div>

              {/* Enhanced Charts and Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Businesses */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Businesses</h3>
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {businesses.map((business, index) => (
                        <div key={business.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {business.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{business.name}</p>
                              <p className="text-sm text-gray-500">{business.owner_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {getSubscriptionStatusBadge(business.subscription_status, business.trial_ends_at)}
                            <p className="text-xs text-gray-500 mt-1">{business.plan_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-3">
                      <button className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group">
                        <UserPlus className="h-6 w-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-gray-700">Add User</span>
                      </button>
                      <button className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group">
                        <Building2 className="h-6 w-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-gray-700">New Business</span>
                      </button>
                      <button className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group">
                        <CreditCard className="h-6 w-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-gray-700">Billing</span>
                      </button>
                      <button className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors group">
                        <Settings className="h-6 w-6 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-gray-700">Settings</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other tabs placeholder */}
          {activeTab !== 'overview' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center animate-fade-in">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {(() => {
                  const currentItem = navigationItems.find(item => item.id === activeTab);
                  return currentItem ? <currentItem.icon className="h-8 w-8 text-gray-400" /> : null;
                })()}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {(() => {
                  const currentItem = navigationItems.find(item => item.id === activeTab);
                  return currentItem ? `${currentItem.name} Section` : 'Unknown Section';
                })()}
              </h3>
              <p className="text-gray-500 mb-6">This section is under development.</p>
              <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors">
                Coming Soon
              </button>
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}</style>
    </div>
  );
}
