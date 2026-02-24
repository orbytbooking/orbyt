"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Plus, Trash2, Edit, Settings, Calendar, CalendarDays, MapPin, Minus, ChevronLeft, ChevronRight, History, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, subDays, isBefore, isAfter } from 'date-fns';
import { TimePicker } from "@/components/ui/time-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Per-time-slot row in Maximum settings table */
interface MaximumSettingsSlot {
  id: string;
  time: string; // "HH:mm"
  maxJobs: number;
  displayOn: "Both" | "Admin only";
}

interface TimeSlot {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  createdAt: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
  createdAt: string;
}

interface MaximumSettings {
  maxBookingsPerDay: number;
  maxBookingsPerWeek: number;
  maxBookingsPerMonth: number;
  maxAdvanceBookingDays: number;
  enabled: boolean;
}

interface DailySettings {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  maxSlots: number;
}

interface BookingSpot {
  id: string;
  type: 'exact' | 'window';
  time?: string; // For exact times (e.g., "09:00")
  startTime?: string; // For windows (e.g., "09:00")
  endTime?: string; // For windows (e.g., "11:00")
  label?: string; // Custom label (optional)
}

interface LocationBookingSpots {
  locationId: string;
  locationName: string;
  spots: BookingSpot[];
}

interface BookingSpotsConfig {
  locations: LocationBookingSpots[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Sunday first for Maximum settings table */
const DAYS_MAXIMUM = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const RESERVE_SLOT_STORAGE_KEY = 'reserveSlotSettings';

const INTERVAL_HOURS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const INTERVAL_MINUTES = [0, 15, 30, 45];
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MERIDIANS = ['AM', 'PM'] as const;

export default function ReserveSlotPage() {
  const { currentBusiness } = useBusiness();
  const [activeTab, setActiveTab] = useState("maximum");
  
  // Maximum Settings
  const [maxSettings, setMaxSettings] = useState<MaximumSettings>({
    maxBookingsPerDay: 10,
    maxBookingsPerWeek: 50,
    maxBookingsPerMonth: 200,
    maxAdvanceBookingDays: 90,
    enabled: true,
  });

  // Maximum settings table: quick-add template + per-day slots
  const [quickAddSpots, setQuickAddSpots] = useState<string[]>([]);
  const [maximumByDay, setMaximumByDay] = useState<Record<string, { enabled: boolean; slots: MaximumSettingsSlot[] }>>(() => {
    const o: Record<string, { enabled: boolean; slots: MaximumSettingsSlot[] }> = {};
    DAYS_MAXIMUM.forEach(d => { o[d] = { enabled: d !== 'Sunday', slots: [] }; });
    return o;
  });
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState<{
    intervalHours: number;
    intervalMinutes: number;
    fromHour: number;
    fromMin: number;
    fromMeridian: 'AM' | 'PM';
    toHour: number;
    toMin: number;
    toMeridian: 'AM' | 'PM';
    selectedDays: Set<string>;
    limit: number;
    displayOn: 'Both' | 'Admin only';
  }>({
    intervalHours: 0,
    intervalMinutes: 30,
    fromHour: 8,
    fromMin: 0,
    fromMeridian: 'AM',
    toHour: 5,
    toMin: 0,
    toMeridian: 'PM',
    selectedDays: new Set<string>(DAYS_MAXIMUM),
    limit: 20,
    displayOn: 'Both',
  });
  const [quickAddErrors, setQuickAddErrors] = useState<{ intervalMinutes?: string }>({});
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Daily Settings
  const [dailySettings, setDailySettings] = useState<DailySettings[]>(
    DAYS.map(day => ({
      day,
      enabled: day !== 'Sunday',
      startTime: '09:00',
      endTime: '17:00',
      maxSlots: 10,
    }))
  );

  // Time Slots (existing functionality)
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<TimeSlot, 'id' | 'createdAt'>>({ 
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    reason: ''
  });

  // Holidays
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [holidayForm, setHolidayForm] = useState<Omit<Holiday, 'id' | 'createdAt'>>({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    recurring: false,
  });

  // Booking Spots
  const [bookingSpots, setBookingSpots] = useState<BookingSpotsConfig>({
    locations: []
  });
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isAddingSpot, setIsAddingSpot] = useState(false);
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [spotForm, setSpotForm] = useState<Omit<BookingSpot, 'id'>>({
    type: 'exact',
    time: '09:00',
    startTime: '09:00',
    endTime: '11:00',
    label: '',
  });
  const [newLocationName, setNewLocationName] = useState('');

  // Daily Settings grid: first row = today, then next 6 days (real dates)
  const getTodayAtNoon = () => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  };
  const [dailyGridStartDate, setDailyGridStartDate] = useState<Date>(() => getTodayAtNoon());
  const [countsByDate, setCountsByDate] = useState<Record<string, { countsByTime: Record<string, number>; totalScheduled: number }>>({});

  // Daily settings: filter date range (when set, grid shows this range instead of 7 days from start)
  const [dailyFilterRange, setDailyFilterRange] = useState<{ start: Date; end: Date } | null>(null);
  const [dailyFilterPopoverOpen, setDailyFilterPopoverOpen] = useState(false);
  const [tempFilterRange, setTempFilterRange] = useState<{ start: Date; end: Date }>(() => {
    const start = getTodayAtNoon();
    const end = addDays(start, 6);
    return { start, end };
  });
  const [changeHistoryOpen, setChangeHistoryOpen] = useState(false);
  const [dailyRefreshKey, setDailyRefreshKey] = useState(0);

  // Daily settings: edit Display on for a slot (opens dialog with Admin only / Both)
  const [displayOnEditSlot, setDisplayOnEditSlot] = useState<{ dayName: string; slotId: string; displayOn: 'Both' | 'Admin only'; timeLabel: string } | null>(null);

