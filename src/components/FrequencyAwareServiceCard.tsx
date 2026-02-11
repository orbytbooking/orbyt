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
}

const DEFAULT_EXTRA_OPTIONS = ["Inside Fridge", "Inside Oven", "Inside Cabinets", "Laundry", "Windows"];
const DEFAULT_BATHROOM_OPTIONS = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5"];
const DEFAULT_SQFT_OPTIONS = ["1 - 1249 Sq Ft", "1250 - 1499 Sq Ft", "1500 - 1799 Sq Ft", "1800 - 2099 Sq Ft", "2100 - 2399 Sq Ft", "2400 - 2699 Sq Ft", "2700 - 3000 Sq Ft", "3000 - 3299 Sq Ft", "3300 - 3699 Sq Ft", "3700 - 3999", "4000+"];
const DEFAULT_BEDROOM_OPTIONS = ["0", "1", "2", "3", "4", "5"];
const DEFAULT_EXCLUDE_OPTIONS = ["Inside Fridge", "Inside Oven", "Inside Cabinets", "Laundry", "Windows"];

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

  // Sync confirmed state with isSelected prop
  useEffect(() => {
    setIsConfirmed(isSelected);
  }, [isSelected]);

  // Apply service category dependency-based filtering
  useEffect(() => {
    // Only run if we actually have service category data
    if (!serviceCategory || (!availableExtras?.length && !availableVariables)) {
      // If no service category or no available data, use available data or defaults
      setFilteredOptions({
        bathroomVariables: availableVariables?.bathroom?.map((v: any) => v.name) || DEFAULT_BATHROOM_OPTIONS,
        sqftVariables: availableVariables?.sqft?.map((v: any) => v.name) || availableVariables?.area?.map((v: any) => v.name) || DEFAULT_SQFT_OPTIONS,
        bedroomVariables: availableVariables?.bedroom?.map((v: any) => v.name) || DEFAULT_BEDROOM_OPTIONS,
        excludeParameters: availableExtras?.length > 0 ? availableExtras.map(e => e.name) : DEFAULT_EXCLUDE_OPTIONS,
        extras: availableExtras?.length > 0 ? availableExtras.map(e => e.name) : DEFAULT_EXTRA_OPTIONS,
      });
      return;
    }

    const applyServiceCategoryFilters = () => {
      // Get variables from service category
      const categoryVariables = serviceCategory.variables || {};
      
      // Filter variables based on service category selection
      let filteredSqft: string[] = [];
      let filteredBedroom: string[] = [];
      let filteredBathroom: string[] = [];
      
      // Process each variable category from database
      Object.keys(categoryVariables).forEach(variableCategory => {
        const selectedVariables = categoryVariables[variableCategory];
        if (Array.isArray(selectedVariables) && availableVariables[variableCategory]) {
          const availableVars = availableVariables[variableCategory];
          
          // Map variable names to actual database variable names
          selectedVariables.forEach(varName => {
            // Find matching variable in available variables
            const matchingVar = availableVars.find((v: any) => v.name === varName);
            if (matchingVar) {
              // Use the actual variable name from database
              if (variableCategory.toLowerCase().includes('sqft') || variableCategory.toLowerCase().includes('area')) {
                filteredSqft.push(matchingVar.name);
              } else if (variableCategory.toLowerCase().includes('bedroom')) {
                filteredBedroom.push(matchingVar.name);
              } else if (variableCategory.toLowerCase().includes('bathroom')) {
                filteredBathroom.push(matchingVar.name);
              }
            }
          });
        }
      });
      
      // If no filtered variables from service category, use all available variables or defaults
      if (filteredSqft.length === 0) {
        const sqftVars = availableVariables?.sqft?.map((v: any) => v.name) || availableVariables?.area?.map((v: any) => v.name) || [];
        filteredSqft = sqftVars.length > 0 ? sqftVars : DEFAULT_SQFT_OPTIONS;
      }
      if (filteredBedroom.length === 0) {
        const bedroomVars = availableVariables?.bedroom?.map((v: any) => v.name) || [];
        filteredBedroom = bedroomVars.length > 0 ? bedroomVars : DEFAULT_BEDROOM_OPTIONS;
      }
      if (filteredBathroom.length === 0) {
        const bathroomVars = availableVariables?.bathroom?.map((v: any) => v.name) || [];
        filteredBathroom = bathroomVars.length > 0 ? bathroomVars : DEFAULT_BATHROOM_OPTIONS;
      }
      
      // Remove duplicates
      filteredSqft = [...new Set(filteredSqft)];
      filteredBedroom = [...new Set(filteredBedroom)];
      filteredBathroom = [...new Set(filteredBathroom)];
      
      // Filter extras based on service category selection
      const categoryExtras = serviceCategory.extras || [];
      let filteredExtras = (availableExtras || [])
        .filter(extra => categoryExtras.includes(extra.id))
        .map(extra => extra.name);
      
      // If no filtered extras from service category, use all available extras or defaults
      if (filteredExtras.length === 0) {
        if (availableExtras?.length > 0) {
          filteredExtras = availableExtras.map(extra => extra.name);
        } else {
          filteredExtras = DEFAULT_EXTRA_OPTIONS;
        }
      }
      
      // Filter exclude parameters (use available extras as exclude options)
      const filteredExclude = filteredExtras;

      // Update state with filtered options
      const newFilteredOptions = {
        bathroomVariables: filteredBathroom.length > 0 ? filteredBathroom : DEFAULT_BATHROOM_OPTIONS,
        sqftVariables: filteredSqft.length > 0 ? filteredSqft : DEFAULT_SQFT_OPTIONS,
        bedroomVariables: filteredBedroom.length > 0 ? filteredBedroom : DEFAULT_BEDROOM_OPTIONS,
        excludeParameters: filteredExclude,
        extras: filteredExtras.length > 0 ? filteredExtras : DEFAULT_EXTRA_OPTIONS,
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
    
    if (filteredOptions.sqftVariables.length > 0 && !customization.squareMeters) {
      visibleFields.push("area size");
    }
    
    if (filteredOptions.bedroomVariables.length > 0 && !customization.bedroom) {
      visibleFields.push("bedroom");
    }
    
    if (filteredOptions.bathroomVariables.length > 0 && !customization.bathroom) {
      visibleFields.push("bathroom");
    }
    
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
              {/* Row 1: Frequency and Area Size */}
              <div className="grid grid-cols-2 gap-3">
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Frequency</label>
                  <Select
                    value={customization.frequency}
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
                      {frequencyOptions.length > 0 ? frequencyOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      )) : (
                        <>
                          <SelectItem value="One-Time">One-Time</SelectItem>
                          <SelectItem value="2x per week">2x per week</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Every Other Week">Every Other Week</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Only show Area Size if there are filtered options */}
                {filteredOptions.sqftVariables.length > 0 && (
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>Area Size (Sq Ft)</label>
                    <Select
                      value={customization.squareMeters}
                      onValueChange={(value) => {
                        if (value !== customization.squareMeters) {
                          onCustomizationChange(service.id, { ...customization, squareMeters: value });
                        }
                      }}
                    >
                      <SelectTrigger className={styles.selectTrigger}>
                        <SelectValue placeholder="Select area size" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredOptions.sqftVariables.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Row 2: Bedroom and Bathroom */}
              <div className="grid grid-cols-2 gap-3">
                {/* Only show Bedroom if there are filtered options */}
                {filteredOptions.bedroomVariables.length > 0 && (
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>Bedroom</label>
                    <Select
                      value={customization.bedroom}
                      onValueChange={(value) => {
                        if (value !== customization.bedroom) {
                          onCustomizationChange(service.id, { ...customization, bedroom: value });
                        }
                      }}
                    >
                      <SelectTrigger className={styles.selectTrigger}>
                        <SelectValue placeholder="Select bedroom" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredOptions.bedroomVariables.map((option) => (
                          <SelectItem key={option} value={`${option} ${Number(option) === 1 ? 'Bedroom' : 'Bedrooms'}`}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Only show Bathroom if there are filtered options */}
                {filteredOptions.bathroomVariables.length > 0 && (
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>Bathroom</label>
                    <Select
                      value={customization.bathroom}
                      onValueChange={(value) => {
                        if (value !== customization.bathroom) {
                          onCustomizationChange(service.id, { ...customization, bathroom: value });
                        }
                      }}
                    >
                      <SelectTrigger className={styles.selectTrigger}>
                        <SelectValue placeholder="Select bathroom" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredOptions.bathroomVariables.map((option) => (
                          <SelectItem key={option} value={`${option} ${Number(option) === 1 ? 'Bathroom' : 'Bathrooms'}`}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Partial Cleaning Checkbox */}
              <div className={styles.formField}>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`partial-${service.id}`}
                    checked={customization.isPartialCleaning}
                    onCheckedChange={(checked) => {
                      if (checked !== customization.isPartialCleaning) {
                        onCustomizationChange(service.id, {
                          ...customization,
                          isPartialCleaning: checked as boolean,
                          excludedAreas: checked ? customization.excludedAreas : []
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor={`partial-${service.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    This is partial cleaning only
                  </label>
                </div>
              </div>

              {/* Excluded Areas - Only show when partial cleaning is checked */}
              {customization.isPartialCleaning && (
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Select areas to exclude from cleaning:</label>
                  <div className="space-y-2 mt-2">
                    {['Bedroom', 'Full Bathroom', 'Half Bathroom', 'Kitchen', 'Living Room'].map((area) => (
                      <div key={area} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${service.id}-${area}`}
                          checked={customization.excludedAreas?.includes(area) || false}
                          onCheckedChange={(checked) => {
                            const currentExcluded = customization.excludedAreas || [];
                            const isCurrentlyExcluded = currentExcluded.includes(area);
                            if (checked !== isCurrentlyExcluded) {
                              const newExcluded = checked
                                ? [...currentExcluded, area]
                                : currentExcluded.filter(a => a !== area);
                              onCustomizationChange(service.id, {
                                ...customization,
                                excludedAreas: newExcluded
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor={`${service.id}-${area}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {area}
                        </label>
                      </div>
                    ))}
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
