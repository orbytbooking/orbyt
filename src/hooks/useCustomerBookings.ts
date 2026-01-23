"use client";

import { useCallback, useEffect, useState } from "react";
import { Booking, defaultBookings, persistBookings, readStoredBookings } from "@/lib/customer-bookings";

export const useCustomerBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>(defaultBookings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = readStoredBookings();
    setBookings(data);
    setLoading(false);
  }, []);

  const updateBookings = useCallback((updater: (prev: Booking[]) => Booking[]) => {
    setBookings((prev) => {
      const next = updater(prev);
      persistBookings(next);
      return next;
    });
  }, []);

  return { bookings, loading, updateBookings };
};
