import { createBooking, getCustomerBookings, updateBooking, deleteBooking, getBookingById, type BookingData } from './supabase/bookings';
import { useCustomerAccount } from '@/hooks/useCustomerAccount';

export const BOOKINGS_STORAGE_KEY = "customerBookings";
export const BOOK_AGAIN_STORAGE_KEY = "bookAgainBooking";

export type BookingStatus = "scheduled" | "completed" | "canceled";

export type Booking = {
  id: string;
  service: string;
  provider: string;
  frequency: string;
  date: string; // yyyy-mm-dd format
  time: string;
  status: BookingStatus;
  address: string;
  contact: string;
  notes: string;
  price: number;
  tipAmount?: number;
  tipUpdatedAt?: string;
  customization?: {
    frequency?: string;
    squareMeters?: string;
    bedroom?: string;
    bathroom?: string;
    extras?: string[];
    isPartialCleaning?: boolean;
    excludedAreas?: string[];
  };
};

export type StoredRebookPayload = {
  booking: Booking;
  storedAt: string;
};

export const defaultBookings: Booking[] = [
  {
    id: "CB-101",
    service: "Deep Cleaning",
    provider: "Marie Sanders",
    frequency: "Weekly",
    date: "2025-01-12",
    time: "09:00 AM",
    status: "completed",
    address: "123 Main St, Chicago, IL",
    contact: "(555) 123-4567",
    notes: "Focus on kitchen appliances.",
    price: 240,
    customization: {
      frequency: "Weekly",
      squareMeters: "1-1249 sqm",
      bedroom: "3 Bedrooms",
      bathroom: "2 Bathrooms",
      extras: ["Inside Oven"],
      isPartialCleaning: false,
      excludedAreas: [],
    },
  },
  {
    id: "CB-102",
    service: "Standard Cleaning",
    provider: "Jason Wu",
    frequency: "2x per week",
    date: "2025-01-19",
    time: "11:30 AM",
    status: "scheduled",
    address: "123 Main St, Chicago, IL",
    contact: "(555) 123-4567",
    notes: "Pet-friendly solutions.",
    price: 165,
    customization: {
      frequency: "2x per week",
      squareMeters: "21-30 sqm",
      bedroom: "2 Bedrooms",
      bathroom: "2 Bathrooms",
      extras: ["Laundry"],
      isPartialCleaning: false,
      excludedAreas: [],
    },
  },
  {
    id: "CB-099",
    service: "Move-Out Cleaning",
    provider: "Kyla Brooks",
    frequency: "One-time",
    date: "2025-01-25",
    time: "02:00 PM",
    status: "completed",
    address: "123 Main St, Chicago, IL",
    contact: "(555) 123-4567",
    notes: "Tenant inspection ready.",
    price: 320,
    customization: {
      frequency: "One-Time",
      squareMeters: "1-1249 sqm",
      bedroom: "4 Bedrooms",
      bathroom: "3 Bathrooms",
      extras: ["Inside Cabinets"],
      isPartialCleaning: false,
      excludedAreas: [],
    },
  },
  {
    id: "CB-097",
    service: "Office Refresh",
    provider: "Lee Carter",
    frequency: "Monthly",
    date: "2025-01-05",
    time: "01:00 PM",
    status: "canceled",
    address: "22 Business Plaza, Chicago, IL",
    contact: "(555) 222-7865",
    notes: "Canceled per customer request.",
    price: 450,
    customization: {
      frequency: "Monthly",
      squareMeters: "41-50 sqm",
      bedroom: "5 Bedrooms",
      bathroom: "4 Bathrooms",
      extras: ["Windows"],
      isPartialCleaning: true,
      excludedAreas: ["Half Bathroom"],
    },
  },
];

const defaultMetaById = Object.fromEntries(
  defaultBookings.map((booking) => [booking.id, {
    price: booking.price,
    provider: booking.provider,
    frequency: booking.frequency,
  }]),
);

const defaultCustomizationById = Object.fromEntries(
  defaultBookings.map((booking) => [booking.id, booking.customization ?? {}]),
);

const normalizeBooking = (booking: Booking | Partial<Booking>) => {
  const defaults =
    defaultMetaById[booking.id as keyof typeof defaultMetaById] ?? { price: 0, provider: "", frequency: "" };
  const provider = (booking.provider ?? defaults.provider ?? "").trim();
  const frequency = (booking.frequency ?? defaults.frequency ?? "").trim();
  const customizationDefaults = defaultCustomizationById[booking.id as keyof typeof defaultCustomizationById] ?? {};
  const existingCustomization = booking.customization ?? {};

  const normalizeExtrasArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    }
    if (typeof value === "string") {
      if (!value.trim()) return [];
      return value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    }
    return [];
  };

  return {
    ...booking,
    provider: provider || defaults.provider || "",
    frequency: frequency || defaults.frequency || "One-time",
    price:
      typeof booking.price === "number" && !Number.isNaN(booking.price)
        ? booking.price
        : defaults.price ?? 0,
    customization: {
      frequency:
        existingCustomization.frequency ??
        booking.frequency ??
        customizationDefaults.frequency ??
        defaults.frequency ??
        "One-time",
      squareMeters: existingCustomization.squareMeters ?? customizationDefaults.squareMeters ?? "",
      bedroom: existingCustomization.bedroom ?? customizationDefaults.bedroom ?? "",
      bathroom: existingCustomization.bathroom ?? customizationDefaults.bathroom ?? "",
      extras:
        normalizeExtrasArray((existingCustomization as any).extras).length
          ? normalizeExtrasArray((existingCustomization as any).extras)
          : normalizeExtrasArray((customizationDefaults as any).extras).length
          ? normalizeExtrasArray((customizationDefaults as any).extras)
          : ["None"],
      isPartialCleaning:
        existingCustomization.isPartialCleaning ?? customizationDefaults.isPartialCleaning ?? false,
      excludedAreas:
        Array.isArray(existingCustomization.excludedAreas)
          ? existingCustomization.excludedAreas
          : customizationDefaults.excludedAreas ?? [],
    },
  } as Booking;
};

export const persistBookings = async (bookings: Booking[], businessId?: string | null) => {
  // This function is deprecated - bookings are now stored in the database
  console.warn('persistBookings is deprecated - bookings are now stored in the database');
};

/**
 * Read bookings from database. When businessId is provided, uses business-scoped query
 * so each business sees only its own bookings (business isolation).
 */
export const readStoredBookings = async (businessId?: string | null): Promise<Booking[]> => {
  // For now, return empty array - will be implemented with proper customer context
  console.warn('readStoredBookings needs customer context - returning empty array');
  return [];
};

export const persistBookAgainPayload = (booking: Booking) => {
  if (typeof window === "undefined") return;
  const payload: StoredRebookPayload = {
    booking: normalizeBooking(booking),
    storedAt: new Date().toISOString(),
  };
  localStorage.setItem(BOOK_AGAIN_STORAGE_KEY, JSON.stringify(payload));
};

export const readStoredBookAgainPayload = (): StoredRebookPayload | null => {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(BOOK_AGAIN_STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as StoredRebookPayload;
    if (parsed?.booking) {
      return {
        booking: normalizeBooking(parsed.booking),
        storedAt: parsed.storedAt ?? new Date().toISOString(),
      };
    }
  } catch (error) {
    console.warn("Failed to parse stored rebook payload", error);
  }

  localStorage.removeItem(BOOK_AGAIN_STORAGE_KEY);
  return null;
};

export const clearStoredBookAgainPayload = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BOOK_AGAIN_STORAGE_KEY);
};
