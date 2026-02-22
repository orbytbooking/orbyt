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
import { useLogo } from "@/contexts/LogoContext";
import { 
  Search, 
  Download,
  Upload,
  Eye,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  UserPlus,
  UserMinus,
  Ban,
  Plus,
  Info
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  useLogo();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>(defaultCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editCustomer, setEditCustomer] = useState({
    id: "",
    company: "",
    firstName: "",
    lastName: "",
    gender: "unspecified" as string,
    email: "",
    phone: "",
    smsReminders: true,
    address: "",
    aptNo: "",
    notes: "",
    status: "active" as Customer["status"],
  });
  const CUSTOMER_EXTRAS_KEY = "adminCustomerExtras";
  const [newCustomer, setNewCustomer] = useState({
    company: "",
    firstName: "",
    lastName: "",
    gender: "unspecified",
    email: "",
    phone: "",
    smsReminders: true,
    address: "",
    aptNo: "",
    notes: "",
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    setCustomers([]); // Clear old data when business changes
    if (!currentBusiness?.id) return;
    fetchCustomers();
  }, [currentBusiness?.id]); // Add dependency on business ID

  async function fetchCustomers() {
    if (!currentBusiness?.id) {
      console.log('Waiting for business context...');
      return;
    }
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', currentBusiness?.id)  // Add manual filtering like providers
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
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
  }, [customers]);

  const handleDeactivate = async (customer: Customer) => {
    const newStatus = customer.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCustomers((prev) => prev.map((c) => (c.id === customer.id ? { ...c, status: newStatus } : c)));
        toast({ title: newStatus === "inactive" ? "Customer Deactivated" : "Customer Reactivated", description: `${customer.name} has been ${newStatus}.` });
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update customer", variant: "destructive" });
    }
  };

  const handleBlockFromBooking = async (customer: Customer) => {
    const current = !!(customer as any).booking_blocked;
    const newVal = !current;
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_blocked: newVal }),
      });
      if (res.ok) {
        setCustomers((prev) => prev.map((c) => (c.id === customer.id ? { ...c, booking_blocked: newVal } : c)));
        toast({ title: newVal ? "Blocked From Booking" : "Unblocked", description: `${customer.name} has been ${newVal ? "blocked from booking" : "unblocked"}.` });
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update customer", variant: "destructive" });
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      String(customer.id || "").toLowerCase().includes(term) ||
      String(customer.name || "").toLowerCase().includes(term) ||
      String(customer.email || "").toLowerCase().includes(term) ||
      String(customer.phone || "").includes(searchTerm) ||
      String((customer as any).address || "").toLowerCase().includes(term);
    return matchesSearch;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE));
  const paginatedCustomers = filteredCustomers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const isNewCustomer = (c: Customer) => {
    const created = (c as any).created_at || c.joinDate;
    if (!created) return false;
    const d = new Date(created);
    const daysAgo = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    const parts = (customer.name || "").trim().split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    const addr = (customer as any).address ?? customer.address ?? "";
    const lastComma = addr.lastIndexOf(", ");
    const [mainAddr, apt] = lastComma >= 0
      ? [addr.slice(0, lastComma).trim(), addr.slice(lastComma + 2).trim()]
      : [addr, ""];
    let company = "", gender = "unspecified", notes = "", smsReminders = true;
    try {
      const extrasRaw = typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_EXTRAS_KEY) : null;
      if (extrasRaw) {
        const map = JSON.parse(extrasRaw) as Record<string, any>;
        const ex = map[String(customer.id)];
        if (ex) {
          company = ex.company || "";
          gender = ex.gender || "unspecified";
          notes = ex.notes || "";
          smsReminders = ex.smsReminders !== false;
        }
      }
    } catch {}
    setEditCustomer({
      id: customer.id,
      company,
      firstName,
      lastName,
      gender,
      email: customer.email || "",
      phone: customer.phone || "",
      smsReminders,
      address: mainAddr.trim(),
      aptNo: apt.trim(),
      notes,
      status: customer.status || "active",
    });
    setShowEditCustomer(true);
  };

  const handleSaveEdit = async () => {
    const name = `${editCustomer.firstName} ${editCustomer.lastName}`.trim() || editCustomer.firstName || editCustomer.lastName || "Customer";
    const address = [editCustomer.address, editCustomer.aptNo].filter(Boolean).join(", #");
    try {
      const res = await fetch(`/api/admin/customers/${editCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: editCustomer.email,
          phone: editCustomer.phone,
          address: address || undefined,
          status: editCustomer.status,
        }),
      });
      if (res.ok) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === editCustomer.id
              ? { ...c, name, email: editCustomer.email, phone: editCustomer.phone, address: address || undefined, status: editCustomer.status }
              : c
          )
        );
        try {
          const extrasRaw = typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_EXTRAS_KEY) : null;
          const map = extrasRaw ? (JSON.parse(extrasRaw) as Record<string, unknown>) : {};
          (map as Record<string, unknown>)[String(editCustomer.id)] = {
            company: editCustomer.company,
            gender: editCustomer.gender,
            notes: editCustomer.notes,
            smsReminders: editCustomer.smsReminders,
          };
          localStorage.setItem(CUSTOMER_EXTRAS_KEY, JSON.stringify(map));
        } catch {}
        toast({ title: "Customer Updated", description: `${name} has been updated successfully.` });
        setShowEditCustomer(false);
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update customer", variant: "destructive" });
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    // Confirm deletion
    const confirmed = window.confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`);
    
    if (!confirmed) {
      return;
    }

    console.log('Attempting to delete customer:', customer.id, customer.name);

    // Delete from database
    const { error, data } = await supabase
      .from('customers')
      .delete()
      .eq('id', customer.id);

    console.log('Delete response:', { error, data });

    if (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: `Failed to delete customer: ${error.message}`,
        variant: "destructive"
      });
      return;
    }

    console.log('Customer successfully deleted from database');

    // Remove from local state
    setCustomers((prev) => prev.filter((c) => c.id !== customer.id));

    toast({
      title: "Customer Deleted",
      description: `${customer.name} has been deleted successfully.`,
    });
  };

  const handleAddCustomer = async () => {
    const name = `${newCustomer.firstName} ${newCustomer.lastName}`.trim();
    const address = [newCustomer.address, newCustomer.aptNo].filter(Boolean).join(", ");
    const now = new Date();
    const newEntry = {
      name: name || newCustomer.firstName || newCustomer.lastName || "Customer",
      email: newCustomer.email,
      phone: newCustomer.phone || "",
      address: address || "",
      join_date: now.toISOString().slice(0, 10),
      total_bookings: 0,
      total_spent: 0,
      status: "active",
      last_booking: null,
      business_id: currentBusiness?.id,
    };

    const { data, error } = await supabase.from("customers").insert([newEntry]).select("id").single();
    if (error) {
      console.error("Error adding customer:", error);
      toast({
        title: "Error",
        description: `Failed to add customer: ${error.message}`,
        variant: "destructive",
      });
      return;
    }

    if (data?.id && (newCustomer.notes || newCustomer.company || newCustomer.gender)) {
      try {
        const extrasRaw = typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_EXTRAS_KEY) : null;
        const map = extrasRaw ? (JSON.parse(extrasRaw) as Record<string, unknown>) : {};
        map[String(data.id)] = {
          company: newCustomer.company,
          gender: newCustomer.gender,
          notes: newCustomer.notes,
          smsReminders: newCustomer.smsReminders,
        };
        localStorage.setItem(CUSTOMER_EXTRAS_KEY, JSON.stringify(map));
      } catch {}
    }

    if (currentBusiness?.id) {
      try {
        await fetch('/api/admin/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'New customer',
            description: `${name || newCustomer.email} has been added.`,
            business_id: currentBusiness.id,
            link: data?.id ? `/admin/customers/${data.id}` : '/admin/customers',
          }),
        });
      } catch {
        // Non-blocking: notification creation failed
      }
    }

    toast({
      title: "Customer Added",
      description: `${name || newCustomer.email} has been added successfully.`,
    });

    setNewCustomer({
      company: "",
      firstName: "",
      lastName: "",
      gender: "unspecified",
      email: "",
      phone: "",
      smsReminders: true,
      address: "",
      aptNo: "",
      notes: "",
    });
    setShowAddCustomer(false);
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
      {/* Header: Search + Add New */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex-1 w-full max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone or address"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => setShowAddCustomer(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* All customers + Import/Export */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-lg font-semibold">All customers</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={() => toast({ title: "Import", description: "Import feature coming soon." })}>
            <Download className="h-4 w-4 mr-1" />
            Import
          </Button>
          <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => {
            const csv = ["Name,Email,Phone,Address"].concat(
              filteredCustomers.map((c) => `"${(c.name || "").replace(/"/g, '""')}","${(c.email || "").replace(/"/g, '""')}","${(c.phone || "").replace(/"/g, '""')}","${((c as any).address || "").replace(/"/g, '""')}"`)
            ).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "customers.csv";
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Exported", description: `${filteredCustomers.length} customers exported.` });
          }}>
            <Upload className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Note</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/admin/customers/${customer.id}`} className="flex items-center gap-3 group">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                          {customer.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground group-hover:text-cyan-600 group-hover:underline">{customer.name}</span>
                            {isNewCustomer(customer) && (
                              <Badge className="bg-green-100 text-green-700 text-xs">New</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{customer.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm">{customer.phone || "—"}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">—</td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Options
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/customers/${customer.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(customer)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeactivate(customer)}>
                            <UserMinus className="h-4 w-4 mr-2" />
                            {customer.status === "active" ? "Deactivate" : "Reactivate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBlockFromBooking(customer)}>
                            <Ban className="h-4 w-4 mr-2" />
                            {(customer as any).booking_blocked ? "Unblock From Booking" : "Block From Booking"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </Button>
              </div>
            </div>
          )}
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

      {/* Edit Customer Dialog - matches Add customer layout */}
      <Dialog open={showEditCustomer} onOpenChange={setShowEditCustomer}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit customer</DialogTitle>
            <DialogDescription>
              Update the customer&apos;s information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-company">Company name (optional)</Label>
                <Input
                  id="edit-company"
                  placeholder="Ex: Premierprocleaner"
                  value={editCustomer.company}
                  onChange={(e) => setEditCustomer({ ...editCustomer, company: e.target.value })}
                  className="rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First name</Label>
                  <Input
                    id="edit-firstName"
                    placeholder="Ex: James"
                    value={editCustomer.firstName}
                    onChange={(e) => setEditCustomer({ ...editCustomer, firstName: e.target.value })}
                    className="rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last name</Label>
                  <Input
                    id="edit-lastName"
                    placeholder="Ex: Lee"
                    value={editCustomer.lastName}
                    onChange={(e) => setEditCustomer({ ...editCustomer, lastName: e.target.value })}
                    className="rounded-md"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="flex items-center gap-6 mt-2 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="edit-gender" checked={editCustomer.gender === "male"} onChange={() => setEditCustomer({ ...editCustomer, gender: "male" })} className="w-4 h-4 accent-blue-500" />
                    Male
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="edit-gender" checked={editCustomer.gender === "female"} onChange={() => setEditCustomer({ ...editCustomer, gender: "female" })} className="w-4 h-4 accent-blue-500" />
                    Female
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="edit-gender" checked={editCustomer.gender === "unspecified"} onChange={() => setEditCustomer({ ...editCustomer, gender: "unspecified" })} className="w-4 h-4 accent-blue-500" />
                    Unspecified
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email address</Label>
                <Input id="edit-email" type="email" placeholder="Ex: example@xyz.com" value={editCustomer.email} onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })} className="rounded-md" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone no.</Label>
                <Input id="edit-phone" placeholder="Phone No." value={editCustomer.phone} onChange={(e) => setEditCustomer({ ...editCustomer, phone: e.target.value })} className="rounded-md" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editCustomer.smsReminders} onChange={(e) => setEditCustomer({ ...editCustomer, smsReminders: e.target.checked })} className="w-4 h-4 accent-blue-500 rounded" />
                Send me reminders via text message
              </label>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input id="edit-address" placeholder="Type Address" value={editCustomer.address} onChange={(e) => setEditCustomer({ ...editCustomer, address: e.target.value })} className="rounded-md" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-aptNo">Apt. no.</Label>
                <Input id="edit-aptNo" placeholder="#" value={editCustomer.aptNo} onChange={(e) => setEditCustomer({ ...editCustomer, aptNo: e.target.value })} className="rounded-md w-24" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editCustomer.status} onValueChange={(v) => setEditCustomer({ ...editCustomer, status: v as Customer["status"] })}>
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">Add private note <Info className="h-4 w-4 text-muted-foreground" /></Label>
              <Textarea placeholder="Add notes about this customer..." value={editCustomer.notes} onChange={(e) => setEditCustomer({ ...editCustomer, notes: e.target.value })} className="min-h-[180px] rounded-md resize-none" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditCustomer(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={(!editCustomer.firstName && !editCustomer.lastName) || !editCustomer.email} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={(open) => {
        setShowAddCustomer(open);
        if (!open && searchParams.get("add") === "true") {
          router.push("/admin/customers");
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add customer</DialogTitle>
            <DialogDescription>
              Creating a new customer profile here allows you to easily search for and add customer information to bookings. A profile will be created upon saving, and an invitation to create a password will be automatically sent out to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
            {/* Left column - Customer details */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company name (optional)</Label>
                <Input
                  id="company"
                  placeholder="Ex: Premierprocleaner"
                  value={newCustomer.company}
                  onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                  className="rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="Ex: James"
                    value={newCustomer.firstName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                    className="rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    placeholder="Ex: Lee"
                    value={newCustomer.lastName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                    className="rounded-md"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="flex items-center gap-6 mt-2 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={newCustomer.gender === "male"}
                      onChange={() => setNewCustomer({ ...newCustomer, gender: "male" })}
                      className="w-4 h-4 accent-blue-500"
                    />
                    Male
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={newCustomer.gender === "female"}
                      onChange={() => setNewCustomer({ ...newCustomer, gender: "female" })}
                      className="w-4 h-4 accent-blue-500"
                    />
                    Female
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={newCustomer.gender === "unspecified"}
                      onChange={() => setNewCustomer({ ...newCustomer, gender: "unspecified" })}
                      className="w-4 h-4 accent-blue-500"
                    />
                    Unspecified
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1.5">
                  Email address
                  <button type="button" className="text-blue-500 hover:text-blue-600" title="Add another email">
                    <Plus className="h-4 w-4" />
                  </button>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ex: example@xyz.com"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  Phone no.
                  <button type="button" className="text-blue-500 hover:text-blue-600" title="Add another phone">
                    <Plus className="h-4 w-4" />
                  </button>
                </Label>
                <Input
                  id="phone"
                  placeholder="Phone No."
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="rounded-md"
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCustomer.smsReminders}
                  onChange={(e) => setNewCustomer({ ...newCustomer, smsReminders: e.target.checked })}
                  className="w-4 h-4 accent-blue-500 rounded"
                />
                Send me reminders via text message
              </label>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Type Address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aptNo">Apt. no.</Label>
                <Input
                  id="aptNo"
                  placeholder="#"
                  value={newCustomer.aptNo}
                  onChange={(e) => setNewCustomer({ ...newCustomer, aptNo: e.target.value })}
                  className="rounded-md w-24"
                />
              </div>
            </div>
            {/* Right column - Private note */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                Add private note
                <Info className="h-4 w-4 text-muted-foreground" />
              </Label>
              <Textarea
                placeholder="Add notes about this customer..."
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                className="min-h-[180px] rounded-md resize-none"
              />
            </div>
          </div>
          <div className="border-t pt-4 space-y-3">
            <div>
              <h4 className="font-medium text-sm">Send invitation</h4>
              <p className="text-sm text-muted-foreground mt-1">
                An invite can be sent via email or SMS upon saving, allowing the customer to access and create a password for their new account. The password can be changed or reset on their behalf from their profile.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowAddCustomer(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddCustomer}
                disabled={(!newCustomer.firstName && !newCustomer.lastName) || !newCustomer.email}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
