"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Booking, readStoredBookings } from "@/lib/customer-bookings";

/** Customer bookings from backend only (GET /api/customer/bookings). Scoped by ?business=. */
export const useCustomerBookings = () => {
  const searchParams = useSearchParams();
  const businessId = searchParams?.get("business") ?? null;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  /** Dedupe by id (keep first) so duplicate keys never reach the UI (e.g. after assign + email refetch). */
  const dedupeById = useCallback((list: Booking[]): Booking[] => {
    if (!Array.isArray(list) || list.length === 0) return list;
    const seen = new Set<string>();
    return list.filter((b) => {
      const id = b?.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
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
      const data = await readStoredBookings(businessId);
      if (!cancelled) {
        setBookings(dedupeById(Array.isArray(data) ? data : []));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [businessId, dedupeById]);

  const updateBookings = useCallback(
    (updater: (prev: Booking[]) => Booking[]) => {
      setBookings((prev) => updater(prev));
    },
    []
  );

  return { bookings, loading, updateBookings, refreshBookings };
};
