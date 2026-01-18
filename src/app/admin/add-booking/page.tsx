"use client";

import { supabase } from '@/lib/supabaseClient';
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Minus, Search, X, User } from "lucide-react";

const BOOKINGS_STORAGE_KEY = "adminBookings";
const CUSTOMERS_STORAGE_KEY = "adminCustomers";

const SERVICE_COSTS: Record<string, number> = {
  "Standard Cleaning": 120,
  "Deep Cleaning": 250,
  "Move In/Out Cleaning": 350,
  "Office Cleaning": 200,
  "Carpet Cleaning": 180,
};

type Extra = {
  id: number;
  name: string;
  time: number; // in minutes
  serviceCategory: string;
  price: number;
  display: "frontend-backend-admin" | "backend-admin" | "admin-only" | "Both" | "Booking" | "Quote"; // Support legacy values
  qtyBased: boolean;
  exemptFromDiscount?: boolean;
  description?: string;
  serviceChecklists?: string[];
};

type Provider = {
  id: string;
  name: string;
  available: boolean;
  rating?: number;
  specialties?: string[];
  wage?: number;
  wageType?: 'percentage' | 'fixed' | 'hourly';
};

type ProviderWithWage = Provider & {
  tempWage?: number;
  tempWageType?: 'percentage' | 'fixed' | 'hourly';
};

type FrequencyRow = {
  id: number;
  name: string;
  display: "Both" | "Booking" | "Quote";
  isDefault?: boolean;
  discount?: number;
  discountType?: "%" | "$";
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  joinDate?: string;
  totalBookings?: number;
  totalSpent?: string;
  status?: string;
  lastBooking?: string;
};

const INDUSTRY_NAME = "Home Cleaning";
const FALLBACK_INDUSTRY_NAME = "Industry";
const FREQUENCY_STORAGE_KEYS = [
  `frequencies_${INDUSTRY_NAME}`,
  `frequencies_${FALLBACK_INDUSTRY_NAME}`,
];
const EXTRAS_STORAGE_KEYS = [
  `extras_${INDUSTRY_NAME}`,
  `extras_${FALLBACK_INDUSTRY_NAME}`,
];

const createEmptyBookingForm = () => ({
  customerType: "new",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  service: "",
  date: "",
  time: "",
  duration: "02",
  durationUnit: "Hours",
  frequency: "",
  bathroom: "",
  sqFt: "",
  bedroom: "",
  selectedExtras: [] as number[],
  privateBookingNotes: [] as string[],
  privateCustomerNotes: [] as string[],
  serviceProviderNotes: [] as string[],
  privateBookingNote: "",
  privateCustomerNote: "",
  serviceProviderNote: "",
  notifyMoreTime: false,
  address: "",
  zipCode: "",
  serviceProvider: "",
  waitingList: false,
  scheduleType: "From Schedule",
  selectedDate: "",
  selectedTime: "",
  priority: "Medium",
  paymentMethod: "",
  notes: "",
  adjustServiceTotal: false,
  adjustPrice: false,
  excludeCancellationFee: false,
  excludeMinimumFee: false,
  excludeCustomerNotification: false,
  excludeProviderNotification: false,
});

