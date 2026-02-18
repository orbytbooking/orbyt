"use client";

import React, { useEffect, useState } from "react";
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

export interface ServiceCustomization {
  frequency: string;
  squareMeters: string;
  bedroom: string;
  bathroom: string;
  extras: { name: string; quantity: number }[];
  isPartialCleaning: boolean;
  excludedAreas: string[];
  variableCategories?: { [categoryName: string]: string }; // Dynamic variable category selections
}

// Customer UI should reflect admin-configured options only (no hardcoded defaults)
const DEFAULT_EXTRA_OPTIONS: string[] = [];
const DEFAULT_BATHROOM_OPTIONS: string[] = [];
const DEFAULT_SQFT_OPTIONS: string[] = [];
const DEFAULT_BEDROOM_OPTIONS: string[] = [];
// Exclude parameters should come only from admin-configured data (no local defaults)
const DEFAULT_EXCLUDE_OPTIONS: string[] = [];

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
  const isFlipped = flippedCardId === service.id;
  const [isConfirmed, setIsConfirmed] = useState(isSelected);
  const [filteredOptions, setFilteredOptions] = useState<{
    bathroomVariables: typeof DEFAULT_BATHROOM_OPTIONS;
    sqftVariables: typeof DEFAULT_SQFT_OPTIONS;
    bedroomVariables: typeof DEFAULT_BEDROOM_OPTIONS;
    excludeParameters: typeof DEFAULT_EXCLUDE_OPTIONS;
    extras: typeof DEFAULT_EXTRA_OPTIONS;
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

  // Helper to get current value for a variable category
  const getVariableCategoryValue = (categoryName: string): string => {
    // Check dynamic variableCategories first
    if (customization.variableCategories?.[categoryName]) {
      return customization.variableCategories[categoryName];
    }
    // Fallback to legacy fields for backward compatibility
    const lowerCategory = categoryName.toLowerCase();
    if (lowerCategory.includes('sqft') || lowerCategory.includes('area') || lowerCategory.includes('square')) {
      return customization.squareMeters || '';
    }
    if (lowerCategory.includes('bedroom')) {
      return customization.bedroom || '';
    }
    if (lowerCategory.includes('bathroom')) {
      return customization.bathroom || '';
    }
    return '';
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
    
        
    onCustomizationChange(service.id, updatedCustomization);
  };

  // Sync confirmed state with isSelected prop
  useEffect(() => {
    setIsConfirmed(isSelected);
  }, [isSelected]);

  // Force re-render when customization prop changes to ensure form fields update
  useEffect(() => {
    // This effect ensures that when the customization prop changes (e.g., when editing),
    // the component properly reflects the new values in the form fields
    if (customization) {
      // The dependency on customization will trigger re-render when values change
      // This ensures Select components show the correct values when editing
    }
  }, [customization]);

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
            const excludeParamNames = data.excludeParameters.map((param: any) => param.name);
            setFilteredOptions(prev => ({ ...prev, excludeParameters: excludeParamNames }));
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
    if (!serviceCategory || (!availableExtras?.length && !availableVariables)) {
      // If no service category or no available data, use available data
      // Variables are displayed dynamically, so we only need to track extras and exclude parameters
      setFilteredOptions(prev => ({
        bathroomVariables: DEFAULT_BATHROOM_OPTIONS, // Not used - variables displayed dynamically
        sqftVariables: DEFAULT_SQFT_OPTIONS, // Not used - variables displayed dynamically
        bedroomVariables: DEFAULT_BEDROOM_OPTIONS, // Not used - variables displayed dynamically
        excludeParameters: prev.excludeParameters || [], // Preserve exclude parameters from API fetch
        extras: availableExtras?.length > 0 ? availableExtras.map(e => e.name) : [], // Only use admin-configured extras
      }));
      return;
    }

    const applyServiceCategoryFilters = () => {
      // Variables are now displayed dynamically from availableVariables
      // No need to filter them here - all categories are shown
      
      // Filter extras based on service category selection
      const categoryExtras = serviceCategory.extras || [];
      let filteredExtras: string[] = [];
      
      if (categoryExtras.length > 0 && availableExtras?.length > 0) {
        // Filter extras that are configured for this service category
        filteredExtras = (availableExtras || [])
          .filter(extra => categoryExtras.includes(extra.id))
          .map(extra => extra.name);
      }
      
      // If no filtered extras from service category, use all available extras from admin portal
      if (filteredExtras.length === 0) {
        if (availableExtras?.length > 0) {
          // Use all extras configured in admin portal
          filteredExtras = availableExtras.map(extra => extra.name);
        }
        // Don't use local defaults - only show admin-configured extras
      }
      
      // Exclude parameters come from API fetch (preserve existing fetched ones)
      // Don't override exclude parameters here - they are fetched separately from /api/exclude-parameters
      const currentExcludeParams = filteredOptions.excludeParameters || [];

      // Update state with filtered options
      // Variables are now displayed dynamically, so we only need to track extras and exclude parameters
      const newFilteredOptions = {
        bathroomVariables: DEFAULT_BATHROOM_OPTIONS, // Not used anymore - variables displayed dynamically
        sqftVariables: DEFAULT_SQFT_OPTIONS, // Not used anymore - variables displayed dynamically
        bedroomVariables: DEFAULT_BEDROOM_OPTIONS, // Not used anymore - variables displayed dynamically
        excludeParameters: currentExcludeParams, // Preserve exclude parameters from API fetch
        extras: filteredExtras, // Only use admin-configured extras (no local defaults)
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
    
    // Validate that all required VISIBLE options are selected
    const visibleFields = [];
    
    if (!customization.frequency) {
      visibleFields.push("frequency");
    }
    
    // Validate all variable categories
    variableCategoryEntries.forEach(([categoryName, vars]) => {
      const currentValue = getVariableCategoryValue(categoryName);
      if (!currentValue) {
        visibleFields.push(categoryName.toLowerCase());
      }
    });
    
    if (visibleFields.length > 0) {
      alert(`Please select the following required options: ${visibleFields.join(", ")}`);
      return;
    }

    // Log the selection
    console.log("Service Selected:", {
      serviceName: service.name,
      customization: customization,
      filteredOptions: filteredOptions,
    });

    // Call the onSelect callback
    onSelect(service.name, customization);
    
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
                      onCustomizationChange(service.id, { ...customization, frequency: value });
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
                        onCustomizationChange(service.id, {
                          ...customization,
                          isPartialCleaning: enabled,
                          excludedAreas: enabled ? customization.excludedAreas : [],
                        });
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

              {/* Excluded Areas - use configured exclude parameters with +/- like Extras */}
              {customization.isPartialCleaning && filteredOptions.excludeParameters.length > 0 && (
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Select areas to exclude from cleaning:</label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredOptions.excludeParameters.map((area) => {
                      const isExcluded = customization.excludedAreas?.includes(area) || false;
                      const quantity = isExcluded ? 1 : 0;

                      return (
                        <QuantitySelector
                          key={area}
                          extra={area}
                          quantity={quantity}
                          min={0}
                          max={1}
                          onQuantityChange={(areaName, newQuantity) => {
                            const currentExcluded = customization.excludedAreas || [];
                            const currentlyExcluded = currentExcluded.includes(areaName);
                            const shouldExclude = newQuantity > 0;

                            if (shouldExclude !== currentlyExcluded) {
                              const newExcluded = shouldExclude
                                ? [...currentExcluded, areaName]
                                : currentExcluded.filter((a) => a !== areaName);

                              onCustomizationChange(service.id, {
                                ...customization,
                                excludedAreas: newExcluded,
                              });
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Row 3: Extras (Full Width, Two Columns) */}
              {/* Only show Extras section if there are filtered options */}
              {filteredOptions.extras.length > 0 && (
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Extras (Optional)</label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredOptions.extras.map((extra) => {
                      const currentExtra = customization.extras?.find(e => e.name === extra);
                      const quantity = currentExtra?.quantity || 0;
                      
                      return (
                        <QuantitySelector
                          key={extra}
                          extra={extra}
                          quantity={quantity}
                          onQuantityChange={(extraName, newQuantity) => {
                            const currentExtras = customization.extras || [];
                            let newExtras;
                            
                            if (newQuantity === 0) {
                              // Remove the extra if quantity is 0
                              newExtras = currentExtras.filter(e => e.name !== extraName);
                            } else {
                              // Update or add the extra with new quantity
                              const existingIndex = currentExtras.findIndex(e => e.name === extraName);
                              if (existingIndex >= 0) {
                                newExtras = [...currentExtras];
                                newExtras[existingIndex] = { name: extraName, quantity: newQuantity };
                              } else {
                                newExtras = [...currentExtras, { name: extraName, quantity: newQuantity }];
                              }
                            }
                            
                                                        
                            onCustomizationChange(service.id, {
                              ...customization,
                              extras: newExtras,
                            });
                          }}
                          min={0}
                          max={10}
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
