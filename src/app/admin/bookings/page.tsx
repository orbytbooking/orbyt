"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Link from "next/link";
import {
  Search, 
  Filter, 
  Plus,
  Minus,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  List,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Send,
  UserPlus,
  Calendar,
  Users,
  FileText,
  Archive,
  History,
  User as UserIcon
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

import { supabase } from "@/lib/supabaseClient";
import { useBusiness } from "@/contexts/BusinessContext";
import { SendScheduleDialog } from "@/components/admin/SendScheduleDialog";

// Bookings are now loaded from Supabase only.

// Customization stored on booking (partial cleaning, exclude areas/quantities, etc.)
interface BookingCustomization {
  isPartialCleaning?: boolean;
  excludedAreas?: string[];
  excludeQuantities?: Record<string, number>;
  selectedExtras?: string[];
  extraQuantities?: Record<string, number>;
  categoryValues?: Record<string, string>;
}

// Define Booking type based on Supabase schema
interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service: string;
  date: string;
  time: string;
  address: string;
  status: string;
  amount: number | string;
  payment_method?: string;
  notes?: string;
  assignedProvider?: string;
  provider_id?: string | null;
  created_at?: string;
  updated_at?: string;
  customization?: BookingCustomization | null;
}

// Provider type definition
type Provider = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};


