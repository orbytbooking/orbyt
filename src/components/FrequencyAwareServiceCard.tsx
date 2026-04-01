"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import QuantitySelector from "@/components/QuantitySelector";
import styles from "./ServiceCard.module.css";
import {
  getFrequencyDependencies,
  type FrequencyDependencies,
} from "@/lib/frequencyFilter";
import {
  filterFrequencyOptionsForServiceCategory,
  pickEffectiveFrequencyForCard,
  showServiceDurationOnCustomerBooking,
} from "@/lib/form1CustomerBooking";

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
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
  serviceCategory?: any; // Add service category prop
  availableExtras?: any[]; // Add available extras prop
  availableVariables?: { [key: string]: any[] }; // Add available variables prop
  frequencyOptions?: string[]; // Add frequency options prop
}

export interface ExcludeParamOption {
  id: string;
  name: string;
  qty_based?: boolean;
  maximum_quantity?: number | null;
}

export interface ExtraOption {
  id: string;
  name: string;
  qty_based?: boolean;
  maximum_quantity?: number | null;
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
  serviceCategory,
  availableExtras = [],
  availableVariables = {},
  frequencyOptions = []
}: ServiceCardProps) {
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

  const isFlipped = flippedCardId === String(service.id) || flippedCardId === service.id;
  const [isConfirmed, setIsConfirmed] = useState(isSelected);
  // Ref holds the latest customization so Confirm always passes current form values (avoids stale prop after async parent update)
  const latestCustomizationRef = useRef<ServiceCustomization>(customization);

  const [frequencyDependencies, setFrequencyDependencies] =
    useState<FrequencyDependencies | null>(null);
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

  // Get all variable categories from admin-configured pricing parameters
  const variableCategoryEntries = Object.entries(availableVariables || {}).filter(
    ([category, vars]) => Boolean(category?.trim?.()) && Array.isArray(vars) && vars.length > 0,
  );

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
  }, [industryId, businessId, customization.frequency]);

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
              qty_based: param.qty_based,
              maximum_quantity: param.maximum_quantity ?? null,
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
      qty_based: e.qty_based,
      maximum_quantity: e.maximum_quantity ?? null,
    });

    const filterExcludeForDisplay = (
      raw: ExcludeParamOption[],
      category: typeof serviceCategory,
      deps: FrequencyDependencies | null,
    ): ExcludeParamOption[] => {
      if (!category) return raw;
      if (category.service_category_frequency) {
        if (deps?.excludeParameters && deps.excludeParameters.length > 0) {
          return raw.filter((p) => deps.excludeParameters.includes(p.name));
        }
        return [];
      }
      const selected = category.selected_exclude_parameters;
      if (selected && selected.length > 0) {
        return raw.filter((p) => selected.includes(p.name));
      }
      return [];
    };

    if (!serviceCategory || (!availableExtras?.length && !availableVariables)) {
      setFilteredOptions({
        bathroomVariables: DEFAULT_BATHROOM_OPTIONS,
        sqftVariables: DEFAULT_SQFT_OPTIONS,
        bedroomVariables: DEFAULT_BEDROOM_OPTIONS,
        excludeParameters: serviceCategory
          ? filterExcludeForDisplay(rawExcludeParameters, serviceCategory, frequencyDependencies)
          : rawExcludeParameters,
        extras: availableExtras?.length > 0 ? availableExtras.map(toExtraOption) : [],
      });
      return;
    }

    let filteredExtras: ExtraOption[] = [];

    if (serviceCategory.service_category_frequency) {
      if (frequencyDependencies?.extras && frequencyDependencies.extras.length > 0 && availableExtras?.length) {
        filteredExtras = availableExtras
          .filter((e) => frequencyDependencies.extras.includes(String(e.id)))
          .map(toExtraOption);
      }
    } else {
      const categoryExtras = serviceCategory.extras || [];
      if (categoryExtras.length > 0 && availableExtras?.length) {
        filteredExtras = availableExtras
          .filter((extra) => categoryExtras.includes(extra.id))
          .map(toExtraOption);
      }
    }

    const excludeParameters = filterExcludeForDisplay(
      rawExcludeParameters,
      serviceCategory,
      frequencyDependencies,
    );

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
        visibleFields.push(categoryName.toLowerCase());
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

  return (
    <div className={styles.cardContainer}>
      <div className={`${styles.card} ${isFlipped ? styles.flipped : ""} ${isSelected ? styles.selected : ""}`}>
        {/* Front Side */}
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
              <div className={styles.serviceName}>{service.name}</div>
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
          <div className={styles.clickPrompt}>
            Click to customize your service
          </div>
        </div>

        {/* Back Side */}
        <div className={styles.cardBack}>
          <div className={styles.backContent}>
            <h3 className={styles.backTitle}>Customize Your Service</h3>
            <p className={styles.backSubtitle}>{service.name}</p>

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
                      ? `No frequencies configured for "${service.name}"`
                      : "Select a service to see available frequencies"}
                  </div>
                )}
              </div>

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
                    
                    return (
                      <div key={categoryName} className={styles.formField}>
                        <label className={styles.fieldLabel}>{categoryName}</label>
                        <Select
                          value={currentValue || ""}
                          onValueChange={(value) => {
                            updateVariableCategoryValue(categoryName, value);
                          }}
                        >
                          <SelectTrigger className={styles.selectTrigger}>
                            <SelectValue placeholder={`Select ${categoryName.toLowerCase()}`} />
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

                      return (
                        <QuantitySelector
                          key={param.id}
                          extra={areaName}
                          quantity={quantity}
                          min={0}
                          max={maxQty}
                          onQuantityChange={(name, newQuantity) => {
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
                      
                      return (
                        <QuantitySelector
                          key={extra.id}
                          extra={extra.name}
                          quantity={quantity}
                          onQuantityChange={(extraName, newQuantity) => {
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
        </div>
      </div>
    </div>
  );
}
