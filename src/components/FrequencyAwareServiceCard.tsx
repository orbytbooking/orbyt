"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Info } from "lucide-react";
import QuantitySelector from "@/components/QuantitySelector";
import styles from "./ServiceCard.module.css";
import {
  frequencyDepOptionNamesForCategory,
  getFrequencyDependencies,
  type FrequencyDependencies,
} from "@/lib/frequencyFilter";
import {
  filterFrequencyOptionsForServiceCategory,
  findPricingVariableDefinition,
  getExcludeParameterCustomerDisplayName,
  getExtraCustomerDisplayName,
  getPricingVariableCategoryCustomerLabel,
  getPricingVariableCategoryExplanationTooltip,
  isExcludeParameterDisplayVisibleOnBookingSurface,
  isIndustryExtraDisplayVisibleOnBookingSurface,
  isPricingVariableDisplayVisibleOnBookingSurface,
  pickEffectiveFrequencyForCard,
  showServiceDurationOnCustomerBooking,
  type PricingVariableDefinitionForBooking,
} from "@/lib/form1CustomerBooking";
import type { CustomerFrequencyMeta } from "@/lib/customerFrequencyPricing";
import {
  popupDisplayAppliesToSurface,
  type BookingPopupSurface,
} from "@/lib/frequencyPopupDisplay";
import {
  buildCategoryValuesMapForExtraDeps,
  industryExtraPassesBookingDependencyRules,
} from "@/lib/industryExtraDependencies";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function lookupFrequencyMeta(
  map: Record<string, CustomerFrequencyMeta> | undefined,
  label: string,
): CustomerFrequencyMeta | undefined {
  if (!map || !label?.trim()) return undefined;
  const t = label.trim();
  if (map[t]) return map[t];
  const lower = t.toLowerCase();
  for (const k of Object.keys(map)) {
    if (k.trim().toLowerCase() === lower) return map[k];
  }
  return undefined;
}

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    /** Customer-facing label when Form 1 uses "Different on customer end". */
    customerDisplayName?: string;
    description: string;
    price: number;
    duration: string;
    image: string;
    features?: string[];
  };
  isSelected: boolean;
  onSelect: (serviceName: string, customization?: ServiceCustomization) => void;
  flippedCardId: string | null;
  onFlip: (cardId: string) => void;
  customization: ServiceCustomization;
  onCustomizationChange: (serviceId: string, customization: ServiceCustomization) => void;
  industryId?: string;
  /** Business that owns Form 1; required for correct industry_frequency dependency rows. */
  businessId?: string;
  /** When set, limits dependency fetch to Form 1 vs Form 2 frequency rows. */
  bookingFormScope?: "form1" | "form2";
  serviceCategory?: any; // Add service category prop
  availableExtras?: any[]; // Add available extras prop
  availableVariables?: { [key: string]: any[] }; // Add available variables prop
  frequencyOptions?: string[]; // Add frequency options prop
  frequencyMetaByName?: Record<string, CustomerFrequencyMeta>;
  bookingPopupSurface?: BookingPopupSurface;
  /** From Manage Variables — labels, visibility, tooltips, selection popups. */
  pricingVariableDefinitions?: PricingVariableDefinitionForBooking[];
  /**
   * `inline` — 3D flip inside the grid cell.
   * `expandedFlip` — centered overlay: card scales up while flipping (book-now).
   */
  customizeLayout?: "inline" | "expandedFlip";
}

export interface ExcludeParamOption {
  id: string;
  name: string;
  icon?: string | null;
  qty_based?: boolean;
  maximum_quantity?: number | null;
  display?: string;
  different_on_customer_end?: boolean;
  customer_end_name?: string | null;
  show_explanation_icon_on_form?: boolean;
  explanation_tooltip_text?: string | null;
  enable_popup_on_selection?: boolean;
  popup_content?: string | null;
  popup_display?: string | null;
}

export interface ExtraOption {
  id: string;
  name: string;
  icon?: string | null;
  display?: string;
  qty_based?: boolean;
  maximum_quantity?: number | null;
  different_on_customer_end?: boolean;
  customer_end_name?: string | null;
  show_explanation_icon_on_form?: boolean;
  explanation_tooltip_text?: string | null;
  enable_popup_on_selection?: boolean;
  popup_content?: string | null;
  popup_display?: string | null;
}

