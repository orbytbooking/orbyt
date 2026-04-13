"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Booking, readStoredBookings } from "@/lib/customer-bookings";

/** Customer bookings from backend only (GET /api/customer/bookings). Scoped by ?business=. */
export const useCustomerBookings = () => {
  const searchParams = useSearchParams();
  const businessId = searchParams?.get("business") ?? null;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(() => Boolean(businessId));

  /** Dedupe by booking id + occurrence (recurring expands to many rows per id). */
  const dedupeById = useCallback((list: Booking[]): Booking[] => {
    if (!Array.isArray(list) || list.length === 0) return list;
    const seen = new Set<string>();
    return list.filter((b) => {
      const id = b?.id;
      if (!id) return false;
      const key = `${id}::${b.occurrenceDate ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const refreshBookings = useCallback(async () => {
    if (!businessId) {
      setBookings([]);
      return;
    }
    setLoading(true);
    const data = await readStoredBookings(businessId);
    setBookings(dedupeById(Array.isArray(data) ? data : []));
    setLoading(false);
  }, [businessId, dedupeById]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!businessId) {
        if (!cancelled) setBookings([]);
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) setLoading(true);
      const data = await readStoredBookings(businessId);
      if (!cancelled) {
        setBookings(dedupeById(Array.isArray(data) ? data : []));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, dedupeById]);

  const updateBookings = useCallback(
    (updater: (prev: Booking[]) => Booking[]) => {
      setBookings((prev) => updater(prev));
    },
    []
  );

  return { bookings, loading, updateBookings, refreshBookings };
};
