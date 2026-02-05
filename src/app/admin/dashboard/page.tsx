"use client";

import { useEffect, useMemo, useState } from "react";
import { useWebsiteConfig } from "@/hooks/useWebsiteConfig";
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
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BOOKINGS_STORAGE_KEY = "adminBookings";

type Booking = {
  id: string;
  customer: { name: string; email: string; phone: string } | string;
  service: string;
  date: string;
  time: string;
  status: string;
  amount: string;
  paymentMethod?: string;
  notes?: string;
};

// Mock data - replace with real API calls
const stats = [
  {
    title: "Total Revenue",
    value: "$12,450",
    change: "+12.5%",
    icon: DollarSign,
    trend: "up",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20"
  },
  {
    title: "Total Bookings",
    value: "156",
    change: "+8.2%",
    icon: Calendar,
    trend: "up",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/20"
  },
  {
    title: "Active Customers",
    value: "89",
    change: "+5.1%",
    icon: Users,
    trend: "up",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/20"
  },
  {
    title: "Completion Rate",
    value: "94.2%",
    change: "+2.3%",
    icon: TrendingUp,
    trend: "up",
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/20"
  },
];

const defaultBookings: Booking[] = [
  {
    id: "BK001",
    customer: { name: "John Doe", email: "john@example.com", phone: "(555) 123-4567" },
    service: "Deep Cleaning",
    date: "2024-11-08",
    time: "9:00 AM",
    status: "confirmed",
    amount: "$250"
  },
  {
    id: "BK002",
    customer: { name: "Jane Smith", email: "jane@example.com", phone: "(555) 234-5678" },
    service: "Standard Cleaning",
    date: "2024-11-08",
    time: "11:00 AM",
    status: "pending",
    amount: "$120"
  },
  {
    id: "BK003",
    customer: { name: "Mike Johnson", email: "mike@example.com", phone: "(555) 345-6789" },
    service: "Office Cleaning",
    date: "2024-11-09",
    time: "1:00 PM",
    status: "confirmed",
    amount: "$200"
  },
  {
    id: "BK004",
    customer: { name: "Sarah Williams", email: "sarah@example.com", phone: "(555) 456-7890" },
    service: "Carpet Cleaning",
    date: "2024-11-09",
    time: "3:00 PM",
    status: "completed",
    amount: "$150"
  },
  {
    id: "BK005",
    customer: { name: "David Brown", email: "david@example.com", phone: "(555) 567-8901" },
    service: "Move In/Out",
    date: "2024-11-10",
    time: "9:00 AM",
    status: "cancelled",
    amount: "$350"
  },
];

const getStatusBadge = (status: string) => {
  const styles = {
    confirmed: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
    pending: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    completed: "bg-green-500/20 text-green-300 border border-green-500/30",
    cancelled: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
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
  const [bookings, setBookings] = useState<Booking[]>(defaultBookings);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { config } = useWebsiteConfig();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Booking[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBookings(parsed);
        }
      } catch (error) {
        console.error("Failed to load bookings for dashboard", error);
      }
    }
  }, []);
  
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
    return bookings.map((booking) => ({
      ...booking,
      customerName: typeof booking.customer === "string" ? booking.customer : booking.customer.name,
    }));
  }, [bookings]);

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
    const id = selectedBooking.id;
    setBookings((prev) => {
      const next = prev.map((b) => b.id === id ? { ...b, status: 'confirmed' } : b);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(next)); } catch {}
      }
      return next;
    });
    setSelectedBooking((b) => b ? { ...b, status: 'confirmed' } : b);
    const name = typeof selectedBooking.customer === 'string' ? selectedBooking.customer : selectedBooking.customer.name;
    toast({ title: 'Booking accepted', description: `${name} • ${selectedBooking.service} is now confirmed.` });
  };

  return (
    <>
    <div className="space-y-6">
      {/* Mission Control Style Header */}
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-semibold text-white uppercase tracking-tight mb-2" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            {config?.branding?.companyName || 'ORBYT'}
          </h1>
          <p className="text-lg text-gray-400 font-normal" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            Your Service Business, In Orbit.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
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
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-4 glass-card border-cyan-500/20 hover:border-cyan-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                  {stat.title}
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
                                ? "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)"
                                : 'linear-gradient(135deg, #00D4E8 0%, #00BCD4 100%)';

                            return (
                              <div 
                                key={i} 
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
                  <div className="h-3 w-3 rounded bg-pink-400" />
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

        {/* Recent Bookings */}
        <Card className="lg:col-span-1 glass-card border-cyan-500/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>Recent Bookings</CardTitle>
            <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Latest booking requests and appointments
            </p>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {normalizedBookings.slice(0, 5).map((booking) => (
              <div 
                key={booking.id} 
                className="p-3 rounded-lg border border-cyan-500/20 hover:bg-white/5 transition-all cursor-pointer glass"
                onClick={() => setSelectedBooking(booking)}
                role="button"
                title={`View ${booking.customerName} • ${booking.service}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-cyan-300" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{booking.customerName}</p>
                    <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{booking.service}</p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>{booking.date} • {booking.time}</span>
                  </div>
                  <span className="font-semibold text-cyan-300" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{booking.amount}</span>
                </div>
              </div>
            ))}
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
                <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Customer</div>
                <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{typeof selectedBooking.customer === 'string' ? selectedBooking.customer : selectedBooking.customer.name}</div>
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
            {typeof selectedBooking.customer !== 'string' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Email</div>
                  <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.customer.email}</div>
                </div>
                <div>
                  <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Phone</div>
                  <div className="font-medium" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 600 }}>{selectedBooking.customer.phone}</div>
                </div>
              </div>
            )}
            {selectedBooking.notes && (
              <div>
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
