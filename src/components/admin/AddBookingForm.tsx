"use client";

import { supabase } from '@/lib/supabaseClient';
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { serviceCategoriesService, ServiceCategory } from '@/lib/serviceCategories';
import { frequencyDepOptionNamesForCategory, getFrequencyDependencies } from '@/lib/frequencyFilter';
import { pricingParamAppliesToSelection } from '@/lib/pricingParameterVisibility';
import { filterFrequencyOptionsForServiceCategory } from '@/lib/form1CustomerBooking';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Minus, Search, X, User, Mail, Phone, CreditCard, Info } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { adminCustomerApiHeaders } from "@/lib/adminCustomersStorage";
import { getTodayLocalDate, formatDateLocal } from "@/lib/date-utils";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { BookingPhoneInput } from "@/components/admin/BookingPhoneInput";
import { PHONE_FIELD_HELPER_TEXT } from "@/components/ui/phone-field";
import { isValidPhoneNumber } from "react-phone-number-input";
import { resolveQtyBasedExtraLine } from "@/lib/extraQtyPricing";
import { hourlyExtrasBillableSubtotal } from "@/lib/hourlyServiceBookingDuration";
import {
  getMarketingCouponGateFailure,
  shouldEnforceMarketingCouponLocationSubset,
} from "@/lib/marketingCouponGate";
import { couponRequiresCustomerEmailForScope } from "@/lib/marketingCouponCustomerScope";
import { popupDisplayAppliesToSurface } from "@/lib/frequencyPopupDisplay";
import { getExtraCustomerDisplayName } from "@/lib/form1CustomerBooking";
import {
  bookingFormPresetIconTextClass,
  bookingFormPresetRichIconSrc,
  DEFAULT_INDUSTRY_EXTRA_ICON_SRC,
  industryFormIconIsImageSrc,
  resolveIndustryExtraPresetLucideIcon,
  resolveIndustryFormLucideIcon,
} from "@/lib/industryExtraIcons";
import { industryExtraPassesBookingDependencyRules } from "@/lib/industryExtraDependencies";
import { normalizeTimeToHHmm } from "@/lib/schedulingFilters";
import { FORM1_SEEDED_SERVICE_CATEGORIES } from "@/lib/form1DefaultServiceCategoryConfig";
import { FORM2_STANDALONE_PACKAGE_CATEGORY } from "@/lib/bookingFormScope";

/** `YYYY-MM-DD` for `<input type="date" />` (handles ISO strings from API). */
function normalizeBookingDateInput(raw: unknown): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function slotMatchesSelectedTime(slot: string, selectedTime: string): boolean {
  if (!selectedTime.trim()) return false;
  return normalizeTimeToHHmm(slot) === normalizeTimeToHHmm(selectedTime);
}

type Extra = {
  id: string;
  name: string;
  icon?: string;
  time: number; // in minutes
  serviceCategory: string;
  price: number;
  display: "frontend-backend-admin" | "backend-admin" | "admin-only" | "Both" | "Booking" | "Quote"; // Support legacy values
  qtyBased: boolean;
  maximumQuantity?: number;
  exemptFromDiscount?: boolean;
  description?: string;
  serviceChecklists?: string[];
  differentOnCustomerEnd?: boolean;
  customerEndName?: string | null;
  showExplanationIconOnForm?: boolean;
  explanationTooltipText?: string | null;
  enablePopupOnSelection?: boolean;
  popupContent?: string | null;
  popupDisplay?: string | null;
  show_based_on_frequency?: boolean;
  frequency_options?: string[];
  show_based_on_service_category?: boolean;
  service_category_options?: string[];
  show_based_on_variables?: boolean;
  variable_options?: string[];
};

type FrequencyRow = {
  id: string;
  name: string;
  display: "Both" | "Booking" | "Quote";
  isDefault?: boolean;
  discount?: number;
  discountType?: "%" | "$";
  discount_type?: "%" | "$";  // API returns snake_case
  occurrence_time?: "onetime" | "recurring";
  frequency_repeats?: string;
  shorter_job_length?: "yes" | "no";
  shorter_job_length_by?: string;
  exclude_first_appointment?: boolean;
  frequency_discount?: "all" | "exclude-first";
  charge_one_time_price?: boolean;
  show_explanation?: boolean;
  enable_popup?: boolean;
  explanation_tooltip_text?: string | null;
  popup_content?: string | null;
  popup_display?: string | null;
};

type AppliedCoupon = {
  mode: "coupon-code" | "amount" | "percent";
  code?: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  discountAmount: number;
};

type Provider = {
  id: string;
  name: string;
  available: boolean;
  rating?: number;
  specialties?: string[];
  wage?: number;
  wageType?: 'percentage' | 'fixed' | 'hourly';
};

type ProviderWithWage = Provider & {
  tempWage?: number;
  tempWageType?: 'percentage' | 'fixed' | 'hourly';
};

type PricingParameter = {
  id: string;
  name: string;
  price: number;
  time_minutes: number;
  display: string;
  service_category: string;
  service_category2?: string | null;
  frequency: string;
  variable_category: string;
  description: string;
  is_default: boolean;
  show_based_on_frequency: boolean;
  show_based_on_service_category: boolean;
  show_based_on_service_category2?: boolean;
  excluded_extras: string[];
  excluded_services: string[];
  sort_order: number;
};

type PricingVariable = {
  id: string;
  name: string;
  category?: string | null;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  joinDate?: string;
  totalBookings?: number;
  totalSpent?: string;
  status?: string;
  lastBooking?: string;
};

type CustomerSavedCardOption = {
  brand: string;
  last4: string;
  stripePaymentMethodId: string | null;
};

type Industry = { id: string; name: string; customer_booking_form_layout?: "form1" | "form2" };

const createEmptyBookingForm = () => ({
  customerType: "new",
  customerId: "" as string,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  service: "",
  duration: "",
  durationUnit: "Hours",
  frequency: "",
  selectedExtras: [] as string[],
  extraQuantities: {} as Record<string, number>,
  excludeQuantities: {} as Record<string, number>,
  privateBookingNotes: [] as string[],
  privateCustomerNotes: [] as string[],
  serviceProviderNotes: [] as string[],
  privateBookingNote: "",
  privateCustomerNote: "",
  serviceProviderNote: "",
  notifyMoreTime: false,
  zipCode: "",
  serviceProvider: "",
  waitingList: false,
  scheduleType: "From Schedule",
  selectedDate: "",
  selectedTime: "",
  priority: "Medium",
  paymentMethod: "",
  /** When payment is Credit Card: use a new card (payment link / manual) vs saved Stripe PM */
  creditCardMode: "new" as "new" | "saved",
  savedStripePaymentMethodId: "",
  cardNumber: "",
  notes: "",
  adjustServiceTotal: false,
  adjustPrice: false,
  adjustmentAmount: "",
  adjustmentServiceTotalAmount: "",
  adjustTime: false,
  adjustedHours: "00",
  adjustedMinutes: "00",
  priceAdjustmentNote: "",
  timeAdjustmentNote: "",
  keyInfoOption: "",
  keepKeyWithProvider: false,
  customerNoteForProvider: "",
  couponCodeTab: "coupon-code",
  couponCode: "",
  couponType: "coupon-code",
  giftCardCode: "",
  excludeCancellationFee: false,
  excludeMinimumFee: false,
  excludeCustomerNotification: false,
  excludeProviderNotification: false,
  createRecurring: false,
  recurringEndDate: "",
  recurringOccurrencesAhead: 8,
  draftQuoteExpiresOn: "",
});

export type AddBookingFormProps = {
  /** When set (e.g. in a sheet), loads this booking; URL `bookingId` is ignored if `embedded`. */
  bookingIdOverride?: string | null;
  /** Rendered inside admin Bookings sheet — skip full-page navigation after save. */
  embedded?: boolean;
  onSaved?: () => void;
  onClose?: () => void;
};

