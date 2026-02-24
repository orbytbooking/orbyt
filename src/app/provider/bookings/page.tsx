"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  Calendar as CalendarIcon,
  Clock, 
  MapPin, 
  Phone, 
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Camera,
  Navigation,
  LogIn,
  LogOut,
  CircleDot,
  List,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  User as UserIcon,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseProviderClient } from "@/lib/supabaseProviderClient";
import { cn } from "@/lib/utils";

type Booking = {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  service: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  amount: string;
  location: string;
  notes?: string;
  service_provider_notes?: string[];
  duration_minutes?: number | null;
  frequency?: string | null;
  customization?: Record<string, unknown> | null;
  apt_no?: string | null;
  zip_code?: string | null;
  payment_method?: string | null;
  provider_wage?: number | null;
  provider_wage_type?: string | null;
};

type BookingPhotos = {
  before?: string;
  after?: string;
};

type BookingPhotosMap = Record<string, BookingPhotos>;

type BookingsData = {
  provider: {
    id: string;
    name: string;
    email: string;
  };
  bookings: Booking[];
  stats: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
};

const formatTime = (t: string) => {
  if (!t) return t;
  const [h, m] = t.split(":").map((s) => parseInt(s || "0", 10));
  const hr = h % 12 || 12;
  const min = String(m).padStart(2, "0");
  return h < 12 ? `${hr}:${min} AM` : `${hr}:${min} PM`;
};

const formatDate = (d: string) => {
  if (!d) return d;
  try {
    const parsed = new Date(d + "T00:00:00");
    return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
};

const formatDateTime = (iso: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return iso;
  }
};

