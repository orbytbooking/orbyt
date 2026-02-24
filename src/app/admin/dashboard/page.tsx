"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
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
  Minus,
  UserCog,
  LayoutDashboard,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Pencil,
  CreditCard,
  Receipt,
  FileText,
  ListChecks,
  Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

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
  zipCode?: string | null;
  frequency?: string | null;
  customization?: Record<string, unknown> | null;
  durationMinutes?: number | null;
  providerWage?: number | null;
  aptNo?: string | null;
  address?: string | null;
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
    in_progress: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    pending: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    completed: "bg-green-500/20 text-green-300 border border-green-500/30",
    cancelled: "bg-red-500/20 text-red-300 border border-red-500/30",
  };

  const icons = {
    confirmed: CheckCircle2,
    in_progress: Clock,
    pending: Clock,
    completed: CheckCircle2,
    cancelled: XCircle,
  };

  const Icon = icons[status as keyof typeof icons] || AlertCircle;
  const label = status === "in_progress" ? "In progress" : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`} style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>
      <Icon className="h-3 w-3" />
      {label}
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
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sendInvitationLoading, setSendInvitationLoading] = useState(false);
  const [industries, setIndustries] = useState<{ id: string; name: string }[]>([]);
  const [extrasMap, setExtrasMap] = useState<Record<string, string>>({});
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

  // Fetch industries for booking modal (industry name, extras resolution)
  useEffect(() => {
    if (!currentBusiness?.id) return;
    fetch(`/api/industries?business_id=${currentBusiness.id}`)
      .then((r) => r.json())
      .then((data) => setIndustries(data.industries || []))
      .catch(() => setIndustries([]));
  }, [currentBusiness?.id]);

  // Fetch extras when booking modal opens (resolve selectedExtras IDs to names)
  useEffect(() => {
    if (!selectedBooking || industries.length === 0) { setExtrasMap({}); return; }
    const c = (selectedBooking.customization || {}) as Record<string, unknown>;
    const ids = (c.selectedExtras as string[]) || [];
    if (ids.length === 0) { setExtrasMap({}); return; }
    const industryId = industries[0]?.id;
    if (!industryId) return;
    fetch(`/api/extras?industryId=${industryId}`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.extras || [];
        const map: Record<string, string> = {};
        list.forEach((e: { id: string; name?: string }) => { if (e.id && e.name) map[e.id] = e.name; });
        setExtrasMap(map);
      })
      .catch(() => setExtrasMap({}));
  }, [selectedBooking?.id, industries]);

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

  // Keep booking summary modal in sync with latest dashboard data (after refresh, assign, or accept)
  useEffect(() => {
    if (!data || !selectedBooking?.id) return;
    const combined = [...(data.upcomingBookings || []), ...(data.recentBookings || [])];
    const fresh = combined.find((b: Booking) => b && b.id === selectedBooking.id);
    if (fresh) {
      setSelectedBooking(fresh);
    }
  }, [data, selectedBooking?.id]);

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

  const formatTime = (timeStr: string) => {
    try {
      const [h, m] = timeStr.split(":").map(Number);
      const h12 = h % 12 || 12;
      const ampm = h < 12 ? "AM" : "PM";
      return `${String(h12).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const DetailRow = ({ label, value, className }: { label: string; value: string; className?: string }) => (
    <div className="flex justify-between items-start gap-4 py-1.5 min-w-0">
      <span className="text-muted-foreground text-sm shrink-0">{label}</span>
      <span className={cn("text-sm font-medium text-right break-words break-all min-w-0 flex-1", className)}>{value}</span>
    </div>
  );

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

  const acceptBooking = async () => {
    if (!selectedBooking) return;
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', selectedBooking.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setSelectedBooking((prev) => prev ? { ...prev, status: 'confirmed' } : null);
    const name = selectedBooking.provider?.name || selectedBooking.customer?.name || selectedBooking.customerName || 'Unknown';
    toast({ title: 'Booking accepted', description: `${name} • ${selectedBooking.service} is now confirmed.` });
    fetchDashboardData(false);
  };

  const handleAssignProvider = async () => {
    if (!selectedProvider || !selectedBooking || !data?.business_id) return;
    const providerName = selectedProvider.name || 'Provider';
    let err = (await supabase
      .from('bookings')
      .update({ provider_id: selectedProvider.id, provider_name: providerName, status: 'confirmed' })
      .eq('id', selectedBooking.id)).error;
    if (err && /provider_name|column/i.test(String(err.message))) {
      err = (await supabase
        .from('bookings')
        .update({ provider_id: selectedProvider.id, status: 'confirmed' })
        .eq('id', selectedBooking.id)).error;
    }
    if (err) {
      toast({ title: 'Error', description: `Failed to assign provider: ${err.message}`, variant: 'destructive' });
      return;
    }
    setSelectedBooking((prev) => prev ? { ...prev, provider: { id: selectedProvider.id, name: providerName, email: selectedProvider.email || '', phone: selectedProvider.phone || '' }, status: 'confirmed' } : null);
    toast({ title: 'Provider Assigned', description: `${providerName} has been assigned to this booking.` });
    setShowProviderDialog(false);
    setSelectedProvider(null);
    fetchDashboardData(false);
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
                                key={`${booking.id}-${(booking as { date?: string }).date ?? ''}-${booking.time ?? ''}-${i}`}
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
                  {(bookingsByDate[selectedDate] || []).map((booking, idx) => (
                    <div
                      key={`${booking.id}-${(booking as { date?: string }).date ?? ''}-${booking.time ?? ''}-${idx}`}
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
    {/* Booking Details - side sheet like admin Bookings page */}
    <Sheet open={!!selectedBooking} onOpenChange={(o) => { if (!o) setSelectedBooking(null); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-screen max-h-screen overflow-hidden [&>button]:text-red-500 [&>button]:hover:text-red-600">
        <SheetHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-transparent flex flex-row items-center justify-between gap-4">
          <SheetTitle className="text-lg font-bold">Booking summary</SheetTitle>
          {selectedBooking && getStatusBadge(selectedBooking.status)}
        </SheetHeader>
        {selectedBooking && (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 flex flex-col gap-4 overscroll-contain">
            {/* Customer info - same as Bookings page */}
            <div className="flex gap-4 pt-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <UserIcon className="h-7 w-7 text-gray-500" />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="font-semibold text-base">{selectedBooking.customer?.name || selectedBooking.customerName || "Customer"}</p>
                {(selectedBooking.customer?.email || (selectedBooking as any).customer_email) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{selectedBooking.customer?.email || (selectedBooking as any).customer_email}</span>
                  </div>
                )}
                {(selectedBooking.customer?.phone || (selectedBooking as any).customer_phone) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{selectedBooking.customer?.phone || (selectedBooking as any).customer_phone}</span>
                  </div>
                )}
                {(selectedBooking.address || selectedBooking.aptNo) && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="break-words">{[selectedBooking.aptNo ? `Apt - ${selectedBooking.aptNo}` : null, selectedBooking.address].filter(Boolean).join(", ") || "—"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Booking details - single grey card like Bookings page */}
            <div className="rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 min-w-0 shrink-0">
              <Collapsible defaultOpen className="group">
                <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors shrink-0">
                  <span>Booking details</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white dark:bg-gray-800 group-data-[state=open]:hidden">
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white dark:bg-gray-800 hidden group-data-[state=open]:flex">
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-visible">
                  <div className="px-4 pb-4 space-y-2">
                    <DetailRow label="Booking id" value={String(selectedBooking.id)} />
                    {(selectedBooking.zipCode || (selectedBooking as any).zip_code) && (
                      <DetailRow label="Zip/Postal code" value={selectedBooking.zipCode || (selectedBooking as any).zip_code} />
                    )}
                    {industries[0]?.name && <DetailRow label="Industry" value={industries[0].name} />}
                    {selectedBooking.service && <DetailRow label="Service" value={selectedBooking.service} />}
                    {(selectedBooking.frequency || (selectedBooking as any).frequency) && (
                      <DetailRow label="Frequency" value={selectedBooking.frequency || (selectedBooking as any).frequency} />
                    )}
                    {selectedBooking.customization && typeof selectedBooking.customization === "object" && (() => {
                      const c = selectedBooking.customization as Record<string, unknown>;
                      const cv = (c.categoryValues || {}) as Record<string, string>;
                      const bath = cv.Bathroom ?? cv.bathroom ?? c.bathroom ?? c.bathrooms;
                      const sqft = cv["Sq Ft"] ?? cv.sqFt ?? cv.squareMeters ?? c.squareMeters ?? c.sqFt ?? c.sqft;
                      const bed = cv.Bedroom ?? cv.bedroom ?? c.bedroom ?? c.bedrooms;
                      return (
                        <>
                          {bath != null && String(bath).trim() && <DetailRow label="Bathrooms" value={String(bath).trim()} />}
                          {sqft != null && String(sqft).trim() && <DetailRow label="Sq Ft" value={String(sqft).trim()} />}
                          {bed != null && String(bed).trim() && <DetailRow label="Bedrooms" value={String(bed).trim()} />}
                        </>
                      );
                    })()}
                    {(() => {
                      const c = (selectedBooking.customization || {}) as Record<string, unknown>;
                      const ids = (c.selectedExtras as string[]) || [];
                      const names = ids.map((id: string) => extrasMap[id] || id).filter(Boolean);
                      return names.length > 0 ? <DetailRow label="Extras" value={names.join(", ")} /> : null;
                    })()}
                    {(selectedBooking.provider?.name || selectedBooking.provider_id) && <DetailRow label="Professionals" value="1" />}
                    {(selectedBooking.durationMinutes ?? (selectedBooking as any).duration_minutes) != null && (selectedBooking.durationMinutes ?? (selectedBooking as any).duration_minutes) > 0 && (
                      <DetailRow
                        label="Length"
                        value={((selectedBooking.durationMinutes ?? (selectedBooking as any).duration_minutes) >= 60
                          ? `${Math.floor((selectedBooking.durationMinutes ?? (selectedBooking as any).duration_minutes) / 60)} Hr ${(selectedBooking.durationMinutes ?? (selectedBooking as any).duration_minutes) % 60 || 0} Min`
                          : `${selectedBooking.durationMinutes ?? (selectedBooking as any).duration_minutes} Min`)}
                      />
                    )}
                    {(selectedBooking.date || selectedBooking.time) && (
                      <DetailRow
                        label="Service date"
                        value={selectedBooking.date && selectedBooking.time
                          ? `${new Date(selectedBooking.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "2-digit", day: "2-digit", year: "numeric" })}, ${formatTime(selectedBooking.time)}`
                          : selectedBooking.date || formatTime(selectedBooking.time) || "—"}
                      />
                    )}
                    <DetailRow label="Assigned to" value={selectedBooking.provider?.name || (selectedBooking as any).provider_name || "Unassigned"} />
                    {(selectedBooking.providerWage ?? (selectedBooking as any).provider_wage) != null && (selectedBooking.providerWage ?? (selectedBooking as any).provider_wage) > 0 && (
                      <div className="flex justify-between items-center gap-4 py-1.5 min-w-0">
                        <span className="text-muted-foreground text-sm shrink-0">Provider payment</span>
                        <span className="text-sm font-medium text-right break-words min-w-0 flex-1">
                          ${Number(selectedBooking.providerWage ?? (selectedBooking as any).provider_wage).toFixed(2)}
                          <Link href="/admin/settings" className="text-orange-600 hover:underline ml-1.5 text-xs">Learn more</Link>
                        </span>
                      </div>
                    )}
                    {(selectedBooking.aptNo || selectedBooking.address || (selectedBooking as any).apt_no) && (
                      <DetailRow
                        label="Location"
                        value={[(selectedBooking.aptNo ?? (selectedBooking as any).apt_no) ? `Apt - ${selectedBooking.aptNo ?? (selectedBooking as any).apt_no}` : null, selectedBooking.address].filter(Boolean).join(", ")}
                        className="text-right"
                      />
                    )}
                    {(selectedBooking as any).status === "cancelled" && (selectedBooking as any).cancellation_fee_amount != null && Number((selectedBooking as any).cancellation_fee_amount) > 0 && (
                      <div className="flex justify-between items-center gap-4 py-1.5">
                        <span className="text-muted-foreground text-sm shrink-0">Cancellation fee (applied)</span>
                        <span className="text-sm font-medium text-right">
                          {(selectedBooking as any).cancellation_fee_currency ?? "$"}{Number((selectedBooking as any).cancellation_fee_amount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center gap-4 py-1.5">
                      <span className="text-muted-foreground text-sm">Payment method</span>
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {((selectedBooking.paymentMethod ?? (selectedBooking as any).payment_method) === "online" || (selectedBooking.paymentMethod ?? (selectedBooking as any).payment_method) === "card") ? "CC" : (selectedBooking.paymentMethod ?? (selectedBooking as any).payment_method) === "cash" ? "Cash/Check" : (selectedBooking.paymentMethod ?? (selectedBooking as any).payment_method) || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1.5 min-w-0">
                      <span className="text-muted-foreground text-sm shrink-0">Price details</span>
                      <span className="text-sm font-medium text-right break-words min-w-0 flex-1">
                        {(() => {
                          const amount = (selectedBooking as any).total_price ?? selectedBooking.amount;
                          const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
                          return isNaN(numAmount) ? "$0.00" : `$${numAmount.toFixed(2)}`;
                        })()}
                        <Link href="/admin/settings" className="text-orange-600 hover:underline ml-1.5 text-xs">Learn more</Link>
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1.5">
                      <span className="text-muted-foreground text-sm">Status</span>
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 capitalize">{selectedBooking.status}</span>
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">Cancellation policy and fee are set in Settings → General → Cancellation.</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Note(s) - separate collapsible card like Bookings page */}
            <div className="rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 min-w-0 shrink-0">
              <Collapsible defaultOpen={!!selectedBooking.notes} className="group">
                <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors shrink-0">
                  <span>Note(s)</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white dark:bg-gray-800 group-data-[state=open]:hidden">
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white dark:bg-gray-800 hidden group-data-[state=open]:flex">
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-visible">
                  <div className="px-4 pb-4">
                    {selectedBooking.notes ? (
                      <p className="text-sm text-muted-foreground">{selectedBooking.notes}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No notes</p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Action buttons - same stack as Bookings page */}
            <div className="space-y-2 mt-auto pt-2">
              {!selectedBooking.provider && (
                <>
                  <Button className="w-full text-white" style={{ backgroundColor: "#00BCD4" }} onClick={() => setShowProviderDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />Assign Provider
                  </Button>
                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                    disabled={sendInvitationLoading}
                    onClick={async () => {
                      if (!selectedBooking?.id) return;
                      setSendInvitationLoading(true);
                      try {
                        const res = await fetch("/api/admin/bookings/send-invitation", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ bookingId: selectedBooking.id }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          toast({ title: "Error", description: data.error || "Failed to send invitation", variant: "destructive" });
                          return;
                        }
                        toast({ title: "Invitation sent", description: data.message || (data.providerName ? `Log into the provider portal as ${data.providerName} and open My Invitations.` : "Open provider portal → My Invitations.") });
                        fetchDashboardData(false);
                        setSelectedBooking((prev) => prev ? { ...prev } : null);
                      } catch (e) {
                        toast({ title: "Error", description: "Failed to send invitation", variant: "destructive" });
                      } finally {
                        setSendInvitationLoading(false);
                      }
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendInvitationLoading ? "Sending…" : "Send invitation to provider"}
                  </Button>
                </>
              )}
              <Button className="w-full text-white bg-blue-600 hover:bg-blue-700" onClick={() => { router.push(`/admin/add-booking?bookingId=${selectedBooking.id}`); setSelectedBooking(null); }}>
                <Pencil className="h-4 w-4 mr-2" />Edit
              </Button>
              <Button className="w-full text-white bg-red-600 hover:bg-red-700" onClick={async () => {
                if (!selectedBooking?.id) return;
                const { error } = await supabase.from("bookings").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", selectedBooking.id);
                if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
                toast({ title: "Booking cancelled" });
                fetchDashboardData(false);
                setSelectedBooking(null);
              }} disabled={selectedBooking.status === "cancelled"}>
                <XCircle className="h-4 w-4 mr-2" />Cancel
              </Button>
              <Button className="w-full text-white bg-emerald-500 hover:bg-emerald-600" onClick={() => { router.push(`/admin/leads?addBooking=${selectedBooking.id}`); setSelectedBooking(null); }}>
                Add to leads funnel
              </Button>
              <Button className="w-full text-white bg-pink-500 hover:bg-pink-600" onClick={() => toast({ title: "Add card link", description: "Send Add card link feature." })}>
                <CreditCard className="h-4 w-4 mr-2" />Send &quot;Add card&quot; link
              </Button>
              <Button className="w-full text-white bg-sky-400 hover:bg-sky-500" onClick={() => toast({ title: "Receipt", description: "Receipt will be resent to the customer." })}>
                <Receipt className="h-4 w-4 mr-2" />Resend Receipt
              </Button>
              <Button className="w-full text-white bg-amber-400 hover:bg-amber-500" onClick={() => { router.push(`/admin/logs?booking=${selectedBooking.id}`); setSelectedBooking(null); }}>
                <FileText className="h-4 w-4 mr-2" />View Booking Log
              </Button>
              <Button className="w-full text-white bg-rose-400 hover:bg-rose-500" onClick={() => { router.push(`/admin/booking-charges?precharge=${selectedBooking.id}`); setSelectedBooking(null); }}>
                Pre-charge
              </Button>
              <Button className="w-full text-white bg-orange-500 hover:bg-orange-600" onClick={() => toast({ title: "Checklist", description: "View checklist for this booking." })}>
                <ListChecks className="h-4 w-4 mr-2" />View Checklist
              </Button>
              <Button className="w-full text-white bg-amber-300 hover:bg-amber-400 text-gray-900" onClick={() => toast({ title: "Job Media", description: "View job media and photos." })}>
                <Image className="h-4 w-4 mr-2" />Job Media
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                onClick={() => { router.push(`/admin/bookings?booking=${selectedBooking.id}`); setSelectedBooking(null); }}
              >
                View in Bookings
              </Button>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setSelectedBooking(null)}>Close</Button>
                {selectedBooking?.status === "pending" && selectedBooking?.provider && (
                  <Button onClick={acceptBooking} variant="default">Accept Booking</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>

    {/* Assign Provider Dialog */}
    <Dialog open={showProviderDialog} onOpenChange={(open) => { setShowProviderDialog(open); if (!open) setSelectedProvider(null); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>Assign Provider</DialogTitle>
          <DialogDescription style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            Select an available provider for {selectedBooking?.service} on {selectedBooking?.date} at {selectedBooking?.time}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {(!data?.availableProviders || data.availableProviders.length === 0) ? (
            <div className="flex justify-center py-8 text-sm text-muted-foreground">No providers available</div>
          ) : (
            data.availableProviders.map((provider) => (
              <div
                key={provider.id}
                className={cn(
                  "border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md",
                  selectedProvider?.id === provider.id ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20" : "border-border hover:border-cyan-300"
                )}
                onClick={() => setSelectedProvider(provider)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-base">{provider.name}</h3>
                    {provider.email && <p className="text-xs text-muted-foreground">{provider.email}</p>}
                  </div>
                  {selectedProvider?.id === provider.id && (
                    <CheckCircle2 className="h-5 w-5 text-cyan-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => { setShowProviderDialog(false); setSelectedProvider(null); }}>Cancel</Button>
          <Button
            disabled={!selectedProvider}
            style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}
            onClick={handleAssignProvider}
          >
            Assign Provider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default Dashboard;