export function AddBookingForm({
  bookingIdOverride = null,
  embedded = false,
  onSaved,
  onClose,
}: AddBookingFormProps) {
  const embInk = embedded
    ? {
        labelSm: "text-sm text-slate-900",
        labelSmBlock: "text-sm font-medium mb-2 block text-slate-900",
        h3: "text-lg font-semibold mb-4 text-slate-900",
        h3t: "text-lg font-semibold mb-2 text-slate-900",
        mutedXs: "text-xs text-slate-600",
        subSm: "text-sm text-slate-700",
        softSm: "text-sm text-slate-800",
        draftWrap: "space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3",
        plain: "text-slate-900",
      }
    : {
        labelSm: "text-sm text-white",
        labelSmBlock: "text-sm font-medium mb-2 block text-white",
        h3: "text-lg font-semibold mb-4 text-white",
        h3t: "text-lg font-semibold mb-2 text-white",
        mutedXs: "text-xs text-white/70",
        subSm: "text-sm text-white/80",
        softSm: "text-sm text-white/90",
        draftWrap: "space-y-2 rounded-md border border-white/20 p-3 bg-white/5",
        plain: "text-white",
      };

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const [newBooking, setNewBooking] = useState(createEmptyBookingForm());
  const [customerSavedCards, setCustomerSavedCards] = useState<CustomerSavedCardOption[]>([]);
  const [businessPaymentProvider, setBusinessPaymentProvider] = useState<"stripe" | "authorize_net" | null>(null);
  const [errors, setErrors] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    service: false,
    selectedDate: false,
    selectedTime: false,
    address: false,
  });
  const [frequencies, setFrequencies] = useState<FrequencyRow[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [allExtras, setAllExtras] = useState<Extra[]>([]);
  const [pricingParameters, setPricingParameters] = useState<PricingParameter[]>([]);
  const [variableCategories, setVariableCategories] = useState<string[]>([]);
  const [categoryValues, setCategoryValues] = useState<Record<string, string>>({});
  const [isPartialCleaning, setIsPartialCleaning] = useState(false);
  const [excludeParameters, setExcludeParameters] = useState<any[]>([]);
  const [selectedExcludeParams, setSelectedExcludeParams] = useState<string[]>([]);
  const [frequencyDependencies, setFrequencyDependencies] = useState<any>(null);
  const [frequencySelectionPopup, setFrequencySelectionPopup] = useState<{ title: string; html: string } | null>(null);
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showPrivateBookingNote, setShowPrivateBookingNote] = useState(false);
  const [showPrivateCustomerNote, setShowPrivateCustomerNote] = useState(false);
  const [showServiceProviderNote, setShowServiceProviderNote] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [showAllProvidersModal, setShowAllProvidersModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [providerWage, setProviderWage] = useState<string>('');
  const [providerWageType, setProviderWageType] = useState<'percentage' | 'fixed' | 'hourly'>('hourly');
  const providerWageRef = useRef(providerWage);
  providerWageRef.current = providerWage;
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [isFirstAppointment, setIsFirstAppointment] = useState(true);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [filteredProvidersByDate, setFilteredProvidersByDate] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>("");
  const selectedIndustry = useMemo(
    () => industries.find((i) => i.id === selectedIndustryId) ?? null,
    [industries, selectedIndustryId],
  );
  const bookingFormScopeForCatalog: "form1" | "form2" =
    selectedIndustry?.customer_booking_form_layout === "form2" ? "form2" : "form1";
  const isForm2Catalog = bookingFormScopeForCatalog === "form2";
  const extrasListingKindForCatalog = bookingFormScopeForCatalog === "form2" ? "addon" : "extra";
  const [pricingVariables, setPricingVariables] = useState<PricingVariable[]>([]);
  const [selectedForm2Item, setSelectedForm2Item] = useState<string>("");
  const [hasLocationBasedFrequencies, setHasLocationBasedFrequencies] = useState(false);
  const [cancellationFeeDisplay, setCancellationFeeDisplay] = useState<{ enabled: boolean; amount: number; currency: string } | null>(null);
  const [specificProviderForAdmin, setSpecificProviderForAdmin] = useState(true);
  const [priceAdjustmentNoteEnabled, setPriceAdjustmentNoteEnabled] = useState(false);
  const [timeAdjustmentNoteEnabled, setTimeAdjustmentNoteEnabled] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // Load store options (specific_provider_for_admin, price/time adjustment note settings)
  useEffect(() => {
    if (!currentBusiness?.id) return;
    fetch(`/api/admin/store-options?businessId=${currentBusiness.id}`, {
      headers: { "x-business-id": currentBusiness.id },
    })
      .then((r) => r.json())
      .then((data) => {
        const opts = data?.options;
        if (opts && typeof opts.specific_provider_for_admin === "boolean") {
          setSpecificProviderForAdmin(opts.specific_provider_for_admin);
        }
        if (opts && typeof opts.price_adjustment_note_enabled === "boolean") {
          setPriceAdjustmentNoteEnabled(opts.price_adjustment_note_enabled);
        }
        if (opts && typeof opts.time_adjustment_note_enabled === "boolean") {
          setTimeAdjustmentNoteEnabled(opts.time_adjustment_note_enabled);
        }
      })
      .catch(() => {});
  }, [currentBusiness?.id]);

  // Clear provider selection when specific_provider_for_admin is disabled
  useEffect(() => {
    if (!specificProviderForAdmin) {
      setSelectedProvider(null);
      setNewBooking((prev) => (prev.serviceProvider ? { ...prev, serviceProvider: "" } : prev));
    }
  }, [specificProviderForAdmin]);

  // Form 2 does not use partial-cleaning / exclude-parameters behavior.
  useEffect(() => {
    if (!isForm2Catalog) return;
    setIsPartialCleaning(false);
    setSelectedExcludeParams([]);
    setNewBooking((prev) => ({ ...prev, excludeQuantities: {} }));
  }, [isForm2Catalog]);

  // Load cancellation settings for Payment Summary display
  useEffect(() => {
    if (!currentBusiness?.id) return;
    fetch(`/api/admin/cancellation-settings?businessId=${encodeURIComponent(currentBusiness.id)}`, {
      headers: { "x-business-id": currentBusiness.id },
    })
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || {};
        if (s.chargeFee === "yes" && s.feeAmount != null) {
          const amount = parseFloat(String(s.feeAmount));
          if (!Number.isNaN(amount) && amount >= 0) {
            setCancellationFeeDisplay({
              enabled: true,
              amount,
              currency: s.feeCurrency || "$",
            });
            return;
          }
        }
        setCancellationFeeDisplay({ enabled: false, amount: 0, currency: "$" });
      })
      .catch(() => setCancellationFeeDisplay(null));
  }, [currentBusiness?.id]);

  // Load industries from API (runs once)
  useEffect(() => {
    const fetchIndustries = async () => {
      if (!currentBusiness) return;
      try {
        const res = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const data = await res.json();
        if (!res.ok || !data.industries?.length) return;
        setIndustries(data.industries);
        setSelectedIndustryId((prev) => prev || data.industries[0]?.id || "");
      } catch (e) {
        console.error("Error loading industries:", e);
      }
    };
    fetchIndustries();
  }, [currentBusiness]);

  // Detect if industry uses location-based frequency filtering (required for zip-gating services)
  useEffect(() => {
    if (!selectedIndustryId || !currentBusiness?.id) {
      setHasLocationBasedFrequencies(false);
      return;
    }
    fetch(
      `/api/industry-frequency?industryId=${selectedIndustryId}&businessId=${encodeURIComponent(
        currentBusiness.id,
      )}&includeAll=true&bookingFormScope=${bookingFormScopeForCatalog}`,
    )
      .then((r) => r.json())
      .then((data) => {
        const freqs = data.frequencies || [];
        const hasLocation = freqs.some((f: any) => f?.show_based_on_location === true);
        setHasLocationBasedFrequencies(hasLocation);
      })
      .catch(() => setHasLocationBasedFrequencies(false));
  }, [selectedIndustryId, currentBusiness?.id, bookingFormScopeForCatalog]);

  // Load frequencies from API (uses selected industry; requires zip when location-based)
  useEffect(() => {
    if (!currentBusiness || !selectedIndustryId) return;
    const zipParam = newBooking.zipCode?.trim().replace(/\s/g, "");
    const zipValid = zipParam && zipParam.length >= 5;
    if (hasLocationBasedFrequencies && !zipValid) {
      setFrequencies([]);
      setNewBooking(prev => prev.service || prev.frequency ? { ...prev, service: "", frequency: "", selectedExtras: [], extraQuantities: {}, excludeQuantities: {}, categoryValues: {} } : prev);
      setCategoryValues({});
      setServiceCategories([]);
      return;
    }
    const fetchFrequencies = async () => {
      try {
        const url = hasLocationBasedFrequencies
          ? `/api/industry-frequency?industryId=${selectedIndustryId}&businessId=${encodeURIComponent(
              currentBusiness.id,
            )}&zipcode=${encodeURIComponent(zipParam)}&bookingFormScope=${bookingFormScopeForCatalog}`
          : `/api/industry-frequency?industryId=${selectedIndustryId}&businessId=${encodeURIComponent(
              currentBusiness.id,
            )}&includeAll=true&bookingFormScope=${bookingFormScopeForCatalog}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || !data.frequencies) return;
        const visible = data.frequencies.filter((f: any) => f && (f.display === "Both" || f.display === "Booking"));
        if (visible.length > 0) {
          setFrequencies(visible);
          const defaultFreq =
            visible.find((f: any) => f.is_default === true || f.isDefault === true) || visible[0];
          if (defaultFreq) {
            setNewBooking(prev => prev.frequency ? prev : { ...prev, frequency: defaultFreq.name });
          }
        } else {
          setFrequencies([]);
        }
      } catch (e) {
        console.error("Error loading frequencies:", e);
      }
    };
    fetchFrequencies();
  }, [currentBusiness, selectedIndustryId, newBooking.zipCode, hasLocationBasedFrequencies, bookingFormScopeForCatalog]);

  // Load frequency dependencies when frequency changes
  useEffect(() => {
    if (!selectedIndustryId || !newBooking.frequency) {
      setFrequencyDependencies(null);
      return;
    }
    getFrequencyDependencies(selectedIndustryId, newBooking.frequency, {
      businessId: currentBusiness?.id,
      bookingFormScope: bookingFormScopeForCatalog,
    })
      .then(setFrequencyDependencies)
      .catch(() => setFrequencyDependencies(null));
  }, [selectedIndustryId, newBooking.frequency, currentBusiness?.id, bookingFormScopeForCatalog]);

  // Update exclude parameters when frequency dependencies or industry change
  useEffect(() => {
    if (!selectedIndustryId) return;
    fetch(`/api/exclude-parameters?industryId=${selectedIndustryId}`)
      .then((r) => r.json())
      .then((excludeData) => {
        if (!excludeData.excludeParameters) return;
        if (frequencyDependencies?.excludeParameters?.length > 0) {
          setExcludeParameters(
            excludeData.excludeParameters.filter((param: any) =>
              frequencyDependencies.excludeParameters.includes(param.name)
            )
          );
        } else {
          setExcludeParameters(excludeData.excludeParameters);
        }
      })
      .catch(() => setExcludeParameters([]));
  }, [frequencyDependencies, selectedIndustryId]);

  // Load extras from API (uses selected industry)
  useEffect(() => {
    if (!selectedIndustryId || !currentBusiness?.id) return;
    const baseQs = `industryId=${selectedIndustryId}&businessId=${currentBusiness.id}&bookingFormScope=${bookingFormScopeForCatalog}`;
    const urls =
      bookingFormScopeForCatalog === "form2"
        ? [
            `/api/extras?${baseQs}`,
            `/api/extras?${baseQs}&listingKind=addon`,
            `/api/extras?${baseQs}&listingKind=extra`,
          ]
        : [`/api/extras?${baseQs}&listingKind=${extrasListingKindForCatalog}`];

    Promise.all(urls.map((u) => fetch(u).then((r) => (r.ok ? r.json() : { extras: [] }))))
      .then((payloads) => {
        const merged = payloads.flatMap((p) => (Array.isArray(p.extras) ? p.extras : []));
        const rows = merged.filter((e: any) => !!e);
        const deduped = rows.filter(
          (e: any, idx: number, arr: any[]) =>
            arr.findIndex((x) => String(x?.id) === String(e?.id)) === idx,
        );
        setAllExtras(
          deduped.map((e: any) => ({
            id: e.id,
            name: e.name,
            icon: e.icon,
            time: e.time_minutes,
            serviceCategory: e.service_category || "",
            price: e.price,
            display: e.display,
            qtyBased: e.qty_based,
            maximumQuantity: e.maximum_quantity,
            pricingStructure: e.pricing_structure === "manual" ? "manual" : "multiply",
            manualPrices: Array.isArray(e.manual_prices) ? e.manual_prices : [],
            exemptFromDiscount: e.exempt_from_discount,
            description: e.description,
            serviceChecklists: [],
            differentOnCustomerEnd: Boolean(e.different_on_customer_end),
            customerEndName: e.customer_end_name ?? null,
            showExplanationIconOnForm: Boolean(e.show_explanation_icon_on_form),
            explanationTooltipText: e.explanation_tooltip_text ?? null,
            enablePopupOnSelection: Boolean(e.enable_popup_on_selection),
            popupContent: e.popup_content ?? null,
            popupDisplay: e.popup_display ?? null,
            show_based_on_frequency: Boolean(e.show_based_on_frequency),
            frequency_options: Array.isArray(e.frequency_options) ? [...e.frequency_options] : [],
            show_based_on_service_category: Boolean(e.show_based_on_service_category),
            service_category_options: Array.isArray(e.service_category_options)
              ? [...e.service_category_options]
              : [],
            show_based_on_variables: Boolean(e.show_based_on_variables),
            variable_options: Array.isArray(e.variable_options) ? [...e.variable_options] : [],
          })),
        );
      })
      .catch((e) => console.error("Error loading extras:", e));
  }, [selectedIndustryId, currentBusiness?.id, bookingFormScopeForCatalog, extrasListingKindForCatalog]);

  // Update service categories when frequency dependencies or industry change
  useEffect(() => {
    if (!selectedIndustryId) return;
    serviceCategoriesService.getServiceCategoriesByIndustry(selectedIndustryId, bookingFormScopeForCatalog).then((categories) => {
      const filtered = categories.filter((category: ServiceCategory) => {
        if (!category.service_category_frequency) return true;
        if (!frequencyDependencies) return true;
        if (!frequencyDependencies.serviceCategories?.length) return true;
        return frequencyDependencies.serviceCategories.includes(String(category.id));
      });
      setServiceCategories(filtered);
    }).catch(() => setServiceCategories([]));
  }, [frequencyDependencies, selectedIndustryId, bookingFormScopeForCatalog]);

  // Pre-fill provider wage from service category override when service is selected
  useEffect(() => {
    if (!newBooking.service || serviceCategories.length === 0) return;
    const category = serviceCategories.find((cat: ServiceCategory) => cat.name === newBooking.service);
    const override = category?.override_provider_pay as { enabled?: boolean; amount?: string; payType?: 'fixed' | 'hourly'; currency?: string } | undefined;
    if (override?.enabled && override.amount !== undefined && override.amount !== null) {
      setProviderWage(String(override.amount));
      const payType = override.payType ?? (override.currency === '$' ? 'fixed' : 'hourly');
      setProviderWageType(payType === 'fixed' ? 'fixed' : 'hourly');
    }
  }, [newBooking.service, serviceCategories]);

  // Filter extras: service category list + Form 1 frequency allow-list (only for frequency-scoped extras) + per-extra dependency toggles
  useEffect(() => {
    if (!currentBusiness || allExtras.length === 0) {
      setExtras([]);
      return;
    }

    let filteredExtras = [...allExtras];

    if (newBooking.service) {
      const selectedServiceCategory = serviceCategories.find((cat) => cat.name === newBooking.service);
      if (selectedServiceCategory) {
        const useFreq = Boolean(selectedServiceCategory.service_category_frequency);
        const depsLoaded = frequencyDependencies != null;
        const formAllowIds = depsLoaded
          ? (Array.isArray(frequencyDependencies.extras)
              ? frequencyDependencies.extras.map((x: unknown) => String(x))
              : [])
          : [];

        // Form 1-only narrowing by service-category `extras` list.
        // Form 2 add-ons/extras should still render even when that Form 1 list is empty.
        if (!isForm2Catalog && !useFreq) {
          const ce = selectedServiceCategory.extras;
          if (ce && ce.length > 0) {
            filteredExtras = filteredExtras.filter((e) =>
              ce.some((serviceExtraId: unknown) => String(serviceExtraId) === String(e.id)),
            );
          } else {
            filteredExtras = [];
          }
        }

        filteredExtras = filteredExtras.filter((e) =>
          industryExtraPassesBookingDependencyRules(
            {
              id: String(e.id),
              show_based_on_frequency: e.show_based_on_frequency,
              frequency_options: e.frequency_options,
              show_based_on_service_category: e.show_based_on_service_category,
              service_category_options: e.service_category_options,
              show_based_on_variables: e.show_based_on_variables,
              variable_options: e.variable_options,
            },
            {
              selectedFrequency: newBooking.frequency,
              selectedServiceCategoryName: selectedServiceCategory.name,
              selectedServiceCategoryId: String(selectedServiceCategory.id ?? ""),
              categoryValues,
              serviceCategoryUsesFrequencyDeps: useFreq,
              frequencyDepsLoaded: depsLoaded,
              frequencyFormAllowExtraIds: formAllowIds,
            },
          ),
        );
      }
    }

    setExtras(filteredExtras);
  }, [
    currentBusiness,
    newBooking.service,
    newBooking.frequency,
    serviceCategories,
    frequencyDependencies,
    allExtras,
    categoryValues,
    isForm2Catalog,
  ]);

  // Load providers from API
  useEffect(() => {
    const fetchProviders = async () => {
      if (!currentBusiness?.id) {
        setAllProviders([]);
        return;
      }
      
      try {
        const response = await fetch(`/api/admin/providers?businessId=${currentBusiness.id}`);
        const data = await response.json();
        
        if (response.ok && data.providers) {
          setAllProviders(data.providers.map((p: any) => ({
            id: p.id,
            name: p.name,
            available: true, // Default to available, can be updated from database
            rating: p.rating || 0,
            specialties: p.specialties || [],
            wage: p.wage || 0,
            wageType: p.wageType || 'hourly'
          })));
        }
      } catch (error) {
        console.error('Error loading providers:', error);
        setAllProviders([]);
      }
    };

    fetchProviders();
  }, [currentBusiness]);

  // Load customers from API
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!currentBusiness) {
        setCustomers([]);
        return;
      }
      
      try {
        const response = await fetch(`/api/customers?business_id=${currentBusiness.id}`);
        const data = await response.json();
        
        if (response.ok && data.data) {
          setCustomers(data.data);
        }
      } catch (error) {
        console.error('Error loading customers:', error);
        setCustomers([]);
      }
    };

    fetchCustomers();
  }, [currentBusiness]);

  // Load pricing parameters from database (uses selected industry)
  useEffect(() => {
    if (!selectedIndustryId || !currentBusiness?.id) return;
    const load = async () => {
      try {
        const pricingRes = await fetch(
          `/api/pricing-parameters?industryId=${encodeURIComponent(selectedIndustryId)}&businessId=${encodeURIComponent(currentBusiness.id)}&bookingFormScope=${bookingFormScopeForCatalog}`,
        );
        const pricingData = await pricingRes.json();
        if (pricingData.pricingParameters) {
          setPricingParameters(pricingData.pricingParameters);
          const cats = Array.from(new Set(pricingData.pricingParameters.map((p: PricingParameter) => p.variable_category))).filter(Boolean) as string[];
          setVariableCategories(cats);
          // Merge so edit-mode / loaded booking values are not wiped when params arrive
          setCategoryValues((prev) => {
            const next: Record<string, string> = {};
            for (const c of cats) {
              const existing = prev[c];
              next[c] = existing != null && String(existing).trim() !== '' ? String(existing).trim() : '';
            }
            return next;
          });
        }
      } catch (e) {
        console.error("Error loading pricing parameters:", e);
      }
    };
    load();
  }, [selectedIndustryId, currentBusiness?.id, bookingFormScopeForCatalog]);

  // Form 2 item catalog (pricing variables)
  useEffect(() => {
    if (!isForm2Catalog || !selectedIndustryId || !currentBusiness?.id) {
      setPricingVariables([]);
      setSelectedForm2Item("");
      return;
    }
    const load = async () => {
      try {
        const res = await fetch(
          `/api/pricing-variables?industryId=${encodeURIComponent(selectedIndustryId)}&businessId=${encodeURIComponent(currentBusiness.id)}&bookingFormScope=form2`,
        );
        const data = await res.json();
        if (res.ok && Array.isArray(data.variables)) {
          const rows = data.variables as PricingVariable[];
          setPricingVariables(rows);
          setSelectedForm2Item((prev) => {
            if (prev && rows.some((r) => (r.category || r.name) === prev)) return prev;
            return rows[0]?.category || rows[0]?.name || "";
          });
        } else {
          setPricingVariables([]);
          setSelectedForm2Item("");
        }
      } catch (e) {
        console.error("Error loading pricing variables:", e);
        setPricingVariables([]);
        setSelectedForm2Item("");
      }
    };
    load();
  }, [isForm2Catalog, selectedIndustryId, currentBusiness?.id]);

  // Edit mode: embedded sheet uses `bookingIdOverride`; full page uses URL (override optional).
  const fromUrl = searchParams.get("bookingId");
  const fromProp =
    bookingIdOverride != null &&
    String(bookingIdOverride).trim() !== "" &&
    String(bookingIdOverride) !== "undefined" &&
    String(bookingIdOverride) !== "null"
      ? String(bookingIdOverride).trim()
      : null;
  const rawBookingId = embedded
    ? fromProp
    : fromUrl &&
        fromUrl.trim() !== "" &&
        fromUrl !== "undefined" &&
        fromUrl !== "null"
      ? fromUrl.trim()
      : fromProp;
  const editingBookingId = rawBookingId || null;
  /** Full-page flow from Draft/Quote → Create Booking: same save actions as new booking, not “Update”. */
  const finalizeFromDraftQuote =
    !embedded &&
    !!editingBookingId &&
    (searchParams.get("finalize") === "1" || searchParams.get("finalize") === "true");
  const useCreateStyleSaveActions = !editingBookingId || finalizeFromDraftQuote;
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [bookingLoadError, setBookingLoadError] = useState<string | null>(null);
  const [editingSavedStatus, setEditingSavedStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!editingBookingId || !currentBusiness?.id) {
      setBookingLoadError(null);
      setLoadingBooking(false);
      setEditingSavedStatus(null);
      return;
    }
    let cancelled = false;
    setLoadingBooking(true);
    setBookingLoadError(null);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          if (!cancelled) setBookingLoadError('Not authenticated');
          return;
        }
        const res = await fetch(`/api/bookings/${editingBookingId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'x-business-id': currentBusiness.id,
          },
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setBookingLoadError(json?.error || 'Failed to load booking');
          setLoadingBooking(false);
          return;
        }
        const b = json?.data;
        if (!b) {
          setBookingLoadError('Booking not found');
          setLoadingBooking(false);
          return;
        }
        setEditingSavedStatus(String(b.status ?? "pending"));
        const nameParts = (b.customer_name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const cust = (b.customization && typeof b.customization === 'object') ? b.customization : {};
        const couponFromCustomization = (cust && typeof cust === 'object' && cust.coupon && typeof cust.coupon === 'object')
          ? cust.coupon as Record<string, unknown>
          : null;
        const savedCouponCode = typeof b.coupon_code === 'string'
          ? b.coupon_code.trim()
          : (typeof couponFromCustomization?.code === 'string' ? couponFromCustomization.code.trim() : '');
        const savedCouponModeRaw = typeof b.coupon_mode === 'string'
          ? b.coupon_mode.trim()
          : (typeof couponFromCustomization?.mode === 'string' ? couponFromCustomization.mode.trim() : '');
        const savedCouponTypeRaw = typeof b.coupon_discount_type === 'string'
          ? b.coupon_discount_type.trim().toLowerCase()
          : (typeof couponFromCustomization?.discount_type === 'string' ? couponFromCustomization.discount_type.trim().toLowerCase() : '');
        const savedCouponValueRaw = b.coupon_discount_value ?? couponFromCustomization?.discount_value ?? null;
        const savedCouponAmountRaw = b.coupon_discount_amount ?? couponFromCustomization?.discount_amount ?? null;
        const savedCouponValue = savedCouponValueRaw != null ? Number(savedCouponValueRaw) : NaN;
        const savedCouponAmount = savedCouponAmountRaw != null ? Number(savedCouponAmountRaw) : NaN;
        const savedCouponMode = (savedCouponModeRaw === 'coupon-code' || savedCouponModeRaw === 'amount' || savedCouponModeRaw === 'percent')
          ? savedCouponModeRaw
          : null;
        const savedCouponType = (savedCouponTypeRaw === 'fixed' || savedCouponTypeRaw === 'percentage')
          ? savedCouponTypeRaw
          : null;
        const selectedExtras = Array.isArray(cust.selectedExtras) ? cust.selectedExtras : [];
        const extraQuantities = cust.extraQuantities && typeof cust.extraQuantities === 'object' ? cust.extraQuantities : {};
        const loadedCategoryValues: Record<string, string> = {};
        const rawCategoryMap =
          cust.categoryValues && typeof cust.categoryValues === 'object'
            ? (cust.categoryValues as Record<string, unknown>)
            : cust.category_values && typeof cust.category_values === 'object'
              ? (cust.category_values as Record<string, unknown>)
              : null;
        if (rawCategoryMap) {
          for (const [k, v] of Object.entries(rawCategoryMap)) {
            if (v == null) continue;
            const s = String(v).trim();
            if (s && s.toLowerCase() !== 'none') loadedCategoryValues[k] = s;
          }
        }
        const excludedAreas = Array.isArray(cust.excludedAreas) ? cust.excludedAreas : [];
        const excludeQuantities = cust.excludeQuantities && typeof cust.excludeQuantities === 'object' ? cust.excludeQuantities : {};
        let duration = '';
        let durationUnit: 'Hours' | 'Minutes' = 'Hours';
        if (b.duration_minutes != null && Number(b.duration_minutes) > 0) {
          const mins = Number(b.duration_minutes);
          if (mins >= 60) {
            duration = String(mins / 60);
            durationUnit = 'Hours';
          } else {
            duration = String(mins);
            durationUnit = 'Minutes';
          }
        }
        const paymentMethod = (b.payment_method === 'online' || b.payment_method === 'card' || b.payment_method === 'Credit Card') ? 'Credit Card' : 'Cash';
        setNewBooking(prev => ({
          ...prev,
          customerType: b.customer_id ? 'existing' : prev.customerType,
          customerId: b.customer_id || prev.customerId,
          firstName,
          lastName,
          email: (b.customer_email || '').trim(),
          phone: (b.customer_phone || '').trim(),
          address: (b.address || '').trim(),
          service: (b.service || '').trim(),
          frequency: (b.frequency || '').trim(),
          selectedDate: normalizeBookingDateInput(b.scheduled_date ?? b.date),
          selectedTime: normalizeTimeToHHmm(b.scheduled_time ?? b.time),
          paymentMethod,
          creditCardMode: "new",
          savedStripePaymentMethodId: "",
          couponCode: savedCouponCode || "",
          couponType: savedCouponMode === "amount" ? "amount" : (savedCouponMode === "percent" ? "percent" : "coupon-code"),
          notes: (b.notes || '').trim(),
          keyInfoOption: (() => {
            const ka = (cust as Record<string, unknown>).key_access ?? (cust as Record<string, unknown>).keyAccess;
            if (ka && typeof ka === 'object' && !Array.isArray(ka)) {
              const po = String((ka as Record<string, unknown>).primary_option ?? '').replace(/-/g, '_');
              return po === 'hide_keys' ? 'hide-keys' : 'someone-home';
            }
            return 'someone-home';
          })(),
          keepKeyWithProvider: (() => {
            const ka = (cust as Record<string, unknown>).key_access ?? (cust as Record<string, unknown>).keyAccess;
            if (ka && typeof ka === 'object' && !Array.isArray(ka)) {
              return Boolean((ka as Record<string, unknown>).keep_key);
            }
            return false;
          })(),
          customerNoteForProvider: (() => {
            const v = (cust as Record<string, unknown>).customer_note_for_provider ?? (cust as Record<string, unknown>).customerNoteForProvider;
            return typeof v === 'string' ? v : '';
          })(),
          selectedExtras,
          extraQuantities,
          categoryValues: loadedCategoryValues,
          excludeQuantities,
          zipCode: (b.zip_code || '').trim(),
          serviceProvider: (b.provider_id || '').trim(),
          privateBookingNotes: Array.isArray(b.private_booking_notes) ? b.private_booking_notes : [],
          privateCustomerNotes: Array.isArray(b.private_customer_notes) ? b.private_customer_notes : [],
          serviceProviderNotes: Array.isArray(b.service_provider_notes) ? b.service_provider_notes : [],
          duration,
          durationUnit,
          excludeCancellationFee: Boolean(b.exclude_cancellation_fee),
          excludeCustomerNotification: Boolean(b.exclude_customer_notification),
          excludeProviderNotification: Boolean(b.exclude_provider_notification),
          adjustServiceTotal: Boolean(b.adjust_service_total),
          adjustmentServiceTotalAmount: b.adjustment_service_total_amount != null ? String(b.adjustment_service_total_amount) : "",
          adjustPrice: Boolean(b.adjust_price),
          adjustmentAmount: b.adjustment_amount != null ? String(b.adjustment_amount) : "",
          adjustTime: Boolean(b.adjust_time),
          adjustedHours: b.duration_minutes != null
            ? String(Math.floor(Number(b.duration_minutes) / 60)).padStart(2, '0')
            : '00',
          adjustedMinutes: b.duration_minutes != null
            ? String(Math.round(Number(b.duration_minutes) % 60)).padStart(2, '0')
            : '00',
          priceAdjustmentNote: (b.price_adjustment_note ?? '').toString().trim(),
          timeAdjustmentNote: (b.time_adjustment_note ?? '').toString().trim(),
          draftQuoteExpiresOn: b.draft_quote_expires_on ? String(b.draft_quote_expires_on).slice(0, 10) : "",
        }));
        setCustomerSearch((b.customer_name || '').trim());
        setIsPartialCleaning(Boolean(cust.isPartialCleaning));
        setSelectedExcludeParams(excludedAreas);
        if (savedCouponType && Number.isFinite(savedCouponValue) && savedCouponValue > 0) {
          setAppliedCoupon({
            mode: savedCouponMode ?? (savedCouponCode ? 'coupon-code' : (savedCouponType === 'percentage' ? 'percent' : 'amount')),
            code: savedCouponCode || undefined,
            discountType: savedCouponType,
            discountValue: savedCouponValue,
            discountAmount: Number.isFinite(savedCouponAmount) ? Math.max(0, savedCouponAmount) : 0,
          });
        } else {
          setAppliedCoupon(null);
        }
        setProviderWage(b.provider_wage != null ? String(b.provider_wage) : '');
        setProviderWageType((b.provider_wage_type === 'percentage' || b.provider_wage_type === 'fixed' || b.provider_wage_type === 'hourly') ? b.provider_wage_type : 'hourly');
        // Property variables (dropdowns) use `categoryValues` state, not only newBooking.categoryValues
        setCategoryValues(loadedCategoryValues);
        if (b.industry_id) setSelectedIndustryId(String(b.industry_id));
      } catch (e) {
        if (!cancelled) setBookingLoadError(e instanceof Error ? e.message : 'Failed to load booking');
      } finally {
        if (!cancelled) setLoadingBooking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editingBookingId, currentBusiness?.id]);

  // New booking: pre-fill wage from Settings → General → Provider (same source as customer/guest default pay)
  useEffect(() => {
    if (editingBookingId || !currentBusiness?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/store-options?businessId=${encodeURIComponent(currentBusiness.id)}`,
          { headers: { "x-business-id": currentBusiness.id } }
        );
        const data = await res.json();
        if (cancelled || !res.ok || !data.options) return;
        const w = data.options.default_provider_wage;
        const t = data.options.default_provider_wage_type;
        if (w == null || !(Number(w) > 0)) return;
        if (t !== "percentage" && t !== "fixed" && t !== "hourly") return;
        if (providerWageRef.current !== "") return;
        setProviderWage(String(w));
        setProviderWageType(t);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingBookingId, currentBusiness?.id]);

  useEffect(() => {
    const bid = currentBusiness?.id;
    if (!bid) {
      setBusinessPaymentProvider(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("businesses").select("payment_provider").eq("id", bid).maybeSingle();
      if (cancelled) return;
      const p = (data as { payment_provider?: string } | null)?.payment_provider;
      setBusinessPaymentProvider(p === "authorize_net" ? "authorize_net" : "stripe");
    })();
    return () => {
      cancelled = true;
    };
  }, [currentBusiness?.id]);

  useEffect(() => {
    if (newBooking.customerType !== "existing") {
      setCustomerSavedCards([]);
      return;
    }
    const cid = (newBooking.customerId || "").trim();
    if (!cid || !currentBusiness?.id) {
      setCustomerSavedCards([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch(`/api/admin/customers/${cid}`, {
          headers: {
            ...adminCustomerApiHeaders(currentBusiness.id),
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled || !res.ok || !json?.customer) {
          if (!cancelled) setCustomerSavedCards([]);
          return;
        }
        const raw = json.customer.billing_cards ?? json.customer.billingCards;
        const list: CustomerSavedCardOption[] = Array.isArray(raw)
          ? raw.map((c: Record<string, unknown>) => {
              const pm = c?.stripePaymentMethodId;
              const pmStr = typeof pm === "string" && pm.startsWith("pm_") ? pm : null;
              return {
                brand: String(c?.brand ?? "Card"),
                last4: String(c?.last4 ?? "")
                  .replace(/\D/g, "")
                  .slice(-4),
                stripePaymentMethodId: pmStr,
              };
            })
          : [];
        const normalized = list.filter((x) => x.last4.length === 4);
        if (!cancelled) setCustomerSavedCards(normalized);
      } catch {
        if (!cancelled) setCustomerSavedCards([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [newBooking.customerId, newBooking.customerType, currentBusiness?.id]);

  useEffect(() => {
    if (newBooking.paymentMethod !== "Credit Card" || newBooking.creditCardMode !== "saved") return;
    const chargeable = customerSavedCards.filter((c) => c.stripePaymentMethodId);
    if (chargeable.length === 0) return;
    if (newBooking.savedStripePaymentMethodId) return;
    setNewBooking((prev) => ({
      ...prev,
      savedStripePaymentMethodId: chargeable[0].stripePaymentMethodId!,
    }));
  }, [
    newBooking.paymentMethod,
    newBooking.creditCardMode,
    newBooking.savedStripePaymentMethodId,
    customerSavedCards,
  ]);

  // Edit mode: provider Select is bound to `selectedProvider`; hydrate from `serviceProvider` once providers load
  useEffect(() => {
    if (!editingBookingId) return;
    const id = (newBooking.serviceProvider || "").trim();
    if (!id || allProviders.length === 0) return;
    const p = allProviders.find((x) => x.id === id);
    if (!p) return;
    setSelectedProvider((prev) => (prev?.id === id ? prev : p));
  }, [editingBookingId, newBooking.serviceProvider, allProviders]);

  // Handle query parameters for pre-filling customer information (e.g. from customer profile)
  useEffect(() => {
    if (editingBookingId) return; // prefer edit mode data
    const customerId = searchParams.get('customerId');
    const customerName = searchParams.get('customerName');
    const customerEmail = searchParams.get('customerEmail');
    const customerAddress = searchParams.get('customerAddress');
    
    if (customerId && customerName && customerEmail) {
      const nameParts = customerName.split(' ');
      setNewBooking(prev => ({
        ...prev,
        customerType: 'existing',
        customerId,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: customerEmail,
        address: customerAddress || prev.address,
      }));
      setCustomerSearch(customerName);
      // Fetch full customer to get phone and address if not passed
      const fetchCustomer = async () => {
        try {
          const res = await fetch(`/api/admin/customers/${customerId}`, {
            headers: adminCustomerApiHeaders(currentBusiness?.id),
          });
          const data = await res.json();
          if (res.ok && data?.customer) {
            const c = data.customer;
            setNewBooking(prev => ({
              ...prev,
              phone: c.phone || prev.phone,
              address: prev.address || c.address || '',
            }));
          }
        } catch {
          // Ignore - we have name/email from URL
        }
      };
      fetchCustomer();
    }
  }, [searchParams, editingBookingId, currentBusiness?.id]);

  // Handle customer search
  const handleCustomerSearch = (search: string) => {
    setCustomerSearch(search);
    if (search.trim() === "") {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }
    
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredCustomers(filtered);
    setShowCustomerDropdown(true);
  };

  // Handle customer selection
  const selectCustomer = (customer: Customer) => {
    const nameParts = customer.name.split(' ');
    setNewBooking(prev => ({
      ...prev,
      customerId: customer.id,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || '',
      creditCardMode: "new",
      savedStripePaymentMethodId: "",
    }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    setFilteredCustomers([]);
  };



const handleAddBooking = async (status: string = 'pending') => {
  // Validate required fields
  const phoneTrim = newBooking.phone.trim();
  const phoneInvalid =
    newBooking.customerType === "existing"
      ? false
      : !phoneTrim || !isValidPhoneNumber(phoneTrim);

  const nextErrors = {
    firstName: !newBooking.firstName.trim(),
    lastName: !newBooking.lastName.trim(),
    email: !newBooking.email.trim(),
    phone: phoneInvalid,
    service: !newBooking.service.trim(),
    selectedDate: !newBooking.selectedDate.trim(),
    selectedTime: !newBooking.selectedTime.trim(),
    address: !newBooking.address.trim(),
  };

  const hasError = Object.values(nextErrors).some(Boolean);
  setErrors(nextErrors);

  if (hasError) {
    toast({
      title: "Error",
      description: "Please fill in all required fields, including a valid phone number with country code.",
      variant: "destructive",
    });
    return;
  }

    const chargeableSavedCards = customerSavedCards.filter((c) => c.stripePaymentMethodId);
    if (newBooking.paymentMethod === "Credit Card" && newBooking.creditCardMode === "saved") {
      if (!newBooking.customerId.trim()) {
        toast({
          title: "Customer required",
          description: "Select an existing customer to charge a saved card.",
          variant: "destructive",
        });
        return;
      }
      if (chargeableSavedCards.length === 0) {
        toast({
          title: "No rechargeable card on file",
          description:
            businessPaymentProvider === "authorize_net"
              ? "Authorize.Net businesses cannot charge a saved card from this form yet. Choose Cash/Check, or collect payment with a hosted link from Booking Charges after saving."
              : "This customer has no Stripe payment method on file. Add a card from their admin profile, or have them complete an online booking with card payment first.",
          variant: "destructive",
        });
        return;
      }
      if (!newBooking.savedStripePaymentMethodId.trim()) {
        toast({
          title: "Select a card",
          description: "Choose which saved card to charge.",
          variant: "destructive",
        });
        return;
      }
    }

    const customerName = `${newBooking.firstName} ${newBooking.lastName}`.trim();
    const customerEmail = newBooking.email.trim();
    const customerPhone = newBooking.phone.trim();
    const effectiveProviderId =
      (newBooking.serviceProvider || selectedProvider?.id || '').toString().trim() || null;

    try {
    // Get current user and their business
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to create bookings',
        variant: 'destructive',
      });
      return;
    }

    // Must match BusinessContext / customers list / all other admin API calls (not a separate owner .single() query).
    if (!currentBusiness?.id) {
      toast({
        title: 'Business Error',
        description: 'No business selected. Refresh the page or pick a business, then try again.',
        variant: 'destructive',
      });
      return;
    }
    const businessIdForApi = currentBusiness.id;

    // Build request body (same for create and update)
    const body: Record<string, unknown> = {
      customer_id: newBooking.customerId || null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      address: newBooking.address,
      service: newBooking.service,
      frequency: newBooking.frequency,
      date: newBooking.selectedDate,
      time: newBooking.selectedTime,
      scheduled_date: newBooking.selectedDate,
      scheduled_time: newBooking.selectedTime,
      status: status,
      amount: calculateTotalAmount,
      total_price: calculateTotalAmount,
      service_total: calculateServiceTotal,
      extras_total: calculateExtrasTotal,
      partial_cleaning_discount: calculatePartialCleaningDiscount,
      frequency_discount: calculateFrequencyDiscount,
      payment_method: newBooking.paymentMethod || null,
      notes: newBooking.notes,
      ...(newBooking.adjustTime
        ? (() => {
            const hrs = parseInt(newBooking.adjustedHours, 10) || 0;
            const mins = parseInt(newBooking.adjustedMinutes, 10) || 0;
            const totalMinutes = hrs * 60 + mins;
            return { duration: String(totalMinutes), duration_unit: 'Minutes' as const };
          })()
        : {
            duration: newBooking.duration || (calculatedDurationMinutes != null ? String(Math.round(calculatedDurationMinutes)) : ''),
            duration_unit: (newBooking.duration ? newBooking.durationUnit : (calculatedDurationMinutes != null ? 'Minutes' : 'Hours')) as 'Hours' | 'Minutes',
          }),
      selected_extras: newBooking.selectedExtras,
      extra_quantities: newBooking.extraQuantities,
      category_values: categoryValues,
      is_partial_cleaning: isForm2Catalog ? false : isPartialCleaning,
      excluded_areas: selectedExcludeParams,
      exclude_quantities: newBooking.excludeQuantities,
      service_provider_id: effectiveProviderId,
      provider_wage: providerWage,
      provider_wage_type: providerWageType,
      private_booking_notes: newBooking.privateBookingNotes,
      private_customer_notes: newBooking.privateCustomerNotes,
      service_provider_notes: newBooking.serviceProviderNotes,
      waiting_list: newBooking.waitingList,
      priority: newBooking.priority,
      zip_code: newBooking.zipCode,
      exclude_cancellation_fee: newBooking.excludeCancellationFee,
      exclude_customer_notification: newBooking.excludeCustomerNotification,
      exclude_provider_notification: newBooking.excludeProviderNotification,
      adjust_service_total: newBooking.adjustServiceTotal,
      adjustment_service_total_amount: newBooking.adjustServiceTotal && newBooking.adjustmentServiceTotalAmount ? newBooking.adjustmentServiceTotalAmount : undefined,
      adjust_price: newBooking.adjustPrice,
      adjustment_amount: newBooking.adjustPrice && newBooking.adjustmentAmount ? newBooking.adjustmentAmount : undefined,
      adjust_time: newBooking.adjustTime,
      price_adjustment_note: newBooking.adjustPrice && newBooking.priceAdjustmentNote ? newBooking.priceAdjustmentNote : undefined,
      time_adjustment_note: newBooking.adjustTime && newBooking.timeAdjustmentNote ? newBooking.timeAdjustmentNote : undefined,
      industry_id: selectedIndustryId || undefined,
      frequency_repeats: frequencies.find(f => f.name === newBooking.frequency)?.frequency_repeats ?? undefined,
      coupon_code: appliedCoupon?.code ?? (newBooking.couponType === "coupon-code" ? (newBooking.couponCode || "").trim() || undefined : undefined),
      coupon_discount_type: appliedCoupon?.discountType,
      coupon_discount_value: appliedCoupon?.discountValue,
      coupon_discount_amount: calculatedCouponDiscount > 0 ? calculatedCouponDiscount : undefined,
      coupon_mode: appliedCoupon?.mode,
      customization: appliedCoupon
        ? {
            coupon: {
              mode: appliedCoupon.mode,
              code: appliedCoupon.code ?? null,
              discount_type: appliedCoupon.discountType,
              discount_value: appliedCoupon.discountValue,
              discount_amount: calculatedCouponDiscount,
            },
          }
        : undefined,
      key_access: {
        primary_option: newBooking.keyInfoOption === 'hide-keys' ? 'hide_keys' : 'someone_home',
        keep_key: newBooking.keepKeyWithProvider,
      },
      customer_note_for_provider: newBooking.customerNoteForProvider.trim(),
    };
    if (status === "draft" || status === "quote") {
      const dq = newBooking.draftQuoteExpiresOn?.trim();
      body.draft_quote_expires_on = dq && /^\d{4}-\d{2}-\d{2}$/.test(dq) ? dq : null;
    }
    if (!editingBookingId) {
      body.create_recurring = newBooking.createRecurring || undefined;
      body.recurring_end_date = newBooking.createRecurring ? newBooking.recurringEndDate || null : undefined;
      body.recurring_occurrences_ahead = newBooking.createRecurring ? (newBooking.recurringOccurrencesAhead ?? 8) : undefined;
    } else if (status !== "draft" && status !== "quote") {
      body.create_recurring = newBooking.createRecurring || undefined;
      body.recurring_end_date = newBooking.createRecurring ? newBooking.recurringEndDate || null : undefined;
      body.recurring_occurrences_ahead = newBooking.createRecurring ? (newBooking.recurringOccurrencesAhead ?? 8) : undefined;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const url = editingBookingId ? `/api/bookings/${editingBookingId}` : '/api/bookings';
    const method = editingBookingId ? 'PUT' : 'POST';

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': businessIdForApi,
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify(body),
      });
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to server. Please check your connection.',
        variant: 'destructive',
      });
      return;
    }

    let result: any;
    let rawText = "";
    try {
      rawText = await response.text();
      if (!rawText) {
        console.error('Empty response from server', { status: response.status, statusText: response.statusText });
        toast({
          title: 'Error',
          description: `Server returned empty response. Status: ${response.status} ${response.statusText}`,
          variant: 'destructive',
        });
        return;
      }
      result = JSON.parse(rawText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, { status: response.status, statusText: response.statusText, rawText });
      toast({
        title: 'Error',
        description: `Server returned invalid response. Status: ${response.status} ${response.statusText}`,
        variant: 'destructive',
      });
      return;
    }

    if (!response.ok) {
      console.error(editingBookingId ? 'Booking update error' : 'Booking insertion error', { status: response.status, statusText: response.statusText, result, rawText });
      const errorMessage =
        (result && typeof result === 'object' ? (result.error || result.details || result.message) : null) ||
        rawText ||
        'Unknown error';
      const errorHint = result.hint ? `\n\nHint: ${result.hint}` : '';
      const failVerb =
        editingBookingId && !finalizeFromDraftQuote ? 'update' : editingBookingId ? 'save' : 'add';
      toast({
        title: 'Error',
        description: `Failed to ${failVerb} booking: ${errorMessage}${errorHint}`,
        variant: 'destructive',
      });
      return;
    }

    // Show warning if provider_wage columns are not available
    if (result.warning) {
      toast({
        title: 'Warning',
        description: result.warning,
        variant: 'default',
      });
    }

    const createdBooking = result?.data;
    const newBookingId: string | null =
      typeof createdBooking?.id === "string"
        ? createdBooking.id
        : typeof result?.id === "string"
          ? result.id
          : null;

    let savedCardChargeOk = false;
    let savedCardChargeFailed = false;
    if (
      !editingBookingId &&
      status === "pending" &&
      newBooking.paymentMethod === "Credit Card" &&
      newBooking.creditCardMode === "saved" &&
      newBooking.savedStripePaymentMethodId &&
      newBookingId
    ) {
      try {
        const chargeRes = await fetch("/api/admin/bookings/stripe-charge-saved-card", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
            "x-business-id": businessIdForApi,
          },
          body: JSON.stringify({
            bookingId: newBookingId,
            stripePaymentMethodId: newBooking.savedStripePaymentMethodId,
          }),
        });
        const cj = await chargeRes.json().catch(() => ({}));
        if (!chargeRes.ok) {
          savedCardChargeFailed = true;
          toast({
            title: "Booking saved — card not charged",
            description:
              typeof cj.error === "string"
                ? cj.error
                : "Collect payment from Booking Charges or send a payment link.",
            variant: "destructive",
          });
        } else {
          savedCardChargeOk = true;
        }
      } catch {
        savedCardChargeFailed = true;
        toast({
          title: "Booking saved — payment error",
          description: "Could not reach the payment service. Collect payment separately.",
          variant: "destructive",
        });
      }
    }

    if (!savedCardChargeFailed) {
      toast({
        title:
          editingBookingId && !finalizeFromDraftQuote
            ? "Booking updated"
            : editingBookingId
              ? "Booking saved"
              : "Booking Added",
        description:
          editingBookingId && !finalizeFromDraftQuote
            ? `Booking for ${customerName} has been updated.`
            : editingBookingId
              ? `Booking for ${customerName} has been saved.`
              : savedCardChargeOk
                ? `New booking for ${customerName} — card charged successfully.`
                : `New booking created for ${customerName}`,
      });
    }

    setTimeout(() => {
      if (onSaved) {
        onSaved();
      } else {
        router.push(editingBookingId ? "/admin/bookings?refresh=1" : "/admin/bookings");
      }
    }, 100);
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while creating the booking';
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    });
  }
};

  const handleCancel = () => {
    if (onClose) onClose();
    else router.push("/admin/bookings");
  };

  const handleAddPrivateBookingNote = () => {
    if (newBooking.privateBookingNote.trim()) {
      setNewBooking(prev => ({
        ...prev,
        privateBookingNotes: [...prev.privateBookingNotes, prev.privateBookingNote],
        privateBookingNote: ""
      }));
      toast({
        title: "Note Added",
        description: "Private booking note has been added.",
      });
    }
  };

  const handleAddPrivateCustomerNote = () => {
    if (newBooking.privateCustomerNote.trim()) {
      setNewBooking(prev => ({
        ...prev,
        privateCustomerNotes: [...prev.privateCustomerNotes, prev.privateCustomerNote],
        privateCustomerNote: ""
      }));
      toast({
        title: "Note Added",
        description: "Private customer note has been added.",
      });
    }
  };

  const handleAddServiceProviderNote = () => {
    if (newBooking.serviceProviderNote.trim()) {
      setNewBooking(prev => ({
        ...prev,
        serviceProviderNotes: [...prev.serviceProviderNotes, prev.serviceProviderNote],
        serviceProviderNote: ""
      }));
      toast({
        title: "Note Added",
        description: "Service provider note has been added.",
      });
    }
  };

  const handleDeletePrivateBookingNote = (index: number) => {
    setNewBooking(prev => ({
      ...prev,
      privateBookingNotes: prev.privateBookingNotes.filter((_, i) => i !== index)
    }));
    toast({
      title: "Note Deleted",
      description: "Private booking note has been removed.",
    });
  };

  const handleDeletePrivateCustomerNote = (index: number) => {
    setNewBooking(prev => ({
      ...prev,
      privateCustomerNotes: prev.privateCustomerNotes.filter((_, i) => i !== index)
    }));
    toast({
      title: "Note Deleted",
      description: "Private customer note has been removed.",
    });
  };

  // Filter providers based on selected date - only show providers with availability on that date
  useEffect(() => {
    const filterProvidersByDate = async () => {
      if (!newBooking.selectedDate) {
        setFilteredProvidersByDate([]);
        if (!newBooking.selectedDate && selectedProvider) {
          setSelectedProvider(null);
          setNewBooking((prev) => ({ ...prev, serviceProvider: "", selectedTime: "" }));
          setAvailableTimeSlots([]);
        }
        return;
      }

      if (allProviders.length === 0) {
        setFilteredProvidersByDate([]);
        setSelectedProvider(null);
        setNewBooking((prev) => ({ ...prev, serviceProvider: "" }));
        setProviderWage("");
        setProviderWageType("hourly");
        return;
      }

      try {
        setLoadingProviders(true);
        const availableProvidersList: Provider[] = [];

        console.log(`🔍 Filtering ${allProviders.length} providers for date: ${newBooking.selectedDate}`);

        for (const provider of allProviders) {
          try {
            const url = `/api/admin/providers/${provider.id}/available-slots?date=${newBooking.selectedDate}&businessId=${currentBusiness?.id || ''}`;
            console.log(`  Checking provider ${provider.name} (${provider.id})...`);

            const response = await fetch(url);

            if (response.ok) {
              const data = await response.json();
              console.log(`    Response: ${data.availableSlots?.length || 0} slots found`);
              if (data.availableSlots && data.availableSlots.length > 0) {
                console.log(`    ✅ Provider ${provider.name} is available`);
                availableProvidersList.push(provider);
              } else {
                console.log(`    ❌ Provider ${provider.name} has no available slots`);
              }
            } else {
              const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
              console.error(`    ❌ Failed to check availability for ${provider.name}:`, response.status, errorData);
            }
          } catch (error) {
            console.error(`    ❌ Error checking availability for provider ${provider.id}:`, error);
          }
        }

        const list = availableProvidersList;

        setFilteredProvidersByDate(list);

        const hasAssign =
          Boolean(selectedProvider) || Boolean((newBooking.serviceProvider || "").trim());
        if (list.length === 0 && hasAssign) {
          setSelectedProvider(null);
          setNewBooking((prev) => ({ ...prev, serviceProvider: "" }));
          setProviderWage("");
          setProviderWageType("hourly");
        } else if (
          selectedProvider &&
          !list.some((p) => p.id === selectedProvider.id)
        ) {
          setSelectedProvider(null);
          setNewBooking((prev) => ({ ...prev, serviceProvider: "" }));
          setProviderWage("");
          setProviderWageType("hourly");
        } else if (
          (newBooking.serviceProvider || "").trim() &&
          !list.some((p) => p.id === (newBooking.serviceProvider || "").trim())
        ) {
          setSelectedProvider(null);
          setNewBooking((prev) => ({ ...prev, serviceProvider: "" }));
          setProviderWage("");
          setProviderWageType("hourly");
        }
      } catch (error) {
        console.error("Error filtering providers by date:", error);
        setFilteredProvidersByDate([]);
      } finally {
        setLoadingProviders(false);
      }
    };

    filterProvidersByDate();
  }, [newBooking.selectedDate, newBooking.serviceProvider, allProviders, selectedProvider, currentBusiness?.id, editingBookingId]);

  // Time slots: union of provider available-slots; if none (no providers / no schedules), use /api/time-slots like book-now
  useEffect(() => {
    const fetchAvailableSlotsForDate = async () => {
      if (!newBooking.selectedDate) {
        setAvailableTimeSlots([]);
        if (!editingBookingId) {
          setNewBooking((prev) => ({ ...prev, selectedTime: "" }));
        }
        return;
      }

      try {
        setLoadingTimeSlots(true);
        const slotSet = new Set<string>();

        if (allProviders.length > 0) {
          for (const provider of allProviders) {
            try {
              const url = `/api/admin/providers/${provider.id}/available-slots?date=${newBooking.selectedDate}&businessId=${currentBusiness?.id || ''}`;
              const response = await fetch(url);

              if (response.ok) {
                const data = await response.json();
                const slots: string[] = data.availableSlots || [];
                slots.forEach((slot) => {
                  const n = normalizeTimeToHHmm(slot);
                  if (n) slotSet.add(n);
                });
              } else {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                console.error(`Failed to fetch slots for ${provider.name}:`, response.status, errorData);
              }
            } catch (error) {
              console.error(`Error fetching slots for provider ${provider.id}:`, error);
            }
          }
        }

        let sortedSlots = Array.from(slotSet).sort((a, b) => {
          const [aHour, aMin] = a.split(":").map(Number);
          const [bHour, bMin] = b.split(":").map(Number);
          return aHour * 60 + aMin - (bHour * 60 + bMin);
        });

        if (sortedSlots.length === 0 && currentBusiness?.id) {
          try {
            const tsUrl = `/api/time-slots?business_id=${encodeURIComponent(currentBusiness.id)}&date=${encodeURIComponent(newBooking.selectedDate)}`;
            const tsRes = await fetch(tsUrl);
            if (tsRes.ok) {
              const tsData = await tsRes.json();
              const list: string[] = Array.isArray(tsData.timeSlots) ? tsData.timeSlots : [];
              for (const slot of list) {
                const n = normalizeTimeToHHmm(slot);
                if (n) slotSet.add(n);
              }
              sortedSlots = Array.from(slotSet).sort((a, b) => {
                const [aHour, aMin] = a.split(":").map(Number);
                const [bHour, bMin] = b.split(":").map(Number);
                return aHour * 60 + aMin - (bHour * 60 + bMin);
              });
            }
          } catch (e) {
            console.error("Admin add-booking: fallback /api/time-slots failed:", e);
          }
        }

        const currentTime = (newBooking.selectedTime || "").trim();
        if (editingBookingId && currentTime) {
          const hasComparable = sortedSlots.some((s) => slotMatchesSelectedTime(s, currentTime));
          if (!hasComparable) {
            const norm = normalizeTimeToHHmm(currentTime);
            if (norm) sortedSlots = [...sortedSlots, norm].sort((a, b) => {
              const [aHour, aMin] = a.split(":").map(Number);
              const [bHour, bMin] = b.split(":").map(Number);
              return aHour * 60 + aMin - (bHour * 60 + bMin);
            });
          }
        }

        setAvailableTimeSlots(sortedSlots);

        if (
          newBooking.selectedTime &&
          !sortedSlots.some((s) => slotMatchesSelectedTime(s, newBooking.selectedTime))
        ) {
          if (!editingBookingId) {
            setNewBooking((prev) => ({ ...prev, selectedTime: "" }));
          }
        }
      } catch (error) {
        console.error("Error fetching available slots for date:", error);
        setAvailableTimeSlots([]);
      } finally {
        setLoadingTimeSlots(false);
      }
    };

    fetchAvailableSlotsForDate();
  }, [newBooking.selectedDate, newBooking.selectedTime, allProviders, currentBusiness?.id, editingBookingId]);

  // Filter available providers based on selected date and time
  // Only runs when both date AND time are selected
  useEffect(() => {
    const filterProviders = async () => {
      // Only filter providers when both date and time are selected
      if (!newBooking.selectedDate || !newBooking.selectedTime) {
        // Don't clear selected provider if user manually selected one
        // Only clear if we're filtering and no providers match
        return;
      }

      // Check which providers are available for the selected date and time
      const availableProvidersList: Provider[] = [];

      for (const provider of allProviders) {
        try {
          const response = await fetch(
            `/api/admin/providers/${provider.id}/available-slots?date=${newBooking.selectedDate}&businessId=${currentBusiness?.id || ""}`
          );

          if (response.ok) {
            const data = await response.json();
            const slots: string[] = data.availableSlots || [];
            if (slots.some((slot) => slotMatchesSelectedTime(slot, newBooking.selectedTime))) {
              availableProvidersList.push(provider);
            }
          }
        } catch (error) {
          console.error(`Error checking availability for provider ${provider.id}:`, error);
        }
      }

      setAvailableProviders(availableProvidersList);

      if (availableProvidersList.length === 0) {
        if (selectedProvider || (newBooking.serviceProvider || "").trim()) {
          setSelectedProvider(null);
          setNewBooking((prev) => ({ ...prev, serviceProvider: "" }));
          setProviderWage("");
          setProviderWageType("hourly");
        }
        return;
      }

      const pickId = (selectedProvider?.id || newBooking.serviceProvider || "").trim();
      const match = pickId
        ? availableProvidersList.find((p) => p.id === pickId)
        : undefined;

      if (match) {
        if (!selectedProvider || selectedProvider.id !== match.id) {
          setSelectedProvider(match);
        }
        if ((newBooking.serviceProvider || "").trim() !== match.id) {
          setNewBooking((prev) => ({ ...prev, serviceProvider: match.id }));
        }
      } else {
        const first = availableProvidersList[0];
        setSelectedProvider(first);
        setNewBooking((prev) => ({ ...prev, serviceProvider: first.id }));
        setProviderWage(first.wage?.toString() || "");
        setProviderWageType(first.wageType || "hourly");
      }
    };

    filterProviders();
  }, [newBooking.selectedDate, newBooking.selectedTime, allProviders, selectedProvider, newBooking.serviceProvider, editingBookingId, currentBusiness?.id]);


  const handleAssignProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setNewBooking(prev => ({ ...prev, serviceProvider: provider.id }));
    // Set wage and wage type from provider data
    setProviderWage(provider.wage?.toString() || '');
    setProviderWageType(provider.wageType || 'hourly');
    setShowAllProvidersModal(false);
    
    // Clear selected time if provider/date changes and time is no longer available
    if (newBooking.selectedDate && newBooking.selectedTime) {
      // Check if the selected time is still available for this provider
      // The useEffect will fetch slots and clear if needed
      const checkTimeAvailability = async () => {
        try {
          const response = await fetch(
            `/api/admin/providers/${provider.id}/available-slots?date=${newBooking.selectedDate}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.availableSlots && !data.availableSlots.includes(newBooking.selectedTime)) {
              // Time not available, clear it
              setNewBooking(prev => ({ ...prev, selectedTime: '' }));
            }
          }
        } catch (error) {
          console.error('Error checking time availability:', error);
        }
      };
      checkTimeAvailability();
    }
    
    toast({
      title: 'Provider Assigned',
      description: `${provider.name} has been assigned to this booking.`,
    });
  };

  // Helper function to get provider initials
  const getProviderInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDeleteServiceProviderNote = (index: number) => {
    setNewBooking(prev => ({
      ...prev,
      serviceProviderNotes: prev.serviceProviderNotes.filter((_, i) => i !== index)
    }));
    toast({
      title: "Note Deleted",
      description: "Service provider note has been removed.",
    });
  };

  // Duration from pricing parameters (sum all matching variable categories) + extras time.
  // Hourly + "Based on the pricing parameters time": derive minutes from selections even if a stale duration field exists.
  const calculatedDurationMinutes = useMemo(() => {
    if (!newBooking.service || !newBooking.frequency) return null;
    const selectedServiceCategory = serviceCategories.find((cat) => cat.name === newBooking.service);
    const hourlyPricingUsesParameterTime =
      Boolean(selectedServiceCategory?.hourly_service?.enabled) &&
      selectedServiceCategory?.hourly_service?.priceCalculationType === "pricingParametersTime";
    if (newBooking.duration && !hourlyPricingUsesParameterTime) return null;

    let totalMinutes = 0;
    const bedroomTier = categoryValues['Bedroom'] ?? null;

    for (const [categoryKey, optionName] of Object.entries(categoryValues)) {
      if (!optionName?.trim() || optionName.trim().toLowerCase() === "none") continue;
      const param = pricingParameters.find(
        (p) =>
          p.variable_category === categoryKey &&
          p.name === optionName &&
          pricingParamAppliesToSelection(
            {
              show_based_on_frequency: p.show_based_on_frequency,
              frequency: p.frequency,
              show_based_on_service_category: p.show_based_on_service_category,
              service_category: p.service_category,
              show_based_on_service_category2: Boolean(p.show_based_on_service_category2),
              service_category2: p.service_category2 ?? null,
            },
            newBooking.frequency,
            newBooking.service,
            bedroomTier,
          ),
      );
      if (param?.time_minutes && param.time_minutes > 0) {
        totalMinutes += param.time_minutes;
      }
    }

    newBooking.selectedExtras?.forEach(extraId => {
      const extra = extras.find(e => e.id === extraId);
      if (!extra) return;
      const qty = extra.qtyBased ? (newBooking.extraQuantities[extraId] || 1) : 1;
      const { lineMinutes } = resolveQtyBasedExtraLine(
        {
          qty_based: extra.qtyBased,
          pricing_structure: (extra as { pricingStructure?: string }).pricingStructure,
          price: Number(extra.price) || 0,
          time_minutes: typeof extra.time === "number" ? extra.time : 0,
          maximum_quantity: (extra as { maximumQuantity?: number | null }).maximumQuantity ?? null,
          manual_prices: (extra as { manualPrices?: { price: number; time_minutes: number }[] }).manualPrices ?? null,
        },
        qty,
      );
      if (lineMinutes > 0) totalMinutes += lineMinutes;
    });

    if (isPartialCleaning && selectedExcludeParams.length > 0) {
      selectedExcludeParams.forEach(paramId => {
        const param = excludeParameters.find((p: any) => p.id === paramId);
        if (param && typeof param.time_minutes === "number" && param.time_minutes > 0) {
          const qty = param.qty_based ? (newBooking.excludeQuantities[paramId] || 1) : 1;
          totalMinutes -= param.time_minutes * qty;
        }
      });
      totalMinutes = Math.max(0, totalMinutes);
    }

    return totalMinutes > 0 ? totalMinutes : null;
  }, [newBooking.service, newBooking.frequency, newBooking.duration, categoryValues, pricingParameters, newBooking.selectedExtras, newBooking.extraQuantities, extras, isPartialCleaning, selectedExcludeParams, excludeParameters, newBooking.excludeQuantities, serviceCategories]);

  // Calculate service total: service base price (if set) + sum of selected options (Bathroom, Bedroom, etc.)
  const calculateServiceTotal = useMemo(() => {
    if (!newBooking.service || !newBooking.frequency) {
      console.log('⚠️ calculateServiceTotal: Missing service or frequency', { service: newBooking.service, frequency: newBooking.frequency });
      return 0;
    }

    const selectedServiceCategory = serviceCategories.find(cat => cat.name === newBooking.service);

    // 1) Base price from service type (e.g. Deep Cleaning) when "Set service category price" is enabled
    let basePrice = 0;
    if (selectedServiceCategory?.service_category_price?.enabled) {
      const priceStr = selectedServiceCategory.service_category_price?.price;
      if (priceStr !== undefined && priceStr !== null && String(priceStr).trim() !== '') {
        const p = parseFloat(String(priceStr).trim());
        if (!Number.isNaN(p) && p >= 0) basePrice = p;
      }
    }

    // 2) Add prices for each selected option (Bathroom, Bedroom, Living Room, Sq Ft, Storage, etc.)
    let optionsSum = 0;
    const bedroomTierForPrice = categoryValues['Bedroom'] ?? null;
    for (const [categoryKey, optionName] of Object.entries(categoryValues)) {
      if (!optionName?.trim() || optionName.trim().toLowerCase() === "none") continue;
      const param = pricingParameters.find(
        (p) =>
          p.variable_category === categoryKey &&
          p.name === optionName &&
          pricingParamAppliesToSelection(
            {
              show_based_on_frequency: p.show_based_on_frequency,
              frequency: p.frequency,
              show_based_on_service_category: p.show_based_on_service_category,
              service_category: p.service_category,
              show_based_on_service_category2: Boolean(p.show_based_on_service_category2),
              service_category2: p.service_category2 ?? null,
            },
            newBooking.frequency,
            newBooking.service,
            bedroomTierForPrice,
          ),
      );
      if (param) {
        const price = Number(param.price);
        if (!Number.isNaN(price) && price >= 0) optionsSum += price;
      }
    }

    let total = basePrice + optionsSum;
    if (total > 0) return total;

    // 3) Fallback: if no base/options, use service category fixed price (legacy single-price mode)
    if (selectedServiceCategory?.service_category_price?.enabled && selectedServiceCategory.service_category_price?.price) {
      const price = parseFloat(selectedServiceCategory.service_category_price.price);
      if (!isNaN(price) && price > 0) return price;
    }

    // 4) Hourly: custom time uses hours/minutes fields; pricing-parameters time uses summed parameter minutes
    if (selectedServiceCategory?.hourly_service?.enabled && selectedServiceCategory.hourly_service?.price) {
      const hourlyPrice = parseFloat(selectedServiceCategory.hourly_service.price);
      if (!isNaN(hourlyPrice) && hourlyPrice > 0) {
        const pct = selectedServiceCategory.hourly_service.priceCalculationType ?? "customTime";
        if (pct === "customTime") {
          if (newBooking.duration) {
            const hours =
              newBooking.durationUnit === "Minutes"
                ? (parseFloat(newBooking.duration) || 0) / 60
                : parseFloat(newBooking.duration) || 0;
            return hourlyPrice * hours;
          }
        } else if (calculatedDurationMinutes != null && calculatedDurationMinutes > 0) {
          return hourlyPrice * (calculatedDurationMinutes / 60);
        }
      }
    }

    return 0;
  }, [newBooking.service, newBooking.frequency, newBooking.duration, newBooking.durationUnit, categoryValues, pricingParameters, serviceCategories, calculatedDurationMinutes]);

  // Effective service total: when "Adjust Service Total" is on, use the entered amount (Booking Koala: overrides price before discounts)
  const effectiveServiceTotal = useMemo(() => {
    if (newBooking.adjustServiceTotal && newBooking.adjustmentServiceTotalAmount) {
      const v = parseFloat(newBooking.adjustmentServiceTotalAmount);
      if (!isNaN(v) && v >= 0) return v;
    }
    return calculateServiceTotal;
  }, [calculateServiceTotal, newBooking.adjustServiceTotal, newBooking.adjustmentServiceTotalAmount]);

  // Calculate extras total (respect qtyBased: use quantity only when extra is quantity-based)
  const calculateExtrasTotal = useMemo(() => {
    const selectedServiceCategory = serviceCategories.find((cat) => cat.name === newBooking.service);
    const hs = selectedServiceCategory?.hourly_service;
    let total = 0;
    newBooking.selectedExtras?.forEach(extraId => {
      const extra = extras.find(e => e.id === extraId);
      if (!extra) return;
      const quantity = extra.qtyBased ? (newBooking.extraQuantities[extraId] || 1) : 1;
      const { linePrice } = resolveQtyBasedExtraLine(
        {
          qty_based: extra.qtyBased,
          pricing_structure: (extra as { pricingStructure?: string }).pricingStructure,
          price: Number(extra.price) || 0,
          time_minutes: typeof extra.time === "number" ? extra.time : 0,
          maximum_quantity: (extra as { maximumQuantity?: number | null }).maximumQuantity ?? null,
          manual_prices: (extra as { manualPrices?: { price: number; time_minutes: number }[] }).manualPrices ?? null,
        },
        quantity,
      );
      total += linePrice;
    });
    return hourlyExtrasBillableSubtotal({ hourly: hs, extrasSubtotal: total });
  }, [newBooking.selectedExtras, newBooking.extraQuantities, extras, newBooking.service, serviceCategories]);

  // Calculate partial cleaning discount (respect qty_based: use quantity only when param is quantity-based)
  const calculatePartialCleaningDiscount = useMemo(() => {
    if (!isPartialCleaning || selectedExcludeParams.length === 0) {
      return 0;
    }
    let discount = 0;
    selectedExcludeParams.forEach(paramId => {
      const param = excludeParameters.find(p => p.id === paramId);
      if (param && param.price) {
        const quantity = param.qty_based ? (newBooking.excludeQuantities[paramId] || 1) : 1;
        discount += param.price * quantity;
      }
    });
    return discount;
  }, [isPartialCleaning, selectedExcludeParams, excludeParameters, newBooking.excludeQuantities]);

  // Calculate adjusted job length for recurring frequencies
  const calculateAdjustedDuration = useMemo(() => {
    if (!newBooking.frequency || !newBooking.duration) {
      return { duration: newBooking.duration, durationUnit: newBooking.durationUnit };
    }

    const selectedFreq = frequencies.find(f => f.name === newBooking.frequency);
    if (!selectedFreq) {
      return { duration: newBooking.duration, durationUnit: newBooking.durationUnit };
    }

    // Only apply job length adjustment for recurring frequencies
    if (selectedFreq.occurrence_time !== 'recurring') {
      return { duration: newBooking.duration, durationUnit: newBooking.durationUnit };
    }

    // Check if shorter job length is enabled
    if (selectedFreq.shorter_job_length !== 'yes') {
      return { duration: newBooking.duration, durationUnit: newBooking.durationUnit };
    }

    // If this is the first appointment and we should exclude it from shorter length
    if (isFirstAppointment && selectedFreq.exclude_first_appointment) {
      return { duration: newBooking.duration, durationUnit: newBooking.durationUnit };
    }

    // Apply the percentage reduction
    const reductionPercentage = parseFloat(selectedFreq.shorter_job_length_by || '0');
    if (reductionPercentage <= 0) {
      return { duration: newBooking.duration, durationUnit: newBooking.durationUnit };
    }

    // Calculate reduced duration
    const originalDuration = parseFloat(newBooking.duration);
    const reducedDuration = originalDuration * (1 - reductionPercentage / 100);
    
    // Convert to appropriate format
    if (newBooking.durationUnit === 'Hours') {
      const hours = Math.floor(reducedDuration);
      const minutes = Math.round((reducedDuration - hours) * 60);
      
      if (minutes >= 30) {
        return { 
          duration: hours.toString().padStart(2, '0'), 
          durationUnit: 'Hours',
          displayText: `${hours} Hr ${minutes} Min`
        };
      } else {
        return { 
          duration: hours.toString().padStart(2, '0'), 
          durationUnit: 'Hours',
          displayText: `${hours} Hr`
        };
      }
    } else {
      return { 
        duration: Math.round(reducedDuration).toString().padStart(2, '0'), 
        durationUnit: newBooking.durationUnit 
      };
    }
  }, [newBooking.frequency, newBooking.duration, newBooking.durationUnit, frequencies, isFirstAppointment]);

  // Calculate frequency discount with first appointment exclusion logic
  const calculateFrequencyDiscount = useMemo(() => {
    if (!newBooking.frequency) {
      return 0;
    }

    const selectedFreq = frequencies.find(f => f.name === newBooking.frequency);
    if (!selectedFreq || !selectedFreq.discount) {
      return 0;
    }

    // For recurring frequencies, check if we should exclude the first appointment
    if (selectedFreq.occurrence_time === 'recurring') {
      // If frequency_discount is "exclude-first" and this is the first appointment, no discount
      if (selectedFreq.frequency_discount === 'exclude-first' && isFirstAppointment) {
        return 0;
      }
    }

    const subtotal = effectiveServiceTotal + calculateExtrasTotal - calculatePartialCleaningDiscount;
    const discountType = selectedFreq.discountType ?? selectedFreq.discount_type ?? '%';

    if (discountType === '%') {
      return (subtotal * selectedFreq.discount) / 100;
    } else {
      return selectedFreq.discount;
    }
  }, [newBooking.frequency, frequencies, effectiveServiceTotal, calculateExtrasTotal, calculatePartialCleaningDiscount, isFirstAppointment]);

  const baseTotalBeforeCoupon = useMemo(() => {
    const subtotal = effectiveServiceTotal + calculateExtrasTotal;
    const totalDiscount = calculatePartialCleaningDiscount + calculateFrequencyDiscount;
    return Math.max(0, subtotal - totalDiscount);
  }, [effectiveServiceTotal, calculateExtrasTotal, calculatePartialCleaningDiscount, calculateFrequencyDiscount]);

  const calculatedCouponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === "percentage") {
      return Math.max(0, Math.min(baseTotalBeforeCoupon, (baseTotalBeforeCoupon * appliedCoupon.discountValue) / 100));
    }
    return Math.max(0, Math.min(baseTotalBeforeCoupon, appliedCoupon.discountValue));
  }, [appliedCoupon, baseTotalBeforeCoupon]);

  // Calculate total amount (Booking Koala style: service total before discounts, then price adjustment overrides final after discounts)
  const calculateTotalAmount = useMemo(() => {
    const subtotal = effectiveServiceTotal + calculateExtrasTotal;
    const totalDiscount = calculatePartialCleaningDiscount + calculateFrequencyDiscount;
    let finalAmount = Math.max(0, subtotal - totalDiscount - calculatedCouponDiscount);

    // Adjust Price: override final amount after coupons/discounts, before tax (Booking Koala)
    if (newBooking.adjustPrice && newBooking.adjustmentAmount) {
      const adjustment = parseFloat(newBooking.adjustmentAmount);
      if (!isNaN(adjustment) && adjustment >= 0) {
        finalAmount = adjustment;
      }
    }

    return finalAmount;
  }, [effectiveServiceTotal, calculateExtrasTotal, calculatePartialCleaningDiscount, calculateFrequencyDiscount, calculatedCouponDiscount, newBooking.adjustPrice, newBooking.adjustmentAmount]);

  const applyCouponSelection = async () => {
    const rawInput = (newBooking.couponCode || "").trim();
    if (!rawInput) {
      toast({
        title: "Missing value",
        description: newBooking.couponType === "coupon-code" ? "Enter a coupon code first." : "Enter a discount value first.",
        variant: "destructive",
      });
      return;
    }

    if (newBooking.couponType === "coupon-code") {
      if (!currentBusiness?.id) {
        toast({ title: "Business required", description: "Select a business before applying coupon.", variant: "destructive" });
        return;
      }
      const today = getTodayLocalDate();
      const { data, error } = await supabase
        .from("marketing_coupons")
        .select("code, discount_type, discount_value, active, start_date, end_date, min_order, coupon_config")
        .eq("business_id", currentBusiness.id)
        .ilike("code", rawInput)
        .eq("active", true)
        .maybeSingle();

      if (error || !data) {
        toast({ title: "Invalid coupon", description: "Coupon not found or inactive.", variant: "destructive" });
        return;
      }
      if (data.start_date && data.start_date > today) {
        toast({ title: "Coupon not started", description: "This coupon is not active yet.", variant: "destructive" });
        return;
      }
      if (data.end_date && data.end_date < today) {
        toast({ title: "Coupon expired", description: "This coupon has expired.", variant: "destructive" });
        return;
      }
      if (data.min_order != null && Number(data.min_order) > baseTotalBeforeCoupon) {
        toast({
          title: "Minimum order not met",
          description: `Coupon requires at least $${Number(data.min_order).toFixed(2)} before tax.`,
          variant: "destructive",
        });
        return;
      }

      const emailForScope = (newBooking.email || "").trim();
      if (couponRequiresCustomerEmailForScope(data.coupon_config)) {
        if (!emailForScope.includes("@")) {
          toast({
            title: "Email required",
            description: "Enter the customer email before applying this coupon (new/existing or one-time rules).",
            variant: "destructive",
          });
          return;
        }
        const scopeUrl = new URL("/api/guest/marketing-coupon-scope", window.location.origin);
        scopeUrl.searchParams.set("business_id", currentBusiness.id);
        scopeUrl.searchParams.set("code", rawInput);
        scopeUrl.searchParams.set("email", emailForScope);
        const scopeRes = await fetch(scopeUrl.toString());
        const scopeJson = (await scopeRes.json().catch(() => ({}))) as {
          ok?: boolean;
          title?: string;
          description?: string;
          error?: string;
        };
        if (!scopeRes.ok) {
          toast({
            title: "Could not verify coupon",
            description: scopeJson.error || "Please try again.",
            variant: "destructive",
          });
          return;
        }
        if (scopeJson.ok === false) {
          toast({
            title: scopeJson.title || "Coupon not available",
            description: scopeJson.description || "This coupon cannot be applied for this email.",
            variant: "destructive",
          });
          return;
        }
      }

      const industryLabel = industries.find((i) => i.id === selectedIndustryId)?.name?.trim() ?? "";
      let bookingDateForCoupon: Date | null = null;
      if (newBooking.selectedDate?.trim()) {
        const ymd = normalizeBookingDateInput(newBooking.selectedDate);
        if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
          const [y, mo, day] = ymd.split("-").map((n) => parseInt(n, 10));
          bookingDateForCoupon = new Date(y, mo - 1, day);
        }
      }
      const zipNorm = newBooking.zipCode?.trim().replace(/\s/g, "") ?? "";
      const addrLine = newBooking.address?.trim() ?? "";
      const locationCandidate = [zipNorm, addrLine].filter(Boolean).join(" ").trim();

      let resolvedLocationLabels: string[] | undefined = undefined;
      if (
        shouldEnforceMarketingCouponLocationSubset(data.coupon_config, industryLabel) &&
        currentBusiness?.id &&
        selectedIndustryId
      ) {
        const rawField = newBooking.zipCode?.trim() ?? "";
        const isLikelyZip = /^\d{5}/.test(zipNorm) && zipNorm.length >= 5;
        const mode: "zip" | "name" | "none" = isLikelyZip ? "zip" : rawField.length >= 2 ? "name" : "none";
        if (mode !== "none") {
          const input = mode === "zip" ? zipNorm : rawField;
          const minLen = mode === "zip" ? 5 : 2;
          if (input.replace(/\s/g, "").length >= minLen) {
            try {
              const params = new URLSearchParams({
                business_id: currentBusiness.id,
                industry_id: selectedIndustryId,
                input,
                mode,
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
      }

      const gate = getMarketingCouponGateFailure(data.coupon_config, {
        industryLabel,
        serviceName: String(newBooking.service || "").trim(),
        bookingDate: bookingDateForCoupon,
        frequencyLabel: String(newBooking.frequency || "").trim(),
        locationCandidate,
        resolvedLocationLabels,
      });
      if (gate) {
        toast({ title: gate.title, description: gate.description, variant: "destructive" });
        return;
      }

      const discountType = data.discount_type === "percentage" ? "percentage" : "fixed";
      const discountValue = Number(data.discount_value) || 0;
      if (discountValue <= 0) {
        toast({ title: "Invalid coupon", description: "Coupon discount value is not valid.", variant: "destructive" });
        return;
      }
      const discountAmount = discountType === "percentage"
        ? Math.max(0, Math.min(baseTotalBeforeCoupon, (baseTotalBeforeCoupon * discountValue) / 100))
        : Math.max(0, Math.min(baseTotalBeforeCoupon, discountValue));

      setAppliedCoupon({
        mode: "coupon-code",
        code: data.code,
        discountType,
        discountValue,
        discountAmount,
      });
      toast({
        title: "Coupon applied",
        description: `${data.code} applied: -$${discountAmount.toFixed(2)}`,
      });
      return;
    }

    const value = parseFloat(rawInput);
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Invalid value", description: "Enter a number greater than 0.", variant: "destructive" });
      return;
    }

    if (newBooking.couponType === "percent") {
      const pct = Math.min(100, value);
      const discountAmount = Math.max(0, Math.min(baseTotalBeforeCoupon, (baseTotalBeforeCoupon * pct) / 100));
      setAppliedCoupon({
        mode: "percent",
        discountType: "percentage",
        discountValue: pct,
        discountAmount,
      });
      toast({
        title: "Percentage discount applied",
        description: `${pct}% applied: -$${discountAmount.toFixed(2)}`,
      });
      return;
    }

    const fixed = Math.max(0, value);
    const discountAmount = Math.max(0, Math.min(baseTotalBeforeCoupon, fixed));
    setAppliedCoupon({
      mode: "amount",
      discountType: "fixed",
      discountValue: fixed,
      discountAmount,
    });
    toast({
      title: "Amount discount applied",
      description: `-$${discountAmount.toFixed(2)} applied`,
    });
  };

  const showBookingForm = !bookingLoadError && !(editingBookingId && loadingBooking);

  const bookingEditorGrid = showBookingForm ? (
      <>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_2fr]">
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Summary</CardTitle>
              {editingBookingId ? (
                <CardDescription className="text-xs font-mono text-muted-foreground">
                  Booking ID · {editingBookingId}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">Industry</span>
                {industries.length > 1 ? (
                  <Select value={selectedIndustryId} onValueChange={(v) => { setSelectedIndustryId(v); setSelectedForm2Item(""); setNewBooking(prev => ({ ...prev, service: "", frequency: "", duration: "", selectedExtras: [], extraQuantities: {}, excludeQuantities: {}, categoryValues: {} })); setCategoryValues({}); }}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((ind) => (
                        <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="font-medium">{industries.find(i => i.id === selectedIndustryId)?.name || "—"}</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{newBooking.service || ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-medium">{newBooking.frequency || "Not selected"}</span>
              </div>
              {(() => {
                const selectedFreq = frequencies.find(f => f.name === newBooking.frequency);
                const adjustedDuration = calculateAdjustedDuration;
                const isRecurring = selectedFreq?.occurrence_time === 'recurring';
                const hasAdjustment = isRecurring && selectedFreq?.shorter_job_length === 'yes' && parseFloat(selectedFreq?.shorter_job_length_by || '0') > 0;
                const durationMinutes = newBooking.adjustTime
                  ? (parseInt(newBooking.adjustedHours, 10) || 0) * 60 + (parseInt(newBooking.adjustedMinutes, 10) || 0)
                  : newBooking.duration
                    ? (newBooking.durationUnit === "Hours" ? parseFloat(newBooking.duration) * 60 : parseFloat(newBooking.duration))
                    : calculatedDurationMinutes;
                const displayLength = !newBooking.service
                  ? "—"
                  : newBooking.adjustTime
                    ? (() => {
                        const hrs = parseInt(newBooking.adjustedHours, 10) || 0;
                        const m = parseInt(newBooking.adjustedMinutes, 10) || 0;
                        return hrs > 0 ? `${hrs} Hr${m > 0 ? ` ${m} Min` : ""}` : `${m} Min`;
                      })()
                    : hasAdjustment && adjustedDuration.displayText
                      ? adjustedDuration.displayText
                      : durationMinutes != null
                        ? (() => {
                            const mins = Math.round(durationMinutes);
                            const hrs = Math.floor(mins / 60);
                            const m = mins % 60;
                            return hrs > 0 ? `${hrs} Hr${m > 0 ? ` ${m} Min` : ""}` : `${mins} Min`;
                          })()
                        : "—";
                
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Length</span>
                      <span className="font-medium">{displayLength}</span>
                    </div>
                    {hasAdjustment && newBooking.duration && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Original Length</span>
                        <span className="text-muted-foreground line-through">
                          {newBooking.duration} {newBooking.durationUnit === "Hours" ? "Hr" : "Min"}
                        </span>
                      </div>
                    )}
                    {isRecurring && selectedFreq?.frequency_repeats && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Repeats</span>
                        <span className="text-muted-foreground">
                          {selectedFreq.frequency_repeats.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
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
                <span className="font-medium">${calculateExtrasTotal.toFixed(2)}</span>
              </div>
              {calculatePartialCleaningDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Partial Cleaning Discount</span>
                  <span className="font-medium text-green-600">-${calculatePartialCleaningDiscount.toFixed(2)}</span>
                </div>
              )}
              {(() => {
                const selectedFreq = frequencies.find(f => f.name === newBooking.frequency);
                const isRecurring = selectedFreq?.occurrence_time === 'recurring';
                const excludeFirst = selectedFreq?.frequency_discount === 'exclude-first';
                
                if (calculateFrequencyDiscount > 0) {
                  return (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frequency Discount</span>
                      <span className="font-medium text-green-600">-${calculateFrequencyDiscount.toFixed(2)}</span>
                    </div>
                  );
                } else if (isRecurring && excludeFirst && isFirstAppointment && selectedFreq?.discount) {
                  return (
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-600">Frequency Discount (Applied from 2nd booking)</span>
                      <span className="text-amber-600">
                        {(selectedFreq.discountType ?? selectedFreq.discount_type) === '%' ? `${selectedFreq.discount}%` : `$${selectedFreq.discount.toFixed(2)}`}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              {calculatedCouponDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coupon Discount</span>
                  <span className="font-medium text-green-600">-${calculatedCouponDiscount.toFixed(2)}</span>
                </div>
              )}
              {newBooking.adjustPrice && newBooking.adjustmentAmount && !isNaN(parseFloat(newBooking.adjustmentAmount)) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adjusted Amount</span>
                  <span className="font-medium">${parseFloat(newBooking.adjustmentAmount).toFixed(2)}</span>
                </div>
              )}
              {cancellationFeeDisplay?.enabled && (
                <div className="flex justify-between text-muted-foreground">
                  <span className="text-xs">Cancellation Fee (if cancelled within policy)</span>
                  <span className="text-xs font-medium">
                    {cancellationFeeDisplay.currency}{cancellationFeeDisplay.amount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t pt-2 mt-2"></div>
              <div className="flex justify-between font-semibold text-base">
                <span>TOTAL</span>
                <span>${calculateTotalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Note Cards */}
          <div className="space-y-3">
            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 px-4">
                <CardTitle className="text-base font-medium text-card-foreground">Private Booking Note</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrivateBookingNote(!showPrivateBookingNote)}
                  className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900 ml-auto"
                >
                  {showPrivateBookingNote ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showPrivateBookingNote && (
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Add private booking note..."
                        value={newBooking.privateBookingNote}
                        onChange={(e) => setNewBooking({ ...newBooking, privateBookingNote: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPrivateBookingNote()}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddPrivateBookingNote}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {newBooking.privateBookingNotes.length > 0 && (
                      <div className="space-y-2">
                        {newBooking.privateBookingNotes.map((note, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm border">
                            <span className="flex-1">{note}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePrivateBookingNote(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 px-4">
                <CardTitle className="text-base font-medium text-card-foreground">Private Customer Note</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrivateCustomerNote(!showPrivateCustomerNote)}
                  className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900 ml-auto"
                >
                  {showPrivateCustomerNote ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showPrivateCustomerNote && (
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Add private customer note..."
                        value={newBooking.privateCustomerNote}
                        onChange={(e) => setNewBooking({ ...newBooking, privateCustomerNote: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPrivateCustomerNote()}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddPrivateCustomerNote}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {newBooking.privateCustomerNotes.length > 0 && (
                      <div className="space-y-2">
                        {newBooking.privateCustomerNotes.map((note, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm border">
                            <span className="flex-1">{note}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePrivateCustomerNote(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 px-4">
                <CardTitle className="text-base font-medium text-card-foreground">Note For Service Provider</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowServiceProviderNote(!showServiceProviderNote)}
                  className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900 ml-auto"
                >
                  {showServiceProviderNote ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showServiceProviderNote && (
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Add note for service provider..."
                        value={newBooking.serviceProviderNote}
                        onChange={(e) => setNewBooking({ ...newBooking, serviceProviderNote: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddServiceProviderNote()}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddServiceProviderNote}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {newBooking.serviceProviderNotes.length > 0 && (
                      <div className="space-y-2">
                        {newBooking.serviceProviderNotes.map((note, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm border">
                            <span className="flex-1">{note}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteServiceProviderNote(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Exclude Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclude-cancellation-fee"
                checked={newBooking.excludeCancellationFee}
                onCheckedChange={(checked) => setNewBooking({ ...newBooking, excludeCancellationFee: !!checked })}
              />
              <Label htmlFor="exclude-cancellation-fee" className={embInk.labelSm}>Exclude cancellation fee</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclude-customer-notification"
                checked={newBooking.excludeCustomerNotification}
                onCheckedChange={(checked) => setNewBooking({ ...newBooking, excludeCustomerNotification: !!checked })}
              />
              <Label htmlFor="exclude-customer-notification" className={embInk.labelSm}>Exclude customer notification</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclude-provider-notification"
                checked={newBooking.excludeProviderNotification}
                onCheckedChange={(checked) => setNewBooking({ ...newBooking, excludeProviderNotification: !!checked })}
              />
              <Label htmlFor="exclude-provider-notification" className={embInk.labelSm}>Exclude provider notification</Label>
            </div>
          </div>

          <div className={embInk.draftWrap}>
            <Label className={embInk.labelSm}>Expires on (optional)</Label>
            <p className={embInk.mutedXs}>Last day the draft or quote stays valid (ends 11:59 PM that day).</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                className="bg-white text-slate-900 max-w-[200px]"
                value={newBooking.draftQuoteExpiresOn}
                onChange={(e) => setNewBooking({ ...newBooking, draftQuoteExpiresOn: e.target.value })}
              />
              {newBooking.draftQuoteExpiresOn ? (
                <span className={embInk.subSm}>
                  {(() => {
                    const d = new Date(newBooking.draftQuoteExpiresOn + "T12:00:00");
                    if (Number.isNaN(d.getTime())) return null;
                    const days = Math.max(0, differenceInCalendarDays(startOfDay(d), startOfDay(new Date())));
                    return `at 11:59 PM (${days} day(s))`;
                  })()}
                </span>
              ) : null}
            </div>
          </div>

          {/* Action Buttons — finalize=1 (Create Booking from draft/quote) uses same labels as new booking; true edit uses Update. */}
          <div className="flex flex-col gap-2 w-full">
            {useCreateStyleSaveActions ? (
              <>
                <Button
                  type="button"
                  onClick={() => handleAddBooking("pending")}
                  className="text-white w-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
                  style={{ backgroundColor: '#10B981' }}
                >
                  Save Booking
                </Button>
                <Button
                  type="button"
                  onClick={() => handleAddBooking('draft')}
                  className="text-white w-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
                  style={{ backgroundColor: '#A7B3D1' }}
                >
                  Save As Draft
                </Button>
                <Button
                  type="button"
                  onClick={() => handleAddBooking('quote')}
                  className="text-white w-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
                  style={{ backgroundColor: '#F5A250' }}
                >
                  Save As Quote
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={() => handleAddBooking(editingSavedStatus || "pending")}
                  className="text-white w-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
                  style={{ backgroundColor: "#10B981" }}
                >
                  Update Booking
                </Button>
                <Button
                  type="button"
                  onClick={() => handleAddBooking("draft")}
                  className="text-white w-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
                  style={{ backgroundColor: "#A7B3D1" }}
                >
                  Save As Draft
                </Button>
                <Button
                  type="button"
                  onClick={() => handleAddBooking("quote")}
                  className="text-white w-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
                  style={{ backgroundColor: "#F5A250" }}
                >
                  Save As Quote
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-primary/20 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingBookingId ? (
              <>
                <div
                  className={cn(
                    "flex gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4",
                    embedded && "border-slate-200 bg-slate-100/90"
                  )}
                >
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-slate-200/60 text-slate-500"
                    aria-hidden
                  >
                    <User className="h-8 w-8" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-base font-semibold text-blue-700">
                      {[newBooking.firstName, newBooking.lastName].filter(Boolean).join(" ").trim() || "Customer"}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                      <span className="truncate">{newBooking.email?.trim() || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                      <span>{newBooking.phone?.trim() || "—"}</span>
                    </div>
                    {newBooking.address?.trim() ? (
                      <p className="pt-0.5 text-sm leading-snug text-slate-600">{newBooking.address.trim()}</p>
                    ) : null}
                    {!hasLocationBasedFrequencies && newBooking.zipCode?.trim() ? (
                      <p className="text-sm text-slate-600">ZIP · {newBooking.zipCode.trim()}</p>
                    ) : null}
                  </div>
                </div>
                {hasLocationBasedFrequencies ? (
                  <div>
                    <Label htmlFor="zipCode" className="text-sm font-medium mb-2 block">
                      Zip Code
                    </Label>
                    <Input
                      id="zipCode"
                      placeholder="Enter zip code"
                      value={newBooking.zipCode}
                      onChange={(e) => setNewBooking({ ...newBooking, zipCode: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Required to see available services for your area
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {/* Customer Type Selection */}
                <div>
                  <RadioGroup
                    value={newBooking.customerType}
                    onValueChange={(value) => {
                      setNewBooking({
                        ...newBooking,
                        customerType: value,
                        customerId: value === "new" ? "" : newBooking.customerId,
                        ...(value === "new"
                          ? { creditCardMode: "new" as const, savedStripePaymentMethodId: "" }
                          : {}),
                      });
                      if (value === 'new') {
                        setCustomerSearch('');
                        setShowCustomerDropdown(false);
                      }
                    }}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="new-customer" />
                      <Label htmlFor="new-customer" className="font-medium">New customer</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="existing" id="existing-customer" />
                      <Label htmlFor="existing-customer" className="font-medium">Existing customer</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Customer Search - Only show when existing customer is selected */}
                {newBooking.customerType === 'existing' && (
                  <div className="relative">
                    <Label htmlFor="customer-search" className="text-sm font-medium mb-2 block">Search Customer</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="customer-search"
                        placeholder="Search by name or email..."
                        value={customerSearch}
                        onChange={(e) => handleCustomerSearch(e.target.value)}
                        onFocus={() => customerSearch && setShowCustomerDropdown(true)}
                        className="pl-10"
                      />
                    </div>

                    {/* Customer Dropdown */}
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => selectCustomer(customer)}
                          >
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.email}</div>
                            {customer.phone && <div className="text-sm text-gray-500">{customer.phone}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Zip Code */}
                <div>
                  <Label htmlFor="zipCode" className="text-sm font-medium mb-2 block">Zip Code</Label>
                  <Input
                    id="zipCode"
                    placeholder="Enter zip code"
                    value={newBooking.zipCode}
                    onChange={(e) => setNewBooking({ ...newBooking, zipCode: e.target.value })}
                  />
                  {hasLocationBasedFrequencies && (
                    <p className="text-xs text-muted-foreground mt-1">Required to see available services for your area</p>
                  )}
                </div>

                {/* Name Fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium mb-2 block">First name</Label>
                    <Input
                      id="firstName"
                      placeholder="Enter your first name"
                      value={newBooking.firstName}
                      onChange={(e) => {
                        setNewBooking({ ...newBooking, firstName: e.target.value });
                        setErrors(prev => ({ ...prev, firstName: false }));
                      }}
                      className={errors.firstName ? "border-red-500" : ""}
                      disabled={newBooking.customerType === 'existing'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm font-medium mb-2 block">Last name</Label>
                    <Input
                      id="lastName"
                      placeholder="Enter your last name"
                      value={newBooking.lastName}
                      onChange={(e) => {
                        setNewBooking({ ...newBooking, lastName: e.target.value });
                        setErrors(prev => ({ ...prev, lastName: false }));
                      }}
                      className={errors.lastName ? "border-red-500" : ""}
                      disabled={newBooking.customerType === 'existing'}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-sm font-medium mb-2 block">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={newBooking.email}
                    onChange={(e) => {
                      setNewBooking({ ...newBooking, email: e.target.value });
                      setErrors(prev => ({ ...prev, email: false }));
                    }}
                    className={errors.email ? "border-red-500" : ""}
                    disabled={newBooking.customerType === 'existing'}
                  />
                </div>

                {/* Phone (E.164 + country; locale-based default country) */}
                <div>
                  <Label htmlFor="customer-phone" className="text-sm font-medium mb-2 block">
                    Phone number
                  </Label>
                  <BookingPhoneInput
                    id="customer-phone"
                    value={newBooking.phone}
                    onChange={(v) => {
                      setNewBooking({ ...newBooking, phone: v });
                      setErrors((prev) => ({ ...prev, phone: false }));
                    }}
                    disabled={newBooking.customerType === "existing"}
                    error={errors.phone}
                    placeholder="Enter phone number"
                  />
                  {errors.phone ? (
                    <p className="mt-1 text-xs text-destructive">Enter a valid phone number for the selected country.</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">{PHONE_FIELD_HELPER_TEXT}</p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <Label htmlFor="address" className="text-sm font-medium mb-2 block">Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter service address"
                    value={newBooking.address}
                    onChange={(e) => {
                      setNewBooking({ ...newBooking, address: e.target.value });
                      setErrors(prev => ({ ...prev, address: false }));
                    }}
                    className={errors.address ? "border-red-500" : ""}
                    disabled={newBooking.customerType === 'existing'}
                  />
                </div>
              </>
            )}

            {/* Service Type */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Select service</Label>
              {hasLocationBasedFrequencies && (!newBooking.zipCode?.trim() || newBooking.zipCode.trim().length < 5) ? (
                <div className="flex flex-col gap-1">
                  <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    Enter zip code above to see available services
                  </div>
                  <p className="text-xs text-muted-foreground">Services are based on your location. Enter a valid zip code first.</p>
                </div>
              ) : (
                <Select value={newBooking.service} onValueChange={(value) => {
                  const cat = serviceCategories.find((c) => c.name === value);
                  const clearManualDuration =
                    Boolean(cat?.hourly_service?.enabled) &&
                    cat?.hourly_service?.priceCalculationType === "pricingParametersTime";
                  setNewBooking((prev) => ({
                    ...prev,
                    service: value,
                    ...(clearManualDuration ? { duration: "", durationUnit: "Hours" as const } : {}),
                  }));
                  setErrors(prev => ({ ...prev, service: false }));
                  const html = String(cat?.popup_content ?? "").trim();
                  if (
                    cat?.enable_popup_on_selection &&
                    html &&
                    popupDisplayAppliesToSurface(cat.popup_display, "admin_staff")
                  ) {
                    setFrequencySelectionPopup({ title: value, html });
                  }
                }}>
                  <SelectTrigger className={errors.service ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCategories.length > 0 ? (
                      serviceCategories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-services" disabled>
                        No service categories available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              {serviceCategories.length === 0 &&
              selectedIndustryId &&
              !(hasLocationBasedFrequencies && (!newBooking.zipCode?.trim() || newBooking.zipCode.trim().length < 5)) ? (
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Form 1 starter template</span>{" "}
                  (default when you add an industry with the Form 1 seed) usually includes:{" "}
                  {FORM1_SEEDED_SERVICE_CATEGORIES.filter((c) => c.display === "customer_frontend_backend_admin")
                    .map((c) => c.name)
                    .join(", ")}
                  . Configure them under Settings → Industries → Form 1 for this industry.
                </p>
              ) : null}
            </div>

            {newBooking.service ? (
            <>
            {/* Time duration: hourly + "Based on custom time" only (pricing-parameter time uses option time_minutes) */}
            {(() => {
              const cat = serviceCategories.find((c) => c.name === newBooking.service);
              const hs = cat?.hourly_service;
              const show =
                Boolean(hs?.enabled) && (hs?.priceCalculationType ?? "customTime") === "customTime";
              return show;
            })() && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Time Duration</Label>
                <div className="flex gap-3">
                  <Select value={newBooking.duration} onValueChange={(value) => setNewBooking({ ...newBooking, duration: value })}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01">01</SelectItem>
                      <SelectItem value="02">02</SelectItem>
                      <SelectItem value="03">03</SelectItem>
                      <SelectItem value="04">04</SelectItem>
                      <SelectItem value="05">05</SelectItem>
                      <SelectItem value="06">06</SelectItem>
                      <SelectItem value="07">07</SelectItem>
                      <SelectItem value="08">08</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newBooking.durationUnit} onValueChange={(value) => setNewBooking({ ...newBooking, durationUnit: value })}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hours">Hours</SelectItem>
                      <SelectItem value="Minutes">Minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 mt-3">
                  <Checkbox
                    id="notify-more-time"
                    checked={newBooking.notifyMoreTime}
                    onCheckedChange={(checked) => setNewBooking({ ...newBooking, notifyMoreTime: !!checked })}
                  />
                  <Label htmlFor="notify-more-time" className="text-sm">Notify me if the job requires more time.</Label>
                </div>
              </div>
            )}

            {/* Frequency */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Frequency</Label>
              {(() => {
                // Filter frequencies based on selected service category
                let availableFrequencies = frequencies;
                
                if (newBooking.service) {
                  const selectedServiceCategory = serviceCategories.find(cat => cat.name === newBooking.service);

                  if (selectedServiceCategory && selectedServiceCategory.service_category_frequency) {
                    const names = frequencies.map((f) => f.name).filter(Boolean);
                    const filteredNames = filterFrequencyOptionsForServiceCategory(
                      names,
                      selectedServiceCategory,
                    );
                    const byName = new Map(frequencies.map((f) => [f.name, f]));
                    availableFrequencies = filteredNames
                      .map((n) => byName.get(n))
                      .filter((f): f is (typeof frequencies)[number] => f != null);

                    console.log(`Service "${newBooking.service}" frequency filtering:`, {
                      serviceCategory: selectedServiceCategory,
                      selected_frequencies: selectedServiceCategory.selected_frequencies,
                      availableFrequencies: availableFrequencies.map((f) => f.name),
                    });
                  }
                }
                
                return availableFrequencies.length > 0 ? (
                  <TooltipProvider delayDuration={200}>
                  <div className="flex flex-wrap gap-3">
                    {availableFrequencies.map((freq) => {
                      const selected = newBooking.frequency === freq.name;
                      const tooltipText = (freq.explanation_tooltip_text || "").trim();
                      const showInfo = freq.show_explanation && tooltipText.length > 0;
                      const popupHtml = (freq.popup_content || "").trim();
                      return (
                        <button
                          key={freq.id}
                          type="button"
                          onClick={() => {
                            setNewBooking((prev) => ({ ...prev, frequency: freq.name }));
                            if (
                              freq.enable_popup &&
                              popupHtml &&
                              popupDisplayAppliesToSurface(freq.popup_display, "admin_staff")
                            ) {
                              setFrequencySelectionPopup({ title: freq.name, html: popupHtml });
                            }
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-all duration-200",
                            selected
                              ? "bg-cyan-100 border-cyan-400 text-cyan-700 hover:bg-cyan-200"
                              : "border-border bg-background hover:bg-cyan-50 hover:border-cyan-400 hover:text-cyan-700"
                          )}
                        >
                          <span>{freq.name}</span>
                          {showInfo && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  tabIndex={0}
                                  role="button"
                                  className="inline-flex shrink-0 rounded p-0.5 text-orange-500 hover:bg-orange-500/15 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  aria-label={`About ${freq.name}`}
                                >
                                  <Info className="h-4 w-4" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs border bg-popover text-popover-foreground shadow-md">
                                <p className="text-sm leading-snug">{tooltipText}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  </TooltipProvider>
                ) : (
                  <div className="text-sm text-muted-foreground p-4 border border-dashed border-gray-300 rounded-lg">
                    {newBooking.service ? 
                      `No frequencies configured for "${newBooking.service}"` : 
                      "Select a service to see available frequencies"
                    }
                  </div>
                );
              })()}
              <Dialog open={!!frequencySelectionPopup} onOpenChange={(open) => { if (!open) setFrequencySelectionPopup(null); }}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{frequencySelectionPopup?.title}</DialogTitle>
                    <DialogDescription className="sr-only">Frequency details</DialogDescription>
                  </DialogHeader>
                  {frequencySelectionPopup?.html ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-sm [&_a]:text-primary [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: frequencySelectionPopup.html }}
                    />
                  ) : null}
                  <DialogFooter>
                    <Button type="button" variant="default" onClick={() => setFrequencySelectionPopup(null)}>
                      OK
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* First Appointment Toggle for Recurring Frequencies */}
            {(() => {
              const selectedFreq = frequencies.find(f => f.name === newBooking.frequency);
              const isRecurring = selectedFreq?.occurrence_time === 'recurring';
              const hasDiscountExclusion = selectedFreq?.frequency_discount === 'exclude-first';
              const hasShorterLength = selectedFreq?.shorter_job_length === 'yes' && selectedFreq?.exclude_first_appointment;
              
              if (isRecurring && (hasDiscountExclusion || hasShorterLength)) {
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="first-appointment"
                        checked={isFirstAppointment}
                        onCheckedChange={(checked) => setIsFirstAppointment(!!checked)}
                      />
                      <div className="flex-1">
                        <Label htmlFor="first-appointment" className="text-sm font-medium cursor-pointer">
                          This is the first appointment
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {hasDiscountExclusion && hasShorterLength && (
                            <>First appointment uses original job length and one-time pricing (no frequency discount)</>
                          )}
                          {hasDiscountExclusion && !hasShorterLength && (
                            <>First appointment charged at one-time price (no frequency discount)</>
                          )}
                          {!hasDiscountExclusion && hasShorterLength && (
                            <>First appointment uses original job length</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Create as recurring series (when frequency is recurring) */}
            {(() => {
              const selectedFreq = frequencies.find(f => f.name === newBooking.frequency);
              const isRecurring = selectedFreq?.occurrence_time === 'recurring';
              if (!isRecurring) return null;
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="create-recurring"
                        checked={newBooking.createRecurring}
                        onCheckedChange={(v) => setNewBooking(prev => ({ ...prev, createRecurring: !!v }))}
                      />
                      <Label htmlFor="create-recurring" className="text-sm font-medium cursor-pointer">
                        Create as recurring series
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create multiple future bookings at once (e.g. 8 weeks ahead). Extend on demand when viewing the calendar.
                    </p>
                    {newBooking.createRecurring && (
                      <div className="grid gap-4 sm:grid-cols-2 pt-2">
                        <div>
                          <Label className="text-xs">Number of occurrences ahead</Label>
                          <Input
                            type="number"
                            min={1}
                            max={24}
                            value={newBooking.recurringOccurrencesAhead}
                            onChange={(e) => setNewBooking(prev => ({ ...prev, recurringOccurrencesAhead: Math.min(24, Math.max(1, parseInt(e.target.value, 10) || 8)) }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">End date (optional)</Label>
                          <Input
                            type="date"
                            value={newBooking.recurringEndDate}
                            onChange={(e) => setNewBooking(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            
            {/* Form 2: item + package selector (instead of Form 1 variable dropdowns) */}
            {isForm2Catalog && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Items</Label>
                  <Select value={selectedForm2Item} onValueChange={setSelectedForm2Item}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingVariables.length > 0 ? (
                        pricingVariables.map((row) => {
                          const categoryKey = (row.category || row.name || "").trim();
                          return (
                            <SelectItem key={row.id} value={categoryKey}>
                              {row.name}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="no-items" disabled>
                          No items configured
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Packages</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    {pricingParameters
                      .filter((p) => {
                        const categoryKey = String(p.variable_category || "").trim();
                        if (!categoryKey) return false;
                        if (categoryKey === FORM2_STANDALONE_PACKAGE_CATEGORY) return true;
                        return selectedForm2Item ? categoryKey === selectedForm2Item : false;
                      })
                      .map((p) => {
                        const categoryKey = String(p.variable_category || "").trim();
                        const selectedName = categoryValues[categoryKey] || "";
                        const selected = selectedName === p.name;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={cn(
                              "rounded-md border p-3 text-left transition-colors",
                              selected ? "border-cyan-500 bg-cyan-50" : "border-border hover:bg-muted/40",
                            )}
                            onClick={() => {
                              setCategoryValues((prev) => ({ ...prev, [categoryKey]: p.name }));
                            }}
                          >
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ${Number(p.price || 0).toFixed(2)} · {Math.max(0, Number(p.time_minutes || 0))} min
                            </p>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Form 1: dynamic variable categories from pricing parameters */}
            {!isForm2Catalog && variableCategories.length > 0 && (
              <div className={`grid gap-4 ${variableCategories.length === 1 ? 'md:grid-cols-1' : variableCategories.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                {variableCategories.map((category) => {
                  const categoryOptions = pricingParameters.filter(p => p.variable_category === category);
                  
                  console.log(`=== DEBUGGING CATEGORY: ${category} ===`);
                  console.log('Selected frequency:', newBooking.frequency);
                  console.log('Selected service:', newBooking.service);
                  console.log('Category options:', categoryOptions);
                  
                  // Start with all category options
                  let filteredOptions = categoryOptions;
                  
                  // Check if service category uses frequency-based filtering
                  const selectedServiceCategory = serviceCategories.find(cat => cat.name === newBooking.service);
                  
                  if (selectedServiceCategory) {
                    console.log('service_category_frequency:', selectedServiceCategory.service_category_frequency);
                    
                    if (selectedServiceCategory.service_category_frequency) {
                      // Use frequency dependencies - apply pricing parameter's own frequency/service filtering
                      console.log('📋 Using FREQUENCY dependencies for variables');
                      
                      // Apply frequency filtering if parameter has show_based_on_frequency enabled
                      filteredOptions = filteredOptions.filter(option => {
                        console.log(`\n🔍 Processing option: ${option.name}`);
                        console.log('  - show_based_on_frequency:', option.show_based_on_frequency);
                        console.log('  - show_based_on_service_category:', option.show_based_on_service_category);
                        console.log('  - option.frequency:', option.frequency);
                        console.log('  - option.service_category:', option.service_category);
                        
                        // If this parameter doesn't use frequency filtering, include it
                        if (!option.show_based_on_frequency) {
                          console.log('  ✅ PASS: No frequency filtering required');
                          return true;
                        }
                        
                        // If frequency is selected, check if this parameter's frequency includes the selected frequency
                        if (newBooking.frequency && option.frequency) {
                          const allowedFrequencies = option.frequency.split(', ').map(f => f.trim());
                          const frequencyMatch = allowedFrequencies.includes(newBooking.frequency);
                          console.log('  - Frequency check:', { allowedFrequencies, selected: newBooking.frequency, match: frequencyMatch });
                          if (frequencyMatch) {
                            console.log('  ✅ PASS: Frequency matches');
                            return true;
                          } else {
                            console.log('  ❌ FAIL: Frequency does not match');
                            return false;
                          }
                        }
                        
                        // If no frequency is selected but parameter requires frequency filtering, exclude it
                        console.log('  ❌ FAIL: No frequency selected but filtering required');
                        return false;
                      });
                      
                      console.log('After frequency filtering:', filteredOptions.length, 'options remaining');
                      
                      // Apply service category filtering if parameter has show_based_on_service_category enabled
                      filteredOptions = filteredOptions.filter(option => {
                        console.log(`\n🔍 Service category check for: ${option.name}`);
                        console.log('  - show_based_on_service_category:', option.show_based_on_service_category);
                        
                        // If this parameter doesn't use service category filtering, include it
                        if (!option.show_based_on_service_category) {
                          console.log('  ✅ PASS: No service category filtering required');
                          return true;
                        }
                        
                        // If service is selected, check if this parameter's service category includes the selected service
                        if (newBooking.service && option.service_category) {
                          const allowedServiceCategories = option.service_category.split(', ').map(sc => sc.trim());
                          const serviceMatch = allowedServiceCategories.includes(newBooking.service);
                          console.log('  - Service category check:', { 
                            allowedServiceCategories, 
                            selected: newBooking.service, 
                            match: serviceMatch 
                          });
                          if (serviceMatch) {
                            console.log('  ✅ PASS: Service category matches');
                            return true;
                          } else {
                            console.log('  ❌ FAIL: Service category does not match');
                            return false;
                          }
                        }
                        
                        // If no service is selected but parameter requires service category filtering, exclude it
                        console.log('  ❌ FAIL: No service selected but filtering required');
                        return false;
                      });
                      
                      console.log('After service category filtering:', filteredOptions.length, 'options remaining');

                      const bedroomTierForVars = categoryValues['Bedroom'] ?? null;
                      filteredOptions = filteredOptions.filter((option) =>
                        pricingParamAppliesToSelection(
                          {
                            show_based_on_frequency: option.show_based_on_frequency,
                            frequency: option.frequency,
                            show_based_on_service_category: option.show_based_on_service_category,
                            service_category: option.service_category,
                            show_based_on_service_category2: Boolean(option.show_based_on_service_category2),
                            service_category2: option.service_category2 ?? null,
                          },
                          newBooking.frequency,
                          newBooking.service,
                          bedroomTierForVars,
                        ),
                      );

                      if (frequencyDependencies) {
                        filteredOptions = filteredOptions.filter((option) => {
                          const allowed = frequencyDepOptionNamesForCategory(category, frequencyDependencies);
                          if (allowed === null) return true;
                          return allowed.includes(option.name);
                        });
                      }
                    } else {
                      // Use service category's own variables configuration
                      console.log('📋 Using SERVICE CATEGORY configuration for variables');
                      
                      if (selectedServiceCategory.variables && selectedServiceCategory.variables[category]) {
                        // If service category has variables configured for this category, show only those
                        const allowedVariables = selectedServiceCategory.variables[category];
                        filteredOptions = filteredOptions.filter(option => 
                          allowedVariables.includes(option.name)
                        );
                        console.log('After service category variables filtering:', filteredOptions.length);
                      } else {
                        // If service category has no variables configured for this category, show none
                        console.log('No variables configured for this category in service category');
                        filteredOptions = [];
                      }
                    }
                  }
                  
                  // Don't render if no filtered options
                  if (filteredOptions.length === 0) {
                    return null;
                  }
                  
                  return (
                    <div key={category}>
                      <Label htmlFor={category} className="text-sm font-medium mb-2 block">{category}</Label>
                      <Select 
                        value={categoryValues[category] || 'None'} 
                        onValueChange={(value) => setCategoryValues({ ...categoryValues, [category]: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${category.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          {filteredOptions.map((option) => (
                            <SelectItem key={option.id} value={option.name}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            )}

            {/* Form 1 only: Partial Cleaning + Exclude Parameters */}
            {!isForm2Catalog && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="partial-cleaning"
                  checked={isPartialCleaning}
                  onCheckedChange={(checked) => setIsPartialCleaning(!!checked)}
                />
                <Label htmlFor="partial-cleaning" className="text-sm font-medium">This Is Partial Cleaning Only</Label>
              </div>
            )}

            {/* Exclude Parameters - Show when partial cleaning is checked */}
            {!isForm2Catalog && isPartialCleaning && (() => {
              // Apply filtering based on service category configuration
              let filteredExcludeParams = excludeParameters;
              
              if (newBooking.service) {
                const selectedServiceCategory = serviceCategories.find(cat => cat.name === newBooking.service);
                
                if (selectedServiceCategory) {
                  // Check if service category uses frequency-based filtering
                  if (selectedServiceCategory.service_category_frequency) {
                    // Use frequency dependencies configuration
                    console.log('📋 Using FREQUENCY dependencies for exclude parameters');
                    if (frequencyDependencies && frequencyDependencies.excludeParameters && frequencyDependencies.excludeParameters.length > 0) {
                      filteredExcludeParams = filteredExcludeParams.filter(param => 
                        frequencyDependencies.excludeParameters.includes(param.name)
                      );
                    } else {
                      // No frequency dependencies available
                      filteredExcludeParams = [];
                    }
                  } else {
                    // Use service category's own exclude parameters configuration
                    console.log('📋 Using SERVICE CATEGORY configuration for exclude parameters');
                    if (selectedServiceCategory.selected_exclude_parameters && selectedServiceCategory.selected_exclude_parameters.length > 0) {
                      filteredExcludeParams = filteredExcludeParams.filter(param => 
                        selectedServiceCategory.selected_exclude_parameters.includes(param.name)
                      );
                    } else {
                      // Service category has no exclude parameters configured
                      filteredExcludeParams = [];
                    }
                  }
                }
              }
              
              // Don't show the entire Exclude Parameters section if no parameters are available
              if (filteredExcludeParams.length === 0) {
                return null;
              }
              
              return (
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="text-base font-semibold">Select What Does Not Need To Be Done</h3>
                  <TooltipProvider delayDuration={200}>
                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                    {filteredExcludeParams.map((param) => {
                      const excludeTooltip =
                        param.show_explanation_icon_on_form && String(param.explanation_tooltip_text || "").trim()
                          ? String(param.explanation_tooltip_text).trim()
                          : "";
                      const excludePopupHtml = String(param.popup_content || "").trim();
                      return (
                      <div 
                        key={param.id} 
                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedExcludeParams.includes(param.id) 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          const isSelected = selectedExcludeParams.includes(param.id);
                          setSelectedExcludeParams(prev => 
                            isSelected 
                              ? prev.filter(id => id !== param.id)
                              : [...prev, param.id]
                          );
                          if (!isSelected) {
                            setNewBooking(prev => ({
                              ...prev,
                              excludeQuantities: { ...prev.excludeQuantities, [param.id]: 1 }
                            }));
                            if (
                              param.enable_popup_on_selection &&
                              excludePopupHtml &&
                              popupDisplayAppliesToSurface(param.popup_display, "admin_staff")
                            ) {
                              setFrequencySelectionPopup({ title: param.name, html: excludePopupHtml });
                            }
                          }
                          if (isSelected) {
                            setNewBooking(prev => {
                              const next = { ...prev.excludeQuantities };
                              delete next[param.id];
                              return { ...prev, excludeQuantities: next };
                            });
                          }
                        }}
                      >
                        {param.icon && industryFormIconIsImageSrc(param.icon) ? (
                          <img
                            src={param.icon}
                            alt={param.name}
                            className="w-16 h-16 mb-2 object-contain"
                          />
                        ) : (
                          (() => {
                            const rich = bookingFormPresetRichIconSrc(param.icon, param.name);
                            if (rich) {
                              return (
                                <img
                                  src={rich}
                                  alt={param.name}
                                  className="w-16 h-16 mb-2 object-contain drop-shadow-sm"
                                />
                              );
                            }
                            const IconComponent = resolveIndustryFormLucideIcon(
                              param.icon,
                              param.name,
                            );
                            const colorClass = bookingFormPresetIconTextClass(param.icon, param.name);
                            return (
                              <IconComponent className={`w-16 h-16 mb-2 ${colorClass}`} />
                            );
                          })()
                        )}
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-center">{param.name}</span>
                          {excludeTooltip ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  tabIndex={0}
                                  role="button"
                                  className="inline-flex shrink-0 rounded p-0.5 text-orange-500 hover:bg-orange-500/15 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  aria-label={`About ${param.name}`}
                                >
                                  <Info className="h-4 w-4" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs border bg-popover text-popover-foreground shadow-md">
                                <p className="text-sm leading-snug">{excludeTooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                        {selectedExcludeParams.includes(param.id) && param.qty_based && (
                          <div className="flex items-center justify-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                const currentQty = newBooking.excludeQuantities[param.id] || 1;
                                if (currentQty > 1) {
                                  setNewBooking(prev => ({
                                    ...prev,
                                    excludeQuantities: { ...prev.excludeQuantities, [param.id]: currentQty - 1 }
                                  }));
                                }
                              }}
                              className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 transition-colors"
                              disabled={(newBooking.excludeQuantities[param.id] || 1) <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-medium">
                              {newBooking.excludeQuantities[param.id] || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentQty = newBooking.excludeQuantities[param.id] || 1;
                                const maxQty = (param.maximum_quantity != null && param.maximum_quantity > 0) ? param.maximum_quantity : 999;
                                const newQty = Math.min(currentQty + 1, maxQty);
                                setNewBooking(prev => ({
                                  ...prev,
                                  excludeQuantities: { ...prev.excludeQuantities, [param.id]: newQty }
                                }));
                              }}
                              className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              disabled={(newBooking.excludeQuantities[param.id] || 1) >= ((param.maximum_quantity != null && param.maximum_quantity > 0) ? param.maximum_quantity : 999)}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                  </TooltipProvider>
                </div>
              );
            })()}

            {/* Extras - Display filtered extras */}
            {extras.length > 0 && (
              <TooltipProvider delayDuration={200}>
              <div>
                <Label className="text-sm font-medium mb-3 block">Select Extras</Label>
                <div className="grid gap-1 md:grid-cols-3 lg:grid-cols-4">
                  {extras.map((extra) => {
                    const extraDisplayLabel = getExtraCustomerDisplayName({
                      name: extra.name,
                      different_on_customer_end: extra.differentOnCustomerEnd,
                      customer_end_name: extra.customerEndName,
                    });
                    const extraTooltip =
                      extra.showExplanationIconOnForm && String(extra.explanationTooltipText || "").trim()
                        ? String(extra.explanationTooltipText).trim()
                        : "";
                    const extraPopupHtml = String(extra.popupContent || "").trim();
                    return (
                    <div 
                      key={extra.id} 
                      className={`relative p-3 border rounded-lg transition-all cursor-pointer ${
                        newBooking.selectedExtras?.includes(extra.id) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-12 h-12 flex items-center justify-center">
                          {extra.icon && industryFormIconIsImageSrc(extra.icon) ? (
                            <img
                              src={extra.icon}
                              alt=""
                              width={48}
                              height={48}
                              className="h-12 w-12 object-contain"
                            />
                          ) : (
                            (() => {
                              const rich = bookingFormPresetRichIconSrc(extra.icon, extraDisplayLabel);
                              if (rich) {
                                return (
                                  <img
                                    src={rich}
                                    alt=""
                                    width={48}
                                    height={48}
                                    className="h-12 w-12 object-contain drop-shadow-sm"
                                  />
                                );
                              }
                              const PresetIcon = resolveIndustryExtraPresetLucideIcon(extra.icon);
                              if (PresetIcon) {
                                const colorClass = bookingFormPresetIconTextClass(extra.icon, extraDisplayLabel);
                                return <PresetIcon className={`h-12 w-12 ${colorClass}`} />;
                              }
                              return (
                                <img
                                  src={DEFAULT_INDUSTRY_EXTRA_ICON_SRC}
                                  alt=""
                                  width={48}
                                  height={48}
                                  className="h-12 w-12 object-contain"
                                />
                              );
                            })()
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1.5 flex-wrap mb-2">
                          <span className="font-medium text-gray-900 text-center">{extraDisplayLabel}</span>
                          {extraTooltip ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  tabIndex={0}
                                  role="button"
                                  className="inline-flex shrink-0 rounded p-0.5 text-orange-500 hover:bg-orange-500/15 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  aria-label={`About ${extraDisplayLabel}`}
                                >
                                  <Info className="h-4 w-4" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs border bg-popover text-popover-foreground shadow-md">
                                <p className="text-sm leading-snug">{extraTooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-center w-full">
                          {extra.qtyBased ? (
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentQty = newBooking.extraQuantities[extra.id] || 0;
                                  if (currentQty > 0) {
                                    const newQty = currentQty - 1;
                                    setNewBooking(prev => ({
                                      ...prev,
                                      extraQuantities: { ...prev.extraQuantities, [extra.id]: newQty }
                                    }));
                                    if (newQty === 0 && newBooking.selectedExtras?.includes(extra.id)) {
                                      setNewBooking(prev => ({
                                        ...prev,
                                        selectedExtras: prev.selectedExtras?.filter(id => id !== extra.id)
                                      }));
                                    }
                                  }
                                }}
                                className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                disabled={(newBooking.extraQuantities[extra.id] || 0) === 0}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold">
                                {newBooking.extraQuantities[extra.id] || 0}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentQty = newBooking.extraQuantities[extra.id] || 0;
                                  const maxQty = extra.maximumQuantity && extra.maximumQuantity > 0 ? extra.maximumQuantity : 999;
                                  const newQty = Math.min(currentQty + 1, maxQty);
                                  setNewBooking(prev => ({
                                    ...prev,
                                    extraQuantities: { ...prev.extraQuantities, [extra.id]: newQty }
                                  }));
                                  if (!newBooking.selectedExtras?.includes(extra.id)) {
                                    setNewBooking(prev => ({
                                      ...prev,
                                      selectedExtras: [...(prev.selectedExtras || []), extra.id]
                                    }));
                                  }
                                  if (
                                    currentQty === 0 &&
                                    newQty > 0 &&
                                    extra.enablePopupOnSelection &&
                                    extraPopupHtml &&
                                    popupDisplayAppliesToSurface(extra.popupDisplay, "admin_staff")
                                  ) {
                                    setFrequencySelectionPopup({ title: extraDisplayLabel, html: extraPopupHtml });
                                  }
                                }}
                                className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                disabled={(newBooking.extraQuantities[extra.id] || 0) >= (extra.maximumQuantity && extra.maximumQuantity > 0 ? extra.maximumQuantity : 999)}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const isSelected = newBooking.selectedExtras?.includes(extra.id);
                                  if (isSelected) {
                                    setNewBooking(prev => {
                                      const q = { ...prev.extraQuantities };
                                      delete q[extra.id];
                                      return {
                                        ...prev,
                                        selectedExtras: prev.selectedExtras?.filter(id => id !== extra.id),
                                        extraQuantities: q
                                      };
                                    });
                                  } else {
                                    setNewBooking(prev => ({
                                      ...prev,
                                      selectedExtras: [...(prev.selectedExtras || []), extra.id],
                                      extraQuantities: { ...prev.extraQuantities, [extra.id]: 1 }
                                    }));
                                    if (
                                      extra.enablePopupOnSelection &&
                                      extraPopupHtml &&
                                      popupDisplayAppliesToSurface(extra.popupDisplay, "admin_staff")
                                    ) {
                                      setFrequencySelectionPopup({ title: extraDisplayLabel, html: extraPopupHtml });
                                    }
                                  }
                                }}
                                className="text-sm font-medium text-primary"
                              >
                                {newBooking.selectedExtras?.includes(extra.id) ? 'Remove' : 'Add'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
              </TooltipProvider>
            )}

            {/* Booking Adjustments */}
            <div>
              <h3 className={embInk.h3}>Booking Adjustments</h3>
              <div className="space-y-4">
                {/* Adjustment Checkboxes */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="adjust-service-total"
                      checked={newBooking.adjustServiceTotal}
                      onCheckedChange={(checked) => setNewBooking({ ...newBooking, adjustServiceTotal: !!checked })}
                    />
                    <Label htmlFor="adjust-service-total" className={embInk.labelSm}>Do you want to adjust service total?</Label>
                  </div>
                  
                  {newBooking.adjustServiceTotal && (
                    <div className="ml-[28px]">
                      <div>
                        <Input
                          id="adjustment-service-total-amount"
                          type="number"
                          placeholder="Enter amount"
                          value={newBooking.adjustmentServiceTotalAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow positive whole numbers (no decimals, no negative)
                            if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
                              setNewBooking({ ...newBooking, adjustmentServiceTotalAmount: value });
                            }
                          }}
                          min="0"
                          step="1"
                          className="w-32"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="adjust-price"
                      checked={newBooking.adjustPrice}
                      onCheckedChange={(checked) => setNewBooking({ ...newBooking, adjustPrice: !!checked })}
                    />
                    <Label htmlFor="adjust-price" className={embInk.labelSm}>Do you want to adjust price?</Label>
                  </div>
                  
                  {newBooking.adjustPrice && (
                    <div className="ml-[28px] space-y-2">
                      <div>
                        <Input
                          id="adjustment-amount"
                          type="number"
                          placeholder="Enter amount"
                          value={newBooking.adjustmentAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow positive whole numbers (no decimals, no negative)
                            if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
                              setNewBooking({ ...newBooking, adjustmentAmount: value });
                            }
                          }}
                          min="0"
                          step="1"
                          className="w-32"
                        />
                      </div>
                      {priceAdjustmentNoteEnabled && (
                        <div>
                          <Label htmlFor="price-adjustment-note" className={embInk.softSm}>Note (optional)</Label>
                          <Textarea
                            id="price-adjustment-note"
                            placeholder="Reason or note for this price adjustment"
                            value={newBooking.priceAdjustmentNote}
                            onChange={(e) => setNewBooking({ ...newBooking, priceAdjustmentNote: e.target.value })}
                            className="mt-1 min-h-[60px]"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="adjust-time"
                      checked={newBooking.adjustTime}
                      onCheckedChange={(checked) => setNewBooking({ ...newBooking, adjustTime: !!checked })}
                    />
                    <Label htmlFor="adjust-time" className={embInk.labelSm}>Do you want to adjust time?</Label>
                  </div>
                  
                  {newBooking.adjustTime && (
                    <div className="ml-[28px] space-y-2">
                      <div className="flex items-center space-x-2">
                        <Select
                          value={newBooking.adjustedHours}
                          onValueChange={(value) => setNewBooking({ ...newBooking, adjustedHours: value })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="Hours" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 25 }, (_, i) => i).map((hour) => (
                              <SelectItem key={hour} value={hour.toString()}>
                                {hour.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <span className={embInk.plain}>:</span>
                        
                        <Select
                          value={newBooking.adjustedMinutes}
                          onValueChange={(value) => setNewBooking({ ...newBooking, adjustedMinutes: value })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                              <SelectItem key={minute} value={minute.toString().padStart(2, '0')}>
                                {minute.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {timeAdjustmentNoteEnabled && (
                        <div>
                          <Label htmlFor="time-adjustment-note" className={embInk.softSm}>Note (optional)</Label>
                          <Textarea
                            id="time-adjustment-note"
                            placeholder="Reason or note for this time adjustment"
                            value={newBooking.timeAdjustmentNote}
                            onChange={(e) => setNewBooking({ ...newBooking, timeAdjustmentNote: e.target.value })}
                            className="mt-1 min-h-[60px]"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Select a service above to continue.</p>
            )}
            <div>
              <h3 className={embInk.h3}>Service Provider</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="waiting-list"
                    checked={newBooking.waitingList}
                    onCheckedChange={(checked) => setNewBooking({ ...newBooking, waitingList: !!checked })}
                  />
                  <Label htmlFor="waiting-list" className={embInk.labelSm}>Waiting List</Label>
                </div>
                
                {newBooking.waitingList && (
                  <div>
                    <Label className={embInk.labelSmBlock}>Priority</Label>
                    <RadioGroup
                      value={newBooking.priority}
                      onValueChange={(value) => setNewBooking({ ...newBooking, priority: value })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Low" id="priority-low" />
                        <Label htmlFor="priority-low" className={embInk.labelSm}>Low</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Medium" id="priority-medium" />
                        <Label htmlFor="priority-medium" className={embInk.labelSm}>Medium</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="High" id="priority-high" />
                        <Label htmlFor="priority-high" className={embInk.labelSm}>High</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="selected-date" className={embInk.labelSmBlock}>Select Date</Label>
                    <Input
                      id="selected-date"
                      type="date"
                      value={newBooking.selectedDate}
                      onChange={(e) => setNewBooking({ ...newBooking, selectedDate: e.target.value, selectedTime: '' })}
                      min={getTodayLocalDate()}
                    />
                  </div>
                  <div>
                    <Label htmlFor="selected-time" className={embInk.labelSmBlock}>
                      Select Time
                      {newBooking.selectedDate && (
                        <span className="text-xs text-gray-400 ml-2">
                          {loadingTimeSlots ? 'Loading...' : `${availableTimeSlots.length} time slots available`}
                        </span>
                      )}
                    </Label>
                    <Select 
                      value={newBooking.selectedTime} 
                      onValueChange={(value) => setNewBooking({ ...newBooking, selectedTime: value })}
                      disabled={!newBooking.selectedDate || loadingTimeSlots}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !newBooking.selectedDate 
                            ? "Select date first"
                            : loadingTimeSlots
                            ? "Loading slots..."
                            : availableTimeSlots.length === 0
                            ? "No slots available for this date"
                            : "--:-- --"
                        } />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {newBooking.selectedDate ? (
                          loadingTimeSlots ? (
                            <SelectItem value="loading" disabled>
                              Loading available slots...
                            </SelectItem>
                          ) : availableTimeSlots.length > 0 ? (
                            availableTimeSlots.map((time) => {
                              const [hours, minutes] = time.split(':').map(Number);
                              const period = hours >= 12 ? 'PM' : 'AM';
                              const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                              const displayTime = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
                              return (
                                <SelectItem key={time} value={time}>
                                  {displayTime}
                                </SelectItem>
                              );
                            })
                          ) : (
                            <SelectItem value="no-slots" disabled>
                              No time slots available for this date
                            </SelectItem>
                          )
                        ) : (
                          <SelectItem value="select-date" disabled>
                            Please select a date first
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {newBooking.selectedDate && availableTimeSlots.length === 0 && !loadingTimeSlots && (
                      <p className="text-xs text-yellow-400 mt-1">
                        No available time slots for this date. Please select a different date.
                      </p>
                    )}
                  </div>
                </div>

                {/* Provider Selection - only when specific_provider_for_admin is enabled */}
                {specificProviderForAdmin ? (
                <div className="space-y-4">
                <div>
                  <Label htmlFor="provider-select" className={embInk.labelSmBlock}>
                    Select Provider {
                      newBooking.selectedDate 
                        ? (loadingProviders 
                            ? '(Checking availability...)' 
                            : `(${filteredProvidersByDate.length} available on ${formatDateLocal(newBooking.selectedDate)})`)
                        : allProviders.length > 0 && `(${allProviders.length} total)`
                    }
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={(selectedProvider?.id || newBooking.serviceProvider || undefined) as string | undefined}
                      onValueChange={(value) => {
                        const provider =
                          filteredProvidersByDate.find((p) => p.id === value) ||
                          allProviders.find((p) => p.id === value);
                        if (provider) {
                          handleAssignProvider(provider);
                        }
                      }}
                      disabled={!newBooking.selectedDate || loadingProviders}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={
                          !newBooking.selectedDate 
                            ? "Select date first" 
                            : loadingProviders
                            ? "Checking availability..."
                            : filteredProvidersByDate.length === 0
                            ? "No providers available on this date"
                            : "Select a provider..."
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProvidersByDate.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedProvider && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProvider(null);
                          setNewBooking(prev => ({ ...prev, serviceProvider: '', selectedTime: '' }));
                        }}
                        className="text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {selectedProvider && (
                    <p className="text-xs text-gray-400 mt-1">
                      Selected: {selectedProvider.name}
                    </p>
                  )}
                  {!newBooking.selectedDate && (
                    <p className="text-xs text-yellow-400 mt-1">
                      Please select a date first to see available providers
                    </p>
                  )}
                  {newBooking.selectedDate && !loadingProviders && filteredProvidersByDate.length === 0 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      No providers have availability on {formatDateLocal(newBooking.selectedDate)}. Please select a different date.
                    </p>
                  )}
                </div>

                    {/* Available Provider Display */}
                {newBooking.selectedDate && newBooking.selectedTime && (
                  <div>
                    <Label className={embInk.labelSmBlock}>Available Provider</Label>
                    {selectedProvider ? (
                      <div className="p-3 border border-cyan-200 bg-cyan-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {getProviderInitials(selectedProvider.name)}
                            </div>
                            <div>
                              <div className="font-medium text-black">{selectedProvider.name}</div>
                              <div className="grid gap-2 mt-2">
                                <div className="flex gap-2 items-center">
                                  <div className="text-sm text-black">Wage</div>
                                  <Input
                                    type="number"
                                    placeholder="Amount"
                                    value={providerWage}
                                    onChange={(e) => setProviderWage(e.target.value)}
                                    className="flex-1 h-8 text-sm"
                                  />
                                  <Select value={providerWageType} onValueChange={(value: 'percentage' | 'fixed' | 'hourly') => setProviderWageType(value)}>
                                    <SelectTrigger className="w-24 h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="percentage">%</SelectItem>
                                      <SelectItem value="fixed">$</SelectItem>
                                      <SelectItem value="hourly">/hr</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {availableProviders.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAllProvidersModal(true)}
                                className="text-xs"
                              >
                                {`See All (${availableProviders.length})`}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 border border-gray-200 bg-gray-50 rounded-lg">
                        <div className="text-gray-500">
                          Unassigned — no provider is available for this date and time. You can still save the booking; assign someone later or choose a different time.
                        </div>
                      </div>
                    )}
                    
                    {/* All Providers Modal */}
                    <Dialog open={showAllProvidersModal} onOpenChange={setShowAllProvidersModal}>
                      <DialogContent className="sm:max-w-[800px]">
                        <DialogHeader>
                          <DialogTitle>All Available Providers</DialogTitle>
                          <DialogDescription>Select a provider from the list below.</DialogDescription>
                        </DialogHeader>
                        <div className="mt-3 space-y-2">
                          <div className="grid grid-cols-3 gap-4">
                            {availableProviders.map((provider) => (
                              <div
                                key={provider.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedProvider?.id === provider.id
                                    ? 'border-cyan-300 bg-cyan-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => {
                                  handleAssignProvider(provider);
                                  setShowAllProvidersModal(false);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                                      selectedProvider?.id === provider.id
                                        ? 'bg-cyan-600'
                                        : 'bg-gray-400'
                                    }`}>
                                      {getProviderInitials(provider.name)}
                                    </div>
                                    <div>
                                      <div className="font-medium">{provider.name}</div>
                                    </div>
                                  </div>
                                  {selectedProvider?.id === provider.id && (
                                    <div className="text-black text-sm font-medium">Selected</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                </div>
                ) : (
                  <p className="text-sm text-gray-400 py-2">Provider will be assigned manually or from the unassigned folder.</p>
                )}
              </div>
            </div>
            
            {/* Key Information & Job Notes */}
            <div>
              <h3 className={embInk.h3t}>Key Information & Job Notes</h3>
              <p className="text-sm text-gray-400 mb-4">You can turn this description off or modify it at anytime.</p>
              
              <div className="space-y-4">
                {/* Radio buttons for key access */}
                <div>
                  <Label className={embInk.labelSmBlock}>Key Access</Label>
                  <RadioGroup
                    value={newBooking.keyInfoOption}
                    onValueChange={(value) => setNewBooking({ ...newBooking, keyInfoOption: value })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="someone-home" id="someone-home" />
                      <Label htmlFor="someone-home" className={embInk.labelSm}>Someone Will Be At Home</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hide-keys" id="hide-keys" />
                      <Label htmlFor="hide-keys" className={embInk.labelSm}>I Will Hide The Keys</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Checkbox for keeping key with provider */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="keep-key-with-provider"
                    checked={newBooking.keepKeyWithProvider}
                    onCheckedChange={(checked) => setNewBooking({ ...newBooking, keepKeyWithProvider: !!checked })}
                  />
                  <Label htmlFor="keep-key-with-provider" className={embInk.labelSm}>Keep Key With Provider</Label>
                </div>
                
                {/* Customer note for provider */}
                <div>
                  <Label className={embInk.labelSmBlock}>Customer Note For Provider</Label>
                  <Textarea
                    placeholder="Special Notes And Instructions"
                    value={newBooking.customerNoteForProvider}
                    onChange={(e) => setNewBooking({ ...newBooking, customerNoteForProvider: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            </div>
            
            {/* Coupon Code & Gift Cards */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-black">Coupon Code & Gift Cards</h3>
              
              {/* Tabs */}
              <div className="flex space-x-4 mb-4 border-b border-gray-200">
                <button
                  onClick={() => setNewBooking({ ...newBooking, couponCodeTab: "coupon-code" })}
                  className={`pb-2 text-base font-semibold ${newBooking.couponCodeTab === "coupon-code" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Coupon Code
                </button>
                <button
                  onClick={() => setNewBooking({ ...newBooking, couponCodeTab: "gift-card" })}
                  className={`pb-2 text-base font-semibold ${newBooking.couponCodeTab === "gift-card" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Gift Cards
                </button>
              </div>
              
              {/* Tab Content */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                {newBooking.couponCodeTab === "coupon-code" ? (
                  <div className="space-y-6">
                    {/* Radio Buttons */}
                    <RadioGroup
                      value={newBooking.couponType}
                      onValueChange={(value) => {
                        setAppliedCoupon(null);
                        setNewBooking({ ...newBooking, couponType: value, couponCode: "" });
                      }}
                      className="flex space-x-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value="coupon-code" 
                          id="coupon-code-radio" 
                          className="text-blue-600"
                        />
                        <Label htmlFor="coupon-code-radio" className="text-sm font-medium text-gray-900">Coupon Code</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value="amount" 
                          id="amount" 
                        />
                        <Label htmlFor="amount" className="text-sm font-medium text-gray-900">Amount</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value="percent" 
                          id="percent" 
                        />
                        <Label htmlFor="percent" className="text-sm font-medium text-gray-900">% Amount</Label>
                      </div>
                    </RadioGroup>
                    
                    {/* Input Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Label htmlFor="coupon-code-input" className="text-sm font-medium text-gray-900">
                          {newBooking.couponType === "coupon-code"
                            ? "Enter Coupon Code"
                            : newBooking.couponType === "amount"
                              ? "Enter Amount"
                              : "Enter % Amount"}
                        </Label>
                        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-xs">i</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Input
                          id="coupon-code-input"
                          placeholder={
                            newBooking.couponType === "coupon-code"
                              ? "Enter coupon code"
                              : newBooking.couponType === "amount"
                                ? "Enter amount"
                                : "Enter percent"
                          }
                          value={newBooking.couponCode}
                          onChange={(e) => {
                            setAppliedCoupon(null);
                            setNewBooking({ ...newBooking, couponCode: e.target.value });
                          }}
                          className="flex-1 border-gray-300"
                        />
                        <Button
                          type="button"
                          onClick={applyCouponSelection}
                          className="bg-sky-400 hover:bg-sky-500 text-white px-6"
                        >
                          Apply
                        </Button>
                      </div>
                      {appliedCoupon && (
                        <p className="mt-2 text-sm text-green-700">
                          Applied: -${calculatedCouponDiscount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="gift-card-code" className="text-sm font-medium text-gray-900">Gift Card Code</Label>
                      <div className="flex space-x-2 mt-2">
                        <Input
                          id="gift-card-code"
                          placeholder="Enter gift card code"
                          value={newBooking.giftCardCode}
                          onChange={(e) => setNewBooking({ ...newBooking, giftCardCode: e.target.value })}
                          className="flex-1 border-gray-300"
                        />
                        <Button
                          onClick={() => {
                            toast({
                              title: "Gift Card Applied",
                              description: `Gift card "${newBooking.giftCardCode}" has been applied.`,
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
            
                <div>
                  <Label htmlFor="payment" className={embInk.labelSmBlock}>Payment Method</Label>
                  <Select
                    value={newBooking.paymentMethod}
                    onValueChange={(value) =>
                      setNewBooking({
                        ...newBooking,
                        paymentMethod: value,
                        ...(value === "Cash" ? { creditCardMode: "new", savedStripePaymentMethodId: "" } : {}),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Cash">Cash/Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newBooking.paymentMethod === "Credit Card" && (
                  <div className="mt-4 space-y-3">
                    {newBooking.customerType === "existing" && newBooking.customerId.trim() ? (
                      <>
                        <Label className="text-sm font-medium text-black">Card</Label>
                        <RadioGroup
                          value={newBooking.creditCardMode}
                          onValueChange={(v) =>
                            setNewBooking({
                              ...newBooking,
                              creditCardMode: v as "new" | "saved",
                              savedStripePaymentMethodId: v === "saved" ? newBooking.savedStripePaymentMethodId : "",
                            })
                          }
                          className="grid gap-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="new" id="admin-cc-new" />
                            <Label htmlFor="admin-cc-new" className="font-normal cursor-pointer">
                              New card (send payment link / collect later)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="saved"
                              id="admin-cc-saved"
                              disabled={
                                businessPaymentProvider === "authorize_net" ||
                                customerSavedCards.filter((c) => c.stripePaymentMethodId).length === 0
                              }
                            />
                            <Label htmlFor="admin-cc-saved" className="font-normal cursor-pointer">
                              Existing saved card (Stripe)
                            </Label>
                          </div>
                        </RadioGroup>
                        {newBooking.creditCardMode === "saved" &&
                        customerSavedCards.filter((c) => c.stripePaymentMethodId).length > 0 ? (
                          <Select
                            value={newBooking.savedStripePaymentMethodId}
                            onValueChange={(v) =>
                              setNewBooking({ ...newBooking, savedStripePaymentMethodId: v })
                            }
                          >
                            <SelectTrigger className="border-gray-300">
                              <SelectValue placeholder="Choose saved card" />
                            </SelectTrigger>
                            <SelectContent>
                              {customerSavedCards
                                .filter((c) => c.stripePaymentMethodId)
                                .map((c) => (
                                  <SelectItem key={c.stripePaymentMethodId!} value={c.stripePaymentMethodId!}>
                                    {c.brand} •••• {c.last4}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                        {customerSavedCards.some((c) => !c.stripePaymentMethodId) &&
                        businessPaymentProvider !== "authorize_net" ? (
                          <p className="text-xs text-gray-600">
                            Some masked cards on file cannot be charged from admin until the customer adds a card via
                            your Stripe flow or completes a card checkout (so we store the payment method id).
                          </p>
                        ) : null}
                        {businessPaymentProvider === "authorize_net" ? (
                          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
                            Authorize.Net: charging a card on file from admin is not available here yet. Use Cash/Check,
                            or save the booking and send a payment link from Booking Charges.
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-black">
                        {newBooking.creditCardMode === "saved" ? "New card (optional)" : "Add new card"}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">
                        Card entry here is for reference only. To charge a new card, use a payment link or customer
                        checkout.
                      </p>
                      <div className="relative flex items-center">
                        <CreditCard className="absolute left-3 text-gray-400 w-5 h-5 z-10" />
                        <Input
                          id="card-number"
                          placeholder="Card number (reference)"
                          value={newBooking.cardNumber}
                          onChange={(e) => setNewBooking({ ...newBooking, cardNumber: e.target.value })}
                          className="pl-10 pr-32 border-gray-300"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="absolute right-0 top-1/2 -translate-y-1/2 h-full bg-green-900 text-white hover:bg-green-800 rounded-l-none"
                          onClick={() => {
                            toast({
                              title: "Autofill",
                              description: "Autofill functionality not implemented.",
                            });
                          }}
                        >
                          Autofill <span className="underline ml-1">link</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
          </CardContent>
        </Card>
        </div>
      </div>
      </>
  ) : null;

  return (
    <div className={cn("space-y-6", embedded && "pb-1")}>
      {editingBookingId && !embedded && !bookingLoadError && !loadingBooking ? (
        <p className="text-sm text-muted-foreground">
          {finalizeFromDraftQuote
            ? "Create a confirmed booking from this draft or quote, or save it again as draft or quote."
            : "Editing this booking."}
        </p>
      ) : null}
      {bookingLoadError ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">{bookingLoadError}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                if (onClose) onClose();
                else router.push("/admin/bookings");
              }}
            >
              Back to bookings
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {editingBookingId && loadingBooking ? (
        <div className="flex min-h-[8rem] items-center justify-center text-muted-foreground">Loading booking…</div>
      ) : null}
      {bookingEditorGrid}
    </div>
  );
}