export interface ServiceCustomization {
  frequency: string;
  squareMeters: string;
  bedroom: string;
  bathroom: string;
  extras: { name: string; quantity: number }[];
  isPartialCleaning: boolean;
  excludedAreas: string[];
  excludeQuantities?: Record<string, number>; // name -> quantity for partial cleaning exclude params
  variableCategories?: { [categoryName: string]: string }; // Dynamic variable category selections
  /** Hourly service + "Based on custom time" — book-now hours/minutes (string indices like admin). */
  bookingHours?: string;
  bookingMinutes?: string;
}

// Customer UI should reflect admin-configured options only (no hardcoded defaults)
const DEFAULT_EXTRA_OPTIONS: ExtraOption[] = [];
const DEFAULT_BATHROOM_OPTIONS: string[] = [];
const DEFAULT_SQFT_OPTIONS: string[] = [];
const DEFAULT_BEDROOM_OPTIONS: string[] = [];
// Exclude parameters should come only from admin-configured data (no local defaults)
const DEFAULT_EXCLUDE_OPTIONS: ExcludeParamOption[] = [];

export default function FrequencyAwareServiceCard({ 
  service, 
  isSelected, 
  onSelect, 
  flippedCardId, 
  onFlip, 
  customization, 
  onCustomizationChange,
  industryId,
  businessId,
  bookingFormScope,
  serviceCategory,
  availableExtras = [],
  availableVariables = {},
  frequencyOptions = [],
  frequencyMetaByName,
  bookingPopupSurface,
  pricingVariableDefinitions = [],
  customizeLayout = "inline",
}: ServiceCardProps) {
  const serviceDisplayName = service.customerDisplayName?.trim() || service.name;

  const variableCategoryLabel = useCallback(
    (categoryKey: string) =>
      getPricingVariableCategoryCustomerLabel(categoryKey, pricingVariableDefinitions),
    [pricingVariableDefinitions],
  );

  const cardFrequencyOptions = useMemo(
    () => filterFrequencyOptionsForServiceCategory(frequencyOptions, serviceCategory),
    [frequencyOptions, serviceCategory],
  );

  const effectiveFrequency = useMemo(
    () => pickEffectiveFrequencyForCard(customization.frequency, cardFrequencyOptions),
    [customization.frequency, cardFrequencyOptions],
  );

  const showDurationOnCard = showServiceDurationOnCustomerBooking(
    serviceCategory?.display_service_length_customer,
  );

  const showHourlyCustomDuration =
    Boolean(serviceCategory?.hourly_service?.enabled) &&
    (serviceCategory?.hourly_service?.priceCalculationType ?? "customTime") === "customTime";

  const isFlipped = flippedCardId === String(service.id) || flippedCardId === service.id;
  const isExpandedFlip = customizeLayout === "expandedFlip";
  const [expandedReveal, setExpandedReveal] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(isSelected);
  // Ref holds the latest customization so Confirm always passes current form values (avoids stale prop after async parent update)
  const latestCustomizationRef = useRef<ServiceCustomization>(customization);

  const [frequencyDependencies, setFrequencyDependencies] =
    useState<FrequencyDependencies | null>(null);
  const [htmlDetailPopup, setHtmlDetailPopup] = useState<{ title: string; html: string } | null>(null);
  const [rawExcludeParameters, setRawExcludeParameters] = useState<ExcludeParamOption[]>([]);

  const [filteredOptions, setFilteredOptions] = useState<{
    bathroomVariables: typeof DEFAULT_BATHROOM_OPTIONS;
    sqftVariables: typeof DEFAULT_SQFT_OPTIONS;
    bedroomVariables: typeof DEFAULT_BEDROOM_OPTIONS;
    excludeParameters: ExcludeParamOption[];
    extras: ExtraOption[];
  }>({
    bathroomVariables: DEFAULT_BATHROOM_OPTIONS,
    sqftVariables: DEFAULT_SQFT_OPTIONS,
    bedroomVariables: DEFAULT_BEDROOM_OPTIONS,
    excludeParameters: DEFAULT_EXCLUDE_OPTIONS,
    extras: DEFAULT_EXTRA_OPTIONS,
  });

  // Variable categories from pricing parameters, minus options hidden by Manage Variables `display` for this surface
  const variableCategoryEntries = useMemo(() => {
    let entries = Object.entries(availableVariables || {}).filter(
      ([category, vars]) => Boolean(category?.trim?.()) && Array.isArray(vars) && vars.length > 0,
    );
    const surface = bookingPopupSurface;
    if (surface) {
      entries = entries
        .map(([category, vars]) => {
          const filtered = vars.filter((v: { name?: string }) => {
            const n = String(v?.name ?? "").trim();
            if (!n) return false;
            const def = findPricingVariableDefinition(category, n, pricingVariableDefinitions);
            if (!def) return true;
            return isPricingVariableDisplayVisibleOnBookingSurface(def.display, surface);
          });
          return [category, filtered] as const;
        })
        .filter(([, vars]) => vars.length > 0);
    }

    if (serviceCategory?.service_category_frequency && frequencyDependencies) {
      entries = entries
        .map(([category, vars]) => {
          const allowed = frequencyDepOptionNamesForCategory(category, frequencyDependencies);
          if (allowed === null) return [category, vars] as const;
          if (allowed.length === 0) return [category, []] as const;
          const filtered = vars.filter((v: { name?: string }) =>
            allowed.includes(String(v?.name ?? "")),
          );
          return [category, filtered] as const;
        })
        .filter(([, vars]) => vars.length > 0);
    }

    return entries;
  }, [
    availableVariables,
    bookingPopupSurface,
    pricingVariableDefinitions,
    serviceCategory?.service_category_frequency,
    frequencyDependencies,
  ]);

  // Helper to get current value for a variable category (default to "None" when skipped/empty)
  const getVariableCategoryValue = (categoryName: string): string => {
    // Check dynamic variableCategories first
    const fromCategories = customization.variableCategories?.[categoryName];
    if (fromCategories !== undefined && fromCategories !== null && String(fromCategories).trim() !== '') {
      return fromCategories;
    }
    // Fallback to legacy fields for backward compatibility
    const lowerCategory = categoryName.toLowerCase();
    if (lowerCategory.includes('sqft') || lowerCategory.includes('area') || lowerCategory.includes('square')) {
      return customization.squareMeters?.trim() || 'None';
    }
    if (lowerCategory.includes('bedroom')) {
      return customization.bedroom?.trim() || 'None';
    }
    if (lowerCategory.includes('bathroom')) {
      return customization.bathroom?.trim() || 'None';
    }
    return 'None';
  };

  // Helper to update variable category value
  const updateVariableCategoryValue = (categoryName: string, value: string) => {
    const updatedVariableCategories = {
      ...(customization.variableCategories || {}),
      [categoryName]: value,
    };
    
    // Also update legacy fields for backward compatibility
    const lowerCategory = categoryName.toLowerCase();
    const updatedCustomization: ServiceCustomization = {
      ...customization,
      variableCategories: updatedVariableCategories,
    };
    
    if (lowerCategory.includes('sqft') || lowerCategory.includes('area') || lowerCategory.includes('square')) {
      updatedCustomization.squareMeters = value;
    }
    if (lowerCategory.includes('bedroom')) {
      updatedCustomization.bedroom = value;
    }
    if (lowerCategory.includes('bathroom')) {
      updatedCustomization.bathroom = value;
    }

    latestCustomizationRef.current = updatedCustomization;
    onCustomizationChange(service.id, updatedCustomization);
  };

  // Sync confirmed state with isSelected prop
  useEffect(() => {
    setIsConfirmed(isSelected);
  }, [isSelected]);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    if (!isExpandedFlip || !isFlipped) {
      setExpandedReveal(false);
      return;
    }
    setExpandedReveal(false);
    const t = window.setTimeout(() => setExpandedReveal(true), 40);
    return () => window.clearTimeout(t);
  }, [isExpandedFlip, isFlipped, service.id]);

  useEffect(() => {
    if (!isExpandedFlip || !isFlipped) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isExpandedFlip, isFlipped]);

  useEffect(() => {
    if (!isExpandedFlip || !isFlipped) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFlip("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpandedFlip, isFlipped, onFlip]);

  // Sync ref from prop only when card is on front — while back is visible, keep ref as user's choices so a re-render with stale/default prop doesn't overwrite them
  useEffect(() => {
    if (!isFlipped) {
      latestCustomizationRef.current = customization;
    }
  }, [customization, isFlipped]);

  // Match admin AddBookingForm: load frequency dependencies when industry + this card's frequency change
  useEffect(() => {
    if (!industryId || !customization.frequency?.trim()) {
      setFrequencyDependencies(null);
      return;
    }
    let cancelled = false;
    getFrequencyDependencies(industryId, customization.frequency, {
      businessId: businessId?.trim() || undefined,
    })
      .then((deps) => {
        if (!cancelled) setFrequencyDependencies(deps);
      })
      .catch(() => {
        if (!cancelled) setFrequencyDependencies(null);
      });
    return () => {
      cancelled = true;
    };
  }, [industryId, businessId, customization.frequency, bookingFormScope]);

  // Raw exclude parameters from API (industry-wide); filtered in the next effect like admin
  useEffect(() => {
    const fetchExcludeParameters = async () => {
      if (!industryId) {
        setRawExcludeParameters([]);
        return;
      }

      try {
        const response = await fetch(`/api/exclude-parameters?industryId=${encodeURIComponent(industryId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.excludeParameters && Array.isArray(data.excludeParameters)) {
            const params: ExcludeParamOption[] = data.excludeParameters.map((param: any) => ({
              id: param.id,
              name: param.name,
              icon: param.icon != null && String(param.icon).trim() ? String(param.icon).trim() : null,
              qty_based: param.qty_based,
              maximum_quantity: param.maximum_quantity ?? null,
              display: param.display,
              different_on_customer_end: Boolean(param.different_on_customer_end),
              customer_end_name: param.customer_end_name ?? null,
              show_explanation_icon_on_form: Boolean(param.show_explanation_icon_on_form),
              explanation_tooltip_text: param.explanation_tooltip_text ?? null,
              enable_popup_on_selection: Boolean(param.enable_popup_on_selection),
              popup_content: param.popup_content ?? null,
              popup_display: param.popup_display ?? null,
            }));
            setRawExcludeParameters(params);
          } else {
            setRawExcludeParameters([]);
          }
        } else {
          setRawExcludeParameters([]);
        }
      } catch (error) {
        console.error("Error fetching exclude parameters:", error);
        setRawExcludeParameters([]);
      }
    };

    fetchExcludeParameters();
  }, [industryId]);

  // Apply service category + frequency dependency filtering (parity with admin AddBookingForm)
  useEffect(() => {
    const toExtraOption = (e: any): ExtraOption => ({
      id: e.id,
      name: e.name,
      icon: e.icon != null && String(e.icon).trim() ? String(e.icon).trim() : null,
      display: e.display,
      qty_based: e.qty_based,
      maximum_quantity: e.maximum_quantity ?? null,
      different_on_customer_end: Boolean(e.different_on_customer_end),
      customer_end_name: e.customer_end_name ?? null,
      show_explanation_icon_on_form: Boolean(e.show_explanation_icon_on_form),
      explanation_tooltip_text: e.explanation_tooltip_text ?? null,
      enable_popup_on_selection: Boolean(e.enable_popup_on_selection),
      popup_content: e.popup_content ?? null,
      popup_display: e.popup_display ?? null,
    });

    const filterExtrasForSurface = (list: ExtraOption[]): ExtraOption[] => {
      const surface = bookingPopupSurface;
      if (!surface) return list;
      return list.filter((ex) => isIndustryExtraDisplayVisibleOnBookingSurface(ex.display, surface));
    };

    const filterExcludeForDisplay = (
      raw: ExcludeParamOption[],
      category: typeof serviceCategory,
      deps: FrequencyDependencies | null,
    ): ExcludeParamOption[] => {
      let list: ExcludeParamOption[];
      if (!category) {
        list = raw;
      } else if (category.service_category_frequency) {
        if (deps?.excludeParameters && deps.excludeParameters.length > 0) {
          list = raw.filter((p) => deps.excludeParameters.includes(p.name));
        } else {
          list = [];
        }
      } else {
        const selected = category.selected_exclude_parameters;
        if (selected && selected.length > 0) {
          list = raw.filter((p) => selected.includes(p.name));
        } else {
          list = [];
        }
      }
      const surface = bookingPopupSurface;
      if (!surface) return list;
      return list.filter((p) => isExcludeParameterDisplayVisibleOnBookingSurface(p.display, surface));
    };

    if (!serviceCategory || (!availableExtras?.length && !availableVariables)) {
      setFilteredOptions({
        bathroomVariables: DEFAULT_BATHROOM_OPTIONS,
        sqftVariables: DEFAULT_SQFT_OPTIONS,
        bedroomVariables: DEFAULT_BEDROOM_OPTIONS,
        excludeParameters: serviceCategory
          ? filterExcludeForDisplay(rawExcludeParameters, serviceCategory, frequencyDependencies)
          : rawExcludeParameters,
        extras:
          availableExtras?.length > 0
            ? filterExtrasForSurface(availableExtras.map(toExtraOption))
            : [],
      });
      return;
    }

    let filteredExtras: ExtraOption[] = [];

    const categoryKeys = variableCategoryEntries.map(([k]) => k);
    const categoryValuesMap = buildCategoryValuesMapForExtraDeps(customization, categoryKeys);
    const useFreqDeps = Boolean(serviceCategory.service_category_frequency);
    const depsLoaded = frequencyDependencies != null;
    const formAllowIds = depsLoaded
      ? Array.isArray(frequencyDependencies.extras)
        ? frequencyDependencies.extras.map(String)
        : []
      : [];

    if (availableExtras?.length) {
      let list = [...availableExtras];
      if (!useFreqDeps) {
        const categoryExtras = serviceCategory.extras || [];
        if (categoryExtras.length > 0) {
          list = list.filter((extra) =>
            categoryExtras.some((cid) => String(cid) === String(extra.id)),
          );
        } else {
          list = [];
        }
      }
      filteredExtras = list
        .filter((e: any) =>
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
              selectedFrequency: effectiveFrequency,
              selectedServiceCategoryName: String(serviceCategory.name || ""),
              selectedServiceCategoryId: String(serviceCategory.id || ""),
              categoryValues: categoryValuesMap,
              serviceCategoryUsesFrequencyDeps: useFreqDeps,
              frequencyDepsLoaded: depsLoaded,
              frequencyFormAllowExtraIds: formAllowIds,
            },
          ),
        )
        .map(toExtraOption);
    }

    const excludeParameters = filterExcludeForDisplay(
      rawExcludeParameters,
      serviceCategory,
      frequencyDependencies,
    );

    filteredExtras = filterExtrasForSurface(filteredExtras);

    const newFilteredOptions = {
      bathroomVariables: DEFAULT_BATHROOM_OPTIONS,
      sqftVariables: DEFAULT_SQFT_OPTIONS,
      bedroomVariables: DEFAULT_BEDROOM_OPTIONS,
      excludeParameters,
      extras: filteredExtras,
    };

    setFilteredOptions((prev) => {
      const hasChanged =
        JSON.stringify(prev.bathroomVariables) !== JSON.stringify(newFilteredOptions.bathroomVariables) ||
        JSON.stringify(prev.sqftVariables) !== JSON.stringify(newFilteredOptions.sqftVariables) ||
        JSON.stringify(prev.bedroomVariables) !== JSON.stringify(newFilteredOptions.bedroomVariables) ||
        JSON.stringify(prev.excludeParameters) !== JSON.stringify(newFilteredOptions.excludeParameters) ||
        JSON.stringify(prev.extras) !== JSON.stringify(newFilteredOptions.extras);

      return hasChanged ? newFilteredOptions : prev;
    });
  }, [
    serviceCategory,
    availableExtras,
    availableVariables,
    rawExcludeParameters,
    frequencyDependencies,
    bookingPopupSurface,
    customization,
    effectiveFrequency,
    variableCategoryEntries,
  ]);

  const handleCardClick = () => {
    if (isFlipped) return;
    onFlip(service.id);
  };

  const handleBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFlip("");
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();

    const curRef = latestCustomizationRef.current;
    const hs = serviceCategory?.hourly_service;
    if (
      hs?.enabled &&
      (hs.priceCalculationType ?? "customTime") === "customTime"
    ) {
      const h = parseInt(String(curRef.bookingHours ?? "0"), 10) || 0;
      const m = parseInt(String(curRef.bookingMinutes ?? "0"), 10) || 0;
      if (h * 60 + m <= 0) {
        alert("Please select how long you would like to book (hours and minutes).");
        return;
      }
    }

    // Only require frequency when the admin has configured at least one frequency option
    const visibleFields: string[] = [];
    if (cardFrequencyOptions.length > 0 && !customization.frequency?.trim()) {
      visibleFields.push("frequency");
    }

    // Only require variable categories that have at least one option (don't block when dropdown is empty)
    variableCategoryEntries.forEach(([categoryName, vars]) => {
      const options = (vars || []).map((v: any) => v?.name).filter(Boolean);
      if (options.length === 0) return; // No options configured – skip requirement
      const currentValue = getVariableCategoryValue(categoryName);
      if (!currentValue) {
        visibleFields.push(variableCategoryLabel(categoryName).toLowerCase());
      }
    });

    if (visibleFields.length > 0) {
      alert(`Please select the following required options: ${visibleFields.join(", ")}`);
      return;
    }

    const raw = latestCustomizationRef.current;
    const freq = pickEffectiveFrequencyForCard(raw.frequency, cardFrequencyOptions);
    const toSend: ServiceCustomization = { ...raw, frequency: freq };

    onCustomizationChange(service.id, toSend);
    onSelect(service.name, toSend);

    // Mark as confirmed and flip back
    setIsConfirmed(true);
    onFlip("");
  };

  function renderCardFront(): React.ReactNode {
    return (
      <div className={styles.cardFront} onClick={handleCardClick}>
        <div className={styles.serviceImageWrapper}>
          <img
            src={service.image}
            alt={service.name}
            className={styles.serviceCardImage}
            loading="lazy"
          />
        </div>
        <div className={styles.serviceCardContent}>
          <div className={styles.serviceHeader}>
            <div className={styles.serviceName}>{serviceDisplayName}</div>
            {isConfirmed && (
              service.price > 0 ? (
                <div className={styles.servicePrice}>${service.price}+</div>
              ) : (
                <div className={styles.servicePrice}>Get Quote</div>
              )
            )}
          </div>
          <div className={styles.serviceDescription}>{service.description}</div>
          {showDurationOnCard && service.duration && service.duration !== "—" && (
            <div className="mt-2 text-sm text-slate-600">Service length: {service.duration}</div>
          )}
        </div>
        <div className={styles.clickPrompt}>Click to customize your service</div>
      </div>
    );
  }

  function renderCustomizePanel(): React.ReactNode {
    return (
      <div className={styles.backContent}>
            <h3 className={styles.backTitle}>Customize Your Service</h3>
            <p className={styles.backSubtitle}>{serviceDisplayName}</p>

            <div className={styles.customizationForm}>
              {/* Frequency — dropdown (matches variable categories on this card) */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Frequency</label>
                {cardFrequencyOptions.length > 0 ? (
                  <Select
                    value={effectiveFrequency || ""}
                    onValueChange={(value) => {
                      if (value === customization.frequency) return;
                      const updated = { ...customization, frequency: value };
                      latestCustomizationRef.current = updated;
                      onCustomizationChange(service.id, updated);
                      const meta = lookupFrequencyMeta(frequencyMetaByName, value);
                      const html = String(meta?.popup_content ?? "").trim();
                      if (
                        bookingPopupSurface &&
                        meta?.enable_popup &&
                        html &&
                        popupDisplayAppliesToSurface(meta.popup_display, bookingPopupSurface)
                      ) {
                        setHtmlDetailPopup({ title: value, html });
                      }
                    }}
                  >
                    <SelectTrigger className={styles.selectTrigger}>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {cardFrequencyOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-muted-foreground">
                    {frequencyOptions.length > 0
                      ? `No frequencies configured for "${serviceDisplayName}"`
                      : "Select a service to see available frequencies"}
                  </div>
                )}
              </div>

              {showHourlyCustomDuration && (
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Booking length</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose hours and minutes. Price is based on your hourly rate and this length.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={customization.bookingHours ?? "0"}
                      onValueChange={(value) => {
                        const updated = { ...customization, bookingHours: value };
                        latestCustomizationRef.current = updated;
                        onCustomizationChange(service.id, updated);
                      }}
                    >
                      <SelectTrigger className={cn(styles.selectTrigger, "w-[4.5rem]")}>
                        <SelectValue placeholder="Hours" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {String(i).padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">hr</span>
                    <Select
                      value={customization.bookingMinutes ?? "0"}
                      onValueChange={(value) => {
                        const updated = { ...customization, bookingMinutes: value };
                        latestCustomizationRef.current = updated;
                        onCustomizationChange(service.id, updated);
                      }}
                    >
                      <SelectTrigger className={cn(styles.selectTrigger, "w-[4.5rem]")}>
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 60 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {String(i).padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                </div>
              )}

              {/* Variable categories — grid matches admin AddBookingForm */}
              {variableCategoryEntries.length > 0 && (
                <div
                  className={cn(
                    "grid gap-4",
                    variableCategoryEntries.length === 1 && "md:grid-cols-1",
                    variableCategoryEntries.length === 2 && "md:grid-cols-2",
                    variableCategoryEntries.length > 2 && "md:grid-cols-3",
                  )}
                >
                  {variableCategoryEntries.map(([categoryName, vars]) => {
                    const options = vars.map((v: any) => v?.name).filter(Boolean);
                    const currentValue = getVariableCategoryValue(categoryName);
                    const categoryLabel = variableCategoryLabel(categoryName);
                    const explanationTooltip = getPricingVariableCategoryExplanationTooltip(
                      categoryName,
                      pricingVariableDefinitions,
                    );

                    return (
                      <div key={categoryName} className={styles.formField}>
                        <div className="flex items-center gap-1.5">
                          <label className={styles.fieldLabel}>{categoryLabel}</label>
                          {explanationTooltip ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex shrink-0 text-orange-500 hover:text-orange-600 focus:outline-none rounded-sm"
                                  aria-label={`About ${categoryLabel}`}
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-sm">
                                {explanationTooltip}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                        <Select
                          value={currentValue || ""}
                          onValueChange={(value) => {
                            updateVariableCategoryValue(categoryName, value);
                            if (value === "None" || !bookingPopupSurface) return;
                            const def = findPricingVariableDefinition(
                              categoryName,
                              value,
                              pricingVariableDefinitions,
                            );
                            const html = String(def?.popup_content ?? "").trim();
                            if (
                              def?.enable_popup_on_selection &&
                              html &&
                              popupDisplayAppliesToSurface(def.popup_display, bookingPopupSurface)
                            ) {
                              setHtmlDetailPopup({ title: `${categoryLabel}: ${value}`, html });
                            }
                          }}
                        >
                          <SelectTrigger className={styles.selectTrigger}>
                            <SelectValue placeholder={`Select ${categoryLabel.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None">None</SelectItem>
                            {options.map((option: string) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Partial Cleaning Checkbox */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Partial Cleaning</label>
                <div className="mt-2 flex items-center space-x-2">
                  <Checkbox
                    id={`partial-${service.id}`}
                    checked={customization.isPartialCleaning}
                    onCheckedChange={(checked) => {
                      const enabled = checked as boolean;
                      if (enabled !== customization.isPartialCleaning) {
                        const updated = {
                          ...customization,
                          isPartialCleaning: enabled,
                          excludedAreas: enabled ? customization.excludedAreas : [],
                        };
                        latestCustomizationRef.current = updated;
                        onCustomizationChange(service.id, updated);
                      }
                    }}
                  />
                  <label
                    htmlFor={`partial-${service.id}`}
                    className="text-sm font-medium leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    This Is Partial Cleaning Only
                  </label>
                </div>
              </div>

              {/* Excluded Areas - use configured exclude parameters with +/- like Extras; respect qty_based and maximum_quantity */}
              {customization.isPartialCleaning && filteredOptions.excludeParameters.length > 0 && (
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Select areas to exclude from cleaning:</label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredOptions.excludeParameters.map((param) => {
                      const areaName = param.name;
                      const quantity = customization.excludeQuantities?.[areaName] ?? (customization.excludedAreas?.includes(areaName) ? 1 : 0);
                      const maxQty = param.qty_based && param.maximum_quantity != null && param.maximum_quantity > 0
                        ? param.maximum_quantity
                        : 1;
                      const displayLabel = getExcludeParameterCustomerDisplayName(param);
                      const tooltipText =
                        param.show_explanation_icon_on_form && param.explanation_tooltip_text?.trim()
                          ? param.explanation_tooltip_text.trim()
                          : undefined;

                      return (
                        <QuantitySelector
                          key={param.id}
                          extra={areaName}
                          displayLabel={displayLabel}
                          icon={param.icon}
                          iconKind="exclude"
                          tooltipText={tooltipText}
                          quantity={quantity}
                          min={0}
                          max={maxQty}
                          onQuantityChange={(name, newQuantity) => {
                            const prevQty =
                              customization.excludeQuantities?.[name] ??
                              (customization.excludedAreas?.includes(name) ? 1 : 0);
                            const currentExcluded = customization.excludedAreas || [];
                            const currentQuantities = customization.excludeQuantities || {};
                            const newExcluded = newQuantity > 0
                              ? currentExcluded.includes(name) ? currentExcluded : [...currentExcluded, name]
                              : currentExcluded.filter((a) => a !== name);
                            const newQuantities = { ...currentQuantities };
                            if (newQuantity > 0) {
                              newQuantities[name] = newQuantity;
                            } else {
                              delete newQuantities[name];
                            }
                            const updated = {
                              ...customization,
                              excludedAreas: newExcluded,
                              excludeQuantities: newQuantities,
                            };
                            latestCustomizationRef.current = updated;
                            onCustomizationChange(service.id, updated);
                            if (prevQty === 0 && newQuantity > 0 && bookingPopupSurface) {
                              const html = String(param.popup_content ?? "").trim();
                              if (
                                param.enable_popup_on_selection &&
                                html &&
                                popupDisplayAppliesToSurface(param.popup_display, bookingPopupSurface)
                              ) {
                                setHtmlDetailPopup({
                                  title: `${displayLabel}`,
                                  html,
                                });
                              }
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Row 3: Extras (Full Width, Two Columns) - respect qty_based and maximum_quantity like exclude params */}
              {filteredOptions.extras.length > 0 && (
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Extras (Optional)</label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredOptions.extras.map((extra) => {
                      const currentExtra = customization.extras?.find(e => e.name === extra.name);
                      const quantity = currentExtra?.quantity || 0;
                      const maxQty = extra.qty_based && extra.maximum_quantity != null && extra.maximum_quantity > 0
                        ? extra.maximum_quantity
                        : 1;
                      const displayLabel = getExtraCustomerDisplayName(extra);
                      const tooltipText =
                        extra.show_explanation_icon_on_form && extra.explanation_tooltip_text?.trim()
                          ? extra.explanation_tooltip_text.trim()
                          : undefined;

                      return (
                        <QuantitySelector
                          key={extra.id}
                          extra={extra.name}
                          displayLabel={displayLabel}
                          icon={extra.icon}
                          iconKind="extra"
                          tooltipText={tooltipText}
                          quantity={quantity}
                          onQuantityChange={(extraName, newQuantity) => {
                            const prevQty =
                              customization.extras?.find((e) => e.name === extraName)?.quantity ?? 0;
                            const currentExtras = customization.extras || [];
                            let newExtras;

                            if (newQuantity === 0) {
                              newExtras = currentExtras.filter(e => e.name !== extraName);
                            } else {
                              const existingIndex = currentExtras.findIndex(e => e.name === extraName);
                              if (existingIndex >= 0) {
                                newExtras = [...currentExtras];
                                newExtras[existingIndex] = { name: extraName, quantity: newQuantity };
                              } else {
                                newExtras = [...currentExtras, { name: extraName, quantity: newQuantity }];
                              }
                            }

                            const updated = { ...customization, extras: newExtras };
                            latestCustomizationRef.current = updated;
                            onCustomizationChange(service.id, updated);
                            if (prevQty === 0 && newQuantity > 0 && bookingPopupSurface) {
                              const html = String(extra.popup_content ?? "").trim();
                              if (
                                extra.enable_popup_on_selection &&
                                html &&
                                popupDisplayAppliesToSurface(extra.popup_display, bookingPopupSurface)
                              ) {
                                setHtmlDetailPopup({
                                  title: displayLabel,
                                  html,
                                });
                              }
                            }
                          }}
                          min={0}
                          max={maxQty}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.buttonGroup}>
              <Button
                variant="outline"
                onClick={handleBack}
                className={styles.backButton}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                className={styles.confirmButton}
              >
                Confirm
              </Button>
            </div>
          </div>
    );
  }

  const expandedFlipPortal =
    portalMounted &&
    isExpandedFlip &&
    isFlipped &&
    createPortal(
      <div
        className={styles.expandedFlipBackdrop}
        role="presentation"
        onClick={(e) => e.target === e.currentTarget && onFlip("")}
      >
        <div
          className={styles.expandedFlipStage}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`customize-${service.id}-title`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.expandedFlipCardContainer}>
            <span id={`customize-${service.id}-title`} className="sr-only">
              Customize {serviceDisplayName}
            </span>
            <div
              className={cn(
                styles.card,
                styles.expandedFlipCard,
                expandedReveal && styles.expandedFlipCardRevealed,
                styles.selected,
              )}
            >
              {renderCardFront()}
              <div className={cn(styles.cardBack, styles.expandedFlipCardBack)}>{renderCustomizePanel()}</div>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <TooltipProvider delayDuration={200}>
    <>
    {isExpandedFlip && isFlipped ? (
      <div className={styles.expandedFlipPlaceholder} aria-hidden />
    ) : (
      <div className={styles.cardContainer}>
        <div
          className={`${styles.card} ${!isExpandedFlip && isFlipped ? styles.flipped : ""} ${
            isSelected ? styles.selected : ""
          }`}
        >
          {renderCardFront()}
          {!isExpandedFlip && <div className={styles.cardBack}>{renderCustomizePanel()}</div>}
        </div>
      </div>
    )}

    {expandedFlipPortal}

    <Dialog open={!!htmlDetailPopup} onOpenChange={(open) => { if (!open) setHtmlDetailPopup(null); }}>
      <DialogContent className="z-[100] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{htmlDetailPopup?.title}</DialogTitle>
          <DialogDescription className="sr-only">Details</DialogDescription>
        </DialogHeader>
        {htmlDetailPopup?.html ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-sm [&_a]:text-primary [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: htmlDetailPopup.html }}
          />
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={() => setHtmlDetailPopup(null)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
    </TooltipProvider>
  );
}
