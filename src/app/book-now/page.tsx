  "use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
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
import { CalendarIcon, Clock, Loader2, CheckCircle, CheckCircle2, ArrowRight, CreditCard, Wallet, Lock, ArrowLeft, Home, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import FrequencyAwareServiceCard, { ServiceCustomization } from "@/components/FrequencyAwareServiceCard";
import { serviceCategoriesService } from "@/lib/serviceCategories";
import {
  Booking,
  readStoredBookings,
  readStoredBookAgainPayload,
  clearStoredBookAgainPayload,
  persistBookings,
} from "@/lib/customer-bookings";
import styles from "./BookingPage.module.css";
import { useCustomerAccount } from "@/hooks/useCustomerAccount";

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
  notes: z.string().optional(),
  reminderOptIn: z.boolean().default(false),
  customization: z.object({
    frequency: z.string().min(1, "Please choose a frequency"),
    squareMeters: z.string().min(1, "Please choose an area size"),
    bedroom: z.string().min(1, "Please choose bedroom count"),
    bathroom: z.string().min(1, "Please choose bathroom count"),
    extras: z.string().optional(),
  }),
});

const BOOKING_ADDRESS_KEY = "customerBookingAddress";

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
};

const DEFAULT_INDUSTRIES = ["Home Cleaning"];

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

const availableTimes = [
  "9:00 AM",
  "11:00 AM",
  "1:00 PM",
  "3:00 PM",
  "5:00 PM",
];

const FREQUENCY_OPTIONS = ["One-Time", "2x per week", "Weekly", "Every Other Week", "Monthly"] as const;
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
  extras: (customization?.extras ?? [])
    .filter(extra => extra.quantity > 0)
    .map(extra => extra.quantity > 1 ? `${extra.name} (${extra.quantity})` : extra.name)
    .join(", "),
});

function BookingPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");
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
  const [industryOptions, setIndustryOptions] = useState<{ label: string; key: string; id?: string }[]>(
    DEFAULT_INDUSTRIES.map((label, index) => ({ label, key: toIndustryKey(label) || `industry-${index}` })),
  );
  const [industries, setIndustries] = useState<Array<{ id: string; name: string }>>([]);
  const [storedAddress, setStoredAddress] = useState<StoredAddress | null>(null);
  const { customerName, customerEmail, accountLoading } = useCustomerAccount();
  const [pricingRows, setPricingRows] = useState<PricingTier[]>([]);
  
  // Industry configuration state
  const [allExtras, setAllExtras] = useState<any[]>([]);
  const [allServiceCategories, setAllServiceCategories] = useState<any[]>([]);
  const [allVariables, setAllVariables] = useState<{ [key: string]: any[] }>({});
  const [allFrequencyOptions, setAllFrequencyOptions] = useState<string[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<any>(null);

  // Handle phone number input to ensure it's a valid number
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const value = e.target.value;
    if (value === '') {
      field.onChange(0);
    } else if (/^\d+$/.test(value)) {
      field.onChange(Number(value));
    }
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

  // Load pricing tiers for the selected industry (e.g., Home Cleaning) from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const labelsToTry = selectedIndustryLabel
      ? [selectedIndustryLabel, "Home Cleaning", "Industry"]
      : ["Home Cleaning", "Industry"];
    for (const label of labelsToTry) {
      try {
        const raw = localStorage.getItem(`pricingParams_${label}`);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPricingRows(
            parsed.map((row: any) => ({
              id: Number(row.id) || 0,
              name: String(row.name ?? ""),
              price: typeof row.price === "number" ? row.price : Number(row.price) || 0,
              time: String(row.time ?? ""),
              display: String(row.display ?? ""),
              serviceCategory: String(row.serviceCategory ?? ""),
              frequency: String(row.frequency ?? ""),
            })),
          );
          return;
        }
      } catch {
        // ignore invalid data and try next label
      }
    }
    setPricingRows([]);
  }, [selectedIndustryLabel]);

  useEffect(() => {
    const buildOptions = (labels: string[]) => {
      const seen = new Set<string>();
      return labels
        .map((label, index) => {
          const trimmed = label?.trim();
          if (!trimmed) return null;
          const baseKey = toIndustryKey(trimmed) || `industry-${index}`;
          let key = baseKey;
          let suffix = 1;
          while (seen.has(key)) {
            key = `${baseKey}-${suffix++}`;
          }
          seen.add(key);
          return { label: trimmed, key };
        })
        .filter(Boolean) as { label: string; key: string }[];
    };

    const fetchIndustries = async () => {
      if (typeof window === "undefined") return;
      
      try {
        // Get current business ID from localStorage
        const currentBusinessId = localStorage.getItem('currentBusinessId');
        
        if (!currentBusinessId) {
          console.log('No business ID found, using default industries');
          setIndustryOptions(buildOptions(DEFAULT_INDUSTRIES));
          return;
        }

        setCurrentBusiness({ id: currentBusinessId });

        // Fetch industries from the database
        const response = await fetch(`/api/industries?business_id=${currentBusinessId}`);
        const data = await response.json();
        
        if (!response.ok) {
          console.error('Failed to fetch industries:', data.error);
          setIndustryOptions(buildOptions(DEFAULT_INDUSTRIES));
          return;
        }
        
        if (data.industries && Array.isArray(data.industries) && data.industries.length > 0) {
          setIndustries(data.industries);
          const industryOptionsWithIds = data.industries.map((ind: any) => ({
            label: ind.name,
            key: toIndustryKey(ind.name) || `industry-${ind.id}`,
            id: ind.id
          }));
          setIndustryOptions(industryOptionsWithIds);
          
          // Fetch industry configuration for the first industry (or Home Cleaning if available)
          const homeCleaningIndustry = data.industries.find((ind: any) => ind.name === "Home Cleaning");
          const targetIndustry = homeCleaningIndustry || data.industries[0];
          
          if (targetIndustry) {
            await fetchIndustryConfiguration(targetIndustry.id);
          }
        } else {
          setIndustries([]);
          setIndustryOptions([]);
        }
      } catch (error) {
        console.error('Error fetching industries:', error);
        setIndustryOptions(buildOptions(DEFAULT_INDUSTRIES));
      }
    };

    const fetchIndustryConfiguration = async (industryId: string) => {
      try {
        // Fetch extras
        const extrasResponse = await fetch(`/api/extras?industryId=${industryId}`);
        if (extrasResponse.ok) {
          const extrasData = await extrasResponse.json();
          if (extrasData.extras) {
            const visibleExtras = extrasData.extras.filter(
              (e: any) => e && (e.display === "frontend-backend-admin" || e.display === "Both" || e.display === "Booking")
            );
            const formattedExtras = visibleExtras.map((e: any) => ({
              id: e.id,
              name: e.name,
              icon: e.icon,
              time: e.time_minutes,
              serviceCategory: e.service_category || '',
              price: e.price,
              display: e.display,
              qtyBased: e.qty_based,
              maximumQuantity: e.maximum_quantity,
              exemptFromDiscount: e.exempt_from_discount,
              description: e.description,
            }));
            setAllExtras(formattedExtras);
          }
        }

        // Fetch service categories
        const categories = await serviceCategoriesService.getServiceCategoriesByIndustry(industryId);
        setAllServiceCategories(categories);

        // Fetch variables
        const variablesResponse = await fetch(`/api/variables?industryId=${industryId}`);
        if (variablesResponse.ok) {
          const variablesData = await variablesResponse.json();
          if (variablesData.variables) {
            const variablesMap: { [key: string]: any[] } = {};
            variablesData.variables.forEach((variable: any) => {
              if (!variablesMap[variable.variable_category]) {
                variablesMap[variable.variable_category] = [];
              }
              variablesMap[variable.variable_category].push(variable);
            });
            setAllVariables(variablesMap);
          }
        }

        // Fetch frequency options from service categories or use defaults
        const frequencyOptions = [...new Set(
          categories
            .filter(cat => cat.selected_frequencies && Array.isArray(cat.selected_frequencies))
            .flatMap(cat => cat.selected_frequencies)
        )];
        
        if (frequencyOptions.length > 0) {
          setAllFrequencyOptions(frequencyOptions);
        } else {
          setAllFrequencyOptions(["One-Time", "2x per week", "Weekly", "Every Other Week", "Monthly"]);
        }
      } catch (error) {
        console.error('Error fetching industry configuration:', error);
      }
    };

    fetchIndustries();

    // Listen for industry changes from admin portal
    const handleIndustryChange = () => {
      fetchIndustries();
    };

    window.addEventListener('industryChanged', handleIndustryChange);
    const interval = window.setInterval(fetchIndustries, 5000);

    return () => {
      window.removeEventListener('industryChanged', handleIndustryChange);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    const stillExists = industryOptions.some((option) => option.key === selectedCategory);
    if (!stillExists) {
      setSelectedCategory(null);
      setSelectedService(null);
      setServiceCustomization(null);
      setCardCustomizations({});
      setCurrentStep("category");
    }
  }, [industryOptions, selectedCategory]);
  
  // Initialize booking form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
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
      notes: "",
      reminderOptIn: false,
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
  const existingAddressAvailable = Boolean(storedAddress?.address);
  const disableAddressFields = addressPreference === "existing" && existingAddressAvailable;

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
  }, [accountLoading, customerName, customerEmail]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedRaw = localStorage.getItem(BOOKING_ADDRESS_KEY);
      if (!storedRaw) return;
      const parsed = JSON.parse(storedRaw) as StoredAddress;
      if (parsed?.address) {
        setStoredAddress(parsed);
        form.setValue("addressPreference", "existing");
      }
    } catch {
      // ignore invalid stored address
    }
  }, []);

  useEffect(() => {
    if (addressPreference === "existing") {
      if (storedAddress) {
        form.setValue("address", storedAddress.address ?? "");
        form.setValue("aptNo", storedAddress.aptNo ?? "");
        form.setValue("zipCode", storedAddress.zipCode ?? "");
      } else {
        form.setValue("addressPreference", "new");
      }
    }
  }, [addressPreference, storedAddress]);

  // Initialize payment form
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: "",
      cardName: "",
      expiryDate: "",
      cvv: "",
    },
  });

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

  // Handle card flip
  const handleCardFlip = (cardId: string) => {
    // If flipping to a different card, clear the previous card's data if it wasn't confirmed
    if (flippedCardId && flippedCardId !== cardId && selectedService?.id !== flippedCardId) {
      setCardCustomizations(prev => {
        const newCustomizations = { ...prev };
        delete newCustomizations[flippedCardId];
        return newCustomizations;
      });
    }
    setFlippedCardId(cardId || null);
  };

  // Handle customization change for a specific card
  const handleCustomizationChange = (serviceId: string, customization: ServiceCustomization) => {
    // Only update if this card is currently flipped
    if (flippedCardId === serviceId) {
      setCardCustomizations(prev => ({
        ...prev,
        [serviceId]: customization
      }));
      if (selectedService?.id === serviceId) {
        setServiceCustomization(customization);
        form.setValue("customization", toFormCustomization(customization), { shouldValidate: false });
      }
    }
  };

  // Get customization for a specific card
  const getCardCustomization = (serviceId: string): ServiceCustomization => {
    return cardCustomizations[serviceId] || {
      frequency: "",
      squareMeters: "",
      bedroom: "",
      bathroom: "",
      extras: [],
      isPartialCleaning: false,
      excludedAreas: [],
    };
  };

  useEffect(() => {
    if (!bookingIdParam || prefilledBookingId === bookingIdParam) return;

    let sourceBooking: Booking | null = null;
    let consumedStoredPayload = false;

    const storedPayload = readStoredBookAgainPayload();
    if (storedPayload?.booking?.id === bookingIdParam) {
      sourceBooking = storedPayload.booking;
      consumedStoredPayload = true;
    }

    if (!sourceBooking) {
      const storedBookings = readStoredBookings();
      sourceBooking = storedBookings.find((booking) => booking.id === bookingIdParam) ?? null;
    }

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

    // Prevent multiple executions by setting prefilledBookingId first
    setPrefilledBookingId(bookingIdParam);
    if (consumedStoredPayload) {
      clearStoredBookAgainPayload();
    }

    const { categoryKey, service } = match;
    setSelectedCategory(categoryKey);
    setSelectedService(service);
    setFlippedCardId(null);
    setCurrentStep("details");

    const existingCustomization = getCardCustomization(service.id);
    const presetCustomization = sourceBooking.customization ?? {};

    const normalizeExtrasArray = (value: unknown): { name: string; quantity: number }[] => {
      if (Array.isArray(value)) {
        // Handle new format: { name: string; quantity: number }[]
        if (value.length > 0 && typeof value[0] === 'object' && 'name' in value[0]) {
          return value.filter((v): v is { name: string; quantity: number } => 
            typeof v === 'object' && v !== null && 'name' in v && 'quantity' in v
          );
        }
        // Handle old format: string[]
        return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          .map(name => ({ name, quantity: 1 }));
      }
      if (typeof value === "string") {
        // Parse string format like "Inside Fridge (2), Inside Oven"
        return value
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v.length > 0)
          .map(item => {
            // Check if item has quantity in parentheses like "Inside Fridge (2)"
            const match = item.match(/^(.+)\s*\((\d+)\)$/);
            if (match) {
              return { name: match[1].trim(), quantity: parseInt(match[2], 10) };
            }
            return { name: item, quantity: 1 };
          });
      }
      return [];
    };

    const presetExtras = normalizeExtrasArray((presetCustomization as any).extras);
    const existingExtras = normalizeExtrasArray((getCardCustomization(service.id) as any).extras);

    const rebookCustomization: ServiceCustomization = {
      frequency:
        normalizeSelectValue(sourceBooking.frequency, FREQUENCY_OPTIONS) ||
        normalizeSelectValue(existingCustomization.frequency, FREQUENCY_OPTIONS) ||
        normalizeSelectValue(presetCustomization.frequency, FREQUENCY_OPTIONS),
      squareMeters:
        normalizeSelectValue(presetCustomization.squareMeters, AREA_SIZE_OPTIONS) ||
        normalizeSelectValue(existingCustomization.squareMeters, AREA_SIZE_OPTIONS),
      bedroom:
        normalizeSelectValue(presetCustomization.bedroom, BEDROOM_OPTIONS) ||
        normalizeSelectValue(existingCustomization.bedroom, BEDROOM_OPTIONS),
      bathroom:
      	normalizeSelectValue(presetCustomization.bathroom, BATHROOM_OPTIONS) ||
        normalizeSelectValue(existingCustomization.bathroom, BATHROOM_OPTIONS),
      extras: presetExtras.length ? presetExtras : existingExtras.length ? existingExtras : [],
      isPartialCleaning:
        presetCustomization.isPartialCleaning ?? existingCustomization.isPartialCleaning ?? false,
      excludedAreas: presetCustomization.excludedAreas ?? existingCustomization.excludedAreas ?? [],
    };

    setServiceCustomization(rebookCustomization);
    
    // Batch form value updates to minimize re-renders
    try {
      form.setValue("customization", toFormCustomization(rebookCustomization), { shouldValidate: false });
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
    } catch (error) {
      console.warn("Error setting form values:", error);
    }

    setCardCustomizations((prev) => ({
      ...prev,
      [service.id]: rebookCustomization,
    }));

    toast({
      title: "Details loaded",
      description: "Review the pre-filled booking and make any adjustments you need.",
    });
  }, [bookingIdParam, prefilledBookingId]);

  useEffect(() => {
    if (currentStep === "success") {
      router.push("/customer/appointments");
    }
  }, [currentStep, router]);

  const addBookingToStorage = useCallback(() => {
    if (!bookingData || !serviceCustomization || !selectedService) {
      toast({
        title: "Missing information",
        description: "Please complete the service selection and booking form before finishing.",
        variant: "destructive",
      });
      return null;
    }

    const bookingDate = bookingData.date instanceof Date ? bookingData.date : new Date(bookingData.date);
    const formattedDate = Number.isNaN(bookingDate.getTime())
      ? new Date().toISOString().split("T")[0]
      : bookingDate.toISOString().split("T")[0];

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
        extras: serviceCustomization.extras && serviceCustomization.extras.length > 0
          ? serviceCustomization.extras
              .filter(extra => extra.quantity > 0)
              .map(extra => extra.quantity > 1 ? `${extra.name} (${extra.quantity})` : extra.name)
          : ["None"],
        isPartialCleaning: serviceCustomization.isPartialCleaning,
        excludedAreas: serviceCustomization.excludedAreas,
      },
    };

    const existing = readStoredBookings();
    persistBookings([newBooking, ...existing]);
    setRecentBookingId(newBooking.id);
    return newBooking;
  }, [bookingData, serviceCustomization, selectedService, toast]);

  // Handle service selection
  const handleServiceSelect = (serviceName: string, customization?: ServiceCustomization) => {
    if (!selectedCategory) return;
    const services = servicesByIndustry[selectedCategory];
    const service = services.find(s => s.name === serviceName);
    if (service && customization) {
      setSelectedService(service);
      setServiceCustomization(customization);
      form.setValue("service", serviceName, { shouldValidate: false });
      form.setValue("customization", toFormCustomization(customization), { shouldValidate: false });
      
      // Scroll to customer form after a short delay
      setTimeout(() => {
        const formElement = document.getElementById('customer-form');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  };

  // Handle booking form submission - move to payment step
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (typeof window !== "undefined") {
      const payload: StoredAddress = {
        address: values.address,
        ...(values.aptNo ? { aptNo: values.aptNo } : {}),
        ...(values.zipCode ? { zipCode: values.zipCode } : {}),
      };
      localStorage.setItem(BOOKING_ADDRESS_KEY, JSON.stringify(payload));
      setStoredAddress(payload);
    }
    setBookingData(values);
    setCurrentStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Get service price
  const getServicePrice = (serviceName: string) => {
    if (!selectedCategory) return 0;

    // If we have dynamic pricing tiers and customization (e.g., Home Cleaning), prefer tier price
    if (pricingRows.length > 0 && serviceCustomization) {
      const idx = AREA_SIZE_OPTIONS.findIndex((opt) => opt === serviceCustomization.squareMeters);
      if (idx >= 0 && idx < pricingRows.length) {
        const tier = pricingRows[idx];
        if (tier && typeof tier.price === "number" && !Number.isNaN(tier.price)) {
          return tier.price;
        }
      }
    }

    // Fallback to hardcoded service prices
    const services = servicesByIndustry[selectedCategory] ?? [];
    const service = services.find((s) => s.name === serviceName);
    return service?.price || 0;
  };

  // Calculate total
  const calculateTotal = () => {
    if (!bookingData) return { subtotal: 0, tax: 0, total: 0 };
    const subtotal = getServicePrice(bookingData.service);
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  // Handle cash payment
  const handleCashPayment = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const saved = addBookingToStorage();
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

  // Handle online payment
  const handleOnlinePayment = async (values: z.infer<typeof paymentSchema>) => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const saved = addBookingToStorage();
      if (!saved) return;
      toast({
        title: "Payment Successful!",
        description: "Your booking has been saved.",
      });
      setCurrentStep("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Format card number
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  // Format expiry date
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.slice(0, 2) + "/" + v.slice(2, 4);
    }
    return v;
  };

  // Category Selection Screen
  if (currentStep === "category") {
    const categoriesAvailable = industryOptions.length > 0;
    return (
      <div className="min-h-screen">
        <Navigation />
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
        <Navigation />
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
    
    return (
      <div className="min-h-screen">
        <Navigation />
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
                    <strong>Frequency:</strong> {serviceCustomization.frequency}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>Area Size:</strong> {serviceCustomization.squareMeters}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>Bedroom:</strong> {serviceCustomization.bedroom}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>Bathroom:</strong> {serviceCustomization.bathroom}
                  </div>
                  {serviceCustomization.extras &&
                    Array.isArray(serviceCustomization.extras) &&
                    serviceCustomization.extras.length > 0 &&
                    serviceCustomization.extras.some(extra => extra.quantity > 0) && (
                      <div className={styles.summaryItem}>
                        <strong>Extras:</strong> {serviceCustomization.extras
                          .filter(extra => extra.quantity > 0)
                          .map(extra => extra.quantity > 1 ? `${extra.name} (${extra.quantity})` : extra.name)
                          .join(", ")}
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
                    <span>Tax (8%):</span>
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

              {/* Payment Form */}
              <div className="md:col-span-2">
                <div className={styles.paymentCard}>
                  <h3 className={styles.paymentTitle}>Payment Information</h3>

                  {/* Online Payment Form */}
                  <div className={styles.securityBadge}>
                    <Lock className="h-4 w-4" />
                    <span>Secure Payment - Your information is encrypted</span>
                  </div>

                  <Form {...paymentForm}>
                    <form onSubmit={paymentForm.handleSubmit(handleOnlinePayment)} className="space-y-4 mt-4">
                      <FormField
                            control={paymentForm.control}
                            name="cardNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Card Number</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                      placeholder="1234 5678 9012 3456"
                                      className="pl-10"
                                      maxLength={19}
                                      {...field}
                                      onChange={(e) => {
                                        const formatted = formatCardNumber(e.target.value);
                                        field.onChange(formatted);
                                      }}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={paymentForm.control}
                            name="cardName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name on Card</FormLabel>
                                <FormControl>
                                  <Input placeholder="JOHN DOE" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={paymentForm.control}
                              name="expiryDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Expiry Date</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="MM/YY"
                                      maxLength={5}
                                      {...field}
                                      onChange={(e) => {
                                        const formatted = formatExpiryDate(e.target.value);
                                        field.onChange(formatted);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={paymentForm.control}
                              name="cvv"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>CVV</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="password"
                                      placeholder="123"
                                      maxLength={4}
                                      {...field}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "");
                                        field.onChange(value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <Button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full h-12 text-base mt-6"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Processing Payment...
                              </>
                            ) : (
                              <>
                                Pay ${total.toFixed(2)}
                                <Lock className="ml-2 h-5 w-5" />
                              </>
                            )}
                      </Button>
                    </form>
                  </Form>
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
    const categoryServices = servicesByIndustry[selectedCategory] ?? [];
    const showSummary = selectedService && serviceCustomization;
    const { subtotal, tax, total } = showSummary ? calculateTotal() : { subtotal: 0, tax: 0, total: 0 };
    
    return (
      <div className="min-h-screen">
        <Navigation />
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

            {/* Service Type Selection - Always show flip cards */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Select Services</h2>
              {categoryServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {categoryServices.map((service) => (
                    <FrequencyAwareServiceCard
                      key={service.id}
                      service={service}
                      isSelected={selectedService?.id === service.id}
                      onSelect={handleServiceSelect}
                      flippedCardId={flippedCardId}
                      onFlip={handleCardFlip}
                      customization={getCardCustomization(service.id)}
                      onCustomizationChange={handleCustomizationChange}
                      industryId={selectedIndustryId}
                      serviceCategory={allServiceCategories.find(cat => cat.name === service.name)}
                      availableExtras={allExtras}
                      availableVariables={allVariables}
                      frequencyOptions={allFrequencyOptions}
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
                                placeholder="John"
                                {...field}
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
                                placeholder="Doe"
                                {...field}
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
                                placeholder="john@example.com"
                                {...field}
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
                                  placeholder="1234567890" 
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => handlePhoneChange(e, field)}
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
                                placeholder="9876543210" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => handlePhoneChange(e, field)}
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
                              <Input type="email" className={styles.formInput} placeholder="alternate@example.com" {...field} />
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

                      {/* Address Field */}
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
                                disabled={disableAddressFields}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Apt Number Field */}
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
                                disabled={disableAddressFields}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Zip Code Field */}
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem className={styles.formGroup}>
                            <FormLabel className={styles.formLabel}>Zip Code</FormLabel>
                            <FormControl>
                              <Input
                                className={styles.formInput}
                                placeholder="60601"
                                maxLength={10}
                                {...field}
                                disabled={disableAddressFields}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                                    disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Time Selection */}
                      <div className="col-span-full">
                        <FormField
                          control={form.control}
                          name="time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={styles.formLabel}>Select Time Slot</FormLabel>
                              <div className={styles.timeSlots}>
                                {availableTimes.map((time) => (
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
