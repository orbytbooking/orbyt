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

type TimeSlot = {
  id: string;
  start: string;
  end: string;
  date: string; // ISO date string
};

const STORAGE_KEY = "providerAvailabilitySlots";

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
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isAddSlotDialogOpen, setIsAddSlotDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [newSlotStart, setNewSlotStart] = useState("9:00 AM");
  const [newSlotEnd, setNewSlotEnd] = useState("10:00 AM");
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load saved time slots
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTimeSlots(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load time slots", error);
      }
    }
  }, []);

  // Save time slots whenever they change
  useEffect(() => {
    if (timeSlots.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timeSlots));
    }
  }, [timeSlots]);

  // Get calendar grid with weeks (traditional calendar layout)
  const getCalendarGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
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
          weekDays.push(new Date(year, month, dayCounter));
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

  // Get time slots for a specific date
  const getSlotsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return timeSlots.filter(slot => slot.date === dateStr);
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
    setSelectedDate(date.toISOString().split('T')[0]);
    setIsAddSlotDialogOpen(true);
  };

  // Add new time slot
  const addTimeSlot = () => {
    if (!selectedDate) return;

    const newSlot: TimeSlot = {
      id: Date.now().toString(),
      start: newSlotStart,
      end: newSlotEnd,
      date: selectedDate,
    };

    setTimeSlots([...timeSlots, newSlot]);
    setIsAddSlotDialogOpen(false);
    setNewSlotStart("9:00 AM");
    setNewSlotEnd("10:00 AM");

    toast({
      title: "Time Slot Added",
      description: "Your availability has been updated.",
    });
  };

  // Remove time slot
  const removeTimeSlot = (id: string) => {
    setTimeSlots(timeSlots.filter(slot => slot.id !== id));
    toast({
      title: "Time Slot Removed",
      description: "The time slot has been deleted.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Availability</h1>
          <p className="text-sm text-muted-foreground">Set availability and schedule calendar</p>
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
            <DialogTitle>Add Time Slot</DialogTitle>
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
              Add Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
};

export default ManageAvailability;
