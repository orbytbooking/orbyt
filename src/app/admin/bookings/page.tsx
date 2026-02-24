"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const TAB_DESCRIPTIONS: Record<string, string> = {
  all: "All your bookings are shown here.",
  today: "Bookings scheduled for today are shown here.",
  upcoming: "Any bookings that have not started yet are shown here. The topmost booking is the next job to run.",
  unassigned: "Bookings that do not have a provider assigned yet.",
  draft: "Draft and quote bookings that have not been confirmed.",
  cancelled: "Cancelled bookings are shown here.",
  history: "Past and completed bookings.",
};
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  RotateCw,
  Send,
  UserPlus,
  Calendar,
  Users,
  FileText,
  Archive,
  History,
  User as UserIcon,
  Pencil,
  Receipt,
  CreditCard,
  ListChecks,
  Image
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

import { supabase } from "@/lib/supabaseClient";
import { useBusiness } from "@/contexts/BusinessContext";
import { SendScheduleDialog } from "@/components/admin/SendScheduleDialog";
import { getOccurrenceDatesForSeriesSync } from "@/lib/recurringBookings";

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
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400",
    quote: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  };

  const icons = {
    confirmed: CheckCircle2,
    in_progress: Clock,
    pending: Clock,
    completed: CheckCircle2,
    cancelled: XCircle,
    draft: FileText,
    quote: FileText,
  };

  const Icon = icons[status as keyof typeof icons] || AlertCircle;

  const label = status === "in_progress" ? "In progress" : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

