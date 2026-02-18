"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight as ChevronRightIcon, Calendar as CalendarIcon, Search as SearchIcon, Mail, Phone, Star, User as UserIcon, UserMinus, UserCog, ShieldBan, ShieldCheck, BellOff, BellRing, X, Upload, File, Download, Trash2, FileText, Image as ImageIcon, FileVideo, FileAudio, FolderOpen } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getDayOfWeekUTC, getTodayLocalDate } from "@/lib/date-utils";
import { useBusiness } from "@/contexts/BusinessContext";
import { AdminProviderDrive } from "@/components/drive/AdminProviderDrive";

const PROVIDERS_STORAGE_KEY = "adminProviders";
const BOOKINGS_STORAGE_KEY = "adminBookings";
const PROVIDER_SETTINGS_KEY = "adminProviderSettings"; // map id -> settings
const PROVIDER_AVATARS_KEY = "adminProviderAvatars"; // map id -> dataURL

type ProviderStatus = "active" | "inactive" | "suspended";

type Provider = {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  specialization: string;
  rating: number;
  completed_jobs: number;
  status: ProviderStatus;
  provider_type: string;
  send_email_notification: boolean;
  created_at: string;
  updated_at: string;
  name?: string; // Optional computed property for compatibility
};

type ScheduleSlot = {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  type: 'single' | 'range';
  endDate?: string; // for date range
};

type ProviderAvailability = {
  id: string;
  provider_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  is_available: boolean;
  effective_date: string | null;
  expiry_date: string | null;
};

type ProviderFile = {
  id: string;
  name: string;
  size: number | string;
  type: string;
  uploadedAt: string;
  dataUrl?: string;
  url?: string;
};

