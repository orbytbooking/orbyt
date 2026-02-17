"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Booking, defaultBookings, persistBookings, readStoredBookings } from "@/lib/customer-bookings";

/** Customer bookings scoped by business (business isolation). Uses ?business= from URL. */
export const useCustomerBookings = () => {
  const searchParams = useSearchParams();
  const businessId = searchParams?.get("business") ?? null;
  const [bookings, setBookings] = useState<Booking[]>(() =>
    typeof window !== "undefined" ? readStoredBookings(businessId) : defaultBookings
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = readStoredBookings(businessId);
    setBookings(data);
    setLoading(false);
  }, [businessId]);

  const updateBookings = useCallback(
    (updater: (prev: Booking[]) => Booking[]) => {
      setBookings((prev) => {
        const next = updater(prev);
        persistBookings(next, businessId);
        return next;
      });
    },
    [businessId]
  );

  return { bookings, loading, updateBookings };
};
