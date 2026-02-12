"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseProviderClient } from "@/lib/supabaseProviderClient";

type Earning = {
  id: string;
  date: string;
  customer: string;
  service: string;
  amount: string;
  status: string;
  paymentMethod: string;
  commission?: number;
  tips?: number;
};

type EarningsData = {
  earningsHistory: Earning[];
  stats: {
    totalEarnings: string;
    thisMonth: string;
    pendingPayout: string;
    averagePerJob: string;
    completedJobs: number;
  };
  monthlyBreakdown: Array<{
    month: string;
    earnings: string;
    jobs: number;
  }>;
};

// Icon mapping
const iconMap: Record<string, any> = {
  DollarSign,
  Calendar,
  CreditCard,
  TrendingUp
};

const getStatusBadge = (status: string) => {
  const styles = {
    paid: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {status === "paid" ? <CheckCircle2 className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const ProviderEarningsPage = () => {
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    const fetchEarningsData = async () => {
      try {
        setLoading(true);
        
        // Get the current session token
        const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
        
        if (!session) {
          throw new Error('No active session');
        }

        const response = await fetch(`/api/provider/earnings?period=${periodFilter}&status=${statusFilter}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch earnings data');
        }

        const data = await response.json();
        setEarningsData(data);
      } catch (error) {
        console.error('Error fetching earnings data:', error);
        toast({
          title: "Error",
          description: "Failed to load earnings data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEarningsData();
  }, [toast, periodFilter, statusFilter]);

  const filteredEarnings = earningsData?.earningsHistory.filter(earning =>
    earning.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    earning.service.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        <span className="ml-2 text-muted-foreground">Loading earnings...</span>
      </div>
    );
  }

  if (!earningsData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-muted-foreground">Failed to load earnings data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Earnings</h1>
        <p className="text-muted-foreground">Track your income and payment history</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">
                Total Earnings
              </p>
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{earningsData.stats.totalEarnings}</p>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">+15.2%</span> from last month
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">
                This Month
              </p>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{earningsData.stats.thisMonth}</p>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">+8.1%</span> from last month
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">
                Pending Payout
              </p>
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                <CreditCard className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{earningsData.stats.pendingPayout}</p>
              <p className="text-xs text-muted-foreground">
                <span className="text-orange-600 font-medium">Processing</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">
                Completed Jobs
              </p>
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/20">
                <CheckCircle2 className="h-4 w-4 text-cyan-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{earningsData.stats.completedJobs}</p>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">+12.5%</span> from last month
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search earnings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Earnings History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Earnings History</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Your complete payment history
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEarnings.length > 0 ? (
                filteredEarnings.map((earning) => (
                  <TableRow key={earning.id}>
                    <TableCell>
                      {new Date(earning.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {earning.customer}
                    </TableCell>
                    <TableCell>
                      {earning.service}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {earning.amount}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(earning.status)}
                    </TableCell>
                    <TableCell>
                      {earning.paymentMethod}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Download Receipt</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No earnings found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      {earningsData.monthlyBreakdown && earningsData.monthlyBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Earnings trends over the last 6 months
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {earningsData.monthlyBreakdown.map((month) => (
                <div key={month.month} className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">{month.month}</p>
                    <p className="text-sm text-muted-foreground">{month.jobs} jobs</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{month.earnings}</p>
                    <p className="text-xs text-muted-foreground">Total earnings</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProviderEarningsPage;
