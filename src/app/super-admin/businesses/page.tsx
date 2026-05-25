'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  Filter,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react';

interface Business {
  id: string;
  name: string;
  owner_id: string;
  owner_email: string;
  subscription_status: string;
  subscription_plan_id: string;
  plan_name: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  is_featured: boolean;
  is_active: true;
  address: string | null;
  category: string | null;
  subdomain: string | null;
  domain: string | null;
  max_users: number;
  current_users: number;
  monthly_revenue: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing_cycle: string;
  features: Record<string, any>;
}

export default function BusinessesManagement() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchBusinesses();
    fetchSubscriptionPlans();
  }, []);

  const fetchBusinesses = async () => {
    try {
      // Mock data matching the schema structure
      const mockBusinesses: Business[] = [
        {
          id: '1',
          name: 'Acme Corporation',
          owner_id: 'user-1',
          owner_email: 'john@acme.com',
          subscription_status: 'active',
          subscription_plan_id: 'plan-2',
          plan_name: 'Professional',
          trial_ends_at: null,
          subscription_ends_at: '2024-03-15T10:30:00Z',
          created_at: '2024-01-15T10:30:00Z',
          is_featured: true,
          is_active: true,
          address: '123 Business St, New York, NY',
          category: 'Technology',
          subdomain: 'acme',
          domain: 'acme.orbytcrm.com',
          max_users: 5,
          current_users: 3,
          monthly_revenue: 29.00,
        },
        {
          id: '2',
          name: 'Tech Startup Inc',
          owner_id: 'user-2',
          owner_email: 'sarah@techstartup.com',
          subscription_status: 'trial',
          subscription_plan_id: 'plan-1',
          plan_name: 'Starter',
          trial_ends_at: '2024-02-25T14:20:00Z',
          subscription_ends_at: null,
          created_at: '2024-02-01T14:20:00Z',
          is_featured: false,
          is_active: true,
          address: '456 Innovation Ave, San Francisco, CA',
          category: 'Software',
          subdomain: 'techstartup',
          domain: null,
          max_users: 1,
          current_users: 1,
          monthly_revenue: 0.00,
        },
        {
          id: '3',
          name: 'Consulting Firm LLC',
          owner_id: 'user-3',
          owner_email: 'mike@consultingfirm.com',
          subscription_status: 'active',
          subscription_plan_id: 'plan-3',
          plan_name: 'Business',
          trial_ends_at: null,
          subscription_ends_at: '2024-04-10T09:15:00Z',
          created_at: '2023-12-10T09:15:00Z',
          is_featured: false,
          is_active: true,
          address: '789 Professional Blvd, Chicago, IL',
          category: 'Consulting',
          subdomain: 'consultingfirm',
          domain: 'crm.consultingfirm.com',
          max_users: 20,
          current_users: 8,
          monthly_revenue: 79.00,
        },
      ];
      setBusinesses(mockBusinesses);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      setLoading(false);
    }
  };

  const fetchSubscriptionPlans = async () => {
    try {
      const mockPlans: SubscriptionPlan[] = [
        { id: 'plan-1', name: 'Starter', price: 0, billing_cycle: 'monthly', features: {} },
        { id: 'plan-2', name: 'Professional', price: 29, billing_cycle: 'monthly', features: {} },
        { id: 'plan-3', name: 'Business', price: 79, billing_cycle: 'monthly', features: {} },
        { id: 'plan-4', name: 'Enterprise', price: 199, billing_cycle: 'monthly', features: {} },
      ];
      setPlans(mockPlans);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
    }
  };

  const getSubscriptionStatusBadge = (status: string, trialEndsAt: string | null) => {
    if (trialEndsAt && new Date(trialEndsAt) > new Date()) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Trial</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      case 'suspended':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.owner_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || business.subscription_status === statusFilter;
    const matchesPlan = planFilter === 'all' || business.subscription_plan_id === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleEditBusiness = (business: Business) => {
    setSelectedBusiness(business);
    setIsEditDialogOpen(true);
  };

  const handleSuspendBusiness = async (businessId: string) => {
    // In a real app, this would call the API
    setBusinesses(prev => prev.map(b => 
      b.id === businessId ? { ...b, subscription_status: 'suspended' } : b
    ));
  };

  const handleToggleFeatured = async (businessId: string) => {
    // In a real app, this would call the API
    setBusinesses(prev => prev.map(b => 
      b.id === businessId ? { ...b, is_featured: !b.is_featured } : b
    ));
  };

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
          <h1 className="text-3xl font-bold">Business Management</h1>
          <p className="text-muted-foreground">Manage all businesses on your platform</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Business
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businesses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Businesses</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businesses.filter(b => b.subscription_status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Businesses</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businesses.filter(b => b.trial_ends_at && new Date(b.trial_ends_at) > new Date()).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${businesses.reduce((sum, b) => sum + b.monthly_revenue, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="plan-filter">Plan</Label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Businesses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Businesses</CardTitle>
          <CardDescription>
            Manage and monitor all businesses on your platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBusinesses.map((business) => (
                <TableRow key={business.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{business.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {business.subdomain && `${business.subdomain}.orbytcrm.com`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{business.owner_email}</div>
                      <div className="text-sm text-muted-foreground">
                        {business.category}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{business.plan_name}</div>
                      <div className="text-sm text-muted-foreground">
                        ${business.monthly_revenue}/mo
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getSubscriptionStatusBadge(business.subscription_status, business.trial_ends_at)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {business.current_users}/{business.max_users}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      ${business.monthly_revenue.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {business.is_featured ? (
                      <Badge variant="secondary"><Star className="w-3 h-3 mr-1" /> Featured</Badge>
                    ) : (
                      <Badge variant="outline">Standard</Badge>
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
                        <DropdownMenuItem onClick={() => handleEditBusiness(business)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditBusiness(business)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Business
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleFeatured(business.id)}>
                          <Star className="mr-2 h-4 w-4" />
                          {business.is_featured ? 'Remove Featured' : 'Make Featured'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleSuspendBusiness(business.id)}
                          className="text-red-600"
                        >
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Suspend Business
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

      {/* Edit Business Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>
              Update business information and subscription details
            </DialogDescription>
          </DialogHeader>
          {selectedBusiness && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                    id="business-name"
                    defaultValue={selectedBusiness.name}
                  />
                </div>
                <div>
                  <Label htmlFor="owner-email">Owner Email</Label>
                  <Input
                    id="owner-email"
                    defaultValue={selectedBusiness.owner_email}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subscription-plan">Subscription Plan</Label>
                  <Select defaultValue={selectedBusiness.subscription_plan_id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - ${plan.price}/{plan.billing_cycle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subscription-status">Subscription Status</Label>
                  <Select defaultValue={selectedBusiness.subscription_status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  defaultValue={selectedBusiness.address || ''}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsEditDialogOpen(false)}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
