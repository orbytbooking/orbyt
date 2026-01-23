"use client";

import { useState, useEffect } from "react";
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
  status: "pending" | "confirmed" | "completed" | "cancelled";
  amount: string;
  location: string;
  notes?: string;
};

type BookingPhotos = {
  before?: string;
  after?: string;
};

type BookingPhotosMap = Record<string, BookingPhotos>;

const allBookings: Booking[] = [
  {
    id: "BK001",
    customer: {
      name: "Sarah Johnson",
      email: "sarah@example.com",
      phone: "(555) 123-4567"
    },
    service: "Deep Cleaning",
    date: "2024-12-07",
    time: "9:00 AM",
    status: "confirmed",
    amount: "$250",
    location: "123 Main St, Downtown",
    notes: "Please bring eco-friendly cleaning supplies"
  },
  {
    id: "BK002",
    customer: {
      name: "Mike Davis",
      email: "mike@example.com",
      phone: "(555) 234-5678"
    },
    service: "Standard Cleaning",
    date: "2024-12-07",
    time: "2:00 PM",
    status: "confirmed",
    amount: "$120",
    location: "456 Oak Ave, Westside"
  },
  {
    id: "BK003",
    customer: {
      name: "Emily Chen",
      email: "emily@example.com",
      phone: "(555) 345-6789"
    },
    service: "Office Cleaning",
    date: "2024-12-08",
    time: "10:00 AM",
    status: "confirmed",
    amount: "$200",
    location: "789 Business Park, Suite 200"
  },
  {
    id: "BK004",
    customer: {
      name: "Robert Wilson",
      email: "robert@example.com",
      phone: "(555) 456-7890"
    },
    service: "Carpet Cleaning",
    date: "2024-12-08",
    time: "3:00 PM",
    status: "pending",
    amount: "$150",
    location: "321 Elm St, Eastside",
    notes: "Large living room and two bedrooms"
  },
  {
    id: "BK005",
    customer: {
      name: "Lisa Anderson",
      email: "lisa@example.com",
      phone: "(555) 567-8901"
    },
    service: "Move In/Out Cleaning",
    date: "2024-12-05",
    time: "11:00 AM",
    status: "completed",
    amount: "$350",
    location: "555 Pine St, Northside"
  },
  {
    id: "BK006",
    customer: {
      name: "David Brown",
      email: "david@example.com",
      phone: "(555) 678-9012"
    },
    service: "Deep Cleaning",
    date: "2024-12-04",
    time: "1:00 PM",
    status: "completed",
    amount: "$250",
    location: "888 Maple Ave, Southside"
  },
  {
    id: "BK007",
    customer: {
      name: "Jennifer Lee",
      email: "jennifer@example.com",
      phone: "(555) 789-0123"
    },
    service: "Standard Cleaning",
    date: "2024-12-03",
    time: "9:00 AM",
    status: "cancelled",
    amount: "$120",
    location: "999 Cedar Rd, Eastside"
  },
];

const getStatusBadge = (status: string) => {
  const styles = {
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  const icons = {
    confirmed: CheckCircle2,
    pending: Clock,
    completed: CheckCircle2,
    cancelled: XCircle,
  };

  const Icon = icons[status as keyof typeof icons] || AlertCircle;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const ProviderBookings = () => {
  const [mounted, setMounted] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>(allBookings);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingPhotos, setBookingPhotos] = useState<BookingPhotosMap>({});
  const { toast } = useToast();

  // Load bookings from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedBookings = localStorage.getItem("providerBookings");
    if (savedBookings) {
      try {
        setBookings(JSON.parse(savedBookings));
      } catch (error) {
        console.error("Failed to load bookings", error);
      }
    }

    const savedPhotos = localStorage.getItem("providerBookingPhotos");
    if (savedPhotos) {
      try {
        setBookingPhotos(JSON.parse(savedPhotos));
      } catch (error) {
        console.error("Failed to load booking photos", error);
      }
    }
  }, []);

  // Save bookings to localStorage whenever they change
  useEffect(() => {
    if (!mounted) return;
    if (bookings.length > 0) {
      localStorage.setItem("providerBookings", JSON.stringify(bookings));
    }
    localStorage.setItem("providerBookingPhotos", JSON.stringify(bookingPhotos));
  }, [bookings, bookingPhotos, mounted]);

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
    let filtered = bookings;
    
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
    const updatedBookings = bookings.map(b => 
      b.id === booking.id ? { ...b, status: "confirmed" as const } : b
    );
    setBookings(updatedBookings);
    
    toast({
      title: "Booking Accepted",
      description: `You have accepted the booking for ${booking.customer.name}`,
    });
    setSelectedBooking(null);
  };

  const handleCompleteBooking = (booking: Booking) => {
    // Update booking status to completed
    const updatedBookings = bookings.map(b => 
      b.id === booking.id ? { ...b, status: "completed" as const } : b
    );
    setBookings(updatedBookings);
    
    toast({
      title: "Booking Completed",
      description: `Booking for ${booking.customer.name} marked as completed`,
    });
    setSelectedBooking(null);
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
            <span>{booking.date}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{booking.time}</span>
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
                  <p className="font-medium">{selectedBooking.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Time</p>
                  <p className="font-medium">{selectedBooking.time}</p>
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
            <Button variant="outline">
              <Phone className="h-4 w-4 mr-2" />
              Contact Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
};

export default ProviderBookings;
