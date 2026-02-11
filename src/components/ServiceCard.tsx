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
  availableExtras?: any[];
  availableVariables?: { [key: string]: any[] };
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

export default function ServiceCard({ 
  service, 
  isSelected, 
  onSelect, 
  flippedCardId, 
  onFlip, 
  customization, 
  onCustomizationChange,
  availableExtras = [],
  availableVariables = {}
}: ServiceCardProps) {
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

  const EXTRA_OPTIONS = availableExtras?.length > 0 ? availableExtras.map(e => e.name) : [];
  const SQFT_OPTIONS = availableVariables?.sqft?.map((v: any) => v.name) || availableVariables?.area?.map((v: any) => v.name) || [];
  const BEDROOM_OPTIONS = availableVariables?.bedroom?.map((v: any) => v.name) || [];
  const BATHROOM_OPTIONS = availableVariables?.bathroom?.map((v: any) => v.name) || [];

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
                      {SQFT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
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
                      {BEDROOM_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                      {BATHROOM_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
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
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Extras (Optional)</label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXTRA_OPTIONS.map((extra) => {
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
