"use client";

import { Booking } from "@/lib/customer-bookings";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";

type CustomAction = {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
};

type BookingsTableProps = {
  bookings: Booking[];
  emptyMessage: string;
  onCancelBooking?: (booking: Booking) => void;
  onViewDetails?: (booking: Booking) => void;
  customActions?: (booking: Booking) => CustomAction[];
};

const formatDate = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

/** Show time as "6:00 PM" even if stored as "18:00:00" */
const formatTime = (timeStr: string) => {
  if (!timeStr || typeof timeStr !== "string") return timeStr;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return trimmed;
  const hours = parseInt(match[1], 10);
  const minutes = match[2] || "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
};

const statusLabel: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
  cancelled: "Canceled",
};

function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "").toLowerCase();
  const label = (statusLabel[normalized] ?? status) || "—";
  const isCompleted = normalized === "completed";
  const isCanceled = normalized === "canceled" || normalized === "cancelled";
  const isInProgress = normalized === "in_progress";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
        (isCanceled
          ? "bg-destructive/10 text-destructive"
          : isCompleted
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : isInProgress
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "bg-muted text-muted-foreground")
      }
    >
      {label}
    </span>
  );
}

export const BookingsTable = ({ bookings, emptyMessage, onCancelBooking, onViewDetails, customActions }: BookingsTableProps) => {
  const showActions = Boolean(onCancelBooking || onViewDetails || customActions);
  const colCount = 7 + (showActions ? 1 : 0); // +1 for Status column

  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Schedule Details</TableHead>
            <TableHead>Assigned provider</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {showActions && <TableHead className="text-center">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center text-sm text-muted-foreground py-10">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>
                <p className="font-semibold">{formatDate(booking.date)}</p>
                <p className="text-sm text-muted-foreground">{formatTime(booking.time)}</p>
              </TableCell>
              <TableCell>
                <p className="font-semibold">{booking.provider?.trim() ? booking.provider : "Unassigned"}</p>
                {(!booking.provider?.trim()) && (
                  <p className="text-xs text-muted-foreground">Assigned by business</p>
                )}
              </TableCell>
              <TableCell>
                <p className="font-semibold">{booking.service}</p>
              </TableCell>
              <TableCell>
                <StatusBadge status={booking.status} />
              </TableCell>
              <TableCell>{booking.frequency?.trim() || "—"}</TableCell>
              <TableCell>
                <p>{booking.address}</p>
                {booking.contact ? (
                  <p className="text-xs text-muted-foreground">Contact: {booking.contact}</p>
                ) : null}
              </TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(booking.price)}</TableCell>
              {showActions && (
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {onViewDetails && (
                        <DropdownMenuItem onSelect={() => onViewDetails(booking)}>
                          View details
                        </DropdownMenuItem>
                      )}
                      {onCancelBooking && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(event) => {
                            event.preventDefault();
                            onCancelBooking(booking);
                          }}
                        >
                          Cancel booking
                        </DropdownMenuItem>
                      )}
                      {customActions && (onViewDetails || onCancelBooking) && customActions(booking).length > 0 && (
                        <DropdownMenuSeparator />
                      )}
                      {customActions?.(booking).map((action) => (
                        <DropdownMenuItem
                          key={action.label}
                          className={action.destructive ? "text-destructive focus:text-destructive" : undefined}
                          onSelect={(event) => {
                            event.preventDefault();
                            action.onSelect();
                          }}
                        >
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
