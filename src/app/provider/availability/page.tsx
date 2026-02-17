"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Clock, 
  Calendar,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAuthenticatedFetch } from "@/lib/auth-provider-client";
import { dateToLocalString } from "@/lib/date-utils";

type TimeSlot = {
  id: string;
  start: string;
  end: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  is_available: boolean;
  effective_date: string;
  expiry_date?: string;
};

type ProviderPreferences = {
  id: string;
  provider_id: string;
  auto_assignments: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  advance_booking_days: number;
  minimum_booking_notice_hours: number;
  accepts_emergency_bookings: boolean;
  preferred_payment_methods: string[];
  timezone?: string;
  created_at: string;
  updated_at: string;
};

type ProviderData = {
  preferences?: ProviderPreferences;
  availability: TimeSlot[];
};

const TIME_OPTIONS = [
  "12:00 AM", "12:30 AM", "1:00 AM", "1:30 AM", "2:00 AM", "2:30 AM",
  "3:00 AM", "3:30 AM", "4:00 AM", "4:30 AM", "5:00 AM", "5:30 AM",
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
  "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM",
];

// Generate time headers for the calendar (hourly slots from 8 AM to 8 PM)
const generateTimeHeaders = () => {
  const headers = [];
  for (let i = 8; i <= 20; i++) {
    const hour = i > 12 ? i - 12 : i;
    const period = i >= 12 ? "PM" : "AM";
    const displayHour = i === 12 ? 12 : hour;
    headers.push({
      label: `${displayHour}:00${period.toLowerCase()}`,
      value: i,
    });
  }
  return headers;
};