const getStatusBadge = (status: string) => {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  const icons = {
    pending: <Clock className="h-3 w-3" />,
    confirmed: <CheckCircle2 className="h-3 w-3" />,
    completed: <CheckCircle2 className="h-3 w-3" />,
    cancelled: <XCircle className="h-3 w-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {icons[status as keyof typeof icons]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const getStatusTone = (status: string) => {
  switch (status) {
    case "completed":
      return { chip: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" };
    case "cancelled":
      return { chip: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" };
    case "confirmed":
      return { chip: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)" };
    case "pending":
      return { chip: "linear-gradient(135deg, #fde68a 0%, #f59e42 100%)" };
    default:
      return { chip: "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)" };
  }
};

const ProviderBookings = () => {
  const [bookingsData, setBookingsData] = useState<BookingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingPhotos, setBookingPhotos] = useState<BookingPhotosMap>({});
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [clockEnabled, setClockEnabled] = useState(false);
  const [allowReclockIn, setAllowReclockIn] = useState(false);
  const [timeLog, setTimeLog] = useState<{
    provider_status?: string;
    on_the_way_at?: string;
    at_location_at?: string;
    clocked_in_at?: string;
    clocked_out_at?: string;
    time_reported_minutes?: number;
  } | null>(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Open booking details when arriving with ?bookingId=xxx (e.g. from dashboard View Details)
  useEffect(() => {
    const bookingId = searchParams.get("bookingId");
    if (bookingId && bookingsData?.bookings && !loading) {
      const booking = bookingsData.bookings.find((b) => b.id === bookingId);
      if (booking) {
        setSelectedBooking(booking);
      }
    }
  }, [searchParams, bookingsData, loading]);

  useEffect(() => {
    setMounted(true);
    const fetchBookingsData = async () => {
      try {
        setLoading(true);
        
        // Get the current session token
        const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
        
        if (!session) {
          throw new Error('No active session');
        }

        const response = await fetch(`/api/provider/bookings?status=${statusFilter}&search=${searchQuery}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch bookings data');
        }

        const data = await response.json();
        setBookingsData(data);
      } catch (error) {
        console.error('Error fetching bookings data:', error);
        toast({
          title: "Error",
          description: "Failed to load bookings data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookingsData();
  }, [toast, statusFilter, searchQuery, refreshKey]);

  useEffect(() => {
    if (selectedBooking?.id) {
      fetchClockConfigAndLog(selectedBooking.id, selectedBooking.date);
    } else {
      setClockEnabled(false);
      setTimeLog(null);
    }
  }, [selectedBooking?.id, selectedBooking?.date]);

  const updateBookingStatus = async (
    bookingId: string,
    newStatus: string,
    options?: { occurrence_date?: string }
  ) => {
    try {
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      if (!session) throw new Error('No active session');

      const body: { bookingId: string; status: string; occurrence_date?: string } = {
        bookingId,
        status: newStatus,
      };
      if (options?.occurrence_date) body.occurrence_date = options.occurrence_date;

      const response = await fetch('/api/provider/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update booking status');
      }

      const result = await response.json();
      const occurrenceDate = options?.occurrence_date;

      const message =
        newStatus === "completed"
          ? occurrenceDate
            ? "This occurrence marked as completed."
            : "Booking marked as completed."
          : newStatus === "confirmed"
            ? "Booking accepted and confirmed."
            : `Booking status updated to ${newStatus}`;
      toast({ title: "Success", description: message });

      setBookingsData((prev) => {
        if (!prev) return prev;
        const matchOccurrence = (b: Booking) =>
          b.id === bookingId && (occurrenceDate ? b.date === occurrenceDate : true);
        return {
          ...prev,
          bookings: prev.bookings.map((b) =>
            matchOccurrence(b) ? { ...b, status: newStatus as Booking['status'] } : b
          ),
          stats: newStatus === 'completed'
            ? {
                ...prev.stats,
                completed: prev.stats.completed + 1,
                confirmed: Math.max(0, prev.stats.confirmed - 1),
              }
            : newStatus === 'confirmed'
              ? {
                  ...prev.stats,
                  confirmed: prev.stats.confirmed + 1,
                  pending: Math.max(0, prev.stats.pending - 1),
                }
              : prev.stats,
        };
      });

      setSelectedBooking((prev) => {
        if (!prev || prev.id !== bookingId) return prev;
        if (occurrenceDate && prev.date !== occurrenceDate) return prev;
        return { ...prev, status: newStatus as Booking['status'] };
      });
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update booking status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePhotoUpload = (
    bookingId: string,
    type: "before" | "after",
    file: File | null,
  ) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setBookingPhotos((prev) => ({
        ...prev,
        [bookingId]: {
          ...(prev[bookingId] || {}),
          [type]: result,
        },
      }));

      toast({
        title: type === "before" ? "Before photo saved" : "After photo saved",
        description: "This image is stored securely in your browser only.",
      });
    };
    reader.readAsDataURL(file);
  };

  const filterBookings = (status?: string) => {
    let filtered = bookingsData?.bookings || [];
    
    if (status) {
      filtered = filtered.filter(b => b.status === status);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(b => 
        b.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort by booking date descending (latest first), then by time descending
    filtered = [...filtered].sort((a, b) => {
      const dateCompare = (b.date || "").localeCompare(a.date || "");
      if (dateCompare !== 0) return dateCompare;
      return (b.time || "").localeCompare(a.time || "");
    });
    
    return filtered;
  };

  // Calendar helpers (same pattern as admin bookings)
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek, year, month };
  };
  const getBookingsForDate = (dateStr: string) => filterBookings().filter((b) => b.date === dateStr);
  const formatDateForCalendar = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (direction === "prev") next.setMonth(next.getMonth() - 1);
      else next.setMonth(next.getMonth() + 1);
      return next;
    });
  };
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleAcceptBooking = (booking: Booking) => {
    updateBookingStatus(booking.id, "confirmed");
    setSelectedBooking(null);
  };

  const handleCompleteBooking = (booking: Booking) => {
    updateBookingStatus(booking.id, "completed", { occurrence_date: booking.date });
    setSelectedBooking(null);
  };

  const fetchClockConfigAndLog = async (bookingId: string, occurrenceDate?: string) => {
    try {
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      if (!session) return;
      const clockUrl = occurrenceDate
        ? `/api/provider/clock?bookingId=${bookingId}&occurrence_date=${encodeURIComponent(occurrenceDate)}`
        : `/api/provider/clock?bookingId=${bookingId}`;
      const [configRes, logRes] = await Promise.all([
        fetch("/api/provider/config", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch(clockUrl, { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);
      const configData = await configRes.json();
      const logData = await logRes.json();
      setClockEnabled(configData.clock_in_out_enabled ?? false);
      setAllowReclockIn(configData.allow_reclock_in ?? false);
      setTimeLog(logData.timeLog ?? null);
    } catch {
      setClockEnabled(false);
      setTimeLog(null);
    }
  };

  const handleClockAction = async (bookingId: string, action: string, occurrenceDate?: string) => {
    setClockLoading(true);
    try {
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      if (!session) return;
      const body: { bookingId: string; action: string; occurrence_date?: string } = { bookingId, action };
      if (occurrenceDate) body.occurrence_date = occurrenceDate;
      const res = await fetch("/api/provider/clock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = [data.error, data.details].filter(Boolean).join(" — ") || "Failed to update";
        toast({ title: "Error", description: msg, variant: "destructive" });
        return;
      }
      setTimeLog(data.timeLog ?? { provider_status: action });
      // Update booking status to In progress when provider starts time tracking (on the way, at location, or clock in)
      if (["on_the_way", "at_location", "clocked_in"].includes(action) && selectedBooking) {
        setSelectedBooking((prev) => (prev ? { ...prev, status: "in_progress" as const } : null));
        setBookingsData((prev) => {
          if (!prev) return prev;
          const match = (b: Booking) => b.id === selectedBooking.id && (selectedBooking.date ? b.date === selectedBooking.date : true);
          return {
            ...prev,
            bookings: prev.bookings.map((b) => (match(b) ? { ...b, status: "in_progress" as const } : b)),
          };
        });
      }
      if (action === "clocked_out" && selectedBooking) {
        toast({ title: "Job completed", description: "Time logged successfully." });
        await updateBookingStatus(selectedBooking.id, "completed", { occurrence_date: selectedBooking.date });
        return;
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setClockLoading(false);
    }
  };

  const hasPhotos = (bookingId: string): boolean => {
    const photos = bookingPhotos[bookingId];
    return !!(photos?.before || photos?.after);
  };

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const photosExist = hasPhotos(booking.id);
    
    return (
      <Card 
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedBooking(booking)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{booking.customer.name}</h4>
                {getStatusBadge(booking.status)}
                {photosExist && (
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
                    title="Before/After photos attached"
                  >
                    <Camera className="h-3 w-3" />
                    Photos
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{booking.service}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">{booking.amount}</p>
              <p className="text-xs text-muted-foreground">{booking.id}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(booking.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatTime(booking.time)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{booking.location}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
        <p className="text-muted-foreground">Manage your appointments and schedules</p>
      </div>

      {/* Search, Filter, and View Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, service, or booking ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("calendar")}
                title="Calendar View"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <List className="h-4 w-4" />
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
        </CardContent>
      </Card>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{monthNames[month]} {year}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center font-semibold text-sm py-2 text-muted-foreground">
                  {day}
                </div>
              ))}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const dateString = formatDateForCalendar(year, month, day);
                const dayBookings = getBookingsForDate(dateString);
                const hasBookings = dayBookings.length > 0;
                const today = new Date();
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                return (
                  <div
                    key={day}
                    className={cn(
                      "h-24 rounded-lg p-2 transition-all cursor-pointer border",
                      isToday ? "bg-accent/50 border-primary/50" : "bg-background border-border hover:bg-accent/20"
                    )}
                  >
                    <div className="flex flex-col h-full">
                      <div className="text-sm font-medium mb-1">{day}</div>
                      {hasBookings && (
                        <div className="flex-1 space-y-0.5 overflow-y-auto">
                          {dayBookings.slice(0, 3).map((booking) => {
                            const tone = getStatusTone(booking.status);
                            const shortName = (booking.customer?.name || "Booking").trim().split(/\s+/)[0] || "Booking";
                            return (
                              <div
                                key={`${booking.id}-${booking.date}-${booking.time}`}
                                onClick={() => setSelectedBooking(booking)}
                                className="text-[10px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity text-white truncate"
                                style={{ background: tone.chip }}
                                title={`${booking.customer?.name || "Booking"} - ${booking.service}`}
                              >
                                {shortName}
                              </div>
                            );
                          })}
                          {dayBookings.length > 3 && (
                            <div className="text-[10px] text-muted-foreground text-center">+{dayBookings.length - 3}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)" }} />
                <span>Confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ background: "linear-gradient(135deg, #fde68a 0%, #f59e42 100%)" }} />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }} />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }} />
                <span>Cancelled</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View - Bookings Tabs */}
      {viewMode === "list" && mounted ? (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Bookings</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterBookings().map((booking) => (
                <BookingCard key={`${booking.id}-${booking.date}-${booking.time}`} booking={booking} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="confirmed" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterBookings("confirmed").map((booking) => (
                <BookingCard key={`${booking.id}-${booking.date}-${booking.time}`} booking={booking} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterBookings("completed").map((booking) => (
                <BookingCard key={`${booking.id}-${booking.date}-${booking.time}`} booking={booking} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterBookings("cancelled").map((booking) => (
                <BookingCard key={`${booking.id}-${booking.date}-${booking.time}`} booking={booking} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : viewMode === "list" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filterBookings().map((booking) => (
              <BookingCard key={`${booking.id}-${booking.date}-${booking.time}`} booking={booking} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Booking details - right side panel (admin-style) */}
      {mounted && (
      <Sheet open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-screen max-h-screen overflow-hidden">
          <SheetHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold">Booking summary</SheetTitle>
              {selectedBooking && getStatusBadge(selectedBooking.status)}
            </div>
          </SheetHeader>

          {selectedBooking && (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 flex flex-col gap-4 overscroll-contain">
              {/* Customer block - same as admin */}
              <div className="flex gap-4 pt-2">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                  <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                    {selectedBooking.customer.name.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-semibold text-base">{selectedBooking.customer.name}</p>
                  {selectedBooking.customer.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{selectedBooking.customer.email}</span>
                    </div>
                  )}
                  {selectedBooking.customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{selectedBooking.customer.phone}</span>
                    </div>
                  )}
                  {selectedBooking.location && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="break-words">
                        {[selectedBooking.apt_no ? `Apt ${selectedBooking.apt_no}, ` : null, selectedBooking.location, selectedBooking.zip_code].filter(Boolean).join(' ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking details - gray card with collapsible (admin-style) */}
              <div className="rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 min-w-0 shrink-0">
                <Collapsible defaultOpen className="group">
                  <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors shrink-0 rounded-t-lg">
                    <span>Booking details</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white dark:bg-gray-800 group-data-[state=open]:hidden">
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white dark:bg-gray-800 hidden group-data-[state=open]:flex">
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-visible">
                    <div className="px-4 pb-4 space-y-0">
                      {[
                        { label: 'Booking id', value: selectedBooking.id },
                        { label: 'Zip/Postal code', value: selectedBooking.zip_code || '—' },
                        { label: 'Industry', value: '—' },
                        { label: 'Service', value: selectedBooking.service },
                        { label: 'Frequency', value: selectedBooking.frequency || '—' },
                        {
                          label: 'Bathrooms',
                          value: selectedBooking.customization && typeof selectedBooking.customization === 'object' && ('bathroom' in selectedBooking.customization || 'bathrooms' in selectedBooking.customization)
                            ? String((selectedBooking.customization as Record<string, unknown>).bathroom ?? (selectedBooking.customization as Record<string, unknown>).bathrooms ?? '—')
                            : '—',
                        },
                        {
                          label: 'Extras',
                          value: selectedBooking.customization && typeof selectedBooking.customization === 'object' && 'extras' in selectedBooking.customization
                            ? Array.isArray(selectedBooking.customization.extras)
                              ? (selectedBooking.customization.extras as string[]).join(', ')
                              : String(selectedBooking.customization.extras)
                            : '—',
                        },
                        {
                          label: 'Professionals',
                          value: selectedBooking.customization && typeof selectedBooking.customization === 'object' && ('professionals' in selectedBooking.customization || 'professional' in selectedBooking.customization)
                            ? String((selectedBooking.customization as Record<string, unknown>).professionals ?? (selectedBooking.customization as Record<string, unknown>).professional ?? '—')
                            : '—',
                        },
                        {
                          label: 'Length',
                          value: selectedBooking.duration_minutes != null && selectedBooking.duration_minutes > 0
                            ? selectedBooking.duration_minutes >= 60
                              ? `${Math.floor(selectedBooking.duration_minutes / 60)} Hr ${selectedBooking.duration_minutes % 60 || 0} Min`
                              : `${selectedBooking.duration_minutes} Min`
                            : '—',
                        },
                        { label: 'Service date', value: selectedBooking.date ? formatDate(selectedBooking.date) : '—' },
                        { label: 'Assigned to', value: bookingsData?.provider?.name ?? 'You' },
                        {
                          label: 'Provider payment',
                          value: selectedBooking.provider_wage != null && selectedBooking.provider_wage_type
                            ? selectedBooking.provider_wage_type === 'percentage'
                              ? `${selectedBooking.provider_wage}%`
                              : selectedBooking.provider_wage_type === 'hourly'
                                ? `$${Number(selectedBooking.provider_wage).toFixed(2)}/hr`
                                : `$${Number(selectedBooking.provider_wage).toFixed(2)}`
                            : '—',
                        },
                        { label: 'Location', value: [selectedBooking.location, selectedBooking.apt_no ? `Apt ${selectedBooking.apt_no}` : null, selectedBooking.zip_code].filter(Boolean).join(', ') || '—' },
                        { label: 'Payment method', value: selectedBooking.payment_method ? String(selectedBooking.payment_method).toLowerCase() : '—' },
                        { label: 'Price details', value: selectedBooking.amount },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-start gap-4 py-1.5 min-w-0 border-b border-border/50 last:border-0">
                          <span className="text-muted-foreground text-sm shrink-0">{label}</span>
                          <span className="text-sm font-medium text-right break-words break-all min-w-0 flex-1">{value}</span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Note(s) - gray card collapsible */}
              <div className="rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shrink-0">
                <Collapsible defaultOpen={!!selectedBooking.notes} className="group">
                  <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors rounded-t-lg">
                    <span>Note(s)</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white dark:bg-gray-800 group-data-[state=open]:hidden">
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white dark:bg-gray-800 hidden group-data-[state=open]:flex">
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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

              {/* Note for you (admin) */}
              {selectedBooking.service_provider_notes && selectedBooking.service_provider_notes.length > 0 && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Note for you</h4>
                  <div className="space-y-1 text-sm">
                    {selectedBooking.service_provider_notes.map((note, i) => (
                      <p key={i} className="break-words">{note}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Tracking - show when active (clock enabled) or when completed and we have time log data */}
              {(clockEnabled && (
                (selectedBooking.status === "confirmed" || selectedBooking.status === "in_progress") ||
                (allowReclockIn && timeLog?.clocked_out_at)
              )) || (selectedBooking.status === "completed" && timeLog != null) ? (
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">
                      {selectedBooking.status === "completed" ? "Time tracked" : "Time Tracking"}
                    </p>
                    {timeLog?.time_reported_minutes != null && (
                      <span className="text-sm font-medium text-muted-foreground">
                        {timeLog.time_reported_minutes >= 60
                          ? `${Math.floor(timeLog.time_reported_minutes / 60)}h ${timeLog.time_reported_minutes % 60}m`
                          : `${timeLog.time_reported_minutes} min`}
                      </span>
                    )}
                  </div>

                  {/* Timeline: completed steps with timestamps */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {timeLog?.on_the_way_at ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={timeLog?.on_the_way_at ? "text-foreground" : "text-muted-foreground"}>
                        On the way
                        {timeLog?.on_the_way_at && (
                          <span className="ml-1 text-muted-foreground">at {formatDateTime(timeLog.on_the_way_at)}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {timeLog?.at_location_at ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={timeLog?.at_location_at ? "text-foreground" : "text-muted-foreground"}>
                        At location
                        {timeLog?.at_location_at && (
                          <span className="ml-1 text-muted-foreground">at {formatDateTime(timeLog.at_location_at)}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {timeLog?.clocked_in_at ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={timeLog?.clocked_in_at ? "text-foreground" : "text-muted-foreground"}>
                        Clocked in
                        {timeLog?.clocked_in_at && (
                          <span className="ml-1 text-muted-foreground">at {formatDateTime(timeLog.clocked_in_at)}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {timeLog?.clocked_out_at ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={timeLog?.clocked_out_at ? "text-foreground" : "text-muted-foreground"}>
                        Clocked out
                        {timeLog?.clocked_out_at && (
                          <span className="ml-1 text-muted-foreground">at {formatDateTime(timeLog.clocked_out_at)}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons - hide when viewing completed booking (read-only summary) */}
                  {selectedBooking.status !== "completed" && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {allowReclockIn && timeLog?.clocked_out_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={clockLoading}
                        onClick={() => selectedBooking && handleClockAction(selectedBooking.id, "clocked_in", selectedBooking.date)}
                      >
                        <LogIn className="h-4 w-4 mr-1.5" />
                        Clock In Again
                      </Button>
                    )}
                    {!timeLog?.provider_status && !timeLog?.clocked_out_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={clockLoading}
                        onClick={() => selectedBooking && handleClockAction(selectedBooking.id, "on_the_way", selectedBooking.date)}
                      >
                        <Navigation className="h-4 w-4 mr-1.5" />
                        On the Way
                      </Button>
                    )}
                    {timeLog?.provider_status === "on_the_way" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={clockLoading}
                          onClick={() => selectedBooking && handleClockAction(selectedBooking.id, "at_location", selectedBooking.date)}
                        >
                          <MapPin className="h-4 w-4 mr-1.5" />
                          At Location
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={clockLoading}
                          onClick={() => selectedBooking && handleClockAction(selectedBooking.id, "clocked_in", selectedBooking.date)}
                        >
                          <LogIn className="h-4 w-4 mr-1.5" />
                          Clock In
                        </Button>
                      </>
                    )}
                    {timeLog?.provider_status === "at_location" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={clockLoading}
                        onClick={() => selectedBooking && handleClockAction(selectedBooking.id, "clocked_in", selectedBooking.date)}
                      >
                        <LogIn className="h-4 w-4 mr-1.5" />
                        Clock In
                      </Button>
                    )}
                    {timeLog?.provider_status === "clocked_in" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={clockLoading}
                        onClick={() => selectedBooking && handleClockAction(selectedBooking.id, "clocked_out", selectedBooking.date)}
                      >
                        <LogOut className="h-4 w-4 mr-1.5" />
                        Clock Out
                      </Button>
                    )}
                  </div>
                  )}
                </div>
              ) : null}

              {/* Before & After Photos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Before &amp; After Photos</p>
                    <p className="text-xs text-muted-foreground">
                      These images are saved locally in your browser for your records.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Before Clean</p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        selectedBooking &&
                        handlePhotoUpload(
                          selectedBooking.id,
                          "before",
                          e.target.files?.[0] || null,
                        )
                      }
                    />
                    {selectedBooking &&
                      bookingPhotos[selectedBooking.id]?.before && (
                        <div className="mt-2 rounded-md border overflow-hidden">
                          <img
                            src={bookingPhotos[selectedBooking.id]!.before}
                            alt="Before clean"
                            className="w-full h-40 object-cover"
                          />
                        </div>
                      )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">After Clean</p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        selectedBooking &&
                        handlePhotoUpload(
                          selectedBooking.id,
                          "after",
                          e.target.files?.[0] || null,
                        )
                      }
                    />
                    {selectedBooking &&
                      bookingPhotos[selectedBooking.id]?.after && (
                        <div className="mt-2 rounded-md border overflow-hidden">
                          <img
                            src={bookingPhotos[selectedBooking.id]!.after}
                            alt="After clean"
                            className="w-full h-40 object-cover"
                          />
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="shrink-0 border-t border-border px-6 py-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSelectedBooking(null)}>
              Close
            </Button>
            {selectedBooking?.status === "pending" && (
              <Button
                onClick={() => handleAcceptBooking(selectedBooking!)}
                style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}
              >
                Accept Booking
              </Button>
            )}
            {selectedBooking?.status === "confirmed" && (
              <Button
                onClick={() => handleCompleteBooking(selectedBooking!)}
                className="bg-green-600 hover:bg-green-700"
              >
                Mark as Completed
              </Button>
            )}
            {selectedBooking && (selectedBooking.customer?.phone || selectedBooking.customer?.email) ? (
              <Button variant="outline" asChild>
                <a href={selectedBooking.customer?.phone ? `tel:${selectedBooking.customer.phone}` : `mailto:${selectedBooking.customer.email}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Customer
                </a>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <Phone className="h-4 w-4 mr-2" />
                Contact Customer
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
      )}
    </div>
  );
};

export default ProviderBookings;
