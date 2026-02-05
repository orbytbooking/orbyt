"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}

export interface ServiceCustomization {
  frequency: string;
  squareMeters: string;
  bedroom: string;
  bathroom: string;
  extras: string[];
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
  availableVariables = {}
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
    if (!serviceCategory) {
      // If no service category, use default options
      setFilteredOptions({
        bathroomVariables: DEFAULT_BATHROOM_OPTIONS,
        sqftVariables: DEFAULT_SQFT_OPTIONS,
        bedroomVariables: DEFAULT_BEDROOM_OPTIONS,
        excludeParameters: DEFAULT_EXCLUDE_OPTIONS,
        extras: DEFAULT_EXTRA_OPTIONS,
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
      
      // Process each variable category
      Object.keys(categoryVariables).forEach(variableCategory => {
        const selectedVariables = categoryVariables[variableCategory];
        if (Array.isArray(selectedVariables) && availableVariables[variableCategory]) {
          const availableVars = availableVariables[variableCategory];
          
          // Map variable names to default options based on category
          selectedVariables.forEach(varName => {
            // Try to match with default options
            if (DEFAULT_SQFT_OPTIONS.some(option => option.toLowerCase().includes(varName.toLowerCase()) || varName.toLowerCase().includes(option.toLowerCase()))) {
              const matched = DEFAULT_SQFT_OPTIONS.filter(option => 
                option.toLowerCase().includes(varName.toLowerCase()) || varName.toLowerCase().includes(option.toLowerCase())
              );
              filteredSqft = [...filteredSqft, ...matched];
            }
            if (DEFAULT_BEDROOM_OPTIONS.some(option => option.toLowerCase().includes(varName.toLowerCase()) || varName.toLowerCase().includes(option.toLowerCase()))) {
              const matched = DEFAULT_BEDROOM_OPTIONS.filter(option => 
                option.toLowerCase().includes(varName.toLowerCase()) || varName.toLowerCase().includes(option.toLowerCase())
              );
              filteredBedroom = [...filteredBedroom, ...matched];
            }
            if (DEFAULT_BATHROOM_OPTIONS.some(option => option.toLowerCase().includes(varName.toLowerCase()) || varName.toLowerCase().includes(option.toLowerCase()))) {
              const matched = DEFAULT_BATHROOM_OPTIONS.filter(option => 
                option.toLowerCase().includes(varName.toLowerCase()) || varName.toLowerCase().includes(option.toLowerCase())
              );
              filteredBathroom = [...filteredBathroom, ...matched];
            }
          });
        }
      });
      
      // Remove duplicates
      filteredSqft = [...new Set(filteredSqft)];
      filteredBedroom = [...new Set(filteredBedroom)];
      filteredBathroom = [...new Set(filteredBathroom)];
      
      // Filter extras based on service category selection
      const categoryExtras = serviceCategory.extras || [];
      const filteredExtras = availableExtras
        .filter(extra => categoryExtras.includes(extra.id))
        .map(extra => extra.name);
      
      // Filter exclude parameters
      const categoryExcludeParams = serviceCategory.selected_exclude_parameters || [];
      const filteredExclude = DEFAULT_EXCLUDE_OPTIONS.filter(option => 
        categoryExcludeParams.some(exclude => 
          option.toLowerCase().includes(exclude.toLowerCase()) || exclude.toLowerCase().includes(option.toLowerCase())
        )
      );

      setFilteredOptions({
        bathroomVariables: filteredBathroom.length > 0 ? filteredBathroom : DEFAULT_BATHROOM_OPTIONS,
        sqftVariables: filteredSqft.length > 0 ? filteredSqft : DEFAULT_SQFT_OPTIONS,
        bedroomVariables: filteredBedroom.length > 0 ? filteredBedroom : DEFAULT_BEDROOM_OPTIONS,
        excludeParameters: filteredExclude,
        extras: filteredExtras.length > 0 ? filteredExtras : DEFAULT_EXTRA_OPTIONS,
      });
    };

    applyServiceCategoryFilters();
  }, [serviceCategory, availableExtras, availableVariables]);

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
                    onValueChange={(value) =>
                      onCustomizationChange(service.id, { ...customization, frequency: value })
                    }
                  >
                    <SelectTrigger className={styles.selectTrigger}>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="One-Time">One-Time</SelectItem>
                      <SelectItem value="2x per week">2x per week</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Every Other Week">Every Other Week</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Only show Area Size if there are filtered options */}
                {filteredOptions.sqftVariables.length > 0 && (
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>Area Size (Sq Ft)</label>
                    <Select
                      value={customization.squareMeters}
                      onValueChange={(value) =>
                        onCustomizationChange(service.id, { ...customization, squareMeters: value })
                      }
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
                      onValueChange={(value) =>
                        onCustomizationChange(service.id, { ...customization, bedroom: value })
                      }
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
                      onValueChange={(value) =>
                        onCustomizationChange(service.id, { ...customization, bathroom: value })
                      }
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
                    onCheckedChange={(checked) =>
                      onCustomizationChange(service.id, {
                        ...customization,
                        isPartialCleaning: checked as boolean,
                        excludedAreas: checked ? customization.excludedAreas : []
                      })
                    }
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
                            const newExcluded = checked
                              ? [...currentExcluded, area]
                              : currentExcluded.filter(a => a !== area);
                            onCustomizationChange(service.id, {
                              ...customization,
                              excludedAreas: newExcluded
                            });
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
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredOptions.extras.map((extra) => (
                      <div key={extra} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${service.id}-extra-${extra}`}
                          checked={customization.extras?.includes(extra) || false}
                          onCheckedChange={(checked) => {
                            const currentExtras = customization.extras || [];
                            const newExtras = checked
                              ? [...currentExtras, extra]
                              : currentExtras.filter((e) => e !== extra);
                            onCustomizationChange(service.id, {
                              ...customization,
                              extras: newExtras,
                            });
                          }}
                        />
                        <label
                          htmlFor={`${service.id}-extra-${extra}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {extra}
                        </label>
                      </div>
                    ))}
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