const ManageAvailability = () => {
  const [mounted, setMounted] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [preferences, setPreferences] = useState<ProviderPreferences | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isAddSlotDialogOpen, setIsAddSlotDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [newSlotStart, setNewSlotStart] = useState("9:00 AM");
  const [newSlotEnd, setNewSlotEnd] = useState("10:00 AM");
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load time slots and preferences from database
  const loadTimeSlots = async () => {
    try {
      // Load availability slots
      const availabilityResponse = await createAuthenticatedFetch('/api/provider/availability');
      let availabilitySlots: TimeSlot[] = [];
      
      if (availabilityResponse.ok) {
        const slots = await availabilityResponse.json();
        console.log('Loaded slots from database:', slots); // Debug log
        // Convert database time format to display format
        availabilitySlots = slots
          .filter((slot: any) => slot.start_time && slot.end_time) // Filter out slots with invalid times
          .map((slot: any) => ({
            ...slot,
            start: convertTimeToDisplay(slot.start_time),
            end: convertTimeToDisplay(slot.end_time)
          }));
        console.log('Converted display slots:', availabilitySlots); // Debug log
      } else {
        console.error('Failed to load time slots');
      }

      // Load provider preferences
      const preferencesResponse = await createAuthenticatedFetch('/api/provider/settings');
      let providerPreferences: ProviderPreferences | null = null;
      
      if (preferencesResponse.ok) {
        const settingsData = await preferencesResponse.json();
        providerPreferences = settingsData.preferences;
        console.log('Loaded provider preferences:', providerPreferences);
      } else {
        console.error('Failed to load provider preferences');
      }

      setTimeSlots(availabilitySlots);
      setPreferences(providerPreferences);
    } catch (error) {
      console.error('Error loading time slots and preferences:', error);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadTimeSlots();
    }
  }, [mounted]);

  // Convert time from database (24:00:00) to display format (12:00 PM)
  const convertTimeToDisplay = (timeStr: string): string => {
    if (!timeStr) return '12:00 PM'; // Default fallback
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes?.toString().padStart(2, '0') || '00'} ${period}`;
  };

  // Get calendar grid with weeks (traditional calendar layout)
  const getCalendarGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
    // Use LOCAL day to match calendar display (calendar shows dates in user's timezone)
    const startingDayOfWeek = firstDay.getDay();
    
    // Calculate total cells needed
    const daysInMonth = lastDay.getDate();
    const totalCells = startingDayOfWeek + daysInMonth;
    const weeks = Math.ceil(totalCells / 7);
    
    const calendar: (Date | null)[][] = [];
    let dayCounter = 1;
    
    for (let week = 0; week < weeks; week++) {
      const weekDays: (Date | null)[] = [];
      for (let day = 0; day < 7; day++) {
        const cellIndex = week * 7 + day;
        if (cellIndex < startingDayOfWeek || dayCounter > daysInMonth) {
          weekDays.push(null);
        } else {
          // Create date in local timezone for display, but ensure UTC consistency
          const localDate = new Date(year, month, dayCounter);
          weekDays.push(localDate);
          dayCounter++;
        }
      }
      calendar.push(weekDays);
    }
    
    return calendar;
  };

  const calendarGrid = getCalendarGrid();
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Navigate to previous month
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Get month and year for display
  const getMonthYear = () => {
    return currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get time slots for a specific date (based on day of week AND effective date range)
  const getSlotsForDate = (date: Date) => {
    // Get date string in YYYY-MM-DD format using local timezone
    // This ensures the date string matches what the user sees in the calendar
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Calculate day of week using UTC to match server-side calculation
    // Parse date string as UTC to ensure consistent day-of-week calculation
    const [yearNum, monthNum, dayNum] = dateString.split('-').map(Number);
    const utcDate = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
    const dayOfWeek = utcDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    
    console.log(`🔍 getSlotsForDate for ${date.toDateString()}:`);
    console.log(`  - Local Date: ${date.toLocaleString()}`);
    console.log(`  - Date String (YYYY-MM-DD): ${dateString}`);
    console.log(`  - UTC Day of Week: ${dayOfWeek} (${dayName})`);
    console.log(`  - Looking for slots with day_of_week: ${dayOfWeek}`);
    
    // Filter slots that match BOTH:
    // 1. The day of week, AND
    // 2. Either have no effective_date (recurring) OR the date falls within effective_date to expiry_date range
    const matchingSlots = timeSlots.filter(slot => {
      if (!slot.is_available) return false;
      // Must match day of week
      if (slot.day_of_week !== dayOfWeek) return false;
      
      // If no effective_date, this is a recurring slot (matches all dates)
      if (!slot.effective_date) return true;
      
      // If there's an expiry_date, check if current date is within range
      if (slot.expiry_date) {
        return dateString >= slot.effective_date && dateString <= slot.expiry_date;
      }

      // If only effective_date exists, treat as recurring from that date onward
      return dateString >= slot.effective_date;
    });
    
    console.log(`  - Total slots in state: ${timeSlots.length}`);
    console.log(`  - Matching slots: ${matchingSlots.length}`);
    
    if (matchingSlots.length > 0) {
      matchingSlots.forEach((slot, index) => {
        const slotDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.day_of_week];
        console.log(`    - Slot ${index + 1}: ${slot.start} - ${slot.end} (day_of_week: ${slot.day_of_week} = ${slotDayName}, effective_date: ${slot.effective_date || 'recurring'})`);
      });
    }
    
    return matchingSlots;
  };

  // Convert time string to hour number
  const timeToHour = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    let [hours] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours;
  };

  // Calculate position and height for time slot
  const getSlotPosition = (slot: TimeSlot) => {
    const startHour = timeToHour(slot.start);
    const endHour = timeToHour(slot.end);
    const startMinutes = parseInt(slot.start.split(':')[1]) || 0;
    const endMinutes = parseInt(slot.end.split(':')[1]) || 0;
    
    const top = ((startHour - 8) * 100) + (startMinutes / 60 * 100);
    const height = ((endHour - startHour) * 100) + ((endMinutes - startMinutes) / 60 * 100);
    
    return { top, height };
  };

  // Open dialog to add new time slot
  const openAddSlotDialog = (date: Date) => {
    // Use local YYYY-MM-DD so the chosen day matches the calendar cell
    setSelectedDate(dateToLocalString(date));
    setEditingSlotId(null);
    setNewSlotStart("9:00 AM");
    setNewSlotEnd("10:00 AM");
    setIsAddSlotDialogOpen(true);
  };

  const openEditSlotDialog = (slot: TimeSlot) => {
    // Prefer effective_date if present; otherwise keep current selectedDate
    const date = slot.effective_date || selectedDate;
    if (date) setSelectedDate(date);
    setEditingSlotId(slot.id);
    setNewSlotStart(slot.start);
    setNewSlotEnd(slot.end);
    setIsAddSlotDialogOpen(true);
  };

  // Convert display time to 24-hour format for API
  const convertTo24Hour = (timeStr: string): string => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes?.toString().padStart(2, '0') || '00'}:00`;
  };

  // Add new time slot to database
  const addTimeSlot = async () => {
    if (!selectedDate) return;

    try {
      const startTime24 = convertTo24Hour(newSlotStart);
      const endTime24 = convertTo24Hour(newSlotEnd);
      
      console.log('🔍 Debug addTimeSlot:');
      console.log(`  - Selected date: ${selectedDate}`);
      console.log(`  - Start time: ${newSlotStart} -> ${startTime24}`);
      console.log(`  - End time: ${newSlotEnd} -> ${endTime24}`);
      
      // Create date object from selected date (local timezone for day calculation)
      const dateObj = new Date(selectedDate + 'T00:00:00');
      const localDayOfWeek = dateObj.getDay(); // Use local day to match calendar display
      const utcDayOfWeek = dateObj.getUTCDay(); // Use UTC day to match server calculation
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][localDayOfWeek];
      const utcDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][utcDayOfWeek];
      
      console.log(`  - Date object: ${dateObj.toString()}`);
      console.log(`  - Local day_of_week: ${localDayOfWeek} (${dayName})`);
      console.log(`  - UTC day_of_week: ${utcDayOfWeek} (${utcDayName})`);
      console.log(`  - Effective date for API: ${selectedDate}`);

      const response = await createAuthenticatedFetch('/api/provider/availability', {
        method: editingSlotId ? 'PUT' : 'POST',
        body: JSON.stringify(
          editingSlotId
            ? { slotId: editingSlotId, date: selectedDate, startTime: startTime24, endTime: endTime24 }
            : { date: selectedDate, startTime: startTime24, endTime: endTime24 }
        ),
      });

      if (response.ok) {
        const newSlot = await response.json();
        console.log(`✅ Slot ${editingSlotId ? 'updated' : 'created'} successfully:`, newSlot);
        
        // Convert to display format
        const displaySlot = {
          ...newSlot,
          start: convertTimeToDisplay(newSlot.start_time),
          end: convertTimeToDisplay(newSlot.end_time)
        };
        
        console.log('🔄 Display slot created:', displaySlot);
        console.log(`  - Stored day_of_week: ${newSlot.day_of_week}`);
        console.log(`  - Display start: ${displaySlot.start}`);
        console.log(`  - Display end: ${displaySlot.end}`);
        
        if (editingSlotId) {
          setTimeSlots(timeSlots.map(s => (s.id === editingSlotId ? { ...s, ...displaySlot } : s)));
        } else {
          setTimeSlots([...timeSlots, displaySlot]);
        }
        setIsAddSlotDialogOpen(false);
        setNewSlotStart("9:00 AM");
        setNewSlotEnd("10:00 AM");
        setEditingSlotId(null);

        toast({
          title: editingSlotId ? "Time Slot Updated" : "Time Slot Added",
          description: "Your availability has been updated.",
        });

        // Refresh data to ensure persistence
        setTimeout(() => {
          loadTimeSlots();
        }, 500);
      } else {
        const error = await response.json();
        console.error('Add time slot error:', error);
        toast({
          title: "Error",
          description: error.details || error.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding time slot:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Remove time slot from database
  const removeTimeSlot = async (id: string) => {
    try {
      const response = await createAuthenticatedFetch(`/api/provider/availability?slotId=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTimeSlots(timeSlots.filter(slot => slot.id !== id));
        toast({
          title: "Time Slot Removed",
          description: "The time slot has been deleted.",
        });

        // Refresh data to ensure persistence
        setTimeout(() => {
          loadTimeSlots();
        }, 500);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to remove time slot",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error removing time slot:', error);
      toast({
        title: "Error",
        description: "Failed to remove time slot",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Availability & Preferences</h1>
          <p className="text-sm text-muted-foreground">Manage your availability calendar and provider preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[150px] text-center">
            {getMonthYear()}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Provider Preferences Summary */}
      {preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Provider Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Availability Settings</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Advance Booking:</span>
                    <span className="font-medium">{preferences.advance_booking_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minimum Notice:</span>
                    <span className="font-medium">{preferences.minimum_booking_notice_hours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Emergency Bookings:</span>
                    <span className={`font-medium ${preferences.accepts_emergency_bookings ? 'text-green-600' : 'text-gray-500'}`}>
                      {preferences.accepts_emergency_bookings ? 'Accepted' : 'Not Accepted'}
                    </span>
                  </div>
                  {preferences.timezone && (
                    <div className="flex justify-between">
                      <span>Timezone:</span>
                      <span className="font-medium">{preferences.timezone}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Notifications</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className={`font-medium ${preferences.email_notifications ? 'text-green-600' : 'text-gray-500'}`}>
                      {preferences.email_notifications ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>SMS:</span>
                    <span className={`font-medium ${preferences.sms_notifications ? 'text-green-600' : 'text-gray-500'}`}>
                      {preferences.sms_notifications ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Push:</span>
                    <span className={`font-medium ${preferences.push_notifications ? 'text-green-600' : 'text-gray-500'}`}>
                      {preferences.push_notifications ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Other Settings</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Auto Assignments:</span>
                    <span className={`font-medium ${preferences.auto_assignments ? 'text-green-600' : 'text-gray-500'}`}>
                      {preferences.auto_assignments ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Methods:</span>
                    <span className="font-medium">{preferences.preferred_payment_methods.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {/* Calendar Header - Days of Week */}
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {daysOfWeek.map((day, index) => (
                <div
                  key={index}
                  className="p-3 text-center text-sm font-semibold border-r last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Body - Weeks and Days */}
            {calendarGrid.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
                {week.map((day, dayIndex) => {
                  if (!day) {
                    // Empty cell for days outside current month
                    return (
                      <div
                        key={dayIndex}
                        className="min-h-[120px] border-r last:border-r-0 bg-muted/10"
                      />
                    );
                  }

                  const daySlots = getSlotsForDate(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  
                  // Calendar display uses local day-of-week (matches visual position)
                  const localDayOfWeek = day.getDay();
                  const localDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][localDayOfWeek];
                  const calendarDayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex];
                  
                  // Verify calendar position matches actual day
                  if (localDayOfWeek !== dayIndex) {
                    console.warn(`⚠️ Calendar mismatch: Date ${day.getDate()} is ${localDayName} but positioned at ${calendarDayName} (index ${dayIndex})`);
                  }
                  
                  console.log(`📅 Calendar Cell: ${day.toDateString()}`);
                  console.log(`  - Calendar position: ${calendarDayName} (index ${dayIndex})`);
                  console.log(`  - Local day: ${localDayName} (getDay: ${localDayOfWeek})`);
                  console.log(`  - Date: ${day.getDate()}`);
                  console.log(`  - Slots found: ${daySlots.length}`);

                  return (
                    <div
                      key={dayIndex}
                      className={`min-h-[120px] border-r last:border-r-0 p-2 hover:bg-muted/20 cursor-pointer transition-colors ${
                        isToday ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                      }`}
                      onClick={() => openAddSlotDialog(day)}
                    >
                      {/* Date Number */}
                      <div className={`text-sm font-semibold mb-2 ${
                        isToday ? 'text-blue-600' : ''
                      }`}>
                        {day.getDate()}
                      </div>

                      {/* Time Slots */}
                      <div className="space-y-1">
                        {/* Preference Indicators */}
                        {preferences && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {preferences.accepts_emergency_bookings && (
                              <span className="text-[8px] bg-green-100 text-green-700 px-1 rounded border border-green-300">
                                Emergency
                              </span>
                            )}
                            <span className="text-[8px] bg-gray-100 text-gray-600 px-1 rounded border border-gray-300">
                              {preferences.minimum_booking_notice_hours}h notice
                            </span>
                          </div>
                        )}
                        
                        {daySlots.map((slot, slotIndex) => {
                          const colors = [
                            'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-900 dark:text-blue-100',
                            'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-500 dark:border-cyan-400 text-cyan-900 dark:text-cyan-100',
                            'bg-orange-100 dark:bg-orange-900/30 border-orange-500 dark:border-orange-400 text-orange-900 dark:text-orange-100',
                          ];
                          const colorClass = colors[slotIndex % colors.length];

                          return (
                            <div
                              key={slot.id}
                              className={`${colorClass} border-l-4 rounded p-1.5 text-[10px] group hover:shadow-md transition-shadow`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditSlotDialog(slot);
                              }}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {slot.start} - {slot.end}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeTimeSlot(slot.id);
                                  }}
                                >
                                  <X className="h-2 w-2" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Time Slot Dialog */}
      {mounted && (
        <Dialog open={isAddSlotDialogOpen} onOpenChange={setIsAddSlotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSlotId ? 'Edit Time Slot' : 'Add Time Slot'}</DialogTitle>
            <DialogDescription>
              Add a new available time slot for {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="start-time">Start Time</Label>
              <Select value={newSlotStart} onValueChange={setNewSlotStart}>
                <SelectTrigger id="start-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="end-time">End Time</Label>
              <Select value={newSlotEnd} onValueChange={setNewSlotEnd}>
                <SelectTrigger id="end-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSlotDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={addTimeSlot}
              style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {editingSlotId ? 'Update Slot' : 'Add Slot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
};

export default ManageAvailability;