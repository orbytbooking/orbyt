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

export default function ServiceCard({ service, isSelected, onSelect, flippedCardId, onFlip, customization, onCustomizationChange }: ServiceCardProps) {
  const isFlipped = flippedCardId === service.id;
  const [isConfirmed, setIsConfirmed] = useState(isSelected);

  // Sync confirmed state with isSelected prop
  useEffect(() => {
    setIsConfirmed(isSelected);
  }, [isSelected]);

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
    
    // Validate that all required options are selected
    if (!customization.frequency || !customization.squareMeters || !customization.bedroom || !customization.bathroom) {
      alert("Please select all required customization options before confirming.");
      return;
    }

    // Log the selection
    console.log("Service Selected:", {
      serviceName: service.name,
      customization: customization,
    });

    // Call the onSelect callback
    onSelect(service.name, customization);
    
    // Mark as confirmed and flip back
    setIsConfirmed(true);
    onFlip("");
  };

  const EXTRA_OPTIONS = ["Inside Fridge", "Inside Oven", "Inside Cabinets", "Laundry", "Windows"];

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
                      <SelectItem value="10-20 sqm">1 – 1249 Sq Ft</SelectItem>
                      <SelectItem value="21-30 sqm">1250 – 1499 Sq Ft</SelectItem>
                      <SelectItem value="31-40 sqm">1500 – 1799 Sq Ft</SelectItem>
                      <SelectItem value="41-50 sqm">1800 – 2099 Sq Ft</SelectItem>
                      <SelectItem value="51+ sqm">2100 – 2399 Sq Ft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Bedroom and Bathroom */}
              <div className="grid grid-cols-2 gap-3">
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
                      <SelectItem value="1 Bedroom">1</SelectItem>
                      <SelectItem value="2 Bedrooms">2</SelectItem>
                      <SelectItem value="3 Bedrooms">3</SelectItem>
                      <SelectItem value="4 Bedrooms">4</SelectItem>
                      <SelectItem value="5 Bedrooms">5</SelectItem>
                      <SelectItem value="6 Bedrooms">6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                      <SelectItem value="1 Bathroom">1 </SelectItem>
                      <SelectItem value="2 Bathrooms">2</SelectItem>
                      <SelectItem value="3 Bathrooms">3</SelectItem>
                      <SelectItem value="4 Bathrooms">4</SelectItem>
                      <SelectItem value="5 Bathrooms">5</SelectItem>
                      <SelectItem value="6 Bathrooms">6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Extras (Optional)</label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXTRA_OPTIONS.map((extra) => (
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
