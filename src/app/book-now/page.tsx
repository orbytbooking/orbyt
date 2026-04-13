  "use client";

import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneField, PHONE_FIELD_HELPER_TEXT } from "@/components/ui/phone-field";
import { isValidPhoneNumber } from "react-phone-number-input";
import { guessDefaultCountry } from "@/lib/phoneDefaultCountry";
import { normalizeStoredPhoneToE164 } from "@/lib/phoneE164";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarIcon, Clock, Loader2, CheckCircle, CheckCircle2, ArrowRight, CreditCard, Wallet, Lock, ArrowLeft, Home, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import FrequencyAwareServiceCard, { ServiceCustomization } from "@/components/FrequencyAwareServiceCard";
import { Booking, fetchBookingById } from "@/lib/customer-bookings";
import {
  formatFrequencyRepeatsForDisplay,
  normalizeFrequencyLabelForMatch,
} from "@/lib/industryFrequencyRepeats";
import {
  computeCustomerBookingTotals,
  computeEffectiveServiceAndExtras,
  computeFrequencyDiscountAmount,
  computePartialCleaningDiscount,
  type CustomerFrequencyMeta,
} from "@/lib/customerFrequencyPricing";
import {
  buildCustomerAvailableVariables,
  pricingParamAppliesToSelection,
  type PricingParamRow,
} from "@/lib/pricingParameterVisibility";
import {
  frequencyDepOptionNamesForCategory,
  getFrequencyDependencies,
  type FrequencyDependencies,
} from "@/lib/frequencyFilter";
import {
  getServiceCategoryCustomerDisplayName,
  isIndustryExtraDisplayVisibleOnBookingSurface,
  isServiceCategoryVisibleOnPublicBooking,
} from "@/lib/form1CustomerBooking";
import { estimateBookingDurationMinutes } from "@/lib/bookingEstimatedDurationMinutes";
import {
  minimumTimeCustomerMessage,
  minimumTimeRequiredMinutes,
  type ServiceCategoryMinimumTime,
} from "@/lib/serviceCategoryMinimumTime";
import { hourlyCustomTimeTotalMinutes, hourlyExtrasBillableSubtotal } from "@/lib/hourlyServiceBookingDuration";
import { resolveQtyBasedExtraLine } from "@/lib/extraQtyPricing";
import {
  getAllowedWeekdaysForFrequencyRepeatsEvery,
  normalizeFrequencyRepeatKey,
} from "@/lib/frequencyRepeatWeekdayCalendar";
import { serializePricingSummaryForCustomization } from "@/lib/customerBookingPricingDisplay";
import {
  getMarketingCouponGateFailure,
  shouldEnforceMarketingCouponLocationSubset,
} from "@/lib/marketingCouponGate";
import { couponRequiresCustomerEmailForScope } from "@/lib/marketingCouponCustomerScope";
import { getTodayLocalDate } from "@/lib/date-utils";
import {
  popupDisplayAppliesToSurface,
  type BookingPopupSurface,
} from "@/lib/frequencyPopupDisplay";
import styles from "./BookingPage.module.css";
import { useCustomerAccount } from "@/hooks/useCustomerAccount";
import { getSupabaseCustomerClient } from "@/lib/supabaseCustomerClient";
import { useWebsiteConfig } from "@/hooks/useWebsiteConfig";

function bookNowFrequencyRowsToState(rows: any[]) {
  const names = rows.map((f: any) => f.name || f.occurrence_time).filter(Boolean);
  const metaMap: Record<string, CustomerFrequencyMeta> = {};
  for (const f of rows) {
    const n = (f?.name || f?.occurrence_time) as string | undefined;
    if (!n) continue;
    metaMap[String(n).trim()] = {
      frequency_repeats: f.frequency_repeats != null ? String(f.frequency_repeats).trim() : undefined,
      occurrence_time: f.occurrence_time,
      discount:
        f.discount != null && !Number.isNaN(Number(f.discount)) ? Number(f.discount) : undefined,
      discount_type: f.discount_type,
      frequency_discount: f.frequency_discount,
      shorter_job_length: f.shorter_job_length,
      shorter_job_length_by: f.shorter_job_length_by,
      exclude_first_appointment: Boolean(f.exclude_first_appointment),
      enable_popup: Boolean(f.enable_popup),
      popup_content: f.popup_content != null ? String(f.popup_content) : null,
      popup_display: f.popup_display != null ? String(f.popup_display) : null,
    };
  }
  const defaultRow = rows.find((f: any) => f.is_default === true);
  const defaultName = defaultRow ? String(defaultRow.name || defaultRow.occurrence_time || "").trim() : "";
  return { names, metaMap, defaultName };
}

const optionalEmailSchema = z.union([z.string().email("Please enter a valid email"), z.literal("")]);
const phoneE164Required = z
  .string()
  .min(1, "Phone number is required")
  .refine((v) => isValidPhoneNumber(v), "Please enter a valid phone number");

const phoneE164Optional = z.union([
  z.literal(""),
  z.string().refine((v) => isValidPhoneNumber(v), "Please enter a valid phone number"),
]);

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  secondaryEmail: optionalEmailSchema,
  phone: phoneE164Required,
  secondaryPhone: phoneE164Optional,
  addressPreference: z.enum(["existing", "new"]),
  address: z.string().min(5, "Please enter a valid address"),
  aptNo: z.union([z.string().max(20, "Apt. No. should be 20 characters or less"), z.literal("")]),
  zipCode: z.string().max(30).optional().default(""),
  service: z.string().min(1, "Please select a service"),
  date: z.date({
    required_error: "A date is required.",
  }),
  time: z.string().min(1, "Please select a time"),
  provider: z.string().optional(),
  notes: z.string().optional(),
  reminderOptIn: z.boolean().default(false),
  keyAccess: z.object({
  primary_option: z.enum(["someone_home", "hide_keys"]).default("someone_home"),
  keep_key: z.boolean().default(false),
}).default({ primary_option: "someone_home", keep_key: false }),
  customerNoteForProvider: z.string().optional(),
  couponCodeTab: z.enum(["coupon-code", "gift-card"]).default("coupon-code"),
  couponCode: z.string().optional(),
  couponType: z.enum(["coupon-code", "amount", "percent"]).default("coupon-code"),
  giftCardCode: z.string().optional(),
  // Allow empty so "Confirm Booking" works when admin hasn't configured all variable options
  customization: z.object({
    frequency: z.string().optional().default(""),
    squareMeters: z.string().optional().default(""),
    bedroom: z.string().optional().default(""),
    bathroom: z.string().optional().default(""),
    extras: z.string().optional(),
  }).default({ frequency: "", squareMeters: "", bedroom: "", bathroom: "" }),
});

type StoredAddress = {
  address: string;
  aptNo?: string;
  zipCode?: string;
};

// Payment form schema for online payment
const paymentSchema = z.object({
  cardNumber: z.string().min(16, "Card number must be 16 digits").max(19),
  cardName: z.string().min(2, "Name on card is required"),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, "Invalid expiry date (MM/YY)"),
  cvv: z.string().min(3, "CVV must be 3 digits").max(4),
});

type PaymentMethod = "cash" | "online" | null;
type BookingStep = "category" | "details" | "payment" | "success";
type ServiceCategory = string | null;

type PricingTier = {
  id: number;
  name: string;
  price: number;
  time: string;
  display: string;
  serviceCategory: string;
  frequency: string;
  /** When set, this tier applies only to this service category (name or id from industry form) */
  serviceCategoryFilter?: string | null;
};

type AppliedCoupon = {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
};

const toIndustryKey = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const industryDetails: Record<string, { description: string; Icon: LucideIcon }> = {
  "home-cleaning": {
    description: "Professional cleaning services for your home including standard, deep, and move in/out cleaning.",
    Icon: Home,
  },
  "carpet-cleaning": {
    description: "Specialized carpet services including deep treatments, stain removal, and move in/out care.",
    Icon: Building2,
  },
};

const servicesByIndustry: Record<string, {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  image: string;
  features?: string[];
}[]> = {
  "home-cleaning": [
    { 
      id: "standard", 
      name: "Standard Cleaning", 
      description: "A regular cleaning service to keep your home neat and comfortable. Includes dusting, mopping, and surface cleaning to maintain a fresh living space.",
      price: 120, 
      duration: "2-3 hours",
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
      features: ["Dusting & surfaces", "Bathroom refresh", "Light organizing"],
    },
    { 
      id: "deep", 
      name: "Deep Cleaning", 
      description: "An intensive cleaning that reaches hidden dirt and grime. Covers floors, corners, surfaces, and areas that are often overlooked for a thoroughly refreshed home.",
      price: 200, 
      duration: "4-6 hours",
      image: "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=400&h=300&fit=crop",
      features: ["Everything in standard", "Appliance cleaning", "Baseboard cleaning", "Window cleaning"]
    },
    { 
      id: "move", 
      name: "Move In/Out Cleaning", 
      description: "A comprehensive cleaning service to prepare your home for a fresh start. Every room and surface is cleaned to ensure the space is spotless and ready for moving in or out.",
      price: 250, 
      duration: "6-8 hours",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop",
      features: ["Whole-home detail", "Inside appliance cleaning", "Cabinet wipe-down"],
    },
  ],
  "carpet-cleaning": [
    { 
      id: "standard-carpet", 
      name: "Standard Cleaning", 
      description: "Basic carpet cleaning for regular maintenance",
      price: 120, 
      duration: "2-3 hours",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
      features: ["Vacuum cleaning", "Spot treatment", "Deodorizing", "Quick dry"]
    },
    { 
      id: "deep-carpet", 
      name: "Deep Cleaning", 
      description: "Intensive carpet cleaning with steam",
      price: 200, 
      duration: "3-4 hours",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
      features: ["Steam cleaning", "Deep stain removal", "Sanitization", "Deodorizing"]
    },
    { 
      id: "move-carpet", 
      name: "Move In/Out Cleaning", 
      description: "Complete carpet restoration for moving",
      price: 250, 
      duration: "4-6 hours",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
      features: ["Full steam cleaning", "Stain protection", "Upholstery cleaning", "Odor elimination"]
    },
  ],
};

const FREQUENCY_OPTIONS = ["One-Time", "2x per week", "Weekly", "Every Other Week", "Monthly"] as const;
const DEFAULT_TIME_SLOTS = ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM"] as const;
const AREA_SIZE_OPTIONS = ["10-20 sqm", "21-30 sqm", "31-40 sqm", "41-50 sqm", "51+ sqm"] as const;
const BEDROOM_OPTIONS = ["1 Bedroom", "2 Bedrooms", "3 Bedrooms", "4 Bedrooms", "5 Bedrooms", "6 Bedrooms"] as const;
const BATHROOM_OPTIONS = ["1 Bathroom", "2 Bathrooms", "3 Bathrooms", "4 Bathrooms", "5 Bathrooms", "6 Bathrooms"] as const;
const EXTRAS_OPTIONS = ["None", "Inside Fridge", "Inside Oven", "Inside Cabinets", "Laundry", "Windows"] as const;

const normalizeServiceName = (label: string) =>
  label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const tokenizeServiceName = (label: string) => {
  const matches = label
    .toLowerCase()
    .replace(/&/g, "and")
    .match(/[a-z0-9]+/g);
  return matches ?? [];
};

const serviceLabelsMatch = (serviceLabel: string, bookingLabel: string) => {
  const normalizedService = normalizeServiceName(serviceLabel);
  const normalizedBooking = normalizeServiceName(bookingLabel);
  if (normalizedService && normalizedService === normalizedBooking) {
    return true;
  }

  const serviceTokens = tokenizeServiceName(serviceLabel);
  const bookingTokens = tokenizeServiceName(bookingLabel);
  if (bookingTokens.length === 0 || serviceTokens.length === 0) {
    return false;
  }

  const serviceTokenSet = new Set(serviceTokens);
  const bookingSubset = bookingTokens.every((token) => serviceTokenSet.has(token));
  if (bookingSubset) {
    return true;
  }

  const bookingTokenSet = new Set(bookingTokens);
  return serviceTokens.every((token) => bookingTokenSet.has(token));
};

const findServiceMatch = (serviceName: string) => {
  for (const [key, services] of Object.entries(servicesByIndustry)) {
    const match = services.find((service) => serviceLabelsMatch(service.name, serviceName));
    if (match) {
      return { categoryKey: key, service: match } as const;
    }
  }
  return null;
};

/** Admin service categories (same shape as book-now state) for rebook resolution. */
type RebookServiceCategoryCard = {
  id: string;
  name: string;
  /** Set from Form 1; omit on legacy static catalog rows (falls back to `name`). */
  customerDisplayName?: string;
  description: string;
  price: number;
  duration: string;
  image: string;
  features: string[];
  raw?: unknown;
};

async function fetchServiceCategoriesMappedForRebook(
  businessId: string,
  industryId: string,
): Promise<RebookServiceCategoryCard[]> {
  const response = await fetch(
    `/api/service-categories?industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(businessId)}`,
  );
  if (!response.ok) return [];
  const data = await response.json();
  const categories = (data.serviceCategories ?? []) as Array<Record<string, unknown>>;
  return categories
    .filter((cat) => isServiceCategoryVisibleOnPublicBooking(cat.display as string | undefined))
    .map((cat: Record<string, unknown>) => {
      const sct = cat.service_category_time as { hours?: string; minutes?: string; enabled?: boolean } | undefined;
      const scp = cat.service_category_price as { enabled?: boolean; price?: string | number } | undefined;
      const hours = sct?.hours ?? "0";
      const minutes = sct?.minutes ?? "0";
      const duration =
        sct?.enabled ? `${hours}h ${minutes}m`.replace(/^0h /, "").replace(/ 0m$/, "m") : "—";
      const price =
        scp?.enabled && scp?.price ? parseFloat(String(scp.price)) || 0 : 0;
      const name = String(cat.name ?? "");
      return {
        id: String(cat.id ?? ""),
        name,
        customerDisplayName: getServiceCategoryCustomerDisplayName({
          name,
          different_on_customer_end: cat.different_on_customer_end as boolean | null | undefined,
          customer_end_name: cat.customer_end_name as string | null | undefined,
        }),
        description: (cat.description as string) || `Professional ${name} service.`,
        price,
        duration,
        image:
          (cat.icon as string) ||
          "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
        features: [] as string[],
        raw: cat,
      };
    })
    .filter((c) => c.id && c.name);
}

async function resolveRebookServiceAcrossIndustries(
  businessId: string,
  industryOptions: Array<{ id?: string; key: string; label: string }>,
  serviceName: string,
): Promise<{ industryKey: string; service: RebookServiceCategoryCard } | null> {
  const name = String(serviceName ?? "").trim();
  if (!name) return null;
  for (const ind of industryOptions) {
    const industryId = ind.id?.trim();
    if (!industryId) continue;
    const mapped = await fetchServiceCategoriesMappedForRebook(businessId, industryId);
    const hit = mapped.find((svc) => serviceLabelsMatch(svc.name, name));
    if (hit) {
      return { industryKey: ind.key, service: hit };
    }
  }
  return null;
}

function extractZipFromAddressForRebook(address: string): string {
  const m = String(address ?? "").match(/\b(\d{5})(-\d{4})?\b/);
  if (!m) return "";
  return m[1] + (m[2] ?? "");
}

const normalizeSelectValue = (value: string | undefined, options: readonly string[]) => {
  if (!value) return "";
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return options.find((option) => option.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized) ?? "";
};

const toFormCustomization = (customization: ServiceCustomization | null) => ({
  frequency: customization?.frequency ?? "",
  squareMeters: customization?.squareMeters ?? "",
  bedroom: customization?.bedroom ?? "",
  bathroom: customization?.bathroom ?? "",
  extras: (customization?.extras ?? []).map(extra => 
    typeof extra === 'string' ? extra : `${extra.name}${extra.quantity > 1 ? ` (${extra.quantity})` : ''}`
  ).join(", "),
});

// Helper function to normalize extras array from string format to object format
const normalizeExtrasArray = (extras: string[] | { name: string; quantity: number }[] | undefined | null): { name: string; quantity: number }[] => {
  if (!extras) return [];
  
  return extras.map(extra => {
    if (typeof extra === 'string') {
      // Parse string format like "Inside Fridge (2)" to object format
      const match = extra.match(/^(.+?)\s*\((\d+)\)$/);
      if (match) {
        return { name: match[1].trim(), quantity: parseInt(match[2], 10) };
      }
      return { name: extra, quantity: 1 };
    }
    return extra;
  });
};

// Helper function to format extras for storage (convert object array to string array)
const formatExtrasForStorage = (extras: { name: string; quantity: number }[]): string[] => {
  return extras.map(extra => 
    extra.quantity > 1 ? `${extra.name} (${extra.quantity})` : extra.name
  );
};

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Plural weekday list for calendar hint (e.g. "Mondays and Fridays"). */
function bookingCalendarWeekdayPhrase(allowed: number[]): string {
  const sorted = [...new Set(allowed)].sort((a, b) => a - b);
  const labels = sorted.map((d) => WEEKDAY_NAMES[d] ?? "");
  if (labels.length === 0) return "";
  const plural = (name: string) => `${name}s`;
  if (labels.length === 1) return plural(labels[0]);
  if (labels.length === 2) return `${plural(labels[0])} and ${plural(labels[1])}`;
  return `${labels.slice(0, -1).map(plural).join(", ")}, and ${plural(labels[labels.length - 1])}`;
}

/** Match selected frequency label to `frequencyMetaByName` (exact or normalized), so we read the same `frequency_repeats` as admin "Frequency repeats every". */
function frequencyMetaForCalendar(
  freqLabel: string,
  metaByName: Record<string, CustomerFrequencyMeta>,
): CustomerFrequencyMeta | undefined {
  const t = freqLabel.trim();
  if (!t) return undefined;
  if (metaByName[t]) return metaByName[t];
  const norm = normalizeFrequencyLabelForMatch(t);
  for (const [k, v] of Object.entries(metaByName)) {
    if (normalizeFrequencyLabelForMatch(k) === norm) return v;
  }
  return undefined;
}

function BookingPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");
  const editOnlyParam = searchParams.get("editOnly");
  const limitedEditMode = Boolean(bookingIdParam && editOnlyParam === "details-payment");
  const [businessName, setBusinessName] = useState<string>('');
  /** From `GET /api/businesses` (`logo_url`) — fallback when website builder has no logo. */
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string>('');
  const [businessId, setBusinessId] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<BookingStep>("category");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [serviceCustomization, setServiceCustomization] = useState<ServiceCustomization | null>(null);
  const [bookingData, setBookingData] = useState<z.infer<typeof formSchema> | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [cardCustomizations, setCardCustomizations] = useState<Record<string, ServiceCustomization>>({});
  const [industryOptions, setIndustryOptions] = useState<{ label: string; key: string; id?: string }[]>([]);
  const [industries, setIndustries] = useState<Array<{ id: string; name: string }>>([]);
  const [serviceCategories, setServiceCategories] = useState<{
    id: string;
    name: string;
    customerDisplayName?: string;
    description: string;
    price: number;
    duration: string;
    image: string;
    features?: string[];
    raw?: any;
  }[]>([]);
  const [serviceCategoriesLoading, setServiceCategoriesLoading] = useState(false);
  const [storedAddress, setStoredAddress] = useState<StoredAddress | null>(null);
  const { customerName, customerEmail, customerPhone, customerAddress, accountLoading } = useCustomerAccount(false);
  const { config } = useWebsiteConfig();

  const bookNowNavLogo = useMemo(() => {
    // Match Website Builder / customer portal: header "Header Logo" wins over legacy branding.logo.
    const header = (
      config?.sections?.find((s) => s.type === "header")?.data as { logo?: string } | undefined
    )?.logo?.trim();
    const fromBranding = config?.branding?.logo?.trim();
    const fromBusiness = businessLogoUrl?.trim();
    return header || fromBranding || fromBusiness || "/images/orbit.png";
  }, [businessLogoUrl, config]);

  const bookNowNavigationProps = useMemo(() => {
    const headerSection = config?.sections?.find((s) => s.type === "header")?.data as
      | {
          companyName?: string;
          logo?: string;
          showNavigation?: boolean;
          navigationLinks?: Array<{ text: string; url: string }>;
        }
      | undefined;
    const fromHeaderName = headerSection?.companyName?.trim() ?? "";
    const fromBrandingName = config?.branding?.companyName?.trim() ?? "";
    const fromBusinessRecord = businessName.trim();
    const companyName =
      fromHeaderName || fromBrandingName || fromBusinessRecord || "Cleaning Service";
    const logo = bookNowNavLogo;
    return {
      branding: {
        ...(config?.branding ?? {}),
        companyName,
        logo,
      },
      headerData: {
        showNavigation: true,
        navigationLinks: [] as Array<{ text: string; url: string }>,
        ...headerSection,
        companyName,
        logo,
      },
    };
  }, [businessName, config, bookNowNavLogo]);

  /** Payment provider for current business (stripe | authorize_net) - used for payment step labels */
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "authorize_net">("stripe");
  const [availableExtras, setAvailableExtras] = useState<any[]>([]);
  /** Full industry_pricing_parameter rows; dropdowns are derived with admin-matching filters */
  const [pricingParametersFull, setPricingParametersFull] = useState<PricingParamRow[]>([]);
  /** Manage Variables rows — used for customer-facing labels (different on customer end). */
  const [industryPricingVariables, setIndustryPricingVariables] = useState<
    Array<{
      category: string;
      name: string;
      different_on_customer_end: boolean;
      customer_end_name: string | null;
      show_explanation_icon_on_form: boolean;
      explanation_tooltip_text: string | null;
      enable_popup_on_selection: boolean;
      popup_content: string;
      popup_display: string;
      display: string;
    }>
  >([]);
  const [frequencyOptions, setFrequencyOptions] = useState<string[]>([]);
  /** Per-label industry_frequency fields (repeats pattern + admin discount / recurring rules). */
  const [frequencyMetaByName, setFrequencyMetaByName] = useState<Record<string, CustomerFrequencyMeta>>({});
  const [bookingHtmlPopup, setBookingHtmlPopup] = useState<{ title: string; html: string } | null>(null);
  const [bookingPopupSurface, setBookingPopupSurface] = useState<BookingPopupSurface>("customer_public_frontend");
  /** Same role as admin AddBookingForm `newBooking.frequency` — drives Form 1 dependency rules (service list, extras, etc.). */
  const [bookingFrequencyForFilters, setBookingFrequencyForFilters] = useState("");
  const [serviceListFrequencyDeps, setServiceListFrequencyDeps] =
    useState<FrequencyDependencies | null>(null);
  /** Matches confirmed service + frequency for pricing tiers, subtotals, and duration. */
  const [pricingFrequencyDeps, setPricingFrequencyDeps] =
    useState<FrequencyDependencies | null>(null);
  const [excludeParametersList, setExcludeParametersList] = useState<
    Array<{ name: string; price?: number; qty_based?: boolean; time_minutes?: number }>
  >([]);
  const [dynamicTimeSlots, setDynamicTimeSlots] = useState<string[]>([]);
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [schedulingType, setSchedulingType] = useState<string>("accepted_automatically");
  /** Mirrors admin add-booking: send store default pay in the POST body (same keys as AddBookingForm). */
  const [storeDefaultProviderWage, setStoreDefaultProviderWage] = useState<{
    wage: string;
    type: "percentage" | "fixed" | "hourly";
  } | null>(null);

  const businessIdFromUrl = searchParams.get("business") ?? "";

  useEffect(() => {
    if (!businessIdFromUrl) {
      setStoreDefaultProviderWage(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/store-options?businessId=${encodeURIComponent(businessIdFromUrl)}`,
          { headers: { "x-business-id": businessIdFromUrl } }
        );
        const data = await res.json();
        if (cancelled || !res.ok || !data.options) return;
        const w = data.options.default_provider_wage;
        const t = data.options.default_provider_wage_type;
        if (w != null && Number(w) > 0 && (t === "percentage" || t === "fixed" || t === "hourly")) {
          setStoreDefaultProviderWage({ wage: String(w), type: t });
        } else {
          setStoreDefaultProviderWage(null);
        }
      } catch {
        if (!cancelled) setStoreDefaultProviderWage(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessIdFromUrl]);

  useEffect(() => {
    const supabase = getSupabaseCustomerClient();
    const sync = () => {
      supabase.auth.getSession().then(({ data }) => {
        setBookingPopupSurface(data.session?.access_token ? "customer_backend" : "customer_public_frontend");
      });
    };
    sync();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      sync();
    });
    return () => subscription.unsubscribe();
  }, []);

  // Ref to store the total shown in the booking summary so we send that exact amount when saving (avoids stale closure giving 0)
  const summaryTotalRef = useRef<number>(0);
  const paymentConfirmSentRef = useRef(false);
  const [cancellationPolicyDisclaimer, setCancellationPolicyDisclaimer] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const getCouponDiscountAmount = useCallback((subtotal: number) => {
    if (!appliedCoupon || subtotal <= 0) return 0;
    if (appliedCoupon.discountType === "percentage") {
      return Math.max(0, Math.min(subtotal, (subtotal * appliedCoupon.discountValue) / 100));
    }
    return Math.max(0, Math.min(subtotal, appliedCoupon.discountValue));
  }, [appliedCoupon]);

  const isAccountLocked = !accountLoading && Boolean(customerName || customerEmail);
  const [prefilledBookingId, setPrefilledBookingId] = useState<string | null>(null);
  /** Loaded from API; customization applied in a second step when pricing tiers exist. */
  const [rebookSourceBooking, setRebookSourceBooking] = useState<Booking | null>(null);
  const rebookWaitStartedAtRef = useRef<number | null>(null);
  /** Avoid infinite retries when rebook fetch or service match fails for this URL. */
  const rebookGiveUpRef = useRef<string | null>(null);
  const [recentBookingId, setRecentBookingId] = useState<string | null>(null);
  const [rescheduleMessageLimitedEdit, setRescheduleMessageLimitedEdit] = useState<string | null>(null);

  const selectedIndustry = useMemo(
    () => industryOptions.find((option) => option.key === selectedCategory) ?? null,
    [industryOptions, selectedCategory],
  );

  const selectedIndustryLabel = selectedIndustry?.label ?? "";
  const selectedIndustryId = selectedIndustry?.id ?? "";

  const selectedFrequencyTrim = serviceCustomization?.frequency?.trim() ?? "";

  useEffect(() => {
    if (!selectedIndustryId || !businessIdFromUrl.trim() || !selectedFrequencyTrim.trim()) {
      setPricingFrequencyDeps(null);
      return;
    }
    let cancelled = false;
    getFrequencyDependencies(selectedIndustryId, selectedFrequencyTrim, {
      businessId: businessIdFromUrl,
    })
      .then((deps) => {
        if (!cancelled) setPricingFrequencyDeps(deps);
      })
      .catch(() => {
        if (!cancelled) setPricingFrequencyDeps(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIndustryId, businessIdFromUrl, selectedFrequencyTrim]);

  const allPricingParams = useMemo(
    () =>
      pricingParametersFull.map((p) => ({
        variable_category: String(p.variable_category ?? "").trim(),
        name: String(p.name ?? ""),
        price: typeof p.price === "number" ? p.price : Number(p.price) || 0,
        service_category:
          p.service_category != null && String(p.service_category).trim() !== ""
            ? String(p.service_category).trim()
            : null,
        frequency: String(p.frequency ?? ""),
        show_based_on_frequency: Boolean(p.show_based_on_frequency),
        show_based_on_service_category: Boolean(p.show_based_on_service_category),
      })),
    [pricingParametersFull],
  );

  const pricingRows = useMemo(() => {
    if (!pricingParametersFull.length || !selectedService) return [] as PricingTier[];
    const svcName = String(selectedService.name ?? "");
    const paramsForSelection = pricingParametersFull.filter((p) =>
      pricingParamAppliesToSelection(
        {
          show_based_on_frequency: p.show_based_on_frequency,
          frequency: p.frequency,
          show_based_on_service_category: p.show_based_on_service_category,
          service_category: p.service_category,
        },
        selectedFrequencyTrim,
        svcName,
      ),
    );
    const categoryKeys = Object.keys(
      buildCustomerAvailableVariables(
        pricingParametersFull,
        selectedService,
        selectedFrequencyTrim,
        pricingFrequencyDeps,
      ),
    );
    const areaLikeKey = categoryKeys.find((k) => /sqft|area|square|meter|size/i.test(String(k)));
    const tierCategoryKey = areaLikeKey ?? categoryKeys[0];
    const tierParams = tierCategoryKey
      ? paramsForSelection
          .filter((p) => String(p.variable_category ?? "").trim() === tierCategoryKey)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      : [];
    return tierParams.map((p: PricingParamRow, i: number) => ({
      id: i + 1,
      name: String(p.name ?? ""),
      price: typeof p.price === "number" ? p.price : Number(p.price) || 0,
      time: p.time_minutes != null ? `${p.time_minutes} min` : "",
      display: String(p.display ?? ""),
      serviceCategory: selectedIndustryLabel,
      frequency: String(p.frequency ?? ""),
      serviceCategoryFilter:
        p.service_category != null && String(p.service_category).trim() !== ""
          ? String(p.service_category).trim()
          : null,
    }));
  }, [
    pricingParametersFull,
    selectedService,
    selectedFrequencyTrim,
    selectedIndustryLabel,
    pricingFrequencyDeps,
  ]);

  useEffect(() => {
    const fetchIndustries = async () => {
      if (typeof window === "undefined") return;

      // Use business ID from URL param only (no localStorage)
      const currentBusinessId = searchParams.get("business");

      if (!currentBusinessId) {
        setIndustries([]);
        setIndustryOptions([]);
        return;
      }

      try {
        const response = await fetch(`/api/industries?business_id=${currentBusinessId}`);
        const data = await response.json();

        if (!response.ok) {
          console.error("Failed to fetch industries:", data.error);
          setIndustries([]);
          setIndustryOptions([]);
          return;
        }

        // Display industries added in Admin > Settings > Industries (e.g. Home Cleaning)
        if (data.industries && Array.isArray(data.industries) && data.industries.length > 0) {
          setIndustries(data.industries);
          const industryOptionsWithIds = data.industries.map((ind: any) => ({
            label: ind.name,
            key: toIndustryKey(ind.name) || `industry-${ind.id}`,
            id: ind.id,
          }));
          setIndustryOptions(industryOptionsWithIds);
        } else {
          setIndustries([]);
          setIndustryOptions([]);
        }
      } catch (error) {
        console.error("Error fetching industries:", error);
        setIndustries([]);
        setIndustryOptions([]);
      }
    };

    fetchIndustries();

    const handleIndustryChange = () => fetchIndustries();
    window.addEventListener("industryChanged", handleIndustryChange);
    const interval = window.setInterval(fetchIndustries, 5000);

    return () => {
      window.removeEventListener("industryChanged", handleIndustryChange);
      window.clearInterval(interval);
    };
  }, [searchParams]);

  // Fetch scheduling type and provider visibility when businessId is set
  const [specificProviderForCustomers, setSpecificProviderForCustomers] = useState(true);
  const [showProviderScoreToCustomers, setShowProviderScoreToCustomers] = useState(true);
  const [showProviderCompletedJobsToCustomers, setShowProviderCompletedJobsToCustomers] = useState(true);
  const [showProviderAvailabilityToCustomers, setShowProviderAvailabilityToCustomers] = useState(true);
  const [locationManagement, setLocationManagement] = useState<"zip" | "name" | "none">("zip");
  const [wildcardZipEnabled, setWildcardZipEnabled] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const fetchScheduling = async () => {
      try {
        const res = await fetch(`/api/admin/store-options?businessId=${businessId}`);
        const data = await res.json();
        if (res.ok && data?.options) {
          const opts = data.options;
          if (opts.scheduling_type) setSchedulingType(opts.scheduling_type);
          if (typeof opts.specific_provider_for_customers === "boolean") setSpecificProviderForCustomers(opts.specific_provider_for_customers);
          if (typeof opts.show_provider_score_to_customers === "boolean") setShowProviderScoreToCustomers(opts.show_provider_score_to_customers);
          if (typeof opts.show_provider_completed_jobs_to_customers === "boolean") setShowProviderCompletedJobsToCustomers(opts.show_provider_completed_jobs_to_customers);
          if (typeof opts.show_provider_availability_to_customers === "boolean") setShowProviderAvailabilityToCustomers(opts.show_provider_availability_to_customers);
          if (opts.location_management === "zip" || opts.location_management === "name" || opts.location_management === "none") setLocationManagement(opts.location_management);
          if (typeof opts.wildcard_zip_enabled === "boolean") setWildcardZipEnabled(opts.wildcard_zip_enabled);
        }
      } catch {
        // Keep defaults
      }
    };
    fetchScheduling();
  }, [businessId]);

  // Get business context from URL params only (no localStorage - backend/scoped by link)
  useEffect(() => {
    const getBusinessContext = async () => {
      const currentBusinessId = searchParams.get('business');
      
      if (currentBusinessId) {
        setBusinessId(currentBusinessId);
        
        try {
          // Try to get business name + logo from businesses API first (public lookup; includes logo_url)
          const response = await fetch(`/api/businesses?business_id=${currentBusinessId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.businesses && data.businesses.length > 0) {
              const business = data.businesses[0] as {
                name?: string;
                business_name?: string;
                display_name?: string;
                title?: string;
                logo_url?: string | null;
              };
              const name = business.name || business.business_name || business.display_name || business.title || 'Cleaning Service';
              setBusinessName(name);
              const rawLogo = business.logo_url != null ? String(business.logo_url).trim() : "";
              setBusinessLogoUrl(rawLogo);
              return;
            }
          }
          setBusinessLogoUrl("");
          
          // Fallback to industries API with multiple field name attempts
          const industriesResponse = await fetch(`/api/industries?business_id=${currentBusinessId}`);
          if (industriesResponse.ok) {
            const industriesData = await industriesResponse.json();
            if (industriesData.industries && industriesData.industries.length > 0) {
              const firstIndustry = industriesData.industries[0];
              const name = firstIndustry.name || 
                           firstIndustry.business_name || 
                           firstIndustry.display_name || 
                           firstIndustry.title ||
                           'Cleaning Service';
              setBusinessName(name);
              return;
            }
          }
          
          // Final fallback if no data found
          setBusinessName('Cleaning Service');
          setBusinessLogoUrl("");
        } catch (error) {
          console.error('Error fetching business name:', error);
          setBusinessName('Cleaning Service');
          setBusinessLogoUrl("");
        }
      } else {
        // No business ID found, set fallback
        setBusinessName('Cleaning Service');
        setBusinessLogoUrl("");
      }
    };

    getBusinessContext();
  }, [searchParams]);

  // Fetch cancellation policy when on payment step for Booking Summary disclaimer (must be before any conditional return)
  useEffect(() => {
    if (currentStep !== "payment") return;
    const bid = searchParams.get("business");
    if (!bid) return;
    fetch(`/api/cancellation-policy?businessId=${encodeURIComponent(bid)}`)
      .then((r) => r.json())
      .then((data) => setCancellationPolicyDisclaimer(data.disclaimerText ?? null))
      .catch(() => setCancellationPolicyDisclaimer(null));
  }, [currentStep, searchParams]);

  // Fetch payment provider (Stripe vs Authorize.net) when on payment step so we show the correct label
  useEffect(() => {
    const bid = searchParams.get("business");
    if (!bid || currentStep !== "payment") return;
    fetch(`/api/public/payment-provider?business=${encodeURIComponent(bid)}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data.provider;
        setPaymentProvider(p === "authorize_net" ? "authorize_net" : "stripe");
      })
      .catch(() => setPaymentProvider("stripe"));
  }, [currentStep, searchParams]);

  // Only clear selection when the selected industry was actually removed (not when options are loading/empty)
  useEffect(() => {
    if (!selectedCategory) return;
    if (industryOptions.length === 0) return;
    const stillExists = industryOptions.some((option) => option.key === selectedCategory);
    if (!stillExists) {
      setSelectedCategory(null);
      setSelectedService(null);
      setServiceCustomization(null);
      setCardCustomizations({});
      setServiceCategories([]);
      setCurrentStep("category");
    }
  }, [industryOptions, selectedCategory]);

  // Fetch extras and variables from admin portal
  useEffect(() => {
    const industryId = selectedIndustryId;
    const businessIdParam = searchParams.get("business");

    if (!industryId || !businessIdParam) {
      setAvailableExtras([]);
      setPricingParametersFull([]);
      setIndustryPricingVariables([]);
      return;
    }

    const fetchExtrasAndVariables = async () => {
      try {
        // Fetch extras
        const extrasResponse = await fetch(`/api/extras?industryId=${industryId}`);
        if (extrasResponse.ok) {
          const extrasData = await extrasResponse.json();
          if (extrasData.extras && Array.isArray(extrasData.extras)) {
            // Filter extras that should be displayed on customer frontend
            const visibleExtras = extrasData.extras.filter(
              (e: any) =>
                e && isIndustryExtraDisplayVisibleOnBookingSurface(e.display, bookingPopupSurface),
            );
            setAvailableExtras(visibleExtras);
          } else {
            setAvailableExtras([]);
          }
        } else {
          setAvailableExtras([]);
        }

        // Pricing parameters: store full rows; dropdowns/tiers are derived with admin-matching filters
        const variablesResponse = await fetch(`/api/pricing-parameters?industryId=${industryId}`);
        if (variablesResponse.ok) {
          const variablesData = await variablesResponse.json();
          if (variablesData.pricingParameters && Array.isArray(variablesData.pricingParameters)) {
            setPricingParametersFull(variablesData.pricingParameters as PricingParamRow[]);
          } else {
            setPricingParametersFull([]);
          }
        } else {
          setPricingParametersFull([]);
        }

        const pvRes = await fetch(`/api/pricing-variables?industryId=${encodeURIComponent(industryId)}`);
        if (pvRes.ok) {
          const pvData = await pvRes.json();
          const list = Array.isArray(pvData.variables) ? pvData.variables : [];
          setIndustryPricingVariables(
            list
              .map((v: Record<string, unknown>) => ({
                category: String(v.category ?? "").trim(),
                name: String(v.name ?? "").trim(),
                different_on_customer_end: Boolean(v.different_on_customer_end),
                customer_end_name:
                  v.customer_end_name != null && String(v.customer_end_name).trim()
                    ? String(v.customer_end_name).trim()
                    : null,
                show_explanation_icon_on_form: Boolean(v.show_explanation_icon_on_form),
                explanation_tooltip_text:
                  v.explanation_tooltip_text != null && String(v.explanation_tooltip_text).trim()
                    ? String(v.explanation_tooltip_text).trim()
                    : null,
                enable_popup_on_selection: Boolean(v.enable_popup_on_selection),
                popup_content: v.popup_content != null ? String(v.popup_content) : "",
                popup_display: String(v.popup_display ?? "customer_frontend_backend_admin").trim(),
                display: String(v.display ?? "customer_frontend_backend_admin").trim(),
              }))
              .filter((v: { category: string }) => v.category.length > 0),
          );
        } else {
          setIndustryPricingVariables([]);
        }

      } catch (error) {
        console.error("Error fetching extras and variables:", error);
        setAvailableExtras([]);
        setPricingParametersFull([]);
        setIndustryPricingVariables([]);
      }
    };

    fetchExtrasAndVariables();
  }, [selectedIndustryId, searchParams, bookingPopupSurface]);

  // Initialize booking form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      secondaryEmail: "",
      phone: "",
      secondaryPhone: "",
      addressPreference: "new",
      address: "",
      aptNo: "",
      zipCode: "",
      service: "",
      time: "",
      provider: "",
      notes: "",
      reminderOptIn: false,
      keyAccess: { primary_option: "someone_home", keep_key: false },
      customerNoteForProvider: "",
      couponCodeTab: "coupon-code",
      couponCode: "",
      couponType: "coupon-code",
      giftCardCode: "",
      customization: {
        frequency: "",
        squareMeters: "",
        bedroom: "",
        bathroom: "",
        extras: "",
      },
    },
  });
  const addressPreference = form.watch("addressPreference");
  const selectedProvider = form.watch("provider");
  const zipCode = form.watch("zipCode") ?? "";
  const existingAddressAvailable = Boolean(storedAddress?.address || customerAddress);
  const disableAddressFields = addressPreference === "existing" && existingAddressAvailable;

  const bookingDateWeekdayRule = useMemo(() => {
    const freqLabel =
      serviceCustomization?.frequency?.trim() || bookingFrequencyForFilters.trim() || "";
    if (!freqLabel) return { key: "all", allowed: null as number[] | null };
    const meta = frequencyMetaForCalendar(freqLabel, frequencyMetaByName);
    const repeatsEvery = meta?.frequency_repeats;
    const allowed = getAllowedWeekdaysForFrequencyRepeatsEvery(repeatsEvery);
    const repeatsNorm = normalizeFrequencyRepeatKey(repeatsEvery);
    return {
      key: allowed?.length ? `${repeatsNorm}|${allowed.join(",")}` : repeatsNorm || "all",
      allowed,
    };
  }, [serviceCustomization?.frequency, bookingFrequencyForFilters, frequencyMetaByName]);

  useEffect(() => {
    const allowed = bookingDateWeekdayRule.allowed;
    if (!allowed?.length) return;
    const raw = form.getValues("date");
    if (!raw) return;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    if (!allowed.includes(d.getDay())) {
      form.setValue("date", undefined as unknown as Date, { shouldValidate: true, shouldDirty: true });
      form.setValue("time", "");
    }
  }, [bookingDateWeekdayRule.key, bookingDateWeekdayRule.allowed, form]);

  const [hasLocationBasedFrequencies, setHasLocationBasedFrequencies] = useState(false);
  const [industryServiceAreaMeta, setIndustryServiceAreaMeta] = useState<{
    hasLinkedLocations: boolean;
  } | null>(null);
  const [locationResolve, setLocationResolve] = useState<{
    inputKey: string;
    loading: boolean;
    labels: string[];
    hasLinkedLocations: boolean;
  }>({ inputKey: "", loading: false, labels: [], hasLinkedLocations: false });
  const locationResolveRequestIdRef = useRef(0);

  useEffect(() => {
    if (!selectedIndustryId) {
      setHasLocationBasedFrequencies(false);
      return;
    }
    const bid = searchParams.get("business");
    if (!bid) {
      setHasLocationBasedFrequencies(false);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/industry-frequency?industryId=${encodeURIComponent(selectedIndustryId)}&businessId=${encodeURIComponent(bid)}&includeAll=true`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const freqs = data.frequencies || [];
        setHasLocationBasedFrequencies(
          freqs.some((f: { show_based_on_location?: boolean }) => f?.show_based_on_location === true),
        );
      })
      .catch(() => {
        if (!cancelled) setHasLocationBasedFrequencies(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIndustryId, searchParams]);

  useEffect(() => {
    if (!selectedIndustryId || !businessIdFromUrl) {
      setIndustryServiceAreaMeta(null);
      return;
    }
    let cancelled = false;
    setIndustryServiceAreaMeta(null);
    const params = new URLSearchParams({
      business_id: businessIdFromUrl,
      industry_id: selectedIndustryId,
      meta_only: "1",
      mode: "zip",
    });
    fetch(`/api/guest/resolve-industry-locations-for-zip?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        setIndustryServiceAreaMeta({ hasLinkedLocations: Boolean(j.hasLinkedLocations) });
      })
      .catch(() => {
        if (!cancelled) setIndustryServiceAreaMeta({ hasLinkedLocations: false });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIndustryId, businessIdFromUrl]);

  useEffect(() => {
    locationResolveRequestIdRef.current += 1;
    setLocationResolve({
      inputKey: "",
      loading: false,
      labels: [],
      hasLinkedLocations: false,
    });
  }, [selectedIndustryId, businessIdFromUrl, locationManagement]);

  const locationZipNormalized = String(zipCode ?? "").trim().replace(/\s/g, "");
  const nameInputTrimmed = String(zipCode ?? "").trim();
  const locationInputKey =
    locationManagement === "none"
      ? ""
      : `${locationManagement}:${
          locationManagement === "zip"
            ? locationZipNormalized
            : nameInputTrimmed.toLowerCase().replace(/\s+/g, " ").trim()
        }`;

  const locationInputMeetsMinLength =
    locationManagement === "none" ||
    (locationManagement === "zip"
      ? locationZipNormalized.length >= 5
      : nameInputTrimmed.replace(/\s+/g, " ").trim().length >= 2);

  useEffect(() => {
    if (locationManagement === "none" || !selectedIndustryId || !businessIdFromUrl) {
      return;
    }
    if (!locationInputMeetsMinLength) {
      setLocationResolve({
        inputKey: locationInputKey,
        loading: false,
        labels: [],
        hasLinkedLocations: industryServiceAreaMeta?.hasLinkedLocations ?? false,
      });
      return;
    }

    const handle = window.setTimeout(() => {
      const myId = ++locationResolveRequestIdRef.current;
      setLocationResolve((prev) => ({
        ...prev,
        inputKey: locationInputKey,
        loading: true,
      }));
      const inputForApi = locationManagement === "zip" ? locationZipNormalized : nameInputTrimmed;
      const params = new URLSearchParams({
        business_id: businessIdFromUrl,
        industry_id: selectedIndustryId,
        input: inputForApi,
        mode: locationManagement,
      });
      fetch(`/api/guest/resolve-industry-locations-for-zip?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (myId !== locationResolveRequestIdRef.current) return;
          setLocationResolve({
            inputKey: locationInputKey,
            loading: false,
            labels: Array.isArray(j?.labels) ? j.labels : [],
            hasLinkedLocations: Boolean(j?.hasLinkedLocations),
          });
        })
        .catch(() => {
          if (myId !== locationResolveRequestIdRef.current) return;
          setLocationResolve({
            inputKey: locationInputKey,
            loading: false,
            labels: [],
            hasLinkedLocations: industryServiceAreaMeta?.hasLinkedLocations ?? false,
          });
        });
    }, 400);

    return () => window.clearTimeout(handle);
  }, [
    locationInputKey,
    locationInputMeetsMinLength,
    locationManagement,
    selectedIndustryId,
    businessIdFromUrl,
    locationZipNormalized,
    nameInputTrimmed,
    industryServiceAreaMeta?.hasLinkedLocations,
  ]);

  const industryServiceAreaMetaLoading =
    Boolean(selectedIndustryId && businessIdFromUrl) && industryServiceAreaMeta === null;
  const industryHasLinkedServiceAreas = industryServiceAreaMeta?.hasLinkedLocations === true;

  const locationInputValidForBooking =
    locationManagement === "none"
      ? true
      : industryServiceAreaMetaLoading || !industryHasLinkedServiceAreas
        ? !hasLocationBasedFrequencies || locationInputMeetsMinLength
        : locationInputMeetsMinLength &&
          !locationResolve.loading &&
          locationResolve.inputKey === locationInputKey &&
          locationResolve.labels.length > 0;

  /** Zip/city must match configured service-area locations when the industry has linked locations; otherwise matches admin zip gating for location-based frequencies only. */
  const needsLocationBeforeServices = locationManagement !== "none" && !locationInputValidForBooking;

  useEffect(() => {
    if (limitedEditMode || locationManagement === "none") {
      form.clearErrors("zipCode");
      return;
    }
    if (!industryHasLinkedServiceAreas || !locationInputMeetsMinLength) {
      form.clearErrors("zipCode");
      return;
    }
    if (locationResolve.loading) {
      form.clearErrors("zipCode");
      return;
    }
    if (
      locationResolve.inputKey === locationInputKey &&
      locationResolve.labels.length === 0
    ) {
      form.setError("zipCode", {
        message:
          locationManagement === "zip"
            ? "That zip code is not in our service area. Check your entry or try a zip we serve."
            : "That location is not in our service area. Try the city or town name we list.",
      });
    } else {
      form.clearErrors("zipCode");
    }
  }, [
    form,
    limitedEditMode,
    locationManagement,
    industryHasLinkedServiceAreas,
    locationInputMeetsMinLength,
    locationResolve.loading,
    locationResolve.inputKey,
    locationResolve.labels.length,
    locationInputKey,
  ]);

  useEffect(() => {
    if (!needsLocationBeforeServices) return;
    setSelectedService(null);
    setServiceCustomization(null);
    setCardCustomizations({});
    setFlippedCardId(null);
    form.setValue("service", "");
  }, [needsLocationBeforeServices, form]);

  // Service categories: same location gate as admin AddBookingForm
  useEffect(() => {
    const industryId = selectedIndustryId;
    const businessIdParam = searchParams.get("business");

    if (!industryId || !businessIdParam) {
      setServiceCategories([]);
      return;
    }

    if (needsLocationBeforeServices) {
      setServiceCategories([]);
      setServiceCategoriesLoading(false);
      return;
    }

    const fetchServiceCategories = async () => {
      setServiceCategoriesLoading(true);
      try {
        const response = await fetch(
          `/api/service-categories?industryId=${industryId}&businessId=${businessIdParam}`,
        );
        const data = await response.json();

        if (!response.ok) {
          console.error("Failed to fetch service categories:", data.error);
          setServiceCategories([]);
          return;
        }

        const categories = data.serviceCategories ?? [];

        const mapped = categories
          .filter((cat: any) => isServiceCategoryVisibleOnPublicBooking(cat.display))
          .map((cat: any) => {
            const hours = cat.service_category_time?.hours ?? "0";
            const minutes = cat.service_category_time?.minutes ?? "0";
            const duration =
              cat.service_category_time?.enabled
                ? `${hours}h ${minutes}m`.replace(/^0h /, "").replace(/ 0m$/, "m")
                : "—";
            const price =
              cat.service_category_price?.enabled && cat.service_category_price?.price
                ? parseFloat(String(cat.service_category_price.price)) || 0
                : 0;

            return {
              id: cat.id,
              name: cat.name,
              customerDisplayName: getServiceCategoryCustomerDisplayName({
                name: cat.name,
                different_on_customer_end: cat.different_on_customer_end,
                customer_end_name: cat.customer_end_name,
              }),
              description: cat.description || `Professional ${cat.name} service.`,
              price,
              duration,
              image: cat.icon || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
              features: [],
              raw: cat,
            };
          });

        setServiceCategories(mapped);
      } catch (error) {
        console.error("Error fetching service categories:", error);
        setServiceCategories([]);
      } finally {
        setServiceCategoriesLoading(false);
      }
    };

    fetchServiceCategories();
  }, [selectedIndustryId, searchParams, needsLocationBeforeServices]);

  useEffect(() => {
    if (!selectedService || !serviceCategories.length) return;
    const match = serviceCategories.find(
      (s) => s.id === selectedService.id || s.name === selectedService.name,
    );
    if (match && match !== selectedService) {
      setSelectedService(match);
    }
  }, [serviceCategories, selectedService]);

  // Fetch frequencies (location-based: pass zipcode when available; businessId required for correct scope).
  // Ref runs on deps; we read zip from form inside so the entered value is always used.
  const fetchFrequenciesRef = useRef<() => void>(() => {});
  useEffect(() => {
    const industryId = selectedIndustryId;
    const businessIdParam = searchParams.get("business");
    if (!industryId || !businessIdParam) {
      setFrequencyOptions([]);
      setFrequencyMetaByName({});
      setBookingFrequencyForFilters("");
      return;
    }
    if (needsLocationBeforeServices) {
      setFrequencyOptions([]);
      setFrequencyMetaByName({});
      setBookingFrequencyForFilters("");
      return;
    }
    const url = new URL("/api/industry-frequency", window.location.origin);
    url.searchParams.set("industryId", industryId);
    url.searchParams.set("businessId", businessIdParam);
    // Read zip/location from form
    const zipFromForm = String(form.getValues("zipCode") ?? "").trim().replace(/\s/g, "");
    const minLen = locationManagement === "name" ? 2 : 5;
    if (zipFromForm.length >= minLen) {
      url.searchParams.set("zipcode", zipFromForm);
      if (wildcardZipEnabled) url.searchParams.set("wildcard", "true");
    }
    const doFetch = async () => {
      try {
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          if (data.frequencies && Array.isArray(data.frequencies)) {
            const rows = (data.frequencies as any[]).filter(
              (f: any) =>
                f?.is_active !== false &&
                (!f.display || f.display === "Both" || f.display === "Booking"),
            );
            const { names, metaMap, defaultName } = bookNowFrequencyRowsToState(rows);
            setFrequencyOptions(names);
            setFrequencyMetaByName(metaMap);
            setBookingFrequencyForFilters((prev) => {
              const p = String(prev || "").trim();
              if (p && names.includes(p)) return p;
              if (defaultName && names.includes(defaultName)) return defaultName;
              return "";
            });
          } else {
            setFrequencyOptions([]);
            setFrequencyMetaByName({});
            setBookingFrequencyForFilters("");
          }
        } else {
          setFrequencyOptions([]);
          setFrequencyMetaByName({});
          setBookingFrequencyForFilters("");
        }
      } catch (err) {
        console.error("Error fetching frequencies:", err);
        setFrequencyOptions([]);
        setFrequencyMetaByName({});
        setBookingFrequencyForFilters("");
      }
    };
    fetchFrequenciesRef.current = () => {
      if (needsLocationBeforeServices) {
        setFrequencyOptions([]);
        setFrequencyMetaByName({});
        setBookingFrequencyForFilters("");
        return;
      }
      const zip = String(form.getValues("zipCode") ?? "").trim().replace(/\s/g, "");
      const minLen = locationManagement === "name" ? 2 : 5;
      const u = new URL("/api/industry-frequency", window.location.origin);
      u.searchParams.set("industryId", industryId);
      u.searchParams.set("businessId", businessIdParam);
      if (zip.length >= minLen) {
        u.searchParams.set("zipcode", zip);
        if (wildcardZipEnabled) u.searchParams.set("wildcard", "true");
      }
      fetch(u.toString())
        .then((res) => res.ok ? res.json() : { frequencies: [] })
        .then((data) => {
          if (data.frequencies && Array.isArray(data.frequencies)) {
            const rows = (data.frequencies as any[]).filter(
              (f: any) =>
                f?.is_active !== false &&
                (!f.display || f.display === "Both" || f.display === "Booking"),
            );
            const { names, metaMap, defaultName } = bookNowFrequencyRowsToState(rows);
            setFrequencyOptions(names);
            setFrequencyMetaByName(metaMap);
            setBookingFrequencyForFilters((prev) => {
              const p = String(prev || "").trim();
              if (p && names.includes(p)) return p;
              if (defaultName && names.includes(defaultName)) return defaultName;
              return "";
            });
          } else {
            setFrequencyOptions([]);
            setFrequencyMetaByName({});
            setBookingFrequencyForFilters("");
          }
        })
        .catch(() => {
          setFrequencyOptions([]);
          setFrequencyMetaByName({});
          setBookingFrequencyForFilters("");
        });
    };
    doFetch();
  }, [
    selectedIndustryId,
    searchParams,
    zipCode,
    locationManagement,
    wildcardZipEnabled,
    needsLocationBeforeServices,
  ]);

  const refetchFrequenciesOnZipChange = useCallback(() => {
    fetchFrequenciesRef.current();
  }, []);

  useEffect(() => {
    if (!selectedIndustryId) {
      setExcludeParametersList([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/exclude-parameters?industryId=${encodeURIComponent(selectedIndustryId)}`)
      .then((res) => (res.ok ? res.json() : { excludeParameters: [] }))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data.excludeParameters) ? data.excludeParameters : [];
        setExcludeParametersList(
          list.map((p: { name?: string; price?: number; qty_based?: boolean; time_minutes?: unknown }) => {
            const tm = Number(p.time_minutes);
            return {
              name: String(p.name ?? ""),
              price: typeof p.price === "number" ? p.price : undefined,
              qty_based: Boolean(p.qty_based),
              ...(Number.isFinite(tm) && tm > 0 ? { time_minutes: tm } : {}),
            };
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setExcludeParametersList([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIndustryId]);

  // Form 1 parity (admin AddBookingForm): scope frequency when industry changes
  useEffect(() => {
    setBookingFrequencyForFilters("");
    setServiceListFrequencyDeps(null);
  }, [selectedIndustryId]);

  // Form 1 default (`is_default`): when frequencies load, preselect that name for filters/cards if present; otherwise no filter until the customer picks.

  // Load Form 1 frequency dependencies for filtering service categories (admin serviceCategories effect)
  useEffect(() => {
    if (!selectedIndustryId || !businessIdFromUrl.trim() || !bookingFrequencyForFilters.trim()) {
      setServiceListFrequencyDeps(null);
      return;
    }
    let cancelled = false;
    getFrequencyDependencies(selectedIndustryId, bookingFrequencyForFilters, {
      businessId: businessIdFromUrl,
    })
      .then((deps) => {
        if (!cancelled) setServiceListFrequencyDeps(deps);
      })
      .catch(() => {
        if (!cancelled) setServiceListFrequencyDeps(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIndustryId, businessIdFromUrl, bookingFrequencyForFilters]);

  /** Service cards: no frequency chosen yet → show full list; after a frequency is chosen, apply Form 1 deps. */
  const categoryServicesForForm = useMemo(() => {
    if (limitedEditMode) return serviceCategories;
    if (!bookingFrequencyForFilters.trim()) return serviceCategories;
    return serviceCategories.filter((svc) => {
      const raw = svc.raw;
      if (!raw?.service_category_frequency) return true;
      if (!serviceListFrequencyDeps) return true;
      if (!serviceListFrequencyDeps.serviceCategories?.length) return true;
      return serviceListFrequencyDeps.serviceCategories.includes(String(raw.id));
    });
  }, [limitedEditMode, serviceCategories, serviceListFrequencyDeps, bookingFrequencyForFilters]);

  // If frequency filter hides the selected service, clear selection (admin would not list it)
  useEffect(() => {
    if (limitedEditMode) return;
    if (!selectedService) return;
    const stillVisible = categoryServicesForForm.some(
      (s) => s.id === selectedService.id || s.name === selectedService.name,
    );
    if (!stillVisible) {
      setSelectedService(null);
      setServiceCustomization(null);
      form.setValue("service", "");
    }
  }, [categoryServicesForForm, selectedService, limitedEditMode, form]);

  // Handle provider selection
  const handleProviderSelect = (provider: any) => {
    const providerId = provider.id;
    form.setValue("provider", providerId);
  };

  useEffect(() => {
    if (accountLoading) return;
    if (customerName) {
      const parts = customerName.trim().split(/\s+/).filter(Boolean);
      if (parts.length) {
        form.setValue("firstName", parts[0]);
        const lastName = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];
        form.setValue("lastName", lastName);
      }
    }
    if (customerEmail) form.setValue("email", customerEmail);
    if (customerPhone) {
      const e164 = normalizeStoredPhoneToE164(customerPhone, guessDefaultCountry());
      if (e164) form.setValue("phone", e164);
    }
    if (customerAddress) {
      // Set address preference to existing and pre-fill the address
      form.setValue("addressPreference", "existing");
      form.setValue("address", customerAddress);
      // Also store it as storedAddress for consistency
      setStoredAddress({ address: customerAddress });
    }
  }, [accountLoading, customerName, customerEmail, customerPhone, customerAddress, form]);

  // Address comes from form state and customer profile only (no localStorage)

  useEffect(() => {
    if (addressPreference === "existing") {
      if (storedAddress?.address) {
        form.setValue("address", storedAddress.address);
        // Only set aptNo if it exists in storedAddress, otherwise keep current value
        if (storedAddress.aptNo) {
          form.setValue("aptNo", storedAddress.aptNo);
        }
        form.setValue("zipCode", storedAddress.zipCode ?? "");
      } else if (customerAddress) {
        form.setValue("address", customerAddress);
        // Don't clear aptNo - let user keep their current value for apartment/unit
        form.setValue("zipCode", "");
      } else {
        form.setValue("addressPreference", "new");
      }
    }
  }, [addressPreference, storedAddress?.address, customerAddress || "", form]);

  // Initialize payment form
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      cardNumber: "",
      cardName: "",
      expiryDate: "",
      cvv: "",
    },
  });

  // Fetch dynamic time slots when date changes
  useEffect(() => {
    const fetchTimeSlots = async () => {
      const selectedDate = form.getValues("date");
      const businessIdParam = searchParams.get("business");
      
      if (!businessIdParam || !selectedDate) {
        // Use default time slots if no date or business ID
        setDynamicTimeSlots([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/time-slots?business_id=${businessIdParam}&date=${format(selectedDate, 'yyyy-MM-dd')}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setDynamicTimeSlots(data.timeSlots || []);
        } else {
          console.error('Failed to fetch time slots');
          setDynamicTimeSlots([]);
        }
      } catch (error) {
        console.error('Error fetching time slots:', error);
        setDynamicTimeSlots([]);
      }
    };

    fetchTimeSlots();
  }, [form.watch("date"), searchParams]);

  // Get current form values for validation
  const selectedDate = form.watch("date");
  const selectedTime = form.watch("time");
  const selectedServiceName = form.watch("service");
  const isDateSelected = Boolean(selectedDate);
  const isTimeSelected = Boolean(selectedTime);
  const isDateTimeSelected = isDateSelected && isTimeSelected;

  // When Accept or Decline: skip provider step. Also skip when specific_provider_for_customers is disabled.
  const showProviderStep = schedulingType !== "accept_or_decline" && specificProviderForCustomers;

  // Fetch available providers when date and time are selected (only if provider step is shown)
  useEffect(() => {
    const fetchAvailableProviders = async () => {
      if (!showProviderStep) {
        setAvailableProviders([]);
        return;
      }
      if (!selectedDate || !selectedTime || !businessId || !selectedService || !selectedServiceName) {
        setAvailableProviders([]);
        return;
      }

      setProvidersLoading(true);
      try {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        // Use the service ID from the selected service object, not the service name
        const serviceId = selectedService.id || selectedService.raw?.id;
        console.log('Fetching providers with params:');
        console.log('- businessId:', businessId);
        console.log('- serviceId:', serviceId);
        console.log('- date:', formattedDate);
        console.log('- time:', selectedTime);
        
        const response = await fetch(
          `/api/providers/available?businessId=${businessId}&serviceId=${serviceId}&date=${formattedDate}&time=${selectedTime}`
        );
        
        console.log('API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('API response data:', data);
          setAvailableProviders(data.providers || []);
        } else {
          console.error('Failed to fetch available providers');
          setAvailableProviders([]);
        }
      } catch (error) {
        console.error('Error fetching available providers:', error);
        setAvailableProviders([]);
      } finally {
        setProvidersLoading(false);
      }
    };

    fetchAvailableProviders();
  }, [showProviderStep, selectedDate, selectedTime, selectedService, selectedServiceName, businessId]);

  // Clear time selection when date is cleared
  useEffect(() => {
    if (!isDateSelected && selectedTime) {
      form.setValue("time", "");
    }
  }, [isDateSelected, selectedTime, form]);

  // Handle category selection
  const handleCategorySelect = (categoryKey: ServiceCategory) => {
    setSelectedCategory(categoryKey);
    setSelectedService(null);
    setServiceCustomization(null);
    setCardCustomizations({});
    setFlippedCardId(null);
    setCurrentStep("details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cardKey = (id: string | number) => String(id);

  // Handle card flip
  const handleCardFlip = (cardId: string | number) => {
    const key = cardKey(cardId);
    const prevKey = flippedCardId != null ? cardKey(flippedCardId) : null;
    // If flipping to a different card, clear the previous card's data if it wasn't confirmed
    if (prevKey && prevKey !== key && selectedService && cardKey(selectedService.id) !== prevKey) {
      setCardCustomizations(prev => {
        const newCustomizations = { ...prev };
        delete newCustomizations[prevKey];
        return newCustomizations;
      });
    }
    setFlippedCardId(key || null);
  };

  // Handle customization change for a specific card
  const handleCustomizationChange = (serviceId: string | number, customization: ServiceCustomization) => {
    const key = cardKey(serviceId);
    if (flippedCardId != null && cardKey(flippedCardId) === key) {
      if (customization.frequency?.trim()) {
        setBookingFrequencyForFilters(customization.frequency.trim());
      }
      setCardCustomizations(prev => ({
        ...prev,
        [key]: customization
      }));
      if (selectedService && cardKey(selectedService.id) === key) {
        setServiceCustomization(customization);
        form.setValue("customization", toFormCustomization(customization), { shouldValidate: true });
      }
    }
  };

  // Get customization for a specific card (normalize id so number/string from API always hits same key)
  const getCardCustomization = (serviceId: string | number): ServiceCustomization => {
    const key = cardKey(serviceId);
    const defaultFreq = bookingFrequencyForFilters || "";
    const stored = cardCustomizations[key];
    if (!stored) {
      return {
        frequency: defaultFreq,
        squareMeters: "",
        bedroom: "",
        bathroom: "",
        extras: [],
        isPartialCleaning: false,
        excludedAreas: [],
        excludeQuantities: {},
        variableCategories: {},
        bookingHours: "0",
        bookingMinutes: "0",
      };
    }
    return {
      ...stored,
      frequency: stored.frequency?.trim() ? stored.frequency : defaultFreq,
      bookingHours: stored.bookingHours ?? "0",
      bookingMinutes: stored.bookingMinutes ?? "0",
    };
  };

  useEffect(() => {
    setPrefilledBookingId(null);
    setRebookSourceBooking(null);
    rebookWaitStartedAtRef.current = null;
    rebookGiveUpRef.current = null;
  }, [bookingIdParam]);

  /** Rebook / book-again: resolve real admin service + industry, then apply prefill after pricing tiers load. */
  useEffect(() => {
    if (!bookingIdParam || prefilledBookingId === bookingIdParam) return;

    const currentBusinessId = searchParams.get("business")?.trim() || null;
    if (!currentBusinessId) return;

    type BookingCustomization = {
      frequency?: string;
      squareMeters?: string;
      bedroom?: string;
      bathroom?: string;
      extras?: string[] | { name: string; quantity: number }[];
      isPartialCleaning?: boolean;
      excludedAreas?: string[];
      excludeQuantities?: Record<string, number>;
      variableCategories?: { [categoryName: string]: string };
      bookingHours?: string;
      bookingMinutes?: string;
    };

    const normalizeExtrasFromString = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
      }
      if (typeof value === "string") {
        return value
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
      }
      return [];
    };

    let cancelled = false;

    const run = async () => {
      if (rebookGiveUpRef.current === bookingIdParam) return;

      // Phase 1 — fetch booking + match service (admin catalog), stash for phase 2
      if (!rebookSourceBooking && industryOptions.length > 0) {
        const sourceBooking = await fetchBookingById(currentBusinessId, bookingIdParam);
        if (cancelled) return;
        if (!sourceBooking) {
          rebookGiveUpRef.current = bookingIdParam;
          return;
        }

        const zipPref =
          (sourceBooking.zipCode && String(sourceBooking.zipCode).trim()) ||
          extractZipFromAddressForRebook(sourceBooking.address);
        if (zipPref) {
          form.setValue("zipCode", zipPref);
        }

        let resolved = await resolveRebookServiceAcrossIndustries(
          currentBusinessId,
          industryOptions,
          sourceBooking.service,
        );
        if (!resolved) {
          const staticMatch = findServiceMatch(sourceBooking.service);
          if (staticMatch) {
            const s = staticMatch.service;
            resolved = {
              industryKey: staticMatch.categoryKey,
              service: {
                ...s,
                customerDisplayName: s.name,
              } as RebookServiceCategoryCard,
            };
          }
        }

        if (!resolved) {
          rebookGiveUpRef.current = bookingIdParam;
          if (!cancelled) {
            toast({
              title: "Service unavailable",
              description: `${sourceBooking.service} is no longer offered. Please choose another service.`,
              variant: "destructive",
            });
          }
          return;
        }

        const { industryKey, service } = resolved;
        const presetCustomization = (sourceBooking.customization as BookingCustomization) ?? {};
        const freqNorm =
          normalizeSelectValue(sourceBooking.frequency, FREQUENCY_OPTIONS) ||
          normalizeSelectValue(presetCustomization.frequency, FREQUENCY_OPTIONS) ||
          "";

        if (cancelled) return;
        setSelectedCategory(industryKey);
        setSelectedService(service as (typeof serviceCategories)[number]);
        setFlippedCardId(null);
        setCurrentStep("details");
        if (freqNorm) {
          setBookingFrequencyForFilters(freqNorm);
        }
        setServiceCustomization({
          frequency: freqNorm,
          squareMeters: "",
          bedroom: "",
          bathroom: "",
          extras: [],
          isPartialCleaning: false,
          excludedAreas: [],
          excludeQuantities: {},
          variableCategories: {},
        });
        rebookWaitStartedAtRef.current = Date.now();
        setRebookSourceBooking(sourceBooking);
        return;
      }

      // Phase 2 — full customization + form once tiers / categories are ready
      if (!rebookSourceBooking || prefilledBookingId === bookingIdParam) return;
      if (!selectedService) return;
      if (serviceCategoriesLoading) return;

      const waitedMs =
        rebookWaitStartedAtRef.current != null
          ? Date.now() - rebookWaitStartedAtRef.current
          : 0;
      const waitingForTiers =
        pricingParametersFull.length > 0 && pricingRows.length === 0 && waitedMs < 4000;
      if (waitingForTiers) return;

      const sourceBooking = rebookSourceBooking;
      const existingCustomization = getCardCustomization(selectedService.id);
      const presetCustomization = (sourceBooking.customization as BookingCustomization) ?? {};

      const dm = sourceBooking.durationMinutes;
      let rebookBookingHours = presetCustomization.bookingHours ?? "0";
      let rebookBookingMinutes = presetCustomization.bookingMinutes ?? "0";
      if (
        (rebookBookingHours === "0" && rebookBookingMinutes === "0") &&
        typeof dm === "number" &&
        dm > 0
      ) {
        const n = Math.round(dm);
        rebookBookingHours = String(Math.floor(n / 60));
        rebookBookingMinutes = String(n % 60);
      }

      const presetExtras: { name: string; quantity: number }[] = normalizeExtrasArray(
        normalizeExtrasFromString(presetCustomization.extras),
      );
      const existingExtras: { name: string; quantity: number }[] = normalizeExtrasArray(
        normalizeExtrasFromString(existingCustomization.extras),
      );

      const areaOptionsForRebook =
        pricingRows.length > 0 ? pricingRows.map((t) => t.name) : [...AREA_SIZE_OPTIONS];
      const rebookCustomization: ServiceCustomization = {
        frequency:
          normalizeSelectValue(sourceBooking.frequency, FREQUENCY_OPTIONS) ||
          normalizeSelectValue(existingCustomization.frequency, FREQUENCY_OPTIONS) ||
          normalizeSelectValue(presetCustomization.frequency, FREQUENCY_OPTIONS),
        squareMeters:
          normalizeSelectValue(presetCustomization.squareMeters, areaOptionsForRebook) ||
          normalizeSelectValue(existingCustomization.squareMeters, areaOptionsForRebook),
        bedroom:
          normalizeSelectValue(presetCustomization.bedroom, BEDROOM_OPTIONS) ||
          normalizeSelectValue(existingCustomization.bedroom, BEDROOM_OPTIONS),
        bathroom:
          normalizeSelectValue(presetCustomization.bathroom, BATHROOM_OPTIONS) ||
          normalizeSelectValue(existingCustomization.bathroom, BATHROOM_OPTIONS),
        extras: presetExtras.length
          ? presetExtras
          : existingExtras.length
            ? normalizeExtrasArray(existingExtras)
            : [],
        isPartialCleaning:
          presetCustomization.isPartialCleaning ?? existingCustomization.isPartialCleaning ?? false,
        excludedAreas: presetCustomization.excludedAreas ?? existingCustomization.excludedAreas ?? [],
        excludeQuantities:
          presetCustomization.excludeQuantities ?? existingCustomization.excludeQuantities ?? {},
        variableCategories:
          presetCustomization.variableCategories ?? existingCustomization.variableCategories ?? {},
        bookingHours:
          presetCustomization.bookingHours ??
          existingCustomization.bookingHours ??
          rebookBookingHours,
        bookingMinutes:
          presetCustomization.bookingMinutes ??
          existingCustomization.bookingMinutes ??
          rebookBookingMinutes,
      };

      setServiceCustomization(rebookCustomization);
      form.setValue("customization", toFormCustomization(rebookCustomization), { shouldValidate: true });
      setCardCustomizations((prev) => ({
        ...prev,
        [cardKey(selectedService.id)]: rebookCustomization,
      }));

      form.setValue("service", sourceBooking.service);
      if (sourceBooking.address) {
        form.setValue("address", sourceBooking.address);
        form.setValue("addressPreference", "new");
      }
      form.setValue("notes", sourceBooking.notes ?? "");
      if (sourceBooking.time) {
        form.setValue("time", sourceBooking.time);
      }

      const parsedDate = new Date(`${sourceBooking.date}T00:00:00`);
      if (!Number.isNaN(parsedDate.getTime())) {
        form.setValue("date", parsedDate);
      }

      const contactRaw = String(sourceBooking.contact ?? "").trim();
      if (contactRaw && !contactRaw.includes("@")) {
        const e164 = normalizeStoredPhoneToE164(contactRaw, guessDefaultCountry());
        if (e164) form.setValue("phone", e164);
      }

      const zipAgain =
        (sourceBooking.zipCode && String(sourceBooking.zipCode).trim()) ||
        extractZipFromAddressForRebook(sourceBooking.address);
      if (zipAgain) {
        form.setValue("zipCode", zipAgain);
      }

      setPrefilledBookingId(bookingIdParam);
      setRebookSourceBooking(null);
      rebookWaitStartedAtRef.current = null;

      toast({
        title: "Details loaded",
        description: "Review the pre-filled booking and make any adjustments you need.",
      });
    };

    void run();
    return () => {
      cancelled = true;
    };
    // getCardCustomization omitted from deps (phase 2 reads it after selectedService updates).
  }, [
    bookingIdParam,
    prefilledBookingId,
    rebookSourceBooking,
    industryOptions,
    selectedService,
    serviceCategoriesLoading,
    pricingRows,
    pricingParametersFull,
    searchParams,
    form,
    toast,
  ]);

  useEffect(() => {
    if (!limitedEditMode) return;
    const bid = searchParams.get("business");
    if (!bid) return;
    fetch(`/api/customer/reschedule-settings?businessId=${encodeURIComponent(bid)}`)
      .then((r) => r.json())
      .then((data) => setRescheduleMessageLimitedEdit(data.reschedule_message ?? null))
      .catch(() => setRescheduleMessageLimitedEdit(null));
  }, [limitedEditMode, searchParams]);

  // When returning from Authorize.net success: mark booking paid and send receipt (like Stripe webhook)
  useEffect(() => {
    const anetSb = searchParams.get("anet_sb")?.trim();
    let bookingIdFromAnet: string | null = null;
    let businessFromAnet: string | null = null;
    if (anetSb) {
      const dot = anetSb.indexOf(".");
      if (dot > 0 && dot < anetSb.length - 1) {
        bookingIdFromAnet = anetSb.slice(0, dot).trim() || null;
        businessFromAnet = anetSb.slice(dot + 1).trim() || null;
      } else {
        bookingIdFromAnet = anetSb;
      }
    }
    const bookingId =
      searchParams.get("booking_id")?.trim() || bookingIdFromAnet || searchParams.get("anet_success")?.trim() || null;
    const authorizeNetSuccess =
      searchParams.get("authorize_net") === "success" ||
      Boolean(anetSb) ||
      Boolean(searchParams.get("anet_success")?.trim());
    const businessId = searchParams.get("business")?.trim() || businessFromAnet || null;
    const endpoint = authorizeNetSuccess && bookingId ? "/api/authorize-net/confirm-return" : null;
    if (!endpoint || !bookingId || paymentConfirmSentRef.current) return;
    paymentConfirmSentRef.current = true;
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, business_id: businessId || undefined }),
    }).catch(() => {});
  }, [searchParams]);

  // When returning from payment (Stripe or Authorize.net) success, confirm then show success step.
  useEffect(() => {
    const stripeSuccess = searchParams.get("stripe") === "success";
    const sessionId = searchParams.get("session_id");
    const anetSb = searchParams.get("anet_sb")?.trim();
    const bookingIdAnet =
      searchParams.get("anet_success")?.trim() ||
      (anetSb && anetSb.includes(".") ? anetSb.slice(0, anetSb.indexOf(".")).trim() : anetSb) ||
      null;
    const authorizeNetSuccess =
      (searchParams.get("authorize_net") === "success" && searchParams.get("booking_id")) ||
      Boolean(bookingIdAnet);
    const businessId = searchParams.get("business");

    if (authorizeNetSuccess) {
      setCurrentStep("success");
      return;
    }

    if (!stripeSuccess || !sessionId || !businessId) return;
    if (paymentConfirmSentRef.current) return;
    paymentConfirmSentRef.current = true;

    fetch("/api/stripe/confirm-booking-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, businessId }),
    })
      .catch(() => {})
      .finally(() => {
        setCurrentStep("success");
      });
  }, [searchParams]);

  useEffect(() => {
    if (currentStep === "success") {
      const anetSb = searchParams.get("anet_sb")?.trim();
      let bid = searchParams.get("business")?.trim() || null;
      if (!bid && anetSb?.includes(".")) {
        bid = anetSb.slice(anetSb.indexOf(".") + 1).trim() || null;
      }
      router.push(bid ? `/customer/appointments?business=${bid}` : "/customer/appointments");
    }
  }, [currentStep, router, searchParams]);

  /** Estimated job length: hourly custom time → card hours/min; else pricing-parameter sum (+extras, −partial) or duration label. */
  const computeEstimatedMinutesForBooking = useCallback(
    (serviceName: string) => {
      if (!serviceCustomization || !selectedService) return null;
      const sn = serviceName.trim();
      if (!sn) return null;
      const rawHs = selectedService.raw as
        | { hourly_service?: { enabled?: boolean; priceCalculationType?: string } }
        | undefined;
      const customMins = hourlyCustomTimeTotalMinutes({
        hourly: rawHs?.hourly_service,
        bookingHours: serviceCustomization.bookingHours,
        bookingMinutes: serviceCustomization.bookingMinutes,
      });
      if (customMins != null) return customMins;
      const label =
        (selectedService as { duration?: string }).duration ??
        (selectedService.raw as { duration?: string } | undefined)?.duration;
      return estimateBookingDurationMinutes({
        serviceName: sn,
        customization: serviceCustomization,
        pricingParametersFull,
        availableExtras,
        excludeParametersList,
        durationLabelFallback: label,
        frequencyDependencies: pricingFrequencyDeps,
        serviceUsesFrequencyVariableDeps: Boolean(
          (selectedService?.raw as { service_category_frequency?: boolean } | undefined)
            ?.service_category_frequency,
        ),
      });
    },
    [
      serviceCustomization,
      selectedService,
      pricingParametersFull,
      availableExtras,
      excludeParametersList,
      pricingFrequencyDeps,
    ],
  );

  const getEstimatedDurationMinutes = useCallback((): number | null => {
    if (!selectedService || !serviceCustomization) return null;
    const serviceName = (bookingData?.service || selectedService.name || "").trim();
    return computeEstimatedMinutesForBooking(serviceName);
  }, [bookingData, selectedService, serviceCustomization, computeEstimatedMinutesForBooking]);

  const addBookingToStorage = useCallback(async (paymentMethod: "cash" | "online" = "cash") => {
    if (!bookingData || !serviceCustomization || !selectedService) {
      toast({
        title: "Missing information",
        description: "Please complete the service selection and booking form before finishing.",
        variant: "destructive",
      });
      return null;
    }

    if (!limitedEditMode && locationManagement !== "none" && !locationInputValidForBooking) {
      if (!locationInputMeetsMinLength) {
        toast({
          title: "Service area required",
          description:
            locationManagement === "zip"
              ? "Enter a valid zip code we serve before completing your booking."
              : "Enter your city or town before completing your booking.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Outside service area",
          description:
            locationManagement === "zip"
              ? "That zip code is not in our service area. Go back and update it before paying."
              : "That location is not in our service area. Go back and update it before paying.",
          variant: "destructive",
        });
      }
      return null;
    }

    const bookingDate = bookingData.date instanceof Date ? bookingData.date : new Date(bookingData.date);
    // Format date using local timezone to match calendar display
    let formattedDate: string;
    if (Number.isNaN(bookingDate.getTime())) {
      const today = new Date();
      formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    } else {
      formattedDate = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}-${String(bookingDate.getDate()).padStart(2, '0')}`;
    }

    const newBooking: Booking = {
      id: `CB-${Date.now().toString(36).toUpperCase()}`,
      service: selectedService.name,
      provider: "",
      frequency: serviceCustomization.frequency || "One-time",
      date: formattedDate,
      time: bookingData.time,
      status: "scheduled",
      address: bookingData.aptNo
        ? `${bookingData.address}, Apt ${bookingData.aptNo}`
        : bookingData.address,
      contact: String(bookingData.phone), // Convert phone number to string for contact field
      notes: bookingData.notes ?? "",
      price: selectedService.price ?? 0,
      tipAmount: undefined,
      tipUpdatedAt: undefined,
      customization: {
        frequency: serviceCustomization.frequency,
        squareMeters: serviceCustomization.squareMeters,
        bedroom: serviceCustomization.bedroom,
        bathroom: serviceCustomization.bathroom,
        extras: serviceCustomization.extras && serviceCustomization.extras.length > 0 ? formatExtrasForStorage(serviceCustomization.extras) : ["None"],
        isPartialCleaning: serviceCustomization.isPartialCleaning,
        excludedAreas: serviceCustomization.excludedAreas,
        excludeQuantities: serviceCustomization.excludeQuantities ?? {},
        variableCategories: serviceCustomization.variableCategories ?? {},
        bookingHours: serviceCustomization.bookingHours ?? "0",
        bookingMinutes: serviceCustomization.bookingMinutes ?? "0",
      },
    };

    const currentBusinessId = searchParams.get("business") ?? null;

    // Same pattern as admin add-booking: single POST with x-business-id and snake_case body
    try {
      const supabase = getSupabaseCustomerClient();
      const { data: { session } } = await supabase.auth.getSession();
      const isLoggedIn = Boolean(session?.access_token);
      const apiUrl = isLoggedIn ? "/api/customer/bookings" : "/api/guest/bookings";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-business-id": currentBusinessId,
      };
      if (isLoggedIn) headers.Authorization = `Bearer ${session.access_token}`;

      if (currentBusinessId) {
        const tot = calculateTotal();
        summaryTotalRef.current = tot.total;
        const displayedTotal = summaryTotalRef.current;
        const amountFromRef = Number(displayedTotal);
        const amountFromCalc = Number(tot.total) || Number(tot.subtotal) || 0;
        const fallbackPrice = Number(selectedService?.price ?? newBooking.price ?? 0);
        const amountToSend =
          (amountFromRef > 0 ? amountFromRef : null) ??
          (amountFromCalc > 0 ? amountFromCalc : null) ??
          (fallbackPrice > 0 ? fallbackPrice : 0);

        const selectedProviderId = showProviderStep ? (form.getValues("provider") || null) : null;
        const selectedProviderObj = selectedProviderId ? availableProviders.find((p: any) => p.id === selectedProviderId) : null;
        const selectedFreq = serviceCustomization.frequency || newBooking.frequency || "";
        const isRecurringFreq =
          !!selectedFreq &&
          String(selectedFreq).toLowerCase().replace(/\s+/g, " ") !== "one-time" &&
          String(selectedFreq).toLowerCase().replace(/\s+/g, "") !== "onetime";
        const estimatedDurationMins = getEstimatedDurationMinutes();
        const keyAccessForm = form.getValues("keyAccess") ?? { primary_option: "someone_home" as const, keep_key: false };
        const keyPrimary =
          keyAccessForm.primary_option === "hide_keys" ? ("hide_keys" as const) : ("someone_home" as const);
        const jobNoteForProvider = String(form.getValues("customerNoteForProvider") ?? "").trim();
        const payload = {
          business_id: currentBusinessId,
          industry_id: selectedIndustryId || undefined,
          service_area_input: String(form.getValues("zipCode") ?? bookingData.zipCode ?? "").trim(),
          customer_name: `${bookingData.firstName ?? ""} ${bookingData.lastName ?? ""}`.trim(),
          customer_email: bookingData.email ?? "",
          customer_phone: String(bookingData.phone ?? ""),
          address: newBooking.address,
          service: newBooking.service,
          frequency: selectedFreq || null,
          date: formattedDate,
          time: newBooking.time,
          status: "pending",
          amount: amountToSend,
          total: tot.total,
          subtotal: tot.subtotal,
          notes: newBooking.notes ?? "",
          payment_method: paymentMethod,
          provider_id: selectedProviderId || undefined,
          provider_name: selectedProviderObj?.name ?? undefined,
          ...(estimatedDurationMins != null ? { duration_minutes: estimatedDurationMins } : {}),
          ...(storeDefaultProviderWage
            ? {
                provider_wage: storeDefaultProviderWage.wage,
                provider_wage_type: storeDefaultProviderWage.type,
              }
            : {}),
          customization: {
            ...(newBooking.customization ?? {}),
            key_access: { primary_option: keyPrimary, keep_key: Boolean(keyAccessForm.keep_key) },
            ...(jobNoteForProvider ? { customer_note_for_provider: jobNoteForProvider } : {}),
            pricing_summary: serializePricingSummaryForCustomization(tot),
            ...(appliedCoupon
              ? {
                  coupon: {
                    code: appliedCoupon.code,
                    discount_type: appliedCoupon.discountType,
                    discount_value: appliedCoupon.discountValue,
                    discount_amount: tot.couponDiscount,
                  },
                }
              : {}),
          },
          coupon_code: appliedCoupon?.code,
          coupon_discount_type: appliedCoupon?.discountType,
          coupon_discount_value: appliedCoupon?.discountValue,
          coupon_discount_amount: appliedCoupon ? tot.couponDiscount : undefined,
          ...(isRecurringFreq
            ? {
                create_recurring: true,
                recurring_occurrences_ahead: 8,
                ...(frequencyMetaByName[selectedFreq]?.frequency_repeats
                  ? { frequency_repeats: frequencyMetaByName[selectedFreq].frequency_repeats }
                  : {}),
              }
            : {}),
        };

        const res = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const rawText = await res.text();
        let data: any = {};
        try {
          data = rawText ? JSON.parse(rawText) : {};
        } catch {
          data = {};
        }

        if (res.ok) {
          const saved = (data.data ?? data.booking) ?? data;
          const savedId = saved?.id ?? data.id ?? newBooking.id;
          setRecentBookingId(savedId);
          toast({
            title: "Booking Added",
            description: data.message ?? "New booking created.",
          });
          return { ...newBooking, id: savedId };
        }

        const isBlocked = res.status === 403 && data?.error === "BOOKING_BLOCKED" && data?.message;
        const msg =
          isBlocked
            ? data.message
            : (data && typeof data === "object" ? (data.error ?? data.details ?? data.message) : null) ||
              rawText ||
              `Save failed (${res.status})`;
        const hint = !isBlocked && data?.hint ? ` ${data.hint}` : "";
        toast({
          title: isBlocked ? "Booking not available" : "Error",
          description: !isBlocked && msg === "Customer profile not found for this business"
            ? "Please log in as a customer for this business to see this booking in your dashboard."
            : `${msg}${hint}`,
          variant: "destructive",
        });
        return null;
      }
    } catch (err) {
      console.warn("Failed to save booking to database", err);
      toast({
        title: "Error",
        description: "Failed to connect. Please try again.",
        variant: "destructive",
      });
      return null;
    }

    // No business ID – must come from booking link
    if (!currentBusinessId) {
      toast({
        title: "Business required",
        description: "Open this page from your provider's booking link to save the booking.",
        variant: "destructive",
      });
    }
    return null;
  }, [
    bookingData,
    serviceCustomization,
    selectedService,
    toast,
    searchParams,
    form,
    availableProviders,
    showProviderStep,
    appliedCoupon,
    getCouponDiscountAmount,
    storeDefaultProviderWage,
    frequencyMetaByName,
    excludeParametersList,
    getEstimatedDurationMinutes,
    selectedIndustryId,
    limitedEditMode,
    locationManagement,
    locationInputValidForBooking,
    locationInputMeetsMinLength,
    form,
  ]);

  // Handle service selection (persist to card customizations so selection survives re-renders)
  const handleServiceSelect = (serviceName: string, customization?: ServiceCustomization) => {
    if (!selectedCategory) return;
    const service = serviceCategories.find((s) => s.name === serviceName);
    if (!service) return;
    const custom = customization ?? getCardCustomization(service.id);
    setSelectedService(service);
    setServiceCustomization(custom);
    setCardCustomizations((prev) => ({ ...prev, [cardKey(service.id)]: custom }));
    form.setValue("service", serviceName, { shouldValidate: true });
    form.setValue("customization", toFormCustomization(custom), { shouldValidate: true });

    const raw = service.raw as Record<string, unknown> | undefined;
    const popupHtml = String(raw?.popup_content ?? "").trim();
    if (
      Boolean(raw?.enable_popup_on_selection) &&
      popupHtml &&
      popupDisplayAppliesToSurface(raw?.popup_display as string | undefined, bookingPopupSurface)
    ) {
      setBookingHtmlPopup({
        title: service.customerDisplayName?.trim() || service.name,
        html: popupHtml,
      });
    }

    // Scroll to customer form after a short delay
    setTimeout(() => {
      const formElement = document.getElementById("customer-form");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 300);
  };

  // Handle booking form submission - move to payment step (no localStorage)
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!limitedEditMode && locationManagement !== "none") {
      if (!locationInputValidForBooking) {
        if (!locationInputMeetsMinLength) {
          form.setError("zipCode", {
            message:
              locationManagement === "zip"
                ? "Please enter a valid zip code"
                : "Please enter your city or town (at least 2 characters)",
          });
        } else {
          form.setError("zipCode", {
            message:
              locationManagement === "zip"
                ? "That zip code is not in our service area. Check your entry or try a zip we serve."
                : "That location is not in our service area. Try the city or town name we list.",
          });
        }
        return;
      }
    }

    if (!limitedEditMode && selectedService && serviceCustomization) {
      const raw = selectedService.raw as { minimum_time?: ServiceCategoryMinimumTime } | undefined;
      const mt = raw?.minimum_time;
      const requiredMin = minimumTimeRequiredMinutes(mt);
      if (requiredMin != null) {
        const serviceName = (values.service || selectedService.name || "").trim();
        const estimated = computeEstimatedMinutesForBooking(serviceName);
        if (estimated != null && estimated < requiredMin) {
          const h = Math.floor(requiredMin / 60);
          const m = requiredMin % 60;
          const parts: string[] = [];
          if (h > 0) parts.push(`${h} hour${h !== 1 ? "s" : ""}`);
          if (m > 0) parts.push(`${m} minutes`);
          const needLabel = parts.length ? parts.join(" and ") : `${requiredMin} minutes`;
          const fallback = `Book at least ${needLabel} for this service, or adjust your selections.`;
          toast({
            title: "Minimum time not met",
            description: mt ? minimumTimeCustomerMessage(mt, fallback) : fallback,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setStoredAddress({
      address: values.address,
      ...(values.aptNo ? { aptNo: values.aptNo } : {}),
      ...(values.zipCode ? { zipCode: values.zipCode } : {}),
    });
    setBookingData(values);

    if (limitedEditMode && bookingIdParam) {
      const currentBusinessId = searchParams.get("business");
      try {
        const supabase = getSupabaseCustomerClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast({ title: "Please sign in", description: "You need to be signed in to update your booking details.", variant: "destructive" });
          return;
        }
        const fullName = `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim();
        const addressWithApt = values.aptNo ? `${values.address}, Apt ${values.aptNo}` : values.address;
        const res = await fetch(`/api/customer/bookings/${encodeURIComponent(bookingIdParam)}?business=${encodeURIComponent(currentBusinessId ?? "")}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            customer_name: fullName || undefined,
            customer_email: values.email ?? "",
            customer_phone: String(values.phone ?? ""),
            address: addressWithApt ?? "",
            notes: values.notes ?? "",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast({ title: "Update failed", description: err?.error ?? "Could not save your details.", variant: "destructive" });
          return;
        }
        toast({ title: "Details saved", description: "Your contact and address details have been updated." });
      } catch {
        toast({ title: "Update failed", description: "Could not save. Please try again.", variant: "destructive" });
        return;
      }
    }

    setCurrentStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Helper: admin may store "Deep Cleaning, Basic Cleaning" or "Weekly, Monthly" – treat as list
  const listContains = (commaSeparated: string | null | undefined, value: string): boolean => {
    if (!value?.trim()) return false;
    if (!commaSeparated?.trim()) return true;
    const parts = commaSeparated.split(",").map((s) => s.trim()).filter(Boolean);
    return parts.some((p) => p === value.trim());
  };

  // Sum prices for all selected variable categories (Bedroom + Bathroom + Living Room + Sq Ft + Storage, etc.) from pricing parameters
  const getVariableCategoriesSubtotal = (serviceName: string) => {
    const selectedFrequency = serviceCustomization?.frequency?.trim() || "";
    if (allPricingParams.length === 0) return 0;
    const rawSvc = selectedService?.raw as { service_category_frequency?: boolean } | undefined;
    const useFreqVarDeps = Boolean(rawSvc?.service_category_frequency);
    const vc = serviceCustomization?.variableCategories ?? {};
    let sum = 0;
    let addedAreaLike = false;
    for (const [categoryKey, optionName] of Object.entries(vc)) {
      if (!optionName?.trim() || optionName.trim().toLowerCase() === "none") continue;
      if (useFreqVarDeps && pricingFrequencyDeps) {
        const allowed = frequencyDepOptionNamesForCategory(categoryKey, pricingFrequencyDeps);
        if (allowed !== null && !allowed.includes(optionName.trim())) continue;
      }
      const param = allPricingParams.find(
        (p) =>
          p.variable_category === categoryKey &&
          p.name === optionName &&
          pricingParamAppliesToSelection(
            {
              show_based_on_frequency: p.show_based_on_frequency,
              frequency: p.frequency,
              show_based_on_service_category: p.show_based_on_service_category,
              service_category: p.service_category,
            },
            selectedFrequency,
            serviceName,
          ),
      );
      if (param && typeof param.price === "number" && !Number.isNaN(param.price)) {
        sum += param.price;
        if (/sqft|area|square|meter|size/i.test(param.variable_category)) addedAreaLike = true;
      }
    }
    // Include squareMeters only if no area-like category was already added (avoids double-count)
    if (!addedAreaLike && serviceCustomization?.squareMeters?.trim()) {
      const sqName = serviceCustomization.squareMeters.trim();
      if (useFreqVarDeps && pricingFrequencyDeps) {
        const catKey =
          allPricingParams.find((p) =>
            /sqft|area|square|meter|size/i.test(p.variable_category),
          )?.variable_category ?? "Sq Ft";
        const allowed = frequencyDepOptionNamesForCategory(String(catKey), pricingFrequencyDeps);
        if (allowed !== null && !allowed.includes(sqName)) {
          return sum;
        }
      }
      const areaLikeParam = allPricingParams.find(
        (p) =>
          /sqft|area|square|meter|size/i.test(p.variable_category) &&
          p.name === sqName &&
          pricingParamAppliesToSelection(
            {
              show_based_on_frequency: p.show_based_on_frequency,
              frequency: p.frequency,
              show_based_on_service_category: p.show_based_on_service_category,
              service_category: p.service_category,
            },
            selectedFrequency,
            serviceName,
          ),
      );
      if (areaLikeParam && typeof areaLikeParam.price === "number" && !Number.isNaN(areaLikeParam.price)) {
        sum += areaLikeParam.price;
      }
    }
    return sum;
  };

  // Sum extra price × quantity for each selected extra (from industry extras, not hardcoded)
  const getExtrasSubtotal = () => {
    if (!serviceCustomization?.extras?.length || availableExtras.length === 0) return 0;
    let sum = 0;
    for (const item of serviceCustomization.extras) {
      if (item.name === "None") continue;
      const extra = availableExtras.find((e: any) => (e.name || "").trim() === (item.name || "").trim());
      if (!extra) continue;
      const qty = Math.max(1, Number(item.quantity) || 1);
      const { linePrice } = resolveQtyBasedExtraLine(
        {
          qty_based: extra.qty_based,
          pricing_structure: extra.pricing_structure,
          price: Number(extra.price) || 0,
          time_minutes: Number(extra.time_minutes) || 0,
          maximum_quantity: extra.maximum_quantity ?? null,
          manual_prices: extra.manual_prices ?? null,
        },
        qty,
      );
      sum += linePrice;
    }
    return sum;
  };

  // Get service price from industry form 1: pricing parameters (filtered by service + frequency) or service category price
  const getServicePrice = (serviceName: string) => {
    if (!selectedCategory) return 0;

    if (pricingRows.length > 0 && serviceCustomization) {
      const areaOption =
        serviceCustomization.squareMeters ||
        (serviceCustomization.variableCategories &&
          Object.values(serviceCustomization.variableCategories).find((v) =>
            pricingRows.some((tier) => tier.name === v)
          ));
      if (areaOption) {
        const applicableTiers = pricingRows.filter((tier) => {
          const matchesService =
            !tier.serviceCategoryFilter ||
            listContains(tier.serviceCategoryFilter, serviceName) ||
            (selectedService && (
              listContains(tier.serviceCategoryFilter, selectedService.name) ||
              tier.serviceCategoryFilter === selectedService.id ||
              (selectedService.raw && tier.serviceCategoryFilter === String((selectedService.raw as any).id))
            ));
          return matchesService && tier.name === areaOption;
        });
        const tier = applicableTiers[0] ?? pricingRows.find((t) => t.name === areaOption);
        if (tier && typeof tier.price === "number" && !Number.isNaN(tier.price)) {
          return tier.price;
        }
      }
    }

    // Hourly rate × duration (custom time from card; parameter time from estimated minutes)
    const service = serviceCategories.find((s) => s.name === serviceName);
    const raw = service?.raw as
      | {
          hourly_service?: {
            enabled?: boolean;
            price?: string;
            priceCalculationType?: string;
            countExtrasSeparately?: boolean;
          };
        }
      | undefined;
    const hs = raw?.hourly_service;
    if (hs?.enabled && hs.price && serviceCustomization) {
      const hourlyP = parseFloat(String(hs.price));
      if (!Number.isNaN(hourlyP) && hourlyP > 0) {
        const pct = hs.priceCalculationType ?? "customTime";
        if (pct === "customTime") {
          const cm = hourlyCustomTimeTotalMinutes({
            hourly: hs,
            bookingHours: serviceCustomization.bookingHours,
            bookingMinutes: serviceCustomization.bookingMinutes,
          });
          if (cm != null) return hourlyP * (cm / 60);
        } else {
          const mins = computeEstimatedMinutesForBooking(serviceName.trim());
          if (mins != null && mins > 0) return hourlyP * (mins / 60);
        }
      }
    }

    return service?.price ?? 0;
  };

  /** Totals aligned with admin AddBookingForm: partial → frequency discount → coupon → tax */
  function calculateTotal() {
    // Coupon + summary can run on the details step before `bookingData` exists (set only after Confirm Booking).
    // Pricing only needs the selected service + customization, same as the payment step.
    if (!serviceCustomization || !selectedService) {
      const z = {
        lineSubtotal: 0,
        effectiveServiceTotal: 0,
        extrasSubtotal: 0,
        partialCleaningDiscount: 0,
        frequencyDiscount: 0,
        baseBeforeCoupon: 0,
        couponDiscount: 0,
        discountedSubtotal: 0,
        tax: 0,
        total: 0,
        subtotal: 0,
      };
      return z;
    }
    const serviceName = String(bookingData?.service || selectedService.name || "").trim() || selectedService.name;
    const variableSubtotal = getVariableCategoriesSubtotal(serviceName);
    const hourlyCat = serviceCategories.find((s) => s.name === serviceName);
    const hourlyRaw = hourlyCat?.raw as
      | { hourly_service?: { enabled?: boolean; countExtrasSeparately?: boolean } }
      | undefined;
    const extrasSubtotal = hourlyExtrasBillableSubtotal({
      hourly: hourlyRaw?.hourly_service,
      extrasSubtotal: getExtrasSubtotal(),
    });
    const { effectiveServiceTotal } = computeEffectiveServiceAndExtras({
      variableSubtotal,
      extrasSubtotal,
      fallbackServicePrice: getServicePrice(serviceName),
      selectedServiceListPrice: selectedService.price,
    });
    const partialCleaningDiscount = computePartialCleaningDiscount(
      Boolean(serviceCustomization.isPartialCleaning),
      serviceCustomization.excludedAreas,
      serviceCustomization.excludeQuantities,
      excludeParametersList,
    );
    const selectedFreq = serviceCustomization.frequency?.trim() || "";
    const freqMeta = selectedFreq ? frequencyMetaByName[selectedFreq] : undefined;
    const frequencyDiscount = computeFrequencyDiscountAmount({
      freqMeta,
      effectiveServiceTotal,
      extrasTotal: extrasSubtotal,
      partialCleaningDiscount,
      isFirstAppointment: true,
    });
    const out = computeCustomerBookingTotals({
      effectiveServiceTotal,
      extrasSubtotal,
      partialCleaningDiscount,
      frequencyDiscount,
      taxRate: 0.08,
      getCouponDiscountAmount,
    });
    return { ...out, subtotal: out.lineSubtotal, effectiveServiceTotal, extrasSubtotal };
  }

  const applyCustomerCoupon = useCallback(async () => {
    const codeRaw = (form.getValues("couponCode") || "").trim();
    const currentBusinessId = searchParams.get("business") ?? null;
    if (!currentBusinessId) {
      toast({ title: "Business required", description: "Missing business context.", variant: "destructive" });
      return;
    }
    if (!codeRaw) {
      toast({ title: "Missing coupon", description: "Enter a coupon code first.", variant: "destructive" });
      return;
    }

    const couponRes = await fetch(
      `/api/guest/marketing-coupon?business_id=${encodeURIComponent(currentBusinessId)}&code=${encodeURIComponent(codeRaw)}`
    );
    if (!couponRes.ok) {
      setAppliedCoupon(null);
      toast({ title: "Invalid coupon", description: "Coupon not found or inactive.", variant: "destructive" });
      return;
    }
    const couponPayload = (await couponRes.json()) as {
      coupon?: {
        code: string;
        discount_type: string;
        discount_value: number;
        active: boolean;
        start_date: string | null;
        end_date: string | null;
        min_order: number | null;
        coupon_config: unknown;
      };
    };
    const data = couponPayload.coupon;
    if (!data) {
      setAppliedCoupon(null);
      toast({ title: "Invalid coupon", description: "Coupon not found or inactive.", variant: "destructive" });
      return;
    }

    const today = getTodayLocalDate();
    if (data.start_date && data.start_date > today) {
      setAppliedCoupon(null);
      toast({ title: "Coupon not started", description: "This coupon is not active yet.", variant: "destructive" });
      return;
    }
    if (data.end_date && data.end_date < today) {
      setAppliedCoupon(null);
      toast({ title: "Coupon expired", description: "This coupon has expired.", variant: "destructive" });
      return;
    }

    const baseBeforeCoupon = calculateTotal().baseBeforeCoupon;

    if (data.min_order != null && Number(data.min_order) > Number(baseBeforeCoupon || 0)) {
      setAppliedCoupon(null);
      toast({
        title: "Minimum order not met",
        description: `Coupon requires at least $${Number(data.min_order).toFixed(2)} after frequency and partial-cleaning discounts (before coupon).`,
        variant: "destructive",
      });
      return;
    }

    const emailForScope = String(form.getValues("email") || customerEmail || "").trim();
    if (couponRequiresCustomerEmailForScope(data.coupon_config)) {
      if (!emailForScope.includes("@")) {
        setAppliedCoupon(null);
        toast({
          title: "Email required",
          description: "Enter your email before applying this coupon. It’s used to verify new/existing customer rules and one-time use.",
          variant: "destructive",
        });
        return;
      }
      const scopeUrl = new URL("/api/guest/marketing-coupon-scope", window.location.origin);
      scopeUrl.searchParams.set("business_id", currentBusinessId);
      scopeUrl.searchParams.set("code", codeRaw);
      scopeUrl.searchParams.set("email", emailForScope);
      scopeUrl.searchParams.set("enforce_identity", "true");
      const {
        data: { session },
      } = await getSupabaseCustomerClient().auth.getSession();
      const scopeRes = await fetch(scopeUrl.toString(), {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      const scopeJson = (await scopeRes.json().catch(() => ({}))) as {
        ok?: boolean;
        title?: string;
        description?: string;
        error?: string;
      };
      if (!scopeRes.ok) {
        setAppliedCoupon(null);
        toast({
          title: "Could not verify coupon",
          description: scopeJson.error || "Please try again.",
          variant: "destructive",
        });
        return;
      }
      if (scopeJson.ok === false) {
        setAppliedCoupon(null);
        toast({
          title: scopeJson.title || "Coupon not available",
          description: scopeJson.description || "This coupon cannot be applied for this email.",
          variant: "destructive",
        });
        return;
      }
    }

    // Local calendar date only (same idea as AddBookingForm YYYY-MM-DD → Date(y, m-1, d))
    const rawDate = bookingData?.date ?? form.getValues("date");
    let bookingDateForCoupon: Date | null = null;
    if (rawDate) {
      const d = rawDate instanceof Date ? rawDate : new Date(rawDate as string | number);
      if (!Number.isNaN(d.getTime())) {
        bookingDateForCoupon = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
    }
    const customization = form.getValues("customization");
    const freqForCoupon = String(
      serviceCustomization?.frequency ?? customization?.frequency ?? ""
    ).trim();
    const zipNorm = String(form.getValues("zipCode") ?? "").trim().replace(/\s/g, "");
    const addrLine = String(form.getValues("address") ?? "").trim();
    const locationCandidate = [zipNorm, addrLine].filter(Boolean).join(" ").trim();

    let resolvedLocationLabels: string[] | undefined = undefined;
    if (
      shouldEnforceMarketingCouponLocationSubset(data.coupon_config, selectedIndustryLabel) &&
      currentBusinessId &&
      selectedIndustryId &&
      (locationManagement === "zip" || locationManagement === "name")
    ) {
      const zipFieldRaw = String(form.getValues("zipCode") ?? "").trim();
      const minLen = locationManagement === "name" ? 2 : 5;
      const inputForApi = locationManagement === "zip" ? zipNorm : zipFieldRaw;
      if (inputForApi.replace(/\s/g, "").length >= minLen) {
        try {
          const params = new URLSearchParams({
            business_id: currentBusinessId,
            industry_id: selectedIndustryId,
            input: inputForApi,
            mode: locationManagement,
          });
          const res = await fetch(`/api/guest/resolve-industry-locations-for-zip?${params.toString()}`);
          if (res.ok) {
            const j = (await res.json()) as { labels?: string[] };
            resolvedLocationLabels = Array.isArray(j.labels) ? j.labels : [];
          }
        } catch {
          resolvedLocationLabels = undefined;
        }
      } else {
        resolvedLocationLabels = [];
      }
    }

    const gate = getMarketingCouponGateFailure(data.coupon_config, {
      industryLabel: selectedIndustryLabel,
      serviceName: String(form.getValues("service") || bookingData?.service || selectedService?.name || "").trim(),
      bookingDate: bookingDateForCoupon,
      frequencyLabel: freqForCoupon,
      locationCandidate,
      resolvedLocationLabels,
    });
    if (gate) {
      setAppliedCoupon(null);
      toast({ title: gate.title, description: gate.description, variant: "destructive" });
      return;
    }

    const discountType: "percentage" | "fixed" = data.discount_type === "percentage" ? "percentage" : "fixed";
    const discountValue = Number(data.discount_value) || 0;
    if (discountValue <= 0) {
      setAppliedCoupon(null);
      toast({ title: "Invalid coupon", description: "Coupon discount value is invalid.", variant: "destructive" });
      return;
    }

    const normalizedCode = (data.code || codeRaw).trim();
    setAppliedCoupon({ code: normalizedCode, discountType, discountValue });
    const discountAmount =
      discountType === "percentage"
        ? Math.max(0, Math.min(baseBeforeCoupon, (baseBeforeCoupon * discountValue) / 100))
        : Math.max(0, Math.min(baseBeforeCoupon, discountValue));
    toast({
      title: "Coupon applied",
      description: `${normalizedCode} applied: -$${discountAmount.toFixed(2)}`,
    });
  }, [
    form,
    searchParams,
    toast,
    customerEmail,
    bookingData,
    selectedService,
    serviceCustomization,
    selectedIndustryLabel,
    selectedIndustryId,
    locationManagement,
    frequencyMetaByName,
    excludeParametersList,
    getVariableCategoriesSubtotal,
    getExtrasSubtotal,
    getServicePrice,
    getCouponDiscountAmount,
  ]);

  // Handle cash payment
  const handleCashPayment = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const saved = await addBookingToStorage();
      if (!saved) return;
      toast({
        title: "Booking Confirmed!",
        description: "You've selected cash payment. Please have the exact amount ready on the service date.",
      });
      setCurrentStep("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /** usePendingIntent: false when migration 093 is missing — falls back to creating the booking before Stripe. */
  const createDraftBookingForStripe = useCallback(async (): Promise<{
    id: string;
    usePendingIntent: boolean;
  } | null> => {
    if (!bookingData || !serviceCustomization || !selectedService) return null;
    if (!limitedEditMode && locationManagement !== "none" && !locationInputValidForBooking) {
      if (!locationInputMeetsMinLength) {
        toast({
          title: "Service area required",
          description:
            locationManagement === "zip"
              ? "Enter a valid zip code we serve before completing your booking."
              : "Enter your city or town before completing your booking.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Outside service area",
          description:
            locationManagement === "zip"
              ? "That zip code is not in our service area. Go back and update it before paying."
              : "That location is not in our service area. Go back and update it before paying.",
          variant: "destructive",
        });
      }
      return null;
    }
    const bookingDate = bookingData.date instanceof Date ? bookingData.date : new Date(bookingData.date);
    let formattedDate: string;
    if (Number.isNaN(bookingDate.getTime())) {
      const today = new Date();
      formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    } else {
      formattedDate = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, "0")}-${String(bookingDate.getDate()).padStart(2, "0")}`;
    }
    const newBooking: Booking = {
      id: `CB-${Date.now().toString(36).toUpperCase()}`,
      service: selectedService.name,
      provider: "",
      frequency: serviceCustomization.frequency || "One-time",
      date: formattedDate,
      time: bookingData.time,
      status: "scheduled",
      address: bookingData.aptNo ? `${bookingData.address}, Apt ${bookingData.aptNo}` : bookingData.address,
      contact: String(bookingData.phone),
      notes: bookingData.notes ?? "",
      price: selectedService.price ?? 0,
      tipAmount: undefined,
      tipUpdatedAt: undefined,
      customization: {
        frequency: serviceCustomization.frequency,
        squareMeters: serviceCustomization.squareMeters,
        bedroom: serviceCustomization.bedroom,
        bathroom: serviceCustomization.bathroom,
        extras: serviceCustomization.extras?.length ? formatExtrasForStorage(serviceCustomization.extras) : ["None"],
        isPartialCleaning: serviceCustomization.isPartialCleaning,
        excludedAreas: serviceCustomization.excludedAreas,
        excludeQuantities: serviceCustomization.excludeQuantities ?? {},
        variableCategories: serviceCustomization.variableCategories ?? {},
        bookingHours: serviceCustomization.bookingHours ?? "0",
        bookingMinutes: serviceCustomization.bookingMinutes ?? "0",
      },
    };
    const currentBusinessId = searchParams.get("business") ?? null;
    if (!currentBusinessId) return null;
    try {
      const supabase = getSupabaseCustomerClient();
      const { data: { session } } = await supabase.auth.getSession();
      const isLoggedIn = Boolean(session?.access_token);
      const basePath = isLoggedIn ? "/api/customer/bookings" : "/api/guest/bookings";
      const headers: Record<string, string> = { "Content-Type": "application/json", "x-business-id": currentBusinessId };
      if (isLoggedIn) headers.Authorization = `Bearer ${session!.access_token}`;
      const tot = calculateTotal();
      const amountToSend =
        (Number(tot.total) > 0 ? tot.total : null) ?? (Number(tot.subtotal) > 0 ? tot.subtotal : null) ?? Number(selectedService?.price ?? 0);
      const selectedProviderId = showProviderStep ? (form.getValues("provider") || null) : null;
      const selectedProviderObj = selectedProviderId ? availableProviders.find((p: any) => p.id === selectedProviderId) : null;
      const selectedFreq = serviceCustomization.frequency || newBooking.frequency || "";
      const isRecurringFreq =
        !!selectedFreq &&
        String(selectedFreq).toLowerCase().replace(/\s+/g, " ") !== "one-time" &&
        String(selectedFreq).toLowerCase().replace(/\s+/g, "") !== "onetime";
      const estimatedDurationMinsStripe = getEstimatedDurationMinutes();
      const keyAccessStripe = form.getValues("keyAccess") ?? { primary_option: "someone_home" as const, keep_key: false };
      const keyPrimaryStripe =
        keyAccessStripe.primary_option === "hide_keys" ? ("hide_keys" as const) : ("someone_home" as const);
      const jobNoteStripe = String(form.getValues("customerNoteForProvider") ?? "").trim();
      const payload = {
        business_id: currentBusinessId,
        industry_id: selectedIndustryId || undefined,
        service_area_input: String(form.getValues("zipCode") ?? bookingData.zipCode ?? "").trim(),
        customer_name: `${bookingData.firstName ?? ""} ${bookingData.lastName ?? ""}`.trim(),
        customer_email: bookingData.email ?? "",
        customer_phone: String(bookingData.phone ?? ""),
        address: newBooking.address,
        service: newBooking.service,
        frequency: selectedFreq || null,
        date: formattedDate,
        time: newBooking.time,
        status: "pending",
        amount: amountToSend,
        total: tot.total,
        subtotal: tot.subtotal,
        notes: newBooking.notes ?? "",
        payment_method: "online",
        provider_id: selectedProviderId || undefined,
        provider_name: selectedProviderObj?.name ?? undefined,
        ...(estimatedDurationMinsStripe != null ? { duration_minutes: estimatedDurationMinsStripe } : {}),
        ...(storeDefaultProviderWage
          ? {
              provider_wage: storeDefaultProviderWage.wage,
              provider_wage_type: storeDefaultProviderWage.type,
            }
          : {}),
        customization: {
          ...(newBooking.customization ?? {}),
          key_access: { primary_option: keyPrimaryStripe, keep_key: Boolean(keyAccessStripe.keep_key) },
          ...(jobNoteStripe ? { customer_note_for_provider: jobNoteStripe } : {}),
          pricing_summary: serializePricingSummaryForCustomization(tot),
          ...(appliedCoupon
            ? {
                coupon: {
                  code: appliedCoupon.code,
                  discount_type: appliedCoupon.discountType,
                  discount_value: appliedCoupon.discountValue,
                  discount_amount: tot.couponDiscount,
                },
              }
            : {}),
        },
        coupon_code: appliedCoupon?.code,
        coupon_discount_type: appliedCoupon?.discountType,
        coupon_discount_value: appliedCoupon?.discountValue,
        coupon_discount_amount: appliedCoupon ? tot.couponDiscount : undefined,
        ...(isRecurringFreq
          ? {
              create_recurring: true,
              recurring_occurrences_ahead: 8,
              ...(frequencyMetaByName[selectedFreq]?.frequency_repeats
                ? { frequency_repeats: frequencyMetaByName[selectedFreq].frequency_repeats }
                : {}),
            }
          : {}),
      };

      const parseRes = async (r: Response) => {
        const t = await r.text();
        let d: Record<string, unknown> = {};
        try {
          d = t ? (JSON.parse(t) as Record<string, unknown>) : {};
        } catch {
          d = {};
        }
        return { ok: r.ok, status: r.status, data: d, rawText: t };
      };

      let usePendingIntent = paymentProvider === "stripe";
      let res = await fetch(
        usePendingIntent ? `${basePath}?stripe_intent=1` : basePath,
        { method: "POST", headers, body: JSON.stringify(payload) }
      );
      let { ok, status, data, rawText } = await parseRes(res);

      const intentFailed =
        usePendingIntent && !ok && data.error === "CHECKOUT_INTENT_FAILED";

      if (intentFailed) {
        res = await fetch(basePath, { method: "POST", headers, body: JSON.stringify(payload) });
        ({ ok, status, data, rawText } = await parseRes(res));
        usePendingIntent = false;
      }

      if (ok) {
        const saved = (data.data ?? data.booking ?? data) as { id?: string } | undefined;
        const id = saved?.id ?? (typeof data.id === "string" ? data.id : null);
        if (id) {
          if (paymentProvider === "stripe" && !usePendingIntent) {
            toast({
              title: "Checkout started",
              description:
                "Bookings are created before payment until you apply database migration 093_pending_stripe_booking_intents.sql. After that, the booking is created only after payment succeeds.",
              duration: 8000,
            });
          }
          return { id, usePendingIntent };
        }
      }

      const isBlocked = status === 403 && data?.error === "BOOKING_BLOCKED" && data?.message;
      const msg = isBlocked
        ? String(data.message)
        : (typeof data === "object" ? String(data.error ?? data.message ?? "") : "") || rawText;
      toast({
        title: isBlocked ? "Booking not available" : "Error",
        description: msg || `Save failed (${status})`,
        variant: "destructive",
      });
      return null;
    } catch (err) {
      console.warn("createDraftBookingForStripe failed", err);
      toast({ title: "Error", description: "Failed to create booking. Please try again.", variant: "destructive" });
      return null;
    }
  }, [
    bookingData,
    serviceCustomization,
    selectedService,
    searchParams,
    form,
    availableProviders,
    showProviderStep,
    appliedCoupon,
    getCouponDiscountAmount,
    storeDefaultProviderWage,
    paymentProvider,
    frequencyMetaByName,
    excludeParametersList,
    getEstimatedDurationMinutes,
    selectedIndustryId,
    limitedEditMode,
    locationManagement,
    locationInputValidForBooking,
    locationInputMeetsMinLength,
    toast,
    form,
  ]);

  // Handle online payment via Stripe Checkout (redirect)
  const handleOnlinePayment = async (_values?: z.infer<typeof paymentSchema>) => {
    setIsProcessing(true);
    try {
      const draft = await createDraftBookingForStripe();
      if (!draft) return;
      const { subtotal, tax, total } = calculateTotal();
      const amountInCents = Math.round(total * 100);
      if (amountInCents < 50) {
        toast({ title: "Invalid amount", description: "Minimum charge is $0.50.", variant: "destructive" });
        return;
      }
      const businessId = searchParams.get("business") ?? "";
      const checkoutPayload =
        paymentProvider === "stripe" && draft.usePendingIntent
          ? {
              pendingStripeBookingIntentId: draft.id,
              amountInCents,
              customerEmail: undefined,
              businessId: businessId || undefined,
              lineItemDescription: `${selectedService?.customerDisplayName?.trim() || selectedService?.name || "Booking"} – ${bookingData?.date ? format(bookingData.date instanceof Date ? bookingData.date : new Date(bookingData.date), "PPP") : ""}`,
            }
          : {
              bookingId: draft.id,
              amountInCents,
              customerEmail: undefined,
              businessId: businessId || undefined,
              lineItemDescription: `${selectedService?.customerDisplayName?.trim() || selectedService?.name || "Booking"} – ${bookingData?.date ? format(bookingData.date instanceof Date ? bookingData.date : new Date(bookingData.date), "PPP") : ""}`,
            };
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutPayload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const desc = [json.error, json.details].filter(Boolean).join(" — ") || "Payment request failed. Please try again or pay on arrival.";
        toast({
          title: "Payment setup failed",
          description: desc,
          variant: "destructive",
        });
        return;
      }
      const url = json.url;
      if (url) {
        window.location.href = url;
        return;
      }
      toast({
        title: "Payment link not available",
        description: "Please try again or pay on arrival.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "Your payment could not be processed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Category Selection Screen
  if (currentStep === "category") {
    const hasBusinessParam = Boolean(searchParams.get("business"));
    const categoriesAvailable = industryOptions.length > 0;
    return (
      <div className="min-h-screen">
        <Navigation branding={bookNowNavigationProps.branding} headerData={bookNowNavigationProps.headerData} />
        <div className={styles.bookingContainer}>
          <div className="container mx-auto px-4 py-16 max-w-4xl">
            <div className={styles.header}>
              <h1 className={styles.title}>Select Service Category</h1>
              <p className={styles.subtitle}>
                {categoriesAvailable
                  ? "Choose from the industries you've enabled in your admin dashboard."
                  : hasBusinessParam
                    ? "Add industries in your admin dashboard to display them here."
                    : "Use the booking link from your service provider's website to see their services."}
              </p>
            </div>

            {categoriesAvailable ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                {industryOptions.map((option) => {
                  const detail = industryDetails[option.key];
                  const IconComponent = detail?.Icon ?? Building2;
                  const description = detail?.description ?? `Professional ${option.label} services tailored to your clients.`;
                  const isSelected = selectedCategory === option.key;
                  return (
                    <div
                      key={option.key}
                      onClick={() => handleCategorySelect(option.key)}
                      className={`${styles.categoryCard} ${isSelected ? styles.selected : ""}`}
                    >
                      <div className={styles.categoryIcon}>
                        <IconComponent className="h-12 w-12" />
                      </div>
                      <h3 className={styles.categoryTitle}>{option.label}</h3>
                      <p className={styles.categoryDescription}>{description}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-12 rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/60 p-8 text-center">
                <p className="text-base text-slate-600">
                  {hasBusinessParam
                    ? "No industries have been added yet. Visit the admin dashboard to add industries so they appear here for customers."
                    : "No booking context. Please open the Book Now link from your service provider's website so we can show their available services."}
                </p>
                {hasBusinessParam && (
                  <Button asChild variant="outline" className="mt-4">
                    <Link href="/admin/settings/industries">Go to Industries Settings</Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success Screen
  if (currentStep === "success") {
    return (
      <div className="min-h-screen">
        <Navigation branding={bookNowNavigationProps.branding} headerData={bookNowNavigationProps.headerData} />
        <div className={styles.bookingContainer}>
          <div className="container mx-auto px-4 py-16 max-w-4xl">
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>
                <CheckCircle size={48} />
              </div>
              <h2 className={styles.successTitle}>Booking Confirmed!</h2>
              <p className={styles.successText}>
                Thanks for booking with us. We’re sending you back to your appointments dashboard…
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Payment Screen
  if (currentStep === "payment" && bookingData && selectedService && serviceCustomization) {
    const {
      effectiveServiceTotal,
      extrasSubtotal,
      partialCleaningDiscount,
      frequencyDiscount,
      couponDiscount,
      tax,
      total,
    } = calculateTotal();
    summaryTotalRef.current = total;
    const bid = searchParams.get("business");
    const paymentFreqLabel = serviceCustomization.frequency?.trim() || "";
    const paymentFreqMeta = paymentFreqLabel ? frequencyMetaByName[paymentFreqLabel] : undefined;
    const paymentIsRecurring = paymentFreqMeta?.occurrence_time === "recurring";
    const paymentLengthMins = getEstimatedDurationMinutes();
    const paymentDisplayLength =
      paymentLengthMins == null
        ? "—"
        : (() => {
            const m = Math.round(paymentLengthMins);
            const hrs = Math.floor(m / 60);
            const rem = m % 60;
            return hrs > 0 ? `${hrs} Hr${rem > 0 ? ` ${rem} Min` : ""}` : `${m} Min`;
          })();

    return (
      <div className="min-h-screen">
        <Navigation branding={bookNowNavigationProps.branding} headerData={bookNowNavigationProps.headerData} />
        <div className={styles.bookingContainer}>
          <div className="container mx-auto px-4 py-16 max-w-6xl">
            <div className={styles.header}>
              <h1 className={styles.title}>Complete Your Payment</h1>
              <p className={styles.subtitle}>
                {limitedEditMode ? "Your details have been saved. Update your payment method below or return to your appointments." : "Review your booking and complete payment"}
              </p>
            </div>

            {limitedEditMode && (
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <Button variant="outline" asChild>
                  <Link href={bid ? `/customer/appointments?business=${bid}` : "/customer/appointments"}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to appointments
                  </Link>
                </Button>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              {/* Booking + payment summaries (aligned with admin Add Booking sidebar) */}
              <div className="md:col-span-1 space-y-4 lg:sticky lg:top-4 lg:self-start">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Industry</span>
                      <span className="font-medium text-right max-w-[180px]">
                        {selectedIndustryLabel || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-medium text-right max-w-[180px]">
                        {selectedService.customerDisplayName?.trim() || selectedService.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frequency</span>
                      <span className="font-medium text-right max-w-[180px]">
                        {serviceCustomization.frequency || "Not selected"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Length</span>
                      <span className="font-medium">{paymentDisplayLength}</span>
                    </div>
                    {paymentIsRecurring && paymentFreqMeta?.frequency_repeats && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Repeats</span>
                        <span className="text-muted-foreground">
                          {formatFrequencyRepeatsForDisplay(paymentFreqMeta.frequency_repeats)}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-3 mt-1 space-y-2 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground text-sm">Schedule & location</p>
                      <div className="flex justify-between gap-2">
                        <span>Service date</span>
                        <span className="font-medium text-foreground text-right">{format(bookingData.date, "PPP")}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Arrival time</span>
                        <span className="font-medium text-foreground">{bookingData.time}</span>
                      </div>
                      <div className="flex justify-between gap-2 items-start">
                        <span className="shrink-0">Location</span>
                        <span className="font-medium text-foreground text-right">
                          {bookingData.aptNo
                            ? `${bookingData.address}, Apt ${bookingData.aptNo}`
                            : bookingData.address}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payment Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Total</span>
                      <span className="font-medium">${effectiveServiceTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Extras Total</span>
                      <span className="font-medium">${extrasSubtotal.toFixed(2)}</span>
                    </div>
                    {partialCleaningDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Partial Cleaning Discount</span>
                        <span className="font-medium text-green-600">-${partialCleaningDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {frequencyDiscount > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequency Discount</span>
                        <span className="font-medium text-green-600">-${frequencyDiscount.toFixed(2)}</span>
                      </div>
                    ) : paymentIsRecurring &&
                      paymentFreqMeta?.frequency_discount === "exclude-first" &&
                      paymentFreqMeta?.discount != null &&
                      Number(paymentFreqMeta.discount) > 0 ? (
                      <div className="flex justify-between text-xs">
                        <span className="text-amber-600">Frequency Discount (Applied from 2nd booking)</span>
                        <span className="text-amber-600">
                          {(paymentFreqMeta.discount_type ?? "%") === "%" ||
                          String(paymentFreqMeta.discount_type ?? "").toLowerCase() === "percentage"
                            ? `${paymentFreqMeta.discount}%`
                            : `$${Number(paymentFreqMeta.discount).toFixed(2)}`}
                        </span>
                      </div>
                    ) : null}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Coupon Discount</span>
                        <span className="font-medium text-green-600">-${couponDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">${tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2" />
                    <div className="flex justify-between font-semibold text-base">
                      <span>TOTAL</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="rounded-lg border bg-card px-4 py-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Cancellation disclaimer
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cancellationPolicyDisclaimer ??
                      "Based on our cancellation policy, a fee may apply if you cancel within the policy window."}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setCurrentStep("details")} className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Details
                </Button>
              </div>

              {/* Payment via Stripe or Authorize.net (per business setting) */}
              <div className="md:col-span-2">
                <div className={styles.paymentCard}>
                  <h3 className={styles.paymentTitle}>
                    Pay securely with {paymentProvider === "authorize_net" ? "Authorize.net" : "Stripe"}
                  </h3>
                  <div className={styles.securityBadge}>
                    <Lock className="h-4 w-4" />
                    <span>
                      Secure payment – you&apos;ll complete payment on {paymentProvider === "authorize_net" ? "Authorize.net" : "Stripe"}&apos;s checkout page
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {paymentProvider === "stripe" ? (
                      <>
                        After you click below, you&apos;ll go to Stripe to pay.{" "}
                        <strong>Your booking is only created after payment succeeds.</strong> If you leave checkout without paying, nothing is reserved.
                      </>
                    ) : (
                      <>
                        After you click below, we&apos;ll create your booking and send you to Authorize.net to enter your card details. Your booking is
                        confirmed once payment succeeds.
                      </>
                    )}
                  </p>
                  <Button
                    type="button"
                    disabled={
                      isProcessing ||
                      (!limitedEditMode &&
                        locationManagement !== "none" &&
                        !locationInputValidForBooking)
                    }
                    onClick={() => handleOnlinePayment()}
                    className="w-full h-12 text-base mt-6"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Preparing checkout...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Pay ${total.toFixed(2)} with {paymentProvider === "authorize_net" ? "Authorize.net" : "Stripe"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Booking Details Form
  if (currentStep === "details" && selectedCategory) {
    const showSummary = selectedService && serviceCustomization;
    const { subtotal, tax, total } = showSummary ? calculateTotal() : { subtotal: 0, tax: 0, total: 0 };
    
    return (
      <div className="min-h-screen">
        <Navigation branding={bookNowNavigationProps.branding} headerData={bookNowNavigationProps.headerData} />
        <div className={styles.bookingContainer}>
          <div className="container mx-auto px-4 py-16 max-w-6xl">
            <div className={styles.header}>
              <h1 className={styles.title}>
                {limitedEditMode ? "Edit your booking details" : `${selectedIndustryLabel || "Service"} Booking`}
              </h1>
              <p className={styles.subtitle}>
                {limitedEditMode
                  ? "You can only change your customer details and payment method. To reschedule date or time, please contact us."
                  : showSummary
                    ? `Complete your booking details for ${selectedService.customerDisplayName?.trim() || selectedService.name}`
                    : "Select a service type and fill out your booking details"
                }
              </p>
            </div>

            {limitedEditMode && rescheduleMessageLimitedEdit && (
              <div
                className="rounded-lg border border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/30 p-4 mb-6 text-sm text-amber-900 dark:text-amber-100"
                dangerouslySetInnerHTML={{ __html: rescheduleMessageLimitedEdit }}
              />
            )}

            {/* Location input - Zip/Postal code or City/Town (based on store location settings) */}
            {!limitedEditMode && locationManagement !== "none" && (
              <div className="mb-6">
                <Form {...form}>
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem className={styles.formGroup}>
                        <FormLabel className={styles.formLabel}>
                          {locationManagement === "name" ? "Enter city or town name" : "Enter Zip Code"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            className={styles.formInput}
                            placeholder={locationManagement === "name" ? "City or town name" : "Zip Code"}
                            maxLength={locationManagement === "name" ? 80 : 10}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              const val = String(e.target.value ?? "").trim().replace(/\s/g, "");
                              const minLen = locationManagement === "name" ? 2 : 5;
                              if (val.length >= minLen) refetchFrequenciesOnZipChange();
                            }}
                            onBlur={(e) => {
                              field.onBlur();
                              form.trigger("zipCode");
                              refetchFrequenciesOnZipChange();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </div>
            )}

            {/* Service Type Selection - hidden in limited edit (details + payment only) */}
            {!limitedEditMode && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Select Services</h2>
              {serviceCategoriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                </div>
              ) : categoryServicesForForm.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {categoryServicesForForm.map((service) => (
                    <FrequencyAwareServiceCard
                      key={service.id}
                      service={service}
                      isSelected={selectedService?.id === service.id || selectedService?.name === service.name}
                      onSelect={handleServiceSelect}
                      flippedCardId={flippedCardId}
                      onFlip={handleCardFlip}
                      customization={getCardCustomization(service.id)}
                      onCustomizationChange={handleCustomizationChange}
                      customizeLayout="expandedFlip"
                      industryId={selectedIndustryId}
                      businessId={businessIdFromUrl}
                      serviceCategory={service.raw}
                      availableExtras={availableExtras}
                      availableVariables={buildCustomerAvailableVariables(
                        pricingParametersFull,
                        { name: service.name, raw: service.raw },
                        getCardCustomization(service.id).frequency?.trim() ||
                          bookingFrequencyForFilters ||
                          "",
                      )}
                      frequencyOptions={frequencyOptions}
                      frequencyMetaByName={frequencyMetaByName}
                      bookingPopupSurface={bookingPopupSurface}
                      pricingVariableDefinitions={industryPricingVariables}
                    />
                  ))}
                </div>
              ) : needsLocationBeforeServices ? (
                <div className="flex flex-col gap-1 rounded-md border border-input bg-muted/50 px-3 py-4 text-sm text-muted-foreground">
                  <span>
                    {locationManagement === "name"
                      ? "Enter your city or town above to see available services."
                      : "Enter zip code above to see available services."}
                  </span>
                  <p className="text-xs">Services follow your location, matching admin booking.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/70 p-8 text-center">
                  <p className="text-base text-slate-600">
                    Services for {selectedIndustryLabel || "this industry"} haven’t been configured yet. Please add service offerings in the admin dashboard.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => setCurrentStep("category")}>
                    Choose another industry
                  </Button>
                </div>
              )}
            </div>
            )}

            {/* Customer Information Form - visible below service cards, or only section in limited edit */}
            {(limitedEditMode || categoryServicesForForm.length > 0) && (
              <div id="customer-form" className={styles.formContainer}>
                <h2 className="text-2xl font-bold mb-6">Customer Information</h2>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* First Name Field */}
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem className={styles.formGroup}>
                            <FormLabel className={styles.formLabel}>First Name</FormLabel>
                            <FormControl>
                              <Input
                                className={styles.formInput}
                                placeholder="Enter First name"
                                {...field}
                                onBlur={(e) => {
                                  field.onBlur();
                                  form.trigger("firstName");
                                }}
                                disabled={isAccountLocked}
                                readOnly={isAccountLocked}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Last Name Field */}
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem className={styles.formGroup}>
                            <FormLabel className={styles.formLabel}>Last Name</FormLabel>
                            <FormControl>
                              <Input
                                className={styles.formInput}
                                placeholder="Enter Lastname"
                                {...field}
                                onBlur={(e) => {
                                  field.onBlur();
                                  form.trigger("lastName");
                                }}
                                disabled={isAccountLocked}
                                readOnly={isAccountLocked}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Email Field */}
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className={styles.formGroup}>
                            <FormLabel className={styles.formLabel}>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                className={styles.formInput}
                                placeholder="name@example.com"
                                {...field}
                                onBlur={(e) => {
                                  field.onBlur();
                                  form.trigger("email");
                                }}
                                disabled={isAccountLocked}
                                readOnly={isAccountLocked}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Phone + Reminder Column */}
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem className={styles.formGroup}>
                              <FormLabel className={styles.formLabel}>Phone Number</FormLabel>
                              <FormControl>
                                <PhoneField
                                  hideLabel
                                  showHelperText={false}
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  disabled={isAccountLocked}
                                  placeholder="Phone No."
                                  containerClassName="space-y-0"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">{PHONE_FIELD_HELPER_TEXT}</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="reminderOptIn"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-4 w-4" />
                              </FormControl>
                              <FormLabel className="text-sm">Send me reminders about my booking via text messages.</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Secondary Phone Field */}
                      <FormField
                        control={form.control}
                        name="secondaryPhone"
                        render={({ field }) => (
                          <FormItem className={styles.formGroup}>
                            <FormLabel className={styles.formLabel}>Secondary Phone (Optional)</FormLabel>
                            <FormControl>
                              <PhoneField
                                hideLabel
                                showHelperText={false}
                                value={field.value || ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                placeholder="Phone No."
                                containerClassName="space-y-0"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">{PHONE_FIELD_HELPER_TEXT}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Secondary Email Field */}
                      <FormField
                        control={form.control}
                        name="secondaryEmail"
                        render={({ field }) => (
                          <FormItem className={styles.formGroup}>
                            <FormLabel className={styles.formLabel}>Secondary Email (Optional)</FormLabel>
                            <FormControl>
                              <Input type="email" className={styles.formInput} placeholder="alternate@example.com" {...field} 
                                onBlur={(e) => {
                                  field.onBlur();
                                  form.trigger("secondaryEmail");
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Address Preference */}
                    <div className="col-span-full">
                        <FormField
                          control={form.control}
                          name="addressPreference"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={styles.formLabel}>Address Preference</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex flex-wrap gap-6"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="existing" id="use-existing-address" disabled={!existingAddressAvailable} />
                                    <label htmlFor="use-existing-address" className="text-sm font-medium">
                                      Use Existing Address
                                      {!existingAddressAvailable && (
                                        <span className="block text-xs text-muted-foreground">No saved address yet</span>
                                      )}
                                    </label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="new" id="use-new-address" />
                                    <label htmlFor="use-new-address" className="text-sm font-medium">
                                      Use New Address
                                    </label>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      
                      {/* Address and Apt Number Fields - Same Line */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Address Field */}
                        <div className="md:col-span-8">
                          <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem className={styles.formGroup}>
                                <FormLabel className={styles.formLabel}>Address</FormLabel>
                                <FormControl>
                                  <Input
                                    className={styles.formInput}
                                    placeholder="123 Main St, Chicago, IL"
                                    {...field}
                                    onBlur={(e) => {
                                      field.onBlur();
                                      form.trigger("address");
                                    }}
                                    disabled={disableAddressFields}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Apt Number Field */}
                        <div className="md:col-span-4">
                          <FormField
                            control={form.control}
                            name="aptNo"
                            render={({ field }) => (
                              <FormItem className={styles.formGroup}>
                                <FormLabel className={styles.formLabel}>Apt. No. (Optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    className={styles.formInput}
                                    placeholder="Unit 3B"
                                    {...field}
                                    onBlur={(e) => {
                                      field.onBlur();
                                      form.trigger("aptNo");
                                    }}
                                    // Always enabled for editing
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Date Picker - hidden in limited edit (details + payment only) */}
                      {!limitedEditMode && (
                      <div className="col-span-full">
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className={styles.formLabel}>Select Date</FormLabel>
                              {bookingDateWeekdayRule.allowed && bookingDateWeekdayRule.allowed.length > 0 && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  This matches your provider&apos;s <strong>Frequency repeats every</strong> setting: only{" "}
                                  {bookingCalendarWeekdayPhrase(bookingDateWeekdayRule.allowed)} are available. Other
                                  weekdays are disabled.
                                </p>
                              )}
                              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn("pl-3 text-left font-normal h-12", !field.value && "text-muted-foreground")}
                                    >
                                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className={styles.calendarWrapper} align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={(date) => {
                                      field.onChange(date);
                                      setCalendarOpen(false);
                                    }}
                                    disabled={(date) => {
                                      // Compare dates using local timezone (ignore time component)
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      const compareDate = new Date(date);
                                      compareDate.setHours(0, 0, 0, 0);
                                      if (compareDate < today || compareDate < new Date("1900-01-01")) {
                                        return true;
                                      }
                                      const allowed = bookingDateWeekdayRule.allowed;
                                      if (allowed?.length && !allowed.includes(compareDate.getDay())) {
                                        return true;
                                      }
                                      return false;
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      )}

                      {/* Time Selection - Only show after date is selected (hidden in limited edit) */}
                      {!limitedEditMode && isDateSelected && (
                        <div className="col-span-full">
                          <FormField
                            control={form.control}
                            name="time"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={styles.formLabel}>Select Time Slot</FormLabel>
                                <div className={styles.timeSlots}>
                                  {(dynamicTimeSlots.length > 0 ? dynamicTimeSlots : DEFAULT_TIME_SLOTS).map((time) => (
                                    <div
                                      key={time}
                                      className={cn(styles.timeSlot, field.value === time && styles.selected)}
                                      onClick={() => field.onChange(time)}
                                    >
                                      {time}
                                    </div>
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {/* Available Providers - hidden in limited edit */}
                      {!limitedEditMode && isDateTimeSelected && showProviderStep && (
                        <div className="col-span-full">
                          <div className={styles.formGroup}>
                            <FormLabel className={styles.formLabel}>
                              Available Providers
                              <span className="text-muted-foreground text-sm font-normal block mt-1">
                                {providersLoading 
                                  ? "Finding available providers..." 
                                  : availableProviders.length > 0 
                                    ? selectedProvider
                                      ? `${availableProviders.length} provider${availableProviders.length === 1 ? '' : 's'} available • ${availableProviders.find(p => p.id === selectedProvider)?.name || 'Provider'} selected`
                                      : `${availableProviders.length} provider${availableProviders.length === 1 ? '' : 's'} available`
                                    : "No providers available for the selected time"
                                }
                              </span>
                            </FormLabel>
                            
                            {providersLoading ? (
                              <div className="flex items-center justify-center py-8 border border-gray-200 rounded-lg">
                                <Loader2 className="h-6 w-6 animate-spin text-cyan-500 mr-2" />
                                <span className="text-muted-foreground">Loading providers...</span>
                              </div>
                            ) : availableProviders.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                                {availableProviders.map((provider) => (
                                  <div 
                                    key={provider.id} 
                                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                      selectedProvider === provider.id 
                                        ? 'border-cyan-500 bg-cyan-50 shadow-md' 
                                        : 'border-gray-200 hover:border-cyan-300 hover:shadow-sm'
                                    }`}
                                    onClick={() => handleProviderSelect(provider)}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                                        <p className="text-sm text-gray-600">{provider.specialization || 'Service Provider'}</p>
                                      </div>
                                      <div className="flex items-center">
                                        {showProviderScoreToCustomers && (
                                          <div className="flex items-center mr-2">
                                            <span className="text-yellow-400">★</span>
                                            <span className="text-sm text-gray-600 ml-1">
                                              {provider.rating ? provider.rating.toFixed(1) : 'New'}
                                            </span>
                                          </div>
                                        )}
                                        {showProviderAvailabilityToCustomers && provider.isAvailable && (
                                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        )}
                                        {selectedProvider === provider.id && (
                                          <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center ml-2">
                                            <CheckCircle className="w-3 h-3 text-white" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-1 text-sm text-gray-600">
                                      {showProviderCompletedJobsToCustomers && (
                                        <div className="flex items-center">
                                          <span className="font-medium">Jobs:</span>
                                          <span className="ml-1">{provider.completedJobs || 0} completed</span>
                                        </div>
                                      )}
                                      {provider.services && provider.services.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {provider.services.slice(0, 2).map((service: any, index: number) => (
                                            <span 
                                              key={index}
                                              className="px-2 py-1 bg-cyan-50 text-cyan-700 text-xs rounded-full"
                                            >
                                              {service.is_primary_service ? '⭐ ' : ''}{service.service_name || service.service_id?.slice(0, 15)}...
                                            </span>
                                          ))}
                                          {provider.services.length > 2 && (
                                            <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-full">
                                              +{provider.services.length - 2} more
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      
                                      {provider.reasons && provider.reasons.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                          <div className="text-xs text-gray-500">
                                            {provider.reasons.slice(0, 2).map((reason: string, index: number) => (
                                              <div key={index}>• {reason}</div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                                <div className="text-gray-500 mb-2">
                                  <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <p className="text-gray-600 font-medium">No providers available</p>
                                <p className="text-sm text-gray-500 mt-1">
                                  Try selecting a different date or time slot
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Hidden provider field for form submission */}
                      <FormField
                        control={form.control}
                        name="provider"
                        render={({ field }) => (
                          <input type="hidden" {...field} />
                        )}
                      />

                      {/* Key Information & Job Notes */}
                      <div className="col-span-full">
                        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                          <h3 className="text-lg font-semibold mb-4">Key Information & Job Notes</h3>
                          
                          {/* Key Access */}
                          <div className="mb-6">
                            <FormLabel className={styles.formLabel}>Key Access</FormLabel>
                            <div className="space-y-3">
                              {/* First row: Someone Will Be At Home and I Will Hide The Keys - Radio Buttons */}
                              <div className="flex gap-6">
                                <FormField
                                  control={form.control}
                                  name="keyAccess.primary_option"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <RadioGroup
                                          value={field.value}
                                          onValueChange={field.onChange}
                                          className="flex gap-6"
                                        >
                                          <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="someone_home" id="someone-home" />
                                            <label htmlFor="someone-home" className="text-sm font-medium">
                                              Someone Will Be At Home
                                            </label>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="hide_keys" id="hide-keys" />
                                            <label htmlFor="hide-keys" className="text-sm font-medium">
                                              I Will Hide The Keys
                                            </label>
                                          </div>
                                        </RadioGroup>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              {/* Second row: Keep Key With Provider - Checkbox */}
                              <div className="flex gap-6">
                                <FormField
                                  control={form.control}
                                  name="keyAccess.keep_key"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <label className="text-sm font-medium">
                                        Keep Key With Provider
                                      </label>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Customer Note For Provider */}
                          <div>
                            <FormField
                              control={form.control}
                              name="customerNoteForProvider"
                              render={({ field }) => (
                                <FormItem className={styles.formGroup}>
                                  <FormLabel className={styles.formLabel}>
                                    Customer Note For Provider
                                    <span className="text-muted-foreground text-sm font-normal block mt-1">
                                      Special Notes And Instructions
                                    </span>
                                  </FormLabel>
                                  <FormControl>
                                    <textarea
                                      className={styles.formTextarea}
                                      placeholder="Please provide any special instructions for the service provider..."
                                      rows={3}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Coupon Code & Gift Cards */}
                      <div className="col-span-full">
                        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                          <h3 className="text-lg font-semibold mb-4">Coupon Code & Gift Cards</h3>
                          
                          {/* Tabs */}
                          <div className="flex space-x-4 mb-4 border-b border-gray-200">
                            <button
                              type="button"
                              onClick={() => {
                                setAppliedCoupon(null);
                                form.setValue("couponCodeTab", "coupon-code");
                              }}
                              className={`pb-2 text-base font-semibold ${form.watch("couponCodeTab") === "coupon-code" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                            >
                              Coupon Code
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAppliedCoupon(null);
                                form.setValue("couponCodeTab", "gift-card");
                              }}
                              className={`pb-2 text-base font-semibold ${form.watch("couponCodeTab") === "gift-card" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                            >
                              Gift Cards
                            </button>
                          </div>
                          
                          {/* Tab Content */}
                          <div className="bg-white rounded-lg p-6 shadow-sm">
                            {form.watch("couponCodeTab") === "coupon-code" ? (
                              <div className="space-y-6">
                                {/* Input Section */}
                                <div>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Label htmlFor="coupon-code-input" className="text-sm font-medium text-gray-900">
                                      Enter Coupon Code
                                    </Label>
                                    <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                                      <span className="text-gray-500 text-xs">i</span>
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <FormField
                                      control={form.control}
                                      name="couponCode"
                                      render={({ field }) => (
                                        <FormItem className="flex-1">
                                          <FormControl>
                                            <Input
                                              id="coupon-code-input"
                                              placeholder="Enter coupon code"
                                              {...field}
                                              onChange={(e) => {
                                                setAppliedCoupon(null);
                                                field.onChange(e);
                                              }}
                                              className="border-gray-300"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <Button
                                      type="button"
                                      onClick={applyCustomerCoupon}
                                      className="bg-sky-400 hover:bg-sky-500 text-white px-6"
                                    >
                                      Apply
                                    </Button>
                                  </div>
                                  {appliedCoupon && (
                                    <p className="mt-2 text-sm text-green-700">
                                      Applied {appliedCoupon.code}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <div>
                                  <Label htmlFor="gift-card-code" className="text-sm font-medium text-gray-900">Gift Card Code</Label>
                                  <div className="flex space-x-2 mt-2">
                                    <FormField
                                      control={form.control}
                                      name="giftCardCode"
                                      render={({ field }) => (
                                        <FormItem className="flex-1">
                                          <FormControl>
                                            <Input
                                              id="gift-card-code"
                                              placeholder="Enter gift card code"
                                              {...field}
                                              className="border-gray-300"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <Button
                                      type="button"
                                      onClick={() => {
                                        toast({
                                          title: "Gift Card Applied",
                                          description: `Gift card "${form.getValues("giftCardCode")}" has been applied.`,
                                        });
                                      }}
                                      className="bg-sky-400 hover:bg-sky-500 text-white px-6"
                                    >
                                      Apply
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Additional Notes */}
                      <div className="col-span-full">
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem className={styles.formGroup}>
                              <FormLabel className={styles.formLabel}>
                                Additional Notes (Optional)
                                <span className="text-muted-foreground text-sm font-normal block mt-1">
                                  Any special instructions or requests?
                                </span>
                              </FormLabel>
                              <FormControl>
                                <textarea
                                  className={styles.formTextarea}
                                  placeholder="e.g., Please bring extra cleaning supplies, focus on kitchen, pet in the house, etc."
                                  rows={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                    {/* Submit Button */}
                    <div className="col-span-full pt-4">
                      <button
                        type="submit"
                        className={`${styles.submitButton} group`}
                        disabled={
                          form.formState.isSubmitting ||
                          (!limitedEditMode &&
                            locationManagement !== "none" &&
                            !locationInputValidForBooking)
                        }
                      >
                        {form.formState.isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Confirm Booking
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>

                      <p className="text-center text-sm text-muted-foreground mt-4">
                        By booking, you agree to our{" "}
                        <Link href="/terms-and-conditions" className="text-primary hover:underline">
                          Terms of Service
                        </Link>{" "}and{" "}
                        <Link href="/privacy-policy" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>
                        .
                      </p>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </div>
        </div>

        <Dialog open={!!bookingHtmlPopup} onOpenChange={(open) => { if (!open) setBookingHtmlPopup(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{bookingHtmlPopup?.title}</DialogTitle>
              <DialogDescription className="sr-only">Service information</DialogDescription>
            </DialogHeader>
            {bookingHtmlPopup?.html ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-sm [&_a]:text-primary [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: bookingHtmlPopup.html }}
              />
            ) : null}
            <DialogFooter>
              <Button type="button" onClick={() => setBookingHtmlPopup(null)}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Fallback - redirect to service selection if accessed directly
  return null;
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading booking form...</p>
        </div>
      </div>
    }>
      <BookingPageContent />
    </Suspense>
  );
}
