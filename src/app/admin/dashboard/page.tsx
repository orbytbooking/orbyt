"use client";

import { useEffect, useMemo, useState } from "react";
import { useWebsiteConfig } from "@/hooks/useWebsiteConfig";
import { useBusiness } from "@/contexts/BusinessContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  Calendar, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Plus,
  UserCog,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Icon mapping for API responses
const iconMap: Record<string, any> = {
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Plus
};

type Booking = {
  id: string;
  provider?: { id: string; name: string; email: string; phone: string } | null;
  customer?: { name: string; email: string; phone: string };
  customerName?: string;
  service: string;
  date: string;
  time: string;
  status: string;
  amount: string;
  paymentMethod?: string;
  notes?: string;
};

type Provider = {
  id: string;
  name: string;
  email: string;
  phone: string;
  availability_status: string;
  performance_score: number;
  customer_rating: number;
  services: any[];
  hourly_rate: number;
  last_active_at: string;
  assignment_count: number;
};

type DashboardData = {
  stats: {
    totalRevenue: { value: string; change: string; icon: any; trend: string; color: string; bgColor: string };
    totalBookings: { value: string; change: string; icon: any; trend: string; color: string; bgColor: string };
    activeCustomers: { value: string; change: string; icon: any; trend: string; color: string; bgColor: string };
    completionRate: { value: string; change: string; icon: any; trend: string; color: string; bgColor: string };
  };
  upcomingBookings: Booking[];
  recentBookings: Booking[];
  availableProviders: Provider[];
  business_id: string;
};