const getStatusBadge = (status: string) => {
  const styles = {
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400",
    quote: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  };

  const icons = {
    confirmed: CheckCircle2,
    pending: Clock,
    completed: CheckCircle2,
    cancelled: XCircle,
    draft: FileText,
    quote: FileText,
  };

  const Icon = icons[status as keyof typeof icons] || AlertCircle;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const getStatusTone = (status: string) => {
  switch (status) {
    case "completed":
      return {
        light: "bg-green-50",
        dark: "dark:bg-green-950/70",
        chip: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
      };
    case "cancelled":
      return {
        light: "bg-red-50",
        dark: "dark:bg-red-950/70",
        chip: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      };
    case "confirmed":
      return {
        light: "bg-blue-50",
        dark: "dark:bg-blue-950/70",
        chip: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
      };
    case "pending":
      return {
        light: "bg-yellow-50",
        dark: "dark:bg-yellow-900/60",
        chip: "linear-gradient(135deg, #fde68a 0%, #f59e42 100%)",
      };
    case "draft":
      return {
        light: "bg-gray-50",
        dark: "dark:bg-gray-900/60",
        chip: "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)",
      };
    case "quote":
      return {
        light: "bg-purple-50",
        dark: "dark:bg-purple-900/60",
        chip: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
      };
    default:
      return {
        light: "bg-muted",
        dark: "dark:bg-muted",
        chip: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)",
      };
  }
};

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [showSendScheduleDialog, setShowSendScheduleDialog] = useState(false);
  const [excludeParamNames, setExcludeParamNames] = useState<Record<string, string>>({});
  const [industries, setIndustries] = useState<{ id: string; name: string }[]>([]);
  const [extrasMap, setExtrasMap] = useState<Record<string, string>>({});

  // When viewing a booking with partial cleaning, resolve exclude parameter IDs to names
  useEffect(() => {
    if (!showDetails || !selectedBooking?.customization?.excludedAreas?.length || !currentBusiness?.id) {
      setExcludeParamNames({});
      return;
    }
    const cust = selectedBooking.customization;
    const ids = cust.excludedAreas || [];
    if (ids.length === 0) {
      setExcludeParamNames({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const indRes = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const indData = await indRes.json();
        const industry = indData.industries?.find((i: any) => i.name === "Home Cleaning") || indData.industries?.[0];
        if (!industry?.id || cancelled) return;
        const epRes = await fetch(`/api/exclude-parameters?industryId=${industry.id}`);
        const epData = await epRes.json();
        const params = epData.excludeParameters || [];
        const map: Record<string, string> = {};
        params.forEach((p: any) => {
          if (ids.includes(p.id)) map[p.id] = p.name || p.id;
        });
        if (!cancelled) setExcludeParamNames(map);
      } catch {
        if (!cancelled) setExcludeParamNames({});
      }
    })();
    return () => { cancelled = true; };
  }, [showDetails, selectedBooking?.id, selectedBooking?.customization?.excludedAreas, currentBusiness?.id]);

  // Fetch industries for booking modal
  useEffect(() => {
    if (!currentBusiness?.id) return;
    fetch(`/api/industries?business_id=${currentBusiness.id}`)
      .then((r) => r.json())
      .then((data) => setIndustries(data.industries || []))
      .catch(() => setIndustries([]));
  }, [currentBusiness?.id]);

  // Fetch extras when booking modal opens (resolve selectedExtras IDs to names)
  useEffect(() => {
    if (!showDetails || !selectedBooking || industries.length === 0) { setExtrasMap({}); return; }
    const c = (selectedBooking as any).customization as Record<string, unknown> | undefined;
    const ids = (c?.selectedExtras as string[]) || [];
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
  }, [showDetails, selectedBooking?.id, industries]);

  // Auto-set view mode based on active tab
  useEffect(() => {
    const tabsNeedingListView = ['today', 'unassigned', 'draft', 'cancelled', 'history'];
    if (tabsNeedingListView.includes(activeTab)) {
      setViewMode("list");
    } else {
      setViewMode("calendar");
    }
  }, [activeTab]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    async function fetchBookings() {
      if (!currentBusiness?.id) {
        console.log('Waiting for business context...');
        return;
      }
      
      setLoading(true);
      // Fetch bookings
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('business_id', currentBusiness?.id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Failed to fetch bookings from Supabase', error);
        setBookings([]);
        setLoading(false);
        return;
      }
      
      // Fetch providers to get names for bookings with provider_id
      const providerIds = [...new Set((bookingsData || [])
        .filter(b => b.provider_id)
        .map(b => b.provider_id)
      )];
      
      let providersMap: Record<string, any> = {};
      if (providerIds.length > 0) {
        const { data: providersData } = await supabase
          .from('service_providers')
          .select('id, first_name, last_name, name')
          .in('id', providerIds)
          .eq('business_id', currentBusiness?.id);
        
        if (providersData) {
          providersMap = providersData.reduce((acc: Record<string, any>, provider: any) => {
            const name = provider.name || `${provider.first_name || ''} ${provider.last_name || ''}`.trim();
            acc[provider.id] = { ...provider, displayName: name };
            return acc;
          }, {});
        }
      }
      
      // Map bookings to include provider name
      const bookingsWithProvider = (bookingsData || []).map((booking: any) => {
        let providerName = booking.assignedProvider || null;
        
        // If booking has provider_id, get name from providers map
        if (booking.provider_id && providersMap[booking.provider_id]) {
          providerName = providersMap[booking.provider_id].displayName;
        }
        
        return {
          ...booking,
          assignedProvider: providerName,
          provider_id: booking.provider_id || null
        };
      });
      
      setBookings(bookingsWithProvider);
      setLoading(false);
    }
    fetchBookings();
  }, [currentBusiness?.id]); // Add dependency on business ID

  // Fetch providers from database
  useEffect(() => {
    async function fetchProviders() {
      if (!currentBusiness?.id) {
        console.log('Waiting for business context to fetch providers...');
        return;
      }
      
      setProvidersLoading(true);
      try {
        const response = await fetch(`/api/admin/providers?businessId=${currentBusiness.id}`);
        const data = await response.json();
        
        if (data.providers) {
          setProviders(data.providers);
          console.log('Successfully fetched providers:', data.providers.length);
        } else {
          console.error('No providers data received');
          setProviders([]);
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error);
        setProviders([]);
      } finally {
        setProvidersLoading(false);
      }
    }
    fetchProviders();
  }, [currentBusiness?.id]);

  // No localStorage sync needed; bookings are live from Supabase.


  // Tab filtering functions
  const getTodayBookings = () => {
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(booking => booking.date === today);
  };

  const getUpcomingBookings = () => {
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(booking => 
      booking.date > today && 
      ['confirmed', 'pending'].includes(booking.status)
    );
  };

  const getUnassignedBookings = () => {
    return bookings.filter(booking => 
      !booking.provider_id && 
      !booking.assignedProvider && 
      ['confirmed', 'pending'].includes(booking.status)
    );
  };

  const getDraftQuoteBookings = () => {
    return bookings.filter(booking => 
      ['draft', 'quote'].includes(booking.status)
    );
  };

  const getCancelledBookings = () => {
    return bookings.filter(booking => booking.status === 'cancelled');
  };

  const getHistoryBookings = () => {
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(booking => 
      booking.date < today || booking.status === 'completed'
    );
  };

  const getTabBookings = (tab: string) => {
    switch (tab) {
      case 'today':
        return getTodayBookings();
      case 'upcoming':
        return getUpcomingBookings();
      case 'unassigned':
        return getUnassignedBookings();
      case 'draft':
        return getDraftQuoteBookings();
      case 'cancelled':
        return getCancelledBookings();
      case 'history':
        return getHistoryBookings();
      default:
        return bookings;
    }
  };

  const filteredBookings = useMemo(() => {
    const tabBookings = getTabBookings(activeTab);
    return tabBookings.filter((booking) => {
      const matchesSearch = 
        booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.service.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [bookings, activeTab, searchTerm, statusFilter]);

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetails(true);
  };

  const createBookingNotification = async (title: string, description: string) => {
    if (!currentBusiness?.id) return;
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          business_id: currentBusiness.id,
          link: '/admin/bookings',
        }),
      });
    } catch {
      // Non-blocking
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
    if (error) {
      toast({
        title: "Error",
        description: `Failed to update booking status: ${error.message}`,
        variant: "destructive",
      });
      return;
    }
    const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
    await createBookingNotification('Booking modified', `Booking ${bkRef} status changed to ${newStatus}.`);
    setBookings((prev) => {
  const updated = prev.map((booking) =>
    booking.id === bookingId ? { ...booking, status: newStatus } : booking
  );
  const activeSelection = updated.find((booking) => booking.id === bookingId) || null;
  setSelectedBooking(activeSelection);
  return updated;
});
toast({
  title: "Status Updated",
  description: `Booking ${bookingId} status changed to ${newStatus}`,
});
    setShowDetails(false);
  };


  const handleAssignProvider = async () => {
    if (!selectedProvider || !selectedBooking) return;
    
    // Update provider_id and (if column exists) provider_name so customer portal shows assigned provider
    const providerName = selectedProvider.name || `${selectedProvider.first_name || ''} ${selectedProvider.last_name || ''}`.trim();
    let error = (await supabase
      .from('bookings')
      .update({ 
        provider_id: selectedProvider.id,
        provider_name: providerName,
        status: 'confirmed' // Auto-confirm when provider is assigned
      })
      .eq('id', selectedBooking.id)).error;
    if (error && /provider_name|column/i.test(String(error.message))) {
      error = (await supabase
        .from('bookings')
        .update({ provider_id: selectedProvider.id, status: 'confirmed' })
        .eq('id', selectedBooking.id)).error;
    }
    if (error) {
      toast({
        title: "Error",
        description: `Failed to assign provider: ${error.message}`,
        variant: "destructive",
      });
      return;
    }

    const bkRef = `BK${String(selectedBooking.id).slice(-6).toUpperCase()}`;
    await createBookingNotification('Booking assigned', `Provider ${providerName} assigned to booking ${bkRef}.`);
    
    setBookings((prev) => {
      const updated = prev.map((booking) =>
        booking.id === selectedBooking.id
          ? { 
              ...booking, 
              provider_id: selectedProvider.id,
              assignedProvider: providerName,
              status: 'confirmed'
            }
          : booking
      );
      const activeSelection = updated.find((booking) => booking.id === selectedBooking.id) || null;
      setSelectedBooking(activeSelection);
      return updated;
    });
    
    toast({
      title: "Provider Assigned",
      description: `${providerName} has been assigned to booking ${selectedBooking.id}`,
    });
    
    setShowProviderDialog(false);
    setSelectedProvider(null);
  };


  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getBookingsForDate = (date: string) => {
    return bookings.filter((booking) => booking.date === date);
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatTime = (timeStr: string | undefined) => {
    if (!timeStr) return "—";
    try {
      const t = String(timeStr).slice(0, 5);
      const [h, m] = t.split(":").map(Number);
      const h12 = h % 12 || 12;
      const ampm = h >= 12 ? "PM" : "AM";
      return `${String(h12).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const DetailRow = ({ label, value, className }: { label: string; value: string; className?: string }) => (
    <div className="flex justify-between items-start gap-4 py-1.5">
      <span className="text-muted-foreground text-sm shrink-0">{label}</span>
      <span className={cn("text-sm font-medium text-right break-words max-w-[60%]", className)}>{value}</span>
    </div>
  );

  const DetailSection = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h4>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-background text-foreground">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" className="text-foreground" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="all" className="text-foreground hover:bg-accent">All Status</SelectItem>
              <SelectItem value="pending" className="text-foreground hover:bg-accent">Pending</SelectItem>
              <SelectItem value="confirmed" className="text-foreground hover:bg-accent">Confirmed</SelectItem>
              <SelectItem value="completed" className="text-foreground hover:bg-accent">Completed</SelectItem>
              <SelectItem value="cancelled" className="text-foreground hover:bg-accent">Cancelled</SelectItem>
              <SelectItem value="draft" className="text-foreground hover:bg-accent">Draft</SelectItem>
              <SelectItem value="quote" className="text-foreground hover:bg-accent">Quote</SelectItem>
            </SelectContent>
          </Select>
          {/* View Toggle Buttons - Only show for tabs that benefit from calendar view */}
          {(['all', 'upcoming'].includes(activeTab)) && (
            <div className="flex gap-2">
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("calendar")}
                className={cn(
                  viewMode === "calendar" 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                title="Calendar View"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className={cn(
                  viewMode === "list" 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                title="List View"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setShowSendScheduleDialog(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            title="Send Schedule"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Schedule
          </Button>
          <Button 
            onClick={() => router.push("/admin/add-booking")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Booking
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7 bg-muted/50">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Today
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Unassigned
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Draft/Quote
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Cancelled
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <TabsContent value={activeTab} className="space-y-4">
          {/* Tab Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Today</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{getTodayBookings().length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400">Upcoming</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{getUpcomingBookings().length}</p>
                  </div>
                  <CalendarIcon className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 dark:text-orange-400">Unassigned</p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{getUnassignedBookings().length}</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 dark:text-purple-400">Draft/Quote</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{getDraftQuoteBookings().length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400">Cancelled</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">{getCancelledBookings().length}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/20 dark:to-gray-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">History</p>
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{getHistoryBookings().length}</p>
                  </div>
                  <History className="h-8 w-8 text-gray-500" />
                </div>
              </CardContent>
            </Card>
          </div>

      {/* List View */}
      {viewMode === "list" && (
        <Card>
        <CardHeader>
          <CardTitle>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Bookings ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Customer
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Service
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Date & Time
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const tone = getStatusTone(booking.status);
                  return (
                    <tr
                      key={booking.id}
                      className={cn(
                        "border-b border-border transition-colors",
                        tone.dark,
                        "text-white",
                        booking.status === "completed"
                          ? "hover:bg-green-900/80"
                          : booking.status === "cancelled"
                          ? "hover:bg-red-900/80"
                          : booking.status === "confirmed"
                          ? "hover:bg-blue-900/80"
                          : booking.status === "pending"
                          ? "hover:bg-yellow-900/40"
                          : "hover:bg-muted/60"
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium">{booking.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{booking.customer_email}</div>
                      </td>
                      <td className="py-3 px-4 text-sm">{booking.service}</td>
                      <td className="py-3 px-4 text-sm">
                        <div>{booking.date}</div>
                        <div className="text-xs text-muted-foreground">{booking.time}</div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(booking.status)}</td>
                      <td className="py-3 px-4 text-sm font-medium text-right">{booking.amount}</td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(booking)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{monthNames[month]} {year}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {dayNames.map(day => (
                <div key={day} className="text-center font-semibold text-sm py-2 text-foreground/90">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="h-24" />
              ))}
              
              {/* Calendar days */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const dateString = formatDate(year, month, day);
                const dayBookings = getBookingsForDate(dateString);
                const hasBookings = dayBookings.length > 0;
                const today = new Date();
                const isToday = today.getDate() === day && 
                               today.getMonth() === month && 
                               today.getFullYear() === year;
                
                return (
                  <div
                    key={day}
                    className={cn(
                      "h-24 rounded-lg p-2 transition-all cursor-pointer border",
                      isToday 
                        ? "bg-accent/50 border-primary/50 hover:bg-accent/70"
                        : "bg-background border-border hover:bg-accent/20"
                    )}
                  >
                    <div className="flex flex-col h-full">
                      <div className="text-sm font-medium mb-1 text-foreground">
                        {day}
                      </div>
                      {hasBookings && (
                        <div className="flex-1 space-y-0.5 overflow-y-auto">
                          {dayBookings.slice(0, 2).map((booking) => {
                            const tone = getStatusTone(booking.status);
                            return (
                              <div
                                key={booking.id}
                                onClick={() => handleViewDetails(booking)}
                                className="text-[10px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity text-white"
                                style={{ background: tone.chip }}
                              >
                                <div className="truncate font-medium">{booking.time}</div>
                                <div className="truncate">{booking.service}</div>
                              </div>
                            );
                          })}
                          {dayBookings.length > 2 && (
                            <div className="text-[10px] text-muted-foreground text-center">
                              +{dayBookings.length - 2}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-200" />
                <span>Confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200" />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-200" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30 border border-red-200" />
                <span>Cancelled</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>
      </Tabs>

      {/* Booking Details Dialog - improved UI matching dashboard */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-300">
          <DialogHeader className="px-6 pt-6 pb-0 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <DialogTitle>Booking summary</DialogTitle>
            <DialogDescription className="sr-only">View and manage booking information</DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {/* Customer info block */}
              <div className="flex gap-4 pt-5 animate-in fade-in-0 slide-in-from-left-2 duration-300 delay-75">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/80 ring-2 ring-background transition-transform hover:scale-105">
                  <UserIcon className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base">
                      {selectedBooking.customer_name || "Customer"}
                    </span>
                  </div>
                  {selectedBooking.customer_email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{selectedBooking.customer_email}</span>
                    </div>
                  )}
                  {selectedBooking.customer_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{selectedBooking.customer_phone}</span>
                    </div>
                  )}
                  {selectedBooking.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="break-words">
                        {((selectedBooking as any).apt_no ? `Apt - ${(selectedBooking as any).apt_no}, ` : "")}{selectedBooking.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible Booking details */}
              <div className="border-t mt-5 pt-5 animate-in fade-in-0 duration-300 delay-100">
                <Collapsible defaultOpen className="group">
                  <CollapsibleTrigger className="flex w-full items-center justify-between py-2.5 px-3 -mx-3 rounded-lg text-left font-semibold text-sm hover:bg-muted/50 transition-colors duration-200">
                    <span>Booking details</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background group-data-[state=open]:hidden transition-all duration-200">
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background hidden group-data-[state=open]:flex transition-all duration-200">
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                      <DetailSection title="Booking info">
                        <DetailRow label="Booking id" value={String(selectedBooking.id)} />
                        {(selectedBooking as any).zip_code && <DetailRow label="Zip/Postal code" value={(selectedBooking as any).zip_code} />}
                        {industries[0]?.name && <DetailRow label="Industry" value={industries[0].name} />}
                        <DetailRow label="Service" value={selectedBooking.service || "—"} />
                        {(selectedBooking as any).frequency && <DetailRow label="Frequency" value={(selectedBooking as any).frequency} />}
                      </DetailSection>
                      <DetailSection title="Service details">
                        {selectedBooking.customization && typeof selectedBooking.customization === "object" && (() => {
                          const c = selectedBooking.customization as Record<string, unknown>;
                          const cv = (c.categoryValues || {}) as Record<string, string>;
                          const bath = cv.Bathroom ?? cv.bathroom ?? c.bathroom ?? c.bathrooms;
                          const sqft = cv["Sq Ft"] ?? cv.sqFt ?? c.squareMeters ?? c.sqFt ?? c.sqft;
                          const bed = cv.Bedroom ?? cv.bedroom ?? c.bedroom ?? c.bedrooms;
                          const livingRoom = cv["Living Room"] ?? cv.livingRoom ?? c.livingRoom;
                          const storage = cv.Storage ?? cv.storage ?? c.storage;
                          const items: { label: string; value: string }[] = [];
                          if (bath != null && String(bath).trim()) items.push({ label: "Bathrooms", value: String(bath) });
                          if (sqft != null && String(sqft).trim()) items.push({ label: "Sq Ft", value: String(sqft) });
                          if (bed != null && String(bed).trim()) items.push({ label: "Bedrooms", value: String(bed) });
                          if (livingRoom != null && String(livingRoom).trim()) items.push({ label: "Living Room", value: String(livingRoom) });
                          if (storage != null && String(storage).trim()) items.push({ label: "Storage", value: String(storage) });
                          if (items.length === 0) return null;
                          return <>{items.map(({ label, value }) => <DetailRow key={label} label={label} value={value} />)}</>;
                        })()}
                        {(() => {
                          const c = (selectedBooking as any).customization as Record<string, unknown> | undefined;
                          const ids = (c?.selectedExtras as string[]) || [];
                          const names = ids.map((id: string) => extrasMap[id] || id).filter(Boolean);
                          if (names.length === 0) return null;
                          return <DetailRow label="Extras" value={names.join(", ")} className="text-right" />;
                        })()}
                        {selectedBooking.provider_id && <DetailRow label="Professionals" value="1" />}
                        {(selectedBooking as any).duration_minutes != null && (selectedBooking as any).duration_minutes > 0 && (
                          <DetailRow
                            label="Length"
                            value={
                              (selectedBooking as any).duration_minutes >= 60
                                ? `${Math.floor((selectedBooking as any).duration_minutes / 60)} Hr ${(selectedBooking as any).duration_minutes % 60 ? `${(selectedBooking as any).duration_minutes % 60} Min` : "0 Min"}`
                                : `${(selectedBooking as any).duration_minutes} Min`
                            }
                          />
                        )}
                      </DetailSection>
                      <DetailSection title="Schedule">
                        <DetailRow
                          label="Service date"
                          value={selectedBooking.date && selectedBooking.time
                            ? `${new Date(selectedBooking.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "2-digit", day: "2-digit", year: "numeric" })} — ${formatTime(selectedBooking.time)}`
                            : selectedBooking.date || "—"}
                        />
                        <DetailRow label="Assigned to" value={selectedBooking.assignedProvider || (selectedBooking as any).provider_name || "Unassigned"} className="font-bold" />
                      </DetailSection>
                      <DetailSection title="Payment & location">
                        {(selectedBooking as any).provider_wage != null && (selectedBooking as any).provider_wage > 0 && (
                          <div className="flex justify-between items-center gap-4 py-1.5">
                            <span className="text-muted-foreground text-sm shrink-0">Provider payment</span>
                            <span className="text-sm font-medium text-right">
                              ${Number((selectedBooking as any).provider_wage).toFixed(2)}
                              <Link href="/admin/settings" className="text-orange-600 hover:underline ml-1.5 text-xs">Learn more</Link>
                            </span>
                          </div>
                        )}
                        {((selectedBooking as any).apt_no || selectedBooking.address) && (
                          <DetailRow
                            label="Location"
                            value={[(selectedBooking as any).apt_no ? `Apt - ${(selectedBooking as any).apt_no}` : null, selectedBooking.address].filter(Boolean).join(", ")}
                            className="text-right"
                          />
                        )}
                        <div className="flex justify-between items-center gap-4 py-1.5">
                          <span className="text-muted-foreground text-sm">Payment method</span>
                          <span className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          )}>
                            {(selectedBooking as any).payment_method === "online" || (selectedBooking as any).payment_method === "card" ? "CC" : (selectedBooking as any).payment_method === "cash" ? "Cash/Check" : (selectedBooking as any).payment_method || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-4 py-1.5">
                          <span className="text-muted-foreground text-sm shrink-0">Price details</span>
                          <span className="text-sm font-medium text-right">
                            {(() => {
                              const amount = (selectedBooking as any).total_price ?? selectedBooking.amount;
                              const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
                              return numAmount > 0 ? `$${numAmount.toFixed(2)}` : "$0.00";
                            })()}
                            <Link href="/admin/settings" className="text-orange-600 hover:underline ml-1.5 text-xs">Learn more</Link>
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-4 py-1.5">
                          <span className="text-muted-foreground text-sm">Status</span>
                          {getStatusBadge(selectedBooking.status)}
                        </div>
                      </DetailSection>
                    </div>

                    {/* Partial cleaning */}
                    {(() => {
                      const cust = (selectedBooking as any).customization as BookingCustomization | undefined;
                      if (!cust?.isPartialCleaning && !(cust?.excludedAreas?.length)) return null;
                      return (
                        <div className="mt-4 rounded-lg bg-amber-50/80 dark:bg-amber-950/20 p-3 border border-amber-100 dark:border-amber-900/30">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-600 mb-2">Partial cleaning</h4>
                          <div className="space-y-1.5">
                            <DetailRow label="Partial cleaning" value={cust?.isPartialCleaning ? "Yes" : "No"} />
                            {cust?.excludedAreas?.length ? (
                              <div>
                                <span className="text-muted-foreground text-sm">Excluded areas: </span>
                                <span className="text-sm font-medium">
                                  {(cust.excludedAreas || []).map((paramId) => {
                                    const qty = cust.excludeQuantities?.[paramId] ?? 1;
                                    const name = excludeParamNames[paramId] || `${paramId.slice(0, 8)}…`;
                                    return `${name}${qty > 1 ? ` × ${qty}` : ""}`;
                                  }).join(", ")}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Notes */}
                    {selectedBooking.notes && (
                      <div className="mt-4 rounded-lg bg-muted/50 p-3 border">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Notes</h4>
                        <p className="text-sm">{selectedBooking.notes}</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-5">
                {/* Assign Provider Button - Show for any unassigned booking */}
                {!selectedBooking.provider_id && !selectedBooking.assignedProvider && (
                  <Button 
                    className="w-full"
                    style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}
                    onClick={() => {
                      setSelectedProvider(null); // Reset selected provider when opening dialog
                      setShowProviderDialog(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Provider
                  </Button>
                )}
                
                {/* Show provider info if already assigned */}
                {selectedBooking.provider_id && (
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Assigned Provider</p>
                        <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                          {selectedBooking.assignedProvider || 'Provider Assigned'}
                        </p>
                      </div>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setShowProviderDialog(true)}
                        className="text-xs"
                      >
                        Change Provider
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status Action Buttons */}
                <div className="flex gap-2">
                  {selectedBooking.status === "pending" && (
                    <Button 
                      className="flex-1"
                      style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}
                      onClick={() => handleStatusChange(selectedBooking.id, "confirmed")}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirm Booking
                    </Button>
                  )}
                  {selectedBooking.status === "confirmed" && (
                    <Button 
                      className="flex-1"
                      style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white' }}
                      onClick={() => handleStatusChange(selectedBooking.id, "completed")}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </Button>
                  )}
                  {(selectedBooking.status === "pending" || selectedBooking.status === "confirmed") && (
                    <Button 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleStatusChange(selectedBooking.id, "cancelled")}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Booking
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="px-6 pb-6 pt-2 gap-2">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider Assignment Dialog */}
      <Dialog open={showProviderDialog} onOpenChange={(open) => {
        setShowProviderDialog(open);
        if (!open) {
          setSelectedProvider(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Provider</DialogTitle>
            <DialogDescription>
              Select an available provider for {selectedBooking?.service} on {selectedBooking?.date} at {selectedBooking?.time}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {providersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading providers...</div>
              </div>
            ) : providers.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">No providers available</div>
              </div>
            ) : (
              providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                    selectedProvider?.id === provider.id
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20'
                      : 'border-border hover:border-cyan-300'
                  }`}
                  onClick={() => setSelectedProvider(provider)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-base">{provider.name}</h3>
                      {provider.email && (
                        <p className="text-xs text-muted-foreground">{provider.email}</p>
                      )}
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
            <Button 
              variant="outline" 
              onClick={() => {
                setShowProviderDialog(false);
                setSelectedProvider(null);
              }}
            >
              Cancel
            </Button>
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

      {/* Send Schedule Dialog */}
      <SendScheduleDialog
        open={showSendScheduleDialog}
        onOpenChange={setShowSendScheduleDialog}
        bookings={bookings}
        providers={providers}
      />
    </div>
  );
}
