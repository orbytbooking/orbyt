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
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Booking = {
  id: string;
  customer: string;
  service: string;
  date: string;
  time: string;
  status: string;
  amount: string;
  location: string;
};

const stats = [
  {
    title: "Total Earnings",
    value: "$3,450",
    change: "+15.2%",
    icon: DollarSign,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20"
  },
  {
    title: "Completed Jobs",
    value: "28",
    change: "+12.5%",
    icon: CheckCircle2,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/20"
  },
  {
    title: "Upcoming Bookings",
    value: "8",
    change: "+3",
    icon: Calendar,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/20"
  },
  {
    title: "Average Rating",
    value: "4.8",
    change: "+0.2",
    icon: Star,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/20"
  },
];

const upcomingBookings: Booking[] = [
  {
    id: "BK001",
    customer: "Sarah Johnson",
    service: "Deep Cleaning",
    date: "2024-12-07",
    time: "9:00 AM",
    status: "confirmed",
    amount: "$250",
    location: "123 Main St, Downtown"
  },
  {
    id: "BK002",
    customer: "Mike Davis",
    service: "Standard Cleaning",
    date: "2024-12-07",
    time: "2:00 PM",
    status: "confirmed",
    amount: "$120",
    location: "456 Oak Ave, Westside"
  },
  {
    id: "BK003",
    customer: "Emily Chen",
    service: "Office Cleaning",
    date: "2024-12-08",
    time: "10:00 AM",
    status: "confirmed",
    amount: "$200",
    location: "789 Business Park, Suite 200"
  },
  {
    id: "BK004",
    customer: "Robert Wilson",
    service: "Carpet Cleaning",
    date: "2024-12-08",
    time: "3:00 PM",
    status: "pending",
    amount: "$150",
    location: "321 Elm St, Eastside"
  },
];

const recentActivity = [
  {
    id: 1,
    type: "completed",
    message: "Completed job for John Doe - Deep Cleaning",
    time: "2 hours ago",
    amount: "$250"
  },
  {
    id: 2,
    type: "payment",
    message: "Payment received for Standard Cleaning",
    time: "5 hours ago",
    amount: "$120"
  },
  {
    id: 3,
    type: "booking",
    message: "New booking from Sarah Johnson",
    time: "1 day ago",
    amount: "$250"
  },
  {
    id: 4,
    type: "review",
    message: "Received 5-star review from Mike Davis",
    time: "2 days ago",
    amount: null
  },
];

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

const ProviderDashboard = () => {
  const [providerName, setProviderName] = useState("Provider");

  useEffect(() => {
    const name = localStorage.getItem("providerName");
    if (name) {
      setProviderName(name);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome back, {providerName}! 👋</h1>
        <p className="text-muted-foreground">Here's what's happening with your bookings today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
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
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
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
                      <span>{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{booking.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                      <MapPin className="h-4 w-4" />
                      <span>{booking.location}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="flex-1" style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}>
                      <Phone className="h-4 w-4 mr-2" />
                      Contact
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
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
              {recentActivity.map((activity) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default ProviderDashboard;
