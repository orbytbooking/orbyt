"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { UserMinus, ShieldBan, AlertCircle, BellOff, ChevronLeft, ChevronRight as ChevronRightIcon, Calendar as CalendarIcon, Search as SearchIcon, User as UserIcon, UserCheck, ShieldCheck, BellRing, FolderOpen, File, Upload, Download, Trash2, Image as ImageIcon, MoreVertical, Plus, X, FileText, FileVideo, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

const CUSTOMERS_STORAGE_KEY = "adminCustomers";

type FileItem = {
  id: string;
  name: string;
  type: "folder" | "file";
  fileType?: "document" | "image" | "video" | "other";
  size?: string;
  uploadedAt: string;
  url?: string;
  parentId?: string | null;
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

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ratingForm, setRatingForm] = useState({ provider: "", score: 5, comment: "" });
  const id = params?.id;
  const BOOKINGS_STORAGE_KEY = "adminBookings";
  const CUSTOMER_EXTRAS_KEY = "adminCustomerExtras"; // map of id -> extras
  const { toast } = useToast();
  type Booking = {
    id: string;
    customer: { name: string; email: string; phone?: string };
    service: string;
    date: string; // YYYY-MM-DD
    time: string;
    address?: string;
    status: string;
    amount?: string;
    provider?: { id?: string; name: string } | null;
  };
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [providerSearch, setProviderSearch] = useState("");
  const [calView, setCalView] = useState<"month" | "week" | "day">("month");
  const [profile, setProfile] = useState({
    company: "",
    firstName: "",
    lastName: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    smsReminders: false,
  });
  const [contacts, setContacts] = useState<{ name: string; email: string; phone: string }[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showContactsList, setShowContactsList] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "" });
  const [buttonStates, setButtonStates] = useState({
    isActive: true,
    isBlocked: false,
    isBookingBlocked: false,
    isSubscribed: true
  });
  const [invoices, setInvoices] = useState<{
    id: string;
    invoiceNumber: string;
    date: string;
    dueDate: string;
    amount: string;
    status: "paid" | "pending";
    description: string;
    bookingId?: string;
    booking?: Booking;
  }[]>([]);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    bookingId: "",
    date: "",
    dueDate: "",
    amount: "",
    description: ""
  });

  // Drive state variables
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<FileItem | null>(null);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.url && file.url.startsWith('blob:')) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
  }, [files]);

  // Notification state variables
  const [emailNotifications, setEmailNotifications] = useState<Record<string, boolean>>({
    "Booking cancellation": true,
    "Booking modified": true,
    "Booking reminder": true,
    "Charged fee": false,
    "Declined card": true,
    "Feedback email": false,
    "New booking email": true,
    "Referral accepted": true,
    "New invoice": true,
    "Update invoice": true,
  });

  const [smsNotifications, setSmsNotifications] = useState<Record<string, boolean>>({
    "Booking reminder": true,
    "Card declined": true,
    "New invoice": false,
    "Update invoice": false,
  });

  useEffect(() => {
    if (!id) return;
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
      if (stored) {
        const list: Customer[] = JSON.parse(stored);
        const found = list.find((c) => String(c.id) === String(id));
        if (found) setCustomer(found);
      }
      const storedBookings = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (storedBookings) {
        setAllBookings(JSON.parse(storedBookings) as Booking[]);
      }
      // load extras
      const extrasRaw = localStorage.getItem(CUSTOMER_EXTRAS_KEY);
      if (extrasRaw && typeof id === 'string') {
        const map = JSON.parse(extrasRaw) as Record<string, any>;
        const ex = map[id];
        if (ex) {
          setProfile((p)=>({
            ...p,
            company: ex.company || "",
            gender: ex.gender || "unspecified",
            notes: ex.notes || "",
            smsReminders: !!ex.smsReminders,
          }));
          if (Array.isArray(ex.contacts)) {
            setContacts(ex.contacts as {name:string;email:string;phone:string}[]);
          }
        }
      }
      // load invoices
      const invoicesRaw = localStorage.getItem(`customerInvoices_${id}`);
      if (invoicesRaw) {
        setInvoices(JSON.parse(invoicesRaw));
      }
      // load customer drive files
      const driveFilesRaw = localStorage.getItem(`customerDriveFiles_${id}`);
      if (driveFilesRaw) {
        setFiles(JSON.parse(driveFilesRaw));
      }
    } catch {}
  }, [id]);

  useEffect(() => {
    if (!customer) return;
    const parts = customer.name?.split(" ") ?? [];
    setProfile((p) => ({
      ...p,
      company: "",
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    }));
  }, [customer]);

  // Save drive files to localStorage whenever they change
  useEffect(() => {
    if (id && files.length > 0) {
      localStorage.setItem(`customerDriveFiles_${id}`, JSON.stringify(files));
    }
  }, [files, id]);

  // Drive helper functions
  const getFileType = (fileName: string): "document" | "image" | "video" | "other" => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")) {
      return "image";
    }
    if (["mp4", "avi", "mov", "wmv"].includes(extension || "")) {
      return "video";
    }
    if (["pdf", "doc", "docx", "txt", "xls", "xlsx"].includes(extension || "")) {
      return "document";
    }
    return "other";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleFileUpload = () => {
    if (!selectedFile || !id) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    const newFile: FileItem = {
      id: Date.now().toString(),
      name: selectedFile.name,
      type: "file",
      fileType: getFileType(selectedFile.name),
      size: formatFileSize(selectedFile.size),
      uploadedAt: new Date().toISOString(),
      url: URL.createObjectURL(selectedFile),
      parentId: null,
    };

    setFiles([...files, newFile]);
    setSelectedFile(null);
    setIsUploadDialogOpen(false);
    
    toast({
      title: "File Uploaded",
      description: `"${selectedFile.name}" has been uploaded successfully`,
    });
  };

  const handleDeleteFile = (fileId: string, fileName: string) => {
    setFiles(files.filter(f => f.id !== fileId));
    toast({
      title: "Deleted",
      description: `"${fileName}" has been deleted`,
    });
  };

  const handleDownloadFile = (file: FileItem) => {
    if (file.url) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      link.click();
      
      toast({
        title: "Download Started",
        description: `Downloading "${file.name}"`,
      });
    }
  };

  const getFileIcon = (item: FileItem) => {
    if (item.type === "folder") {
      return <FolderOpen className="h-8 w-8 text-blue-500" />;
    }
    
    // Show image thumbnail if it's an image file
    if (item.fileType === "image" && item.url) {
      return (
        <div className="w-full h-24 rounded-md overflow-hidden bg-muted flex items-center justify-center">
          <img 
            src={item.url} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    
    switch (item.fileType) {
      case "document":
        return <FileText className="h-8 w-8 text-orange-500" />;
      case "image":
        return <ImageIcon className="h-8 w-8 text-green-500" />;
      case "video":
        return <FileVideo className="h-8 w-8 text-purple-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  // Helper function for rendering notification items
  const renderNotificationItem = (title: string, type: "email" | "sms" = "email") => {
    const notifications = type === "email" ? emailNotifications : smsNotifications;
    const setNotifications = type === "email" ? setEmailNotifications : setSmsNotifications;
    
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Switch
          checked={notifications[title] || false}
          onCheckedChange={(checked) => {
            setNotifications(prev => ({
              ...prev,
              [title]: checked
            }));
            toast({
              title: "Notification Updated",
              description: `${title} has been ${checked ? 'enabled' : 'disabled'}`,
            });
          }}
        />
      </div>
    );
  };

  // Helper functions for bulk actions
  const handleEnableAll = (type: "email" | "sms") => {
    if (type === "email") {
      const allEnabled = Object.keys(emailNotifications).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setEmailNotifications(allEnabled);
    } else {
      const allEnabled = Object.keys(smsNotifications).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setSmsNotifications(allEnabled);
    }
    toast({
      title: "All Notifications Enabled",
      description: `All ${type} notifications have been enabled`,
    });
  };

  const handleDisableAll = (type: "email" | "sms") => {
    if (type === "email") {
      const allDisabled = Object.keys(emailNotifications).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>);
      setEmailNotifications(allDisabled);
    } else {
      const allDisabled = Object.keys(smsNotifications).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>);
      setSmsNotifications(allDisabled);
    }
    toast({
      title: "All Notifications Disabled",
      description: `All ${type} notifications have been disabled`,
    });
  };

  const saveProfile = () => {
    if (!customer) return;
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(CUSTOMERS_STORAGE_KEY) : null;
      if (stored) {
        const list: Customer[] = JSON.parse(stored);
        const updated = list.map((c) =>
          String(c.id) === String(customer.id)
            ? { ...c, name: `${profile.firstName} ${profile.lastName}`.trim(), email: profile.email, phone: profile.phone, address: profile.address }
            : c
        );
        localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(updated));
        const newCustomer = updated.find((c) => String(c.id) === String(customer.id)) || customer;
        setCustomer(newCustomer);
        // save extras
        const extrasRaw = localStorage.getItem(CUSTOMER_EXTRAS_KEY);
        const map = extrasRaw ? (JSON.parse(extrasRaw) as Record<string, any>) : {};
        map[String(customer.id)] = {
          company: profile.company,
          gender: profile.gender,
          notes: profile.notes,
          smsReminders: profile.smsReminders,
          contacts,
        };
        localStorage.setItem(CUSTOMER_EXTRAS_KEY, JSON.stringify(map));
        toast({ title: "Profile Saved", description: "Customer details have been updated." });
      }
    } catch {}
  };

  const persistExtras = (next: Partial<{contacts:any}>) => {
    if (!customer) return;
    const extrasRaw = localStorage.getItem(CUSTOMER_EXTRAS_KEY);
    const map = extrasRaw ? (JSON.parse(extrasRaw) as Record<string, any>) : {};
    const current = map[String(customer.id)] || {};
    map[String(customer.id)] = { ...current, ...next };
    localStorage.setItem(CUSTOMER_EXTRAS_KEY, JSON.stringify(map));
  };

  const addContact = () => {
    if (!newContact.name || !newContact.email) {
      toast({ title: "Missing info", description: "Please enter at least name and email.", });
      return;
    }
    const next = [...contacts, { ...newContact }];
    setContacts(next);
    persistExtras({ contacts: next });
    setNewContact({ name: "", email: "", phone: "" });
    setShowAddContact(false);
    toast({ title: "Contact added" });
  };

  const removeContact = (index: number) => {
    const next = contacts.filter((_, i) => i !== index);
    setContacts(next);
    persistExtras({ contacts: next });
    toast({ title: "Contact removed" });
  };

  const saveInvoices = (updatedInvoices: typeof invoices) => {
    if (!customer) return;
    try {
      localStorage.setItem(`customerInvoices_${customer.id}`, JSON.stringify(updatedInvoices));
      setInvoices(updatedInvoices);
    } catch {}
  };

  const createInvoice = () => {
    if (!newInvoice.bookingId || !newInvoice.date || !newInvoice.amount) {
      toast({ title: "Missing information", description: "Please select a booking and fill in all required fields." });
      return;
    }
    
    // Generate auto-incrementing invoice number
    const nextInvoiceNumber = `INV-${String(invoices.length + 1).padStart(3, '0')}`;
    
    // Find the selected booking
    const selectedBooking = allBookings.find(b => b.id === newInvoice.bookingId);
    
    const invoice = {
      id: Date.now().toString(),
      invoiceNumber: nextInvoiceNumber,
      date: newInvoice.date,
      dueDate: newInvoice.dueDate,
      amount: newInvoice.amount,
      status: "pending" as const,
      description: newInvoice.description,
      bookingId: newInvoice.bookingId,
      booking: selectedBooking
    };
    
    const updatedInvoices = [...invoices, invoice];
    saveInvoices(updatedInvoices);
    
    setNewInvoice({
      bookingId: "",
      date: "",
      dueDate: "",
      amount: "",
      description: ""
    });
    setShowCreateInvoice(false);
    toast({ title: "Invoice created", description: `Invoice ${nextInvoiceNumber} has been created for booking ${selectedBooking?.service}.` });
  };

  const updateInvoiceStatus = (invoiceId: string, status: "paid" | "pending") => {
    const updatedInvoices = invoices.map(inv => 
      inv.id === invoiceId ? { ...inv, status } : inv
    );
    saveInvoices(updatedInvoices);
    toast({ title: "Invoice updated", description: `Invoice status changed to ${status}.` });
  };

  const deleteInvoice = (invoiceId: string) => {
    const updatedInvoices = invoices.filter(inv => inv.id !== invoiceId);
    saveInvoices(updatedInvoices);
    toast({ title: "Invoice deleted", description: "Invoice has been removed." });
  };

  const initials = useMemo(() => {
    if (!customer?.name) return "?";
    const parts = customer.name.split(" ");
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  }, [customer]);

  const submitRating = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: persist ratings as needed
    alert(`Rating saved for ${ratingForm.provider || "provider"}: ${ratingForm.score}/5`);
    setRatingForm({ provider: "", score: 5, comment: "" });
  };

  if (!customer) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Loading customer...</div>
        <Button variant="outline" onClick={() => router.push("/admin/customers")}>Back to Customers</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/customers" aria-label="Back to Customers" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h2 className="text-xl font-semibold text-white">{customer.name}</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
          onClick={() => router.push(`/admin/add-booking?customerId=${customer.id}&customerName=${customer.name}&customerEmail=${customer.email}`)}
          className="text-white"
          style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
        >
          New Booking
        </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Left: Profile info */}
            <div className="flex items-start gap-4 flex-1">
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-semibold text-xl md:text-2xl">
                {initials}
              </div>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="font-medium">Email:</span>{" "}
                  <a href={`mailto:${customer.email}`} className="text-cyan-700 hover:underline">
                    {customer.email}
                  </a>
                </div>
                <div className="text-sm"><span className="font-medium">Phone:</span> {customer.phone}</div>
                {customer.address && <div className="text-sm"><span className="font-medium">Address:</span> {customer.address}</div>}
                <div className="text-sm"><span className="font-medium">Status:</span> <Badge variant="secondary">{customer.status || "active"}</Badge></div>
              </div>
            </div>

            {/* Right: Action buttons column */}
            <div className="w-full md:w-auto">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-10 w-10 rounded-full ${buttonStates.isActive ? 'bg-slate-200 hover:bg-slate-300' : 'bg-green-100 hover:bg-green-200'} text-slate-800 dark:bg-slate-800/60 dark:text-slate-200`}
                    onClick={() => setButtonStates(prev => ({
                      ...prev,
                      isActive: !prev.isActive
                    }))}
                  >
                    {buttonStates.isActive ? (
                      <UserMinus className="h-5 w-5" />
                    ) : (
                      <UserCheck className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {buttonStates.isActive ? 'Deactivate' : 'Activate'}
                  </div>
                </div>

                <div className="relative group">
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-10 w-10 rounded-full ${buttonStates.isBlocked ? 'bg-red-100 hover:bg-red-200' : 'bg-amber-100 hover:bg-amber-200'} text-amber-800 dark:bg-amber-900/20 dark:text-amber-300`}
                    onClick={() => setButtonStates(prev => ({
                      ...prev,
                      isBlocked: !prev.isBlocked
                    }))}
                  >
                    {buttonStates.isBlocked ? (
                      <ShieldCheck className="h-5 w-5" />
                    ) : (
                      <ShieldBan className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {buttonStates.isBlocked ? 'Unblock Access' : 'Block Access'}
                  </div>
                </div>

                <div className="relative group">
                  <Button
                    variant={buttonStates.isBookingBlocked ? 'default' : 'outline'}
                    size="icon"
                    className={`h-10 w-10 rounded-full ${buttonStates.isBookingBlocked ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-200 hover:bg-slate-300'} text-white`}
                    onClick={() => setButtonStates(prev => ({
                      ...prev,
                      isBookingBlocked: !prev.isBookingBlocked
                    }))}
                  >
                    <AlertCircle className="h-5 w-5" />
                  </Button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {buttonStates.isBookingBlocked ? 'Unblock Booking' : 'Block Booking'}
                  </div>
                </div>

                <div className="relative group">
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-10 w-10 rounded-full ${!buttonStates.isSubscribed ? 'bg-blue-100 hover:bg-blue-200' : 'bg-slate-200 hover:bg-slate-300'} text-slate-800 dark:bg-slate-800/60 dark:text-slate-200`}
                    onClick={() => setButtonStates(prev => ({
                      ...prev,
                      isSubscribed: !prev.isSubscribed
                    }))}
                  >
                    {buttonStates.isSubscribed ? (
                      <BellOff className="h-5 w-5" />
                    ) : (
                      <BellRing className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {buttonStates.isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full justify-start gap-2 bg-muted/40 p-0 h-auto rounded-none border-b border-slate-200">
          <TabsTrigger value="dashboard" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="profile" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">
            Profile
          </TabsTrigger>
          <TabsTrigger value="gift" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">
            Gift cards
          </TabsTrigger>
          <TabsTrigger value="referrals" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">
            Referrals
          </TabsTrigger>
          <TabsTrigger value="drive" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">
            My drive
          </TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="grid grid-cols-3 items-center">
                  <div className="flex items-center gap-2 justify-start">
                    <Button variant={calView === "month" ? "default" : "outline"} size="sm" onClick={() => setCalView("month")} className={calView === "month" ? "text-white" : ""} style={calView === "month" ? { background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' } : {}}>Month</Button>
                    <Button variant={calView === "week" ? "default" : "outline"} size="sm" onClick={() => setCalView("week")} className={calView === "week" ? "text-white" : ""} style={calView === "week" ? { background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' } : {}}>Week</Button>
                    <Button variant={calView === "day" ? "default" : "outline"} size="sm" onClick={() => setCalView("day")} className={calView === "day" ? "text-white" : ""} style={calView === "day" ? { background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' } : {}}>Day</Button>
                  </div>
                  <div className="flex items-center justify-center">
                    <CardTitle className="text-center">
                      {calView === "month" && new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(currentDate)}
                      {calView === "week" && (() => {
                        const d = new Date(currentDate);
                        const sunday = new Date(d);
                        sunday.setDate(d.getDate() - d.getDay());
                        return `Week of ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(sunday)}`;
                      })()}
                      {calView === "day" && new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(currentDate)}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date())} title="Today">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentDate(d => calView === 'month' ? new Date(d.getFullYear(), d.getMonth()-1, 1) : calView === 'week' ? new Date(d.getFullYear(), d.getMonth(), d.getDate()-7) : new Date(d.getFullYear(), d.getMonth(), d.getDate()-1))}
                      aria-label="Previous"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentDate(d => calView === 'month' ? new Date(d.getFullYear(), d.getMonth()+1, 1) : calView === 'week' ? new Date(d.getFullYear(), d.getMonth(), d.getDate()+7) : new Date(d.getFullYear(), d.getMonth(), d.getDate()+1))}
                      aria-label="Next"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const date = currentDate;
                  const year = date.getFullYear();
                  const month = date.getMonth();
                  const first = new Date(year, month, 1);
                  const last = new Date(year, month + 1, 0);
                  const days = last.getDate();
                  const startEmpty = first.getDay();
                  const format = (y:number,m:number,day:number) => `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const myBookings = allBookings.filter(b => b.customer?.email === customer.email || b.customer?.name === customer.name);
                  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                  if (calView === 'month') {
                    return (
                      <div className="grid grid-cols-7 gap-2">
                        {dayNames.map(d => (
                          <div key={d} className="text-center font-semibold text-sm text-muted-foreground py-2">{d}</div>
                        ))}
                        {Array.from({length: startEmpty}).map((_,i)=>(<div key={`empty-${i}`} className="aspect-square" />))}
                        {Array.from({length: days}).map((_,i)=>{
                          const day=i+1; const key=format(year,month,day);
                          const items=myBookings.filter(b=>b.date===key);
                          const today=new Date(); const isToday=today.getDate()===day && today.getMonth()===month && today.getFullYear()===year;
                          return (
                            <div key={key} className={`aspect-square border rounded-lg p-2 ${isToday? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20':'border-border'}`}>
                              <div className="flex flex-col h-full">
                                <div className={`text-sm font-medium mb-1 ${isToday?'text-cyan-600 dark:text-cyan-400':''}`}>{day}</div>
                                <div className="flex-1 space-y-1 overflow-y-auto">
                                  {items.slice(0,3).map(b=> (
                                    <div key={b.id} className="text-xs p-1 rounded text-white" style={{background:'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)'}}>
                                      <div className="truncate font-medium">{b.time}</div>
                                      <div className="truncate">{b.service}</div>
                                    </div>
                                  ))}
                                  {items.length>3 && (
                                    <div className="text-xs text-muted-foreground text-center">+{items.length-3} more</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  if (calView === 'week') {
                    const d = new Date(currentDate);
                    const sunday = new Date(d);
                    sunday.setDate(d.getDate() - d.getDay());
                    const daysArr = Array.from({length:7}).map((_,i)=>{
                      const dayDate = new Date(sunday);
                      dayDate.setDate(sunday.getDate()+i);
                      const key = format(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
                      return { label: dayNames[i], num: dayDate.getDate(), key, isToday: (new Date()).toDateString()===dayDate.toDateString() };
                    });
                    return (
                      <div className="grid grid-cols-7 gap-2">
                        {daysArr.map(({label,num,key,isToday})=>{
                          const items=myBookings.filter(b=>b.date===key);
                          return (
                            <div key={key} className={`min-h-[140px] border rounded-lg p-2 ${isToday? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20':'border-border'}`}>
                              <div className="text-sm font-medium mb-1">
                                <span className="text-muted-foreground mr-1">{label}</span>{num}
                              </div>
                              <div className="space-y-1">
                                {items.length===0 && <div className="text-xs text-muted-foreground">No bookings</div>}
                                {items.map(b=> (
                                  <div key={b.id} className="text-xs p-1 rounded text-white" style={{background:'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)'}}>
                                    <div className="truncate font-medium">{b.time}</div>
                                    <div className="truncate">{b.service}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  // Day view
                  const key = format(year, month, date.getDate());
                  const items = myBookings.filter(b=>b.date===key);
                  return (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">{items.length} booking(s) on this day</div>
                      {items.length===0 && <div className="text-sm text-muted-foreground">No bookings scheduled.</div>}
                      {items.map(b => (
                        <div key={b.id} className="p-3 rounded-md border">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{b.service}</div>
                            <div className="text-sm">{b.time}</div>
                          </div>
                          {b.provider?.name && <div className="text-xs text-muted-foreground mt-1">Provider: {b.provider.name}</div>}
                          {b.address && <div className="text-xs text-muted-foreground">{b.address}</div>}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Providers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by name" className="pl-10" value={providerSearch} onChange={(e)=>setProviderSearch(e.target.value)} />
                </div>
                {(() => {
                  const myBookings = allBookings.filter(b => b.customer?.email === customer.email || b.customer?.name === customer.name);
                  const providers = Array.from(new Map(myBookings.filter(b=>b.provider?.name).map(b=>[b.provider!.name, b.provider])).values()) as NonNullable<Booking['provider']>[];
                  const filtered = providers.filter(p => p.name.toLowerCase().includes(providerSearch.toLowerCase()))
                  if (filtered.length===0) return <div className="text-sm text-muted-foreground">No assigned providers.</div>;
                  return (
                    <div className="space-y-2">
                      {filtered.map((p)=> (
                        <div key={p.name} className="flex items-center gap-3 p-2 rounded-md border">
                          <div className="h-8 w-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center">
                            <UserIcon className="h-4 w-4" />
                          </div>
                          <div className="text-sm font-medium">{p.name}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Left: avatar + fields */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-start gap-6">
                    <div className="h-28 w-28 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-2xl text-muted-foreground">{initials}</span>
                    </div>
                    <div className="flex-1">
                      <Label>Choose file</Label>
                      <div className="flex gap-2 mt-2">
                        <Input type="file" className="flex-1" />
                        <Button variant="outline">Browse</Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Image size should not be more than 300px by 300px.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Company name (Optional)</Label>
                      <Input placeholder="Ex: Sarahaswin" value={profile.company} onChange={(e)=>setProfile({...profile, company: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>First name</Label>
                        <Input value={profile.firstName} onChange={(e)=>setProfile({...profile, firstName: e.target.value})} />
                      </div>
                      <div>
                        <Label>Last name</Label>
                        <Input value={profile.lastName} onChange={(e)=>setProfile({...profile, lastName: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <Label>Gender</Label>
                      <div className="flex items-center gap-6 mt-2 text-sm">
                        <label className="flex items-center gap-2"><input type="radio" name="gender" checked={profile.gender==='male'} onChange={()=>setProfile({...profile, gender:'male'})} /> Male</label>
                        <label className="flex items-center gap-2"><input type="radio" name="gender" checked={profile.gender==='female'} onChange={()=>setProfile({...profile, gender:'female'})} /> Female</label>
                        <label className="flex items-center gap-2"><input type="radio" name="gender" checked={profile.gender==='unspecified'} onChange={()=>setProfile({...profile, gender:'unspecified'})} /> Unspecified</label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Email address</Label>
                        <Input value={profile.email} onChange={(e)=>setProfile({...profile, email: e.target.value})} />
                      </div>
                      <div>
                        <Label>Phone no</Label>
                        <Input value={profile.phone} onChange={(e)=>setProfile({...profile, phone: e.target.value})} />
                        <label className="mt-2 flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={profile.smsReminders} onChange={(e)=>setProfile({...profile, smsReminders: e.target.checked})} />
                          <span>Send me reminders via text message</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label>Address</Label>
                      <Input value={profile.address} onChange={(e)=>setProfile({...profile, address: e.target.value})} />
                    </div>

                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={()=>{ setShowAddContact((s)=>!s); setShowContactsList(false); }}>+ Add Other Contact</Button>
                      <Button variant="outline" size="sm" className="text-cyan-700" onClick={()=>{ setShowContactsList((s)=>!s); setShowAddContact(false); }}>View Other Contact(s)</Button>
                    </div>

                    {showAddContact && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-md">
                        <div>
                          <Label>Contact Name</Label>
                          <Input value={newContact.name} onChange={(e)=>setNewContact({...newContact, name: e.target.value})} placeholder="Full name" />
                        </div>
                        <div>
                          <Label>Contact Email</Label>
                          <Input type="email" value={newContact.email} onChange={(e)=>setNewContact({...newContact, email: e.target.value})} placeholder="email@example.com" />
                        </div>
                        <div>
                          <Label>Contact Phone</Label>
                          <Input value={newContact.phone} onChange={(e)=>setNewContact({...newContact, phone: e.target.value})} placeholder="(555) 123-4567" />
                        </div>
                        <div className="md:col-span-3 flex justify-end gap-2">
                          <Button variant="outline" onClick={()=>{ setShowAddContact(false); setNewContact({name:"",email:"",phone:""}); }}>Cancel</Button>
                          <Button className="text-white" style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' }} onClick={addContact}>Save Contact</Button>
                        </div>
                      </div>
                    )}

                    {showContactsList && (
                      <div className="mt-3 space-y-2 p-3 border rounded-md">
                        {contacts.length === 0 && (
                          <div className="text-sm text-muted-foreground">No other contacts added.</div>
                        )}
                        {contacts.map((c, i) => (
                          <div key={i} className="flex items-center justify-between gap-3">
                            <div className="text-sm">
                              <div className="font-medium">{c.name}</div>
                              <div className="text-muted-foreground">{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
                            </div>
                            <Button variant="outline" size="sm" onClick={()=>removeContact(i)}>Remove</Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <Label>Notes</Label>
                      <Textarea 
                        placeholder="Add notes about this customer" 
                        className="min-h-[150px] mt-2" 
                        value={profile.notes} 
                        onChange={(e)=>setProfile({...profile, notes: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>

                {/* Empty div to maintain grid layout */}
                <div></div>
              </div>
              {/* Footer actions under the whole form */}
              <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t mt-2">
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={()=>toast({title:'Welcome Email Sent', description:'A welcome email has been resent.'})}>Resend Welcome Email</Button>
                  <Button variant="outline" onClick={()=>toast({title:'Reset Password Email Sent', description:'A reset password email has been resent.'})}>Resend Reset Password Email</Button>
                </div>
                <Button onClick={saveProfile} className="text-white" style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' }}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gift">
          <Card>
            <CardHeader>
              <CardTitle>Gift cards</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">No gift cards yet.</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Referrals</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">No referrals yet.</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drive">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My drive</CardTitle>
                <Button 
                  onClick={() => setIsUploadDialogOpen(true)}
                  className="text-white"
                  style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No files uploaded</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your first file to get started
                  </p>
                  <Button 
                    onClick={() => setIsUploadDialogOpen(true)}
                    className="text-white"
                    style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {files.map((file) => (
                    <Card 
                      key={file.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => file.fileType === "image" && setPreviewImage(file)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            {getFileIcon(file)}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFile(file);
                              }}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFile(file.id, file.name);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div>
                          <p className="font-medium text-sm truncate mb-1">{file.name}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{file.size}</span>
                            <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload File Dialog */}
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload File</DialogTitle>
                <DialogDescription>
                  Upload a file to your drive
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Choose File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsUploadDialogOpen(false);
                  setSelectedFile(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleFileUpload}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Image Preview Dialog */}
          <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{previewImage?.name}</DialogTitle>
                <DialogDescription>
                  {previewImage?.size} • Uploaded on {previewImage && new Date(previewImage.uploadedAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              
              {previewImage?.url && (
                <div className="w-full max-h-[70vh] overflow-auto rounded-lg bg-muted flex items-center justify-center">
                  <img 
                    src={previewImage.url} 
                    alt={previewImage.name}
                    className="max-w-full h-auto"
                  />
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewImage(null)}>
                  Close
                </Button>
                {previewImage && (
                  <Button onClick={() => handleDownloadFile(previewImage)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Invoices</CardTitle>
                <Button 
                  onClick={() => setShowCreateInvoice(true)}
                  className="text-white"
                  style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
                >
                  Create Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showCreateInvoice && (
                <div className="mb-6 p-4 border rounded-lg space-y-4">
                  <h3 className="font-semibold">Create New Invoice</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Invoice Number</Label>
                      <Input 
                        value={`INV-${String(invoices.length + 1).padStart(3, '0')}`}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <Label>Booking ID *</Label>
                      <Input 
                        placeholder="Enter booking ID..." 
                        value={newInvoice.bookingId}
                        onChange={(e) => {
                          const bookingId = e.target.value;
                          const selectedBooking = allBookings.find(b => b.id === bookingId);
                          setNewInvoice({
                            ...newInvoice, 
                            bookingId,
                            amount: selectedBooking?.amount || "",
                            description: selectedBooking?.service || ""
                          });
                        }}
                      />
                      {newInvoice.bookingId && (() => {
                        const selectedBooking = allBookings.find(b => b.id === newInvoice.bookingId);
                        if (selectedBooking) {
                          return (
                            <div className="text-sm text-green-600 mt-1">
                              Found: {selectedBooking.service} - {selectedBooking.date} at {selectedBooking.time}
                            </div>
                          );
                        } else {
                          return (
                            <div className="text-sm text-red-600 mt-1">
                              Booking ID not found
                            </div>
                          );
                        }
                      })()}
                    </div>
                    <div>
                      <Label>Date *</Label>
                      <Input 
                        type="date" 
                        value={newInvoice.date}
                        onChange={(e) => setNewInvoice({...newInvoice, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Due Date</Label>
                      <Input 
                        type="date" 
                        value={newInvoice.dueDate}
                        onChange={(e) => setNewInvoice({...newInvoice, dueDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Amount *</Label>
                      <Input 
                        placeholder="0.00" 
                        value={newInvoice.amount}
                        onChange={(e) => setNewInvoice({...newInvoice, amount: e.target.value})}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <Textarea 
                        placeholder="Invoice description..." 
                        value={newInvoice.description}
                        onChange={(e) => setNewInvoice({...newInvoice, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={createInvoice}
                      className="text-white"
                      style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
                    >
                      Create Invoice
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowCreateInvoice(false);
                        setNewInvoice({
                          bookingId: "",
                          date: "",
                          dueDate: "",
                          amount: "",
                          description: ""
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {invoices.length === 0 ? (
                <div className="text-sm text-muted-foreground">No invoices yet.</div>
              ) : (
                <div className="space-y-6">
                  {/* Pending Invoices */}
                  <div>
                    <h3 className="font-semibold text-amber-600 mb-3">Pending Invoices ({invoices.filter(i => i.status === 'pending').length})</h3>
                    <div className="space-y-2">
                      {invoices.filter(i => i.status === 'pending').map((invoice) => (
                        <div key={invoice.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{invoice.invoiceNumber}</span>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending</Badge>
                              </div>
                              {invoice.booking && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  Booking: {invoice.booking.service} - {invoice.booking.date} at {invoice.booking.time}
                                </div>
                              )}
                              <div className="text-sm text-muted-foreground mt-1">
                                Date: {invoice.date} {invoice.dueDate && `· Due: ${invoice.dueDate}`}
                              </div>
                              {invoice.description && (
                                <div className="text-sm mt-2">{invoice.description}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">${invoice.amount}</span>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                              >
                                Mark Paid
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => deleteInvoice(invoice.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {invoices.filter(i => i.status === 'pending').length === 0 && (
                        <div className="text-sm text-muted-foreground">No pending invoices.</div>
                      )}
                    </div>
                  </div>

                  {/* Paid Invoices */}
                  <div>
                    <h3 className="font-semibold text-green-600 mb-3">Paid Invoices ({invoices.filter(i => i.status === 'paid').length})</h3>
                    <div className="space-y-2">
                      {invoices.filter(i => i.status === 'paid').map((invoice) => (
                        <div key={invoice.id} className="border rounded-lg p-4 bg-green-50/50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{invoice.invoiceNumber}</span>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">Paid</Badge>
                              </div>
                              {invoice.booking && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  Booking: {invoice.booking.service} - {invoice.booking.date} at {invoice.booking.time}
                                </div>
                              )}
                              <div className="text-sm text-muted-foreground mt-1">
                                Date: {invoice.date} {invoice.dueDate && `· Due: ${invoice.dueDate}`}
                              </div>
                              {invoice.description && (
                                <div className="text-sm mt-2">{invoice.description}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">${invoice.amount}</span>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateInvoiceStatus(invoice.id, 'pending')}
                              >
                                Mark Pending
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => deleteInvoice(invoice.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {invoices.filter(i => i.status === 'paid').length === 0 && (
                        <div className="text-sm text-muted-foreground">No paid invoices.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="flex flex-col space-y-4">
            <Tabs defaultValue="notifications-settings" className="w-full">
              <TabsList className="grid w-fit grid-cols-2">
                <TabsTrigger value="notifications-settings">Notifications</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
              </TabsList>
              <TabsContent value="notifications-settings">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Email notifications</CardTitle>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">All</span>
                        <Switch
                          checked={Object.values(emailNotifications).every(v => v === true)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleEnableAll("email");
                            } else {
                              handleDisableAll("email");
                            }
                          }}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Email Notification Items */}
                      {renderNotificationItem("Booking cancellation", "email")}
                      {renderNotificationItem("Booking modified", "email")}
                      {renderNotificationItem("Booking reminder", "email")}
                      {renderNotificationItem("Charged fee", "email")}
                      {renderNotificationItem("Declined card", "email")}
                      {renderNotificationItem("Feedback email", "email")}
                      {renderNotificationItem("New booking email", "email")}
                      {renderNotificationItem("Referral accepted", "email")}
                      {renderNotificationItem("New invoice", "email")}
                      {renderNotificationItem("Update invoice", "email")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-4">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>SMS notifications</CardTitle>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">All</span>
                        <Switch
                          checked={Object.values(smsNotifications).every(v => v === true)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleEnableAll("sms");
                            } else {
                              handleDisableAll("sms");
                            }
                          }}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* SMS Notification Items */}
                      {renderNotificationItem("Booking reminder", "sms")}
                      {renderNotificationItem("Card declined", "sms")}
                      {renderNotificationItem("New invoice", "sms")}
                      {renderNotificationItem("Update invoice", "sms")}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="logs">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">No notification logs available.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