export default function ProviderProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentBusiness } = useBusiness();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [id, setId] = useState<string | null>(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showCreateAuthDialog, setShowCreateAuthDialog] = useState(false);
  const [createAuthPassword, setCreateAuthPassword] = useState('');
  const [createAuthConfirm, setCreateAuthConfirm] = useState('');
  const [creatingAuth, setCreatingAuth] = useState(false);

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, color: 'bg-gray-200', text: '' };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    const strengthConfig = [
      { color: 'bg-gray-200', text: '' },
      { color: 'bg-red-500', text: 'Weak' },
      { color: 'bg-orange-500', text: 'Fair' },
      { color: 'bg-yellow-500', text: 'Good' },
      { color: 'bg-blue-500', text: 'Strong' },
      { color: 'bg-green-500', text: 'Very Strong' }
    ];
    
    return {
      strength,
      color: strengthConfig[strength].color,
      text: strengthConfig[strength].text
    };
  };
  const { toast } = useToast();

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    newBookings: true,
    bookingChanges: true,
    bookingReminders: true,
    newReviews: true,
  });

  // Handle notification toggle
  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Set ID from params when available
  useEffect(() => {
    if (params?.id) {
      setId(params.id);
    }
  }, [params]);

  // Check for tab query parameter on mount
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
  const [calView, setCalView] = useState<"month" | "week" | "day">("month");

  type ProviderSettings = {
    canSetOwnSchedule: boolean;
    canSetOwnSettings: boolean;
    merchantApprovalRequired: boolean;
    showUnassignedJobs: boolean;
    adminOnlyBooking: boolean; // provider can be booked by admin/staff only
    disableSameDayJobs: boolean;
    showPaymentMethod: boolean;
    hideProviderPayments: boolean;
  };
  const [settings, setSettings] = useState<ProviderSettings>({
    canSetOwnSchedule: true,
    canSetOwnSettings: true,
    merchantApprovalRequired: false,
    showUnassignedJobs: true,
    adminOnlyBooking: false,
    disableSameDayJobs: false,
    showPaymentMethod: false,
    hideProviderPayments: false,
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Schedule management state
  const [providerAvailability, setProviderAvailability] = useState<ProviderAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<'single' | 'range'>('single');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<string | null>(null);

  // File management state (same data as provider portal My Drive)
  const [providerFiles, setProviderFiles] = useState<ProviderFile[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
  const [uploadingDriveFile, setUploadingDriveFile] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; size: number | string; uploadedAt: string } | null>(null);
  const fileUploadRef = useRef<HTMLInputElement | null>(null);
  const [isProviderStripeConnectEnabled, setIsProviderStripeConnectEnabled] = useState(false);

  useEffect(() => {
    const fetchProvider = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/providers/${id}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch provider');
        }

        const providerWithName = {
          ...result.provider,
          name: `${result.provider.first_name} ${result.provider.last_name}`
        };
        setProvider(providerWithName);
      } catch (error) {
        console.error('Error fetching provider:', error);
        toast({
          title: "Error",
          description: "Failed to load provider data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [id, toast]);

  // Fetch bookings for this provider
  useEffect(() => {
    const fetchProviderBookings = async () => {
      if (!id || !provider || !currentBusiness?.id) {
        console.log('Waiting for provider, id, or business context...', { id, provider: !!provider, business: !!currentBusiness?.id });
        return;
      }

      try {
        console.log(`📋 Fetching bookings for provider ${id} in business ${currentBusiness.id}`);
        // Fetch bookings from database where provider_id matches and business_id matches
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('provider_id', id)
          .eq('business_id', currentBusiness.id)
          .order('scheduled_date', { ascending: true })
          .order('scheduled_time', { ascending: true });

        if (error) {
          console.error('Error fetching provider bookings:', error);
          return;
        }

        // Transform bookings to match the expected format
        const transformedBookings: Booking[] = (bookings || []).map((booking: any) => ({
          id: booking.id,
          customer: {
            name: booking.customer_name || 'Unknown',
            email: booking.customer_email || '',
            phone: booking.customer_phone || ''
          },
          service: booking.service || 'Service',
          date: booking.scheduled_date || booking.date || '',
          time: booking.scheduled_time || booking.time || '',
          address: booking.address || '',
          status: booking.status || 'pending',
          amount: `$${booking.total_price || booking.amount || 0}`,
          provider: {
            id: booking.provider_id,
            name: provider.name
          }
        }));

        console.log(`✅ Found ${transformedBookings.length} bookings for provider ${id} in business ${currentBusiness.id}`);
        setAllBookings(transformedBookings);
      } catch (error) {
        console.error('Error fetching provider bookings:', error);
      }
    };

    fetchProviderBookings();
  }, [id, provider, currentBusiness?.id]);

  // Fetch provider availability from database
  useEffect(() => {
    const fetchProviderAvailability = async () => {
      if (!id || !currentBusiness?.id) return;
      setLoadingAvailability(true);
      try {
        const response = await fetch(
          `/api/admin/providers/${id}/availability?businessId=${encodeURIComponent(currentBusiness.id)}`
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.error('Error fetching provider availability:', result);
          return;
        }
        const availability = result.availability || result.data || result || [];
        setProviderAvailability(Array.isArray(availability) ? availability : []);
      } catch (error) {
        console.error('Error fetching provider availability:', error);
      } finally {
        setLoadingAvailability(false);
      }
    };

    fetchProviderAvailability();
  }, [id, currentBusiness?.id]);

  // Fetch provider drive files (same as provider portal My Drive)
  useEffect(() => {
    const fetchProviderDriveFiles = async () => {
      if (!id || !currentBusiness?.id) return;
      setLoadingDriveFiles(true);
      try {
        const res = await fetch(
          `/api/admin/providers/${id}/drive?businessId=${encodeURIComponent(currentBusiness.id)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setProviderFiles([]);
          return;
        }
        const list = (data.files || []).map((f: { id: string; name: string; type: string; fileType?: string; size?: string; sizeBytes?: number; uploadedAt: string; url?: string }) => ({
          id: f.id,
          name: f.name,
          size: f.sizeBytes ?? (f.size as string) ?? 0,
          type: f.type === 'folder' ? 'folder' : (f.fileType || 'other'),
          uploadedAt: f.uploadedAt,
          url: f.url,
        }));
        setProviderFiles(list);
      } catch {
        setProviderFiles([]);
      } finally {
        setLoadingDriveFiles(false);
      }
    };
    fetchProviderDriveFiles();
  }, [id, currentBusiness?.id]);

  const persistSettings = (next: Partial<ProviderSettings>) => {
    if (!id || typeof id !== 'string') return;
    const updated: ProviderSettings = { ...settings, ...next } as ProviderSettings;
    setSettings(updated);
    try {
      const raw = localStorage.getItem(PROVIDER_SETTINGS_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, ProviderSettings>) : {};
      map[id] = updated;
      localStorage.setItem(PROVIDER_SETTINGS_KEY, JSON.stringify(map));
    } catch {}
  };

  const initials = useMemo(() => {
    if (!provider?.first_name || !provider?.last_name) return "?";
    return `${provider.first_name[0]?.toUpperCase()}${provider.last_name[0]?.toUpperCase()}`;
  }, [provider]);

  const handleAvatarChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setAvatarUrl(dataUrl);
      try {
        const raw = localStorage.getItem(PROVIDER_AVATARS_KEY);
        const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        if (typeof id === 'string') {
          map[id] = dataUrl;
          localStorage.setItem(PROVIDER_AVATARS_KEY, JSON.stringify(map));
        }
        toast({ title: "Image uploaded", description: "Provider image has been updated." });
      } catch {}
    };
    reader.readAsDataURL(f);
  };

  const handleAddTimeSlot = async () => {
    if (!scheduleDate || !scheduleStartTime || !scheduleEndTime) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    if (scheduleType === 'range' && !scheduleEndDate) {
      toast({ title: "Error", description: "Please select an end date for the date range.", variant: "destructive" });
      return;
    }

    if (!id || !currentBusiness?.id) {
      toast({ title: "Error", description: "Missing provider or business context.", variant: "destructive" });
      return;
    }

    const normalizeTime = (t: string) => (t.length === 5 ? `${t}:00` : t);
    const startTime = scheduleStartTime;
    const endTime = scheduleEndTime;
    if (startTime >= endTime) {
      toast({ title: "Error", description: "End time must be after start time.", variant: "destructive" });
      return;
    }

    const buildDateRange = (start: string, end: string): string[] => {
      const [sy, sm, sd] = start.split('-').map(Number);
      const [ey, em, ed] = end.split('-').map(Number);
      const cur = new Date(Date.UTC(sy, sm - 1, sd));
      const last = new Date(Date.UTC(ey, em - 1, ed));
      const out: string[] = [];
      while (cur.getTime() <= last.getTime()) {
        out.push(cur.toISOString().slice(0, 10));
        cur.setUTCDate(cur.getUTCDate() + 1);
        if (out.length > 31) break;
      }
      return out;
    };

    const dates =
      scheduleType === 'range'
        ? buildDateRange(scheduleDate, scheduleEndDate)
        : [scheduleDate];

    if (scheduleType === 'range') {
      // Guard against accidental huge ranges
      const [sy, sm, sd] = scheduleDate.split('-').map(Number);
      const [ey, em, ed] = scheduleEndDate.split('-').map(Number);
      const startD = new Date(Date.UTC(sy, sm - 1, sd));
      const endD = new Date(Date.UTC(ey, em - 1, ed));
      const diffDays = Math.floor((endD.getTime() - startD.getTime()) / 86400000) + 1;
      if (diffDays > 31) {
        toast({ title: "Error", description: "Date range too large (max 31 days).", variant: "destructive" });
        return;
      }
    }

    try {
      setLoadingAvailability(true);

      if (editingAvailabilityId) {
        // Update a single existing availability entry
        const dateStr = scheduleDate;
        const payload = {
          businessId: currentBusiness.id,
          availabilityId: editingAvailabilityId,
          patch: {
            day_of_week: getDayOfWeekUTC(dateStr),
            start_time: normalizeTime(scheduleStartTime),
            end_time: normalizeTime(scheduleEndTime),
            effective_date: dateStr,
            expiry_date: dateStr,
            is_available: true,
          },
        };

        const response = await fetch(`/api/admin/providers/${id}/availability`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.error || 'Failed to update availability');
        }

        toast({ title: "Success", description: "Availability updated successfully." });
      } else {
        // Create one availability entry per date (single date or range)
        const items = dates.map(dateStr => ({
          day_of_week: getDayOfWeekUTC(dateStr),
          start_time: normalizeTime(scheduleStartTime),
          end_time: normalizeTime(scheduleEndTime),
          effective_date: dateStr,
          expiry_date: dateStr,
          is_available: true,
        }));

        const response = await fetch(`/api/admin/providers/${id}/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentBusiness.id, items }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.error || 'Failed to create availability');
        }

        toast({ title: "Success", description: "Availability added successfully." });
      }

      // Refresh availability from DB
      const refresh = await fetch(
        `/api/admin/providers/${id}/availability?businessId=${encodeURIComponent(currentBusiness.id)}`
      );
      const refreshed = await refresh.json().catch(() => ({}));
      if (refresh.ok) {
        const availability = refreshed.availability || refreshed.data || refreshed || [];
        setProviderAvailability(Array.isArray(availability) ? availability : []);
      }

      // Reset form
      setScheduleDate('');
      setScheduleEndDate('');
      setScheduleStartTime('');
      setScheduleEndTime('');
      setEditingAvailabilityId(null);
      setScheduleType('single');
      setIsScheduleDialogOpen(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e?.message || "Failed to save availability.", variant: "destructive" });
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleEditTimeSlot = (slot: ScheduleSlot) => {
    // Availability slots come from DB and are rendered with id prefix
    if (slot.id.startsWith('avail-')) {
      setEditingAvailabilityId(slot.id.replace('avail-', ''));
      setScheduleType('single');
      setScheduleDate(slot.date);
      setScheduleEndDate('');
      setScheduleStartTime(slot.startTime);
      setScheduleEndTime(slot.endTime);
      setIsScheduleDialogOpen(true);
      return;
    }

    // Legacy/manual slots are no longer managed here
    toast({
      title: "Not supported",
      description: "This item can't be edited here. Please edit provider availability instead.",
      variant: "destructive",
    });
    setIsScheduleDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsScheduleDialogOpen(false);
    setEditingAvailabilityId(null);
    setScheduleDate('');
    setScheduleEndDate('');
    setScheduleStartTime('');
    setScheduleEndTime('');
    setScheduleType('single');
  };

  const handleDeleteTimeSlot = async (slotId: string) => {
    if (!slotId.startsWith('avail-')) {
      toast({ title: "Not supported", description: "This item can't be deleted here.", variant: "destructive" });
      return;
    }
    if (!id || !currentBusiness?.id) {
      toast({ title: "Error", description: "Missing provider or business context.", variant: "destructive" });
      return;
    }

    const availabilityId = slotId.replace('avail-', '');
    try {
      setLoadingAvailability(true);
      const response = await fetch(`/api/admin/providers/${id}/availability`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentBusiness.id, availabilityId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to delete availability');
      }

      toast({ title: "Success", description: "Availability deleted successfully." });

      const refresh = await fetch(
        `/api/admin/providers/${id}/availability?businessId=${encodeURIComponent(currentBusiness.id)}`
      );
      const refreshed = await refresh.json().catch(() => ({}));
      if (refresh.ok) {
        const availability = refreshed.availability || refreshed.data || refreshed || [];
        setProviderAvailability(Array.isArray(availability) ? availability : []);
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e?.message || "Failed to delete availability.", variant: "destructive" });
    } finally {
      setLoadingAvailability(false);
    }
  };

  const getScheduleSlotsForDate = (dateStr: string): ScheduleSlot[] => {
    // Get availability slots from database based on day of week
    const dayOfWeek = getDayOfWeekUTC(dateStr); // match backend logic

    // Check if date is within effective_date and expiry_date range
    const availabilitySlots: ScheduleSlot[] = providerAvailability
      .filter(av => {
        if (av.day_of_week !== dayOfWeek || !av.is_available) return false;
        
        // Check effective_date
        if (av.effective_date && dateStr < av.effective_date) return false;
        
        // Check expiry_date
        if (av.expiry_date && dateStr > av.expiry_date) return false;
        
        return true;
      })
      .map(av => ({
        id: `avail-${av.id}`,
        date: dateStr,
        startTime: av.start_time.substring(0, 5), // Convert HH:MM:SS to HH:MM
        endTime: av.end_time.substring(0, 5),
        type: 'single' as const
      }));

    return availabilitySlots;
  };

  const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id || !currentBusiness?.id) return;

    setUploadingDriveFile(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.set('file', file);
        formData.set('businessId', currentBusiness.id);
        const res = await fetch(`/api/admin/providers/${id}/drive/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({ title: "Upload failed", description: data.error || file.name, variant: "destructive" });
          continue;
        }
        const f = data.file;
        setProviderFiles(prev => [...prev, {
          id: f.id,
          name: f.name,
          size: f.sizeBytes ?? f.size ?? 0,
          type: f.fileType || f.type || 'other',
          uploadedAt: f.uploadedAt,
          url: f.url,
        }]);
        toast({ title: "Success", description: `${file.name} uploaded.` });
      }
    } finally {
      setUploadingDriveFile(false);
      if (fileUploadRef.current) fileUploadRef.current.value = '';
    }
  };

  const handleDownloadFile = (file: ProviderFile) => {
    if (file.url) {
      window.open(file.url, '_blank');
      toast({ title: "Opened", description: `${file.name}.` });
    } else if (file.dataUrl) {
      const link = document.createElement('a');
      link.href = file.dataUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Success", description: `${file.name} downloaded.` });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!id || !currentBusiness?.id) return;
    try {
      const res = await fetch(
        `/api/admin/providers/${id}/drive?businessId=${encodeURIComponent(currentBusiness.id)}&fileId=${encodeURIComponent(fileId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to delete file.", variant: "destructive" });
        return;
      }
      setProviderFiles(prev => prev.filter(f => f.id !== fileId));
      toast({ title: "Success", description: "File deleted." });
    } catch {
      toast({ title: "Error", description: "Failed to delete file.", variant: "destructive" });
    }
  };

  const getFileIcon = (fileType: string) => {
    const t = (fileType || '').toLowerCase();
    if (t === 'folder') return <FolderOpen className="h-8 w-8" />;
    if (t.startsWith('image/') || t === 'image') return <ImageIcon className="h-8 w-8" />;
    if (t.startsWith('video/') || t === 'video') return <FileVideo className="h-8 w-8" />;
    if (t.startsWith('audio/')) return <FileAudio className="h-8 w-8" />;
    if (t.includes('pdf') || t.includes('document')) return <FileText className="h-8 w-8" />;
    return <File className="h-8 w-8" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading || !provider) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Loading provider...</div>
        <Button variant="outline" onClick={() => router.push("/admin/providers")}>Back to Providers</Button>
      </div>
    );
  }

  const statusBadge = (status: ProviderStatus) => {
    const styles: Record<ProviderStatus, string> = {
      active: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
      inactive: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400",
      suspended: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    };
    return (
      <Badge variant="outline" className={styles[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin/providers" aria-label="Back to Providers" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-cyan-600">
            <ChevronLeft className="h-5 w-5 text-white" />
          </Link>
          <h2 className="text-xl font-semibold text-white">{provider.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/20"
            onClick={() => {
              toast({
                title: "Provider Portal Access",
                description: `Accessing provider portal for ${provider.name}. Provider can log in at /provider/login`,
              });
              // In a real implementation, this could generate a magic link or open provider portal
            }}
          >
            <UserCog className="h-4 w-4 mr-2" />
            Provider Portal
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-semibold text-xl md:text-2xl overflow-hidden">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={provider.name} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${provider.email}`} className="text-cyan-700 hover:underline">{provider.email}</a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{provider.phone}</span>
                </div>
                <div><span className="font-medium">Specialization:</span> {provider.specialization}</div>
                <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span className="font-medium">{provider.rating}</span></div>
              </div>
            </div>
            <div className="w-full md:w-[420px] flex md:justify-end">
              <div className="flex items-center gap-2 ml-auto self-end">
                <div className="relative group">
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-10 w-10 rounded-full ${provider?.status === 'active' ? 'bg-green-100 hover:bg-green-200' : 'bg-slate-200 hover:bg-slate-300'} text-slate-800 dark:bg-slate-800/60 dark:text-slate-200`}
                    title={provider?.status === 'active' ? 'Deactivate' : 'Activate'}
                    onClick={async () => {
                      if (!provider) return;
                      const newStatus = provider.status === 'active' ? 'inactive' : 'active';
                      try {
                        const response = await fetch(`/api/admin/providers/${provider.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            ...provider,
                            status: newStatus
                          }),
                        });
                        
                        if (response.ok) {
                          setProvider({ ...provider, status: newStatus });
                          toast({
                            title: newStatus === 'active' ? "Provider Activated" : "Provider Deactivated",
                            description: `${provider.name} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}.`,
                          });
                        } else {
                          throw new Error('Failed to update status');
                        }
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to update provider status.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    {provider?.status === 'active' ? (
                      <UserMinus className="h-5 w-5" />
                    ) : (
                      <UserIcon className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {provider?.status === 'active' ? 'Deactivate' : 'Activate'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start gap-2 bg-muted/40 p-0 h-auto rounded-none border-b border-slate-200">
          <TabsTrigger value="dashboard" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">Dashboard</TabsTrigger>
          <TabsTrigger value="profile" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">Profile</TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">Schedule</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">Settings</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">Payments</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">Notifications</TabsTrigger>
          <TabsTrigger value="payment-processor" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">Payment processor</TabsTrigger>
          <TabsTrigger value="drive" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">My drive</TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">Reviews</TabsTrigger>
          <TabsTrigger value="apps" className="rounded-none px-3 py-3 text-white data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">Apps & Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 gap-4">
            <Card>
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
                  if (!provider) return null;
                  const myBookings = allBookings.filter(b => (b.provider?.id && String(b.provider.id) === String(provider.id)) || b.provider?.name === provider.name);
                  const date = currentDate;
                  const year = date.getFullYear();
                  const month = date.getMonth();
                  const first = new Date(year, month, 1);
                  const last = new Date(year, month + 1, 0);
                  const days = last.getDate();
                  const startEmpty = first.getDay();
                  const format = (y:number,m:number,day:number) => `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                  if (calView === 'month') {
                    return (
                      <div className="grid grid-cols-7 gap-1.5">
                        {dayNames.map(d => (
                          <div key={d} className="text-center font-semibold text-sm text-muted-foreground py-1.5">{d}</div>
                        ))}
                        {Array.from({length: startEmpty}).map((_,i)=>(<div key={`empty-${i}`} className="h-20" />))}
                        {Array.from({length: days}).map((_,i)=>{
                          const day=i+1; const key=format(year,month,day);
                          const items=myBookings.filter(b=>b.date===key);
                          const today=new Date(); const isToday=today.getDate()===day && today.getMonth()===month && today.getFullYear()===year;
                          return (
                            <div key={key} className={`h-20 border rounded p-1.5 ${isToday? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20':'border-border'}`}>
                              <div className="flex flex-col h-full">
                                <div className={`text-sm font-medium mb-1 ${isToday?'text-cyan-600 dark:text-cyan-400':''}`}>{day}</div>
                                <div className="flex-1 overflow-hidden space-y-0.5">
                                  {items.slice(0,2).map(b=> (
                                    <div key={b.id} className="text-[10px] px-1 py-0.5 rounded text-white" style={{background:'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)'}}>
                                      <div className="truncate">{b.time}</div>
                                    </div>
                                  ))}
                                  {items.length>2 && (
                                    <div className="text-[10px] text-muted-foreground">+{items.length-2}</div>
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
                      <div className="grid grid-cols-7 gap-1">
                        {daysArr.map(({label,num,key,isToday})=>{
                          const items=myBookings.filter(b=>b.date===key);
                          return (
                            <div key={key} className={`min-h-[100px] border rounded p-1 ${isToday? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20':'border-border'}`}>
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
                          <div className="text-xs text-muted-foreground mt-1">Customer: {b.customer.name}</div>
                          {b.address && <div className="text-xs text-muted-foreground">{b.address}</div>}
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
            <CardContent className="space-y-4">
              {provider && !provider.user_id && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-amber-200">No login account</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This provider has no auth user. They cannot sign in until you create a login account.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowCreateAuthDialog(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                  >
                    Create login account
                  </Button>
                </div>
              )}
              <div className="flex items-start gap-6">
                <div className="h-28 w-28 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={provider.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl text-muted-foreground">{initials}</span>
                  )}
                </div>
                <div className="flex-1">
                  <Label>Choose file</Label>
                  <div className="flex gap-2 mt-2">
                    <Input ref={fileInputRef as any} type="file" accept="image/*" className="flex-1" onChange={handleAvatarChange} />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Browse</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Image size should not be more than 300px by 300px.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input 
                    value={provider.name} 
                    onChange={(e) => setProvider({...provider, first_name: e.target.value.split(' ')[0] || '', last_name: e.target.value.split(' ').slice(1).join(' ') || ''})}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    value={provider.email} 
                    onChange={(e) => setProvider({...provider, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input 
                    value={provider.phone} 
                    onChange={(e) => setProvider({...provider, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Specialization</Label>
                  <Input 
                    value={provider.specialization} 
                    onChange={(e) => setProvider({...provider, specialization: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Completed Jobs</Label>
                  <Input value={String(provider.completed_jobs)} disabled />
                </div>
                <div>
                  <Label>Status</Label>
                  <Input value={provider.status} readOnly />
                </div>
              </div>

              {/* Password Section - only when provider has a login account */}
              {provider.user_id && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Password Management</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                  >
                    {showPasswordFields ? 'Hide' : 'Change'} Password
                  </Button>
                </div>
                
                {showPasswordFields && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        placeholder="Enter new password"
                      />
                      {passwordData.newPassword && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrength(passwordData.newPassword).color}`}
                                style={{ width: `${(getPasswordStrength(passwordData.newPassword).strength / 5) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {getPasswordStrength(passwordData.newPassword).text}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Confirm Password</Label>
                      <Input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        placeholder="Confirm new password"
                      />
                      {passwordData.confirmPassword && passwordData.newPassword && (
                        <div className="mt-2 text-xs">
                          {passwordData.newPassword === passwordData.confirmPassword ? (
                            <span className="text-green-600">✓ Passwords match</span>
                          ) : (
                            <span className="text-red-600">✗ Passwords do not match</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              )}
              <div className="flex items-center justify-end pt-2 mt-2 border-t">
                <Button
                  className="text-white"
                  onClick={async () => {
                    if (!provider) return;
                    
                    // Validate password if fields are shown
                    if (showPasswordFields) {
                      if (!passwordData.newPassword) {
                        toast({
                          title: "Validation Error",
                          description: "Please enter a new password.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      if (passwordData.newPassword.length < 6) {
                        toast({
                          title: "Validation Error", 
                          description: "Password must be at least 6 characters long.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      if (passwordData.newPassword !== passwordData.confirmPassword) {
                        toast({
                          title: "Validation Error",
                          description: "Passwords do not match.",
                          variant: "destructive",
                        });
                        return;
                      }
                    }
                    
                    setSaving(true);
                    try {
                      // Prepare update data
                      const updateData: any = {
                        first_name: provider.first_name,
                        last_name: provider.last_name,
                        email: provider.email,
                        phone: provider.phone,
                        address: provider.address,
                        specialization: provider.specialization,
                        status: provider.status,
                        provider_type: provider.provider_type,
                        send_email_notification: provider.send_email_notification,
                        user_id: provider.user_id
                      };

                      // Add password if it's being updated
                      if (showPasswordFields && passwordData.newPassword) {
                        updateData.password = passwordData.newPassword;
                      }

                      const response = await fetch(`/api/admin/providers/${provider.id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updateData),
                      });
                      
                      if (response.ok) {
                        const result = await response.json();
                        toast({ 
                          title: "Changes saved", 
                          description: result.message || "Provider profile updated successfully." 
                        });
                        
                        // Reset password fields
                        if (showPasswordFields) {
                          setPasswordData({ newPassword: '', confirmPassword: '' });
                          setShowPasswordFields(false);
                        }
                      } else {
                        throw new Error('Failed to save changes');
                      }
                    } catch (error) {
                      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' }}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Schedule</h2>
                <p className="text-sm text-slate-600 dark:text-white/70 mt-1">
                  This schedule is the provider’s real booking availability (saved in the database) {loadingAvailability && '(loading...)'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  className="text-white border-white/20 hover:bg-white/10"
                  onClick={() => {
                    // Refresh availability from API
                    const fetchAvailability = async () => {
                      if (!id || !currentBusiness?.id) return;
                      setLoadingAvailability(true);
                      try {
                        const response = await fetch(
                          `/api/admin/providers/${id}/availability?businessId=${encodeURIComponent(currentBusiness.id)}`
                        );
                        const result = await response.json().catch(() => ({}));
                        if (response.ok) {
                          const availability = result.availability || result.data || result || [];
                          setProviderAvailability(Array.isArray(availability) ? availability : []);
                          toast({ title: "Refreshed", description: "Availability updated from database." });
                        } else {
                          console.error('Error refreshing availability:', result);
                        }
                      } catch (error) {
                        console.error('Error refreshing availability:', error);
                      } finally {
                        setLoadingAvailability(false);
                      }
                    };
                    fetchAvailability();
                  }}
                >
                  Refresh Availability
                </Button>
                <Button 
                  className="text-white" 
                  style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' }}
                  onClick={() => setIsScheduleDialogOpen(true)}
                >
                  Manage Availability
                </Button>
              </div>
            </div>
            
            <div className="backdrop-blur-md bg-white/80 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(currentDate)}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(new Date())}
                    title="Today"
                    className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-black/30 dark:border-white/10 dark:text-white dark:hover:bg-black/50"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}
                    aria-label="Previous"
                    className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-black/30 dark:border-white/10 dark:text-white dark:hover:bg-black/50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}
                    aria-label="Next"
                    className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-black/30 dark:border-white/10 dark:text-white dark:hover:bg-black/50"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {(() => {
                if (!provider) return null;
                const myBookings = allBookings.filter(b => (b.provider?.id && String(b.provider.id) === String(provider.id)) || b.provider?.name === provider.name);
                const date = currentDate;
                const year = date.getFullYear();
                const month = date.getMonth();
                const first = new Date(year, month, 1);
                const last = new Date(year, month + 1, 0);
                const days = last.getDate();
                const startEmpty = first.getDay();
                const format = (y:number,m:number,day:number) => `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                
                return (
                  <div className="grid grid-cols-7 gap-2">
                    {dayNames.map(d => (
                      <div key={d} className="text-center font-semibold text-sm text-slate-600 dark:text-white/70 py-2">{d}</div>
                    ))}
                    {Array.from({length: startEmpty}).map((_,i)=>(<div key={`empty-${i}`} className="h-24" />))}
                    {Array.from({length: days}).map((_,i)=>{
                      const day=i+1; const key=format(year,month,day);
                      const items=myBookings.filter(b=>b.date===key);
                      const scheduleItems = getScheduleSlotsForDate(key);
                      const today=new Date(); const isToday=today.getDate()===day && today.getMonth()===month && today.getFullYear()===year;
                      return (
                        <div 
                          key={key} 
                          className={`h-24 backdrop-blur-sm rounded-lg p-2 transition-all border ${
                            isToday 
                              ? 'bg-cyan-50 border-cyan-400 dark:bg-cyan-500/20 dark:border-cyan-400' 
                              : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-black/20 dark:border-white/5 dark:hover:bg-black/30'
                          }`}
                        >
                          <div className="flex flex-col h-full">
                            <div className={`text-sm font-medium mb-1 ${isToday ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-900 dark:text-white/90'}`}>
                              {day}
                            </div>
                            <div className="flex-1 overflow-hidden space-y-1">
                              {scheduleItems.slice(0,2).map(slot=> {
                                // Convert 24-hour to 12-hour format
                                const formatTime = (time24: string) => {
                                  const [hours, minutes] = time24.split(':');
                                  const hour = parseInt(hours);
                                  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                  const ampm = hour < 12 ? 'AM' : 'PM';
                                  return `${hour12}:${minutes} ${ampm}`;
                                };
                                
                                return (
                                  <div 
                                    key={slot.id} 
                                    className="text-[10px] px-1 py-0.5 rounded text-white bg-green-600/50 backdrop-blur-sm cursor-pointer hover:bg-green-600/70 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTimeSlot(slot);
                                    }}
                                  >
                                    <div className="truncate">{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</div>
                                  </div>
                                );
                              })}
                              {scheduleItems.length>2 && (
                                <div className="text-[10px] text-white/50">+{scheduleItems.length-2} slots</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Manage Schedule Dialog */}
            <Dialog open={isScheduleDialogOpen} onOpenChange={handleCloseDialog}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editingAvailabilityId ? 'Edit Availability' : 'Manage Provider Availability'}</DialogTitle>
                  <DialogDescription>
                    {editingAvailabilityId 
                      ? `Edit booking availability for ${provider.name}. This affects the booking form.`
                      : `Add booking availability for ${provider.name}. This affects the booking form.`
                    }
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Schedule Type */}
                  <div className="space-y-2">
                    <Label>Schedule Type</Label>
                    <RadioGroup value={scheduleType} onValueChange={(value: 'single' | 'range') => setScheduleType(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="single" />
                        <Label htmlFor="single" className="font-normal cursor-pointer">Single Date</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="range" id="range" />
                        <Label htmlFor="range" className="font-normal cursor-pointer">Date Range</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Date Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="schedule-date">Date {scheduleType === 'range' && '(Start)'}</Label>
                      <Input
                        id="schedule-date"
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={getTodayLocalDate()}
                      />
                    </div>

                    {scheduleType === 'range' && (
                      <div className="space-y-2">
                        <Label htmlFor="schedule-end-date">End Date</Label>
                        <Input
                          id="schedule-end-date"
                          type="date"
                          value={scheduleEndDate}
                          onChange={(e) => setScheduleEndDate(e.target.value)}
                          min={scheduleDate}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="start-time">Start Time</Label>
                      <Select value={scheduleStartTime} onValueChange={setScheduleStartTime}>
                        <SelectTrigger id="start-time">
                          <SelectValue placeholder="Select start time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {Array.from({ length: 48 }).map((_, i) => {
                            const hour = Math.floor(i / 2);
                            const minute = i % 2 === 0 ? '00' : '30';
                            const time24 = `${String(hour).padStart(2, '0')}:${minute}`;
                            const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            const ampm = hour < 12 ? 'AM' : 'PM';
                            const time12 = `${hour12}:${minute} ${ampm}`;
                            return (
                              <SelectItem key={time24} value={time24}>{time12}</SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end-time">End Time</Label>
                      <Select value={scheduleEndTime} onValueChange={setScheduleEndTime}>
                        <SelectTrigger id="end-time">
                          <SelectValue placeholder="Select end time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {Array.from({ length: 48 }).map((_, i) => {
                            const hour = Math.floor(i / 2);
                            const minute = i % 2 === 0 ? '00' : '30';
                            const time24 = `${String(hour).padStart(2, '0')}:${minute}`;
                            const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            const ampm = hour < 12 ? 'AM' : 'PM';
                            const time12 = `${hour12}:${minute} ${ampm}`;
                            return (
                              <SelectItem key={time24} value={time24}>{time12}</SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Tip: click an availability block on the calendar to edit it.
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddTimeSlot}
                    className="text-white"
                    style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' }}
                  >
                    {editingAvailabilityId ? 'Update Availability' : 'Add Availability'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="w-full justify-start gap-2 bg-muted/40 p-0 h-auto rounded-none border-b border-slate-200">
                  <TabsTrigger value="general" className="rounded-none px-3 py-2 text-slate-600 data-[state=active]:font-semibold data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">General</TabsTrigger>
                  <TabsTrigger value="industry" className="rounded-none px-3 py-2 text-slate-600 data-[state=active]:font-semibold data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">Industry</TabsTrigger>
                  <TabsTrigger value="forms" className="rounded-none px-3 py-2 text-slate-600 data-[state=active]:font-semibold data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">Forms</TabsTrigger>
                  <TabsTrigger value="block" className="rounded-none px-3 py-2 text-slate-600 data-[state=active]:font-semibold data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-cyan-600">Block contact</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="pt-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="block mb-1">Can this provider/team set their own schedule?</Label>
                      <div className="flex items-center gap-6 text-sm">
                        <label className="flex items-center gap-2"><input type="radio" name="ownSchedule" checked={settings.canSetOwnSchedule} onChange={()=>persistSettings({canSetOwnSchedule:true})} /> Yes</label>
                        <label className="flex items-center gap-2"><input type="radio" name="ownSchedule" checked={!settings.canSetOwnSchedule} onChange={()=>persistSettings({canSetOwnSchedule:false})} /> No</label>
                      </div>
                    </div>

                    <div>
                      <Label className="block mb-1">Can this provider/team set their own settings?</Label>
                      <div className="flex items-center gap-6 text-sm">
                        <label className="flex items-center gap-2"><input type="radio" name="ownSettings" checked={settings.canSetOwnSettings} onChange={()=>persistSettings({canSetOwnSettings:true})} /> Yes</label>
                        <label className="flex items-center gap-2"><input type="radio" name="ownSettings" checked={!settings.canSetOwnSettings} onChange={()=>persistSettings({canSetOwnSettings:false})} /> No</label>
                      </div>
                    </div>

                    <div>
                      <Label className="block mb-1">Does merchant have to approve the request?</Label>
                      <div className="flex items-center gap-6 text-sm">
                        <label className="flex items-center gap-2"><input type="radio" name="merchantApproval" checked={settings.merchantApprovalRequired} onChange={()=>persistSettings({merchantApprovalRequired:true})} /> Yes</label>
                        <label className="flex items-center gap-2"><input type="radio" name="merchantApproval" checked={!settings.merchantApprovalRequired} onChange={()=>persistSettings({merchantApprovalRequired:false})} /> No</label>
                      </div>
                    </div>

                    <div>
                      <Label className="block mb-1">Show unassigned jobs to provider?</Label>
                      <div className="flex items-center gap-6 text-sm">
                        <label className="flex items-center gap-2"><input type="radio" name="showUnassigned" checked={settings.showUnassignedJobs} onChange={()=>persistSettings({showUnassignedJobs:true})} /> Yes</label>
                        <label className="flex items-center gap-2"><input type="radio" name="showUnassigned" checked={!settings.showUnassignedJobs} onChange={()=>persistSettings({showUnassignedJobs:false})} /> No</label>
                      </div>
                    </div>

                    <div>
                      <Label className="block mb-1">Turn off this provider or team from being booked by any customer but can be booked by admin/staff only?</Label>
                      <div className="flex items-center gap-6 text-sm">
                        <label className="flex items-center gap-2"><input type="radio" name="adminOnly" checked={settings.adminOnlyBooking} onChange={()=>persistSettings({adminOnlyBooking:true})} /> Yes</label>
                        <label className="flex items-center gap-2"><input type="radio" name="adminOnly" checked={!settings.adminOnlyBooking} onChange={()=>persistSettings({adminOnlyBooking:false})} /> No</label>
                      </div>
                    </div>

                    <div>
                      <Label className="block mb-1">Turn off this provider or team from being booked for same day jobs?</Label>
                      <div className="flex items-center gap-6 text-sm">
                        <label className="flex items-center gap-2"><input type="radio" name="sameDay" checked={settings.disableSameDayJobs} onChange={()=>persistSettings({disableSameDayJobs:true})} /> Yes</label>
                        <label className="flex items-center gap-2"><input type="radio" name="sameDay" checked={!settings.disableSameDayJobs} onChange={()=>persistSettings({disableSameDayJobs:false})} /> No</label>
                      </div>
                    </div>

                    <div>
                      <Label className="block mb-1">Do you want to show payment method to this provider/team?</Label>
                      <div className="flex items-center gap-6 text-sm">
                        <label className="flex items-center gap-2"><input type="radio" name="showPayment" checked={settings.showPaymentMethod} onChange={()=>persistSettings({showPaymentMethod:true})} /> Yes</label>
                        <label className="flex items-center gap-2"><input type="radio" name="showPayment" checked={!settings.showPaymentMethod} onChange={()=>persistSettings({showPaymentMethod:false})} /> No</label>
                      </div>
                    </div>

                    <div>
                      <Label className="block mb-1">Would you like to hide the provider's payment(s) from your provider/team?</Label>
                      <div className="flex items-center gap-6 text-sm">
                        <label className="flex items-center gap-2"><input type="radio" name="hidePayments" checked={settings.hideProviderPayments} onChange={()=>persistSettings({hideProviderPayments:true})} /> Yes</label>
                        <label className="flex items-center gap-2"><input type="radio" name="hidePayments" checked={!settings.hideProviderPayments} onChange={()=>persistSettings({hideProviderPayments:false})} /> No (show all)</label>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t flex items-center justify-end">
                      <Button
                        className="text-white"
                        onClick={() => toast({ title: "Settings saved", description: "Provider settings have been updated." })}
                        style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="industry" className="pt-4">
                  <div className="text-sm text-muted-foreground">No industry-specific settings yet.</div>
                </TabsContent>

                <TabsContent value="forms" className="pt-4">
                  <div className="text-sm text-muted-foreground">No forms configured for this provider.</div>
                </TabsContent>

                <TabsContent value="block" className="pt-4">
                  <div className="space-y-3">
                    <Label className="block mb-1">Block this provider from being contacted?</Label>
                    <div className="flex items-center gap-6 text-sm">
                      <label className="flex items-center gap-2"><input type="radio" name="blockContact" /> Yes</label>
                      <label className="flex items-center gap-2"><input type="radio" name="blockContact" defaultChecked /> No</label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">No payments yet.</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select the type of notifications you want to receive
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Email Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications to your email address
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.email}
                      onCheckedChange={() => handleNotificationToggle('email')}
                    />
                  </div>
                  
                  {notificationSettings.email && (
                    <div className="space-y-3 pl-6">
                      <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/10">
                        <div>
                          <Label htmlFor="new-bookings" className="font-normal">New Bookings</Label>
                          <p className="text-sm text-muted-foreground">
                            When a customer books your service
                          </p>
                        </div>
                        <Switch
                          id="new-bookings"
                          checked={notificationSettings.newBookings}
                          onCheckedChange={() => handleNotificationToggle('newBookings')}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/10">
                        <div>
                          <Label htmlFor="booking-changes" className="font-normal">Booking Changes</Label>
                          <p className="text-sm text-muted-foreground">
                            When a booking is modified after 5 PM
                          </p>
                        </div>
                        <Switch
                          id="booking-changes"
                          checked={notificationSettings.bookingChanges}
                          onCheckedChange={() => handleNotificationToggle('bookingChanges')}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/10">
                        <div>
                          <Label htmlFor="booking-reminders" className="font-normal">Booking Reminders</Label>
                          <p className="text-sm text-muted-foreground">
                            One hour reminder for upcoming bookings
                          </p>
                        </div>
                        <Switch
                          id="booking-reminders"
                          checked={notificationSettings.bookingReminders}
                          onCheckedChange={() => handleNotificationToggle('bookingReminders')}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/10">
                        <div>
                          <Label htmlFor="new-reviews" className="font-normal">Booking Cancellation</Label>
                          <p className="text-sm text-muted-foreground">
                            Booking cancellation after 5 PM
                          </p>
                        </div>
                        <Switch
                          id="new-reviews"
                          checked={notificationSettings.newReviews}
                          onCheckedChange={() => handleNotificationToggle('newReviews')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end pt-6">
                <Button 
                  className="px-6"
                  onClick={() => {
                    // In a real app, you would save these settings to your backend
                    toast({
                      title: "Notification settings updated",
                      description: "Your notification preferences have been saved.",
                    });
                  }}
                  style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' }}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-processor">
          <div className="space-y-6">
            {/* Stripe Connect Section */}
            <Card>
              <CardHeader>
                <CardTitle>Payment processor</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage payment processing for this provider
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Make your account Stripe-connected */}
                <div className="border rounded-lg p-4 bg-muted/20">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <svg className="h-5 w-5" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13.976 9.5H22.5L28 0H0L5.5 9.5H13.5V14.5H0L5.5 24H14L8.5 14.5H13.976V9.5Z" fill="#635bff"/>
                        </svg>
                        Make your account Stripe-connected
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Connect your Stripe account to receive payments directly
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        // In a real app, this would redirect to Stripe OAuth
                        toast({
                          title: "Stripe Connect",
                          description: "Redirecting to Stripe to connect your account...",
                        });
                      }}
                    >
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.976 9.5H22.5L28 0H0L5.5 9.5H13.5V14.5H0L5.5 24H14L8.5 14.5H13.976V9.5Z" fill="currentColor"/>
                      </svg>
                      Connect with Stripe
                    </Button>
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground">
                    <p>Connect your Stripe account to start receiving payments.</p>
                  </div>
                </div>

                {/* Provider stripe connect */}
                <div className="border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Provider stripe connect</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Here you can add the provider's Stripe id to connect their Stripe account for them.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {isProviderStripeConnectEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <Switch 
                        checked={isProviderStripeConnectEnabled}
                        onCheckedChange={(checked) => {
                          setIsProviderStripeConnectEnabled(checked);
                          // Save to local storage or API in a real app
                          const settings = JSON.parse(localStorage.getItem(PROVIDER_SETTINGS_KEY) || '{}');
                          settings[id] = settings[id] || {};
                          settings[id].stripeConnectEnabled = checked;
                          localStorage.setItem(PROVIDER_SETTINGS_KEY, JSON.stringify(settings));
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="drive">
          {provider?.id && currentBusiness?.id ? (
            <AdminProviderDrive providerId={provider.id} businessId={currentBusiness.id} />
          ) : (
            <div className="text-sm text-muted-foreground">
              Select a business to view this provider’s drive.
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">No reviews yet.</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apps">
          <Card>
            <CardHeader>
              <CardTitle>Apps & Integrations</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">No integrations connected.</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create login account for provider with null user_id */}
      <Dialog open={showCreateAuthDialog} onOpenChange={setShowCreateAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create login account</DialogTitle>
            <DialogDescription>
              Set a temporary password for {provider?.first_name} {provider?.last_name}. They can sign in at the provider portal with their email and this password, then change it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Password (min 8 characters)</Label>
              <Input
                type="password"
                value={createAuthPassword}
                onChange={(e) => setCreateAuthPassword(e.target.value)}
                placeholder="Temporary password"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Confirm password</Label>
              <Input
                type="password"
                value={createAuthConfirm}
                onChange={(e) => setCreateAuthConfirm(e.target.value)}
                placeholder="Confirm"
                className="mt-1"
              />
              {createAuthConfirm && createAuthPassword !== createAuthConfirm && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAuthDialog(false)} disabled={creatingAuth}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={creatingAuth || createAuthPassword.length < 8 || createAuthPassword !== createAuthConfirm}
              onClick={async () => {
                if (!provider?.id) return;
                setCreatingAuth(true);
                try {
                  const res = await fetch(`/api/admin/providers/${provider.id}/create-auth-user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: createAuthPassword }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Failed to create login account');
                  toast({
                    title: 'Login account created',
                    description: data.message || 'Provider can now sign in with their email and the password you set.',
                  });
                  setShowCreateAuthDialog(false);
                  setCreateAuthPassword('');
                  setCreateAuthConfirm('');
                  setProvider((p) => p ? { ...p, user_id: data.userId } : p);
                } catch (e: unknown) {
                  toast({
                    title: 'Error',
                    description: e instanceof Error ? e.message : 'Failed to create login account',
                    variant: 'destructive',
                  });
                } finally {
                  setCreatingAuth(false);
                }
              }}
            >
              {creatingAuth ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                'Create login account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
