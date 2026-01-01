"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Plus, Trash2, Edit, Settings, Calendar, CalendarDays, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, isBefore, isAfter } from 'date-fns';
import { TimePicker } from "@/components/ui/time-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

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

const RESERVE_SLOT_STORAGE_KEY = 'reserveSlotSettings';

export default function ReserveSlotPage() {
  const [activeTab, setActiveTab] = useState("maximum");
  
  // Maximum Settings
  const [maxSettings, setMaxSettings] = useState<MaximumSettings>({
    maxBookingsPerDay: 10,
    maxBookingsPerWeek: 50,
    maxBookingsPerMonth: 200,
    maxAdvanceBookingDays: 90,
    enabled: true,
  });

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

  // Load all settings from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(RESERVE_SLOT_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.maxSettings) setMaxSettings(data.maxSettings);
        if (data.dailySettings) setDailySettings(data.dailySettings);
        if (data.slots) setSlots(data.slots);
        if (data.holidays) setHolidays(data.holidays);
        if (data.bookingSpots) setBookingSpots(data.bookingSpots);
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }, []);

  // Save all settings to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(RESERVE_SLOT_STORAGE_KEY, JSON.stringify({
        maxSettings,
        dailySettings,
        slots,
        holidays,
        bookingSpots,
      }));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }, [maxSettings, dailySettings, slots, holidays, bookingSpots]);

  // Load locations from industries settings
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Try to load locations from industries settings
      const industries = ['Home Cleaning', 'Industry'];
      for (const industry of industries) {
        const locationsKey = `locations_${industry}`;
        const stored = localStorage.getItem(locationsKey);
        if (stored) {
          const locations = JSON.parse(stored);
          if (Array.isArray(locations) && locations.length > 0) {
            // Add locations that don't exist in bookingSpots
            setBookingSpots(prev => {
              const existingIds = new Set(prev.locations.map(l => l.locationId));
              const newLocations = locations
                .filter((loc: any) => !existingIds.has(String(loc.id)))
                .map((loc: any) => ({
                  locationId: String(loc.id),
                  locationName: loc.name || `${loc.city || ''} ${loc.state || ''}`.trim() || 'Unnamed Location',
                  spots: []
                }));
              return {
                locations: [...prev.locations, ...newLocations]
              };
            });
            break;
          }
        }
      }
    } catch (e) {
      console.error('Error loading locations:', e);
    }
  }, []);

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

  const handleAddHoliday = () => {
    if (!holidayForm.name.trim()) {
      toast.error('Please enter a holiday name');
      return;
    }

    const newHoliday: Holiday = {
      id: Date.now().toString(),
      ...holidayForm,
      createdAt: new Date().toISOString()
    };

    setHolidays(prev => [newHoliday, ...prev]);
    resetHolidayForm();
    toast.success('Holiday added successfully');
  };

  const handleUpdateHoliday = () => {
    if (!editingHolidayId || !holidayForm.name.trim()) {
      toast.error('Please enter a holiday name');
      return;
    }

    setHolidays(prev =>
      prev.map(holiday =>
        holiday.id === editingHolidayId ? { ...holiday, ...holidayForm } : holiday
      )
    );

    setEditingHolidayId(null);
    resetHolidayForm();
    toast.success('Holiday updated successfully');
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

  const handleDeleteHoliday = (id: string) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      setHolidays(prev => prev.filter(holiday => holiday.id !== id));
      toast.success('Holiday deleted');
    }
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

            {/* Maximum Settings Tab */}
            <TabsContent value="maximum" className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Maximum Booking Limits</h3>
                  <p className="text-sm text-muted-foreground">
                    Set maximum number of bookings allowed
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="max-enabled">Enabled</Label>
                  <Switch
                    id="max-enabled"
                    checked={maxSettings.enabled}
                    onCheckedChange={(checked) => handleMaxSettingsChange('enabled', checked)}
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max-per-day">Maximum Bookings Per Day</Label>
                  <Input
                    id="max-per-day"
                    type="number"
                    min="1"
                    value={maxSettings.maxBookingsPerDay}
                    onChange={(e) => handleMaxSettingsChange('maxBookingsPerDay', parseInt(e.target.value) || 0)}
                    disabled={!maxSettings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-per-week">Maximum Bookings Per Week</Label>
                  <Input
                    id="max-per-week"
                    type="number"
                    min="1"
                    value={maxSettings.maxBookingsPerWeek}
                    onChange={(e) => handleMaxSettingsChange('maxBookingsPerWeek', parseInt(e.target.value) || 0)}
                    disabled={!maxSettings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-per-month">Maximum Bookings Per Month</Label>
                  <Input
                    id="max-per-month"
                    type="number"
                    min="1"
                    value={maxSettings.maxBookingsPerMonth}
                    onChange={(e) => handleMaxSettingsChange('maxBookingsPerMonth', parseInt(e.target.value) || 0)}
                    disabled={!maxSettings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-advance">Maximum Advance Booking (Days)</Label>
                  <Input
                    id="max-advance"
                    type="number"
                    min="1"
                    value={maxSettings.maxAdvanceBookingDays}
                    onChange={(e) => handleMaxSettingsChange('maxAdvanceBookingDays', parseInt(e.target.value) || 0)}
                    disabled={!maxSettings.enabled}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Daily Settings Tab */}
            <TabsContent value="daily" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Daily Time Slots</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Configure working hours and slot limits for each day of the week
                </p>
              </div>

              <div className="space-y-4">
                {dailySettings.map((setting) => (
                  <Card key={setting.day}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Label htmlFor={`enabled-${setting.day}`} className="font-semibold text-base">
                            {setting.day}
                          </Label>
                          <Switch
                            id={`enabled-${setting.day}`}
                            checked={setting.enabled}
                            onCheckedChange={(checked) =>
                              handleDailySettingsChange(setting.day, 'enabled', checked)
                            }
                          />
                        </div>
                      </div>

                      {setting.enabled && (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Start Time</Label>
                            <TimePicker
                              value={setting.startTime}
                              onChange={(value) =>
                                handleDailySettingsChange(setting.day, 'startTime', value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Time</Label>
                            <TimePicker
                              value={setting.endTime}
                              onChange={(value) =>
                                handleDailySettingsChange(setting.day, 'endTime', value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max Slots</Label>
                            <Input
                              type="number"
                              min="1"
                              value={setting.maxSlots}
                              onChange={(e) =>
                                handleDailySettingsChange(setting.day, 'maxSlots', parseInt(e.target.value) || 0)
                              }
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Booking Spots Section */}
              <div className="mt-8 pt-8 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Booking Spots</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure the time spots customers will see when booking. You can set exact times (8 AM, 9 AM) or arrival windows (9 AM - 11 AM), or mix both.
                    </p>
                  </div>
                </div>

                {/* Add Location */}
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter location name (e.g., Downtown Office, Main Branch)"
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
                      />
                      <Button onClick={handleAddLocation} disabled={!newLocationName.trim()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Location
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Location Selector */}
                {bookingSpots.locations.length > 0 && (
                  <div className="mb-6">
                    <Label className="mb-2 block">Select Location</Label>
                    <Select value={selectedLocationId || ''} onValueChange={setSelectedLocationId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a location to configure booking spots" />
                      </SelectTrigger>
                      <SelectContent>
                        {bookingSpots.locations.map((loc) => (
                          <SelectItem key={loc.locationId} value={loc.locationId}>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {loc.locationName}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Add/Edit Spot Form */}
                {selectedLocationId && (isAddingSpot || editingSpotId) && (
                  <Card className="mb-6">
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                        <Label>Spot Type</Label>
                        <Select
                          value={spotForm.type}
                          onValueChange={(value: 'exact' | 'window') =>
                            setSpotForm(prev => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="exact">Exact Time (e.g., 8 AM, 9 AM)</SelectItem>
                            <SelectItem value="window">Arrival Window (e.g., 9 AM - 11 AM)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {spotForm.type === 'exact' ? (
                        <div className="space-y-2">
                          <Label>Time *</Label>
                          <TimePicker
                            value={spotForm.time || '09:00'}
                            onChange={(value) => setSpotForm(prev => ({ ...prev, time: value }))}
                          />
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Start Time *</Label>
                            <TimePicker
                              value={spotForm.startTime || '09:00'}
                              onChange={(value) => setSpotForm(prev => ({ ...prev, startTime: value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Time *</Label>
                            <TimePicker
                              value={spotForm.endTime || '11:00'}
                              onChange={(value) => setSpotForm(prev => ({ ...prev, endTime: value }))}
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="spot-label">Custom Label (Optional)</Label>
                        <Input
                          id="spot-label"
                          placeholder="e.g., Morning Window, Afternoon Slot"
                          value={spotForm.label || ''}
                          onChange={(e) => setSpotForm(prev => ({ ...prev, label: e.target.value }))}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={resetSpotForm}>
                          Cancel
                        </Button>
                        <Button
                          onClick={editingSpotId ? handleUpdateSpot : handleAddSpot}
                          disabled={
                            (spotForm.type === 'exact' && !spotForm.time) ||
                            (spotForm.type === 'window' && (!spotForm.startTime || !spotForm.endTime))
                          }
                        >
                          {editingSpotId ? 'Update' : 'Add'} Spot
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Add Spot Button */}
                {selectedLocationId && !isAddingSpot && !editingSpotId && (
                  <div className="mb-6">
                    <Button onClick={() => setIsAddingSpot(true)} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Booking Spot
                    </Button>
                  </div>
                )}

                {/* Locations and Spots List */}
                {bookingSpots.locations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <MapPin className="mx-auto h-12 w-12 mb-2 opacity-20" />
                    <p>No locations configured yet. Add a location to start setting up booking spots.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {bookingSpots.locations.map((location) => (
                      <Card key={location.locationId}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <CardTitle className="text-lg">{location.locationName}</CardTitle>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteLocation(location.locationId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {location.spots.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                              <p>No booking spots configured for this location.</p>
                              {selectedLocationId === location.locationId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-4"
                                  onClick={() => setIsAddingSpot(true)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add First Spot
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {location.spots.map((spot) => (
                                <div
                                  key={spot.id}
                                  className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    <div>
                                      <div className="font-medium">
                                        {spot.type === 'exact'
                                          ? formatTime(spot.time || '')
                                          : `${formatTime(spot.startTime || '')} - ${formatTime(spot.endTime || '')}`}
                                      </div>
                                      {spot.label && (
                                        <div className="text-sm text-muted-foreground">{spot.label}</div>
                                      )}
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {spot.type === 'exact' ? 'Exact Time' : 'Arrival Window'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleEditSpot(location.locationId, spot)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteSpot(location.locationId, spot.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Reserved Time Slots Section */}
              <div className="mt-8 pt-8 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Reserved Time Slots</h3>
                    <p className="text-sm text-muted-foreground">
                      Block specific time periods (maintenance, events, etc.)
                    </p>
                  </div>
                  {!isAdding && !editingId && (
                    <Button onClick={() => setIsAdding(true)} size="sm">
                      <Plus className="h-4 w-4 mr-2" /> Add Time Slot
                    </Button>
                  )}
                </div>

                {(isAdding || editingId) && (
                  <Card className="mb-4">
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <DatePicker
                            date={formData.startDate ? new Date(formData.startDate) : undefined}
                            onSelect={(date) => handleDateChange('startDate', date)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Date</Label>
                          <DatePicker
                            date={formData.endDate ? new Date(formData.endDate) : undefined}
                            onSelect={(date) => handleDateChange('endDate', date)}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <TimePicker
                            value={formData.startTime}
                            onChange={(value) => handleTimeChange('startTime', value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <TimePicker
                            value={formData.endTime}
                            onChange={(value) => handleTimeChange('endTime', value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Reservation</Label>
                        <Input
                          id="reason"
                          name="reason"
                          placeholder="E.g., Maintenance, Holiday, etc."
                          value={formData.reason}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={resetSlotForm}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={editingId ? handleUpdateSlot : handleAddSlot}
                          disabled={!formData.reason.trim()}
                        >
                          {editingId ? 'Update' : 'Add'} Time Slot
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {slots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Clock className="mx-auto h-12 w-12 mb-2 opacity-20" />
                    <p>No time slots reserved yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {slots
                      .sort((a, b) => 
                        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                      )
                      .map(slot => (
                      <div 
                        key={slot.id} 
                        className={`border rounded-lg p-4 ${isActive(slot) ? 'border-primary bg-primary/5' : 'border-border'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">
                              {formatDateTime(slot.startDate, slot.startTime)} - {formatDateTime(slot.endDate, slot.endTime)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {slot.reason}
                            </p>
                            <div className="mt-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isActive(slot) 
                                  ? 'bg-green-100 text-green-800' 
                                  : isBefore(new Date(), new Date(`${slot.startDate}T${slot.startTime}`))
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}>
                                {isActive(slot) 
                                  ? 'Active Now' 
                                  : isBefore(new Date(), new Date(`${slot.startDate}T${slot.startTime}`))
                                    ? 'Upcoming'
                                    : 'Expired'}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleEdit(slot)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteSlot(slot.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                        onSelect={handleHolidayDateChange}
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
