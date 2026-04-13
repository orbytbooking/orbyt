"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { formatProviderWageDisplay } from "@/lib/formatProviderWage";
import { getBookingSummaryVariableRows } from "@/lib/bookingSummaryVariableRows";
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
  ChevronDown,
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
  Image,
  PlusCircle,
  Link2,
  Trash2,
  Info,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { supabase } from "@/lib/supabaseClient";
import { useBusiness } from "@/contexts/BusinessContext";
import { SendScheduleDialog } from "@/components/admin/SendScheduleDialog";
import { SendQuoteEmailFlow } from "@/components/admin/SendQuoteEmailFlow";
import { DraftQuoteLogsDialog } from "@/components/admin/DraftQuoteLogsDialog";
import { AdminBookingsCalendar, type CalendarBooking } from "@/components/admin/AdminBookingsCalendar";
import { EditBookingSheet } from "@/components/admin/EditBookingSheet";
import { getOccurrenceDatesForSeriesSync, statusForRecurringOccurrence } from "@/lib/recurringBookings";
import { compareBookingsByScheduleDesc } from "@/lib/bookingScheduleSort";
import {
  applyInProgressFromOpenTimeLogs,
  collectActiveTimeLogKeys,
} from "@/lib/bookingTimeLogActiveProgress";
import {
  DEFAULT_ADMIN_CALENDAR_PREFS,
  parseAdminCalendarPrefs,
  type AdminCalendarPrefsState,
} from "@/lib/adminCalendarPrefs";
import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";

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
  draft_quote_expires_on?: string | null;
  /** Expanded recurring row: visit date (aligns with provider time logs). */
  occurrence_date?: string;
  is_recurring?: boolean;
}

