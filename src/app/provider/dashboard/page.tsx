"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  TrendingUp,
  Clock,
  Star,
  MapPin,
  Phone,
  Mail,
  Users,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseProviderClient } from "@/lib/supabaseProviderClient";
import { cn } from "@/lib/utils";

type Booking = {
  id: string;
  customer: string;
  customer_email?: string;
  customer_phone?: string;
  service: string;
  date: string;
  time: string;
  status: string;
  amount: string;
  location: string;
};

type Activity = {
  id: string;
  type: "completed" | "payment" | "booking" | "review";
  message: string;
  time: string;
  amount?: string;
};

type DashboardData = {
  provider: {
    id: string;
    name: string;
    email: string;
    rating: number;
  };
  stats: Array<{
    title: string;
    value: string;
    change: string;
    icon: string;
    color: string;
    bgColor: string;
  }>;
  upcomingBookings: Array<{
    id: string;
    customer: string;
    customer_email?: string;
    customer_phone?: string;
    service: string;
    date: string;
    time: string;
    status: string;
    amount: string;
    location: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    time: string;
    amount?: string;
  }>;
};

// Icon mapping
const iconMap: Record<string, any> = {
  DollarSign,
  Calendar,
  CheckCircle2,
  Star,
  TrendingUp,
  Clock,
  Users
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
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {status === "confirmed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

type CalendarBooking = { id: string; date: string; time: string; customer: { name: string }; service: string; status: string };

const ProviderDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarBookings, setCalendarBookings] = useState<CalendarBooking[]>([]);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get the current session token
        const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
        
        if (!session) {
          throw new Error('No active session');
        }

        const response = await fetch('/api/provider/dashboard', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchBookingsForCalendar = async () => {
      try {
        const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
        if (!session) return;
        const res = await fetch("/api/provider/bookings", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setCalendarBookings(data.bookings || []);
      } catch {
        setCalendarBookings([]);
      }
    };
    if (dashboardData?.provider?.id) fetchBookingsForCalendar();
  }, [dashboardData?.provider?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-muted-foreground">Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome back, {dashboardData.provider.name}! 👋</h1>
        <p className="text-muted-foreground">Here's what's happening with your bookings today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardData.stats.map((stat) => {
          const Icon = iconMap[stat.icon];
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600 font-medium">{stat.change}</span> from last month
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming Bookings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Bookings</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Your scheduled appointments
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/provider/bookings">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.upcomingBookings.length > 0 ? (
                dashboardData.upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{booking.customer}</h4>
                          {getStatusBadge(booking.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{booking.service}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">{booking.amount}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
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
                        <span>{booking.location}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      {(booking.customer_phone || booking.customer_email) ? (
                        <Button size="sm" className="flex-1" style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }} asChild>
                          <a href={booking.customer_phone ? `tel:${booking.customer_phone}` : `mailto:${booking.customer_email}`}>
                            <Phone className="h-4 w-4 mr-2" />
                            Contact
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" className="flex-1" style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }} disabled>
                          <Phone className="h-4 w-4 mr-2" />
                          Contact
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="flex-1" asChild>
                        <Link href={`/provider/bookings?bookingId=${booking.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming bookings</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your latest updates
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentActivity.length > 0 ? (
                dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className={`
                      h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0
                      ${activity.type === 'completed' ? 'bg-green-100 dark:bg-green-900/20' : ''}
                      ${activity.type === 'payment' ? 'bg-blue-100 dark:bg-blue-900/20' : ''}
                      ${activity.type === 'booking' ? 'bg-cyan-100 dark:bg-cyan-900/20' : ''}
                      ${activity.type === 'review' ? 'bg-orange-100 dark:bg-orange-900/20' : ''}
                    `}>
                      {activity.type === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {activity.type === 'payment' && <DollarSign className="h-4 w-4 text-blue-600" />}
                      {activity.type === 'booking' && <Calendar className="h-4 w-4 text-cyan-600" />}
                      {activity.type === 'review' && <Star className="h-4 w-4 text-orange-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.message}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                        {activity.amount && (
                          <p className="text-xs font-semibold text-green-600">{activity.amount}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule calendar - same style as admin */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Your schedule</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalendarDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCalendarDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCalendarDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/provider/bookings">View full calendar</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const year = calendarDate.getFullYear();
            const month = calendarDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startWeekday = firstDay.getDay();
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const formatDay = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const getCount = (dateStr: string) => calendarBookings.filter((b) => b.date === dateStr).length;
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
            return (
              <div className="grid grid-cols-7 gap-1">
                {dayNames.map((name) => (
                  <div key={name} className="text-center text-xs font-semibold text-muted-foreground py-1">
                    {name}
                  </div>
                ))}
                {Array.from({ length: startWeekday }).map((_, i) => (
                  <div key={`e-${i}`} className="h-10" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = formatDay(day);
                  const count = getCount(dateStr);
                  const isToday = dateStr === todayStr;
                  return (
                    <div
                      key={day}
                      className={cn(
                        "h-10 rounded flex flex-col items-center justify-center text-sm border",
                        isToday && "bg-primary/10 border-primary/50 font-medium",
                        !isToday && "border-transparent"
                      )}
                    >
                      <span>{day}</span>
                      {count > 0 && (
                        <span className="text-[10px] text-primary font-medium" title={`${count} booking(s)`}>
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>

    </div>
  );
};

export default ProviderDashboard;