  // Load settings: API (spot limits, holidays) takes precedence when business exists; fallback to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const load = async () => {
      try {
        const saved = localStorage.getItem(RESERVE_SLOT_STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.dailySettings) setDailySettings(data.dailySettings);
          if (data.slots) setSlots(data.slots);
          if (data.bookingSpots) setBookingSpots(data.bookingSpots);
          if (Array.isArray(data.quickAddSpots)) setQuickAddSpots(data.quickAddSpots);
          if (data.maximumByDay && typeof data.maximumByDay === 'object') setMaximumByDay(data.maximumByDay);
        }
        if (currentBusiness?.id) {
          const [limitsRes, holidaysRes, reserveSlotRes] = await Promise.all([
            fetch(`/api/admin/business-spot-limits?businessId=${currentBusiness.id}`, { headers: { 'x-business-id': currentBusiness.id } }),
            fetch(`/api/admin/business-holidays?businessId=${currentBusiness.id}`, { headers: { 'x-business-id': currentBusiness.id } }),
            fetch(`/api/admin/reserve-slot-settings?businessId=${currentBusiness.id}`, { headers: { 'x-business-id': currentBusiness.id } }),
          ]);
          const limitsData = await limitsRes.json();
          const holidaysData = await holidaysRes.json();
          const reserveSlotData = await reserveSlotRes.json();
          if (limitsData.spotLimits && typeof limitsData.spotLimits === 'object') {
            const l = limitsData.spotLimits;
            setMaxSettings({
              maxBookingsPerDay: l.max_bookings_per_day ?? 10,
              maxBookingsPerWeek: l.max_bookings_per_week ?? 50,
              maxBookingsPerMonth: l.max_bookings_per_month ?? 200,
              maxAdvanceBookingDays: l.max_advance_booking_days ?? 90,
              enabled: l.enabled ?? true,
            });
          } else if (saved) {
            const data = JSON.parse(saved);
            if (data.maxSettings) setMaxSettings(data.maxSettings);
          }
          if (Array.isArray(holidaysData.holidays) && holidaysData.holidays.length > 0) {
            setHolidays(holidaysData.holidays.map((h: { id: string; name: string; holiday_date: string; recurring: boolean; created_at?: string }) => ({
              id: h.id,
              name: h.name,
              date: h.holiday_date,
              recurring: !!h.recurring,
              createdAt: h.created_at || '',
            })));
          } else if (saved) {
            const data = JSON.parse(saved);
            if (data.holidays) setHolidays(data.holidays);
          }
          if (!reserveSlotData.error) {
            if (reserveSlotData.maximumByDay && typeof reserveSlotData.maximumByDay === 'object') {
              setMaximumByDay(reserveSlotData.maximumByDay);
            }
            if (Array.isArray(reserveSlotData.quickAddSpots)) {
              setQuickAddSpots(reserveSlotData.quickAddSpots);
            }
          } else if (saved) {
            const data = JSON.parse(saved);
            if (data.maximumByDay && typeof data.maximumByDay === 'object') setMaximumByDay(data.maximumByDay);
            if (Array.isArray(data.quickAddSpots)) setQuickAddSpots(data.quickAddSpots);
          }
        } else if (saved) {
          const data = JSON.parse(saved);
          if (data.maxSettings) setMaxSettings(data.maxSettings);
          if (data.holidays) setHolidays(data.holidays);
        }
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    };
    load();
  }, [currentBusiness?.id, dailyRefreshKey]);

  // Save to localStorage and persist maxSettings/holidays to API when business exists
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(RESERVE_SLOT_STORAGE_KEY, JSON.stringify({
        maxSettings,
        dailySettings,
        slots,
        holidays,
        bookingSpots,
        quickAddSpots,
        maximumByDay,
      }));
      if (currentBusiness?.id) {
        Promise.all([
          fetch('/api/admin/business-spot-limits', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-business-id': currentBusiness.id },
            body: JSON.stringify({
              businessId: currentBusiness.id,
              max_bookings_per_day: maxSettings.maxBookingsPerDay,
              max_bookings_per_week: maxSettings.maxBookingsPerWeek,
              max_bookings_per_month: maxSettings.maxBookingsPerMonth,
              max_advance_booking_days: maxSettings.maxAdvanceBookingDays,
              enabled: maxSettings.enabled,
            }),
          }),
          fetch('/api/admin/reserve-slot-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-business-id': currentBusiness.id },
            body: JSON.stringify({
              businessId: currentBusiness.id,
              maximumByDay,
              quickAddSpots,
            }),
          }),
        ]).catch(() => {});
      }
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }, [maxSettings, dailySettings, slots, holidays, bookingSpots, quickAddSpots, maximumByDay, currentBusiness?.id]);

  // Dates to show in Daily grid: filter range or 7 days from start
  const dailyGridDates = React.useMemo(() => {
    const maxDays = 14;
    if (dailyFilterRange) {
      const start = new Date(dailyFilterRange.start);
      start.setHours(12, 0, 0, 0);
      const end = new Date(dailyFilterRange.end);
      end.setHours(12, 0, 0, 0);
      const out: { date: Date; dateStr: string }[] = [];
      const endTime = end.getTime();
      for (let d = new Date(start); d.getTime() <= endTime && out.length < maxDays; d.setDate(d.getDate() + 1)) {
        out.push({ date: new Date(d), dateStr: format(d, 'yyyy-MM-dd') });
      }
      return out;
    }
    const out: { date: Date; dateStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(dailyGridStartDate, i);
      out.push({ date: d, dateStr: format(d, 'yyyy-MM-dd') });
    }
    return out;
  }, [dailyGridStartDate, dailyFilterRange]);

  // Fetch booking counts by time for each day in the Daily grid
  useEffect(() => {
    if (!currentBusiness?.id || !dailyGridDates.length) return;
    const dateStrs = dailyGridDates.map((x) => x.dateStr);
    let cancelled = false;
    Promise.all(
      dateStrs.map((dateStr) =>
        fetch(`/api/admin/booking-counts-by-time?businessId=${currentBusiness.id}&date=${dateStr}`, {
          headers: { 'x-business-id': currentBusiness.id },
        }).then((r) => r.json())
      )
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, { countsByTime: Record<string, number>; totalScheduled: number }> = {};
      dateStrs.forEach((dateStr, i) => {
        const data = results[i];
        next[dateStr] = {
          countsByTime: data?.countsByTime ?? {},
          totalScheduled: typeof data?.totalScheduled === 'number' ? data.totalScheduled : 0,
        };
      });
      setCountsByDate(next);
    });
    return () => { cancelled = true; };
  }, [currentBusiness?.id, dailyGridDates, dailyRefreshKey]);

  // Load locations from backend (Settings > Industries > Form 1 > Locations)
  useEffect(() => {
    if (!currentBusiness?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/locations?business_id=${currentBusiness.id}`);
        const data = await res.json();
        if (cancelled || !res.ok || !data.locations?.length) return;
        const locations = data.locations as Array<{ id: string; name?: string; city?: string; state?: string }>;
        setBookingSpots(prev => {
          const existingIds = new Set(prev.locations.map(l => l.locationId));
          const newLocations = locations
            .filter(loc => !existingIds.has(String(loc.id)))
            .map(loc => ({
              locationId: String(loc.id),
              locationName: loc.name || [loc.city, loc.state].filter(Boolean).join(', ') || 'Unnamed Location',
              spots: [] as BookingSpot[],
            }));
          if (newLocations.length === 0) return prev;
          return { locations: [...prev.locations, ...newLocations] };
        });
      } catch (e) {
        console.error('Error loading locations:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [currentBusiness?.id]);

  // Booking Spots Handlers
  const handleAddLocation = () => {
    if (!newLocationName.trim()) {
      toast.error('Please enter a location name');
      return;
    }

    const newLocation: LocationBookingSpots = {
      locationId: Date.now().toString(),
      locationName: newLocationName.trim(),
      spots: []
    };

    setBookingSpots(prev => ({
      locations: [...prev.locations, newLocation]
    }));

    setNewLocationName('');
    setSelectedLocationId(newLocation.locationId);
    toast.success('Location added');
  };

  const handleAddSpot = () => {
    if (!selectedLocationId) {
      toast.error('Please select a location first');
      return;
    }

    if (spotForm.type === 'exact' && !spotForm.time) {
      toast.error('Please enter a time');
      return;
    }

    if (spotForm.type === 'window' && (!spotForm.startTime || !spotForm.endTime)) {
      toast.error('Please enter both start and end times');
      return;
    }

    const newSpot: BookingSpot = {
      id: Date.now().toString(),
      ...spotForm
    };

    setBookingSpots(prev => ({
      locations: prev.locations.map(loc =>
        loc.locationId === selectedLocationId
          ? { ...loc, spots: [...loc.spots, newSpot] }
          : loc
      )
    }));

    resetSpotForm();
    toast.success('Booking spot added');
  };

  const handleUpdateSpot = () => {
    if (!selectedLocationId || !editingSpotId) return;

    setBookingSpots(prev => ({
      locations: prev.locations.map(loc =>
        loc.locationId === selectedLocationId
          ? {
              ...loc,
              spots: loc.spots.map(spot =>
                spot.id === editingSpotId ? { ...spot, ...spotForm } : spot
              )
            }
          : loc
      )
    }));

    setEditingSpotId(null);
    resetSpotForm();
    toast.success('Booking spot updated');
  };

  const handleEditSpot = (locationId: string, spot: BookingSpot) => {
    setSelectedLocationId(locationId);
    setEditingSpotId(spot.id);
    setSpotForm({
      type: spot.type,
      time: spot.time || '09:00',
      startTime: spot.startTime || '09:00',
      endTime: spot.endTime || '11:00',
      label: spot.label || '',
    });
    setIsAddingSpot(true);
  };

  const handleDeleteSpot = (locationId: string, spotId: string) => {
    if (confirm('Are you sure you want to delete this booking spot?')) {
      setBookingSpots(prev => ({
        locations: prev.locations.map(loc =>
          loc.locationId === locationId
            ? { ...loc, spots: loc.spots.filter(s => s.id !== spotId) }
            : loc
        )
      }));
      toast.success('Booking spot deleted');
    }
  };

  const handleDeleteLocation = (locationId: string) => {
    if (confirm('Are you sure you want to delete this location? All booking spots will be removed.')) {
      setBookingSpots(prev => ({
        locations: prev.locations.filter(loc => loc.locationId !== locationId)
      }));
      if (selectedLocationId === locationId) {
        setSelectedLocationId(null);
      }
      toast.success('Location deleted');
    }
  };

  const resetSpotForm = () => {
    setSpotForm({
      type: 'exact',
      time: '09:00',
      startTime: '09:00',
      endTime: '11:00',
      label: '',
    });
    setIsAddingSpot(false);
    setEditingSpotId(null);
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Maximum Settings Handlers
  const handleMaxSettingsChange = (field: keyof MaximumSettings, value: number | boolean) => {
    setMaxSettings(prev => ({ ...prev, [field]: value }));
    toast.success('Maximum settings updated');
  };

  const formatTime24 = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const to24 = (hour: number, meridian: 'AM' | 'PM') => {
    if (meridian === 'AM') return hour === 12 ? 0 : hour;
    return hour === 12 ? 12 : hour + 12;
  };

  const toggleQuickAddDay = (day: string) => {
    setQuickAddForm(prev => {
      const next = new Set(prev.selectedDays);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return { ...prev, selectedDays: next };
    });
  };

  const submitQuickAdd = () => {
    const emptyInterval = quickAddForm.intervalHours === 0 && quickAddForm.intervalMinutes === 0;
    if (emptyInterval) {
      setQuickAddErrors({ intervalMinutes: 'This field should not be empty' });
      return;
    }
    if (quickAddForm.selectedDays.size === 0) {
      toast.error('Select at least one day.');
      return;
    }
    setQuickAddErrors({});
    const intervalMins = quickAddForm.intervalHours * 60 + quickAddForm.intervalMinutes;
    const fromMins = to24(quickAddForm.fromHour, quickAddForm.fromMeridian) * 60 + quickAddForm.fromMin;
    let toMins = to24(quickAddForm.toHour, quickAddForm.toMeridian) * 60 + quickAddForm.toMin;
    if (toMins <= fromMins) toMins += 24 * 60;
    const spots: string[] = [];
    for (let m = fromMins; m <= toMins; m += intervalMins) {
      const dayM = m % (24 * 60);
      const h = Math.floor(dayM / 60);
      const min = dayM % 60;
      spots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    setQuickAddSpots(spots);
    const { selectedDays, limit, displayOn } = quickAddForm;
    setMaximumByDay(prev => {
      const next = { ...prev };
      selectedDays.forEach(day => {
        const existing = prev[day]?.slots ?? [];
        const existingTimes = new Set(existing.map(s => s.time));
        const toAdd = spots.filter(t => !existingTimes.has(t)).map(time => ({
          id: `max-${day}-${time}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          time,
          maxJobs: limit,
          displayOn,
        }));
        next[day] = {
          ...prev[day],
          enabled: true,
          slots: [...existing, ...toAdd],
        };
      });
      return next;
    });
    setExpandedDays(prev => new Set([...prev, ...selectedDays]));
    setQuickAddOpen(false);
    toast.success(`Added ${spots.length} time spots to ${selectedDays.size} day(s)`);
  };

  const expandDay = (day: string) => {
    setExpandedDays(prev => new Set([...prev, day]));
  };

  const collapseDay = (day: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.delete(day);
      return next;
    });
  };

  const openQuickAddForDay = (day: string) => {
    setQuickAddForm(prev => ({ ...prev, selectedDays: new Set([day]) }));
    setQuickAddOpen(true);
  };

  const setDayEnabled = (day: string, enabled: boolean) => {
    setMaximumByDay(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled, slots: prev[day]?.slots ?? [] },
    }));
  };

  const updateSlotMaxJobs = (day: string, slotId: string, delta: number) => {
    setMaximumByDay(prev => {
      const slots = prev[day]?.slots ?? [];
      const slot = slots.find(s => s.id === slotId);
      if (!slot) return prev;
      const nextVal = Math.max(0, slot.maxJobs + delta);
      return {
        ...prev,
        [day]: {
          ...prev[day],
          slots: slots.map(s => (s.id === slotId ? { ...s, maxJobs: nextVal } : s)),
        },
      };
    });
  };

  const setSlotMaxJobsValue = (day: string, slotId: string, value: number) => {
    setMaximumByDay(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: (prev[day]?.slots ?? []).map(s => (s.id === slotId ? { ...s, maxJobs: Math.max(0, value) } : s)),
      },
    }));
  };

  const updateSlotDisplayOn = (day: string, slotId: string, displayOn: 'Both' | 'Admin only') => {
    setMaximumByDay(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: (prev[day]?.slots ?? []).map(s => (s.id === slotId ? { ...s, displayOn } : s)),
      },
    }));
  };

  const deleteMaximumSlot = (day: string, slotId: string) => {
    setMaximumByDay(prev => ({
      ...prev,
      [day]: { ...prev[day], slots: (prev[day]?.slots ?? []).filter(s => s.id !== slotId) },
    }));
    toast.success('Time spot removed');
  };

  const resetMaximumToDefault = () => {
    if (!confirm('Reset all maximum settings to default? This will clear time spots for all days.')) return;
    const o: Record<string, { enabled: boolean; slots: MaximumSettingsSlot[] }> = {};
    DAYS_MAXIMUM.forEach(d => { o[d] = { enabled: d !== 'Sunday', slots: [] }; });
    setMaximumByDay(o);
    setQuickAddSpots([]);
    toast.success('Reset to default');
  };

  const handleSaveMaximumChanges = async () => {
    if (!currentBusiness?.id) {
      toast.success('Maximum settings saved locally');
      return;
    }
    try {
      const res = await fetch('/api/admin/reserve-slot-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-business-id': currentBusiness.id },
        body: JSON.stringify({ businessId: currentBusiness.id, maximumByDay, quickAddSpots }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      toast.success('Maximum settings saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  // Daily Settings Handlers
  const handleDailySettingsChange = (day: string, field: keyof DailySettings, value: string | number | boolean) => {
    setDailySettings(prev =>
      prev.map(setting =>
        setting.day === day ? { ...setting, [field]: value } : setting
      )
    );
    toast.success(`${day} settings updated`);
  };

  // Time Slot Handlers (existing)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTimeChange = (name: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: 'startDate' | 'endDate', date: Date | undefined) => {
    if (!date) return;
    setFormData(prev => ({ ...prev, [name]: format(date, 'yyyy-MM-dd') }));
  };

  const validateSlotForm = (): boolean => {
    const { startDate, endDate, startTime, endTime, reason } = formData;
    
    if (!startDate || !endDate || !startTime || !endTime) {
      toast.error('Please fill in all required fields');
      return false;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    if (isAfter(startDateTime, endDateTime)) {
      toast.error('End date/time must be after start date/time');
      return false;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for the reservation');
      return false;
    }

    return true;
  };

  const handleAddSlot = () => {
    if (!validateSlotForm()) return;

    const newSlot: TimeSlot = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString()
    };

    setSlots(prev => [newSlot, ...prev]);
    resetSlotForm();
    toast.success('Time slot reserved successfully');
  };

  const handleUpdateSlot = () => {
    if (!editingId || !validateSlotForm()) return;

    setSlots(prev =>
      prev.map(slot =>
        slot.id === editingId ? { ...slot, ...formData } : slot
      )
    );

    setEditingId(null);
    resetSlotForm();
    toast.success('Time slot updated successfully');
  };

  const handleEdit = (slot: TimeSlot) => {
    setEditingId(slot.id);
    setFormData({
      startDate: slot.startDate,
      endDate: slot.endDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      reason: slot.reason
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSlot = (id: string) => {
    if (confirm('Are you sure you want to delete this time slot?')) {
      setSlots(prev => prev.filter(slot => slot.id !== id));
      toast.success('Time slot deleted');
    }
  };

  const resetSlotForm = () => {
    setFormData({
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '17:00',
      reason: ''
    });
    setIsAdding(false);
    setEditingId(null);
  };

  // Holiday Handlers
  const handleHolidayInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setHolidayForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleHolidayDateChange = (date: Date | undefined) => {
    if (!date) return;
    setHolidayForm(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
  };

  const handleAddHoliday = async () => {
    if (!holidayForm.name.trim()) {
      toast.error('Please enter a holiday name');
      return;
    }
    if (!currentBusiness?.id) {
      const newHoliday: Holiday = {
        id: Date.now().toString(),
        ...holidayForm,
        createdAt: new Date().toISOString()
      };
      setHolidays(prev => [newHoliday, ...prev]);
      resetHolidayForm();
      toast.success('Holiday added successfully');
      return;
    }
    try {
      const res = await fetch('/api/admin/business-holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-business-id': currentBusiness.id },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          name: holidayForm.name.trim(),
          holiday_date: holidayForm.date,
          recurring: holidayForm.recurring,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add holiday');
      const h = data.holiday;
      setHolidays(prev => [{ id: h.id, name: h.name, date: h.holiday_date, recurring: !!h.recurring, createdAt: h.created_at || '' }, ...prev]);
      resetHolidayForm();
      toast.success('Holiday added successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add holiday');
    }
  };

  const handleUpdateHoliday = async () => {
    if (!editingHolidayId || !holidayForm.name.trim()) {
      toast.error('Please enter a holiday name');
      return;
    }
    if (!currentBusiness?.id) {
      setHolidays(prev =>
        prev.map(holiday =>
          holiday.id === editingHolidayId ? { ...holiday, ...holidayForm } : holiday
        )
      );
      setEditingHolidayId(null);
      resetHolidayForm();
      toast.success('Holiday updated successfully');
      return;
    }
    try {
      const res = await fetch('/api/admin/business-holidays', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-business-id': currentBusiness.id },
        body: JSON.stringify({
          id: editingHolidayId,
          businessId: currentBusiness.id,
          name: holidayForm.name.trim(),
          holiday_date: holidayForm.date,
          recurring: holidayForm.recurring,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update holiday');
      }
      setHolidays(prev =>
        prev.map(holiday =>
          holiday.id === editingHolidayId ? { ...holiday, ...holidayForm } : holiday
        )
      );
      setEditingHolidayId(null);
      resetHolidayForm();
      toast.success('Holiday updated successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update holiday');
    }
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHolidayId(holiday.id);
    setHolidayForm({
      name: holiday.name,
      date: holiday.date,
      recurring: holiday.recurring
    });
    setIsAddingHoliday(true);
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    if (currentBusiness?.id) {
      try {
        const res = await fetch(`/api/admin/business-holidays?id=${id}&businessId=${currentBusiness.id}`, {
          method: 'DELETE',
          headers: { 'x-business-id': currentBusiness.id },
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to delete holiday');
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to delete holiday');
        return;
      }
    }
    setHolidays(prev => prev.filter(holiday => holiday.id !== id));
    toast.success('Holiday deleted');
  };

  const resetHolidayForm = () => {
    setHolidayForm({
      name: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      recurring: false
    });
    setIsAddingHoliday(false);
    setEditingHolidayId(null);
  };

  const formatDateTime = (dateStr: string, timeStr: string) => {
    const date = new Date(`${dateStr}T${timeStr}`);
    return format(date, 'MMM d, yyyy h:mm a');
  };

  const isActive = (slot: TimeSlot) => {
    const now = new Date();
    const start = new Date(`${slot.startDate}T${slot.startTime}`);
    const end = new Date(`${slot.endDate}T${slot.endTime}`);
    return isAfter(now, start) && isBefore(now, end);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Reserve Slot Settings</CardTitle>
          </div>
          <CardDescription>
            Configure maximum booking limits, daily settings, and holidays
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="maximum">
                <Settings className="h-4 w-4 mr-2" />
                Maximum Settings
              </TabsTrigger>
              <TabsTrigger value="daily">
                <Calendar className="h-4 w-4 mr-2" />
                Daily Settings
              </TabsTrigger>
              <TabsTrigger value="holidays">
                <CalendarDays className="h-4 w-4 mr-2" />
                Holidays
              </TabsTrigger>
            </TabsList>

            {/* Maximum Settings Tab - table + Quick Add */}
            <TabsContent value="maximum" className="space-y-6 mt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Maximum settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Add time spots per day; use Quick Add to define spots, then add them to days with the + button.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setQuickAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-2 rounded-full" />
                    Quick Add
                  </Button>
                  <Button size="sm" variant="destructive" onClick={resetMaximumToDefault}>
                    Reset To Default
                  </Button>
                  <Button size="sm" onClick={handleSaveMaximumChanges}>
                    Save Changes
                  </Button>
                </div>
              </div>

              {/* Table: one row per day when empty; when slots exist, one row per slot like image: Time spot | [- 20 +] | Both pill | Edit Delete. Circular plus adds spots. */}
              <div className="rounded-md border overflow-x-auto bg-white dark:bg-background">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left font-medium p-3">Day</th>
                      <th className="text-left font-medium p-3">Time spot</th>
                      <th className="text-left font-medium p-3">Max jobs</th>
                      <th className="text-left font-medium p-3">Display on</th>
                      <th className="text-left font-medium p-3 w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_MAXIMUM.map(day => {
                      const row = maximumByDay[day] ?? { enabled: true, slots: [] };
                      const slots = row.slots;
                      const hasSlots = slots.length > 0;
                      const isExpanded = expandedDays.has(day);
                      if (!hasSlots) {
                        return (
                          <tr key={day} className="hover:bg-muted/10">
                            <td className="p-3 font-medium">{day}</td>
                            <td className="p-3 text-muted-foreground">—</td>
                            <td className="p-3">—</td>
                            <td className="p-3">—</td>
                            <td className="p-3">
                              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-border bg-white dark:bg-background hover:bg-muted/50" onClick={() => openQuickAddForDay(day)} title="Add spots (Quick Add)">
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </td>
                          </tr>
                        );
                      }
                      if (!isExpanded) {
                        return (
                          <tr key={day} className="hover:bg-muted/10">
                            <td className="p-3 font-medium">{day}</td>
                            <td className="p-3 text-muted-foreground">—</td>
                            <td className="p-3">—</td>
                            <td className="p-3">—</td>
                            <td className="p-3">
                              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-border bg-white dark:bg-background hover:bg-muted/50" onClick={() => expandDay(day)} title="Display added slots">
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <React.Fragment key={day}>
                          <tr className="hover:bg-muted/5">
                            <td className="p-3 font-medium align-top border-r border-border/50" rowSpan={1 + slots.length}>
                              {day}
                            </td>
                            <td className="p-3 text-muted-foreground">—</td>
                            <td className="p-3">—</td>
                            <td className="p-3">—</td>
                            <td className="p-3">
                              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-border bg-white dark:bg-background hover:bg-muted/50" onClick={() => collapseDay(day)} title="Hide slots">
                                <Minus className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </td>
                          </tr>
                          {slots.map((slot, i) => (
                            <tr key={slot.id} className="hover:bg-muted/5">
                              <td className="p-3">{formatTime24(slot.time)}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-1 w-fit">
                                  <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md shrink-0 bg-muted/30 border-border hover:bg-muted/50" onClick={() => updateSlotMaxJobs(day, slot.id, -1)}>
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <Input type="number" min={0} className="h-8 w-14 text-center rounded-md border-border" value={slot.maxJobs} onChange={e => setSlotMaxJobsValue(day, slot.id, parseInt(e.target.value) || 0)} />
                                  <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md shrink-0 bg-muted/30 border-border hover:bg-muted/50" onClick={() => updateSlotMaxJobs(day, slot.id, 1)}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge className="bg-green-500/15 text-green-800 dark:text-green-300 border-0 font-normal rounded-full px-3 py-0.5">
                                  {slot.displayOn}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-0.5">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Edit" onClick={() => toast.info('Edit time spot')}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Delete" onClick={() => deleteMaximumSlot(day, slot.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Quick Add dialog - layout matches reference: title centered, sections with labels above dropdowns */}
              <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-background">
                  <DialogHeader className="text-center sm:text-center shrink-0">
                    <DialogTitle className="text-xl font-bold text-center">Quick add</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 py-3 overflow-y-auto min-h-0 flex-1 pr-1">
                    {/* Make spots every */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Make spots every</p>
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Hours</Label>
                          <Select
                            value={String(quickAddForm.intervalHours)}
                            onValueChange={v => setQuickAddForm(prev => ({ ...prev, intervalHours: parseInt(v, 10) }))}
                          >
                            <SelectTrigger className={`w-full border border-input bg-white dark:bg-background focus:ring-2 focus:ring-primary/20 focus-visible:ring-2 focus-visible:ring-ring ${quickAddErrors.intervalMinutes ? 'border-destructive' : ''}`}>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {INTERVAL_HOURS.map(h => (
                                <SelectItem key={h} value={String(h)}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Minutes</Label>
                          <Select
                            value={String(quickAddForm.intervalMinutes)}
                            onValueChange={v => setQuickAddForm(prev => ({ ...prev, intervalMinutes: parseInt(v, 10) }))}
                          >
                            <SelectTrigger className={`w-full border border-input bg-white dark:bg-background focus:ring-2 focus:ring-primary/20 ${quickAddErrors.intervalMinutes ? 'border-destructive' : ''}`}>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {INTERVAL_MINUTES.map(m => (
                                <SelectItem key={m} value={String(m)}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {quickAddErrors.intervalMinutes && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                              <span>!</span> {quickAddErrors.intervalMinutes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* From */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">From</p>
                      <div className="flex gap-3 flex-wrap">
                        <div className="w-24 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Hours</Label>
                          <Select value={String(quickAddForm.fromHour)} onValueChange={v => setQuickAddForm(prev => ({ ...prev, fromHour: parseInt(v, 10) }))}>
                            <SelectTrigger className="w-full border border-input bg-white dark:bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {HOURS_12.map(h => (<SelectItem key={h} value={String(h)}>{h}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Minutes</Label>
                          <Select value={String(quickAddForm.fromMin)} onValueChange={v => setQuickAddForm(prev => ({ ...prev, fromMin: parseInt(v, 10) }))}>
                            <SelectTrigger className="w-full border border-input bg-white dark:bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {INTERVAL_MINUTES.map(m => (<SelectItem key={m} value={String(m)}>{String(m).padStart(2, '0')}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-20 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Meridian</Label>
                          <Select value={quickAddForm.fromMeridian} onValueChange={v => setQuickAddForm(prev => ({ ...prev, fromMeridian: v as 'AM' | 'PM' }))}>
                            <SelectTrigger className="w-full border border-input bg-white dark:bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MERIDIANS.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    {/* To */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">To</p>
                      <div className="flex gap-3 flex-wrap">
                        <div className="w-24 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Hours</Label>
                          <Select value={String(quickAddForm.toHour)} onValueChange={v => setQuickAddForm(prev => ({ ...prev, toHour: parseInt(v, 10) }))}>
                            <SelectTrigger className="w-full border border-input bg-white dark:bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {HOURS_12.map(h => (<SelectItem key={h} value={String(h)}>{h}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Minutes</Label>
                          <Select value={String(quickAddForm.toMin)} onValueChange={v => setQuickAddForm(prev => ({ ...prev, toMin: parseInt(v, 10) }))}>
                            <SelectTrigger className="w-full border border-input bg-white dark:bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {INTERVAL_MINUTES.map(m => (<SelectItem key={m} value={String(m)}>{String(m).padStart(2, '0')}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-20 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Meridian</Label>
                          <Select value={quickAddForm.toMeridian} onValueChange={v => setQuickAddForm(prev => ({ ...prev, toMeridian: v as 'AM' | 'PM' }))}>
                            <SelectTrigger className="w-full border border-input bg-white dark:bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MERIDIANS.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    {/* Days */}
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3">Days</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {DAYS_MAXIMUM.map(day => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox
                              id={`quick-add-day-${day}`}
                              checked={quickAddForm.selectedDays.has(day)}
                              onCheckedChange={() => toggleQuickAddDay(day)}
                            />
                            <label htmlFor={`quick-add-day-${day}`} className="text-sm cursor-pointer font-normal">{day}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Limit */}
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Limit</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          className="w-20"
                          value={quickAddForm.limit}
                          onChange={e => setQuickAddForm(prev => ({ ...prev, limit: parseInt(e.target.value) || 0 }))}
                        />
                        <span className="text-sm text-muted-foreground">Jobs max.</span>
                      </div>
                    </div>
                    {/* Spot will display on */}
                    <div>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
                        Spot will display on
                        <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 w-5 h-5 flex items-center justify-center text-xs font-normal">i</span>
                      </p>
                      <RadioGroup
                        value={quickAddForm.displayOn}
                        onValueChange={v => setQuickAddForm(prev => ({ ...prev, displayOn: v as 'Both' | 'Admin only' }))}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Admin only" id="quick-display-admin" />
                          <label htmlFor="quick-display-admin" className="text-sm cursor-pointer">Admin only</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Both" id="quick-display-both" />
                          <label htmlFor="quick-display-both" className="text-sm cursor-pointer">Both</label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  <DialogFooter className="flex gap-2 sm:justify-end shrink-0 pt-2 border-t">
                    <Button variant="destructive" onClick={() => setQuickAddOpen(false)}>Cancel</Button>
                    <Button onClick={submitQuickAdd}>Add</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </TabsContent>

            {/* Daily Settings Tab — grid UI: date column + time slot columns (like reference image) */}
            <TabsContent value="daily" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Daily Settings</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure available jobs and display per time slot. Data is shared with Maximum settings.
                </p>
                {/* One line: Filter date, View Change History, Refresh, Save Changes | Starting/Range nav + Today */}
                <div className="flex flex-nowrap items-center justify-between gap-4 mb-4 overflow-x-auto">
                  <div className="flex flex-nowrap items-center gap-2 shrink-0">
                    <Popover open={dailyFilterPopoverOpen} onOpenChange={(open) => {
                      setDailyFilterPopoverOpen(open);
                      if (open) setTempFilterRange(dailyFilterRange ?? { start: dailyGridStartDate, end: addDays(dailyGridStartDate, 6) });
                    }}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="min-w-[200px] justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {dailyFilterRange
                          ? `${format(dailyFilterRange.start, 'MM/dd/yyyy')} - ${format(dailyFilterRange.end, 'MM/dd/yyyy')}`
                          : 'Filter date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3 border-b border-border">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Start Date</Label>
                            <CalendarUI
                              mode="single"
                              selected={tempFilterRange.start}
                              onSelect={(d) => d && setTempFilterRange((prev) => ({ ...prev, start: d }))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">End Date</Label>
                            <CalendarUI
                              mode="single"
                              selected={tempFilterRange.end}
                              onSelect={(d) => d && setTempFilterRange((prev) => ({ ...prev, end: d }))}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="p-2 border-b border-border flex flex-wrap gap-1">
                        {[
                          { label: 'Last 7 Days', get: () => { const t = getTodayAtNoon(); return { start: subDays(t, 6), end: t }; } },
                          { label: 'Last 30 Days', get: () => { const t = getTodayAtNoon(); return { start: subDays(t, 29), end: t }; } },
                          { label: 'Last Month', get: () => { const t = getTodayAtNoon(); return { start: subDays(t, 30), end: subDays(t, 1) }; } },
                          { label: 'Last 3 Months', get: () => { const t = getTodayAtNoon(); return { start: subDays(t, 89), end: t }; } },
                          { label: 'Last 6 Months', get: () => { const t = getTodayAtNoon(); return { start: subDays(t, 179), end: t }; } },
                          { label: 'Last Year', get: () => { const t = getTodayAtNoon(); return { start: subDays(t, 364), end: t }; } },
                        ].map((preset) => (
                          <Button key={preset.label} variant="ghost" size="sm" className="text-xs h-8" onClick={() => setTempFilterRange(preset.get())}>
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                      <div className="p-2 flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setDailyFilterPopoverOpen(false)}>Cancel</Button>
                        <Button variant="outline" size="sm" onClick={() => { setDailyFilterRange(null); setDailyFilterPopoverOpen(false); }}>Reset</Button>
                        <Button size="sm" onClick={() => {
                          const start = tempFilterRange.start.getTime();
                          const end = tempFilterRange.end.getTime();
                          setDailyFilterRange({
                            start: start <= end ? tempFilterRange.start : tempFilterRange.end,
                            end: start <= end ? tempFilterRange.end : tempFilterRange.start,
                          });
                          setDailyFilterPopoverOpen(false);
                        }}>Apply</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                    <Button variant="outline" size="sm" onClick={() => setChangeHistoryOpen(true)}>
                      <History className="mr-2 h-4 w-4" />
                      View Change History
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => { setDailyRefreshKey((k) => k + 1); toast.success('Refreshed'); }}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                    <Button size="sm" onClick={handleSaveMaximumChanges}>
                      Save Changes
                    </Button>
                  </div>
                  <div className="flex flex-nowrap items-center gap-2 shrink-0">
                    {dailyFilterRange ? (
                      <span className="text-sm font-medium min-w-[200px] text-center">
                        Range: {format(dailyFilterRange.start, 'MMM d, yyyy')} – {format(dailyFilterRange.end, 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <>
                        <Button variant="outline" size="icon" onClick={() => setDailyGridStartDate((d) => subDays(d, 7))}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[140px] text-center">
                          Starting {format(dailyGridStartDate, 'MMM d, yyyy')}
                        </span>
                        <Button variant="outline" size="icon" onClick={() => setDailyGridStartDate((d) => addDays(d, 7))}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDailyGridStartDate(getTodayAtNoon())}>
                          Today
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {(() => {
                const toHHmm = (t: string) => {
                  const [h, m] = t.split(':');
                  return `${String(parseInt(h || '0', 10)).padStart(2, '0')}:${(m || '00').slice(0, 2)}`;
                };
                const timeSet = new Set<string>();
                DAYS_MAXIMUM.forEach((day) => {
                  (maximumByDay[day]?.slots ?? []).forEach((s) => {
                    const key = toHHmm(s.time);
                    if (key) timeSet.add(key);
                  });
                });
                const dailyGridTimes = Array.from(timeSet).sort();
                if (dailyGridTimes.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground py-6">
                      No time spots configured. Add time spots in the <strong>Maximum settings</strong> tab to see the daily grid here.
                    </p>
                  );
                }
                return (
              <div className="rounded-md border border-border overflow-x-auto bg-white dark:bg-background">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-sky-100 dark:bg-sky-950/40 border-b border-border">
                      <th className="text-left p-4 font-medium border-r border-border w-[200px]">Date</th>
                      {dailyGridTimes.map((t) => (
                        <th key={t} className="text-center p-4 font-medium border-r border-border last:border-r-0 min-w-[260px]">
                          {formatTime24(t)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dailyGridDates.map(({ date: rowDate, dateStr }) => {
                      const dayName = format(rowDate, 'EEEE');
                      const dayConfig = maximumByDay[dayName];
                      const enabled = dayConfig?.enabled ?? false;
                      const slots = (enabled && dayConfig?.slots) ? dayConfig.slots : [];
                      const jobsAvailable = slots.reduce((sum, s) => sum + (s.maxJobs ?? 0), 0);
                      const totalScheduled = countsByDate[dateStr]?.totalScheduled ?? 0;
                      const countsByTime = countsByDate[dateStr]?.countsByTime ?? {};
                      return (
                        <tr key={dateStr} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="p-4 border-r border-border align-top bg-muted/30">
                            <div className="font-semibold text-base">{format(rowDate, 'EEE, MM/dd/yyyy')}</div>
                            <div className="text-sm text-muted-foreground mt-2">
                              <div>Jobs Available: {jobsAvailable}</div>
                              <div>Jobs Scheduled: {totalScheduled}</div>
                            </div>
                          </td>
                          {dailyGridTimes.map((timeCol) => {
                            const slot = slots.find((s) => toHHmm(s.time) === timeCol);
                            const scheduled = countsByTime[timeCol] ?? 0;
                            const maxJobs = slot?.maxJobs ?? 0;
                            const free = Math.max(0, maxJobs - scheduled);
                            if (!slot) {
                              return (
                                <td key={timeCol} className="p-4 border-r border-border/50 last:border-r-0 align-top min-w-[260px]" />
                              );
                            }
                            return (
                              <td key={timeCol} className="p-4 border-r border-border/50 last:border-r-0 align-top min-w-[260px]">
                                <div className="space-y-3">
                                  <div className="text-sm font-medium text-muted-foreground">Available jobs</div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 rounded-md shrink-0 bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300"
                                      onClick={() => updateSlotMaxJobs(dayName, slot.id, -1)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <Input
                                      type="number"
                                      min={0}
                                      className="h-9 w-16 text-center rounded-md border-teal-500/30 bg-teal-500/5 text-sm"
                                      value={slot.maxJobs}
                                      onChange={(e) => setSlotMaxJobsValue(dayName, slot.id, parseInt(e.target.value, 10) || 0)}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 rounded-md shrink-0 bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300"
                                      onClick={() => updateSlotMaxJobs(dayName, slot.id, 1)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="text-sm flex items-center gap-2">
                                    <span className="font-medium text-muted-foreground shrink-0">Display on</span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      className="bg-teal-500/20 text-teal-800 dark:text-teal-200 hover:bg-teal-500/30 border-0 h-9 rounded-md px-3 text-sm shrink-0"
                                      onClick={() => updateSlotDisplayOn(dayName, slot.id, slot.displayOn === 'Admin only' ? 'Both' : 'Admin only')}
                                    >
                                      {slot.displayOn}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground" title="Edit display" onClick={() => setDisplayOnEditSlot({ dayName, slotId: slot.id, displayOn: slot.displayOn, timeLabel: formatTime24(slot.time) })}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="text-sm flex items-center justify-between gap-2">
                                    <span><span className="text-muted-foreground">Scheduled </span><span>{scheduled}</span></span>
                                    <span className="text-teal-600 dark:text-teal-400 font-medium">Free {free}</span>
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
                );
              })()}
              <p className="text-xs text-muted-foreground mt-4">
                Time columns are driven by the spots you configure in Maximum settings. Add or remove time spots there to change which columns appear here.
              </p>

              {/* Edit Display on dialog (Daily settings) */}
              <Dialog open={!!displayOnEditSlot} onOpenChange={(open) => !open && setDisplayOnEditSlot(null)}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {displayOnEditSlot ? `Display on — ${displayOnEditSlot.timeLabel}` : 'Display on'}
                    </DialogTitle>
                    <DialogDescription>
                      Choose where this time slot is visible: admin only or both admin and customer booking.
                    </DialogDescription>
                  </DialogHeader>
                  {displayOnEditSlot && (
                    <div className="py-2">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
                        Display on
                        <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 w-5 h-5 flex items-center justify-center text-xs font-normal">i</span>
                      </p>
                      <RadioGroup
                        value={displayOnEditSlot.displayOn}
                        onValueChange={(v) => setDisplayOnEditSlot((prev) => prev ? { ...prev, displayOn: v as 'Both' | 'Admin only' } : null)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Admin only" id={`display-edit-admin-${displayOnEditSlot.slotId}`} />
                          <label htmlFor={`display-edit-admin-${displayOnEditSlot.slotId}`} className="text-sm cursor-pointer">Admin only</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Both" id={`display-edit-both-${displayOnEditSlot.slotId}`} />
                          <label htmlFor={`display-edit-both-${displayOnEditSlot.slotId}`} className="text-sm cursor-pointer">Both</label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                  <DialogFooter className="flex gap-2 sm:justify-end">
                    <Button variant="outline" onClick={() => setDisplayOnEditSlot(null)}>Cancel</Button>
                    <Button
                      onClick={() => {
                        if (displayOnEditSlot) {
                          updateSlotDisplayOn(displayOnEditSlot.dayName, displayOnEditSlot.slotId, displayOnEditSlot.displayOn);
                          setDisplayOnEditSlot(null);
                          toast.success('Display setting updated');
                        }
                      }}
                    >
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* View Change History dialog (Daily settings) */}
              <Dialog open={changeHistoryOpen} onOpenChange={setChangeHistoryOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Change History</DialogTitle>
                    <DialogDescription>
                      View past changes to daily and maximum settings.
                    </DialogDescription>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground py-4">No history yet.</p>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setChangeHistoryOpen(false)}>Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </TabsContent>

            {/* Holidays Tab */}
            <TabsContent value="holidays" className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Holidays</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage holidays when bookings are not available
                  </p>
                </div>
                {!isAddingHoliday && !editingHolidayId && (
                  <Button onClick={() => setIsAddingHoliday(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Add Holiday
                  </Button>
                )}
              </div>

              {(isAddingHoliday || editingHolidayId) && (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="holiday-name">Holiday Name *</Label>
                      <Input
                        id="holiday-name"
                        name="name"
                        placeholder="E.g., New Year's Day, Christmas, etc."
                        value={holidayForm.name}
                        onChange={handleHolidayInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="holiday-date">Date *</Label>
                      <DatePicker
                        date={holidayForm.date ? new Date(holidayForm.date) : undefined}
                        onSelect={(date) => date && handleHolidayDateChange(date)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="recurring"
                        name="recurring"
                        checked={holidayForm.recurring}
                        onChange={handleHolidayInputChange}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="recurring" className="cursor-pointer">
                        Recurring holiday (repeat every year)
                      </Label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={resetHolidayForm}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={editingHolidayId ? handleUpdateHoliday : handleAddHoliday}
                        disabled={!holidayForm.name.trim()}
                      >
                        {editingHolidayId ? 'Update' : 'Add'} Holiday
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {holidays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <CalendarDays className="mx-auto h-12 w-12 mb-2 opacity-20" />
                  <p>No holidays added yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {holidays
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(holiday => (
                    <div key={holiday.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{holiday.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {format(new Date(holiday.date), 'MMMM d, yyyy')}
                            {holiday.recurring && (
                              <span className="ml-2 text-primary">(Recurring)</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleEditHoliday(holiday)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteHoliday(holiday.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
