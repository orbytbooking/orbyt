"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import { 
  Search, 
  Download,
  Eye,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  UserPlus
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CUSTOMERS_STORAGE_KEY = "adminCustomers";

// Mock data fallback
const defaultCustomers = [
  {
    id: "CUST001",
    name: "John Doe",
    email: "john@example.com",
    phone: "(555) 123-4567",
    address: "123 Main St, Chicago, IL",
    joinDate: "2024-01-15",
    totalBookings: 12,
    totalSpent: "$1,450",
    status: "active",
    lastBooking: "2024-11-05"
  },
  {
    id: "CUST002",
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "(555) 234-5678",
    address: "456 Oak Ave, Chicago, IL",
    joinDate: "2024-02-20",
    totalBookings: 8,
    totalSpent: "$980",
    status: "active",
    lastBooking: "2024-11-08"
  },
  {
    id: "CUST003",
    name: "Mike Johnson",
    email: "mike@example.com",
    phone: "(555) 345-6789",
    address: "789 Business Blvd, Chicago, IL",
    joinDate: "2024-03-10",
    totalBookings: 15,
    totalSpent: "$2,100",
    status: "active",
    lastBooking: "2024-11-09"
  },
  {
    id: "CUST004",
    name: "Sarah Williams",
    email: "sarah@example.com",
    phone: "(555) 456-7890",
    address: "321 Pine St, Chicago, IL",
    joinDate: "2024-04-05",
    totalBookings: 5,
    totalSpent: "$650",
    status: "active",
    lastBooking: "2024-10-28"
  },
  {
    id: "CUST005",
    name: "David Brown",
    email: "david@example.com",
    phone: "(555) 567-8901",
    address: "654 Elm Dr, Chicago, IL",
    joinDate: "2024-05-12",
    totalBookings: 3,
    totalSpent: "$420",
    status: "inactive",
    lastBooking: "2024-09-15"
  },
];

type Customer = typeof defaultCustomers[number];

const Customers = () => {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>(defaultCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editCustomer, setEditCustomer] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "active" as Customer["status"],
  });
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('join_date', { ascending: false });
      
    if (error) {
      console.error('Error fetching customers:', error);
      // If table doesn't exist, show mock data and inform user
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('Customers table not found, using mock data');
        toast({
          title: "Database Setup Required",
          description: "Please run the SQL script to create the customers table.",
          variant: "destructive"
        });
        setCustomers(defaultCustomers);
        return;
      }
      
      // Handle RLS policy errors
      if (error.message.includes('row-level security policy')) {
        toast({
          title: "Permission Error",
          description: "You don't have permission to access customers. Check RLS policies.",
          variant: "destructive"
        });
        setCustomers([]);
        return;
      }
      
      toast({
        title: "Error",
        description: `Failed to fetch customers: ${error.message}`,
        variant: "destructive"
      });
      setCustomers([]);
      return;
    }
    
    if (data) {
      setCustomers(data);
    }
  }


  // Open modal if query parameter is present
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddCustomer(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
  }, [customers]);

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      customer.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);
    
    return matchesSearch;
  });

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditCustomer({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      status: customer.status,
    });
    setShowEditCustomer(true);
  };

  const handleSaveEdit = () => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === editCustomer.id
          ? { ...c, name: editCustomer.name, email: editCustomer.email, phone: editCustomer.phone, address: editCustomer.address, status: editCustomer.status }
          : c
      )
    );

    toast({
      title: "Customer Updated",
      description: `${editCustomer.name} has been updated successfully.`,
    });

    setShowEditCustomer(false);
  };

  const handleAddCustomer = async () => {
  const now = new Date();
  const newEntry = {
    id: `CUST${Date.now()}`,
    name: newCustomer.name,
    email: newCustomer.email,
    phone: newCustomer.phone,
    address: newCustomer.address || "",
    join_date: now.toISOString().slice(0, 10),
    total_bookings: 0,
    total_spent: 0,
    status: "active",
    last_booking: null
  };

  const { error } = await supabase.from('customers').insert([newEntry]);
  if (error) {
    console.error('Error adding customer:', error);
    toast({
      title: "Error",
      description: `Failed to add customer: ${error.message}`,
      variant: "destructive"
    });
    return;
  }

  toast({
    title: "Customer Added",
    description: `${newCustomer.name} has been added successfully.`,
  });

  setNewCustomer({ name: "", email: "", phone: "", address: "" });
  setShowAddCustomer(false);

  // Refetch customers from Supabase
  fetchCustomers();
};

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 pointer-events-none">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="pointer-events-none">Inactive</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">
              Total Customers
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-white/80 mt-1">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">
              Active Customers
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.status === "active").length}
            </div>
            <p className="text-xs text-white/80 mt-1">
              {customers.length ? ((customers.filter(c => c.status === "active").length / customers.length) * 100).toFixed(0) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">
              Avg. Bookings/Customer
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.length ? (customers.reduce((acc, c) => acc + c.totalBookings, 0) / customers.length).toFixed(1) : "0.0"}
            </div>
            <p className="text-xs text-white/80 mt-1">
              Per customer lifetime
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 max-w-sm relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Search customers..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="pl-10"
  />
