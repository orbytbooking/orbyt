"use client";

import React, { useEffect, useRef, useState } from "react";
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
  filterVariables, 
  filterExcludeParameters, 
  filterExtras 
} from "@/lib/frequencyFilter";

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
  serviceCategory,
  availableExtras = [],
  availableVariables = {},
  frequencyOptions = []
}: ServiceCardProps) {
  const isFlipped = flippedCardId === String(service.id) || flippedCardId === service.id;
  const [isConfirmed, setIsConfirmed] = useState(isSelected);
  // Ref holds the latest customization so Confirm always passes current form values (avoids stale prop after async parent update)
  const latestCustomizationRef = useRef<ServiceCustomization>(customization);

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

  // Fetch exclude parameters from admin portal API
  useEffect(() => {
    const fetchExcludeParameters = async () => {
      if (!industryId) {
        setFilteredOptions(prev => ({ ...prev, excludeParameters: [] }));
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
            setFilteredOptions(prev => ({ ...prev, excludeParameters: params }));
          } else {
            setFilteredOptions(prev => ({ ...prev, excludeParameters: [] }));
          }
        } else {
          setFilteredOptions(prev => ({ ...prev, excludeParameters: [] }));
        }
      } catch (error) {
        console.error('Error fetching exclude parameters:', error);
        setFilteredOptions(prev => ({ ...prev, excludeParameters: [] }));
      }
    };

    fetchExcludeParameters();
  }, [industryId]);

  // Apply service category dependency-based filtering
  useEffect(() => {
    // Only run if we actually have service category data
    const toExtraOption = (e: any): ExtraOption => ({
      id: e.id,
      name: e.name,
      qty_based: e.qty_based,
      maximum_quantity: e.maximum_quantity ?? null,
    });

    if (!serviceCategory || (!availableExtras?.length && !availableVariables)) {
      // If no service category or no available data, use available data
      // Variables are displayed dynamically, so we only need to track extras and exclude parameters
      setFilteredOptions(prev => ({
        bathroomVariables: DEFAULT_BATHROOM_OPTIONS, // Not used - variables displayed dynamically
        sqftVariables: DEFAULT_SQFT_OPTIONS, // Not used - variables displayed dynamically
        bedroomVariables: DEFAULT_BEDROOM_OPTIONS, // Not used - variables displayed dynamically
        excludeParameters: prev.excludeParameters || [], // Preserve exclude parameters from API fetch
        extras: availableExtras?.length > 0 ? availableExtras.map(toExtraOption) : [], // Full extra objects for qty_based / maximum_quantity
      }));
      return;
    }

    const applyServiceCategoryFilters = () => {
      // Variables are now displayed dynamically from availableVariables
      // No need to filter them here - all categories are shown
      
      // Filter extras based on service category selection (keep full objects for qty_based / maximum_quantity)
      const categoryExtras = serviceCategory.extras || [];
      let filteredExtras: ExtraOption[] = [];
      
      if (categoryExtras.length > 0 && availableExtras?.length > 0) {
        filteredExtras = (availableExtras || [])
          .filter(extra => categoryExtras.includes(extra.id))
          .map(toExtraOption);
      }
      
      if (filteredExtras.length === 0 && availableExtras?.length > 0) {
        filteredExtras = availableExtras.map(toExtraOption);
      }
      
      // Exclude parameters come from API fetch (preserve existing fetched ones)
      const currentExcludeParams = filteredOptions.excludeParameters || [];

      const newFilteredOptions = {
        bathroomVariables: DEFAULT_BATHROOM_OPTIONS,
        sqftVariables: DEFAULT_SQFT_OPTIONS,
        bedroomVariables: DEFAULT_BEDROOM_OPTIONS,
        excludeParameters: currentExcludeParams,
        extras: filteredExtras,
      };

      // Prevent unnecessary state updates by comparing with current state
      setFilteredOptions(prev => {
        const hasChanged = 
          JSON.stringify(prev.bathroomVariables) !== JSON.stringify(newFilteredOptions.bathroomVariables) ||
          JSON.stringify(prev.sqftVariables) !== JSON.stringify(newFilteredOptions.sqftVariables) ||
          JSON.stringify(prev.bedroomVariables) !== JSON.stringify(newFilteredOptions.bedroomVariables) ||
          JSON.stringify(prev.excludeParameters) !== JSON.stringify(newFilteredOptions.excludeParameters) ||
          JSON.stringify(prev.extras) !== JSON.stringify(newFilteredOptions.extras);
        
        return hasChanged ? newFilteredOptions : prev;
      });
    };

    applyServiceCategoryFilters();
  }, [serviceCategory?.id, JSON.stringify(availableExtras), JSON.stringify(availableVariables)]);

  const handleCardClick = () => {
    // Allow flipping any card at any time
    if (!isFlipped) {
      onFlip(service.id);
    }
  };

  const handleBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFlip("");
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Only require frequency when the admin has configured at least one frequency option
    const visibleFields: string[] = [];
    if (frequencyOptions.length > 0 && !customization.frequency) {
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

    // Use ref so we pass the latest form values (prop can be stale before parent re-renders)
    const toSend = latestCustomizationRef.current;

    // Push to parent first so state is committed before we flip (avoids re-render with default prop overwriting ref)
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
          </div>
          <div className={styles.clickPrompt}>Click to customize your service</div>
        </div>

        {/* Back Side */}
        <div className={styles.cardBack}>
          <div className={styles.backContent}>
            <h3 className={styles.backTitle}>Customize Your Service</h3>
            <p className={styles.backSubtitle}>{service.name}</p>

            <div className={styles.customizationForm}>
              {/* Frequency */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Frequency</label>
                <Select
                  value={customization.frequency || ""}
                  onValueChange={(value) => {
                    if (value !== customization.frequency) {
                      const updated = { ...customization, frequency: value };
                      latestCustomizationRef.current = updated;
                      onCustomizationChange(service.id, updated);
                    }
                  }}
                >
                  <SelectTrigger className={styles.selectTrigger}>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.length > 0 ? (
                      frequencyOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__no_frequencies_configured__" disabled>
                        No frequencies configured
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* All Variable Categories from Admin Portal (dynamically rendered) */}
              {variableCategoryEntries.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
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
                    This is partial cleaning only
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