export default function AddBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [newBooking, setNewBooking] = useState(createEmptyBookingForm());
  const [errors, setErrors] = useState({
    firstName: false,
    lastName: false,
    email: false,
    service: false,
    date: false,
    time: false,
    address: false,
  });
  const [frequencies, setFrequencies] = useState<FrequencyRow[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [allProviders] = useState<Provider[]>([
    { id: "1", name: "John Smith", available: true, rating: 4.8, specialties: ["Standard Cleaning", "Deep Cleaning"], wage: 25, wageType: "hourly" },
    { id: "2", name: "Sarah Johnson", available: true, rating: 4.9, specialties: ["Deep Cleaning", "Move In/Out"], wage: 30, wageType: "percentage" },
    { id: "3", name: "Mike Davis", available: false, rating: 4.7, specialties: ["Office Cleaning"], wage: 150, wageType: "fixed" },
    { id: "4", name: "Emily Wilson", available: true, rating: 4.6, specialties: ["Carpet Cleaning", "Standard Cleaning"], wage: 20, wageType: "hourly" },
    { id: "5", name: "David Brown", available: true, rating: 4.5, specialties: ["Window Cleaning"], wage: 35, wageType: "percentage" },
  ]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showPrivateBookingNote, setShowPrivateBookingNote] = useState(false);
  const [showPrivateCustomerNote, setShowPrivateCustomerNote] = useState(false);
  const [showServiceProviderNote, setShowServiceProviderNote] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [showAllProvidersModal, setShowAllProvidersModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [providerWage, setProviderWage] = useState<string>('');
  const [providerWageType, setProviderWageType] = useState<'percentage' | 'fixed' | 'hourly'>('hourly');

  useEffect(() => {
    try {
      let visible: FrequencyRow[] | null = null;

      for (const key of FREQUENCY_STORAGE_KEYS) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        try {
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) continue;

          const rows = (parsed as FrequencyRow[]).filter(
            (r) => r && (r.display === "Both" || r.display === "Booking"),
          );

          if (rows.length === 0) continue;

          const defaultRows = rows.filter((r) => r.isDefault);
          visible = defaultRows.length > 0 ? defaultRows : rows;
          if (visible.length > 0) break;
        } catch {
          // ignore malformed localStorage for this key and keep checking others
        }
      }

      if (!visible || visible.length === 0) return;

      setFrequencies(visible);

      const first = visible[0];
      if (first) {
        setNewBooking((prev) =>
          prev.frequency ? prev : { ...prev, frequency: first.name },
        );
      }
    } catch {
      // ignore malformed localStorage
    }
  }, []);

  // Load extras from localStorage
  useEffect(() => {
    try {
      let visible: Extra[] | null = null;

      for (const key of EXTRAS_STORAGE_KEYS) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        try {
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) continue;

          const rows = (parsed as Extra[]).filter(
            (r) => r && (r.display === "frontend-backend-admin" || r.display === "Both" || r.display === "Booking"),
          );

          if (rows.length === 0) continue;

          visible = rows;
          if (visible.length > 0) break;
        } catch {
          // ignore malformed localStorage for this key and keep checking others
        }
      }

      if (visible && visible.length > 0) {
        setExtras(visible);
      }
    } catch {
      // ignore malformed localStorage
    }
  }, []);

  // Load customers from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
      if (stored) {
        const list: Customer[] = JSON.parse(stored);
        setCustomers(list);
      }
    } catch {
      // ignore malformed localStorage
    }
  }, []);

  // Handle query parameters for pre-filling customer information
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    const customerName = searchParams.get('customerName');
    const customerEmail = searchParams.get('customerEmail');
    
    if (customerId && customerName && customerEmail) {
      const nameParts = customerName.split(' ');
      setNewBooking(prev => ({
        ...prev,
        customerType: 'existing',
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: customerEmail
      }));
    }
  }, [searchParams]);

  // Handle customer search
  const handleCustomerSearch = (search: string) => {
    setCustomerSearch(search);
    if (search.trim() === "") {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }
    
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredCustomers(filtered);
    setShowCustomerDropdown(true);
  };

  // Handle customer selection
  const selectCustomer = (customer: Customer) => {
    const nameParts = customer.name.split(' ');
    setNewBooking(prev => ({
      ...prev,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || ''
    }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    setFilteredCustomers([]);
  };

  const estimatedCost = useMemo(() => {
    const cost = SERVICE_COSTS[newBooking.service as keyof typeof SERVICE_COSTS];
    return typeof cost === "number" ? cost : 0;
  }, [newBooking.service]);

  const discountedCost = useMemo(() => {
    const base = estimatedCost;
    if (!base) return 0;

    const freq = frequencies.find((f) => f.name === newBooking.frequency);
    if (!freq) return base;

    const rawDiscount = typeof freq.discount === "number" ? freq.discount : Number(freq.discount ?? 0);
    if (!rawDiscount || Number.isNaN(rawDiscount) || rawDiscount <= 0) return base;

    if (freq.discountType === "$") {
      const v = base - rawDiscount;
      return v < 0 ? 0 : v;
    }

    // Treat anything else (including undefined) as percentage
    const pct = rawDiscount;
    const v = base * (1 - pct / 100);
    return v < 0 ? 0 : v;
  }, [estimatedCost, frequencies, newBooking.frequency]);


const handleAddBooking = async (status: string = 'pending') => {
  // Validate required fields
  const nextErrors = {
    firstName: !newBooking.firstName.trim(),
    lastName: !newBooking.lastName.trim(),
    email: !newBooking.email.trim(),
    service: !newBooking.service.trim(),
    date: !newBooking.date.trim(),
    time: !newBooking.time.trim(),
    address: !newBooking.address.trim(),
  };

  const hasError = Object.values(nextErrors).some(Boolean);
  setErrors(nextErrors);

  if (hasError) {
    toast({
      title: "Error",
      description: "Please fill in all required fields",
      variant: "destructive",
    });
    return;
  }

  const customerName = `${newBooking.firstName} ${newBooking.lastName}`.trim();
  const customerEmail = newBooking.email.trim();
  const customerPhone = newBooking.phone.trim();

  try {
    // Get current user and their business
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to create bookings',
        variant: 'destructive',
      });
      return;
    }

    // Get the user's business (assuming they have one)
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (businessError || !business) {
      toast({
        title: 'Business Error',
        description: 'No business found for this user',
        variant: 'destructive',
      });
      return;
    }

    // Insert booking using the API endpoint
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-business-id': business.id,
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        service: newBooking.service,
        date: newBooking.date,
        time: newBooking.time,
        address: newBooking.address,
        status: status,
        amount: discountedCost,
        payment_method: newBooking.paymentMethod || null,
        notes: newBooking.notes,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Booking insertion error:', result);
      toast({
        title: 'Error',
        description: `Failed to add booking: ${result.error || 'Unknown error'}`,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Booking Added',
      description: `New booking created for ${customerName}`,
    });

    setTimeout(() => {
      router.push('/admin/bookings');
    }, 100);
  } catch (error) {
    console.error('Unexpected error:', error);
    toast({
      title: 'Error',
      description: 'An unexpected error occurred while creating the booking',
      variant: 'destructive',
    });
  }
};

  const handleCancel = () => {
    router.push("/admin/bookings");
  };

  const handleAddPrivateBookingNote = () => {
    if (newBooking.privateBookingNote.trim()) {
      setNewBooking(prev => ({
        ...prev,
        privateBookingNotes: [...prev.privateBookingNotes, prev.privateBookingNote],
        privateBookingNote: ""
      }));
      toast({
        title: "Note Added",
        description: "Private booking note has been added.",
      });
    }
  };

  const handleAddPrivateCustomerNote = () => {
    if (newBooking.privateCustomerNote.trim()) {
      setNewBooking(prev => ({
        ...prev,
        privateCustomerNotes: [...prev.privateCustomerNotes, prev.privateCustomerNote],
        privateCustomerNote: ""
      }));
      toast({
        title: "Note Added",
        description: "Private customer note has been added.",
      });
    }
  };

  const handleAddServiceProviderNote = () => {
    if (newBooking.serviceProviderNote.trim()) {
      setNewBooking(prev => ({
        ...prev,
        serviceProviderNotes: [...prev.serviceProviderNotes, prev.serviceProviderNote],
        serviceProviderNote: ""
      }));
      toast({
        title: "Note Added",
        description: "Service provider note has been added.",
      });
    }
  };

  const handleDeletePrivateBookingNote = (index: number) => {
    setNewBooking(prev => ({
      ...prev,
      privateBookingNotes: prev.privateBookingNotes.filter((_, i) => i !== index)
    }));
    toast({
      title: "Note Deleted",
      description: "Private booking note has been removed.",
    });
  };

  const handleDeletePrivateCustomerNote = (index: number) => {
    setNewBooking(prev => ({
      ...prev,
      privateCustomerNotes: prev.privateCustomerNotes.filter((_, i) => i !== index)
    }));
    toast({
      title: "Note Deleted",
      description: "Private customer note has been removed.",
    });
  };

  // Filter available providers based on selected date and time
  useEffect(() => {
    if (newBooking.selectedDate && newBooking.selectedTime) {
      // Filter providers who are available
      const available = allProviders.filter(provider => provider.available);
      setAvailableProviders(available);
      
      // Auto-select first available provider
      if (available.length > 0 && !selectedProvider) {
        setSelectedProvider(available[0]);
        setNewBooking(prev => ({ ...prev, serviceProvider: available[0].id }));
      }
    } else {
      setAvailableProviders([]);
      setSelectedProvider(null);
      setNewBooking(prev => ({ ...prev, serviceProvider: '' }));
    }
  }, [newBooking.selectedDate, newBooking.selectedTime]);

  const handleAssignProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setNewBooking(prev => ({ ...prev, serviceProvider: provider.id }));
    // Set wage and wage type from provider data
    setProviderWage(provider.wage?.toString() || '');
    setProviderWageType(provider.wageType || 'hourly');
    setShowAllProvidersModal(false);
    toast({
      title: 'Provider Assigned',
      description: `${provider.name} has been assigned to this booking.`,
    });
  };

  // Helper function to get provider initials
  const getProviderInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDeleteServiceProviderNote = (index: number) => {
    setNewBooking(prev => ({
      ...prev,
      serviceProviderNotes: prev.serviceProviderNotes.filter((_, i) => i !== index)
    }));
    toast({
      title: "Note Deleted",
      description: "Service provider note has been removed.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_2fr]">
        {/* Summary Sidebar - Now on the LEFT */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Industry</span>
                <span className="font-medium">Home Cleaning</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{newBooking.service || ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-medium">{newBooking.frequency || "One-time"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Length</span>
                <span className="font-medium">{newBooking.duration} {newBooking.durationUnit === "Hours" ? "Hr" : "Min"} {newBooking.duration !== "01" && newBooking.durationUnit === "Hours" ? "0 Min" : ""}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Total</span>
                <span className="font-medium">${estimatedCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discounted Total</span>
                <span className="font-medium">${discountedCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>TOTAL</span>
                <span>${discountedCost.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Note Cards */}
          <div className="space-y-3">
            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 px-4">
                <CardTitle className="text-base font-medium text-white">Private Booking Note</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrivateBookingNote(!showPrivateBookingNote)}
                  className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900 ml-auto"
                >
                  {showPrivateBookingNote ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showPrivateBookingNote && (
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Add private booking note..."
                        value={newBooking.privateBookingNote}
                        onChange={(e) => setNewBooking({ ...newBooking, privateBookingNote: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPrivateBookingNote()}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddPrivateBookingNote}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {newBooking.privateBookingNotes.length > 0 && (
                      <div className="space-y-2">
                        {newBooking.privateBookingNotes.map((note, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm border">
                            <span className="flex-1">{note}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePrivateBookingNote(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 px-4">
                <CardTitle className="text-base font-medium text-white">Private Customer Note</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrivateCustomerNote(!showPrivateCustomerNote)}
                  className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900 ml-auto"
                >
                  {showPrivateCustomerNote ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showPrivateCustomerNote && (
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Add private customer note..."
                        value={newBooking.privateCustomerNote}
                        onChange={(e) => setNewBooking({ ...newBooking, privateCustomerNote: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPrivateCustomerNote()}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddPrivateCustomerNote}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {newBooking.privateCustomerNotes.length > 0 && (
                      <div className="space-y-2">
                        {newBooking.privateCustomerNotes.map((note, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm border">
                            <span className="flex-1">{note}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePrivateCustomerNote(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 px-4">
                <CardTitle className="text-base font-medium text-white">Note For Service Provider</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowServiceProviderNote(!showServiceProviderNote)}
                  className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900 ml-auto"
                >
                  {showServiceProviderNote ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showServiceProviderNote && (
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Add note for service provider..."
                        value={newBooking.serviceProviderNote}
                        onChange={(e) => setNewBooking({ ...newBooking, serviceProviderNote: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddServiceProviderNote()}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddServiceProviderNote}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {newBooking.serviceProviderNotes.length > 0 && (
                      <div className="space-y-2">
                        {newBooking.serviceProviderNotes.map((note, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm border">
                            <span className="flex-1">{note}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteServiceProviderNote(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Exclude Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclude-cancellation-fee"
                checked={newBooking.excludeCancellationFee}
                onCheckedChange={(checked) => setNewBooking({ ...newBooking, excludeCancellationFee: !!checked })}
              />
              <Label htmlFor="exclude-cancellation-fee" className="text-sm text-white">Exclude cancellation fee</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclude-minimum-fee"
                checked={newBooking.excludeMinimumFee}
                onCheckedChange={(checked) => setNewBooking({ ...newBooking, excludeMinimumFee: !!checked })}
              />
              <Label htmlFor="exclude-minimum-fee" className="text-sm text-white">Exclude minimum fee</Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-full">
            <Button
              onClick={() => handleAddBooking('pending')}
              className="text-white w-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
              style={{ backgroundColor: '#10B981' }}
            >
              Save Booking
            </Button>
            <Button
              onClick={() => handleAddBooking('draft')}
              className="text-white w-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
              style={{ backgroundColor: '#A7B3D1' }}
            >
              Save As Draft
            </Button>
            <Button
              onClick={() => handleAddBooking('quote')}
              className="text-white w-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
              style={{ backgroundColor: '#F5A250' }}
            >
              Save As Quote
            </Button>
          </div>
        </div>

        {/* Customer Details - Now on the RIGHT */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Type Selection */}
            <div>
              <RadioGroup
                value={newBooking.customerType}
                onValueChange={(value) => {
                  setNewBooking({ ...newBooking, customerType: value });
                  if (value === 'new') {
                    setCustomerSearch('');
                    setShowCustomerDropdown(false);
                  }
                }}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new-customer" />
                  <Label htmlFor="new-customer" className="font-medium">New customer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing-customer" />
                  <Label htmlFor="existing-customer" className="font-medium">Existing customer</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Customer Search - Only show when existing customer is selected */}
            {newBooking.customerType === 'existing' && (
              <div className="relative">
                <Label htmlFor="customer-search" className="text-sm font-medium mb-2 block">Search Customer</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-search"
                    placeholder="Search by name or email..."
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    onFocus={() => customerSearch && setShowCustomerDropdown(true)}
                    className="pl-10"
                  />
                </div>
                
                {/* Customer Dropdown */}
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => selectCustomer(customer)}
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                        {customer.phone && <div className="text-sm text-gray-500">{customer.phone}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Name Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium mb-2 block">First name</Label>
                <Input
                  id="firstName"
                  placeholder="Enter your first name"
                  value={newBooking.firstName}
                  onChange={(e) => {
                    setNewBooking({ ...newBooking, firstName: e.target.value });
                    setErrors(prev => ({ ...prev, firstName: false }));
                  }}
                  className={errors.firstName ? "border-red-500" : ""}
                  disabled={newBooking.customerType === 'existing'}
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium mb-2 block">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
                  value={newBooking.lastName}
                  onChange={(e) => {
                    setNewBooking({ ...newBooking, lastName: e.target.value });
                    setErrors(prev => ({ ...prev, lastName: false }));
                  }}
                  className={errors.lastName ? "border-red-500" : ""}
                  disabled={newBooking.customerType === 'existing'}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium mb-2 block">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={newBooking.email}
                onChange={(e) => {
                  setNewBooking({ ...newBooking, email: e.target.value });
                  setErrors(prev => ({ ...prev, email: false }));
                }}
                className={errors.email ? "border-red-500" : ""}
                disabled={newBooking.customerType === 'existing'}
              />
            </div>

            {/* Time Duration */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Select Time Duration</Label>
              <div className="flex gap-3">
                <Select value={newBooking.duration} onValueChange={(value) => setNewBooking({ ...newBooking, duration: value })}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">01</SelectItem>
                    <SelectItem value="02">02</SelectItem>
                    <SelectItem value="03">03</SelectItem>
                    <SelectItem value="04">04</SelectItem>
                    <SelectItem value="05">05</SelectItem>
                    <SelectItem value="06">06</SelectItem>
                    <SelectItem value="07">07</SelectItem>
                    <SelectItem value="08">08</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newBooking.durationUnit} onValueChange={(value) => setNewBooking({ ...newBooking, durationUnit: value })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Minutes">Minutes</SelectItem>
                    <SelectItem value="Hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 mt-3">
                <Checkbox
                  id="notify-more-time"
                  checked={newBooking.notifyMoreTime}
                  onCheckedChange={(checked) => setNewBooking({ ...newBooking, notifyMoreTime: !!checked })}
                />
                <Label htmlFor="notify-more-time" className="text-sm">Notify me if the job requires more time.</Label>
              </div>
            </div>

            {/* Frequency */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Frequency</Label>
              {frequencies.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {frequencies.map((freq) => (
                    <Button
                      key={freq.id}
                      type="button"
                      variant={newBooking.frequency === freq.name ? "default" : "outline"}
                      onClick={() =>
                        setNewBooking((prev) => ({ ...prev, frequency: freq.name }))
                      }
                      className={
                        newBooking.frequency === freq.name
                          ? "bg-cyan-100 border-cyan-400 text-cyan-700 hover:bg-cyan-200 transition-all duration-200"
                          : "hover:bg-cyan-100 hover:border-cyan-400 hover:text-cyan-700 transition-all duration-200"
                      }
                    >
                      {freq.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={newBooking.frequency === "One-time" ? "default" : "outline"}
                    onClick={() =>
                      setNewBooking((prev) => ({ ...prev, frequency: "One-time" }))
                    }
                    className={
                      newBooking.frequency === "One-time"
                        ? "bg-cyan-100 border-cyan-400 text-cyan-700 hover:bg-cyan-200 transition-all duration-200"
                        : "hover:bg-cyan-100 hover:border-cyan-400 hover:text-cyan-700 transition-all duration-200"
                    }
                  >
                    One-time
                  </Button>
                  <Button
                    type="button"
                    variant={newBooking.frequency === "Every 4 weeks" ? "default" : "outline"}
                    onClick={() =>
                      setNewBooking((prev) => ({ ...prev, frequency: "Every 4 weeks" }))
                    }
                    className={
                      newBooking.frequency === "Every 4 weeks"
                        ? "bg-cyan-100 border-cyan-400 text-cyan-700 hover:bg-cyan-200 transition-all duration-200"
                        : "hover:bg-cyan-100 hover:border-cyan-400 hover:text-cyan-700 transition-all duration-200"
                    }
                  >
                    Every 4 weeks
                  </Button>
                </div>
              )}
            </div>

            
            {/* Bathroom, Sq Ft, Bedroom */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="bathroom" className="text-sm font-medium mb-2 block">Bathroom</Label>
                <Input
                  id="bathroom"
                  type="number"
                  placeholder="Number of bathrooms"
                  value={newBooking.bathroom}
                  onChange={(e) => setNewBooking({ ...newBooking, bathroom: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sqFt" className="text-sm font-medium mb-2 block">Sq Ft</Label>
                <Input
                  id="sqFt"
                  type="number"
                  placeholder="Square footage"
                  value={newBooking.sqFt}
                  onChange={(e) => setNewBooking({ ...newBooking, sqFt: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="bedroom" className="text-sm font-medium mb-2 block">Bedroom</Label>
                <Input
                  id="bedroom"
                  type="number"
                  placeholder="Number of bedrooms"
                  value={newBooking.bedroom}
                  onChange={(e) => setNewBooking({ ...newBooking, bedroom: e.target.value })}
                />
              </div>
            </div>

            {/* Extras */}
            {extras.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-3 block">Extras</Label>
                <div className={`grid gap-2 ${extras.length > 3 ? 'md:grid-cols-3' : 'grid-cols-1'}`}>
                  {extras.map((extra) => (
                    <div key={extra.id} className="flex items-center p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`extra-${extra.id}`}
                          checked={newBooking.selectedExtras?.includes(extra.id) || false}
                          onCheckedChange={(checked) => {
                            const currentExtras = newBooking.selectedExtras || [];
                            if (checked) {
                              setNewBooking(prev => ({
                                ...prev,
                                selectedExtras: [...currentExtras, extra.id]
                              }));
                            } else {
                              setNewBooking(prev => ({
                                ...prev,
                                selectedExtras: currentExtras.filter(id => id !== extra.id)
                              }));
                            }
                          }}
                        />
                        <div>
                          <div className="font-medium">{extra.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {extra.serviceCategory}
                            {extra.qtyBased && " • Quantity based"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking Adjustments */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Booking Adjustments</h3>
              <div className="space-y-4">
                {/* Adjustment Checkboxes */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="adjust-service-total"
                      checked={newBooking.adjustServiceTotal}
                      onCheckedChange={(checked) => setNewBooking({ ...newBooking, adjustServiceTotal: !!checked })}
                    />
                    <Label htmlFor="adjust-service-total" className="text-sm text-white">Do you want to adjust service total?</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="adjust-price"
                      checked={newBooking.adjustPrice}
                      onCheckedChange={(checked) => setNewBooking({ ...newBooking, adjustPrice: !!checked })}
                    />
                    <Label htmlFor="adjust-price" className="text-sm text-white">Do you want to adjust price?</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="zipCode" className="text-sm font-medium mb-2 block text-white">Zip Code</Label>
                  <Input
                    id="zipCode"
                    placeholder="Enter zip code"
                    value={newBooking.zipCode}
                    onChange={(e) => setNewBooking({ ...newBooking, zipCode: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Service Provider</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="waiting-list"
                    checked={newBooking.waitingList}
                    onCheckedChange={(checked) => setNewBooking({ ...newBooking, waitingList: !!checked })}
                  />
                  <Label htmlFor="waiting-list" className="text-sm text-white">Waiting List</Label>
                </div>
                
                {newBooking.waitingList && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block text-white">Priority</Label>
                    <RadioGroup
                      value={newBooking.priority}
                      onValueChange={(value) => setNewBooking({ ...newBooking, priority: value })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Low" id="priority-low" />
                        <Label htmlFor="priority-low" className="text-sm text-white">Low</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Medium" id="priority-medium" />
                        <Label htmlFor="priority-medium" className="text-sm text-white">Medium</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="High" id="priority-high" />
                        <Label htmlFor="priority-high" className="text-sm text-white">High</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="selected-date" className="text-sm font-medium mb-2 block text-white">Select Date</Label>
                    <Input
                      id="selected-date"
                      type="date"
                      value={newBooking.selectedDate}
                      onChange={(e) => setNewBooking({ ...newBooking, selectedDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="selected-time" className="text-sm font-medium mb-2 block text-white">Select Arrival Time</Label>
                    <Select value={newBooking.selectedTime} onValueChange={(value) => setNewBooking({ ...newBooking, selectedTime: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="--:-- --" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        <SelectItem value="06:00">06:00 AM</SelectItem>
                        <SelectItem value="06:30">06:30 AM</SelectItem>
                        <SelectItem value="07:00">07:00 AM</SelectItem>
                        <SelectItem value="07:30">07:30 AM</SelectItem>
                        <SelectItem value="08:00">08:00 AM</SelectItem>
                        <SelectItem value="08:30">08:30 AM</SelectItem>
                        <SelectItem value="09:00">09:00 AM</SelectItem>
                        <SelectItem value="09:30">09:30 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="10:30">10:30 AM</SelectItem>
                        <SelectItem value="11:00">11:00 AM</SelectItem>
                        <SelectItem value="11:30">11:30 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="12:30">12:30 PM</SelectItem>
                        <SelectItem value="13:00">01:00 PM</SelectItem>
                        <SelectItem value="13:30">01:30 PM</SelectItem>
                        <SelectItem value="14:00">02:00 PM</SelectItem>
                        <SelectItem value="14:30">02:30 PM</SelectItem>
                        <SelectItem value="15:00">03:00 PM</SelectItem>
                        <SelectItem value="15:30">03:30 PM</SelectItem>
                        <SelectItem value="16:00">04:00 PM</SelectItem>
                        <SelectItem value="16:30">04:30 PM</SelectItem>
                        <SelectItem value="17:00">05:00 PM</SelectItem>
                        <SelectItem value="17:30">05:30 PM</SelectItem>
                        <SelectItem value="18:00">06:00 PM</SelectItem>
                        <SelectItem value="18:30">06:30 PM</SelectItem>
                        <SelectItem value="19:00">07:00 PM</SelectItem>
                        <SelectItem value="19:30">07:30 PM</SelectItem>
                        <SelectItem value="20:00">08:00 PM</SelectItem>
                        <SelectItem value="20:30">08:30 PM</SelectItem>
                        <SelectItem value="21:00">09:00 PM</SelectItem>
                        <SelectItem value="21:30">09:30 PM</SelectItem>
                        <SelectItem value="22:00">10:00 PM</SelectItem>
                        <SelectItem value="22:30">10:30 PM</SelectItem>
                        <SelectItem value="23:00">11:00 PM</SelectItem>
                        <SelectItem value="23:30">11:30 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                    {/* Available Provider Display */}
                {newBooking.selectedDate && newBooking.selectedTime && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block text-white">Available Provider</Label>
                    {selectedProvider ? (
                      <div className="p-3 border border-cyan-200 bg-cyan-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {getProviderInitials(selectedProvider.name)}
                            </div>
                            <div>
                              <div className="font-medium text-black">{selectedProvider.name}</div>
                              <div className="grid gap-2 mt-2">
                                <div className="flex gap-2 items-center">
                                  <div className="text-sm text-black">Wage</div>
                                  <Input
                                    type="number"
                                    placeholder="Amount"
                                    value={providerWage}
                                    onChange={(e) => setProviderWage(e.target.value)}
                                    className="flex-1 h-8 text-sm"
                                  />
                                  <Select value={providerWageType} onValueChange={(value: 'percentage' | 'fixed' | 'hourly') => setProviderWageType(value)}>
                                    <SelectTrigger className="w-24 h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="percentage">%</SelectItem>
                                      <SelectItem value="fixed">$</SelectItem>
                                      <SelectItem value="hourly">/hr</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {availableProviders.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAllProvidersModal(true)}
                                className="text-xs"
                              >
                                {`See All (${availableProviders.length})`}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 border border-gray-200 bg-gray-50 rounded-lg">
                        <div className="text-gray-500">No available providers for selected date and time</div>
                      </div>
                    )}
                    
                    {/* All Providers Modal */}
                    <Dialog open={showAllProvidersModal} onOpenChange={setShowAllProvidersModal}>
                      <DialogContent className="sm:max-w-[800px]">
                        <DialogHeader>
                          <DialogTitle>All Available Providers</DialogTitle>
                          <DialogDescription>Select a provider from the list below.</DialogDescription>
                        </DialogHeader>
                        <div className="mt-3 space-y-2">
                          <div className="grid grid-cols-3 gap-4">
                            {availableProviders.map((provider) => (
                              <div
                                key={provider.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedProvider?.id === provider.id
                                    ? 'border-cyan-300 bg-cyan-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => {
                                  handleAssignProvider(provider);
                                  setShowAllProvidersModal(false);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                                      selectedProvider?.id === provider.id
                                        ? 'bg-cyan-600'
                                        : 'bg-gray-400'
                                    }`}>
                                      {getProviderInitials(provider.name)}
                                    </div>
                                    <div>
                                      <div className="font-medium">{provider.name}</div>
                                    </div>
                                  </div>
                                  {selectedProvider?.id === provider.id && (
                                    <div className="text-black text-sm font-medium">Selected</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                    
                    <div>
                      <Label htmlFor="service" className="text-sm font-medium mb-2 block text-white">Service Type</Label>
                      <Select value={newBooking.service} onValueChange={(value) => { setNewBooking({ ...newBooking, service: value }); setErrors(prev => ({ ...prev, service: false })); }}>
                        <SelectTrigger className={errors.service ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Standard Cleaning">Standard Cleaning</SelectItem>
                          <SelectItem value="Deep Cleaning">Deep Cleaning</SelectItem>
                          <SelectItem value="Move In/Out Cleaning">Move In/Out Cleaning</SelectItem>
                          <SelectItem value="Office Cleaning">Office Cleaning</SelectItem>
                          <SelectItem value="Carpet Cleaning">Carpet Cleaning</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="date" className="text-sm font-medium mb-2 block text-white">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newBooking.date}
                          onChange={(e) => {
                            setNewBooking({ ...newBooking, date: e.target.value });
                            setErrors(prev => ({ ...prev, date: false }));
                          }}
                          className={errors.date ? "border-red-500" : ""}
                        />
                      </div>
                      <div>
                        <Label htmlFor="time" className="text-sm font-medium mb-2 block text-white">Time</Label>
                        <Select value={newBooking.time} onValueChange={(value) => { setNewBooking({ ...newBooking, time: value }); setErrors(prev => ({ ...prev, time: false })); }}>
                          <SelectTrigger className={errors.time ? "border-red-500" : ""}>
                            <SelectValue placeholder="--:-- --" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            <SelectItem value="06:00">06:00 AM</SelectItem>
                            <SelectItem value="06:30">06:30 AM</SelectItem>
                            <SelectItem value="07:00">07:00 AM</SelectItem>
                            <SelectItem value="07:30">07:30 AM</SelectItem>
                            <SelectItem value="08:00">08:00 AM</SelectItem>
                            <SelectItem value="08:30">08:30 AM</SelectItem>
                            <SelectItem value="09:00">09:00 AM</SelectItem>
                            <SelectItem value="09:30">09:30 AM</SelectItem>
                            <SelectItem value="10:00">10:00 AM</SelectItem>
                            <SelectItem value="10:30">10:30 AM</SelectItem>
                            <SelectItem value="11:00">11:00 AM</SelectItem>
                            <SelectItem value="11:30">11:30 AM</SelectItem>
                            <SelectItem value="12:00">12:00 PM</SelectItem>
                            <SelectItem value="12:30">12:30 PM</SelectItem>
                            <SelectItem value="13:00">01:00 PM</SelectItem>
                            <SelectItem value="13:30">01:30 PM</SelectItem>
                            <SelectItem value="14:00">02:00 PM</SelectItem>
                            <SelectItem value="14:30">02:30 PM</SelectItem>
                            <SelectItem value="15:00">03:00 PM</SelectItem>
                            <SelectItem value="15:30">03:30 PM</SelectItem>
                            <SelectItem value="16:00">04:00 PM</SelectItem>
                            <SelectItem value="16:30">04:30 PM</SelectItem>
                            <SelectItem value="17:00">05:00 PM</SelectItem>
                            <SelectItem value="17:30">05:30 PM</SelectItem>
                            <SelectItem value="18:00">06:00 PM</SelectItem>
                            <SelectItem value="18:30">06:30 PM</SelectItem>
                            <SelectItem value="19:00">07:00 PM</SelectItem>
                            <SelectItem value="19:30">07:30 PM</SelectItem>
                            <SelectItem value="20:00">08:00 PM</SelectItem>
                            <SelectItem value="20:30">08:30 PM</SelectItem>
                            <SelectItem value="21:00">09:00 PM</SelectItem>
                            <SelectItem value="21:30">09:30 PM</SelectItem>
                            <SelectItem value="22:00">10:00 PM</SelectItem>
                            <SelectItem value="22:30">10:30 PM</SelectItem>
                            <SelectItem value="23:00">11:00 PM</SelectItem>
                            <SelectItem value="23:30">11:30 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
            </div>
            <div>
              <Label htmlFor="address" className="text-sm font-medium mb-2 block text-white">Service Address</Label>
              <Input
                    id="address"
                    placeholder="Enter service address"
                    value={newBooking.address}
                    onChange={(e) => {
                      setNewBooking({ ...newBooking, address: e.target.value });
                      setErrors(prev => ({ ...prev, address: false }));
                    }}
                    className={errors.address ? "border-red-500" : ""}
                  />
                </div>
                <div>
                  <Label htmlFor="payment" className="text-sm font-medium mb-2 block text-white">Payment Method</Label>
                  <Select value={newBooking.paymentMethod} onValueChange={(value) => setNewBooking({ ...newBooking, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium mb-2 block">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Add any special instructions"
                    value={newBooking.notes}
                    onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                  />
                </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
