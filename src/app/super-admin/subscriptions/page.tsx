'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Users,
  Calendar,
  DollarSign,
  Zap,
  Crown,
  Star,
  Settings,
  TrendingUp
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  billing_cycle: string;
  features: Record<string, boolean>;
  max_users: number;
  max_bookings_per_month: number;
  api_calls_per_month: number;
  custom_domain: boolean;
  priority_support: boolean;
  advanced_analytics: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Subscription {
  id: string;
  business_id: string;
  business_name: string;
  subscription_plan_id: string;
  plan_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_start: string | null;
  trial_end: string | null;
  created_at: string;
  monthly_revenue: number;
}

export default function SubscriptionsManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'plans' | 'subscriptions'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);

  useEffect(() => {
    fetchSubscriptionPlans();
    fetchSubscriptions();
  }, []);

  const fetchSubscriptionPlans = async () => {
    try {
      // Mock data matching the schema structure
      const mockPlans: SubscriptionPlan[] = [
        {
          id: 'plan-1',
          name: 'Starter',
          slug: 'starter',
          description: 'Perfect for small businesses getting started',
          price: 0,
          billing_cycle: 'monthly',
          features: {
            basic_bookings: true,
            email_support: true,
            basic_analytics: true,
            team_collaboration: false,
            advanced_analytics: false,
            custom_domain: false,
            priority_support: false,
            api_access: false,
          },
          max_users: 1,
          max_bookings_per_month: 50,
          api_calls_per_month: 500,
          custom_domain: false,
          priority_support: false,
          advanced_analytics: false,
          is_active: true,
          sort_order: 1,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 'plan-2',
          name: 'Professional',
          slug: 'professional',
          description: 'Great for growing businesses',
          price: 29,
          billing_cycle: 'monthly',
          features: {
            basic_bookings: true,
            email_support: true,
            basic_analytics: true,
            team_collaboration: true,
            advanced_analytics: true,
            custom_domain: false,
            priority_support: false,
            api_access: false,
          },
          max_users: 5,
          max_bookings_per_month: 500,
          api_calls_per_month: 5000,
          custom_domain: false,
          priority_support: false,
          advanced_analytics: true,
          is_active: true,
          sort_order: 2,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 'plan-3',
          name: 'Business',
          slug: 'business',
          description: 'Complete solution for established businesses',
          price: 79,
          billing_cycle: 'monthly',
          features: {
            basic_bookings: true,
            email_support: true,
            basic_analytics: true,
            team_collaboration: true,
            advanced_analytics: true,
            custom_domain: true,
            priority_support: true,
            api_access: true,
          },
          max_users: 20,
          max_bookings_per_month: 2000,
          api_calls_per_month: 20000,
          custom_domain: true,
          priority_support: true,
          advanced_analytics: true,
          is_active: true,
          sort_order: 3,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 'plan-4',
          name: 'Enterprise',
          slug: 'enterprise',
          description: 'Custom solution for large organizations',
          price: 199,
          billing_cycle: 'monthly',
          features: {
            basic_bookings: true,
            email_support: true,
            basic_analytics: true,
            team_collaboration: true,
            advanced_analytics: true,
            custom_domain: true,
            priority_support: true,
            api_access: true,
            dedicated_support: true,
            custom_integrations: true,
          },
          max_users: -1, // Unlimited
          max_bookings_per_month: -1, // Unlimited
          api_calls_per_month: -1, // Unlimited
          custom_domain: true,
          priority_support: true,
          advanced_analytics: true,
          is_active: true,
          sort_order: 4,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];
      setPlans(mockPlans);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      // Mock subscription data
      const mockSubscriptions: Subscription[] = [
        {
          id: 'sub-1',
          business_id: 'biz-1',
          business_name: 'Acme Corporation',
          subscription_plan_id: 'plan-2',
          plan_name: 'Professional',
          status: 'active',
          current_period_start: '2024-02-15T10:30:00Z',
          current_period_end: '2024-03-15T10:30:00Z',
          cancel_at_period_end: false,
          trial_start: null,
          trial_end: null,
          created_at: '2024-01-15T10:30:00Z',
          monthly_revenue: 29.00,
        },
        {
          id: 'sub-2',
          business_id: 'biz-2',
          business_name: 'Tech Startup Inc',
          subscription_plan_id: 'plan-1',
          plan_name: 'Starter',
          status: 'trial',
          current_period_start: '2024-02-01T14:20:00Z',
          current_period_end: '2024-03-01T14:20:00Z',
          cancel_at_period_end: false,
          trial_start: '2024-02-01T14:20:00Z',
          trial_end: '2024-02-15T14:20:00Z',
          created_at: '2024-02-01T14:20:00Z',
          monthly_revenue: 0.00,
        },
        {
          id: 'sub-3',
          business_id: 'biz-3',
          business_name: 'Consulting Firm LLC',
          subscription_plan_id: 'plan-3',
          plan_name: 'Business',
          status: 'active',
          current_period_start: '2024-02-10T09:15:00Z',
          current_period_end: '2024-04-10T09:15:00Z',
          cancel_at_period_end: false,
          trial_start: null,
          trial_end: null,
          created_at: '2023-12-10T09:15:00Z',
          monthly_revenue: 79.00,
        },
      ];
      setSubscriptions(mockSubscriptions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'trial':
        return <Badge variant="secondary"><Calendar className="w-3 h-3 mr-1" /> Trial</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      case 'suspended':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" /> Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'starter':
        return <Zap className="w-5 h-5" />;
      case 'professional':
        return <Star className="w-5 h-5" />;
      case 'business':
        return <Crown className="w-5 h-5" />;
      case 'enterprise':
        return <Settings className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  const filteredPlans = plans.filter(plan =>
    plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMonthlyRevenue = subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((sum, sub) => sum + sub.monthly_revenue, 0);

  const totalYearlyRevenue = totalMonthlyRevenue * 12;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground">Manage subscription plans and customer subscriptions</p>
        </div>
        <Button onClick={() => setIsPlanDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Plan
        </Button>
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthlyRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalYearlyRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.filter(sub => sub.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Subscriptions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.filter(sub => sub.status === 'trial').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'plans' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('plans')}
          className="px-4"
        >
          Subscription Plans
        </Button>
        <Button
          variant={activeTab === 'subscriptions' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('subscriptions')}
          className="px-4"
        >
          Customer Subscriptions
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab === 'plans' ? 'plans' : 'subscriptions'}...`}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {activeTab === 'plans' && (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getPlanIcon(plan.name)}
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {plan.is_active ? (
                      <Badge variant="default" className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => {
                          setSelectedPlan(plan);
                          setIsPlanDialogOpen(true);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Plan
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Plan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.billing_cycle}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {plan.max_users === -1 ? 'Unlimited' : plan.max_users} users
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {plan.max_bookings_per_month === -1 ? 'Unlimited' : plan.max_bookings_per_month} bookings/month
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {plan.api_calls_per_month === -1 ? 'Unlimited' : plan.api_calls_per_month} API calls/month
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(plan.features).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center space-x-2">
                        {enabled ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm capitalize">
                          {feature.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Subscriptions</CardTitle>
            <CardDescription>
              Manage all active customer subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Auto-renew</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">
                      {subscription.business_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getPlanIcon(subscription.plan_name)}
                        <span>{subscription.plan_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(subscription.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Start: {new Date(subscription.current_period_start).toLocaleDateString()}</div>
                        <div>End: {new Date(subscription.current_period_end).toLocaleDateString()}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ${subscription.monthly_revenue.toFixed(2)}/mo
                      </div>
                    </TableCell>
                    <TableCell>
                      {subscription.cancel_at_period_end ? (
                        <Badge variant="destructive">Cancels</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500">Renews</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Subscription
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <DollarSign className="mr-2 h-4 w-4" />
                            View Billing History
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Cancel Subscription
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Plan Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
            </DialogTitle>
            <DialogDescription>
              Configure subscription plan details and features
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plan-name">Plan Name</Label>
                <Input
                  id="plan-name"
                  defaultValue={selectedPlan?.name || ''}
                  placeholder="e.g., Professional"
                />
              </div>
              <div>
                <Label htmlFor="plan-slug">Plan Slug</Label>
                <Input
                  id="plan-slug"
                  defaultValue={selectedPlan?.slug || ''}
                  placeholder="e.g., professional"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="plan-description">Description</Label>
              <Textarea
                id="plan-description"
                defaultValue={selectedPlan?.description || ''}
                placeholder="Describe what makes this plan great..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="plan-price">Price ($)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  defaultValue={selectedPlan?.price || 0}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="plan-billing">Billing Cycle</Label>
                <select
                  id="plan-billing"
                  className="w-full p-2 border rounded-md"
                  defaultValue={selectedPlan?.billing_cycle || 'monthly'}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <Label htmlFor="plan-sort">Sort Order</Label>
                <Input
                  id="plan-sort"
                  type="number"
                  defaultValue={selectedPlan?.sort_order || 0}
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="max-users">Max Users</Label>
                <Input
                  id="max-users"
                  type="number"
                  defaultValue={selectedPlan?.max_users || 1}
                  min="-1"
                />
                <p className="text-xs text-muted-foreground mt-1">-1 for unlimited</p>
              </div>
              <div>
                <Label htmlFor="max-bookings">Max Bookings/Month</Label>
                <Input
                  id="max-bookings"
                  type="number"
                  defaultValue={selectedPlan?.max_bookings_per_month || 100}
                  min="-1"
                />
                <p className="text-xs text-muted-foreground mt-1">-1 for unlimited</p>
              </div>
              <div>
                <Label htmlFor="max-api-calls">Max API Calls/Month</Label>
                <Input
                  id="max-api-calls"
                  type="number"
                  defaultValue={selectedPlan?.api_calls_per_month || 1000}
                  min="-1"
                />
                <p className="text-xs text-muted-foreground mt-1">-1 for unlimited</p>
              </div>
            </div>

            <div>
              <Label>Features</Label>
              <div className="space-y-2 mt-2">
                {[
                  { key: 'basic_bookings', label: 'Basic Bookings' },
                  { key: 'email_support', label: 'Email Support' },
                  { key: 'basic_analytics', label: 'Basic Analytics' },
                  { key: 'team_collaboration', label: 'Team Collaboration' },
                  { key: 'advanced_analytics', label: 'Advanced Analytics' },
                  { key: 'custom_domain', label: 'Custom Domain' },
                  { key: 'priority_support', label: 'Priority Support' },
                  { key: 'api_access', label: 'API Access' },
                  { key: 'dedicated_support', label: 'Dedicated Support' },
                  { key: 'custom_integrations', label: 'Custom Integrations' },
                ].map((feature) => (
                  <div key={feature.key} className="flex items-center space-x-2">
                    <Switch
                      id={feature.key}
                      defaultChecked={selectedPlan?.features[feature.key] || false}
                    />
                    <Label htmlFor={feature.key}>{feature.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="plan-active"
                defaultChecked={selectedPlan?.is_active !== false}
              />
              <Label htmlFor="plan-active">Plan is active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsPlanDialogOpen(false)}>
                {selectedPlan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
