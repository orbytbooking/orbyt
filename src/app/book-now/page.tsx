  "use client";

import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
import styles from "./BookingPage.module.css";
import { useCustomerAccount } from "@/hooks/useCustomerAccount";
import { getSupabaseCustomerClient } from "@/lib/supabaseCustomerClient";
import { useWebsiteConfig } from "@/hooks/useWebsiteConfig";

const optionalEmailSchema = z.union([z.string().email("Please enter a valid email"), z.literal("")]);
const optionalPhoneSchema = z.union([
  z.number().min(1000000000, "Please enter a valid 10-digit phone number").max(9999999999, "Please enter a valid 10-digit phone number"),
  z.literal("") 
]);

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  secondaryEmail: optionalEmailSchema,
  phone: z.number()
    .min(1000000000, "Please enter a valid 10-digit phone number")
    .max(9999999999, "Please enter a valid 10-digit phone number"),
  secondaryPhone: optionalPhoneSchema,
  addressPreference: z.enum(["existing", "new"]),
  address: z.string().min(5, "Please enter a valid address"),
  aptNo: z.union([z.string().max(20, "Apt. No. should be 20 characters or less"), z.literal("")]),
  zipCode: z.string().min(5, "Please enter a valid zip code").max(10),
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

const sanitizePhoneNumber = (value: string) => value.replace(/[^0-9]/g, "");

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

function BookingPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");
  const [businessName, setBusinessName] = useState<string>('');
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
  const [pricingRows, setPricingRows] = useState<PricingTier[]>([]);
  /** All pricing parameters (all variable categories) for summing Bedroom + Bathroom + Living Room + Sq Ft + Storage + etc. */
  const [allPricingParams, setAllPricingParams] = useState<{ variable_category: string; name: string; price: number; service_category: string | null; frequency: string }[]>([]);
  const [availableExtras, setAvailableExtras] = useState<any[]>([]);
  const [availableVariables, setAvailableVariables] = useState<{ [key: string]: any[] }>({});
  const [frequencyOptions, setFrequencyOptions] = useState<string[]>([]);
  const [dynamicTimeSlots, setDynamicTimeSlots] = useState<string[]>([]);
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [schedulingType, setSchedulingType] = useState<string>("accepted_automatically");

  // Ref to store the total shown in the booking summary so we send that exact amount when saving (avoids stale closure giving 0)
  const summaryTotalRef = useRef<number>(0);

  // Handle phone number input to ensure it's a valid number
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const value = e.target.value;
    if (value === '') {
      field.onChange(0);
    } else if (/^\d+$/.test(value)) {
      field.onChange(Number(value));
    }
  };

  // Handle phone field blur for validation
  const handlePhoneBlur = (field: any) => {
    field.onBlur();
    form.trigger("phone");
  };
  const isAccountLocked = !accountLoading && Boolean(customerName || customerEmail);
  const [prefilledBookingId, setPrefilledBookingId] = useState<string | null>(null);
  const [recentBookingId, setRecentBookingId] = useState<string | null>(null);

  const selectedIndustry = useMemo(
    () => industryOptions.find((option) => option.key === selectedCategory) ?? null,
    [industryOptions, selectedCategory],
  );

  const selectedIndustryLabel = selectedIndustry?.label ?? "";
  const selectedIndustryId = selectedIndustry?.id ?? "";

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

  // Fetch scheduling type when businessId is set (for provider step visibility)
  useEffect(() => {
    if (!businessId) return;
    const fetchScheduling = async () => {
      try {
        const res = await fetch(`/api/admin/store-options?businessId=${businessId}`);
        const data = await res.json();
        if (res.ok && data?.options?.scheduling_type) {
          setSchedulingType(data.options.scheduling_type);
        }
      } catch {
        // Keep default accepted_automatically
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
          // Special case for ORBYT business
          if (currentBusinessId === '879ec172-e1dd-475d-b57d-0033fae0b30e') {
            setBusinessName('ORBYT');
            return;
          }
          
          // Try to get business name from businesses API first
          const response = await fetch(`/api/businesses?business_id=${currentBusinessId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.businesses && data.businesses.length > 0) {
              const business = data.businesses[0];
              const name = business.name || business.business_name || business.display_name || business.title || 'Cleaning Service';
              setBusinessName(name);
              return;
            }
          }
          
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
        } catch (error) {
          console.error('Error fetching business name:', error);
          setBusinessName('Cleaning Service');
        }
      } else {
        // No business ID found, set fallback
        setBusinessName('Cleaning Service');
      }
    };

    getBusinessContext();
  }, [searchParams]);

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

  // Fetch service categories for selected industry from admin portal
  useEffect(() => {
    const industryId = selectedIndustryId;
    const businessIdParam = searchParams.get("business");

    if (!industryId || !businessIdParam) {
      setServiceCategories([]);
      return;
    }

    const fetchServiceCategories = async () => {
      setServiceCategoriesLoading(true);
      try {
        const response = await fetch(
          `/api/service-categories?industryId=${industryId}&businessId=${businessIdParam}`
        );
        const data = await response.json();

        if (!response.ok) {
          console.error("Failed to fetch service categories:", data.error);
          setServiceCategories([]);
          return;
        }

        const categories = data.serviceCategories ?? [];
        const displayVisible = (display: string | undefined) =>
          !display || display.includes("customer_frontend") || display.includes("customer");

        const mapped = categories
          .filter((cat: any) => displayVisible(cat.display))
          .map((cat: any) => {
            const hours = cat.service_category_time?.hours ?? "0";
            const minutes = cat.service_category_time?.minutes ?? "0";
            const duration =
              cat.service_category_time?.enabled
                ? `${hours}h ${minutes}m`.replace(/^0h /, "").replace(/ 0m$/, "m")
                : "—";
            const price = cat.service_category_price?.enabled && cat.service_category_price?.price
              ? parseFloat(String(cat.service_category_price.price)) || 0
              : 0;

            return {
              id: cat.id,
              name: cat.name,
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
  }, [selectedIndustryId, searchParams]);

  // Keep selected service in sync when service categories are refetched (same id/name, new object reference)
  useEffect(() => {
    if (!selectedService || !serviceCategories.length) return;
    const match = serviceCategories.find(
      (s) => s.id === selectedService.id || s.name === selectedService.name
    );
    if (match && match !== selectedService) {
      setSelectedService(match);
    }
  }, [serviceCategories]);

  // Fetch extras and variables from admin portal
  useEffect(() => {
    const industryId = selectedIndustryId;
    const businessIdParam = searchParams.get("business");

    if (!industryId || !businessIdParam) {
      setAvailableExtras([]);
      setAvailableVariables({});
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
              (e: any) => e && (e.display === "frontend-backend-admin" || e.display === "Both" || e.display === "Booking" || e.display === "customer_frontend")
            );
            setAvailableExtras(visibleExtras);
          } else {
            setAvailableExtras([]);
          }
        } else {
          setAvailableExtras([]);
        }

        // Fetch pricing parameters (variables) from industry form 1 – used for dropdowns and tier pricing
        const variablesResponse = await fetch(`/api/pricing-parameters?industryId=${industryId}`);
        if (variablesResponse.ok) {
          const variablesData = await variablesResponse.json();
          if (variablesData.pricingParameters && Array.isArray(variablesData.pricingParameters)) {
            const params = variablesData.pricingParameters as any[];
            // Group variables by the admin-configured variable_category label (no hardcoded categories)
            const groupedVariables: { [key: string]: any[] } = {};
            params.forEach((param: any) => {
              const rawCategory = String(param.variable_category ?? "").trim();
              if (!rawCategory) return;
              if (!groupedVariables[rawCategory]) {
                groupedVariables[rawCategory] = [];
              }
              groupedVariables[rawCategory].push({
                id: param.id,
                name: param.name,
                variable_category: rawCategory,
              });
            });
            setAvailableVariables(groupedVariables);

            // Build pricing tiers from the same data (for getServicePrice by area/size)
            // Prefer a category that looks like area/size (sqft, area, square, meter); else use first category
            const categoryKeys = Object.keys(groupedVariables);
            const areaLikeKey = categoryKeys.find(
              (k) => /sqft|area|square|meter|size/i.test(String(k))
            );
            const tierCategoryKey = areaLikeKey ?? categoryKeys[0];
            const tierParams = tierCategoryKey
              ? (params
                  .filter((p: any) => String(p.variable_category ?? "").trim() === tierCategoryKey)
                  .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))
              : [];
            const tiers: PricingTier[] = tierParams.map((p: any, i: number) => ({
              id: i + 1,
              name: String(p.name ?? ""),
              price: typeof p.price === "number" ? p.price : Number(p.price) || 0,
              time: p.time_minutes != null ? `${p.time_minutes} min` : "",
              display: String(p.display ?? ""),
              serviceCategory: selectedIndustryLabel,
              frequency: String(p.frequency ?? ""),
              serviceCategoryFilter: p.service_category != null && String(p.service_category).trim() !== "" ? String(p.service_category).trim() : null,
            }));
            setPricingRows(tiers);

            // Store all params so we can sum every variable category (Bedroom + Bathroom + Living Room + Sq Ft + Storage, etc.)
            setAllPricingParams(
              params.map((p: any) => ({
                variable_category: String(p.variable_category ?? "").trim(),
                name: String(p.name ?? ""),
                price: typeof p.price === "number" ? p.price : Number(p.price) || 0,
                service_category: p.service_category != null && String(p.service_category).trim() !== "" ? String(p.service_category).trim() : null,
                frequency: String(p.frequency ?? ""),
              }))
            );
          } else {
            setAvailableVariables({});
            setPricingRows([]);
            setAllPricingParams([]);
          }
        } else {
          setAvailableVariables({});
          setPricingRows([]);
          setAllPricingParams([]);
        }

      } catch (error) {
        console.error("Error fetching extras and variables:", error);
        setAvailableExtras([]);
        setAvailableVariables({});
      }
    };

    fetchExtrasAndVariables();
  }, [selectedIndustryId, searchParams]);

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
      phone: 0,
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

  // Fetch frequencies (location-based: pass zipcode when available)
  useEffect(() => {
    const industryId = selectedIndustryId;
    if (!industryId || !searchParams.get("business")) {
      setFrequencyOptions([]);
      return;
    }
    const url = new URL("/api/industry-frequency", window.location.origin);
    url.searchParams.set("industryId", industryId);
    const zip = String(zipCode || "").trim().replace(/\s/g, "");
    if (zip.length >= 5) url.searchParams.set("zipcode", zip);
    const fetchFrequencies = async () => {
      try {
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          if (data.frequencies && Array.isArray(data.frequencies)) {
            const names = (data.frequencies as any[])
              .filter((f: any) => f?.is_active !== false)
              .map((f: any) => f.name || f.occurrence_time)
              .filter(Boolean);
            setFrequencyOptions(names);
          } else {
            setFrequencyOptions([]);
          }
        } else {
          setFrequencyOptions([]);
        }
      } catch (err) {
        console.error("Error fetching frequencies:", err);
        setFrequencyOptions([]);
      }
    };
    fetchFrequencies();
  }, [selectedIndustryId, searchParams, zipCode]);

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
      // Convert phone string to number, removing any non-digit characters
      const phoneDigits = customerPhone.replace(/\D/g, '');
      if (phoneDigits.length >= 10) {
        form.setValue("phone", parseInt(phoneDigits.slice(-10)));
      }
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
          `/api/time-slots?business_id=${businessIdParam}&date=${selectedDate.toISOString().split('T')[0]}`
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

  // When Accept or Decline: skip provider step and don't send provider_id (invitation flow)
  const showProviderStep = schedulingType !== "accept_or_decline";

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
        const formattedDate = selectedDate.toISOString().split('T')[0];
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
    return cardCustomizations[key] || {
      frequency: "",
      squareMeters: "",
      bedroom: "",
      bathroom: "",
      extras: [],
      isPartialCleaning: false,
      excludedAreas: [],
      excludeQuantities: {},
      variableCategories: {},
    };
  };

  useEffect(() => {
    const loadBookingData = async () => {
      if (!bookingIdParam || prefilledBookingId === bookingIdParam) return;

      const currentBusinessId = searchParams.get("business") ?? null;
      const sourceBooking = await fetchBookingById(currentBusinessId, bookingIdParam);
      if (!sourceBooking) return;

    const match = findServiceMatch(sourceBooking.service);
    if (!match) {
      toast({
        title: "Service unavailable",
        description: `${sourceBooking.service} is no longer offered. Please choose another service.`,
        variant: "destructive",
      });
      return;
    }

    setPrefilledBookingId(bookingIdParam);

    const { categoryKey, service } = match;
    setSelectedCategory(categoryKey);
    setSelectedService(service);
    setFlippedCardId(null);
    setCurrentStep("details");

    const existingCustomization = getCardCustomization(service.id);
    
    // Type for booking customization from database
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
    };

    const presetCustomization = (sourceBooking.customization as BookingCustomization) ?? {};

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

    const presetExtras: { name: string; quantity: number }[] = normalizeExtrasArray(normalizeExtrasFromString(presetCustomization.extras));
    const existingExtras: { name: string; quantity: number }[] = normalizeExtrasArray(normalizeExtrasFromString(existingCustomization.extras));

    // Use area options from API (pricing tiers) when available so rebook keeps admin-configured values
    const areaOptionsForRebook = pricingRows.length > 0
      ? pricingRows.map((t) => t.name)
      : [...AREA_SIZE_OPTIONS];
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
      extras: presetExtras.length ? presetExtras : (existingExtras.length ? normalizeExtrasArray(existingExtras) : []),
      isPartialCleaning:
        presetCustomization.isPartialCleaning ?? existingCustomization.isPartialCleaning ?? false,
      excludedAreas: presetCustomization.excludedAreas ?? existingCustomization.excludedAreas ?? [],
      excludeQuantities: presetCustomization.excludeQuantities ?? existingCustomization.excludeQuantities ?? {},
      variableCategories: presetCustomization.variableCategories ?? existingCustomization.variableCategories ?? {},
    };

    setServiceCustomization(rebookCustomization);
    form.setValue("customization", toFormCustomization(rebookCustomization), { shouldValidate: true });
    setCardCustomizations((prev) => ({
      ...prev,
      [cardKey(service.id)]: rebookCustomization,
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

    if (sourceBooking.contact) {
      // Convert contact to string before sanitizing
      form.setValue("phone", Number(sanitizePhoneNumber(String(sourceBooking.contact))));
    }

    toast({
      title: "Details loaded",
      description: "Review the pre-filled booking and make any adjustments you need.",
    });
    };

    loadBookingData();
  }, [bookingIdParam, prefilledBookingId, form, toast, pricingRows, searchParams]);

  // When returning from Stripe Checkout success, show success step
  useEffect(() => {
    const stripeSuccess = searchParams.get("stripe") === "success";
    const sessionId = searchParams.get("session_id");
    if (stripeSuccess && sessionId) {
      setCurrentStep("success");
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentStep === "success") {
      const bid = searchParams.get("business");
      router.push(bid ? `/customer/appointments?business=${bid}` : "/customer/appointments");
    }
  }, [currentStep, router, searchParams]);

  const addBookingToStorage = useCallback(async (paymentMethod: "cash" | "online" = "cash") => {
    if (!bookingData || !serviceCustomization || !selectedService) {
      toast({
        title: "Missing information",
        description: "Please complete the service selection and booking form before finishing.",
        variant: "destructive",
      });
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
        const payload = {
          business_id: currentBusinessId,
          customer_name: `${bookingData.firstName ?? ""} ${bookingData.lastName ?? ""}`.trim(),
          customer_email: bookingData.email ?? "",
          customer_phone: String(bookingData.phone ?? ""),
          address: newBooking.address,
          service: newBooking.service,
          frequency: serviceCustomization.frequency || newBooking.frequency || null,
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
          customization: newBooking.customization ?? undefined,
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

        const msg =
          (data && typeof data === "object" ? (data.error ?? data.details ?? data.message) : null) ||
          rawText ||
          `Save failed (${res.status})`;
        const hint = data.hint ? ` ${data.hint}` : "";
        toast({
          title: "Error",
          description: msg === "Customer profile not found for this business"
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
  }, [bookingData, serviceCustomization, selectedService, toast, searchParams, form, availableProviders, showProviderStep]);

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
    setStoredAddress({
      address: values.address,
      ...(values.aptNo ? { aptNo: values.aptNo } : {}),
      ...(values.zipCode ? { zipCode: values.zipCode } : {}),
    });
    setBookingData(values);
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
    const vc = serviceCustomization?.variableCategories ?? {};
    let sum = 0;
    let addedAreaLike = false;
    for (const [categoryKey, optionName] of Object.entries(vc)) {
      if (!optionName?.trim() || optionName.trim().toLowerCase() === "none") continue;
      const param = allPricingParams.find(
        (p) =>
          p.variable_category === categoryKey &&
          p.name === optionName &&
          (!p.service_category || listContains(p.service_category, serviceName)) &&
          (!p.frequency || listContains(p.frequency, selectedFrequency))
      );
      if (param && typeof param.price === "number" && !Number.isNaN(param.price)) {
        sum += param.price;
        if (/sqft|area|square|meter|size/i.test(param.variable_category)) addedAreaLike = true;
      }
    }
    // Include squareMeters only if no area-like category was already added (avoids double-count)
    if (!addedAreaLike && serviceCustomization?.squareMeters?.trim()) {
      const areaLikeParam = allPricingParams.find(
        (p) =>
          /sqft|area|square|meter|size/i.test(p.variable_category) &&
          p.name === serviceCustomization.squareMeters &&
          (!p.service_category || listContains(p.service_category, serviceName)) &&
          (!p.frequency || listContains(p.frequency, selectedFrequency))
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
      if (extra && typeof (extra as any).price === "number") {
        const qty = Math.max(1, Number(item.quantity) || 1);
        sum += (extra as any).price * qty;
      }
    }
    return sum;
  };

  // Get service price from industry form 1: pricing parameters (filtered by service + frequency) or service category price
  const getServicePrice = (serviceName: string) => {
    if (!selectedCategory) return 0;

    const selectedFrequency = serviceCustomization?.frequency?.trim() || "";

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
          const matchesFrequency =
            !tier.frequency ||
            listContains(tier.frequency, selectedFrequency);
          return matchesService && matchesFrequency && tier.name === areaOption;
        });
        const tier = applicableTiers[0] ?? pricingRows.find((t) => t.name === areaOption);
        if (tier && typeof tier.price === "number" && !Number.isNaN(tier.price)) {
          return tier.price;
        }
      }
    }

    // Fallback: price from service category (industry form 1 – service category price)
    const service = serviceCategories.find((s) => s.name === serviceName);
    return service?.price ?? 0;
  };

  // Calculate total from pricing parameters: sum all variable categories + extras; fallback to single-tier or service category price
  const calculateTotal = () => {
    if (!bookingData) return { subtotal: 0, tax: 0, total: 0 };
    const serviceName = bookingData.service || selectedService?.name;
    const variableSubtotal = serviceName ? getVariableCategoriesSubtotal(serviceName) : 0;
    const extrasSubtotal = getExtrasSubtotal();
    let subtotal = variableSubtotal + extrasSubtotal;
    if (subtotal === 0 && serviceName) {
      subtotal = getServicePrice(serviceName);
    }
    if (subtotal === 0 && selectedService?.price != null && selectedService.price > 0) {
      subtotal = selectedService.price;
    }
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

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

  // Create a pending booking and return its id (for Stripe flow). Returns null on error.
  const createDraftBookingForStripe = useCallback(async (): Promise<string | null> => {
    if (!bookingData || !serviceCustomization || !selectedService) return null;
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
      },
    };
    const currentBusinessId = searchParams.get("business") ?? null;
    if (!currentBusinessId) return null;
    try {
      const supabase = getSupabaseCustomerClient();
      const { data: { session } } = await supabase.auth.getSession();
      const isLoggedIn = Boolean(session?.access_token);
      const apiUrl = isLoggedIn ? "/api/customer/bookings" : "/api/guest/bookings";
      const headers: Record<string, string> = { "Content-Type": "application/json", "x-business-id": currentBusinessId };
      if (isLoggedIn) headers.Authorization = `Bearer ${session!.access_token}`;
      const tot = calculateTotal();
      const amountToSend =
        (Number(tot.total) > 0 ? tot.total : null) ?? (Number(tot.subtotal) > 0 ? tot.subtotal : null) ?? Number(selectedService?.price ?? 0);
      const selectedProviderId = showProviderStep ? (form.getValues("provider") || null) : null;
      const selectedProviderObj = selectedProviderId ? availableProviders.find((p: any) => p.id === selectedProviderId) : null;
      const payload = {
        business_id: currentBusinessId,
        customer_name: `${bookingData.firstName ?? ""} ${bookingData.lastName ?? ""}`.trim(),
        customer_email: bookingData.email ?? "",
        customer_phone: String(bookingData.phone ?? ""),
        address: newBooking.address,
        service: newBooking.service,
        frequency: serviceCustomization.frequency || newBooking.frequency || null,
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
        customization: newBooking.customization ?? undefined,
      };
      const res = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(payload) });
      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }
      if (res.ok) {
        const saved = (data.data ?? data.booking) ?? data;
        return saved?.id ?? data.id ?? null;
      }
      const msg = (typeof data === "object" ? (data.error ?? data.message) : null) || rawText;
      toast({ title: "Error", description: msg || `Save failed (${res.status})`, variant: "destructive" });
      return null;
    } catch (err) {
      console.warn("createDraftBookingForStripe failed", err);
      toast({ title: "Error", description: "Failed to create booking. Please try again.", variant: "destructive" });
      return null;
    }
  }, [bookingData, serviceCustomization, selectedService, searchParams, form, availableProviders, showProviderStep]);

  // Handle online payment via Stripe Checkout (redirect)
  const handleOnlinePayment = async (_values?: z.infer<typeof paymentSchema>) => {
    setIsProcessing(true);
    try {
      const bookingId = await createDraftBookingForStripe();
      if (!bookingId) return;
      const { subtotal, tax, total } = calculateTotal();
      const amountInCents = Math.round(total * 100);
      if (amountInCents < 50) {
        toast({ title: "Invalid amount", description: "Minimum charge is $0.50.", variant: "destructive" });
        return;
      }
      const businessId = searchParams.get("business") ?? "";
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amountInCents,
          customerEmail: undefined, // Leave empty so customer can edit email on Stripe Checkout
          businessId: businessId || undefined,
          lineItemDescription: `${selectedService?.name ?? "Booking"} – ${bookingData?.date ? format(bookingData.date instanceof Date ? bookingData.date : new Date(bookingData.date), "PPP") : ""}`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Payment setup failed",
          description: json.error || json.details || "Stripe is not configured or the request failed. Please try again or pay on arrival.",
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
    const categoriesAvailable = industryOptions.length > 0;
    return (
      <div className="min-h-screen">
        <Navigation 
          branding={{
            ...config?.branding,
            companyName: businessName || config?.branding?.companyName || 'Cleaning Service',
            logo: businessName === 'ORBYT' ? '/images/logo.png' : (config?.branding?.logo || '/images/orbit.png')
          }} 
          headerData={config?.sections?.find(s => s.type === 'header')?.data || {
            companyName: businessName || config?.branding?.companyName || 'Cleaning Service',
            logo: businessName === 'ORBYT' ? '/images/logo.png' : (config?.branding?.logo || '/images/orbit.png'),
            showNavigation: true,
            navigationLinks: []
          }}
        />
        <div className={styles.bookingContainer}>
          <div className="container mx-auto px-4 py-16 max-w-4xl">
            <div className={styles.header}>
              <h1 className={styles.title}>Select Service Category</h1>
              <p className={styles.subtitle}>
                {categoriesAvailable
                  ? "Choose from the industries you've enabled in your admin dashboard."
                  : "Add industries in your admin dashboard to display them here."}
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
                  No industries have been added yet. Visit the admin dashboard to add industries so they appear here for customers.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/admin/settings/industries">Go to Industries Settings</Link>
                </Button>
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
        <Navigation 
          branding={{
            ...config?.branding,
            companyName: businessName || config?.branding?.companyName || 'Cleaning Service',
            logo: businessName === 'ORBYT' ? '/images/logo.png' : (config?.branding?.logo || '/images/orbit.png')
          }} 
          headerData={config?.sections?.find(s => s.type === 'header')?.data || {
            companyName: businessName || config?.branding?.companyName || 'Cleaning Service',
            logo: businessName === 'ORBYT' ? '/images/logo.png' : (config?.branding?.logo || '/images/orbit.png'),
            showNavigation: true,
            navigationLinks: []
          }}
        />
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
    const { subtotal, tax, total } = calculateTotal();
    summaryTotalRef.current = total;

    return (
      <div className="min-h-screen">
        <Navigation 
          branding={{
            ...config?.branding,
            companyName: businessName || config?.branding?.companyName || 'Cleaning Service',
            logo: businessName === 'ORBYT' ? '/images/logo.png' : (config?.branding?.logo || '/images/orbit.png')
          }} 
          headerData={config?.sections?.find(s => s.type === 'header')?.data || {
            companyName: businessName || config?.branding?.companyName || 'Cleaning Service',
            logo: businessName === 'ORBYT' ? '/images/logo.png' : (config?.branding?.logo || '/images/orbit.png'),
            showNavigation: true,
            navigationLinks: []
          }}
        />
        <div className={styles.bookingContainer}>
          <div className="container mx-auto px-4 py-16 max-w-6xl">
            <div className={styles.header}>
              <h1 className={styles.title}>Complete Your Payment</h1>
              <p className={styles.subtitle}>
                Review your booking and complete payment
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Booking Summary Sidebar */}
              <div className="md:col-span-1">
                <div className={styles.summaryCard}>
                  <h3 className={styles.summaryTitle}>Booking Summary</h3>
                  <div className={styles.summaryItem}>
                    <strong>Category:</strong> {selectedIndustryLabel || "Selected Industry"}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>Service:</strong> {selectedService.name}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>Frequency:</strong> {serviceCustomization.frequency || "—"}
                  </div>
                  {Object.keys(availableVariables).length > 0
                    ? Object.keys(availableVariables).map((categoryKey) => {
                        const value =
                          serviceCustomization.variableCategories?.[categoryKey] ??
                          (/sqft|area|square|meter|size/i.test(categoryKey) ? serviceCustomization.squareMeters : null) ??
                          (categoryKey.toLowerCase().includes("bedroom") ? serviceCustomization.bedroom : null) ??
                          (categoryKey.toLowerCase().includes("bathroom") ? serviceCustomization.bathroom : null);
                        if (value == null || String(value).trim() === "") return null;
                        return (
                          <div key={categoryKey} className={styles.summaryItem}>
                            <strong>{categoryKey}:</strong> {String(value).trim()}
                          </div>
                        );
                      })
                    : (
                      <>
                        {serviceCustomization.squareMeters?.trim() && (
                          <div className={styles.summaryItem}>
                            <strong>Sq Ft:</strong> {serviceCustomization.squareMeters}
                          </div>
                        )}
                        {serviceCustomization.bedroom?.trim() && (
                          <div className={styles.summaryItem}>
                            <strong>Bedroom:</strong> {serviceCustomization.bedroom}
                          </div>
                        )}
                        {serviceCustomization.bathroom?.trim() && (
                          <div className={styles.summaryItem}>
                            <strong>Bathroom:</strong> {serviceCustomization.bathroom}
                          </div>
                        )}
                      </>
                    )}
                  {serviceCustomization.extras &&
                    Array.isArray(serviceCustomization.extras) &&
                    serviceCustomization.extras.length > 0 &&
                    !(serviceCustomization.extras.length === 1 && serviceCustomization.extras[0].name === "None") && (
                      <div className={styles.summaryItem}>
                        <strong>Extras:</strong> {serviceCustomization.extras.map(extra => 
                          typeof extra === 'string' ? extra : `${extra.name}${extra.quantity > 1 ? ` (${extra.quantity})` : ''}`
                        ).join(", ")}
                      </div>
                    )}
                  <div className={styles.summaryItem}>
                    <strong>Date:</strong> {format(bookingData.date, "PPP")}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>Time:</strong> {bookingData.time}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>Address:</strong> {bookingData.address}
                  </div>
                  <div className={styles.divider}></div>
                  <div className={styles.priceRow}>
                    <span>Service Fee:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className={styles.priceRow}>
                    <span>Service Charge:</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className={styles.divider}></div>
                  <div className={styles.totalRow}>
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep("details")}
                    className="w-full mt-4"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Details
                  </Button>
                </div>
              </div>

              {/* Payment via Stripe Checkout */}
              <div className="md:col-span-2">
                <div className={styles.paymentCard}>
                  <h3 className={styles.paymentTitle}>Pay securely with Stripe</h3>
                  <div className={styles.securityBadge}>
                    <Lock className="h-4 w-4" />
                    <span>Secure payment – you&apos;ll complete payment on Stripe&apos;s checkout page</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    After you click below, we&apos;ll create your booking and send you to Stripe to enter your card details. Your booking is confirmed once payment succeeds.
                  </p>
                  <Button
                    type="button"
                    disabled={isProcessing}
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
                        Pay ${total.toFixed(2)} with Stripe
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
    const categoryServices = serviceCategories;
    const showSummary = selectedService && serviceCustomization;
    const { subtotal, tax, total } = showSummary ? calculateTotal() : { subtotal: 0, tax: 0, total: 0 };
    
    return (
      <div className="min-h-screen">
        <Navigation 
          branding={{
            ...config?.branding,
            companyName: businessName || config?.branding?.companyName || 'Cleaning Service',
            logo: businessName === 'ORBYT' ? '/images/logo.png' : (config?.branding?.logo || '/images/orbit.png')
          }} 
          headerData={config?.sections?.find(s => s.type === 'header')?.data || {
            companyName: businessName || config?.branding?.companyName || 'Cleaning Service',
            logo: businessName === 'ORBYT' ? '/images/logo.png' : (config?.branding?.logo || '/images/orbit.png'),
            showNavigation: true,
            navigationLinks: []
          }}
        />
        <div className={styles.bookingContainer}>
          <div className="container mx-auto px-4 py-16 max-w-6xl">
            <div className={styles.header}>
              <h1 className={styles.title}>
                {selectedIndustryLabel || "Service"} Booking
              </h1>
              <p className={styles.subtitle}>
                {showSummary 
                  ? `Complete your booking details for ${selectedService.name}`
                  : "Select a service type and fill out your booking details"
                }
              </p>
            </div>

            {/* Zip Code Input - Above Select Services */}
            <div className="mb-6">
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem className={styles.formGroup}>
                      <FormLabel className={styles.formLabel}>Enter Zip Code</FormLabel>
                      <FormControl>
                        <Input
                          className={styles.formInput}
                          placeholder="Zip Code"
                          maxLength={10}
                          {...field}
                          onBlur={(e) => {
                            field.onBlur();
                            form.trigger("zipCode");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>
            </div>

            {/* Service Type Selection - Always show flip cards */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Select Services</h2>
              {serviceCategoriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                </div>
              ) : categoryServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {categoryServices.map((service) => (
                    <FrequencyAwareServiceCard
                      key={service.id}
                      service={service}
                      isSelected={selectedService?.id === service.id || selectedService?.name === service.name}
                      onSelect={handleServiceSelect}
                      flippedCardId={flippedCardId}
                      onFlip={handleCardFlip}
                      customization={getCardCustomization(service.id)}
                      onCustomizationChange={handleCustomizationChange}
                      industryId={selectedIndustryId}
                      serviceCategory={service.raw}
                      availableExtras={availableExtras}
                      availableVariables={availableVariables}
                      frequencyOptions={frequencyOptions}
                    />
                  ))}
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

            {/* Customer Information Form - Always visible below service cards */}
            {categoryServices.length > 0 && (
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
                                <Input 
                                  type="tel" 
                                  className={styles.formInput} 
                                  placeholder="Phone No." 
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => handlePhoneChange(e, field)}
                                  onBlur={() => handlePhoneBlur(field)}
                                />
                              </FormControl>
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
                              <Input 
                                type="tel" 
                                className={styles.formInput} 
                                placeholder="Phone No." 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => handlePhoneChange(e, field)}
                                onBlur={() => handlePhoneBlur(field)}
                              />
                            </FormControl>
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

                      {/* Date Picker */}
                      <div className="col-span-full">
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className={styles.formLabel}>Select Date</FormLabel>
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
                                      return compareDate < today || compareDate < new Date("1900-01-01");
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

                      {/* Time Selection - Only show after date is selected */}
                      {isDateSelected && (
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

                      {/* Available Providers - Only show when scheduling is not Accept or Decline */}
                      {isDateTimeSelected && showProviderStep && (
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
                                        <div className="flex items-center mr-2">
                                          <span className="text-yellow-400">★</span>
                                          <span className="text-sm text-gray-600 ml-1">
                                            {provider.rating ? provider.rating.toFixed(1) : 'New'}
                                          </span>
                                        </div>
                                        {provider.isAvailable && (
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
                                      <div className="flex items-center">
                                        <span className="font-medium">Jobs:</span>
                                        <span className="ml-1">{provider.completedJobs || 0} completed</span>
                                      </div>
                                      
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
                              onClick={() => form.setValue("couponCodeTab", "coupon-code")}
                              className={`pb-2 text-base font-semibold ${form.watch("couponCodeTab") === "coupon-code" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                            >
                              Coupon Code
                            </button>
                            <button
                              type="button"
                              onClick={() => form.setValue("couponCodeTab", "gift-card")}
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
                                          title: "Coupon Code Applied",
                                          description: `Coupon code "${form.getValues("couponCode")}" has been applied.`,
                                        });
                                      }}
                                      className="bg-sky-400 hover:bg-sky-500 text-white px-6"
                                    >
                                      Apply
                                    </Button>
                                  </div>
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
                      <button type="submit" className={`${styles.submitButton} group`} disabled={form.formState.isSubmitting}>
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
