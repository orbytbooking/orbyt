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
      return { chip: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", dot: "#d97706" };
    case "completed":
      return { chip: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", dot: "#16a34a" };
    case "cancelled":
      return { chip: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", dot: "#dc2626" };
    case "confirmed":
      return { chip: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)", dot: "#2563eb" };
    case "pending":
      return { chip: "linear-gradient(135deg, #fde68a 0%, #f59e42 100%)", dot: "#d97706" };
    default:
      return { chip: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)", dot: "#64748b" };
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

function formatYmd(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Sunday-based week start (matches day header labels). */
function startOfWeekSunday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sortBookingsByTime(bookings: CalendarBooking[]): CalendarBooking[] {
  return [...bookings].sort((a, b) => {
    const ta = (a.time && String(a.time).trim()) || "99:99";
    const tb = (b.time && String(b.time).trim()) || "99:99";
    return ta.localeCompare(tb, undefined, { numeric: true });
  });
}

type AdminBookingsCalendarProps = {
  bookings: CalendarBooking[];
  onBookingClick: (booking: CalendarBooking) => void;
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  onRefresh?: () => void;
  showRefresh?: boolean;
  title?: string;
  onDayClick?: (dateString: string) => void;
  /** From store options: month / week / day */
  calendarViewMode?: "month" | "week" | "day";
  monthDisplay?: "names" | "dots";
  multiBookingLayout?: "side_by_side" | "overlapped";
  /** Reserved for timeline / hour-grid views (no effect on month-week-day list UIs yet). */
  hideNonWorkingHours?: boolean;
};

function BookingIndicators({
  dayBookings,
  monthDisplay,
  multiBookingLayout,
  onBookingClick,
  compact,
}: {
  dayBookings: CalendarBooking[];
  monthDisplay: "names" | "dots";
  multiBookingLayout: "side_by_side" | "overlapped";
  onBookingClick: (b: CalendarBooking) => void;
  compact: boolean;
}) {
  const maxItems = compact ? (monthDisplay === "dots" ? 8 : 2) : 50;
  const list = dayBookings.slice(0, maxItems);
  const overflow = dayBookings.length - list.length;

  if (monthDisplay === "dots") {
    return (
      <div className="flex flex-wrap items-center gap-1 content-start">
        {list.map((booking, idx) => {
          const tone = getStatusTone(booking.status);
          return (
            <button
              key={`${booking.id}-${booking.date ?? ""}-${booking.time ?? ""}-dot-${idx}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBookingClick(booking);
              }}
              className="rounded-full shrink-0 border border-white/30 shadow-sm hover:opacity-90"
              style={{ width: 8, height: 8, background: tone.dot }}
              title={`${booking.customer_name ?? "Booking"} — ${booking.service ?? ""}`}
            />
          );
        })}
        {overflow > 0 && (
          <span className="text-[10px] text-muted-foreground">+{overflow}</span>
        )}
      </div>
    );
  }

  const nameBlock = (booking: CalendarBooking, idx: number) => {
    const tone = getStatusTone(booking.status);
    const nameParts = (booking.customer_name ?? "Booking").trim().split(/\s+/);
    const shortName =
      nameParts.length >= 2
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}`
        : nameParts[0] ?? "Booking";
    return (
      <div
        key={`${booking.id}-${booking.date ?? ""}-${booking.time ?? ""}-n-${idx}`}
        onClick={(e) => {
          e.stopPropagation();
          onBookingClick(booking);
        }}
        className={cn(
          "text-[10px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity text-white truncate",
          multiBookingLayout === "overlapped" && compact && idx > 0 && "absolute left-0.5 right-0.5",
          !compact && "max-w-full"
        )}
        style={{
          background: tone.chip,
          ...(multiBookingLayout === "overlapped" && compact && idx > 0
            ? { top: 4 + idx * 12, zIndex: 10 + idx }
            : {}),
        }}
        title={`${booking.customer_name ?? "Booking"} — ${booking.service ?? ""}`}
      >
        {shortName}
      </div>
    );
  };

  if (multiBookingLayout === "overlapped" && compact && monthDisplay === "names") {
    const stacked = dayBookings.slice(0, 3);
    return (
      <div className="relative flex-1 min-h-[2.5rem]">
        {stacked.map((b, idx) => nameBlock(b, idx))}
        {dayBookings.length > 3 && (
          <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground bg-background/80 px-0.5 rounded">
            +{dayBookings.length - 3}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto",
        multiBookingLayout === "side_by_side" ? "flex flex-row flex-wrap gap-0.5 content-start" : "space-y-0.5"
      )}
    >
      {list.map((booking, idx) => nameBlock(booking, idx))}
      {compact && overflow > 0 && multiBookingLayout === "side_by_side" && monthDisplay === "names" && (
        <div className="text-[10px] text-muted-foreground w-full text-center">+{overflow}</div>
      )}
    </div>
  );
}

export function AdminBookingsCalendar({
  bookings,
  onBookingClick,
  currentDate,
  onMonthChange,
  onRefresh,
  showRefresh = true,
  title,
  onDayClick,
  calendarViewMode = "month",
  monthDisplay = "names",
  multiBookingLayout = "side_by_side",
  hideNonWorkingHours: _hideNonWorkingHours = false,
}: AdminBookingsCalendarProps) {
  void _hideNonWorkingHours;
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getBookingsForDate = (date: string) => bookings.filter((b) => b.date === date);

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const navigateWeek = (direction: "prev" | "next") => {
    onMonthChange(addDays(currentDate, direction === "prev" ? -7 : 7));
  };

  const navigateDay = (direction: "prev" | "next") => {
    onMonthChange(addDays(currentDate, direction === "prev" ? -1 : 1));
  };

  const goToday = () => onMonthChange(new Date());

  const weekStart = startOfWeekSunday(currentDate);
  const weekDates: Date[] = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} – ${monthNames[weekDates[6].getMonth()]} ${weekDates[6].getDate()}, ${weekStart.getFullYear()}`;

  const ymd = formatYmd(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const dayBookingsSorted = sortBookingsByTime(getBookingsForDate(ymd));

  const headerTitle =
    title != null
      ? title
      : calendarViewMode === "month"
        ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
        : calendarViewMode === "week"
          ? `Week of ${weekLabel}`
          : `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;

  const onNavigatePrev =
    calendarViewMode === "month" ? () => navigateMonth("prev") : calendarViewMode === "week" ? () => navigateWeek("prev") : () => navigateDay("prev");
  const onNavigateNext =
    calendarViewMode === "month" ? () => navigateMonth("next") : calendarViewMode === "week" ? () => navigateWeek("next") : () => navigateDay("next");

  if (calendarViewMode === "day") {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{headerTitle}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goToday} className="shrink-0">
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={onNavigatePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={onNavigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {showRefresh && onRefresh && (
                <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh">
                  <RotateCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {title != null && (
            <p className="text-sm text-muted-foreground">
              {monthNames[currentDate.getMonth()]} {currentDate.getDate()}, {currentDate.getFullYear()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {dayBookingsSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No bookings on this day.</p>
          ) : (
            <ul className="space-y-2">
              {dayBookingsSorted.map((booking, idx) => {
                const tone = getStatusTone(booking.status);
                return (
                  <li key={`${booking.id}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => onBookingClick(booking)}
                      className="w-full text-left rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 hover:bg-accent/40 transition-colors"
                    >
                      <span className="font-medium">{booking.customer_name ?? "Booking"}</span>
                      <span className="text-sm text-muted-foreground">
                        {booking.time ? `${booking.time} · ` : ""}
                        {booking.service ?? ""}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded text-white shrink-0"
                        style={{ background: tone.chip }}
                      >
                        {booking.status}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <LegendRow />
        </CardContent>
      </Card>
    );
  }

  if (calendarViewMode === "week") {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{headerTitle}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goToday} className="shrink-0">
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={onNavigatePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={onNavigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {showRefresh && onRefresh && (
                <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh">
                  <RotateCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((d, i) => {
              const ds = formatYmd(d.getFullYear(), d.getMonth(), d.getDate());
              const dayBookings = getBookingsForDate(ds);
              const today = new Date();
              const isToday =
                today.getDate() === d.getDate() &&
                today.getMonth() === d.getMonth() &&
                today.getFullYear() === d.getFullYear();

              return (
                <div key={ds} className="flex flex-col min-w-0">
                  <div className="text-center font-semibold text-sm py-2 text-foreground/90">{dayNames[i]}</div>
                  <div
                    role={onDayClick ? "button" : undefined}
                    onClick={onDayClick ? () => onDayClick(ds) : undefined}
                    className={cn(
                      "rounded-lg p-2 border min-h-[140px] flex flex-col",
                      isToday
                        ? "bg-accent/50 border-primary/50"
                        : "bg-background border-border hover:bg-accent/20",
                      onDayClick && "cursor-pointer"
                    )}
                  >
                    <div className="text-sm font-medium mb-1">{d.getDate()}</div>
                    {dayBookings.length > 0 && (
                      <BookingIndicators
                        dayBookings={dayBookings}
                        monthDisplay={monthDisplay}
                        multiBookingLayout={multiBookingLayout}
                        onBookingClick={onBookingClick}
                        compact
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <LegendRow />
        </CardContent>
      </Card>
    );
  }

  // Month view (default)
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{headerTitle}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goToday} className="shrink-0">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {showRefresh && onRefresh && (
              <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh">
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
            <div key={day} className="text-center font-semibold text-sm py-2 text-foreground/90">
              {day}
            </div>
          ))}
          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="h-24" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dateString = formatYmd(year, month, day);
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
                  "h-24 rounded-lg p-2 transition-all cursor-pointer border flex flex-col",
                  isToday
                    ? "bg-accent/50 border-primary/50 hover:bg-accent/70"
                    : "bg-background border-border hover:bg-accent/20"
                )}
              >
                <div className="text-sm font-medium mb-1 text-foreground shrink-0">{day}</div>
                {hasBookings && (
                  <BookingIndicators
                    dayBookings={dayBookings}
                    monthDisplay={monthDisplay}
                    multiBookingLayout={multiBookingLayout}
                    onBookingClick={onBookingClick}
                    compact
                  />
                )}
              </div>
            );
          })}
        </div>
        <LegendRow />
      </CardContent>
    </Card>
  );
}

function LegendRow() {
  return (
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
  );
}
