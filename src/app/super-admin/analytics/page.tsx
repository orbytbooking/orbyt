'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Building2,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';

interface AnalyticsData {
  totalBusinesses: number;
  activeBusinesses: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalUsers: number;
  activeUsers: number;
  newBusinessesThisMonth: number;
  churnRate: number;
  mrr: number;
  arr: number;
  averageRevenuePerBusiness: number;
  conversionRate: number;
}

interface MonthlyData {
  month: string;
  newBusinesses: number;
  revenue: number;
  activeUsers: number;
  churnRate: number;
}

interface PlanDistribution {
  planName: string;
  count: number;
  revenue: number;
  percentage: number;
}

export default function SuperAdminAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('12months');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      // Mock analytics data matching the schema structure
      const mockAnalyticsData: AnalyticsData = {
        totalBusinesses: 156,
        activeBusinesses: 142,
        totalRevenue: 45890,
        monthlyRevenue: 12450,
        totalUsers: 892,
        activeUsers: 654,
        newBusinessesThisMonth: 23,
        churnRate: 2.3,
        mrr: 12450,
        arr: 149400,
        averageRevenuePerBusiness: 87.68,
        conversionRate: 68.5,
      };

      const mockMonthlyData: MonthlyData[] = [
        { month: 'Jan', newBusinesses: 15, revenue: 8500, activeUsers: 450, churnRate: 2.1 },
        { month: 'Feb', newBusinesses: 23, revenue: 12450, activeUsers: 654, churnRate: 2.3 },
        { month: 'Mar', newBusinesses: 18, revenue: 11200, activeUsers: 620, churnRate: 1.8 },
        { month: 'Apr', newBusinesses: 31, revenue: 15800, activeUsers: 720, churnRate: 2.5 },
        { month: 'May', newBusinesses: 27, revenue: 14300, activeUsers: 690, churnRate: 2.0 },
        { month: 'Jun', newBusinesses: 22, revenue: 13100, activeUsers: 665, churnRate: 2.2 },
      ];

      const mockPlanDistribution: PlanDistribution[] = [
        { planName: 'Starter', count: 45, revenue: 0, percentage: 28.8 },
        { planName: 'Professional', count: 67, revenue: 1943, percentage: 42.9 },
        { planName: 'Business', count: 32, revenue: 2528, percentage: 20.5 },
        { planName: 'Enterprise', count: 12, revenue: 2388, percentage: 7.7 },
      ];

      setAnalyticsData(mockAnalyticsData);
      setMonthlyData(mockMonthlyData);
      setPlanDistribution(mockPlanDistribution);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getChangeIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    } else if (current < previous) {
      return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getChangeColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-500';
    if (current < previous) return 'text-red-500';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return <div>No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground">Monitor your SaaS platform performance and metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="12months">12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.mrr)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {getChangeIcon(analyticsData.monthlyRevenue, analyticsData.monthlyRevenue * 0.9)}
              <span className={getChangeColor(analyticsData.monthlyRevenue, analyticsData.monthlyRevenue * 0.9)}>
                +10.2% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.arr)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {getChangeIcon(analyticsData.arr, analyticsData.arr * 0.95)}
              <span className={getChangeColor(analyticsData.arr, analyticsData.arr * 0.95)}>
                +5.0% from last year
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.activeBusinesses}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {getChangeIcon(analyticsData.activeBusinesses, analyticsData.activeBusinesses - 8)}
              <span className={getChangeColor(analyticsData.activeBusinesses, analyticsData.activeBusinesses - 8)}>
                +{analyticsData.newBusinessesThisMonth} this month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(analyticsData.churnRate)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {getChangeIcon(2.3, 2.8)}
              <span className={getChangeColor(2.3, 2.8)}>
                -0.5% from last month
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.activeUsers} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(analyticsData.conversionRate)}</div>
            <p className="text-xs text-muted-foreground">
              Trial to paid conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Revenue/Business</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.averageRevenuePerBusiness)}</div>
            <p className="text-xs text-muted-foreground">
              Per active business
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Engagement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage((analyticsData.activeUsers / analyticsData.totalUsers) * 100)}
            </div>
            <p className="text-xs text-muted-foreground">
              Active vs total users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/20">
              <div className="text-center">
                <LineChart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Revenue chart visualization</p>
                <p className="text-sm text-muted-foreground">
                  {monthlyData.map(d => `${d.month}: $${d.revenue}`).join(' → ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Business Growth</CardTitle>
            <CardDescription>New businesses acquired per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/20">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Business growth chart</p>
                <p className="text-sm text-muted-foreground">
                  {monthlyData.map(d => `${d.month}: ${d.newBusinesses}`).join(' → ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plan Distribution</CardTitle>
          <CardDescription>How businesses are distributed across plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              {planDistribution.map((plan) => (
                <div key={plan.planName} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{plan.planName}</p>
                      <p className="text-sm text-muted-foreground">
                        {plan.count} businesses ({formatPercentage(plan.percentage)})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(plan.revenue)}</p>
                    <p className="text-sm text-muted-foreground">MRR</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/20">
              <div className="text-center">
                <PieChart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Plan distribution pie chart</p>
                <p className="text-sm text-muted-foreground">
                  Visual breakdown of plan distribution
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance</CardTitle>
          <CardDescription>Detailed monthly metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Month</th>
                  <th className="text-right p-2">New Businesses</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">Active Users</th>
                  <th className="text-right p-2">Churn Rate</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((month) => (
                  <tr key={month.month} className="border-b">
                    <td className="p-2 font-medium">{month.month}</td>
                    <td className="text-right p-2">{month.newBusinesses}</td>
                    <td className="text-right p-2">{formatCurrency(month.revenue)}</td>
                    <td className="text-right p-2">{month.activeUsers}</td>
                    <td className="text-right p-2">{formatPercentage(month.churnRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
