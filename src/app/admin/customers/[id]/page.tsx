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
import { UserMinus, ShieldBan, AlertCircle, BellOff, ChevronLeft, ChevronRight as ChevronRightIcon, Calendar as CalendarIcon, Search as SearchIcon, User as UserIcon, UserCheck, ShieldCheck, BellRing, FolderOpen, File, Upload, Download, Trash2, Image as ImageIcon, MoreVertical, Plus, Minus, X, FileText, FileVideo, Info, Send, UserCog, Mail, Phone, MapPin, ChevronDown } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useBusiness } from "@/contexts/BusinessContext";
import { CreateInvoiceDialog } from "@/components/admin/CreateInvoiceDialog";

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
  authUserId?: string | null;
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
    date: string;
    time: string;
    address?: string;
    aptNo?: string;
    zipCode?: string;
    notes?: string;
    status: string;
    amount?: string;
    provider?: { id?: string; name: string } | null;
    paymentMethod?: string;
    paymentStatus?: string;
    frequency?: string;
    customization?: Record<string, unknown>;
    providerWage?: number | null;
    durationMinutes?: number | null;
    privateCustomerNotes?: string[];
    privateBookingNotes?: string[];
  };
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  /** Bookings for this customer from API (shown on Dashboard calendar) */
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
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
  const [addresses, setAddresses] = useState<{ id: string; aptNo: string; location: string; zip: string; isDefault: boolean }[]>([]);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [buttonStates, setButtonStates] = useState({
    isActive: true,
    isBlocked: false,
    isBookingBlocked: false,
    isSubscribed: true
  });
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [tagsLoading, setTagsLoading] = useState(false);
  type DbInvoice = {
    id: string;
    invoice_number: string;
    issue_date: string;
    due_date: string | null;
    total_amount: number;
    status: string;
    payment_status: string;
    description: string | null;
    invoice_bookings?: Array<{ bookings?: { service?: string; date?: string; scheduled_date?: string; time?: string; scheduled_time?: string } | null }>;
  };
  const [invoices, setInvoices] = useState<DbInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const { currentBusiness } = useBusiness();
  const [industries, setIndustries] = useState<{ id: string; name: string }[]>([]);
  const [extrasMap, setExtrasMap] = useState<Record<string, string>>({});

  // Drive state variables
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<FileItem | null>(null);

  // Fetch industries for booking modal (Industry display, extras resolution)
  useEffect(() => {
    if (!currentBusiness?.id) return;
    fetch(`/api/industries?business_id=${currentBusiness.id}`)
      .then((r) => r.json())
      .then((data) => setIndustries(data.industries || []))
      .catch(() => setIndustries([]));
  }, [currentBusiness?.id]);

  // Fetch extras when booking modal opens (to resolve selectedExtras IDs to names)
  useEffect(() => {
    if (!selectedBooking || industries.length === 0) { setExtrasMap({}); return; }
    const c = (selectedBooking.customization || {}) as Record<string, unknown>;
    const ids = (c.selectedExtras as string[]) || [];
    if (ids.length === 0) { setExtrasMap({}); return; }
    const industryId = industries[0]?.id;
    if (!industryId) return;
    fetch(`/api/extras?industryId=${industryId}`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.extras || [];
        const map: Record<string, string> = {};
        list.forEach((e: { id: string; name?: string }) => { if (e.id && e.name) map[e.id] = e.name; });
        setExtrasMap(map);
      })
      .catch(() => setExtrasMap({}));
  }, [selectedBooking?.id, industries]);

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
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/customers/${id}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data?.customer) {
          const c = data.customer;
          setCustomer({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone ?? "",
            address: c.address,
            joinDate: c.joinDate ?? c.join_date,
            totalBookings: c.totalBookings ?? c.total_bookings,
            totalSpent: c.totalSpent ?? (c.total_spent != null ? `$${Number(c.total_spent).toFixed(2)}` : undefined),
            status: c.status ?? "active",
            lastBooking: c.lastBooking ?? c.last_booking,
            authUserId: c.auth_user_id ?? c.authUserId ?? null,
          });
          setButtonStates({
            isActive: (c.status || "active") === "active",
            isBlocked: !!c.access_blocked,
            isBookingBlocked: !!c.booking_blocked,
            isSubscribed: c.email_notifications !== false,
          });
        } else {
          const stored = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
          if (stored) {
            const list: Customer[] = JSON.parse(stored);
            const found = list.find((c) => String(c.id) === String(id));
            if (found) setCustomer(found);
          }
          setButtonStates({
            isActive: true,
            isBlocked: false,
            isBookingBlocked: false,
            isSubscribed: true,
          });
        }
      } catch {
        if (cancelled) return;
        const stored = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
        if (stored) {
          try {
            const list: Customer[] = JSON.parse(stored);
            const found = list.find((c) => String(c.id) === String(id));
            if (found) setCustomer(found);
          } catch {}
        }
      }
    })();
    try {
      const storedBookings = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (storedBookings) {
        setAllBookings(JSON.parse(storedBookings) as Booking[]);
      }
      const extrasRaw = localStorage.getItem(CUSTOMER_EXTRAS_KEY);
      if (extrasRaw && typeof id === "string") {
        const map = JSON.parse(extrasRaw) as Record<string, any>;
        const ex = map[id];
        if (ex) {
          setProfile((p) => ({
            ...p,
            company: ex.company || "",
            gender: ex.gender || "unspecified",
            notes: ex.notes || "",
            smsReminders: !!ex.smsReminders,
          }));
          if (Array.isArray(ex.contacts)) {
            setContacts(ex.contacts as { name: string; email: string; phone: string }[]);
          }
          if (Array.isArray(ex.addresses) && ex.addresses.length > 0) {
            setAddresses(ex.addresses as { id: string; aptNo: string; location: string; zip: string; isDefault: boolean }[]);
          }
        }
      }
      // load customer drive files
      const driveFilesRaw = localStorage.getItem(`customerDriveFiles_${id}`);
      if (driveFilesRaw) setFiles(JSON.parse(driveFilesRaw));
    } catch {}
    return () => { cancelled = true; };
  }, [id]);

  // Fetch this customer's bookings from API for Dashboard calendar
  useEffect(() => {
    if (!id || typeof id !== "string") return;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ customer_id: id });
        if (customer?.email) params.set('customer_email', customer.email);
        const res = await fetch(`/api/admin/customer-bookings?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !Array.isArray(data.bookings)) {
          setCustomerBookings([]);
          return;
        }
        const list: Booking[] = (data.bookings as any[]).map((b: any) => {
          const dateStr = b.scheduled_date || b.date || "";
          const dateOnly = typeof dateStr === "string" && dateStr.length >= 10 ? dateStr.slice(0, 10) : dateStr;
          return {
            id: b.id,
            customer: {
              name: b.customer_name || customer?.name || "",
              email: b.customer_email || customer?.email || "",
              phone: b.customer_phone || customer?.phone || "",
            },
            service: b.service || "",
            date: dateOnly,
            time: b.scheduled_time || b.time || "",
            address: b.address,
            aptNo: b.apt_no,
            zipCode: b.zip_code,
            notes: b.notes,
            status: b.status || "pending",
            amount: b.total_price != null ? `$${Number(b.total_price).toFixed(2)}` : undefined,
            provider: b.provider_name ? { id: b.provider_id, name: b.provider_name } : null,
            paymentMethod: b.payment_method,
            paymentStatus: b.payment_status,
            frequency: b.frequency,
            customization: b.customization,
            providerWage: b.provider_wage != null ? Number(b.provider_wage) : undefined,
            durationMinutes: b.duration_minutes != null ? Number(b.duration_minutes) : undefined,
            cancellationFeeAmount: b.cancellation_fee_amount != null ? Number(b.cancellation_fee_amount) : undefined,
            cancellationFeeCurrency: b.cancellation_fee_currency ?? undefined,
            privateCustomerNotes: Array.isArray(b.private_customer_notes) ? b.private_customer_notes.filter((n: unknown) => typeof n === "string") : [],
            privateBookingNotes: Array.isArray(b.private_booking_notes) ? b.private_booking_notes.filter((n: unknown) => typeof n === "string") : [],
          };
        });
        setCustomerBookings(list);
      } catch {
        if (!cancelled) setCustomerBookings([]);
      }
    })();
    return () => { cancelled = true; };
  }, [id, customer?.name, customer?.email]);

  // Fetch tags from Supabase (not localStorage)
  useEffect(() => {
    if (!id || typeof id !== "string") return;
    let cancelled = false;
    setTagsLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase.from("customers").select("tags").eq("id", id).single();
        if (cancelled) return;
        if (!error && data?.tags && Array.isArray(data.tags)) {
          setTags(data.tags as string[]);
        } else {
          setTags([]);
        }
      } catch {
        if (!cancelled) setTags([]);
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    })();
    return () => { cancelled = true; };
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
    setAddresses((prev) => {
      if (prev.length > 0) return prev; // keep extras-loaded addresses
      if (customer.address) return [{ id: "1", aptNo: "", location: customer.address, zip: "", isDefault: true }];
      return [];
    });
  }, [customer]);

  // Ensure addresses is populated when profile.address exists (e.g. from API before customer effect)
  useEffect(() => {
    if (profile.address && addresses.length === 0) {
      setAddresses([{ id: "1", aptNo: "", location: profile.address, zip: "", isDefault: true }]);
    }
  }, [profile.address]);

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

  const isNewCustomer = () => {
    const created = customer?.joinDate ?? (customer as any)?.join_date;
    if (!created) return false;
    const d = new Date(created);
    const daysAgo = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  };

  const DetailRow = ({ label, value, isLink, className }: { label: string; value: string; isLink?: boolean; className?: string }) => (
    <div className="flex justify-between items-start gap-3 min-w-0">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <span className={cn("text-sm font-medium text-right text-gray-900 break-words min-w-0", isLink && "text-blue-600 hover:underline cursor-pointer", className)}>{value}</span>
    </div>
  );

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

  const updateAddress = (addrId: string, field: "aptNo" | "location" | "zip", value: string) => {
    setAddresses((a) =>
      a.map((x) => (x.id === addrId ? { ...x, [field]: value } : x))
    );
  };

  const [saveProfileLoading, setSaveProfileLoading] = useState(false);
  const saveProfile = async () => {
    if (!customer || !id) return;
    const defaultAddr = addresses.find((a) => a.isDefault);
    const addressToSave = defaultAddr?.location || profile.address;
    const profileToSave = { ...profile, address: addressToSave };
    setSaveProfileLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${profileToSave.firstName} ${profileToSave.lastName}`.trim(),
          email: profileToSave.email,
          phone: profileToSave.phone,
          address: addressToSave,
        }),
      });
      if (res.ok) {
        setCustomer((c) =>
          c ? { ...c, name: profileToSave.firstName + " " + profileToSave.lastName, email: profileToSave.email, phone: profileToSave.phone, address: addressToSave } : null
        );
      }
      const stored = typeof window !== "undefined" ? localStorage.getItem(CUSTOMERS_STORAGE_KEY) : null;
      if (stored) {
        const list: Customer[] = JSON.parse(stored);
        const updated = list.map((c) =>
          String(c.id) === String(customer.id)
            ? { ...c, name: `${profileToSave.firstName} ${profileToSave.lastName}`.trim(), email: profileToSave.email, phone: profileToSave.phone, address: addressToSave }
            : c
        );
        localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(updated));
      }
      const extrasRaw = localStorage.getItem(CUSTOMER_EXTRAS_KEY);
      const map = extrasRaw ? (JSON.parse(extrasRaw) as Record<string, unknown>) : {};
      (map as Record<string, unknown>)[String(customer.id)] = {
        company: profileToSave.company,
        gender: profileToSave.gender,
        notes: profileToSave.notes,
        smsReminders: profileToSave.smsReminders,
        contacts,
        addresses,
      };
      localStorage.setItem(CUSTOMER_EXTRAS_KEY, JSON.stringify(map));
      toast({ title: "Profile Saved", description: "Customer details have been updated." });
    } catch {
      toast({ title: "Failed to save profile", variant: "destructive" });
    } finally {
      setSaveProfileLoading(false);
    }
  };

  const persistExtras = (next: Partial<{ contacts: any }>) => {
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

  const addTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed) || !id) return;
    const next = [...tags, trimmed];
    setTags(next);
    setNewTag("");
    setTagsLoading(true);
    const { error } = await supabase.from("customers").update({ tags: next }).eq("id", id);
    setTagsLoading(false);
    if (error) {
      setTags(tags);
      toast({ title: "Failed to add tag", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tag added" });
    }
  };

  const removeTag = async (tagToRemove: string) => {
    const next = tags.filter((t) => t !== tagToRemove);
    const prev = [...tags];
    setTags(next);
    setTagsLoading(true);
    const { error } = await supabase.from("customers").update({ tags: next }).eq("id", id);
    setTagsLoading(false);
    if (error) {
      setTags(prev);
      toast({ title: "Failed to remove tag", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tag removed" });
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const [actionLoading, setActionLoading] = useState<"deactivate" | "block" | "booking" | "subscribe" | null>(null);

  const updateCustomerFlag = async (
    field: "status" | "access_blocked" | "booking_blocked" | "email_notifications",
    value: string | boolean
  ) => {
    if (!id) return;
    const loadingKey =
      field === "status" ? "deactivate" : field === "access_blocked" ? "block" : field === "booking_blocked" ? "booking" : "subscribe";
    setActionLoading(loadingKey);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed");
      if (field === "status") {
        setButtonStates((prev) => ({ ...prev, isActive: value === "active" }));
        setCustomer((c) => (c ? { ...c, status: value as string } : null));
        toast({ title: value === "active" ? "Customer activated" : "Customer deactivated" });
      } else if (field === "access_blocked") {
        setButtonStates((prev) => ({ ...prev, isBlocked: !!value }));
        toast({ title: value ? "Access blocked" : "Access unblocked" });
      } else if (field === "booking_blocked") {
        setButtonStates((prev) => ({ ...prev, isBookingBlocked: !!value }));
        toast({ title: value ? "Booking blocked" : "Booking unblocked" });
      } else {
        setButtonStates((prev) => ({ ...prev, isSubscribed: value !== false }));
        toast({ title: value !== false ? "Subscribed" : "Unsubscribed" });
      }
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch invoices from API (database)
  useEffect(() => {
    if (!id || !currentBusiness?.id) return;
    setInvoicesLoading(true);
    fetch(`/api/admin/invoices?customer_id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      })
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false));
  }, [id, currentBusiness?.id]);

  const refreshInvoices = () => {
    if (!id || !currentBusiness?.id) return;
    fetch(`/api/admin/invoices?customer_id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      })
      .catch(() => {});
  };

  const updateInvoiceStatus = async (invoiceId: string, paymentStatus: "paid" | "pending") => {
    const inv = invoices.find((i) => i.id === invoiceId);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_status: paymentStatus,
          amount_paid: paymentStatus === "paid" ? (inv?.total_amount ?? 0) : 0,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      refreshInvoices();
      toast({ title: "Updated", description: `Invoice marked as ${paymentStatus}.` });
    } catch {
      toast({ title: "Error", description: "Failed to update invoice", variant: "destructive" });
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    if (!confirm("Delete this invoice?")) return;
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      refreshInvoices();
      toast({ title: "Deleted", description: "Invoice has been removed." });
    } catch {
      toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" });
    }
  };

  const sendInvoice = async (invoiceId: string) => {
    setSendingInvoiceId(invoiceId);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      toast({ title: "Invoice sent", description: "Invoice has been emailed to the customer." });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to send invoice", variant: "destructive" });
    } finally {
      setSendingInvoiceId(null);
    }
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
            {customer.authUserId && (
              <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                Portal connected
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {customer.authUserId && (
            <Button
              variant="outline"
              className="border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/20"
              onClick={() => {
                const url = currentBusiness?.id
                  ? `/customer-auth?business=${currentBusiness.id}`
                  : "/customer-auth";
                window.open(url, "_blank");
                toast({
                  title: "Customer Portal",
                  description: `${customer.name} can log in at the customer portal to view appointments and bookings.`,
                });
              }}
            >
              <UserCog className="h-4 w-4 mr-2" />
              Customer Portal
            </Button>
          )}
          <Button 
          onClick={() => {
            const params = new URLSearchParams({
              customerId: customer.id,
              customerName: customer.name,
              customerEmail: customer.email,
            });
            if (customer.address) params.set('customerAddress', customer.address);
            router.push(`/admin/add-booking?${params.toString()}`);
          }}
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

            {/* Right: Action buttons + Tags column */}
            <div className="w-full md:w-auto flex flex-col gap-4 md:min-w-[280px]">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={actionLoading !== null}
                    className={`h-10 w-10 rounded-full ${buttonStates.isActive ? 'bg-slate-200 hover:bg-slate-300' : 'bg-green-100 hover:bg-green-200'} text-slate-800 dark:bg-slate-800/60 dark:text-slate-200`}
                    onClick={() => updateCustomerFlag("status", buttonStates.isActive ? "inactive" : "active")}
                  >
                    {buttonStates.isActive ? (
                      <UserMinus className="h-5 w-5" />
                    ) : (
                      <UserCheck className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {buttonStates.isActive ? "Deactivate" : "Activate"}
                  </div>
                </div>

                <div className="relative group">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={actionLoading !== null}
                    className={`h-10 w-10 rounded-full ${buttonStates.isBlocked ? 'bg-red-100 hover:bg-red-200' : 'bg-amber-100 hover:bg-amber-200'} text-amber-800 dark:bg-amber-900/20 dark:text-amber-300`}
                    onClick={() => updateCustomerFlag("access_blocked", !buttonStates.isBlocked)}
                  >
                    {buttonStates.isBlocked ? (
                      <ShieldCheck className="h-5 w-5" />
                    ) : (
                      <ShieldBan className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {buttonStates.isBlocked ? "Unblock Access" : "Block Access"}
                  </div>
                </div>

                <div className="relative group">
                  <Button
                    variant={buttonStates.isBookingBlocked ? "default" : "outline"}
                    size="icon"
                    disabled={actionLoading !== null}
                    className={`h-10 w-10 rounded-full ${buttonStates.isBookingBlocked ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-200 hover:bg-slate-300'} text-white`}
                    onClick={() => updateCustomerFlag("booking_blocked", !buttonStates.isBookingBlocked)}
                  >
                    <AlertCircle className="h-5 w-5" />
                  </Button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {buttonStates.isBookingBlocked ? "Unblock Booking" : "Block Booking"}
                  </div>
                </div>

                <div className="relative group">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={actionLoading !== null}
                    className={`h-10 w-10 rounded-full ${!buttonStates.isSubscribed ? 'bg-blue-100 hover:bg-blue-200' : 'bg-slate-200 hover:bg-slate-300'} text-slate-800 dark:bg-slate-800/60 dark:text-slate-200`}
                    onClick={() => updateCustomerFlag("email_notifications", !buttonStates.isSubscribed)}
                  >
                    {buttonStates.isSubscribed ? (
                      <BellOff className="h-5 w-5" />
                    ) : (
                      <BellRing className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {buttonStates.isSubscribed ? "Unsubscribe" : "Subscribe"}
                  </div>
                </div>
              </div>

              {/* Tags section */}
              <div className="w-full">
                <h3 className="font-semibold text-base mb-1">Tags</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  To attach a tag to this customer, type a tag name and press enter or select from available tags.
                </p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <div
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-700 rounded-full text-sm"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          disabled={tagsLoading}
                          className="text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-200 focus:outline-none disabled:opacity-50"
                          title="Remove tag"
                          aria-label={`Remove tag ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add a tag"
                    className="flex-1"
                    disabled={tagsLoading}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addTag} disabled={!newTag.trim() || tags.includes(newTag.trim()) || tagsLoading} title="Add tag">
                    <Plus className="h-4 w-4" />
                  </Button>
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
                  const myBookings = customerBookings.length > 0 ? customerBookings : allBookings.filter(b => b.customer?.email === customer.email || b.customer?.name === customer.name);
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
                                    <div key={b.id} role="button" tabIndex={0} onClick={() => setSelectedBooking(b)} onKeyDown={(e) => e.key === "Enter" && setSelectedBooking(b)} className="text-xs p-1 rounded text-white cursor-pointer hover:opacity-90 transition-opacity" style={{background:'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)'}}>
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
                                  <div key={b.id} role="button" tabIndex={0} onClick={() => setSelectedBooking(b)} onKeyDown={(e) => e.key === "Enter" && setSelectedBooking(b)} className="text-xs p-1 rounded text-white cursor-pointer hover:opacity-90 transition-opacity" style={{background:'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)'}}>
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
                        <div key={b.id} role="button" tabIndex={0} onClick={() => setSelectedBooking(b)} onKeyDown={(e) => e.key === "Enter" && setSelectedBooking(b)} className="p-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors">
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
                  const myBookings = customerBookings.length > 0 ? customerBookings : allBookings.filter(b => b.customer?.email === customer.email || b.customer?.name === customer.name);
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Personal Information */}
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="pt-6 space-y-6">
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
                      <Input placeholder="Ex: Premierprocleaner" value={profile.company} onChange={(e)=>setProfile({...profile, company: e.target.value})} />
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

                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="outline" size="sm" onClick={()=>{ setShowAddContact((s)=>!s); setShowContactsList(false); }}>+ Add Other Contact</Button>
                      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={()=>{ setShowContactsList((s)=>!s); setShowAddContact(false); }}>View Other Contact(s)</Button>
                      <Button variant="outline" size="sm" onClick={()=>toast({title:'Change Password', description:'Password change link would be sent.'})}>Change Password</Button>
                      <Button variant="outline" size="sm" className="text-orange-600 border-orange-600 hover:bg-orange-50" onClick={()=>toast({title:'Welcome Email Sent', description:'A welcome email has been resent.'})}>Resend Welcome Email</Button>
                      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={()=>toast({title:'Reset Password Email Sent', description:'Reset password email has been resent.'})}>Resend Reset Password Email</Button>
                      <Button onClick={saveProfile} disabled={saveProfileLoading} className="ml-auto text-white bg-blue-600 hover:bg-blue-700">Proceed to Update</Button>
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
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Notes + Actions */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea placeholder="Add notes about this customer" className="min-h-[120px]" value={profile.notes} onChange={(e)=>setProfile({...profile, notes: e.target.value})} />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled={actionLoading !== null} onClick={()=>updateCustomerFlag("status", buttonStates.isActive ? "inactive" : "active")}>
                      <UserMinus className="h-4 w-4 mr-1" />
                      Deactivate
                    </Button>
                    <Button variant="outline" size="sm" disabled={actionLoading !== null} onClick={()=>updateCustomerFlag("access_blocked", !buttonStates.isBlocked)}>
                      <ShieldBan className="h-4 w-4 mr-1" />
                      Block Access
                    </Button>
                    <Button variant="outline" size="sm" disabled={actionLoading !== null} onClick={()=>updateCustomerFlag("booking_blocked", !buttonStates.isBookingBlocked)}>
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Block From Booking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Address section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Address</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">You can add multiple addresses for any customer, and switch between them when making bookings.</p>
                </div>
                <Button variant="outline" size="sm" className="text-blue-600 border-blue-600" onClick={()=>setAddresses(a=>a.length?[...a,{id:String(Date.now()),aptNo:'',location:'',zip:'',isDefault:false}]:[{id:'1',aptNo:'',location:profile.address||'',zip:'',isDefault:true}])}>Add New</Button>
              </div>
            </CardHeader>
            <CardContent>
              {(addresses.length > 0 ? addresses : (profile.address ? [{ id: '1', aptNo: '', location: profile.address, zip: '', isDefault: true }] : [])).map((addr) => (
                <div key={addr.id} className="flex items-start justify-between p-4 border rounded-lg mb-3 last:mb-0 gap-4">
                  <div className="flex-1 grid gap-2">
                    {addr.isDefault && <Badge className="bg-green-100 text-green-700 w-fit">Default</Badge>}
                    <div>
                      <Label className="text-xs text-muted-foreground">Apt. no.</Label>
                      <Input value={addr.aptNo} onChange={(e)=>updateAddress(addr.id,'aptNo',e.target.value)} placeholder="605" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Location</Label>
                      <Input value={addr.location} onChange={(e)=>updateAddress(addr.id,'location',e.target.value)} placeholder="195 River Grove Way, West Palm Beach, FL, USA" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Zip/Postal code</Label>
                      <Input value={addr.zip} onChange={(e)=>updateAddress(addr.id,'zip',e.target.value)} placeholder="33407" className="mt-1" />
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={()=>setAddresses(a=>a.map(x=>({...x,isDefault:x.id===addr.id})))}>Set as default</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setAddresses((a) => {
                            const next = a.filter((x) => x.id !== addr.id);
                            if (addr.isDefault && next.length > 0) {
                              return next.map((x, i) => ({ ...x, isDefault: i === 0 }));
                            }
                            return next;
                          });
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {!profile.address && addresses.length === 0 && <p className="text-sm text-muted-foreground">No addresses added. Click Add New to add one.</p>}
            </CardContent>
          </Card>

          {/* Billing Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle>Billing Information</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">You can add multiple cards and switch between them when making bookings.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-pink-600 border-pink-600 hover:bg-pink-50" onClick={()=>toast({title:'Add Card Link', description:'Add card link would be sent to customer.'})}>Send &quot;Add card&quot; link</Button>
                  <Button variant="outline" size="sm" className="text-blue-600 border-blue-600" onClick={()=>toast({title:'Add Card', description:'Add card form would open.'})}>Add New</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No cards on file.</p>
            </CardContent>
          </Card>

          {/* Connect to Stripe */}
          <Card>
            <CardHeader>
              <CardTitle>Connect to Stripe</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">If your customer&apos;s card(s) are inside a Stripe account, you can connect their profile here.</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Switch checked={stripeConnected} onCheckedChange={setStripeConnected} />
                <span className="text-sm">{stripeConnected ? 'Enabled' : 'Disabled'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">To attach a tag to this customer, type a tag name and press enter or select from available tags.</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button type="button" onClick={()=>removeTag(t)} className="ml-1 hover:text-destructive" aria-label={`Remove ${t}`}>×</button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add a tag" value={newTag} onChange={(e)=>setNewTag(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&addTag()} />
                <Button variant="outline" size="sm" onClick={addTag} disabled={!newTag.trim()||tags.includes(newTag.trim())||tagsLoading}>+</Button>
              </div>
            </CardContent>
          </Card>
          </div>
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
              {invoicesLoading ? (
                <div className="text-sm text-muted-foreground py-6">Loading invoices...</div>
              ) : invoices.length === 0 ? (
                <div className="text-sm text-muted-foreground">No invoices yet.</div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-amber-600 mb-3">Pending ({invoices.filter((i) => i.payment_status === "pending").length})</h3>
                    <div className="space-y-2">
                      {invoices.filter((i) => i.payment_status === "pending").map((inv) => (
                        <div key={inv.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{inv.invoice_number}</span>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending</Badge>
                              </div>
                              {inv.invoice_bookings?.[0]?.bookings && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {inv.invoice_bookings[0].bookings?.service} — {inv.invoice_bookings[0].bookings?.scheduled_date || inv.invoice_bookings[0].bookings?.date}
                                </div>
                              )}
                              <div className="text-sm text-muted-foreground mt-1">
                                {inv.issue_date} {inv.due_date && `· Due: ${inv.due_date}`}
                              </div>
                              {inv.description && <div className="text-sm mt-2">{inv.description}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">${Number(inv.total_amount).toFixed(2)}</span>
                              <Button size="sm" variant="outline" onClick={() => sendInvoice(inv.id)} disabled={!!sendingInvoiceId}>
                                <Send className="h-4 w-4 mr-1" />
                                {sendingInvoiceId === inv.id ? "Sending..." : "Send"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateInvoiceStatus(inv.id, "paid")}>
                                Mark Paid
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteInvoice(inv.id)}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {invoices.filter((i) => i.payment_status === "pending").length === 0 && (
                        <div className="text-sm text-muted-foreground">No pending invoices.</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-600 mb-3">Paid ({invoices.filter((i) => i.payment_status === "paid").length})</h3>
                    <div className="space-y-2">
                      {invoices.filter((i) => i.payment_status === "paid").map((inv) => (
                        <div key={inv.id} className="border rounded-lg p-4 bg-green-50/50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{inv.invoice_number}</span>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">Paid</Badge>
                              </div>
                              {inv.invoice_bookings?.[0]?.bookings && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {inv.invoice_bookings[0].bookings?.service} — {inv.invoice_bookings[0].bookings?.scheduled_date || inv.invoice_bookings[0].bookings?.date}
                                </div>
                              )}
                              <div className="text-sm text-muted-foreground mt-1">
                                {inv.issue_date} {inv.due_date && `· Due: ${inv.due_date}`}
                              </div>
                              {inv.description && <div className="text-sm mt-2">{inv.description}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">${Number(inv.total_amount).toFixed(2)}</span>
                              <Button size="sm" variant="outline" onClick={() => sendInvoice(inv.id)} disabled={!!sendingInvoiceId}>
                                <Send className="h-4 w-4 mr-1" />
                                {sendingInvoiceId === inv.id ? "Sending..." : "Send"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateInvoiceStatus(inv.id, "pending")}>
                                Mark Pending
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteInvoice(inv.id)}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {invoices.filter((i) => i.payment_status === "paid").length === 0 && (
                        <div className="text-sm text-muted-foreground">No paid invoices.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <CreateInvoiceDialog
            open={showCreateInvoice}
            onOpenChange={setShowCreateInvoice}
            onCreated={refreshInvoices}
            customer={customer ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, address: customer.address } : null}
            businessId={currentBusiness?.id ?? null}
          />
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

      {/* Booking Summary modal */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0 sm:rounded-lg">
          <div className="px-5 pt-5 pb-0">
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-base font-semibold">Booking summary</DialogTitle>
            </DialogHeader>
          </div>
          {selectedBooking && (
            <div className="px-5 pb-5 min-w-0">
              {/* Customer info block */}
              <div className="flex gap-4 pt-4 min-w-0">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-200">
                  <UserIcon className="h-6 w-6 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[15px]">
                      {selectedBooking.customer?.name || customer?.name || "Customer"}
                    </span>
                    {isNewCustomer() && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">New</span>
                    )}
                  </div>
                  {(selectedBooking.customer?.email || customer?.email) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{selectedBooking.customer?.email || customer?.email}</span>
                    </div>
                  )}
                  {(selectedBooking.customer?.phone || customer?.phone) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span>{selectedBooking.customer?.phone || customer?.phone}</span>
                    </div>
                  )}
                  {(selectedBooking.address || customer?.address) && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
                      <span className="break-words">{selectedBooking.address || customer?.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible Booking details */}
              <div className="border-t border-gray-200 mt-4 pt-4 min-w-0">
                <Collapsible defaultOpen className="group">
                  <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-left font-semibold text-sm hover:opacity-80 transition-opacity min-w-0">
                    <span>Booking details</span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 group-data-[state=open]:hidden">
                      <Plus className="h-3 w-3" />
                    </span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 hidden group-data-[state=open]:flex">
                      <Minus className="h-3 w-3" />
                    </span>
                  </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2.5 text-sm pt-3 min-w-0">
                    <DetailRow label="Booking id" value={String(selectedBooking.id)} />
                    {selectedBooking.zipCode && <DetailRow label="Zip/Postal code" value={selectedBooking.zipCode} />}
                    {industries[0]?.name && <DetailRow label="Industry" value={industries[0].name} />}
                    <DetailRow label="Service" value={selectedBooking.service || "—"} />
                    {selectedBooking.frequency && <DetailRow label="Frequency" value={selectedBooking.frequency} />}
                    {selectedBooking.customization && typeof selectedBooking.customization === "object" && (() => {
                      const c = selectedBooking.customization as Record<string, unknown>;
                      const cv = (c.categoryValues || {}) as Record<string, string>;
                      const bath = cv.Bathroom ?? cv.bathroom ?? c.bathroom ?? c.bathrooms;
                      const sqft = cv["Sq Ft"] ?? cv.sqFt ?? cv.squareMeters ?? c.squareMeters ?? c.sqFt ?? c.sqft;
                      const bed = cv.Bedroom ?? cv.bedroom ?? c.bedroom ?? c.bedrooms;
                      const livingRoom = cv["Living Room"] ?? cv.livingRoom ?? c.livingRoom;
                      const storage = cv.Storage ?? cv.storage ?? c.storage;
                      const items: { label: string; value: string }[] = [];
                      if (bath != null && String(bath).trim()) items.push({ label: "Bathrooms", value: String(bath) });
                      if (sqft != null && String(sqft).trim()) items.push({ label: "Sq Ft", value: String(sqft) });
                      if (bed != null && String(bed).trim()) items.push({ label: "Bedrooms", value: String(bed) });
                      if (livingRoom != null && String(livingRoom).trim()) items.push({ label: "Living Room", value: String(livingRoom) });
                      if (storage != null && String(storage).trim()) items.push({ label: "Storage", value: String(storage) });
                      if (items.length === 0) return null;
                      return <>{items.map(({ label, value }) => <DetailRow key={label} label={label} value={value} />)}</>;
                    })()}
                    {(() => {
                      const c = (selectedBooking.customization || {}) as Record<string, unknown>;
                      const ids = (c.selectedExtras as string[]) || [];
                      const names = ids.map((id: string) => extrasMap[id] || id).filter(Boolean);
                      if (names.length === 0) return null;
                      return <DetailRow label="Extras" value={names.join(", ")} className="text-right" />;
                    })()}
                    {selectedBooking.provider?.name && (
                      <DetailRow label="Professionals" value="1" />
                    )}
                    {selectedBooking.durationMinutes != null && selectedBooking.durationMinutes > 0 && (
                      <DetailRow
                        label="Length"
                        value={selectedBooking.durationMinutes >= 60
                          ? `${Math.floor(selectedBooking.durationMinutes / 60)} Hr ${selectedBooking.durationMinutes % 60 ? `${selectedBooking.durationMinutes % 60} Min` : "0 Min"}`
                          : `${selectedBooking.durationMinutes} Min`}
                      />
                    )}
                    <DetailRow
                      label="Service date"
                      value={selectedBooking.date && selectedBooking.time
                        ? `${new Date(selectedBooking.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "2-digit", day: "2-digit", year: "numeric" })} — ${selectedBooking.time}`
                        : selectedBooking.date || "—"}
                    />
                    <DetailRow label="Assigned to" value={selectedBooking.provider?.name || "Unassigned"} className="font-bold text-gray-900" />
                    {selectedBooking.providerWage != null && selectedBooking.providerWage > 0 && (
                      <div className="flex justify-between items-center gap-3 min-w-0 flex-wrap sm:flex-nowrap">
                        <span className="text-gray-500 text-sm shrink-0">Provider payment</span>
                        <span className="text-sm font-medium text-right shrink-0">
                          ${Number(selectedBooking.providerWage).toFixed(2)}
                          <Link href="/admin/settings" className="text-blue-600 hover:underline ml-1.5 text-xs whitespace-nowrap">Learn more</Link>
                        </span>
                      </div>
                    )}
                    {(selectedBooking.aptNo || selectedBooking.address) && (
                      <DetailRow
                        label="Location"
                        value={[selectedBooking.aptNo ? `Apt - ${selectedBooking.aptNo}` : null, selectedBooking.address].filter(Boolean).join(", ")}
                        className="text-right"
                      />
                    )}
                    {selectedBooking.paymentMethod && (
                      <div className="flex justify-between items-center gap-3 min-w-0">
                        <span className="text-gray-500 text-sm shrink-0">Payment method</span>
                        <span className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium shrink-0",
                          (selectedBooking.paymentMethod === "online" || selectedBooking.paymentMethod === "card")
                            ? "bg-green-100 text-green-800"
                            : "bg-green-100 text-green-800"
                        )}>
                          {selectedBooking.paymentMethod === "online" || selectedBooking.paymentMethod === "card" ? "CC" : selectedBooking.paymentMethod === "cash" ? "Cash/Check" : selectedBooking.paymentMethod}
                        </span>
                      </div>
                    )}
                    {selectedBooking.amount && (
                      <div className="flex justify-between items-center gap-3 min-w-0 flex-wrap sm:flex-nowrap">
                        <span className="text-gray-500 text-sm shrink-0">Price details</span>
                        <span className="text-sm font-medium text-right shrink-0">
                          {selectedBooking.amount}
                          <Link href="/admin/settings" className="text-blue-600 hover:underline ml-1.5 text-xs whitespace-nowrap">Learn more</Link>
                        </span>
                      </div>
                    )}
                    {selectedBooking.status === "cancelled" && (selectedBooking as any).cancellationFeeAmount != null && Number((selectedBooking as any).cancellationFeeAmount) > 0 && (
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-gray-500 text-sm shrink-0">Cancellation fee (applied)</span>
                        <span className="text-sm font-medium text-right">
                          {(selectedBooking as any).cancellationFeeCurrency ?? "$"}{Number((selectedBooking as any).cancellationFeeAmount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedBooking.notes && <DetailRow label="Notes" value={selectedBooking.notes} className="text-right" />}
                    {selectedBooking.privateBookingNotes && selectedBooking.privateBookingNotes.length > 0 && (
                      <div className="pt-1 min-w-0">
                        <div className="text-gray-500 text-sm mb-1.5">Private booking note(s)</div>
                        <div className="space-y-1.5">
                          {selectedBooking.privateBookingNotes.map((note, i) => (
                            <div key={i} className="text-sm bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-gray-800 break-words">
                              {note}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedBooking.privateCustomerNotes && selectedBooking.privateCustomerNotes.length > 0 && (
                      <div className="pt-1 min-w-0">
                        <div className="text-gray-500 text-sm mb-1.5">Private customer note(s)</div>
                        <div className="space-y-1.5">
                          {selectedBooking.privateCustomerNotes.map((note, i) => (
                            <div key={i} className="text-sm bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-gray-800 break-words">
                              {note}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-gray-500 text-sm">Status</span>
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{selectedBooking.status}</span>
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-gray-200 min-w-0">
                      <p className="text-xs text-gray-500 break-words">Cancellation policy and fee are set in Settings → General → Cancellation.</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              </div>

              <Button
                variant="outline"
                className="w-full mt-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  router.push(`/admin/bookings?booking=${selectedBooking.id}`);
                  setSelectedBooking(null);
                }}
              >
                View in Bookings
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
