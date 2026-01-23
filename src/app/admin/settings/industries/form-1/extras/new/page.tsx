"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";

type Extra = {
  id: number;
  name: string;
  time: number; // in minutes
  serviceCategory: string;
  price: number;
  display: "frontend-backend-admin" | "backend-admin" | "admin-only" | "Both" | "Booking" | "Quote"; // Support legacy values
  qtyBased: boolean;
  exemptFromDiscount?: boolean;
  description?: string;
  showBasedOnFrequency?: boolean;
  frequencyOptions?: string[];
  showBasedOnServiceCategory?: boolean;
  serviceCategoryOptions?: string[];
  showBasedOnVariables?: boolean;
  variableOptions?: string[];
  pricingStructure?: "manual" | "multiply";
  manualPrices?: { price: string; timeHours: string; timeMinutes: string }[];
};

export default function ExtraNewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const industryId = params.get("industryId");
  const editId = params.get("editId");
  const { currentBusiness } = useBusiness();
  const [saving, setSaving] = useState(false);
  
  const storageKey = useMemo(() => `extras_${industry}`, [industry]);
  const [extras, setExtras] = useState<Extra[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    timeHours: "0",
    timeMinutes: "0",
    serviceCategory: "",
    price: "0",
    display: "frontend-backend-admin" as Extra["display"],
    qtyBased: false,
    exemptFromDiscount: false,
    maximum: "",
    pricingStructure: "manual" as "manual" | "multiply",
    manualPrices: [] as { price: string; timeHours: string; timeMinutes: string }[],
    applyToAllBookings: true as boolean,
    overrideTimePricing: false as boolean,
    exemptExtraTime: false as boolean,
    // Dependencies
    showBasedOnFrequency: false,
    frequencyOptions: [] as string[],
    showBasedOnServiceCategory: false,
    serviceCategoryOptions: [] as string[],
    showBasedOnVariables: false,
    variableOptions: [] as string[],
    // Providers
    excludedProviders: [] as string[],
  });

  // Fetch providers from localStorage
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  
  // Load available frequencies, service categories, and variables
  const [availableFrequencies, setAvailableFrequencies] = useState<string[]>([]);
  const [availableServiceCategories, setAvailableServiceCategories] = useState<string[]>([]);
  const [availableVariables, setAvailableVariables] = useState<{ [key: string]: any[] }>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(stored)) setExtras(stored);
    } catch {}
  }, [storageKey]);

  // Load providers from localStorage
  useEffect(() => {
    try {
      const storedProviders = JSON.parse(localStorage.getItem("adminProviders") || "[]");
      if (Array.isArray(storedProviders)) {
        setProviders(storedProviders.map((p: any) => ({ id: p.id, name: p.name })));
      }
    } catch {
      // ignore
    }
  }, []);

  // Load frequencies from localStorage
  useEffect(() => {
    try {
      const pricingDataKey = `pricingParamsAll_${industry}`;
      const storedPricingData = JSON.parse(localStorage.getItem(pricingDataKey) || "null");
      
      if (storedPricingData && typeof storedPricingData === "object") {
        const allFrequencies: string[] = [];
        Object.values(storedPricingData).forEach((rows: any[]) => {
          rows.forEach((row: any) => {
            if (row.frequency && typeof row.frequency === "string") {
              const rowFrequencies = row.frequency.split(',').map((f: string) => f.trim());
              allFrequencies.push(...rowFrequencies);
            }
          });
        });
        
        const uniqueFrequencies = [...new Set(allFrequencies)];
        setAvailableFrequencies(uniqueFrequencies);
      } else {
        const defaultFrequencies = ["Daily", "Weekly", "Monthly", "One-time"];
        setAvailableFrequencies(defaultFrequencies);
      }
    } catch {
      const defaultFrequencies = ["Daily", "Weekly", "Monthly", "One-time"];
      setAvailableFrequencies(defaultFrequencies);
    }
  }, [industry]);

  // Load service categories from localStorage
  useEffect(() => {
    try {
      const serviceCategoriesKey = `service_categories_${industry}`;
      const storedCategories = JSON.parse(localStorage.getItem(serviceCategoriesKey) || "[]");
      if (Array.isArray(storedCategories)) {
        const categoryNames = storedCategories.map((cat: any) => cat.name).filter(Boolean);
        setAvailableServiceCategories(categoryNames);
      }
    } catch {
      // ignore
    }
  }, [industry]);

  // Load variables from localStorage
  useEffect(() => {
    try {
      const allDataKey = `pricingParamsAll_${industry}`;
      const storedData = JSON.parse(localStorage.getItem(allDataKey) || "{}");
      if (storedData && typeof storedData === "object") {
        setAvailableVariables(storedData);
      }
    } catch {
      // ignore
    }
  }, [industry]);

  useEffect(() => {
    if (editId) {
      fetchExtraForEdit();
    }
  }, [editId]);

  const fetchExtraForEdit = async () => {
    if (!editId) return;
    try {
      const response = await fetch(`/api/extras/${editId}`);
      if (!response.ok) throw new Error('Failed to fetch extra');
      const { extra } = await response.json();
      if (extra) {
        const hours = Math.floor((extra.time_minutes ?? 0) / 60);
        const minutes = (extra.time_minutes ?? 0) % 60;
        setForm({
          name: extra.name,
          description: extra.description || "",
          timeHours: String(hours),
          timeMinutes: String(minutes),
          serviceCategory: extra.service_category || "",
          price: String(extra.price ?? 0),
          display: extra.display,
          qtyBased: extra.qty_based,
          exemptFromDiscount: extra.exempt_from_discount ?? false,
          maximum: "",
          pricingStructure: "manual" as "manual" | "multiply",
          manualPrices: [],
          applyToAllBookings: true,
          overrideTimePricing: false,
          exemptExtraTime: false,
          showBasedOnFrequency: extra.show_based_on_frequency || false,
          frequencyOptions: extra.frequency_options || [],
          showBasedOnServiceCategory: extra.show_based_on_service_category || false,
          serviceCategoryOptions: extra.service_category_options || [],
          showBasedOnVariables: extra.show_based_on_variables || false,
          variableOptions: extra.variable_options || [],
          excludedProviders: [],
        });
      }
    } catch (error) {
      console.error('Error fetching extra:', error);
      toast.error('Failed to load extra for editing');
    }
  };

  // Legacy localStorage loading (keeping for backwards compatibility)
  useEffect(() => {
    if (editId && extras.length > 0) {
      const existing = extras.find(r => String(r.id) === editId);
      if (existing) {
        const hours = Math.floor((existing.time ?? 0) / 60);
        const minutes = (existing.time ?? 0) % 60;
        setForm({
          name: existing.name,
          description: existing.description || "",
          timeHours: String(hours),
          timeMinutes: String(minutes),
          serviceCategory: existing.serviceCategory,
          price: String(existing.price ?? 0),
          display: existing.display,
          qtyBased: existing.qtyBased,
          exemptFromDiscount: existing.exemptFromDiscount ?? false,
          maximum: "",
          pricingStructure: existing.pricingStructure || "manual",
          manualPrices: existing.manualPrices || [],
          applyToAllBookings: true,
          overrideTimePricing: false,
          exemptExtraTime: false,
          showBasedOnFrequency: false,
          frequencyOptions: existing.frequencyOptions || [],
          showBasedOnServiceCategory: false,
          serviceCategoryOptions: existing.serviceCategoryOptions || [],
          showBasedOnVariables: false,
          variableOptions: existing.variableOptions || [],
          excludedProviders: [],
        });
      }
    }
  }, [editId, extras]);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a name for the extra');
      return;
    }

    if (!industryId) {
      toast.error('Industry ID is missing');
      return;
    }

    if (!currentBusiness?.id) {
      toast.error('Business not found. Please try again.');
      return;
    }

    const hours = Number(form.timeHours) || 0;
    const minutes = Number(form.timeMinutes) || 0;
    const time_minutes = hours * 60 + minutes;
    const price = Number(form.price) || 0;

    const extraData = {
      business_id: currentBusiness.id,
      industry_id: industryId,
      name: form.name.trim(),
      description: form.description || undefined,
      time_minutes,
      service_category: form.serviceCategory || undefined,
      price,
      display: form.display,
      qty_based: form.qtyBased,
      exempt_from_discount: form.exemptFromDiscount,
      show_based_on_frequency: form.showBasedOnFrequency,
      frequency_options: form.frequencyOptions.length > 0 ? form.frequencyOptions : undefined,
      show_based_on_service_category: form.showBasedOnServiceCategory,
      service_category_options: form.serviceCategoryOptions.length > 0 ? form.serviceCategoryOptions : undefined,
      show_based_on_variables: form.showBasedOnVariables,
      variable_options: form.variableOptions.length > 0 ? form.variableOptions : undefined,
    };

    try {
      setSaving(true);

      if (editId) {
        // Update existing extra
        const response = await fetch('/api/extras', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...extraData }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update extra');
        }

        toast.success('Extra updated successfully');
      } else {
        // Create new extra
        const response = await fetch('/api/extras', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extraData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create extra');
        }

        toast.success('Extra created successfully');
      }

      router.push(`/admin/settings/industries/form-1/extras?industry=${encodeURIComponent(industry)}&industryId=${industryId}`);
    } catch (error) {
      console.error('Error saving extra:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save extra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Extra" : "Add Extra"}</CardTitle>
          <CardDescription>Configure an extra/add-on for {industry}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              <TabsTrigger value="providers">Providers</TabsTrigger>
            </TabsList>

            {/* DETAILS TAB */}
            <TabsContent value="details" className="mt-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="extra-name">Name</Label>
                <Input 
                  id="extra-name" 
                  value={form.name} 
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} 
                  placeholder="Ex. Inside Fridge" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="extra-desc">Description</Label>
                <Textarea 
                  id="extra-desc" 
                  rows={3} 
                  value={form.description} 
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} 
                  placeholder="Add Description" 
                />
              </div>

              <div className="space-y-2">
                <Label>Display</Label>
                <RadioGroup
                  value={form.display}
                  onValueChange={(v: Extra["display"]) => setForm(p => ({ ...p, display: v }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="frontend-backend-admin" /> Customer frontend, backend & admin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="backend-admin" /> Customer backend & admin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="admin-only" /> Admin only
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="override-time-pricing" 
                    checked={form.overrideTimePricing} 
                    onCheckedChange={(v) => setForm(p => ({ ...p, overrideTimePricing: !!v }))} 
                  />
                  <Label htmlFor="override-time-pricing" className="text-sm">Override time-based pricing parameters and add extra as separate charge?</Label>
                  <div className="relative group">
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Note: This option will work only in case of hourly service (Pricing parameters time based).
                    </div>
                  </div>
                </div>
                {form.overrideTimePricing && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="exempt-extra-time" 
                        checked={form.exemptExtraTime} 
                        onCheckedChange={(v) => setForm(p => ({ ...p, exemptExtraTime: !!v }))} 
                      />
                      <Label htmlFor="exempt-extra-time" className="text-sm">Exempt extra's time from hourly service price calculation</Label>
                      <div className="relative group">
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Check this box to exclude the extra's time from the hourly service price calculation.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="exempt-discount" 
                  checked={form.exemptFromDiscount} 
                  onCheckedChange={(v) => setForm(p => ({ ...p, exemptFromDiscount: !!v }))} 
                />
                <Label htmlFor="exempt-discount" className="text-sm">Exempt extra from frequency discount?</Label>
              </div>

              <div className="space-y-2">
                <Label>Quantity based</Label>
                <RadioGroup
                  value={form.qtyBased ? "yes" : "no"}
                  onValueChange={(v) => setForm(p => ({ ...p, qtyBased: v === "yes" }))}
                  className="flex gap-4"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="yes" /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="no" /> No
                  </label>
                </RadioGroup>
              </div>

              {form.qtyBased && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="maximum">Maximum</Label>
                    <Input 
                      id="maximum" 
                      type="number" 
                      value={form.maximum} 
                      onChange={(e) => {
                        const newMaximum = e.target.value;
                        setForm(p => ({ ...p, maximum: newMaximum }));
                        
                        // Auto-multiply if multiply structure is selected
                        if (form.pricingStructure === "multiply" && newMaximum) {
                          const maxNum = Number(newMaximum) || 1;
                          const basePrice = Number(form.price) || 0;
                          const baseTimeHours = Number(form.timeHours) || 0;
                          const baseTimeMinutes = Number(form.timeMinutes) || 0;
                          const totalBaseMinutes = baseTimeHours * 60 + baseTimeMinutes;
                          
                          const multipliedPrice = basePrice * maxNum;
                          const multipliedMinutes = totalBaseMinutes * maxNum;
                          const multipliedHours = Math.floor(multipliedMinutes / 60);
                          const remainingMinutes = multipliedMinutes % 60;
                          
                          setForm(p => ({ 
                            ...p, 
                            maximum: newMaximum,
                            price: String(multipliedPrice),
                            timeHours: String(multipliedHours),
                            timeMinutes: String(remainingMinutes)
                          }));
                        }
                        
                        // Update manual prices array when maximum changes in manual mode
                        if (form.pricingStructure === "manual") {
                          const maxNum = Number(newMaximum) || 0;
                          const currentManualPrices = form.manualPrices || [];
                          
                          if (maxNum > currentManualPrices.length) {
                            // Add new empty entries
                            const newEntries = Array.from({ length: maxNum - currentManualPrices.length }, () => ({
                              price: "0",
                              timeHours: "0",
                              timeMinutes: "0"
                            }));
                            setForm(p => ({ 
                              ...p, 
                              maximum: newMaximum,
                              manualPrices: [...currentManualPrices, ...newEntries]
                            }));
                          } else if (maxNum < currentManualPrices.length) {
                            // Remove excess entries
                            setForm(p => ({ 
                              ...p, 
                              maximum: newMaximum,
                              manualPrices: currentManualPrices.slice(0, maxNum)
                            }));
                          } else {
                            setForm(p => ({ ...p, maximum: newMaximum }));
                          }
                        }
                      }} 
                      placeholder="Number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Manual Or Multiply structure?</Label>
                    <RadioGroup
                      value={form.pricingStructure}
                      onValueChange={(value: "manual" | "multiply") => {
                        setForm(p => ({ ...p, pricingStructure: value }));
                        
                        // If switching to multiply and maximum is set, auto-multiply
                        if (value === "multiply" && form.maximum) {
                          const maxNum = Number(form.maximum) || 1;
                          const basePrice = Number(form.price) || 0;
                          const baseTimeHours = Number(form.timeHours) || 0;
                          const baseTimeMinutes = Number(form.timeMinutes) || 0;
                          const totalBaseMinutes = baseTimeHours * 60 + baseTimeMinutes;
                          
                          const multipliedPrice = basePrice * maxNum;
                          const multipliedMinutes = totalBaseMinutes * maxNum;
                          const multipliedHours = Math.floor(multipliedMinutes / 60);
                          const remainingMinutes = multipliedMinutes % 60;
                          
                          setForm(p => ({ 
                            ...p, 
                            pricingStructure: value,
                            price: String(multipliedPrice),
                            timeHours: String(multipliedHours),
                            timeMinutes: String(remainingMinutes)
                          }));
                        }
                      }}
                      className="flex gap-4"
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="multiply" /> Multiply
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="manual" /> Manual
                      </label>
                    </RadioGroup>
                    {form.pricingStructure === "multiply" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        The system will automatically multiply the price and time evenly by the maximum number.
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-4">
                {form.qtyBased && form.pricingStructure === "manual" && Number(form.maximum) > 0 ? (
                  <div className="space-y-4">
                    <Label>Price & Time</Label>
                    {Array.from({ length: Number(form.maximum) }, (_, index) => (
                      <div key={index} className="space-y-2 p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground mb-3">
                          Pricing {index + 1}
                        </div>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <div className="space-y-2">
                              <Label htmlFor={`price-${index}`}>Pricing</Label>
                              <div className="relative w-24">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input 
                                  id={`price-${index}`}
                                  type="number" 
                                  step="0.01"
                                  min="0"
                                  value={form.manualPrices[index]?.price || ""}
                                  onChange={(e) => {
                                    const newManualPrices = [...(form.manualPrices || [])];
                                    if (!newManualPrices[index]) {
                                      newManualPrices[index] = { price: "", timeHours: "", timeMinutes: "" };
                                    }
                                    newManualPrices[index].price = e.target.value;
                                    setForm(p => ({ ...p, manualPrices: newManualPrices }));
                                  }}
                                  placeholder=""
                                  className="pl-7"
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Time</Label>
                              <div className="flex gap-1 w-auto">
                                <div className="w-24">
                                  <Input 
                                    id={`hours-${index}`}
                                    type="number" 
                                    min="0"
                                    value={form.manualPrices[index]?.timeHours || ""}
                                    onChange={(e) => {
                                      const newManualPrices = [...(form.manualPrices || [])];
                                      if (!newManualPrices[index]) {
                                        newManualPrices[index] = { price: "", timeHours: "", timeMinutes: "" };
                                      }
                                      newManualPrices[index].timeHours = e.target.value;
                                      setForm(p => ({ ...p, manualPrices: newManualPrices }));
                                    }}
                                    placeholder=""
                                    className="text-center"
                                  />
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground px-1">hours</div>
                                <div className="w-24">
                                  <Input 
                                    id={`minutes-${index}`}
                                    type="number" 
                                    min="0"
                                    max="59"
                                    value={form.manualPrices[index]?.timeMinutes || ""}
                                    onChange={(e) => {
                                      const newManualPrices = [...(form.manualPrices || [])];
                                      if (!newManualPrices[index]) {
                                        newManualPrices[index] = { price: "", timeHours: "", timeMinutes: "" };
                                      }
                                      newManualPrices[index].timeMinutes = e.target.value;
                                      setForm(p => ({ ...p, manualPrices: newManualPrices }));
                                    }}
                                    placeholder=""
                                    className="text-center"
                                  />
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground px-1">minutes</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="extra-price">Price</Label>
                          <div className="relative w-24">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input 
                              id="extra-price" 
                              type="number" 
                              step="0.01"
                              min="0"
                              value={form.price} 
                              onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))} 
                              placeholder=""
                              className="pl-7"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Time</Label>
                          <div className="flex gap-1 w-auto">
                            <div className="w-24">
                              <Input 
                                id="time-hours" 
                                type="number" 
                                min="0"
                                value={form.timeHours} 
                                onChange={(e) => setForm(p => ({ ...p, timeHours: e.target.value }))} 
                                placeholder=""
                                className="text-center"
                              />
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground px-1">hours</div>
                            <div className="w-24">
                              <Input 
                                id="time-minutes" 
                                type="number" 
                                min="0"
                                max="59"
                                value={form.timeMinutes} 
                                onChange={(e) => setForm(p => ({ ...p, timeMinutes: e.target.value }))} 
                                placeholder=""
                                className="text-center"
                              />
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground px-1">minutes</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Apply to</Label>
                <RadioGroup
                  value={form.applyToAllBookings ? "all" : "first"}
                  onValueChange={(value) => setForm(p => ({ ...p, applyToAllBookings: value === "all" }))}
                  className="flex gap-4"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="all" /> Apply to all bookings
                    <div className="relative group">
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        This extra will be applied to all bookings in the service
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="first" /> Apply only to the first appointment
                    <div className="relative group">
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        This extra will only be applied to the first appointment in the service
                      </div>
                    </div>
                  </label>
                </RadioGroup>
              </div>

            </TabsContent>

            {/* DEPENDENCIES TAB */}
            <TabsContent value="dependencies" className="mt-4 space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Form 1</h3>
                
                <div className="space-y-2">
                  <Label>Should the extras show based on the frequency?</Label>
                  <RadioGroup
                    value={form.showBasedOnFrequency ? "yes" : "no"}
                    onValueChange={(v) => setForm(p => ({ ...p, showBasedOnFrequency: v === "yes" }))}
                    className="flex gap-4"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="yes" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" /> No
                    </label>
                  </RadioGroup>
                  
                  {form.showBasedOnFrequency && (
                    <div className="ml-6 mt-3 space-y-2">
                      <Label className="text-sm">Select frequency options</Label>
                      <div className="space-y-2">
                        {availableFrequencies.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No frequencies available. Add frequencies from the pricing parameters section.</p>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="select-all-frequencies"
                                checked={form.frequencyOptions.length === availableFrequencies.length && availableFrequencies.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setForm(p => ({ ...p, frequencyOptions: [...availableFrequencies] }));
                                  } else {
                                    setForm(p => ({ ...p, frequencyOptions: [] }));
                                  }
                                }}
                              />
                              <Label htmlFor="select-all-frequencies" className="text-sm font-medium cursor-pointer">Select All</Label>
                            </div>
                            {availableFrequencies.map((frequency) => (
                              <div key={frequency} className="flex items-center gap-2">
                                <Checkbox
                                  id={`frequency-${frequency}`}
                                  checked={form.frequencyOptions.includes(frequency)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setForm(p => ({ ...p, frequencyOptions: [...p.frequencyOptions, frequency] }));
                                    } else {
                                      setForm(p => ({ ...p, frequencyOptions: p.frequencyOptions.filter(f => f !== frequency) }));
                                    }
                                  }}
                                />
                                <Label htmlFor={`frequency-${frequency}`} className="text-sm font-normal cursor-pointer">{frequency}</Label>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Should the extras show based on the service category?</Label>
                  <RadioGroup
                    value={form.showBasedOnServiceCategory ? "yes" : "no"}
                    onValueChange={(v) => setForm(p => ({ ...p, showBasedOnServiceCategory: v === "yes" }))}
                    className="flex gap-4"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="yes" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" /> No
                    </label>
                  </RadioGroup>
                  
                  {form.showBasedOnServiceCategory && (
                    <div className="ml-6 mt-3 space-y-2">
                      <Label className="text-sm">Select service category options</Label>
                      <div className="space-y-2">
                        {availableServiceCategories.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No service categories available. Add service categories from the service category section.</p>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="select-all-service-categories"
                                checked={form.serviceCategoryOptions.length === availableServiceCategories.length && availableServiceCategories.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setForm(p => ({ ...p, serviceCategoryOptions: [...availableServiceCategories] }));
                                  } else {
                                    setForm(p => ({ ...p, serviceCategoryOptions: [] }));
                                  }
                                }}
                              />
                              <Label htmlFor="select-all-service-categories" className="text-sm font-medium cursor-pointer">Select All</Label>
                            </div>
                            {availableServiceCategories.map((category) => (
                              <div key={category} className="flex items-center gap-2">
                                <Checkbox
                                  id={`service-category-${category}`}
                                  checked={form.serviceCategoryOptions.includes(category)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setForm(p => ({ ...p, serviceCategoryOptions: [...p.serviceCategoryOptions, category] }));
                                    } else {
                                      setForm(p => ({ ...p, serviceCategoryOptions: p.serviceCategoryOptions.filter(c => c !== category) }));
                                    }
                                  }}
                                />
                                <Label htmlFor={`service-category-${category}`} className="text-sm font-normal cursor-pointer">{category}</Label>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Should the extras show based on the variables?</Label>
                  <RadioGroup
                    value={form.showBasedOnVariables ? "yes" : "no"}
                    onValueChange={(v) => setForm(p => ({ ...p, showBasedOnVariables: v === "yes" }))}
                    className="flex gap-4"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="yes" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" /> No
                    </label>
                  </RadioGroup>
                  
                  {form.showBasedOnVariables && (
                    <div className="ml-6 mt-3 space-y-2">
                      <Label className="text-sm">Select variable options</Label>
                      <div className="space-y-2">
                        {Object.keys(availableVariables).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No variables available. Add variables from the pricing parameters section.</p>
                        ) : (
                          <div className="space-y-4">
                            {/* Group variables by category */}
                            {['Bathroom', 'Sq Ft', 'Bedroom'].map(category => {
                              const categoryParams = availableVariables[category] || [];
                              if (categoryParams.length === 0) return null;
                              
                              return (
                                <div key={category} className="space-y-2">
                                  <Label className="text-sm font-semibold">{category}</Label>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`select-all-extra-${category.toLowerCase().replace(' ', '-')}`}
                                      checked={form.variableOptions.filter(v => v.startsWith(`${category}:`)).length === categoryParams.length && categoryParams.length > 0}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          const categoryVariableOptions = categoryParams.map(param => `${category}:${param.name}`);
                                          setForm(p => ({ 
                                            ...p, 
                                            variableOptions: [...p.variableOptions.filter(v => !v.startsWith(`${category}:`)), ...categoryVariableOptions]
                                          }));
                                        } else {
                                          setForm(p => ({ 
                                            ...p, 
                                            variableOptions: p.variableOptions.filter(v => !v.startsWith(`${category}:`))
                                          }));
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`select-all-extra-${category.toLowerCase().replace(' ', '-')}`} className="text-sm cursor-pointer">Select All</Label>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2">
                                    {categoryParams.map((param) => (
                                      <div key={param.id} className="flex items-center gap-2">
                                        <Checkbox
                                          id={`extra-variable-${param.id}`}
                                          checked={form.variableOptions.includes(`${category}:${param.name}`)}
                                          onCheckedChange={(checked) => {
                                            const variableOption = `${category}:${param.name}`;
                                            if (checked) {
                                              setForm(p => ({ ...p, variableOptions: [...p.variableOptions, variableOption] }));
                                            } else {
                                              setForm(p => ({ ...p, variableOptions: p.variableOptions.filter(v => v !== variableOption) }));
                                            }
                                          }}
                                        />
                                        <Label htmlFor={`extra-variable-${param.id}`} className="text-sm cursor-pointer">{param.name}</Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </TabsContent>

            {/* PROVIDERS TAB */}
            <TabsContent value="providers" className="mt-4 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Check the providers you want to exclude from this extra.
                </p>
                
                {providers.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No providers added yet. Add providers from the Providers section in the admin dashboard.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <Label>Providers</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-providers"
                          checked={form.excludedProviders.length === providers.length && providers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, excludedProviders: providers.map(pr => pr.id) }));
                            } else {
                              setForm(p => ({ ...p, excludedProviders: [] }));
                            }
                          }}
                        />
                        <Label htmlFor="select-all-providers" className="text-sm font-medium cursor-pointer">Select All</Label>
                      </div>
                      {providers.map((provider) => (
                        <div key={provider.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`provider-${provider.id}`}
                            checked={form.excludedProviders.includes(provider.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, excludedProviders: [...p.excludedProviders, provider.id] }));
                              } else {
                                setForm(p => ({ ...p, excludedProviders: p.excludedProviders.filter(c => c !== provider.id) }));
                              }
                            }}
                          />
                          <Label htmlFor={`provider-${provider.id}`} className="text-sm font-normal cursor-pointer">{provider.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => router.push(`/admin/settings/industries/form-1/extras?industry=${encodeURIComponent(industry)}`)}
            >
              Cancel
            </Button>
            <Button 
              onClick={save}
              disabled={saving}
              className="text-white" 
              style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
            >
              {saving ? "Saving..." : editId ? "Save" : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
