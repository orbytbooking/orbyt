"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseProviderClient } from "@/lib/supabaseProviderClient";

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
  const [timeLog, setTimeLog] = useState<{
    provider_status?: string;
    clocked_in_at?: string;
    clocked_out_at?: string;
  } | null>(null);
  const [clockLoading, setClockLoading] = useState(false);
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
  }, [toast, statusFilter, searchQuery]);

  useEffect(() => {
    if (selectedBooking?.id) {
      fetchClockConfigAndLog(selectedBooking.id);
    } else {
      setClockEnabled(false);
      setTimeLog(null);
    }
  }, [selectedBooking?.id]);

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      // Get the current session token
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/provider/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          bookingId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking status');
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Booking status updated to ${newStatus}`,
        });
        
        // Refresh bookings data
        const fetchResponse = await fetch(`/api/provider/bookings?status=${statusFilter}&search=${searchQuery}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const data = await fetchResponse.json();
        setBookingsData(data);
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: "Failed to update booking status. Please try again.",
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
    
    return filtered;
  };

  const handleAcceptBooking = (booking: Booking) => {
    // Update booking status to confirmed
    updateBookingStatus(booking.id, "confirmed");
    
    toast({
      title: "Booking Accepted",
      description: `You have accepted the booking for ${booking.customer.name}`,
    });
    setSelectedBooking(null);
  };

  const handleCompleteBooking = (booking: Booking) => {
    // Update booking status to completed
    updateBookingStatus(booking.id, "completed");
    
    toast({
      title: "Booking Completed",
      description: `Booking for ${booking.customer.name} marked as completed`,
    });
    setSelectedBooking(null);
  };

  const fetchClockConfigAndLog = async (bookingId: string) => {
    try {
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      if (!session) return;
      const [configRes, logRes] = await Promise.all([
        fetch("/api/provider/config", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch(`/api/provider/clock?bookingId=${bookingId}`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);
      const configData = await configRes.json();
      const logData = await logRes.json();
      setClockEnabled(configData.clock_in_out_enabled ?? false);
      setTimeLog(logData.timeLog ?? null);
    } catch {
      setClockEnabled(false);
      setTimeLog(null);
    }
  };

  const handleClockAction = async (bookingId: string, action: string) => {
    setClockLoading(true);
    try {
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      if (!session) return;
      const res = await fetch("/api/provider/clock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to update", variant: "destructive" });
        return;
      }
      setTimeLog(data.timeLog ?? { provider_status: action });
      if (action === "clocked_in") {
        setSelectedBooking((prev) => (prev ? { ...prev, status: "in_progress" as const } : null));
      }
      if (action === "clocked_out") {
        toast({ title: "Job completed", description: "Time logged successfully." });
        setBookingsData((prev) =>
          prev
            ? {
                ...prev,
                bookings: prev.bookings.map((b) =>
                  b.id === bookingId ? { ...b, status: "completed" as const } : b
                ),
                stats: {
                  ...prev.stats,
                  completed: prev.stats.completed + 1,
                  confirmed: Math.max(0, prev.stats.confirmed - 1),
                },
              }
            : null
        );
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

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
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
          </div>
        </CardContent>
      </Card>

      {/* Bookings Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Bookings</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filterBookings().map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filterBookings("confirmed").map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filterBookings("completed").map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filterBookings("cancelled").map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Booking Details Dialog */}
      {mounted && (
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Complete information about this booking
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Booking ID</p>
                  <p className="font-semibold">{selectedBooking.id}</p>
                </div>
                {getStatusBadge(selectedBooking.status)}
              </div>

              {/* Customer Info */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <h4 className="font-semibold">Customer Information</h4>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                      {selectedBooking.customer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{selectedBooking.customer.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{selectedBooking.customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{selectedBooking.customer.phone}</span>
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Service</p>
                  <p className="font-medium">{selectedBooking.service}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Amount</p>
                  <p className="font-medium text-lg">{selectedBooking.amount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date</p>
                  <p className="font-medium">{formatDate(selectedBooking.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Time</p>
                  <p className="font-medium">{formatTime(selectedBooking.time)}</p>
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Location</p>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="font-medium">{selectedBooking.location}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Special Notes</p>
                  <p className="text-sm p-3 bg-muted/50 rounded-lg">{selectedBooking.notes}</p>
                </div>
              )}

              {/* Clock In/Out (Booking Koala style) */}
              {clockEnabled && (selectedBooking.status === "confirmed" || selectedBooking.status === "in_progress") && (
                <div className="p-4 border rounded-lg space-y-3">
                  <p className="font-semibold">Time Tracking</p>
                  <div className="flex flex-wrap gap-2">
                    {!timeLog?.provider_status && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={clockLoading}
                        onClick={() => selectedBooking && handleClockAction(selectedBooking.id, "on_the_way")}
                      >
                        On the Way
                      </Button>
                    )}
                    {timeLog?.provider_status === "on_the_way" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={clockLoading}
                          onClick={() => selectedBooking && handleClockAction(selectedBooking.id, "at_location")}
                        >
                          At Location
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={clockLoading}
                          onClick={() => selectedBooking && handleClockAction(selectedBooking.id, "clocked_in")}
                        >
                          Clock In
                        </Button>
                      </>
                    )}
                    {timeLog?.provider_status === "at_location" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={clockLoading}
                        onClick={() => selectedBooking && handleClockAction(selectedBooking.id, "clocked_in")}
                      >
                        Clock In
                      </Button>
                    )}
                    {timeLog?.provider_status === "clocked_in" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={clockLoading}
                        onClick={() => selectedBooking && handleClockAction(selectedBooking.id, "clocked_out")}
                      >
                        Clock Out
                      </Button>
                    )}
                  </div>
                  {timeLog?.provider_status && (
                    <p className="text-xs text-muted-foreground">
                      Status: {timeLog.provider_status.replace("_", " ")}
                    </p>
                  )}
                </div>
              )}

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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedBooking(null)}>
              Close
            </Button>
            {selectedBooking?.status === "pending" && (
              <Button 
                onClick={() => handleAcceptBooking(selectedBooking)}
                style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}
              >
                Accept Booking
              </Button>
            )}
            {selectedBooking?.status === "confirmed" && (
              <Button 
                onClick={() => handleCompleteBooking(selectedBooking)}
                className="bg-green-600 hover:bg-green-700"
              >
                Mark as Completed
              </Button>
            )}
            {(selectedBooking?.customer?.phone || selectedBooking?.customer?.email) ? (
              <Button variant="outline" asChild>
                <a href={selectedBooking.customer.phone ? `tel:${selectedBooking.customer.phone}` : `mailto:${selectedBooking.customer.email}`}>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
};

export default ProviderBookings;