const getStatusTone = (status: string) => {
  switch (status) {
    case "in_progress":
      return {
        light: "bg-amber-50",
        dark: "dark:bg-amber-950/70",
        chip: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      };
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
  const [sendInvitationLoading, setSendInvitationLoading] = useState(false);
  const [frequencyFilter, setFrequencyFilter] = useState("all");

  // Sync activeTab with URL
  useEffect(() => {
    const tab = searchParams.get("tab") || "all";
    if (["all", "today", "upcoming", "unassigned", "draft", "cancelled", "history"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Open booking summary when ?id=xxx in URL (e.g. from booking-charges)
  useEffect(() => {
    const id = searchParams.get("id") || searchParams.get("booking");
    if (id && bookings.length > 0) {
      const b = bookings.find((x) => String(x.id) === String(id));
      if (b) {
        setSelectedBooking(b);
        setShowDetails(true);
      }
    }
  }, [searchParams, bookings]);
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
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchBookings() {
      if (!currentBusiness?.id) {
        console.log('Waiting for business context...');
        return;
      }
      
      setLoading(true);
      // Extend recurring series (create next occurrences as needed).
      // If you delete all bookings in DB but recurring_series rows still exist, this will re-create bookings on load. See docs/BOOKINGS_DELETED_COME_BACK.md.
      try {
        await fetch(`/api/admin/recurring/extend?businessId=${currentBusiness.id}`, {
          headers: { 'x-business-id': currentBusiness.id },
        });
      } catch (e) {
        console.warn('Recurring extend failed:', e);
      }
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

      let list: any[] = bookingsData || [];
      const recurringIds = [...new Set(list.filter((b: any) => b.recurring_series_id).map((b: any) => b.recurring_series_id))];
      if (recurringIds.length > 0) {
        const { data: seriesList } = await supabase
          .from('recurring_series')
          .select('id, start_date, end_date, frequency, frequency_repeats, occurrences_ahead, scheduled_time')
          .in('id', recurringIds);
        const seriesById = (seriesList || []).reduce((acc: Record<string, any>, s: any) => { acc[s.id] = s; return acc; }, {});
        const expanded: any[] = [];
        for (const booking of list) {
          if (booking.recurring_series_id && seriesById[booking.recurring_series_id]) {
            const series = seriesById[booking.recurring_series_id];
            const dates = getOccurrenceDatesForSeriesSync(series);
            const time = series.scheduled_time || booking.scheduled_time || booking.time;
            for (const d of dates) {
              expanded.push({ ...booking, date: d, scheduled_date: d, time, scheduled_time: time });
            }
          } else {
            expanded.push(booking);
          }
        }
        list = expanded.sort((a: any, b: any) => (b.date || b.scheduled_date || '').localeCompare(a.date || a.scheduled_date || ''));
      }
      
      // Fetch providers to get names for bookings with provider_id
      const providerIds = [...new Set(list
        .filter((b: any) => b.provider_id)
        .map((b: any) => b.provider_id)
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
      const bookingsWithProvider = list.map((booking: any) => {
        let providerName = booking.assignedProvider || null;
        
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
  }, [currentBusiness?.id, refreshKey]); // Refetch when refreshKey changes

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
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        (booking.id && String(booking.id).toLowerCase().includes(search)) ||
        (booking.customer_name && booking.customer_name.toLowerCase().includes(search)) ||
        (booking.customer_email && booking.customer_email.toLowerCase().includes(search)) ||
        (booking.customer_phone && booking.customer_phone.replace(/\D/g, "").includes(search.replace(/\D/g, ""))) ||
        (booking.service && booking.service.toLowerCase().includes(search)) ||
        (booking.address && booking.address.toLowerCase().includes(search));

      const matchesStatus = statusFilter === "all" || booking.status === statusFilter;

      const freq = (booking as any).frequency?.toLowerCase?.() || "";
      const matchesFrequency =
        frequencyFilter === "all" ||
        (frequencyFilter === "one-time" && (!freq || freq === "one-time" || freq === "onetime")) ||
        freq.includes(frequencyFilter);

      return matchesSearch && matchesStatus && matchesFrequency;
    });
  }, [bookings, activeTab, searchTerm, statusFilter, frequencyFilter]);

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

    try {
      await fetch('/api/admin/bookings/notify-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: selectedBooking.id }),
      });
    } catch {
      // Non-blocking: email is best-effort
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
    <div className="flex justify-between items-start gap-4 py-1.5 min-w-0">
      <span className="text-muted-foreground text-sm shrink-0">{label}</span>
      <span className={cn("text-sm font-medium text-right break-words break-all min-w-0 flex-1", className)}>{value}</span>
    </div>
  );

  const DetailSection = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h4>
      {children}
    </div>
  );

  const tabLabels: Record<string, string> = {
    all: "All bookings",
    today: "Today's bookings",
    upcoming: "Upcoming bookings",
    unassigned: "Unassigned",
    draft: "Draft/Quote",
    cancelled: "Cancelled",
    history: "History",
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Description */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {tabLabels[activeTab] || "Bookings"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {TAB_DESCRIPTIONS[activeTab] || TAB_DESCRIPTIONS.all}
        </p>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 flex gap-3 flex-wrap">
          {(["all", "upcoming", "today"].includes(activeTab)) && (
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
              <SelectTrigger className="w-36 bg-background text-foreground">
                <SelectValue placeholder="Frequency" className="text-foreground" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="all" className="text-foreground hover:bg-accent">All</SelectItem>
                <SelectItem value="one-time" className="text-foreground hover:bg-accent">One-time</SelectItem>
                <SelectItem value="weekly" className="text-foreground hover:bg-accent">Weekly</SelectItem>
                <SelectItem value="biweekly" className="text-foreground hover:bg-accent">Biweekly</SelectItem>
                <SelectItem value="monthly" className="text-foreground hover:bg-accent">Monthly</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, id or address"
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
              <SelectItem value="in_progress" className="text-foreground hover:bg-accent">In progress</SelectItem>
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
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          const params = new URLSearchParams(searchParams.toString());
          if (v === "all") params.delete("tab");
          else params.set("tab", v);
          router.replace(`/admin/bookings${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
        }}
        className="space-y-4"
      >
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
                {filteredBookings.map((booking, idx) => {
                  const tone = getStatusTone(booking.status);
                  return (
                    <tr
                      key={`${booking.id}-${booking.date ?? ''}-${booking.time ?? ''}-${idx}`}
                      className={cn(
                        "border-b border-border transition-colors",
                        tone.dark,
                        "text-white",
                        booking.status === "completed"
                          ? "hover:bg-green-900/80"
                          : booking.status === "cancelled"
                          ? "hover:bg-red-900/80"
                          : booking.status === "in_progress"
                          ? "hover:bg-amber-900/80"
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{monthNames[month]} {year}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  className="shrink-0"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRefreshKey((k) => k + 1)}
                  title="Refresh"
                >
                  <RotateCw className="h-4 w-4" />
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
                          {dayBookings.slice(0, 2).map((booking, idx) => {
                            const tone = getStatusTone(booking.status);
                            const nameParts = (booking.customer_name || "Booking").trim().split(/\s+/);
                            const shortName = nameParts.length >= 2
                              ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}`
                              : nameParts[0] || "Booking";
                            return (
                              <div
                                key={`${booking.id}-${booking.date ?? ''}-${booking.time ?? ''}-${idx}`}
                                onClick={() => handleViewDetails(booking)}
                                className="text-[10px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity text-white truncate"
                                style={{ background: tone.chip }}
                                title={`${booking.customer_name || "Booking"} - ${booking.service}`}
                              >
                                {shortName}
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

      {/* Booking Summary - right side panel */}
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-screen max-h-screen overflow-hidden [&>button]:text-red-500 [&>button]:hover:text-red-600">
          <SheetHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-transparent flex flex-row items-center justify-between gap-4">
            <SheetTitle className="text-lg font-bold">Booking summary</SheetTitle>
            {selectedBooking && getStatusBadge(selectedBooking.status)}
          </SheetHeader>

          {selectedBooking && (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 flex flex-col gap-4 overscroll-contain">
              {/* Customer info */}
              <div className="flex gap-4 pt-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                  <UserIcon className="h-7 w-7 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-semibold text-base">{selectedBooking.customer_name || "Customer"}</p>
                  {selectedBooking.customer_email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{selectedBooking.customer_email}</span>
                    </div>
                  )}
                  {selectedBooking.customer_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{selectedBooking.customer_phone}</span>
                    </div>
                  )}
                  {selectedBooking.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="break-words">{((selectedBooking as any).apt_no ? `Apt - ${(selectedBooking as any).apt_no}, ` : "")}{selectedBooking.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking details - light grey card */}
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
                      {(selectedBooking as any).zip_code && <DetailRow label="Zip/Postal code" value={(selectedBooking as any).zip_code} />}
                      {industries[0]?.name && <DetailRow label="Industry" value={industries[0].name} />}
                      {selectedBooking.service && <DetailRow label="Service" value={selectedBooking.service} />}
                      {(selectedBooking as any).frequency && (
                        <div className="flex justify-between items-start gap-4 py-1.5 min-w-0">
                          <span className="text-muted-foreground text-sm shrink-0">Frequency</span>
                          <span className="text-sm font-medium text-right flex items-center gap-1.5 break-words break-all min-w-0 flex-1">
                            {(selectedBooking as any).frequency}
                            {(selectedBooking as any).is_first_active_booking && (
                              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 shrink-0">First active booking</span>
                            )}
                          </span>
                        </div>
                      )}
                      {(() => {
                        const c = selectedBooking.customization as Record<string, unknown> | undefined;
                        const cv = (c?.categoryValues || {}) as Record<string, string>;
                        const bath = cv?.Bathroom ?? cv?.bathroom ?? (c as any)?.bathroom ?? (c as any)?.bathrooms;
                        const sqft = cv?.["Sq Ft"] ?? cv?.sqFt ?? (c as any)?.squareMeters ?? (c as any)?.sqFt ?? (c as any)?.sqft;
                        const bed = cv?.Bedroom ?? cv?.bedroom ?? (c as any)?.bedroom ?? (c as any)?.bedrooms;
                        return (
                          <>
                            {bath != null && String(bath).trim() && <DetailRow label="Bathrooms" value={String(bath).trim()} />}
                            {sqft != null && String(sqft).trim() && <DetailRow label="Sq Ft" value={String(sqft).trim()} />}
                            {bed != null && String(bed).trim() && <DetailRow label="Bedrooms" value={String(bed).trim()} />}
                          </>
                        );
                      })()}
                      {(() => {
                        const c = (selectedBooking as any).customization as Record<string, unknown> | undefined;
                        const ids = (c?.selectedExtras as string[]) || [];
                        const names = ids.map((id: string) => extrasMap[id] || id).filter(Boolean);
                        return names.length > 0 ? <DetailRow label="Extras" value={names.join(", ")} /> : null;
                      })()}
                      {selectedBooking.provider_id && <DetailRow label="Professionals" value="1" />}
                      {(selectedBooking as any).duration_minutes != null && (selectedBooking as any).duration_minutes > 0 && (
                        <DetailRow
                          label="Length"
                          value={(selectedBooking as any).duration_minutes >= 60
                            ? `${Math.floor((selectedBooking as any).duration_minutes / 60)} Hr ${(selectedBooking as any).duration_minutes % 60 || 0} Min`
                            : `${(selectedBooking as any).duration_minutes} Min`}
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
                      <DetailRow label="Assigned to" value={selectedBooking.assignedProvider || (selectedBooking as any).provider_name || "Unassigned"} />
                      {(selectedBooking as any).provider_wage != null && (selectedBooking as any).provider_wage > 0 && (
                        <div className="flex justify-between items-center gap-4 py-1.5 min-w-0">
                          <span className="text-muted-foreground text-sm shrink-0">Provider payment</span>
                          <span className="text-sm font-medium text-right break-words min-w-0 flex-1">
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
                      {(selectedBooking.status === "cancelled" || (selectedBooking as any).status === "cancelled") && (selectedBooking as any).cancellation_fee_amount != null && Number((selectedBooking as any).cancellation_fee_amount) > 0 && (
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
                          {(selectedBooking as any).payment_method === "online" || (selectedBooking as any).payment_method === "card" ? "CC" : (selectedBooking as any).payment_method === "cash" ? "Cash/Check" : (selectedBooking as any).payment_method}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-4 py-1.5">
                        <span className="text-muted-foreground text-sm shrink-0">Price details</span>
                        <span className="text-sm font-medium text-right">
                          {(() => {
                            const amount = (selectedBooking as any).total_price ?? selectedBooking.amount;
                            const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
                            return isNaN(numAmount) ? "$0.00" : `$${numAmount.toFixed(2)}`;
                          })()}
                          <Link href="/admin/settings" className="text-orange-600 hover:underline ml-1.5 text-xs">Learn more</Link>
                        </span>
                      </div>
                      <div className="pt-1.5 mt-1.5 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">Cancellation policy and fee are set in Settings → General → Cancellation.</p>
                      </div>
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

                    {/* Private booking note(s) */}
                    {(selectedBooking as any).private_booking_notes && Array.isArray((selectedBooking as any).private_booking_notes) && (selectedBooking as any).private_booking_notes.length > 0 && (
                      <div className="mt-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Private booking note(s)</h4>
                        <div className="space-y-2">
                          {((selectedBooking as any).private_booking_notes as string[]).map((note: string, i: number) => (
                            <p key={i} className="text-sm text-gray-800 dark:text-gray-200 break-words">{note}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Private customer note(s) */}
                    {(selectedBooking as any).private_customer_notes && Array.isArray((selectedBooking as any).private_customer_notes) && (selectedBooking as any).private_customer_notes.length > 0 && (
                      <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200 mb-1.5">Private customer note(s)</h4>
                        <div className="space-y-2">
                          {((selectedBooking as any).private_customer_notes as string[]).map((note: string, i: number) => (
                            <p key={i} className="text-sm text-gray-800 dark:text-gray-200 break-words">{note}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Note(s) - separate light grey card */}
              <div className="rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shrink-0">
                <Collapsible defaultOpen={!!selectedBooking.notes} className="group">
                  <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors">
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

              {/* Action buttons - 9 full-width colored buttons */}
              <div className="space-y-2 mt-auto pt-2">
                {!selectedBooking.provider_id && !selectedBooking.assignedProvider && (
                  <>
                    <Button className="w-full text-white" style={{ backgroundColor: "#00BCD4" }} onClick={() => { setSelectedProvider(null); setShowProviderDialog(true); }}>
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
                <Button className="w-full text-white bg-blue-600 hover:bg-blue-700" onClick={() => router.push(`/admin/add-booking?bookingId=${selectedBooking.id}`)}>
                  <Pencil className="h-4 w-4 mr-2" />Edit
                </Button>
                <Button className="w-full text-white bg-red-600 hover:bg-red-700" onClick={() => handleStatusChange(selectedBooking.id, "cancelled")} disabled={selectedBooking.status === "cancelled"}>
                  <XCircle className="h-4 w-4 mr-2" />Cancel
                </Button>
                <Button className="w-full text-white bg-emerald-500 hover:bg-emerald-600" onClick={() => router.push(`/admin/leads?addBooking=${selectedBooking.id}`)}>
                  Add to leads funnel
                </Button>
                <Button className="w-full text-white bg-pink-500 hover:bg-pink-600" onClick={() => { toast({ title: "Add card link", description: "Send Add card link feature." }); }}>
                  <CreditCard className="h-4 w-4 mr-2" />Send &quot;Add card&quot; link
                </Button>
                <Button className="w-full text-white bg-sky-400 hover:bg-sky-500" onClick={() => { toast({ title: "Receipt", description: "Receipt will be resent to the customer." }); }}>
                  <Receipt className="h-4 w-4 mr-2" />Resend Receipt
                </Button>
                <Button className="w-full text-white bg-amber-400 hover:bg-amber-500" onClick={() => router.push(`/admin/logs?booking=${selectedBooking.id}`)}>
                  <FileText className="h-4 w-4 mr-2" />View Booking Log
                </Button>
                <Button className="w-full text-white bg-rose-400 hover:bg-rose-500" onClick={() => router.push(`/admin/booking-charges?precharge=${selectedBooking.id}`)}>
                  Pre-charge
                </Button>
                <Button className="w-full text-white bg-orange-500 hover:bg-orange-600" onClick={() => { toast({ title: "Checklist", description: "View checklist for this booking." }); }}>
                  <ListChecks className="h-4 w-4 mr-2" />View Checklist
                </Button>
                <Button className="w-full text-white bg-amber-300 hover:bg-amber-400 text-gray-900" onClick={() => { toast({ title: "Job Media", description: "View job media and photos." }); }}>
                  <Image className="h-4 w-4 mr-2" />Job Media
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
