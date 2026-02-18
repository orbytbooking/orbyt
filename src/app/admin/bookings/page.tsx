"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Search, 
  Filter, 
  Plus,
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
  History
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

import { supabase } from "@/lib/supabaseClient";
import { useBusiness } from "@/contexts/BusinessContext";
import { SendScheduleDialog } from "@/components/admin/SendScheduleDialog";

// Bookings are now loaded from Supabase only.

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
  created_at?: string;
  updated_at?: string;
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
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();


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
    
    // Update both provider_id (database field) and assignedProvider (display field)
    const providerName = selectedProvider.name || `${selectedProvider.first_name || ''} ${selectedProvider.last_name || ''}`.trim();
    const { error } = await supabase
      .from('bookings')
      .update({ 
        provider_id: selectedProvider.id,
        assignedProvider: providerName,
        status: 'confirmed' // Auto-confirm when provider is assigned
      })
      .eq('id', selectedBooking.id);
    
    if (error) {
      toast({
        title: "Error",
        description: `Failed to assign provider: ${error.message}`,
        variant: "destructive",
      });
      return;
    }
    
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

      {/* Booking Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Booking Details - {selectedBooking?.id}</DialogTitle>
            <DialogDescription>
              View and manage booking information
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Status:</span>
                {getStatusBadge(selectedBooking.status)}
              </div>

              {/* Customer Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Customer Information</h3>
                <div className="grid gap-2 bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{selectedBooking.customer_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{selectedBooking.customer_phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{selectedBooking.address}</span>
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Service Details</h3>
                <div className="grid gap-2 bg-muted/50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Service:</span>
                    <span className="text-sm font-medium">{selectedBooking.service}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date:</span>
                    <span className="text-sm font-medium">{selectedBooking.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Time:</span>
                    <span className="text-sm font-medium">{selectedBooking.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Payment Method:</span>
                    <span className="text-sm font-medium">{selectedBooking.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount:</span>
                    <span className="text-sm font-bold">
                      {(() => {
                        const amount = (selectedBooking as any).total_price ?? selectedBooking.amount;
                        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
                        return numAmount > 0 ? `$${numAmount.toFixed(2)}` : '$0.00';
                      })()}
                    </span>
                  </div>
                  {(selectedBooking.provider_id || (selectedBooking as any).assignedProvider) && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Assigned Provider:</span>
                      <span className="text-sm font-medium text-cyan-600">
                        {(selectedBooking as any).assignedProvider || 'Provider Assigned'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Notes</h3>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {/* Assign Provider Button - Only show if no provider is assigned */}
                {selectedBooking.status === "confirmed" && !selectedBooking.provider_id && !selectedBooking.assignedProvider && (
                  <Button 
                    className="w-full"
                    style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}
                    onClick={() => setShowProviderDialog(true)}
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

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider Assignment Dialog */}
      <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
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
