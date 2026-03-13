"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarBooking = {
  id: string;
  date: string;
  time?: string;
  status: string;
  customer_name?: string;
  service?: string;
  [key: string]: unknown;
};

const getStatusTone = (status: string) => {
  switch (status) {
    case "in_progress":
      return { chip: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" };
    case "completed":
      return { chip: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" };
    case "cancelled":
      return { chip: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" };
    case "confirmed":
      return { chip: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)" };
    case "pending":
      return { chip: "linear-gradient(135deg, #fde68a 0%, #f59e42 100%)" };
    default:
      return { chip: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)" };
  }
};

function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  return { daysInMonth, startingDayOfWeek, year, month };
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type AdminBookingsCalendarProps = {
  bookings: CalendarBooking[];
  onBookingClick: (booking: CalendarBooking) => void;
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  onRefresh?: () => void;
  showRefresh?: boolean;
  title?: string;
  /** Optional: when a day cell is clicked (e.g. to show list for that date) */
  onDayClick?: (dateString: string) => void;
};

export function AdminBookingsCalendar({
  bookings,
  onBookingClick,
  currentDate,
  onMonthChange,
  onRefresh,
  showRefresh = true,
  title,
  onDayClick,
}: AdminBookingsCalendarProps) {
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getBookingsForDate = (date: string) =>
    bookings.filter((b) => b.date === date);

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>
            {title != null ? title : `${monthNames[month]} ${year}`}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMonthChange(new Date())}
              className="shrink-0"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {showRefresh && onRefresh && (
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                title="Refresh"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {title != null && (
          <p className="text-sm text-muted-foreground">
            {monthNames[month]} {year}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-sm py-2 text-foreground/90"
            >
              {day}
            </div>
          ))}
          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="h-24" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dateString = formatDate(year, month, day);
            const dayBookings = getBookingsForDate(dateString);
            const hasBookings = dayBookings.length > 0;
            const today = new Date();
            const isToday =
              today.getDate() === day &&
              today.getMonth() === month &&
              today.getFullYear() === year;

            return (
              <div
                key={day}
                role={onDayClick ? "button" : undefined}
                onClick={onDayClick ? () => onDayClick(dateString) : undefined}
                className={cn(
                  "h-24 rounded-lg p-2 transition-all cursor-pointer border",
                  isToday
                    ? "bg-accent/50 border-primary/50 hover:bg-accent/70"
                    : "bg-background border-border hover:bg-accent/20"
                )}
              >
                <div className="flex flex-col h-full">
                  <div className="text-sm font-medium mb-1 text-foreground">
                    {day}
                  </div>
                  {hasBookings && (
                    <div className="flex-1 space-y-0.5 overflow-y-auto">
                      {dayBookings.slice(0, 2).map((booking, idx) => {
                        const tone = getStatusTone(booking.status);
                        const nameParts = (booking.customer_name ?? "Booking")
                          .trim()
                          .split(/\s+/);
                        const shortName =
                          nameParts.length >= 2
                            ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}`
                            : nameParts[0] ?? "Booking";
                        return (
                          <div
                            key={`${booking.id}-${booking.date ?? ""}-${booking.time ?? ""}-${idx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookingClick(booking);
                            }}
                            className="text-[10px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity text-white truncate"
                            style={{ background: tone.chip }}
                            title={`${booking.customer_name ?? "Booking"} - ${booking.service ?? ""}`}
                          >
                            {shortName}
                          </div>
                        );
                      })}
                      {dayBookings.length > 2 && (
                        <div className="text-[10px] text-muted-foreground text-center">
                          +{dayBookings.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-200" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-200" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30 border border-red-200" />
            <span>Cancelled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
