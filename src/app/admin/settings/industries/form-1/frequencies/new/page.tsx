"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusiness } from "@/contexts/BusinessContext";

interface Industry {
  id: string;
  name: string;
  description: string | null;
  business_id: string;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export default function FrequencyNewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const editId = params.get("editId") ? Number(params.get("editId")) : null;
  const { currentBusiness } = useBusiness();

  type LocationRow = {
    id: string;
    name: string;
    city?: string;
    state?: string;
    postal_code?: string;
    address?: string;
    active?: boolean;
  };

  type Row = {
    id: number;
    name: string;
    discount: number;
    discountType?: "%" | "$";
    display: "Both" | "Booking" | "Quote";
    isDefault?: boolean;
    description?: string;
    differentOnCustomerEnd?: boolean;
    showExplanation?: boolean;
    enablePopup?: boolean;
    occurrenceTime?: string;
    excludedProviders?: string[];
    // Dependencies
    addToOtherIndustries?: boolean;
    enabledIndustries?: string[];
    showBasedOnLocation?: boolean;
    locationIds?: string[];
    serviceCategories?: string[];
    bathroomVariables?: string[];
    sqftVariables?: string[];
    bedroomVariables?: string[];
    excludeParameters?: string[];
    extras?: string[];
  };
  const [loadingFrequency, setLoadingFrequency] = useState(false);
  
