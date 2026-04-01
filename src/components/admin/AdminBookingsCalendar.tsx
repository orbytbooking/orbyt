"use client";

import type { ReactElement } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarBooking = {
  id: string;
  date: string;
  time?: string;
  status: string;
  customer_name?: string;
  service?: string;
  /** Optional: first industry for this business (passed from parent). */
  industry_name?: string;
  customer_phone?: string;
  customer_email?: string;
  address?: string;
  apt_no?: string;
  frequency?: string | null;
  duration_minutes?: number | null;
  assignedProvider?: string | null;
  provider_name?: string | null;
  [key: string]: unknown;
};

function formatArrivalTime(timeRaw: string): string {
  const s = timeRaw.trim();
  if (!s) return "—";
  try {
    const part = s.slice(0, 5);
    const [hStr, mStr] = part.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (!Number.isFinite(h)) return s;
    const h12 = h % 12 || 12;
    const ampm = h < 12 ? "AM" : "PM";
    return `${String(h12).padStart(2, "0")}:${String(Number.isFinite(m) ? m : 0).padStart(2, "0")} ${ampm}`;
  } catch {
    return s;
  }
}

function formatDurationMinutes(total: number | null | undefined): string {
  if (total == null || !Number.isFinite(total) || total <= 0) return "—";
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} Hr${h === 1 ? "" : "s"}`);
  if (m > 0) parts.push(`${m} Min`);
  return parts.length ? parts.join(" ") : "—";
}

function formatFrequencyLabel(raw: string | null | undefined): string {
  if (!raw || !String(raw).trim()) return "—";
  const f = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  if (f === "one-time" || f === "onetime") return "One-Time";
  return String(raw).trim();
}

function formatBookingRef(id: string): string {
  const compact = String(id).replace(/-/g, "");
  if (compact.length >= 6) return compact.slice(-6).toUpperCase();
  return String(id).slice(0, 8).toUpperCase();
}

function statusHoverLabel(status: string): string {
  switch (status) {
    case "pending":
      return "New";
    case "in_progress":
      return "In progress";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "draft":
      return "Draft";
    case "quote":
      return "Quote";
    case "expired":
      return "Expired";
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
  }
}

function statusHoverBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-teal-100 text-teal-900 border border-teal-300";
    case "confirmed":
      return "bg-blue-100 text-blue-900 border border-blue-300";
    case "in_progress":
      return "bg-amber-100 text-amber-950 border border-amber-300";
    case "completed":
      return "bg-emerald-100 text-emerald-900 border border-emerald-300";
    case "cancelled":
      return "bg-red-100 text-red-900 border border-red-300";
    case "draft":
    case "quote":
      return "bg-slate-100 text-slate-800 border border-slate-300";
    case "expired":
      return "bg-slate-200 text-slate-900 border border-slate-400";
    default:
      return "bg-slate-100 text-slate-800 border border-slate-300";
  }
}

function pickCustomerName(b: CalendarBooking): string {
  const r = b as Record<string, unknown>;
  const nested = r.customer as { name?: string } | undefined;
  return (
    String(b.customer_name ?? r.customerName ?? nested?.name ?? "").trim() || "Booking"
  );
}

function pickPhone(b: CalendarBooking): string {
  const r = b as Record<string, unknown>;
  const nested = r.customer as { phone?: string } | undefined;
  return String(b.customer_phone ?? r.customer_phone ?? nested?.phone ?? "").trim();
}

function pickAssignTo(b: CalendarBooking): string {
  const r = b as Record<string, unknown>;
  return String(
    b.assignedProvider ?? r.assignedProvider ?? b.provider_name ?? r.provider_name ?? (r.provider as { name?: string } | undefined)?.name ?? ""
  ).trim();
}

function pickAddressBlock(b: CalendarBooking): string {
  const r = b as Record<string, unknown>;
  const apt = String(b.apt_no ?? r.apt_no ?? r.aptNo ?? "").trim();
  const addr = String(b.address ?? r.address ?? "").trim();
  const aptLine = apt ? (apt.toLowerCase().startsWith("apt") ? apt : `Apt ${apt}`) : "";
  if (aptLine && addr) return `${aptLine}, ${addr}`;
  return addr || aptLine || "—";
}

function pickDurationMinutes(b: CalendarBooking): number | null {
  const r = b as Record<string, unknown>;
  const v = b.duration_minutes ?? r.duration_minutes ?? r.durationMinutes;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickTimeRaw(b: CalendarBooking): string {
  const r = b as Record<string, unknown>;
  return String(b.time ?? r.scheduled_time ?? r.time ?? "").trim();
}

function pickFrequency(b: CalendarBooking): string {
  const r = b as Record<string, unknown>;
  return formatFrequencyLabel((b.frequency ?? r.frequency) as string | null | undefined);
}

function pickIndustry(b: CalendarBooking): string {
  const r = b as Record<string, unknown>;
  return String(b.industry_name ?? r.industry_name ?? "").trim();
}

function HoverDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-0.5 py-1.5 text-xs leading-snug border-b border-slate-200 last:border-b-0 bg-[#ffffff]">
      <span className="text-slate-600 shrink-0 font-medium">{label}</span>
      <span className="text-slate-900 text-right break-words min-w-0 font-semibold">{value || "—"}</span>
    </div>
  );
}

function BookingCalendarHoverCard({
  booking,
  children,
}: {
  booking: CalendarBooking;
  children: ReactElement;
}) {
  const name = pickCustomerName(booking);
  const phone = pickPhone(booking);
  const industry = pickIndustry(booking);
  const service = String(booking.service ?? "").trim() || "—";
  const frequency = pickFrequency(booking);
  const assignTo = pickAssignTo(booking) || "—";
  const location = pickAddressBlock(booking);
  const lengthStr = formatDurationMinutes(pickDurationMinutes(booking));
  const arrival = formatArrivalTime(pickTimeRaw(booking));
  const ref = formatBookingRef(booking.id);

  return (
    <HoverCard openDelay={180} closeDelay={120}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        sideOffset={10}
        className={cn(
          "booking-calendar-hover-panel w-[min(22rem,calc(100vw-1.5rem))] p-0 overflow-visible rounded-xl border border-slate-200",
          "!bg-[#ffffff] text-slate-900 z-[100] !shadow-none opacity-100",
          "!backdrop-blur-none !backdrop-filter-none"
        )}
      >
        <div className="relative rounded-lg bg-[#ffffff] px-3.5 pt-3 pb-2.5">
          <div className="mb-0.5 flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
            <span className="pr-1 text-sm font-semibold capitalize leading-tight text-slate-900">{name}</span>
            <span
              className={cn(
                "shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md",
                statusHoverBadgeClass(booking.status)
              )}
            >
              {statusHoverLabel(booking.status)}
            </span>
          </div>
          <div className="max-h-[min(320px,50vh)] overflow-y-auto bg-[#ffffff] pt-1 pr-0.5">
            <HoverDetailRow label="Phone" value={phone || "—"} />
            <HoverDetailRow label="Industry" value={industry || "—"} />
            <HoverDetailRow label="Service" value={service} />
            <HoverDetailRow label="Frequency" value={frequency} />
            <HoverDetailRow label="Assign to" value={assignTo} />
            <HoverDetailRow label="Booking id" value={ref} />
            <HoverDetailRow label="Location" value={location} />
            <HoverDetailRow label="Length" value={lengthStr} />
            <HoverDetailRow label="Arrival time" value={arrival} />
          </div>
          <svg
            className="pointer-events-none absolute left-1/2 -bottom-[7px] h-2 w-3.5 -translate-x-1/2 text-[#ffffff]"
            viewBox="0 0 14 8"
            aria-hidden
          >
            <polygon fill="currentColor" points="0,0 14,0 7,8" />
          </svg>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

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
      <div className="flex flex-wrap items-center gap-1.5 content-start w-full pt-0.5">
        {list.map((booking, idx) => {
          const tone = getStatusTone(booking.status);
          return (
            <BookingCalendarHoverCard key={`${booking.id}-${booking.date ?? ""}-${booking.time ?? ""}-dot-${idx}`} booking={booking}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookingClick(booking);
                }}
                className="rounded-full shrink-0 border border-white/30 shadow-sm hover:opacity-90"
                style={{ width: 8, height: 8, background: tone.dot }}
              />
            </BookingCalendarHoverCard>
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
      <BookingCalendarHoverCard key={`${booking.id}-${booking.date ?? ""}-${booking.time ?? ""}-n-${idx}`} booking={booking}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onBookingClick(booking);
          }}
          className={cn(
            "rounded-md cursor-pointer text-white truncate min-w-0 border border-white/15 shadow-sm",
            "text-[11px] leading-snug font-medium px-2 py-1",
            "hover:opacity-95 hover:brightness-[1.03] transition-[opacity,filter]",
            compact && "w-full max-w-full",
            multiBookingLayout === "overlapped" && compact && idx > 0 && "absolute left-0 right-0",
            !compact && "max-w-full"
          )}
          style={{
            background: tone.chip,
            ...(multiBookingLayout === "overlapped" && compact && idx > 0
              ? { top: 6 + idx * 18, zIndex: 10 + idx }
              : {}),
          }}
        >
          <span className="capitalize">{shortName}</span>
        </div>
      </BookingCalendarHoverCard>
    );
  };

  if (multiBookingLayout === "overlapped" && compact && monthDisplay === "names") {
    const stacked = dayBookings.slice(0, 3);
    return (
      <div className="relative flex-1 min-h-[3rem] w-full">
        {stacked.map((b, idx) => nameBlock(b, idx))}
        {dayBookings.length > 3 && (
          <div className="absolute bottom-0 right-0 text-[10px] font-medium text-muted-foreground bg-background/90 backdrop-blur-sm px-1 py-0.5 rounded border border-border/50">
            +{dayBookings.length - 3}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden w-full min-h-0",
        multiBookingLayout === "side_by_side" && compact
          ? "flex flex-col gap-1 content-start"
          : multiBookingLayout === "side_by_side"
            ? "flex flex-row flex-wrap gap-1 content-start"
            : "flex flex-col gap-1"
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
            <div key={`empty-${index}`} className="min-h-[7.5rem]" />
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
                  "min-h-[7.5rem] rounded-xl p-2.5 transition-all cursor-pointer border flex flex-col shadow-sm",
                  isToday
                    ? "bg-accent/50 border-primary/50 ring-1 ring-primary/25 hover:bg-accent/70"
                    : "bg-background border-border hover:bg-accent/20"
                )}
              >
                <div className="text-sm font-semibold tabular-nums text-foreground shrink-0 pb-2 mb-0.5 border-b border-border/50">
                  {day}
                </div>
                {hasBookings ? (
                  <div className="flex-1 min-h-0 w-full pt-2 flex flex-col">
                    <BookingIndicators
                      dayBookings={dayBookings}
                      monthDisplay={monthDisplay}
                      multiBookingLayout={multiBookingLayout}
                      onBookingClick={onBookingClick}
                      compact
                    />
                  </div>
                ) : null}
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