</div>
        <Button 
          variant="outline"
          onClick={() => setShowAddCustomer(true)}
          className="relative overflow-hidden group text-white border-cyan-400/50 hover:border-cyan-400 transition-all duration-300"
        >
          <span className="absolute inset-0 w-0 bg-gradient-to-r from-cyan-400/20 to-cyan-300/20 group-hover:w-full transition-all duration-300 ease-in-out"></span>
          <span className="relative z-10 flex items-center">
            <UserPlus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            <span className="group-hover:translate-x-1 transition-transform">Add Customer</span>
          </span>
        </Button>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Contact
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Join Date
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                    Bookings
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                    Total Spent
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/admin/customers/${customer.id}`} className="text-sm font-medium text-white dark:text-white light-mode:text-black hover:text-cyan-300 hover:underline">
                        {customer.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/admin/customers/${customer.id}`} className="group">
                        <div className="text-sm text-white/80 dark:text-white/80 light-mode:text-black group-hover:text-cyan-300 transition-colors">{customer.email}</div>
                      </Link>
                      <div className="text-xs text-muted-foreground">{customer.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-sm">{customer.joinDate}</td>
                    <td className="py-3 px-4 text-sm text-center font-medium">{customer.totalBookings}</td>
                    <td className="py-3 px-4 text-sm font-medium text-right">{customer.totalSpent}</td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(customer.status)}</td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(customer)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent
  className="max-w-2xl rounded-2xl p-0 overflow-hidden border border-border shadow-xl
    bg-white dark:bg-[#181F2A] text-gray-900 dark:text-gray-100"
  style={{
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(240,240,255,0.92) 100%)',
    backdropFilter: 'blur(10px)',
  }}
>
  <DialogHeader className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-8 pt-8 pb-4 border-b border-border">
    <DialogTitle className="text-lg font-bold text-gray-900 dark:text-cyan-200">
      Customer Details - {selectedCustomer?.id}
    </DialogTitle>
    <DialogDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
      View customer information and booking history
    </DialogDescription>
  </DialogHeader>
  <div className="px-8 py-6">
    {selectedCustomer && (
      <div className="space-y-8">
        {/* Customer Info */}
        <section>
          <h3 className="font-semibold text-base mb-3 text-cyan-700 dark:text-cyan-300">Personal Information</h3>
          <div className="grid gap-3 bg-gray-50 dark:bg-[#232E3D] p-4 rounded-xl border border-border">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
              <span className="text-base font-medium break-all">{selectedCustomer.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
              <span className="text-base">{selectedCustomer.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
              <span className="text-base">{selectedCustomer.address}</span>
            </div>
          </div>
        </section>
        {/* Stats */}
        <section>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#232E3D] p-4 rounded-xl border border-border flex flex-col items-start">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Member Since</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-cyan-100">{selectedCustomer.joinDate}</span>
            </div>
            <div className="bg-white dark:bg-[#232E3D] p-4 rounded-xl border border-border flex flex-col items-start">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Last Booking</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-cyan-100">{selectedCustomer.lastBooking}</span>
            </div>
            <div className="bg-white dark:bg-[#232E3D] p-4 rounded-xl border border-border flex flex-col items-start">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Bookings</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-cyan-100">{selectedCustomer.totalBookings}</span>
            </div>
            <div className="bg-white dark:bg-[#232E3D] p-4 rounded-xl border border-border flex flex-col items-start">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Spent</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-cyan-100">{selectedCustomer.totalSpent}</span>
            </div>
          </div>
        </section>
        {/* Actions */}
        <section className="flex gap-2 pt-2">
          <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow" size="lg">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </section>
      </div>
    )}
  </div>
</DialogContent>
</Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditCustomer} onOpenChange={setShowEditCustomer}>
        <DialogContent className="sm:max-w-[500px] bg-gray-900/95 backdrop-blur-xl border-cyan-500/30 text-white">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update the customer's information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                placeholder="John Doe"
                value={editCustomer.name}
                onChange={(e) => setEditCustomer({ ...editCustomer, name: e.target.value })}
                className="text-black"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="john@example.com"
                  className="pl-10 text-black"
                  value={editCustomer.email}
                  onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-phone"
                  placeholder="(555) 123-4567"
                  className="pl-10 text-black"
                  value={editCustomer.phone}
                  onChange={(e) => setEditCustomer({ ...editCustomer, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-address"
                  placeholder="123 Main St, Chicago, IL"
                  className="pl-10 text-black"
                  value={editCustomer.address}
                  onChange={(e) => setEditCustomer({ ...editCustomer, address: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editCustomer.status}
                onValueChange={(v) => setEditCustomer({ ...editCustomer, status: v as Customer["status"] })}
              >
                <SelectTrigger className="text-black">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowEditCustomer(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={!editCustomer.name || !editCustomer.email || !editCustomer.phone}
              style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={(open) => {
        setShowAddCustomer(open);
        if (!open && searchParams.get('add') === 'true') {
          router.push('/admin/customers');
        }
      }}>
        <DialogContent className="sm:max-w-[500px] bg-gray-900/95 backdrop-blur-xl border-cyan-500/30 text-white">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter the customer's information to create a new account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                className="text-black"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className="pl-10 text-black"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="(555) 123-4567"
                  className="pl-10 text-black"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  placeholder="123 Main St, Chicago, IL"
                  className="pl-10 text-black"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddCustomer}
              disabled={!newCustomer.name || !newCustomer.email || !newCustomer.phone}
              style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