  // Dynamic data states
  const [pricingParameters, setPricingParameters] = useState<any[]>([]);
  const [loadingPricingParams, setLoadingPricingParams] = useState(true);
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [excludeParameters, setExcludeParameters] = useState<any[]>([]);
  const [extras, setExtras] = useState<any[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  const [form, setForm] = useState({
    name: "",
    description: "",
    differentOnCustomerEnd: false,
    showExplanation: false,
    enablePopup: false,
    display: "Both" as Row["display"],
    occurrenceTime: "",
    discount: "0",
    discountType: "%" as Row["discountType"],
    isDefault: false,
    excludedProviders: [] as string[],
    // Dependencies
    addToOtherIndustries: false,
    enabledIndustries: [] as string[],
    showBasedOnLocation: false,
    locationIds: [] as string[],
    serviceCategories: [] as string[],
    bathroomVariables: [] as string[],
    sqftVariables: [] as string[],
    bedroomVariables: [] as string[],
    excludeParameters: [] as string[],
    extras: [] as string[],
  });

  const [errors, setErrors] = useState({
    name: "",
    discount: "",
    occurrenceTime: "",
  });

  const [touched, setTouched] = useState({
    name: false,
    discount: false,
    occurrenceTime: false,
  });

  // Fetch providers from localStorage
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  
  // Load data for dependencies
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [serviceCategories, setServiceCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  
  const bathroomOptions = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5"];
  const sqftOptions = [
    "1 - 1249 Sq Ft", "1250 - 1499 Sq Ft", "1500 - 1799 Sq Ft", "1800 - 2099 Sq Ft",
    "2100 - 2399 Sq Ft", "2400 - 2699 Sq Ft", "2700 - 3000 Sq Ft", "3000 - 3299 Sq Ft",
    "3300 - 3699 Sq Ft", "3700 - 3999", "4000+"
  ];
  const bedroomOptions = ["0", "1", "2", "3", "4", "5"];

  useEffect(() => {
    const fetchFrequency = async () => {
      if (!editId || !industryId) return;
      
      try {
        setLoadingFrequency(true);
        const response = await fetch(`/api/industry-frequency?industryId=${industryId}`);
        const data = await response.json();
        
        if (response.ok && data.frequencies) {
          const existing = data.frequencies.find((f: any) => f.id === editId);
          if (existing) {
            setForm({
              name: existing.name,
              description: existing.description || "",
              differentOnCustomerEnd: !!existing.different_on_customer_end,
              showExplanation: !!existing.show_explanation,
              enablePopup: !!existing.enable_popup,
              display: existing.display,
              occurrenceTime: existing.occurrence_time || "",
              discount: String(existing.discount ?? 0),
              discountType: existing.discount_type || "%",
              isDefault: !!existing.is_default,
              excludedProviders: existing.excluded_providers || [],
              addToOtherIndustries: !!existing.add_to_other_industries,
              enabledIndustries: existing.enabled_industries || [],
              showBasedOnLocation: !!existing.show_based_on_location,
              locationIds: existing.location_ids || [],
              serviceCategories: existing.service_categories || [],
              bathroomVariables: existing.bathroom_variables || [],
              sqftVariables: existing.sqft_variables || [],
              bedroomVariables: existing.bedroom_variables || [],
              excludeParameters: existing.exclude_parameters || [],
              extras: existing.extras || [],
            });
          }
        }
      } catch (error) {
        console.error('Error fetching frequency:', error);
      } finally {
        setLoadingFrequency(false);
      }
    };

    fetchFrequency();
  }, [editId, industryId]);

  // Load industries from API
  useEffect(() => {
    const fetchIndustries = async () => {
      if (!currentBusiness) {
        setLoadingIndustries(false);
        return;
      }
      
      try {
        setLoadingIndustries(true);
        const response = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const data = await response.json();
        
        if (response.ok && data.industries) {
          setIndustries(data.industries);
          // Find the current industry ID
          const currentIndustry = data.industries.find((ind: Industry) => ind.name === industry);
          if (currentIndustry) {
            setIndustryId(currentIndustry.id);
          }
        }
      } catch (error) {
        console.error('Error fetching industries:', error);
      } finally {
        setLoadingIndustries(false);
      }
    };

    fetchIndustries();
  }, [currentBusiness, industry]);

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
  
  // Load service categories from localStorage
  useEffect(() => {
    try {
      const categoriesKey = `service_categories_${industry}`;
      const storedCategories = JSON.parse(localStorage.getItem(categoriesKey) || "[]");
      if (Array.isArray(storedCategories)) {
        setServiceCategories(storedCategories.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // ignore
    }
  }, [industry]);

  // Load extras from API
  useEffect(() => {
    const fetchExtras = async () => {
      if (!industryId) {
        setLoadingExtras(false);
        return;
      }
      
      try {
        setLoadingExtras(true);
        const response = await fetch(`/api/extras?industryId=${industryId}`);
        const data = await response.json();
        
        if (response.ok && data.extras) {
          setExtras(data.extras.map((e: any) => ({ id: e.id, name: e.name })));
        }
      } catch (error) {
        console.error('Error fetching extras:', error);
      } finally {
        setLoadingExtras(false);
      }
    };

    fetchExtras();
  }, [industryId]);

  useEffect(() => {
    try {
      const locationsKey = `locations_${industry}`;
      const storedLocations = JSON.parse(localStorage.getItem(locationsKey) || "[]");
      if (Array.isArray(storedLocations)) {
        setLocations(
          storedLocations.map((loc: any) => ({
            id: String(loc.id),
            name: String(loc.name || ""),
            city: loc.city || undefined,
            state: loc.state || undefined,
            postal_code: loc.postal_code || loc.postalCode || undefined,
            address: loc.address || undefined,
            active: typeof loc.active === "boolean" ? loc.active : undefined,
          })),
        );
      }
    } catch {
      // ignore
    }
  }, [industry]);

  // Load pricing parameters from API
  useEffect(() => {
    const fetchPricingParameters = async () => {
      if (!industryId) {
        setLoadingPricingParams(false);
        return;
      }
      
      try {
        setLoadingPricingParams(true);
        const response = await fetch(`/api/pricing-parameters?industryId=${industryId}`);
        const data = await response.json();
        
        if (response.ok && data.pricingParameters) {
          setPricingParameters(data.pricingParameters);
        }
      } catch (error) {
        console.error('Error fetching pricing parameters:', error);
      } finally {
        setLoadingPricingParams(false);
      }
    };

    fetchPricingParameters();
  }, [industryId]);

  // Load exclude parameters from localStorage
  useEffect(() => {
    try {
      const excludeParamsKey = `excludeParameters_${industry}`;
      const storedExcludeParams = JSON.parse(localStorage.getItem(excludeParamsKey) || "[]");
      if (Array.isArray(storedExcludeParams)) {
        setExcludeParameters(storedExcludeParams);
      }
    } catch {
      // ignore
    }
  }, [industry]);


  useEffect(() => {
    if (!form.showBasedOnLocation && form.locationIds.length > 0) {
      setForm(p => ({ ...p, locationIds: [] }));
    }
  }, [form.showBasedOnLocation, form.locationIds.length]);

  const validateField = (fieldName: string, value: string) => {
    let error = "";
    
    if (fieldName === "name") {
      if (!value.trim()) {
        error = "Name is required";
      }
    } else if (fieldName === "discount") {
      const discountValue = Number(value);
      if (isNaN(discountValue) || value.trim() === "") {
        error = "Discount must be a valid number";
      } else if (discountValue < 0) {
        error = "Discount cannot be negative";
      }
    } else if (fieldName === "occurrenceTime") {
      if (!value || value.trim() === "") {
        error = "Occurrence time is required";
      }
    }
    
    setErrors(prev => ({ ...prev, [fieldName]: error }));
    return error === "";
  };

  const validateForm = () => {
    const nameValid = validateField("name", form.name);
    const discountValid = validateField("discount", form.discount);
    const occurrenceTimeValid = validateField("occurrenceTime", form.occurrenceTime);
    
    setTouched({ name: true, discount: true, occurrenceTime: true });
    
    return nameValid && discountValid && occurrenceTimeValid;
  };

  const save = async () => {
    if (!validateForm()) {
      return;
    }

    if (!currentBusiness || !industryId) {
      alert('Business or Industry information is missing. Please try again.');
      return;
    }
    
    const discount = Number(form.discount) || 0;

    const frequencyData = {
      business_id: currentBusiness.id,
      industry_id: industryId,
      name: form.name.trim(),
      description: form.description,
      different_on_customer_end: form.differentOnCustomerEnd,
      show_explanation: form.showExplanation,
      enable_popup: form.enablePopup,
      display: form.display,
      occurrence_time: form.occurrenceTime,
      discount,
      discount_type: form.discountType,
      is_default: form.isDefault,
      excluded_providers: form.excludedProviders,
      add_to_other_industries: form.addToOtherIndustries,
      enabled_industries: form.enabledIndustries,
      show_based_on_location: form.showBasedOnLocation,
      location_ids: form.showBasedOnLocation ? form.locationIds : [],
      service_categories: form.serviceCategories,
      bathroom_variables: form.bathroomVariables,
      sqft_variables: form.sqftVariables,
      bedroom_variables: form.bedroomVariables,
      exclude_parameters: form.excludeParameters,
      extras: form.extras,
    };

    try {
      if (editId) {
        const response = await fetch('/api/industry-frequency', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...frequencyData }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(`Failed to update frequency: ${error.error}`);
          return;
        }
      } else {
        const response = await fetch('/api/industry-frequency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(frequencyData),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(`Failed to create frequency: ${error.error}`);
          return;
        }
      }

      router.push(`/admin/settings/industries/form-1/frequencies?industry=${encodeURIComponent(industry)}`);
    } catch (error) {
      console.error('Error saving frequency:', error);
      alert('An error occurred while saving the frequency. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Frequency" : "Add Frequency"}</CardTitle>
          <CardDescription>Configure a frequency option for {industry}.</CardDescription>
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
                <Label htmlFor="freq-name">Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="freq-name" 
                  value={form.name} 
                  onChange={(e) => {
                    setForm(p => ({ ...p, name: e.target.value }));
                    if (touched.name) {
                      validateField("name", e.target.value);
                    }
                  }}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, name: true }));
                    validateField("name", form.name);
                  }}
                  placeholder="Ex. Weekly"
                  className={touched.name && errors.name ? "border-red-500" : ""}
                />
                {touched.name && errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="diff-customer" checked={form.differentOnCustomerEnd} onCheckedChange={(v) => setForm(p => ({ ...p, differentOnCustomerEnd: !!v }))} />
                <Label htmlFor="diff-customer" className="text-sm">Different on customer end</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="freq-desc">Description</Label>
                <Textarea id="freq-desc" rows={3} value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Add Description" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.showExplanation} onCheckedChange={(v) => setForm(p => ({ ...p, showExplanation: !!v }))} />
                  Show explanation icon on form
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.enablePopup} onCheckedChange={(v) => setForm(p => ({ ...p, enablePopup: !!v }))} />
                  Enable popup on selection
                </label>
              </div>
              <div className="space-y-2">
                <Label>Display</Label>
                <RadioGroup
                  value={form.display}
                  onValueChange={(v: Row["display"]) => setForm(p => ({ ...p, display: v }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="Both" /> Customer frontend, backend & admin</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="Booking" /> Customer backend & admin</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="Quote" /> Admin only</label>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Set occurrence time <span className="text-red-500">*</span></Label>
                <Select 
                  value={form.occurrenceTime} 
                  onValueChange={(v) => {
                    setForm(p => ({ ...p, occurrenceTime: v }));
                    setTouched(prev => ({ ...prev, occurrenceTime: true }));
                    validateField("occurrenceTime", v);
                  }}
                >
                  <SelectTrigger className={`w-full ${touched.occurrenceTime && errors.occurrenceTime ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onetime">One time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
                {touched.occurrenceTime && errors.occurrenceTime && (
                  <p className="text-sm text-red-500">{errors.occurrenceTime}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="freq-discount">Discount <span className="text-red-500">*</span></Label>
                  <Input 
                    id="freq-discount" 
                    type="number" 
                    value={form.discount} 
                    onChange={(e) => {
                      setForm(p => ({ ...p, discount: e.target.value }));
                      if (touched.discount) {
                        validateField("discount", e.target.value);
                      }
                    }}
                    onBlur={() => {
                      setTouched(prev => ({ ...prev, discount: true }));
                      validateField("discount", form.discount);
                    }}
                    className={touched.discount && errors.discount ? "border-red-500" : ""}
                  />
                  {touched.discount && errors.discount && (
                    <p className="text-sm text-red-500">{errors.discount}</p>
                  )}
                </div>
                <div>
                  <Select value={form.discountType} onValueChange={(v: Row["discountType"]) => setForm(p => ({ ...p, discountType: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="%">%</SelectItem>
                      <SelectItem value="$">$</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="default" checked={form.isDefault} onCheckedChange={(v) => setForm(p => ({ ...p, isDefault: !!v }))} />
                <Label htmlFor="default" className="text-sm">Default</Label>
              </div>
            </TabsContent>

            {/* DEPENDENCIES TAB */}
            <TabsContent value="dependencies" className="mt-4 space-y-6">
              {/* Add to Other Industries */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Would you like to add this frequency to other industries?</Label>
                  <RadioGroup
                    value={form.addToOtherIndustries ? "yes" : "no"}
                    onValueChange={(v) => setForm(p => ({ ...p, addToOtherIndustries: v === "yes" }))}
                    className="mt-3 flex gap-4"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="yes" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" /> No
                    </label>
                  </RadioGroup>
                </div>

                {form.addToOtherIndustries && (
                  <div className="pl-4 border-l-2 border-muted space-y-3">
                    <Label className="text-sm font-medium">Select Industries</Label>
                    {loadingIndustries ? (
                      <p className="text-sm text-muted-foreground italic py-2">
                        Loading industries...
                      </p>
                    ) : industries.filter(ind => ind.name !== industry).length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-2">
                        No other industries available. Add industries from the admin portal first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {industries.filter(ind => ind.name !== industry).map((ind) => (
                          <div key={ind.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`industry-${ind.id}`}
                              checked={form.enabledIndustries.includes(ind.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, enabledIndustries: [...p.enabledIndustries, ind.name] }));
                                } else {
                                  setForm(p => ({ ...p, enabledIndustries: p.enabledIndustries.filter(i => i !== ind.name) }));
                                }
                              }}
                            />
                            <Label htmlFor={`industry-${ind.id}`} className="text-sm cursor-pointer">{ind.name}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-1">{industry}</h3>
                  <p className="text-sm text-muted-foreground">Form 1</p>
                </div>

                {/* Location-based Display */}
                <div className="space-y-3 mb-6">
                  <Label className="text-base font-semibold">Should the frequency show based on the location?</Label>
                  <RadioGroup
                    value={form.showBasedOnLocation ? "yes" : "no"}
                    onValueChange={(v) => setForm(p => ({ ...p, showBasedOnLocation: v === "yes" }))}
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

                {form.showBasedOnLocation && (
                  <div className="space-y-3 mb-6">
                    <Label className="text-base font-semibold">Locations</Label>
                    {locations.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No locations added yet. Add locations from the Locations section.
                      </p>
                    ) : (
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all-locations"
                            checked={form.locationIds.length === locations.length && locations.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, locationIds: locations.map(l => l.id) }));
                              } else {
                                setForm(p => ({ ...p, locationIds: [] }));
                              }
                            }}
                          />
                          <Label htmlFor="select-all-locations" className="text-sm font-medium cursor-pointer">Select All</Label>
                        </div>
                        {locations.map((loc) => (
                          <div key={loc.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`location-${loc.id}`}
                              checked={form.locationIds.includes(loc.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, locationIds: [...p.locationIds, loc.id] }));
                                } else {
                                  setForm(p => ({ ...p, locationIds: p.locationIds.filter(id => id !== loc.id) }));
                                }
                              }}
                            />
                            <Label htmlFor={`location-${loc.id}`} className="text-sm cursor-pointer">{loc.name}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Service Category */}
                <div className="space-y-3 mb-6">
                  <Label className="text-base font-semibold">Service Category</Label>
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-categories"
                        checked={form.serviceCategories.length === serviceCategories.length && serviceCategories.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setForm(p => ({ ...p, serviceCategories: serviceCategories.map(c => String(c.id)) }));
                          } else {
                            setForm(p => ({ ...p, serviceCategories: [] }));
                          }
                        }}
                      />
                      <Label htmlFor="select-all-categories" className="text-sm font-medium cursor-pointer">Select All</Label>
                    </div>
                    {serviceCategories.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-${cat.id}`}
                          checked={form.serviceCategories.includes(String(cat.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, serviceCategories: [...p.serviceCategories, String(cat.id)] }));
                            } else {
                              setForm(p => ({ ...p, serviceCategories: p.serviceCategories.filter(c => c !== String(cat.id)) }));
                            }
                          }}
                        />
                        <Label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer">{cat.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Variables Section */}
                <div className="space-y-4 mb-6">
                  <div>
                    <Label className="text-base font-semibold">Variables</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select which variable(s) will display for this frequency. Any variables that have not been checked off in this section will not display when this frequency is selected on the booking form.
                    </p>
                  </div>

                  {loadingPricingParams ? (
                    <p className="text-sm text-muted-foreground italic">
                      Loading pricing parameters...
                    </p>
                  ) : pricingParameters.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No pricing parameters added yet. Add pricing parameters from the Pricing section.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          id="select-all-variables"
                          checked={form.bathroomVariables.length + form.sqftVariables.length + form.bedroomVariables.length === pricingParameters.length && pricingParameters.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ 
                                ...p, 
                                bathroomVariables: pricingParameters.filter(v => v.variable_category === "Bathroom").map(v => v.name),
                                sqftVariables: pricingParameters.filter(v => v.variable_category === "Sq Ft").map(v => v.name),
                                bedroomVariables: pricingParameters.filter(v => v.variable_category === "Bedroom").map(v => v.name)
                              }));
                            } else {
                              setForm(p => ({ ...p, bathroomVariables: [], sqftVariables: [], bedroomVariables: [] }));
                            }
                          }}
                        />
                        <Label htmlFor="select-all-variables" className="text-sm cursor-pointer">Select All</Label>
                      </div>
                      
                      {/* Group parameters by category */}
                      {['Bathroom', 'Sq Ft', 'Bedroom'].map(category => {
                        const categoryParams = pricingParameters.filter(v => v.variable_category === category);
                        if (categoryParams.length === 0) return null;
                        
                        return (
                          <div key={category} className="space-y-2">
                            <Label className="text-sm font-semibold">{category}</Label>
                            <div className="grid grid-cols-4 gap-2">
                              {categoryParams.map((param) => (
                                <div key={param.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`param-${param.id}`}
                                    checked={
                                      category === 'Bathroom' ? form.bathroomVariables.includes(param.name) :
                                      category === 'Sq Ft' ? form.sqftVariables.includes(param.name) :
                                      form.bedroomVariables.includes(param.name)
                                    }
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        if (category === 'Bathroom') {
                                          setForm(p => ({ ...p, bathroomVariables: [...p.bathroomVariables, param.name] }));
                                        } else if (category === 'Sq Ft') {
                                          setForm(p => ({ ...p, sqftVariables: [...p.sqftVariables, param.name] }));
                                        } else {
                                          setForm(p => ({ ...p, bedroomVariables: [...p.bedroomVariables, param.name] }));
                                        }
                                      } else {
                                        if (category === 'Bathroom') {
                                          setForm(p => ({ ...p, bathroomVariables: p.bathroomVariables.filter(v => v !== param.name) }));
                                        } else if (category === 'Sq Ft') {
                                          setForm(p => ({ ...p, sqftVariables: p.sqftVariables.filter(v => v !== param.name) }));
                                        } else {
                                          setForm(p => ({ ...p, bedroomVariables: p.bedroomVariables.filter(v => v !== param.name) }));
                                        }
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`param-${param.id}`} className="text-sm cursor-pointer">{param.name}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Exclude Parameters */}
                <div className="space-y-3 mb-6">
                  <Label className="text-base font-semibold">Exclude Parameters</Label>
                  <p className="text-sm text-muted-foreground">
                    Select which exclusion parameter(s) will display for this frequency. Any exclusion parameters that have not been checked off in this section will not display when this frequency is selected on the booking form.
                  </p>
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-exclude"
                        checked={form.excludeParameters.length === excludeParameters.length && excludeParameters.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setForm(p => ({ ...p, excludeParameters: excludeParameters.map(param => param.name) }));
                          } else {
                            setForm(p => ({ ...p, excludeParameters: [] }));
                          }
                        }}
                      />
                      <Label htmlFor="select-all-exclude" className="text-sm font-medium cursor-pointer">Select All</Label>
                    </div>
                    {excludeParameters.map((param) => (
                      <div key={param.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`exclude-${param.id}`}
                          checked={form.excludeParameters.includes(param.name)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, excludeParameters: [...p.excludeParameters, param.name] }));
                            } else {
                              setForm(p => ({ ...p, excludeParameters: p.excludeParameters.filter(e => e !== param.name) }));
                            }
                          }}
                        />
                        <Label htmlFor={`exclude-${param.id}`} className="text-sm cursor-pointer">{param.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Extras */}
                <div className="space-y-3 mb-6">
                  <Label className="text-base font-semibold">Extras</Label>
                  <p className="text-sm text-muted-foreground">
                    Select which extra(s) will display for frequency. Any extras that have not been checked off in this section will not display when frequency is selected on the booking form.
                  </p>
                  {loadingExtras ? (
                    <p className="text-sm text-muted-foreground italic">
                      Loading extras...
                    </p>
                  ) : extras.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No extras added yet. Add extras from the Extras section.
                    </p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-extras"
                          checked={form.extras.length === extras.length && extras.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, extras: extras.map(e => String(e.id)) }));
                            } else {
                              setForm(p => ({ ...p, extras: [] }));
                            }
                          }}
                        />
                        <Label htmlFor="select-all-extras" className="text-sm font-medium cursor-pointer">Select All</Label>
                      </div>
                      {extras.map((extra) => (
                        <div key={extra.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`extra-${extra.id}`}
                            checked={form.extras.includes(String(extra.id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, extras: [...p.extras, String(extra.id)] }));
                              } else {
                                setForm(p => ({ ...p, extras: p.extras.filter(e => e !== String(extra.id)) }));
                              }
                            }}
                          />
                          <Label htmlFor={`extra-${extra.id}`} className="text-sm cursor-pointer">{extra.name}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* PROVIDERS TAB */}
            <TabsContent value="providers" className="mt-4 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Check the providers you want to exclude from this frequency.
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
            <Button variant="outline" onClick={() => router.push(`/admin/settings/industries/form-1/frequencies?industry=${encodeURIComponent(industry)}`)}>Cancel</Button>
            <Button onClick={save} className="text-white" style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}>{editId ? "Save" : "Create"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
