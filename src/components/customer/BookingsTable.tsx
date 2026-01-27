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
  onEditBooking?: (booking: Booking) => void;
  customActions?: (booking: Booking) => CustomAction[];
};

const formatDate = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
};

export const BookingsTable = ({ bookings, emptyMessage, onCancelBooking, onEditBooking, customActions }: BookingsTableProps) => {
  const showActions = Boolean(onCancelBooking || onEditBooking || customActions);

  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Schedule Details</TableHead>
            <TableHead>Assigned provider</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {showActions && <TableHead className="text-center">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 && (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="text-center text-sm text-muted-foreground py-10">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>
                <p className="font-semibold">{formatDate(booking.date)}</p>
                <p className="text-sm text-muted-foreground">{booking.time}</p>
              </TableCell>
              <TableCell>
                <p className="font-semibold">{booking.provider?.trim() || ""}</p>
              </TableCell>
              <TableCell>
                <p className="font-semibold">{booking.service}</p>
                <p className="text-xs text-muted-foreground">Status: {booking.status}</p>
              </TableCell>
              <TableCell>{booking.frequency}</TableCell>
              <TableCell>
                <p>{booking.address}</p>
                <p className="text-xs text-muted-foreground">{booking.contact}</p>
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
                      {onEditBooking && (
                        <DropdownMenuItem onSelect={() => onEditBooking(booking)}>
                          Edit / Reschedule
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
                      {customActions && (onEditBooking || onCancelBooking) && customActions(booking).length > 0 && (
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