const getProviderStatusBadge = (status: string) => {
  const styles = {
    available: "bg-green-500/20 text-green-300 border border-green-500/30",
    busy: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    unavailable: "bg-red-500/20 text-red-300 border border-red-500/30",
    on_vacation: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  };

  const icons = {
    available: CheckCircle2,
    busy: Clock,
    unavailable: XCircle,
    on_vacation: AlertCircle,
  };

  const Icon = icons[status as keyof typeof icons] || CheckCircle2;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`} style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const getStatusBadge = (status: string) => {
  const styles = {
    confirmed: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
    pending: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    completed: "bg-green-500/20 text-green-300 border border-green-500/30",
    cancelled: "bg-red-500/20 text-red-300 border border-red-500/30",
  };

  const icons = {
    confirmed: CheckCircle2,
    pending: Clock,
    completed: CheckCircle2,
    cancelled: XCircle,
  };

  const Icon = icons[status as keyof typeof icons] || AlertCircle;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`} style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { config } = useWebsiteConfig();
  const { currentBusiness } = useBusiness(); // Get current business
  const router = useRouter();
  const { toast } = useToast();

  // Fetch dashboard data from API
  const fetchDashboardData = async (showToast = false) => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setLastRefresh(new Date());
        if (showToast) {
          toast({
            title: "Dashboard Updated",
            description: "Synced with latest provider portal data",
          });
        }
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Dashboard fetch error:', err);
      if (showToast) {
        toast({
          title: "Refresh Failed",
          description: "Could not sync with provider portal",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds to sync with provider portal updates
    // This ensures bookings, availability, and provider status changes from provider portal
    // are reflected in the admin dashboard in near real-time
    const refreshInterval = setInterval(() => {
      fetchDashboardData(false); // Silent refresh
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  // Listen for focus events to refresh when admin returns to tab
  useEffect(() => {
    const handleFocus = () => {
      fetchDashboardData(false); // Silent refresh on focus
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Get all bookings for calendar (remove duplicates)
  const allBookings = useMemo(() => {
    if (!data) return [];
    
    // Combine both arrays and remove duplicates by ID
    const combinedBookings = [...data.upcomingBookings, ...data.recentBookings];
    const uniqueBookings = new Map();
    
    combinedBookings.forEach(booking => {
      if (booking && booking.id) {
        uniqueBookings.set(booking.id, booking);
      }
    });
    
    const result = Array.from(uniqueBookings.values());
    console.log(`Dashboard: Combined ${combinedBookings.length} bookings, removed ${combinedBookings.length - result.length} duplicates, ${result.length} unique bookings`);
    
    return result;
  }, [data]);
  
  // Get calendar data
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const normalizedBookings = useMemo(() => {
    if (!allBookings || !Array.isArray(allBookings)) return [];
    
    return allBookings.filter(Boolean).map((booking) => {
      try {
        // Use provider name if available, otherwise fall back to customer name
        const displayName = booking.provider?.name || booking.customer?.name || booking.customerName || 'Unassigned';
        
        return {
          ...booking,
          customerName: displayName,
        };
      } catch (error) {
        console.error('Error normalizing booking:', error);
        return {
          ...booking,
          customerName: 'Error Loading',
        };
      }
    });
  }, [allBookings]);

  const bookingsByDate = useMemo(() => {
    return normalizedBookings.reduce<Record<string, typeof normalizedBookings>>(function (acc, booking) {
      const dateKey = booking.date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(booking);
      return acc;
    }, {});
  }, [normalizedBookings]);

  useEffect(() => {
    const today = new Date();
    const upcoming = [...normalizedBookings]
      .filter((booking) => new Date(booking.date) >= new Date(today.toDateString()))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (upcoming.length > 0) {
      setSelectedDate(upcoming[0].date);
    }
  }, [normalizedBookings]);

  const hasBooking = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookingsByDate[dateStr] && bookingsByDate[dateStr].length > 0;
  };

  const getBookingsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookingsByDate[dateStr] || [];
  };

  const getFormattedSelectedDate = useMemo(() => {
    if (!selectedDate) return null;
    const date = new Date(selectedDate);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }, [selectedDate]);

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const acceptBooking = () => {
    if (!selectedBooking) return;
    // In a real implementation, this would call an API to update the booking status
    const name = selectedBooking.provider?.name || selectedBooking.customer?.name || selectedBooking.customerName || 'Unknown';
    toast({ title: 'Booking accepted', description: `${name} • ${selectedBooking.service} is now confirmed.` });
  };

  // Loading and error states
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-red-600">Error: {error}</div>
          <Button onClick={() => fetchDashboardData(false)} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-muted-foreground">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Mission Control Style Header */}
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-semibold text-white uppercase tracking-tight mb-2" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            {currentBusiness?.name || config?.branding?.companyName || 'Your Business'}
          </h1>
          <p className="text-lg text-gray-400 font-normal" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            Your Service Business, In Orbit.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            onClick={() => fetchDashboardData(true)}
            variant="outline"
            className="border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/20"
            title="Refresh dashboard data (syncs with provider portal updates)"
            disabled={isRefreshing}
          >
            <Clock className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </Button>
          <div className="text-xs text-muted-foreground hidden md:block">
            Last sync: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button
            onClick={() => router.push('/admin/add-booking')}
            className="text-white"
            style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Booking
          </Button>
          <Button
            onClick={() => router.push('/admin/customers?add=true')}
            variant="outline"
            className="border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/20"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add New Customer
          </Button>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.stats).map(([key, stat]) => {
          const Icon = iconMap[stat.icon] || DollarSign; // Fallback to DollarSign
          const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return (
            <Card key={key} className="p-4 glass-card border-cyan-500/20 hover:border-cyan-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                  {title}
                </p>
                <div className={`p-1.5 rounded-md ${stat.bgColor}`}>
                  <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-xl font-semibold" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                <span className={stat.trend === "up" ? "text-green-600" : "text-red-600"}>
                  {stat.change}
                </span>{" "}
                from last month
              </p>
            </Card>
          );
        })}
      </div>

      {/* Provider Portal Quick Access */}
      <Card className="glass-card border-cyan-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>Provider Portal</CardTitle>
              <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                Quick access to provider portal features and management
              </p>
            </div>
            <Button
              variant="outline"
              className="border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/20"
              onClick={() => router.push('/admin/providers')}
            >
              <UserCog className="h-4 w-4 mr-2" />
              Manage Providers
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start border-cyan-500/20 hover:border-cyan-500/40 hover:bg-white/5 transition-all"
              onClick={() => router.push('/admin/providers')}
            >
              <div className="flex items-center gap-2 mb-2">
                <UserCog className="h-5 w-5 text-cyan-400" />
                <span className="font-semibold text-white" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>All Providers</span>
              </div>
              <p className="text-xs text-muted-foreground text-left" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                View and manage all service providers
              </p>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start border-cyan-500/20 hover:border-cyan-500/40 hover:bg-white/5 transition-all"
              onClick={() => router.push('/admin/add-provider')}
            >
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="h-5 w-5 text-cyan-400" />
                <span className="font-semibold text-white" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Add Provider</span>
              </div>
              <p className="text-xs text-muted-foreground text-left" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                Invite a new provider to join your team
              </p>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start border-cyan-500/20 hover:border-cyan-500/40 hover:bg-white/5 transition-all"
              onClick={() => window.open('/provider/login', '_blank')}
            >
              <div className="flex items-center gap-2 mb-2">
                <LayoutDashboard className="h-5 w-5 text-cyan-400" />
                <span className="font-semibold text-white" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Provider Portal</span>
              </div>
              <p className="text-xs text-muted-foreground text-left" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                Access provider portal login page
              </p>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar and Recent Bookings Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming Bookings Calendar */}
        <Card className="lg:col-span-2 glass-card border-cyan-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>Upcoming Bookings</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={previousMonth} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-foreground font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              {monthNames[month]} {year}
            </p>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="space-y-2">
              {/* Days of week */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-xs font-medium text-foreground/90 py-1" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                  <div key={`empty-${index}`} className="min-h-[80px]" />
                ))}
                
                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const hasBookings = hasBooking(day);
                  const bookings = getBookingsForDay(day);
                  const today = isToday(day);
                  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  
                  const statusForDay = bookings.find((booking) => booking.status === "completed")
                    ? "completed"
                    : bookings.find((booking) => booking.status === "cancelled")
                    ? "cancelled"
                    : null;

                  const dayBaseClass = cn(
                    "min-h-[80px] p-1 rounded-lg text-sm relative transition-colors border border-border text-foreground",
                    today
                      ? "bg-accent/50 border-primary/50 hover:bg-accent/70"
                      : hasBookings
                        ? statusForDay === "completed"
                          ? "bg-green-500/20 dark:bg-green-900/40 border-green-400/70 dark:border-green-600/70"
                          : statusForDay === "cancelled"
                            ? "bg-pink-500/20 dark:bg-pink-900/40 border-pink-400/70 dark:border-pink-600/70"
                            : "bg-gradient-to-br from-accent/10 to-blue-500/10 dark:from-accent/20 dark:to-blue-900/30 border-accent/30"
                        : "hover:bg-accent/20 border-border"
                  );

                  return (
                    <div
                      key={day}
                      className={dayBaseClass}
                      onClick={() => {
                        if (hasBookings) {
                          setSelectedDate(dateKey);
                        }
                      }}
                    >
                      <div className="text-xs font-semibold mb-1 text-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>
                        {day}
                      </div>
                      
                      {hasBookings && (
                        <div className="space-y-0.5">
                          {bookings.slice(0, 2).map((booking, i) => {
                            const chipColor = booking.status === "completed"
                              ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                              : booking.status === "cancelled"
                                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                                : 'linear-gradient(135deg, #00D4E8 0%, #00BCD4 100%)';

                            return (
                              <div 
                                key={booking.id}
                                className="text-[9px] px-1 py-1 rounded text-white leading-tight cursor-pointer"
                                style={{ background: chipColor }}
                                title={`${booking.time} - ${booking.customerName} - ${booking.service}`}
                                onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}
                              >
                                <div className="font-semibold truncate" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{booking.time}</div>
                                <div className="truncate" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{booking.customerName.split(' ')[0]}</div>
                              </div>
                            );
                          })}
                          {bookings.length > 2 && (
                            <div className="text-[9px] text-muted-foreground px-1" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                              +{bookings.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-gradient-to-br from-cyan-400 to-blue-400 neon-cyan" />
                  <span className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Has bookings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-green-400" />
                  <span className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Completed bookings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-red-400" />
                  <span className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Cancelled bookings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded border-2 border-cyan-400 neon-cyan" />
                  <span className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Today</span>
                </div>
              </div>
            </div>

            {/* Selected date bookings */}
            {selectedDate && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>Bookings on {getFormattedSelectedDate}</h4>
                <div className="space-y-2">
                  {(bookingsByDate[selectedDate] || []).map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 cursor-pointer transition-all"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <div>
                        <p className="font-medium text-cyan-300" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{booking.customerName}</p>
                        <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{booking.service} • {booking.time}</p>
                      </div>
                      <span className="text-xs text-cyan-400 uppercase" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{booking.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Providers */}
        <Card className="lg:col-span-1 glass-card border-cyan-500/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>Service Providers</CardTitle>
            <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Current service providers ready for assignments
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.availableProviders && data.availableProviders.length > 0 ? (
              <>
                {data.availableProviders.map((provider) => (
                  <div 
                    key={provider.id}
                    className="p-3 rounded-lg border border-cyan-500/20 hover:bg-white/5 hover:border-cyan-500/40 transition-all cursor-pointer glass"
                    role="button"
                    title={`View ${provider.name} details`}
                    onClick={() => router.push(`/admin/providers/${provider.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-cyan-300 hover:text-cyan-200 transition-colors" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{provider.name}</p>
                      </div>
                      {getProviderStatusBadge(provider.availability_status)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                          {provider.assignment_count} {provider.assignment_count === 1 ? 'Booking' : 'Bookings'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-cyan-500/20">
                  <Button
                    variant="outline"
                    className="w-full border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-500/50"
                    onClick={() => router.push('/admin/providers')}
                  >
                    View All Providers
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>No available providers</p>
                <Button
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/20"
                  onClick={() => router.push('/admin/add-provider')}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Provider
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      
    </div>
    {/* Booking Details Dialog */}
    <Dialog open={!!selectedBooking} onOpenChange={(o) => { if (!o) setSelectedBooking(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>Booking Details</DialogTitle>
          <DialogDescription style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>View information about this booking.</DialogDescription>
        </DialogHeader>
        {selectedBooking && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Booking ID</div>
                <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.id}</div>
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Status</div>
                <div className="font-medium uppercase" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.status}</div>
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Provider</div>
                <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>
                  {selectedBooking.provider?.name || 'Unassigned'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Customer</div>
                <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.customer?.name || selectedBooking.customerName || 'Unknown Customer'}</div>
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Service</div>
                <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.service}</div>
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Date</div>
                <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.date} • {selectedBooking.time}</div>
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Amount</div>
                <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.amount}</div>
              </div>
            </div>
            
            {/* Provider Contact Details */}
            {selectedBooking.provider && (
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div>
                  <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Provider Email</div>
                  <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.provider.email || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Provider Phone</div>
                  <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.provider.phone || 'N/A'}</div>
                </div>
              </div>
            )}
            
            {/* Customer Contact Details */}
            {selectedBooking.customer && (
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div>
                  <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Customer Email</div>
                  <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.customer?.email || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Customer Phone</div>
                  <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.customer?.phone || 'N/A'}</div>
                </div>
              </div>
            )}
            
            {selectedBooking.notes && (
              <div className="border-t pt-3">
                <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Notes</div>
                <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.notes}</div>
              </div>
            )}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setSelectedBooking(null)}>Close</Button>
          {selectedBooking?.status === 'pending' && (
            <Button onClick={acceptBooking} variant="default">Accept Booking</Button>
          )}
          <Button onClick={() => { router.push('/admin/bookings'); }}>View Booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default Dashboard;