function getResolvedBookingZipForSummary(booking: Booking): string {
  const b = booking as any;
  const cust = b?.customization;
  const fromCust =
    cust && typeof cust === "object"
      ? String(
          cust.zip_code ??
            cust.zipCode ??
            cust.postal_code ??
            cust.postalCode ??
            cust.zip ??
            "",
        ).trim()
      : "";
  const z = String(b?.zip_code ?? b?.postal_code ?? b?.postalCode ?? "").trim();
  return z || fromCust;
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
    expired: "bg-slate-200 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300",
  };

  const icons = {
    confirmed: CheckCircle2,
    in_progress: Clock,
    pending: Clock,
    completed: CheckCircle2,
    cancelled: XCircle,
    draft: FileText,
    quote: FileText,
    expired: FileText,
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
    case "expired":
      return {
        light: "bg-slate-100",
        dark: "dark:bg-slate-900/60",
        chip: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
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
  const [adminCalendarPrefs, setAdminCalendarPrefs] = useState<AdminCalendarPrefsState>(DEFAULT_ADMIN_CALENDAR_PREFS);
  const [showSendScheduleDialog, setShowSendScheduleDialog] = useState(false);
  const [sendInvitationLoading, setSendInvitationLoading] = useState(false);
  const [sendAddCardLoading, setSendAddCardLoading] = useState(false);
  const [resendReceiptLoading, setResendReceiptLoading] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [draftQuoteDeleteTarget, setDraftQuoteDeleteTarget] = useState<Booking | null>(null);
  const [draftQuoteDeleting, setDraftQuoteDeleting] = useState(false);
  const [sendQuoteFlowOpen, setSendQuoteFlowOpen] = useState(false);
  const [sendQuoteFlowBooking, setSendQuoteFlowBooking] = useState<Booking | null>(null);
  const [draftQuoteLogsOpen, setDraftQuoteLogsOpen] = useState(false);
  const [draftQuoteLogsBookingId, setDraftQuoteLogsBookingId] = useState<string | null>(null);
  const [changeExpiryOpen, setChangeExpiryOpen] = useState(false);
  const [changeExpiryBooking, setChangeExpiryBooking] = useState<Booking | null>(null);
  const [changeExpiryDate, setChangeExpiryDate] = useState("");
  const [changeExpirySaving, setChangeExpirySaving] = useState(false);
  const [sheetEditBookingId, setSheetEditBookingId] = useState<string | null>(null);
  const [confirmMarkCompleteOpen, setConfirmMarkCompleteOpen] = useState(false);

  // Sync activeTab with URL
  useEffect(() => {
    const tab = searchParams.get("tab") || "all";
    if (["all", "today", "upcoming", "unassigned", "draft", "cancelled", "history"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Refetch bookings when returning from edit (so service date and other changes are visible)
  const hasHandledRefresh = useRef(false);
  useEffect(() => {
    const isRefresh = searchParams.get("refresh") === "1";
    if (!isRefresh) {
      hasHandledRefresh.current = false;
      return;
    }
    if (hasHandledRefresh.current) return;
    hasHandledRefresh.current = true;
    setRefreshKey((k) => k + 1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("refresh");
    const query = params.toString();
    router.replace(`/admin/bookings${query ? `?${query}` : ""}`, { scroll: false });
  }, [searchParams, router]);

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

  useEffect(() => {
    if (!currentBusiness?.id) return;
    let cancelled = false;
    fetch(`/api/admin/store-options?businessId=${encodeURIComponent(currentBusiness.id)}`, {
      headers: { "x-business-id": currentBusiness.id },
    })
      .then((r) => r.json())
      .then((data) => {
        const o = data?.options;
        if (!o || cancelled) return;
        setAdminCalendarPrefs(parseAdminCalendarPrefs(o));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentBusiness?.id]);

  // Auto-set view mode based on active tab (calendar vs list follows store default on All / Upcoming)
  useEffect(() => {
    const tabsNeedingListView = ["today", "unassigned", "draft", "cancelled", "history"];
    if (tabsNeedingListView.includes(activeTab)) {
      setViewMode("list");
    } else {
      setViewMode(adminCalendarPrefs.admin_bookings_default_view === "listing" ? "list" : "calendar");
    }
  }, [activeTab, adminCalendarPrefs.admin_bookings_default_view]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const lastHiddenAtRef = useRef<number | null>(null);

  // Refetch only after the tab was hidden for a while (avoids reload on every focus click)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        lastHiddenAtRef.current = Date.now();
      } else if (document.visibilityState === "visible" && lastHiddenAtRef.current != null) {
        const hiddenMs = Date.now() - lastHiddenAtRef.current;
        if (hiddenMs > 60_000) {
          setRefreshKey((k) => k + 1);
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Light background sync (was 30s — too heavy for large booking lists)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        setRefreshKey((k) => k + 1);
      }
    }, 120_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchBookings() {
      if (!currentBusiness?.id) {
        console.log('Waiting for business context...');
        return;
      }
      
      setLoading(true);
      // Expire drafts + extend recurring series in the background — do not block the bookings query
      // (awaiting these made the page feel very slow on businesses with many series).
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token && currentBusiness?.id) {
          void fetch("/api/admin/bookings/expire-draft-quotes", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "x-business-id": currentBusiness.id,
            },
          }).catch(() => {});
        }
      } catch {
        /* ignore */
      }
      if (currentBusiness?.id) {
        void fetch(`/api/admin/recurring/extend?businessId=${currentBusiness.id}`, {
          headers: { "x-business-id": currentBusiness.id },
        }).catch(() => {});
      }
      if (cancelled) return;
      // Fetch bookings immediately
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('business_id', currentBusiness?.id)
        .order('scheduled_date', { ascending: false, nullsFirst: false })
        .order('date', { ascending: false });
      
      if (cancelled) return;
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
          .select('id, start_date, end_date, frequency, frequency_repeats, occurrences_ahead, scheduled_time, duration_minutes')
          .in('id', recurringIds);
        const seriesById = (seriesList || []).reduce((acc: Record<string, any>, s: any) => { acc[s.id] = s; return acc; }, {});
        const expanded: any[] = [];
        for (const booking of list) {
          if (booking.recurring_series_id && seriesById[booking.recurring_series_id]) {
            const series = seriesById[booking.recurring_series_id];
            const dates = getOccurrenceDatesForSeriesSync(series);
            const time = series.scheduled_time || booking.scheduled_time || booking.time;
            const completedDates: string[] = Array.isArray(booking.completed_occurrence_dates)
              ? booking.completed_occurrence_dates
              : [];
            const durationFromSeries =
              booking.duration_minutes != null ? Number(booking.duration_minutes) : null;
            const mergedDuration =
              durationFromSeries != null && Number.isFinite(durationFromSeries) && durationFromSeries > 0
                ? durationFromSeries
                : series.duration_minutes != null && Number.isFinite(Number(series.duration_minutes)) && Number(series.duration_minutes) > 0
                  ? Number(series.duration_minutes)
                  : null;
            if (!dates.length) {
              expanded.push({
                ...booking,
                is_recurring: true,
                ...(mergedDuration != null ? { duration_minutes: mergedDuration } : {}),
              });
              continue;
            }
            for (const d of dates) {
              const occurrenceStatus = statusForRecurringOccurrence(d, booking);
              expanded.push({
                ...booking,
                booking_row_status: booking.status,
                date: d,
                scheduled_date: d,
                occurrence_date: d,
                time,
                scheduled_time: time,
                status: occurrenceStatus,
                is_recurring: true,
                ...(mergedDuration != null ? { duration_minutes: mergedDuration } : {}),
              });
            }
          } else {
            expanded.push({
              ...booking,
              is_recurring: !!booking.recurring_series_id,
            });
          }
        }
        list = expanded.sort((a: any, b: any) =>
          compareBookingsByScheduleDesc(
            { date: a.date || a.scheduled_date, time: a.time || a.scheduled_time },
            { date: b.date || b.scheduled_date, time: b.time || b.scheduled_time },
          ),
        );
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
          .select('id, first_name, last_name')
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
      if (cancelled) return;
      
      // Map bookings to include provider name
      const bookingsWithProvider = list.map((booking: any) => {
        let providerName = booking.assignedProvider || null;
        
        if (booking.provider_id && providersMap[booking.provider_id]) {
          providerName = providersMap[booking.provider_id].displayName;
        }
        
        const normalizedDate = String(booking.date ?? booking.scheduled_date ?? "").trim();
        const normalizedTime = String(booking.time ?? booking.scheduled_time ?? "").trim();

        return {
          ...booking,
          date: normalizedDate,
          time: normalizedTime,
          scheduled_date: booking.scheduled_date ?? (normalizedDate || null),
          scheduled_time: booking.scheduled_time ?? (normalizedTime || null),
          assignedProvider: providerName,
          provider_id: booking.provider_id || null,
        };
      });

      const { data: openTimeLogs } = await supabase
        .from("booking_time_logs")
        .select(
          "booking_id, occurrence_date, on_the_way_at, at_location_at, clocked_in_at, provider_status",
        )
        .eq("business_id", currentBusiness.id)
        .is("clocked_out_at", null);
      const activeKeys = collectActiveTimeLogKeys(openTimeLogs ?? []);
      const withLiveProgress = applyInProgressFromOpenTimeLogs(bookingsWithProvider, activeKeys);

      if (!cancelled) {
        setBookings(withLiveProgress);
      }
      if (!cancelled) setLoading(false);
    }
    fetchBookings();
    return () => { cancelled = true; };
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
    return bookings.filter((booking) => ["draft", "quote", "expired"].includes(booking.status));
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

  const changeExpiryCreatedOnDisplay = useMemo(() => {
    const raw = changeExpiryBooking?.created_at;
    if (!raw) return "—";
    try {
      const d = parseISO(String(raw));
      if (Number.isNaN(d.getTime())) return "—";
      return format(d, "EEEE MMMM do, yyyy hh:mm a");
    } catch {
      return "—";
    }
  }, [changeExpiryBooking?.created_at]);

  const changeExpiryDaysHelper = useMemo(() => {
    if (!changeExpiryDate) return null;
    const d = parseISO(changeExpiryDate.slice(0, 10) + "T12:00:00");
    if (Number.isNaN(d.getTime())) return null;
    const days = Math.max(0, differenceInCalendarDays(startOfDay(d), startOfDay(new Date())));
    return `at 11:59 PM (${days} day(s))`;
  }, [changeExpiryDate]);

  const handleViewDetails = (booking: CalendarBooking | Booking) => {
    const clickedDate = String((booking as CalendarBooking).date ?? "").trim();
    const byOccurrence =
      clickedDate &&
      filteredBookings.find(
        (b) => b.id === booking.id && String(b.date ?? "").trim() === clickedDate,
      );
    const resolved =
      byOccurrence ??
      filteredBookings.find((b) => b.id === booking.id) ??
      (booking as Booking);
    setSelectedBooking(resolved);
    setShowDetails(true);
  };

  const formatDraftQuoteTableDate = (booking: Booking) => {
    const raw = String((booking as any).scheduled_date ?? booking.date ?? "").trim();
    if (raw.length < 8) return "—";
    const d = new Date(raw.slice(0, 10) + "T12:00:00");
    if (Number.isNaN(d.getTime())) return "—";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const draftQuoteLocationLine = (booking: Booking) => {
    const apt = (booking as any).apt_no ? `Apt ${String((booking as any).apt_no).trim()}` : "";
    const addr = (booking.address || "").trim();
    return [apt, addr].filter(Boolean).join(addr ? ", " : "") || "—";
  };

  const draftQuoteExpiresCell = (booking: Booking) => {
    const raw = booking.draft_quote_expires_on;
    if (!raw) {
      return <span className="text-muted-foreground">—</span>;
    }
    const dStr = String(raw).slice(0, 10);
    const d = parseISO(`${dStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      return <span className="text-muted-foreground">—</span>;
    }
    const line1 = format(d, "MM/dd/yyyy");
    const today = startOfDay(new Date());
    const end = startOfDay(d);
    const days = differenceInCalendarDays(end, today);
    const line2 =
      booking.status === "expired"
        ? "Expired"
        : days >= 0
          ? `at 11:59 PM (${days} day(s))`
          : "Past deadline";
    return (
      <div className="min-w-[140px]">
        <div className="text-foreground">{line1}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{line2}</div>
      </div>
    );
  };

  const draftQuoteTypeLabel = (booking: Booking) => {
    if (booking.status === "expired") return "Expired";
    return booking.status === "quote" ? "Quote" : "Draft";
  };

  const draftQuoteStatusLabel = (booking: Booking) => {
    if (booking.status === "expired") return "Expired";
    return "Saved";
  };

  const draftQuotePriceLine = (booking: Booking) => {
    const raw = (booking as any).total_price ?? booking.amount;
    const n = typeof raw === "string" ? parseFloat(raw) : Number(raw);
    if (!Number.isFinite(n)) return "";
    return `$${n.toFixed(2)}`;
  };

  const openSendQuoteFlow = (booking: Booking) => {
    setSendQuoteFlowBooking(booking);
    setSendQuoteFlowOpen(true);
  };

  const openDraftQuoteLogs = (booking: Booking) => {
    setDraftQuoteLogsBookingId(booking.id);
    setDraftQuoteLogsOpen(true);
  };

  const handleSaveChangeExpiry = async () => {
    if (!changeExpiryBooking?.id || !currentBusiness?.id) return;
    setChangeExpirySaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({ title: "Sign in required", variant: "destructive" });
        return;
      }
      const res = await fetch(
        `/api/admin/bookings/${encodeURIComponent(changeExpiryBooking.id)}/draft-quote-expiry`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-business-id": currentBusiness.id,
          },
          body: JSON.stringify({
            draft_quote_expires_on: changeExpiryDate.trim() ? changeExpiryDate.trim().slice(0, 10) : null,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Could not update expiry",
          description: typeof data.error === "string" ? data.error : "Request failed",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: data.unchanged ? "No change" : "Expiry updated",
        description: data.unchanged ? "The date was already set to this value." : "The new date is saved and recorded in history.",
      });
      setChangeExpiryOpen(false);
      setChangeExpiryBooking(null);
      const nextExp = changeExpiryDate.trim() ? changeExpiryDate.trim().slice(0, 10) : null;
      setSendQuoteFlowBooking((prev) =>
        prev && prev.id === changeExpiryBooking.id ? { ...prev, draft_quote_expires_on: nextExp } : prev
      );
      setRefreshKey((k) => k + 1);
    } finally {
      setChangeExpirySaving(false);
    }
  };

  const copyDraftQuoteShareLink = async (booking: Booking) => {
    if (!currentBusiness?.id) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/book-now?business=${encodeURIComponent(currentBusiness.id)}&bookingId=${encodeURIComponent(booking.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Paste this link to your customer. They may need to sign in for book-now to load this booking.",
      });
    } catch {
      toast({
        title: "Could not copy",
        description: url,
        variant: "destructive",
      });
    }
  };

  const handleConfirmDeleteDraftQuote = async () => {
    if (!draftQuoteDeleteTarget?.id || !currentBusiness?.id) return;
    setDraftQuoteDeleting(true);
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", draftQuoteDeleteTarget.id)
      .eq("business_id", currentBusiness.id);
    setDraftQuoteDeleting(false);
    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setBookings((prev) => prev.filter((b) => b.id !== draftQuoteDeleteTarget.id));
    if (selectedBooking?.id === draftQuoteDeleteTarget.id) {
      setShowDetails(false);
      setSelectedBooking(null);
    }
    setDraftQuoteDeleteTarget(null);
    toast({ title: "Deleted", description: "Draft or quote was removed." });
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

  const notifyCustomerBookingConfirmed = (bookingId: string) => {
    if (!currentBusiness?.id) return;
    void fetch('/api/admin/bookings/notify-customer-confirmed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-business-id': currentBusiness.id,
      },
      credentials: 'include',
      body: JSON.stringify({ bookingId }),
    }).catch(() => {});
  };

  const handleStatusChange = async (
    bookingId: string,
    newStatus: string,
    options?: { occurrenceDate?: string; recurring_series_id?: string }
  ) => {
    const isRecurringCompletion =
      newStatus === 'completed' &&
      options?.occurrenceDate &&
      options?.recurring_series_id;

    if (isRecurringCompletion) {
      const { data: row, error: fetchErr } = await supabase
        .from('bookings')
        .select('completed_occurrence_dates')
        .eq('id', bookingId)
        .single();
      if (fetchErr || !row) {
        toast({ title: "Error", description: "Booking not found.", variant: "destructive" });
        return;
      }
      const dateStr = String(options.occurrenceDate).slice(0, 10);
      const completedList: string[] = Array.isArray(row.completed_occurrence_dates)
        ? row.completed_occurrence_dates
        : [];
      if (completedList.includes(dateStr)) {
        toast({ title: "Already completed", description: "This occurrence is already marked completed." });
        return;
      }
      const { error } = await supabase
        .from('bookings')
        .update({
          completed_occurrence_dates: [...completedList, dateStr],
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);
      if (error) {
        toast({
          title: "Error",
          description: `Failed to update: ${error.message}`,
          variant: "destructive",
        });
        return;
      }
      const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
      await createBookingNotification('Booking modified', `Recurring booking ${bkRef} occurrence ${dateStr} marked completed.`);
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId) return b;
          const completedDates = [...completedList, dateStr];
          const rowStatus = (b as { booking_row_status?: string }).booking_row_status ?? (b as any).status;
          const occurrenceStatus = statusForRecurringOccurrence(String(b.date).slice(0, 10), {
            status: rowStatus,
            completed_occurrence_dates: completedDates,
            customer_cancelled_occurrence_dates: (b as { customer_cancelled_occurrence_dates?: string[] })
              .customer_cancelled_occurrence_dates,
            recurring_series_id: (b as { recurring_series_id?: string }).recurring_series_id,
          });
          return {
            ...b,
            completed_occurrence_dates: completedDates,
            status: occurrenceStatus,
          };
        })
      );
      setSelectedBooking((prev) =>
        prev?.id === bookingId && prev?.date === dateStr
          ? { ...prev, status: 'completed', completed_occurrence_dates: [...completedList, dateStr] }
          : prev
      );
      toast({ title: "Status Updated", description: `Occurrence ${dateStr} marked completed.` });
      setShowDetails(false);
      return;
    }

    const priorRow = bookings.find((b) => b.id === bookingId);
    const priorStatus = String(priorRow?.status ?? "");

    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
    if (error) {
      toast({
        title: "Error",
        description: `Failed to update booking status: ${error.message}`,
        variant: "destructive",
      });
      return;
    }
    if (newStatus === "confirmed" && priorStatus !== "confirmed") {
      notifyCustomerBookingConfirmed(bookingId);
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
    const wasAlreadyConfirmed = selectedBooking.status === "confirmed";

    // Update provider_id and (if column exists) provider_name so customer portal shows assigned provider
    const providerName = selectedProvider.name || `${selectedProvider.firstName || ""} ${selectedProvider.lastName || ""}`.trim();
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
        headers: {
          'Content-Type': 'application/json',
          ...(currentBusiness?.id ? { 'x-business-id': currentBusiness.id } : {}),
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          ...(currentBusiness?.id ? { businessId: currentBusiness.id } : {}),
        }),
      });
    } catch {
      // Non-blocking: email is best-effort
    }

    if (!wasAlreadyConfirmed) {
      notifyCustomerBookingConfirmed(selectedBooking.id);
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

  /** Service date line: locale date + time when available; reads time from ISO `date` if time columns are empty. */
  const formatServiceDateTimeForSummary = (rawDate: unknown, rawTime: unknown) => {
    let explicit = rawTime != null ? String(rawTime).trim() : "";
    let dateRaw = rawDate != null ? String(rawDate).trim() : "";

    if (dateRaw.includes("T")) {
      try {
        const parsed = parseISO(dateRaw);
        if (!Number.isNaN(parsed.getTime())) {
          dateRaw = format(parsed, "yyyy-MM-dd");
          if (!explicit) {
            explicit = format(parsed, "HH:mm");
          }
        }
      } catch {
        /* keep dateRaw */
      }
    }

    let datePart = "";
    const ymd = dateRaw.length >= 10 ? dateRaw.slice(0, 10) : dateRaw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      datePart = new Date(`${ymd}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    }

    if (datePart && explicit) return `${datePart}, ${formatTime(explicit)}`;
    if (datePart) return datePart;
    if (explicit) return formatTime(explicit);
    return "—";
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
              <SelectItem value="expired" className="text-foreground hover:bg-accent">Expired</SelectItem>
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

      {/* List View — Draft/Quote tab: dedicated table + Options menu */}
      {viewMode === "list" && activeTab === "draft" && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Draft/Quote ({filteredBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TooltipProvider delayDuration={300}>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-100/90 dark:bg-slate-900/40">
                      <th className="text-left py-3 px-4 font-medium text-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">Customer name</th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">Location</th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">Phone</th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">Expires</th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">
                        <span className="inline-flex items-center gap-1">
                          Status
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="text-amber-600 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 rounded"
                                aria-label="About draft status"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              Drafts and quotes are saved but not confirmed bookings. Use Options to finalize, share, or delete.
                            </TooltipContent>
                          </Tooltip>
                        </span>
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 px-4 text-center text-muted-foreground">
                          No draft or quote bookings yet.
                        </td>
                      </tr>
                    ) : (
                    filteredBookings.map((booking, idx) => (
                      <tr
                        key={`${booking.id}-${booking.date ?? ""}-${idx}`}
                        className="border-b border-border bg-background hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-foreground whitespace-nowrap">
                          {formatDraftQuoteTableDate(booking)}
                        </td>
                        <td className="py-3 px-4 min-w-[160px]">
                          <div className="font-semibold text-foreground">{booking.customer_name || "—"}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{booking.customer_email || "—"}</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate" title={draftQuoteLocationLine(booking)}>
                          {draftQuoteLocationLine(booking)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {(booking.customer_phone || "").trim() || "—"}
                        </td>
                        <td className="py-3 px-4 text-foreground">{draftQuoteTypeLabel(booking)}</td>
                        <td className="py-3 px-4 text-muted-foreground align-top">{draftQuoteExpiresCell(booking)}</td>
                        <td className="py-3 px-4 text-foreground">{draftQuoteStatusLabel(booking)}</td>
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 rounded px-1"
                              >
                                Options
                                <ChevronDown className="h-4 w-4 opacity-80" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 z-50">
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onSelect={() =>
                                  router.push(
                                    `/admin/add-booking?bookingId=${encodeURIComponent(booking.id)}&finalize=1`
                                  )
                                }
                              >
                                <PlusCircle className="h-4 w-4 shrink-0 text-primary" />
                                Create Booking
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setTimeout(() => openSendQuoteFlow(booking), 0);
                                }}
                              >
                                <Send className="h-4 w-4 shrink-0 text-primary" />
                                Send Quote
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onSelect={() => void copyDraftQuoteShareLink(booking)}
                              >
                                <Link2 className="h-4 w-4 shrink-0 text-primary" />
                                Share Quote Link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setTimeout(() => openSendQuoteFlow(booking), 0);
                                }}
                              >
                                <Mail className="h-4 w-4 shrink-0 text-primary" />
                                Send Email
                              </DropdownMenuItem>
                              {booking.draft_quote_expires_on ? (
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setChangeExpiryBooking(booking);
                                    setChangeExpiryDate(String(booking.draft_quote_expires_on).slice(0, 10));
                                    setTimeout(() => setChangeExpiryOpen(true), 0);
                                  }}
                                >
                                  <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
                                  Change expiry date
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onSelect={() => setSheetEditBookingId(String(booking.id))}
                              >
                                <Pencil className="h-4 w-4 shrink-0 text-primary" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setTimeout(() => openDraftQuoteLogs(booking), 0);
                                }}
                              >
                                <Eye className="h-4 w-4 shrink-0 text-primary" />
                                View History
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                                onSelect={() => setDraftQuoteDeleteTarget(booking)}
                              >
                                <Trash2 className="h-4 w-4 shrink-0" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      )}

      {viewMode === "list" && activeTab !== "draft" && (
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

      {/* Calendar View - same component as dashboard */}
      {viewMode === "calendar" && (
        <AdminBookingsCalendar
          bookings={filteredBookings.map((b) => ({ ...b, industry_name: industries[0]?.name }))}
          onBookingClick={handleViewDetails}
          currentDate={currentDate}
          onMonthChange={setCurrentDate}
          onRefresh={() => setRefreshKey((k) => k + 1)}
          showRefresh={true}
          calendarViewMode={adminCalendarPrefs.admin_calendar_view_mode}
          monthDisplay={adminCalendarPrefs.admin_calendar_month_display}
          multiBookingLayout={adminCalendarPrefs.admin_calendar_multi_booking_layout}
          hideNonWorkingHours={adminCalendarPrefs.admin_calendar_hide_non_working_hours}
        />
      )}
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={draftQuoteDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !draftQuoteDeleting) setDraftQuoteDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft or quote?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
              {draftQuoteDeleteTarget
                ? ` ${draftQuoteDeleteTarget.customer_name ? `${draftQuoteDeleteTarget.customer_name} — ` : ""}BK${String(draftQuoteDeleteTarget.id).slice(-6).toUpperCase()} will be removed.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={draftQuoteDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={draftQuoteDeleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteDraftQuote();
              }}
            >
              {draftQuoteDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmMarkCompleteOpen} onOpenChange={setConfirmMarkCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark booking as completed?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBooking &&
              (selectedBooking as { recurring_series_id?: string }).recurring_series_id &&
              selectedBooking.date
                ? "This will mark this date’s visit as completed for the recurring series. You can still view it in booking history."
                : "This will mark the booking as completed. You can still view it in booking history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 text-white hover:bg-green-700 focus:ring-green-600"
              onClick={() => {
                const b = selectedBooking;
                setConfirmMarkCompleteOpen(false);
                if (!b || b.status === "completed") return;
                const rid = (b as { recurring_series_id?: string }).recurring_series_id;
                const occDate = b.date;
                if (rid && occDate) {
                  void handleStatusChange(b.id, "completed", { occurrenceDate: occDate, recurring_series_id: rid });
                } else {
                  void handleStatusChange(b.id, "completed");
                }
              }}
            >
              Mark as completed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={changeExpiryOpen}
        onOpenChange={(open) => {
          setChangeExpiryOpen(open);
          if (!open) setChangeExpiryBooking(null);
        }}
      >
        <DialogContent
          className={cn(
            "sm:max-w-lg p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg",
            "[&>button]:text-slate-500 [&>button]:hover:text-slate-700 dark:[&>button]:text-slate-400"
          )}
        >
          <DialogHeader className="px-6 py-4 text-center border-b border-slate-200/90 bg-slate-50/95 dark:bg-slate-900/70 dark:border-slate-800">
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Change expiration date
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-6 space-y-8 bg-background">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Created on</p>
              <p className="text-sm text-muted-foreground">{changeExpiryCreatedOnDisplay}</p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="change-expiry-date" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Expires on
              </Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="change-expiry-date"
                  type="date"
                  value={changeExpiryDate}
                  onChange={(e) => setChangeExpiryDate(e.target.value)}
                  className="max-w-[240px] border-sky-500/60 focus-visible:ring-sky-500/40 dark:border-sky-500/50"
                />
                {changeExpiryDaysHelper ? (
                  <span className="text-sm text-muted-foreground">{changeExpiryDaysHelper}</span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Clear the date and use Save Changes to remove the expiry. Updates are recorded in View History.
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 flex-row justify-between gap-3 border-t border-slate-200/90 bg-slate-50/95 dark:bg-slate-900/70 dark:border-slate-800 sm:justify-between">
            <Button
              type="button"
              className="bg-sky-600 hover:bg-sky-700 text-white"
              onClick={() => void handleSaveChangeExpiry()}
              disabled={changeExpirySaving}
            >
              {changeExpirySaving ? "Saving…" : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setChangeExpiryOpen(false)}
              disabled={changeExpirySaving}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SendQuoteEmailFlow
        open={sendQuoteFlowOpen}
        onOpenChange={(o) => {
          setSendQuoteFlowOpen(o);
          if (!o) setSendQuoteFlowBooking(null);
        }}
        booking={sendQuoteFlowBooking}
        businessId={currentBusiness?.id ?? ""}
        businessName={currentBusiness?.name ?? ""}
        businessEmail={currentBusiness?.business_email ?? null}
        businessWebsite={currentBusiness?.website ?? null}
        industryName={industries[0]?.name ?? null}
      />

      <DraftQuoteLogsDialog
        open={draftQuoteLogsOpen}
        onOpenChange={(o) => {
          setDraftQuoteLogsOpen(o);
          if (!o) setDraftQuoteLogsBookingId(null);
        }}
        bookingId={draftQuoteLogsBookingId}
        businessId={currentBusiness?.id ?? ""}
      />

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
                  {(() => {
                    const b = selectedBooking as any;
                    const zip = getResolvedBookingZipForSummary(selectedBooking);
                    const line = [
                      b.apt_no ? `Apt - ${b.apt_no}` : null,
                      selectedBooking.address?.trim() ? selectedBooking.address : null,
                      zip || null,
                    ]
                      .filter(Boolean)
                      .join(", ");
                    if (!line) return null;
                    return (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="break-words">{line}</span>
                      </div>
                    );
                  })()}
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
                      <DetailRow
                        label="Zip/Postal code"
                        value={getResolvedBookingZipForSummary(selectedBooking) || "—"}
                      />
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
                      {getBookingSummaryVariableRows(
                        selectedBooking.customization as Record<string, unknown> | null | undefined,
                      ).map(({ label, value }) => (
                        <DetailRow key={`${label}-${value}`} label={label} value={value} />
                      ))}
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
                      {(() => {
                        const d = (selectedBooking as any).scheduled_date ?? selectedBooking.date;
                        const t = (selectedBooking as any).scheduled_time ?? selectedBooking.time;
                        const line = formatServiceDateTimeForSummary(d, t);
                        if (line === "—") return null;
                        return <DetailRow label="Service date" value={line} />;
                      })()}
                      <DetailRow label="Assigned to" value={selectedBooking.assignedProvider || (selectedBooking as any).provider_name || "Unassigned"} />
                      {(() => {
                        const wageLabel = formatProviderWageDisplay(
                          (selectedBooking as any).provider_wage,
                          (selectedBooking as any).provider_wage_type
                        );
                        return wageLabel != null ? (
                          <div className="flex justify-between items-center gap-4 py-1.5 min-w-0">
                            <span className="text-muted-foreground text-sm shrink-0">Provider payment</span>
                            <span className="text-sm font-medium text-right break-words min-w-0 flex-1">
                              {wageLabel}
                              <Link href="/admin/settings" className="text-orange-600 hover:underline ml-1.5 text-xs">Learn more</Link>
                            </span>
                          </div>
                        ) : null;
                      })()}
                      {(() => {
                        const b = selectedBooking as any;
                        const zip = getResolvedBookingZipForSummary(selectedBooking);
                        const loc = [b.apt_no ? `Apt - ${b.apt_no}` : null, selectedBooking.address, zip || null]
                          .filter(Boolean)
                          .join(", ");
                        if (!loc) return null;
                        return <DetailRow label="Location" value={loc} className="text-right" />;
                      })()}
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
                <Button
                  className="w-full text-white bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    const id = selectedBooking?.id != null ? String(selectedBooking.id).trim() : "";
                    setShowDetails(false);
                    if (id && id !== "undefined") {
                      setSheetEditBookingId(id);
                    } else {
                      router.push("/admin/add-booking");
                    }
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />Edit
                </Button>
                {selectedBooking.status !== "completed" && (
                  <Button
                    className="w-full text-white bg-green-600 hover:bg-green-700"
                    onClick={() => setConfirmMarkCompleteOpen(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />Mark as completed
                  </Button>
                )}
                <Button className="w-full text-white bg-red-600 hover:bg-red-700" onClick={() => handleStatusChange(selectedBooking.id, "cancelled")} disabled={selectedBooking.status === "cancelled"}>
                  <XCircle className="h-4 w-4 mr-2" />Cancel
                </Button>
                <Button className="w-full text-white bg-emerald-500 hover:bg-emerald-600" onClick={() => router.push(`/admin/leads?addBooking=${selectedBooking.id}`)}>
                  Add to leads funnel
                </Button>
                <Button
                  className="w-full text-white bg-pink-500 hover:bg-pink-600"
                  disabled={sendAddCardLoading}
                  onClick={async () => {
                    if (!selectedBooking?.id) return;
                    setSendAddCardLoading(true);
                    try {
                      const res = await fetch(`/api/admin/bookings/${encodeURIComponent(String(selectedBooking.id))}/send-add-card-link`, {
                        method: "POST",
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        toast({
                          title: "Error",
                          description: typeof data.error === "string" ? data.error : "Failed to send add-card link",
                          variant: "destructive",
                        });
                        return;
                      }
                      toast({
                        title: "Link sent",
                        description: typeof data.sentTo === "string"
                          ? `We emailed a secure add-card link to ${data.sentTo}.`
                          : "We emailed a secure add-card link to the booking customer email.",
                      });
                    } catch {
                      toast({ title: "Error", description: "Failed to send add-card link", variant: "destructive" });
                    } finally {
                      setSendAddCardLoading(false);
                    }
                  }}
                >
                  {sendAddCardLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  {sendAddCardLoading ? "Sending…" : "Send \"Add card\" link"}
                </Button>
                <Button
                  className="w-full text-white bg-sky-400 hover:bg-sky-500"
                  disabled={resendReceiptLoading}
                  onClick={async () => {
                    if (!selectedBooking?.id) return;
                    setResendReceiptLoading(true);
                    try {
                      const res = await fetch(`/api/admin/bookings/${encodeURIComponent(String(selectedBooking.id))}/resend-receipt`, {
                        method: "POST",
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        toast({
                          title: "Error",
                          description: typeof data.error === "string" ? data.error : "Could not send receipt",
                          variant: "destructive",
                        });
                        return;
                      }
                      toast({
                        title: "Receipt sent",
                        description: typeof data.message === "string" ? data.message : "The customer should receive the receipt shortly.",
                      });
                    } catch {
                      toast({ title: "Error", description: "Failed to send receipt", variant: "destructive" });
                    } finally {
                      setResendReceiptLoading(false);
                    }
                  }}
                >
                  {resendReceiptLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
                  {resendReceiptLoading ? "Sending…" : "Resend Receipt"}
                </Button>
                <Button className="w-full text-white bg-amber-400 hover:bg-amber-500" onClick={() => router.push(`/admin/logs?booking=${selectedBooking.id}`)}>
                  <FileText className="h-4 w-4 mr-2" />View Booking Log
                </Button>
                <Button className="w-full text-white bg-rose-400 hover:bg-rose-500" onClick={() => router.push(`/admin/booking-charges?precharge=${selectedBooking.id}`)}>
                  Pre-charge
                </Button>
                <Button className="w-full text-white bg-orange-500 hover:bg-orange-600" onClick={() => setChecklistOpen(true)}>
                  <ListChecks className="h-4 w-4 mr-2" />View Checklist
                </Button>
                <Button
                  className="w-full text-white bg-amber-300 hover:bg-amber-400 text-gray-900"
                  onClick={() => {
                    const customerId = (selectedBooking as { customer_id?: string })?.customer_id;
                    if (customerId) {
                      setShowDetails(false);
                      router.push(`/admin/customers/${customerId}?tab=drive`);
                    } else {
                      toast({ title: "Job Media", description: "This booking is not linked to a customer profile. Link a customer to view their drive." });
                    }
                  }}
                >
                  <Image className="h-4 w-4 mr-2" />Job Media
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                  onClick={() => {
                    setShowDetails(false);
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("booking");
                    params.delete("id");
                    router.replace(`/admin/bookings${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
                  }}
                >
                  View in Bookings
                </Button>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetails(false);
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete("booking");
                      params.delete("id");
                      router.replace(`/admin/bookings${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking checklist</DialogTitle>
            <DialogDescription>
              Extras, notes, and partial-cleaning details for this job.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {selectedBooking && (() => {
              const c = (selectedBooking as { customization?: BookingCustomization }).customization;
              const ids = (c?.selectedExtras as string[]) || [];
              const extraNames = ids.map((id) => extrasMap[id] || id).filter(Boolean);
              const partial = c?.isPartialCleaning || (c?.excludedAreas?.length ?? 0) > 0;
              return (
                <>
                  {extraNames.length > 0 ? (
                    <div>
                      <p className="font-medium text-foreground mb-1">Selected extras</p>
                      <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                        {extraNames.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {partial ? (
                    <div className="rounded-md border border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-900/40 p-3">
                      <p className="font-medium text-foreground mb-1">Partial cleaning</p>
                      <p className="text-muted-foreground">
                        {c?.isPartialCleaning ? "Yes" : "—"}
                        {c?.excludedAreas?.length ? (
                          <span className="block mt-1">
                            Excluded:{" "}
                            {(c.excludedAreas || []).map((paramId) => {
                              const qty = c.excludeQuantities?.[paramId] ?? 1;
                              const name = excludeParamNames[paramId] || `${String(paramId).slice(0, 8)}…`;
                              return `${name}${qty > 1 ? ` × ${qty}` : ""}`;
                            }).join(", ")}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  ) : null}
                  {selectedBooking.notes ? (
                    <div>
                      <p className="font-medium text-foreground mb-1">Notes</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{selectedBooking.notes}</p>
                    </div>
                  ) : null}
                  {extraNames.length === 0 && !partial && !selectedBooking.notes ? (
                    <p className="text-muted-foreground">
                      No extras or notes on this booking. Use Edit to add extras, or add notes when creating or editing the booking.
                    </p>
                  ) : null}
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistOpen(false)}>
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

      <EditBookingSheet
        bookingId={sheetEditBookingId}
        open={!!sheetEditBookingId}
        onOpenChange={(open) => {
          if (!open) setSheetEditBookingId(null);
        }}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
