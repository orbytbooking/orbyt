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
import { useToast } from "@/hooks/use-toast";

type PricingRow = {
  id: number;
  name: string;
  price: number;
  time: string;
  display: "Customer Frontend, Backend & Admin" | "Customer Backend & Admin" | "Admin Only";
  serviceCategory: string;
  serviceCategory2: string;
  frequency: string;
  variableCategory: string;
  description: string;
  isDefault: boolean;
  showBasedOnFrequency: boolean;
  showBasedOnServiceCategory: boolean;
  showBasedOnServiceCategory2: boolean;
  excludedExtras: number[];
  excludedServices: number[];
  excludedProviders?: string[];
};

type PricingVariable = {
  id: string;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
};

export default function PricingParameterNewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const industryId = params.get("industryId");
  const editId = params.get("editId");
  const editCategory = params.get("category") || "";
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [allRows, setAllRows] = useState<Record<string, PricingRow[]>>({});
  const [variables, setVariables] = useState<PricingVariable[]>([]);
  const [extras, setExtras] = useState<Array<{id: number; name: string}>>([]);
  const [services, setServices] = useState<Array<{id: number; name: string}>>([]);
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  const [serviceCategories, setServiceCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [frequencies, setFrequencies] = useState<Array<{ id: number; name: string }>>([]);
  const [excludeParameters, setExcludeParameters] = useState<Array<{ id: string; name: string; description: string }>>([]);

  const [form, setForm] = useState({
    variableCategory: "",
    name: "",
    description: "",
    display: "Customer Frontend, Backend & Admin" as "Customer Frontend, Backend & Admin" | "Customer Backend & Admin" | "Admin Only",
    price: "",
    hours: "",
    minutes: "",
    isDefault: false,
    showBasedOnFrequency: false,
    showBasedOnServiceCategory: false,
    showBasedOnServiceCategory2: false,
    excludedExtras: [] as number[],
    excludedServices: [] as number[],
    excludedProviders: [] as string[],
    excludeParameters: [] as string[],
    serviceCategory: [] as string[],
    serviceCategory2: [] as string[],
    frequency: [] as string[],
  });

  const [existingParameters, setExistingParameters] = useState<any[]>([]);

  const [validationErrors, setValidationErrors] = useState({
    variableCategory: "",
    name: "",
    price: "",
    hours: "",
    minutes: "",
  });

  const allDataKey = useMemo(() => `pricingParamsAll_${industry}`, [industry]);
  const variablesKey = useMemo(() => `pricingVariables_${industry}`, [industry]);
  const extrasKey = useMemo(() => `extras_${industry}`, [industry]);
  const servicesKey = useMemo(() => `service_categories_${industry}`, [industry]);

  // Load extras from backend
  useEffect(() => {
    const fetchExtras = async () => {
      if (!industryId) return;
      
      try {
        const response = await fetch(`/api/extras?industryId=${industryId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch extras');
        }
        const data = await response.json();
        
        if (data.extras && Array.isArray(data.extras)) {
          setExtras(data.extras.map((e: any) => ({ id: e.id, name: e.name })));
        } else {
          setExtras([]);
        }
      } catch (error) {
        console.error('Error fetching extras:', error);
        setExtras([]);
      }
    };

    fetchExtras();
  }, [industryId]);

  // Load service categories from backend
  useEffect(() => {
    const fetchServiceCategories = async () => {
      if (!industryId) return;
      
      try {
        const response = await fetch(`/api/service-categories?industryId=${industryId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch service categories');
        }
        const data = await response.json();
        
        if (data.serviceCategories && Array.isArray(data.serviceCategories)) {
          setServices(data.serviceCategories.map((s: any) => ({ id: s.id, name: s.name })));
          setServiceCategories(data.serviceCategories.map((s: any) => ({ id: s.id, name: s.name })));
          console.log("Loaded service categories from backend:", data.serviceCategories);
        } else {
          setServices([]);
          setServiceCategories([]);
        }
      } catch (error) {
        console.error('Error fetching service categories:', error);
        setServices([]);
        setServiceCategories([]);
      }
    };

    fetchServiceCategories();
  }, [industryId]);

  // Load frequencies from backend
  useEffect(() => {
    const fetchFrequencies = async () => {
      if (!industryId) return;
      
      try {
        const response = await fetch(`/api/industry-frequency?industryId=${industryId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch frequencies');
        }
        const data = await response.json();
        
        if (data.frequencies && Array.isArray(data.frequencies)) {
          setFrequencies(data.frequencies.map((f: any) => ({ id: f.id, name: f.name })));
          console.log("Loaded frequencies from backend:", data.frequencies);
        } else {
          setFrequencies([]);
        }
      } catch (error) {
        console.error('Error fetching frequencies:', error);
        setFrequencies([]);
      }
    };

    fetchFrequencies();
  }, [industryId]);

  // Load providers from backend
  useEffect(() => {
    const fetchProviders = async () => {
      if (!currentBusiness?.id) return;
      
      try {
        const response = await fetch(`/api/admin/providers?businessId=${currentBusiness.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch providers');
        }
        const data = await response.json();
        
        if (data.providers && Array.isArray(data.providers)) {
          setProviders(data.providers.map((p: any) => ({ id: p.id, name: p.name })));
        } else {
          setProviders([]);
        }
      } catch (error) {
        console.error('Error fetching providers:', error);
        setProviders([]);
      }
    };

    fetchProviders();
  }, [currentBusiness?.id]);

  useEffect(() => {
    // Load variables
    try {
      const storedVars = JSON.parse(localStorage.getItem(variablesKey) || "[]");
      if (Array.isArray(storedVars)) setVariables(storedVars);
    } catch (e) {
      console.error("Error loading variables:", e);
    }

    // Load all pricing data
    try {
      const storedData = JSON.parse(localStorage.getItem(allDataKey) || "{}");
      if (storedData && typeof storedData === "object") {
        setAllRows(storedData);
      }
    } catch (e) {
      console.error("Error loading pricing data:", e);
    }
  }, [allDataKey, variablesKey, industry]);

  // Load exclude parameters from backend
  useEffect(() => {
    const fetchExcludeParameters = async () => {
      if (!industryId) return;
      
      console.log('🔍 EXCLUDE PARAMETERS DEBUG');
      console.log('📥 industryId:', industryId);
      
      try {
        const response = await fetch(`/api/exclude-parameters?industryId=${industryId}`);
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('❌ Error response:', errorText);
          throw new Error('Failed to fetch exclude parameters');
        }
        
        const data = await response.json();
        console.log('📦 Raw API response:', data);
        console.log('📦 data.excludeParameters:', data.excludeParameters);
        console.log('📦 Array.isArray(data.excludeParameters):', Array.isArray(data.excludeParameters));
        
        if (data.excludeParameters && Array.isArray(data.excludeParameters)) {
          console.log('✅ Found exclude parameters array with', data.excludeParameters.length, 'items');
          data.excludeParameters.forEach((param: any, index: number) => {
            console.log(`  ${index + 1}.`, param);
          });
          
          setExcludeParameters(data.excludeParameters.map((p: any) => ({ 
            id: p.id, 
            name: p.name, 
            description: p.description || "" 
          })));
          console.log("✅ Loaded exclude parameters from backend:", data.excludeParameters);
        } else {
          console.log('❌ No exclude parameters found or invalid format');
          setExcludeParameters([]);
        }
      } catch (error) {
        console.error('💥 Error fetching exclude parameters:', error);
        setExcludeParameters([]);
      }
    };

    fetchExcludeParameters();
  }, [industryId]);

  useEffect(() => {
    // Load variables
    try {
      const storedVars = JSON.parse(localStorage.getItem(variablesKey) || "[]");
      if (Array.isArray(storedVars)) setVariables(storedVars);
    } catch (e) {
      console.error("Error loading variables:", e);
    }

    // Load all pricing data
    try {
      const storedData = JSON.parse(localStorage.getItem(allDataKey) || "{}");
      if (storedData && typeof storedData === "object") {
        setAllRows(storedData);
      }
    } catch (e) {
      console.error("Error loading pricing data:", e);
    }
  }, [allDataKey, variablesKey, industry]);

  // Fetch existing pricing parameters for validation and editing
  useEffect(() => {
    if (!industryId) return;

    const fetchExistingData = async () => {
      try {
        const response = await fetch(`/api/pricing-parameters?industryId=${industryId}`);
        const data = await response.json();
        
        if (data.pricingParameters) {
          setExistingParameters(data.pricingParameters);
          
          // If editing, populate the form
          if (editId) {
            const existing = data.pricingParameters.find((p: any) => p.id === editId);
            
            if (existing) {
              const hours = Math.floor(existing.time_minutes / 60);
              const minutes = existing.time_minutes % 60;

              setForm({
                variableCategory: existing.variable_category,
                name: existing.name,
                description: existing.description || "",
                display: existing.display,
                price: String(existing.price ?? 0),
                hours: String(hours),
                minutes: String(minutes),
                isDefault: existing.is_default || false,
                showBasedOnFrequency: existing.show_based_on_frequency || false,
                showBasedOnServiceCategory: existing.show_based_on_service_category || false,
                showBasedOnServiceCategory2: existing.show_based_on_service_category2 || false,
                excludedExtras: existing.excluded_extras || [],
                excludedServices: existing.excluded_services || [],
                excludedProviders: existing.excluded_providers || [],
                excludeParameters: existing.exclude_parameters || [],
                serviceCategory: existing.service_category ? existing.service_category.split(", ") : [],
                serviceCategory2: existing.service_category2 ? existing.service_category2.split(", ") : [],
                frequency: existing.frequency ? existing.frequency.split(", ") : [],
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching pricing parameters:', error);
        toast({
          title: "Error",
          description: "Failed to load pricing parameter data",
          variant: "destructive",
        });
      }
    };

    fetchExistingData();
  }, [editId, industryId]);

  // Real-time validation for variable category
  const validateVariableCategory = (value: string) => {
    if (!value.trim()) {
      return "Variable category is required";
    }
    return "";
  };

  // Real-time validation for name
  const validateName = (value: string) => {
    if (!value.trim()) {
      return "Name is required";
    }
    
    // Check for duplicate name in the same variable category
    if (form.variableCategory) {
      const duplicate = existingParameters.find(
        (p: any) => 
          p.variable_category === form.variableCategory && 
          p.name.toLowerCase() === value.trim().toLowerCase() &&
          p.id !== editId
      );
      
      if (duplicate) {
        return `A parameter with this name already exists in "${form.variableCategory}" category`;
      }
    }
    
    return "";
  };

  // Real-time validation for price
  const validatePrice = (value: string) => {
    if (!value.trim()) {
      return "Price is required";
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return "Price must be a valid number";
    }
    if (numValue < 0) {
      return "Price cannot be negative";
    }
    return "";
  };

  // Real-time validation for hours
  const validateHours = (value: string, minutesValue: string) => {
    if (value.trim()) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return "Hours must be a valid number";
      }
      if (numValue < 0) {
        return "Hours cannot be negative";
      }
    }
    return "";
  };

  // Real-time validation for minutes
  const validateMinutes = (value: string, hoursValue: string) => {
    if (value.trim()) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return "Minutes must be a valid number";
      }
      if (numValue < 0 || numValue > 59) {
        return "Minutes must be between 0 and 59";
      }
    }
    return "";
  };

  const save = async () => {
    if (!form.variableCategory || !form.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Variable category and name are required",
        variant: "destructive",
      });
      return;
    }

    if (!industryId) {
      toast({
        title: "Error",
        description: "Industry ID is missing",
        variant: "destructive",
      });
      return;
    }

    if (!currentBusiness?.id) {
      toast({
        title: "Error",
        description: "Business not found",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate name in the same variable category
    const duplicate = existingParameters.find(
      (p: any) => 
        p.variable_category === form.variableCategory && 
        p.name.toLowerCase() === form.name.trim().toLowerCase() &&
        p.id !== editId // Exclude current parameter when editing
    );

    if (duplicate) {
      toast({
        title: "Duplicate Parameter",
        description: `A parameter with the name "${form.name.trim()}" already exists in the "${form.variableCategory}" category. Please use a different name.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const price = Number(form.price) || 0;
      const hours = Number(form.hours) || 0;
      const minutes = Number(form.minutes) || 0;
      const timeMinutes = (hours * 60) + minutes;

      // Auto-set service category and frequency based on form state
      const serviceCategoryValue = form.showBasedOnServiceCategory ? form.serviceCategory.join(", ") : "";
      const serviceCategory2Value = form.showBasedOnServiceCategory2 ? form.serviceCategory2.join(", ") : "";
      const frequencyValue = form.showBasedOnFrequency ? form.frequency.join(", ") : "";

      console.log('=== SAVING PRICING PARAMETER DEBUG ===');
      console.log('showBasedOnFrequency:', form.showBasedOnFrequency);
      console.log('showBasedOnServiceCategory:', form.showBasedOnServiceCategory);
      console.log('form.frequency:', form.frequency);
      console.log('form.serviceCategory:', form.serviceCategory);
      console.log('frequencyValue:', frequencyValue);
      console.log('serviceCategoryValue:', serviceCategoryValue);
      console.log('form.excludeParameters:', form.excludeParameters);
      console.log('form.excludeParameters type:', typeof form.excludeParameters);
      console.log('form.excludeParameters array?:', Array.isArray(form.excludeParameters));

      const paramData = {
        business_id: currentBusiness.id,
        industry_id: industryId,
        name: form.name.trim(),
        description: form.description || undefined,
        variable_category: form.variableCategory,
        price,
        time_minutes: timeMinutes,
        display: form.display,
        service_category: serviceCategoryValue || undefined,
        service_category2: serviceCategory2Value || undefined,
        frequency: frequencyValue || undefined,
        is_default: form.isDefault,
        show_based_on_frequency: form.showBasedOnFrequency,
        show_based_on_service_category: form.showBasedOnServiceCategory,
        show_based_on_service_category2: form.showBasedOnServiceCategory2,
        excluded_extras: form.excludedExtras.map(String),
        excluded_services: form.excludedServices.map(String),
        excluded_providers: form.excludedProviders,
        exclude_parameters: form.excludeParameters,
      };

      if (editId) {
        // Update existing
        const response = await fetch('/api/pricing-parameters', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...paramData }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update pricing parameter');
        }

        toast({
          title: "Success",
          description: "Pricing parameter updated successfully",
        });
      } else {
        // Create new
        const response = await fetch('/api/pricing-parameters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paramData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create pricing parameter');
        }

        toast({
          title: "Success",
          description: "Pricing parameter created successfully",
        });
      }

      router.push(`/admin/settings/industries/form-1/pricing-parameter?industry=${encodeURIComponent(industry)}`);
    } catch (error: any) {
      console.error('Error saving pricing parameter:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to save pricing parameter',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Pricing Parameter" : "Add Pricing Parameter"}</CardTitle>
          <CardDescription>Configure pricing parameter for {industry}.</CardDescription>
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
                <Label htmlFor="variable-category">Variable Category</Label>
                <Input
                  id="variable-category"
                  value={form.variableCategory}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(p => ({ ...p, variableCategory: value }));
                    const error = validateVariableCategory(value);
                    setValidationErrors(prev => ({ ...prev, variableCategory: error }));
                  }}
                  onBlur={(e) => {
                    const error = validateVariableCategory(e.target.value);
                    setValidationErrors(prev => ({ ...prev, variableCategory: error }));
                  }}
                  placeholder="e.g., Sq Ft, Bedroom, Bathroom, Kitchen, Living Room"
                  disabled={!!editId}
                  className={validationErrors.variableCategory ? "border-red-500" : ""}
                />
                {validationErrors.variableCategory && (
                  <p className="text-xs text-red-500">{validationErrors.variableCategory}</p>
                )}
                {!validationErrors.variableCategory && (
                  <p className="text-xs text-muted-foreground">
                    Enter the variable category this parameter belongs to. You can type any category name.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(p => ({ ...p, name: value }));
                    const error = validateName(value);
                    setValidationErrors(prev => ({ ...prev, name: error }));
                  }}
                  onBlur={(e) => {
                    const error = validateName(e.target.value);
                    setValidationErrors(prev => ({ ...prev, name: error }));
                  }}
                  placeholder="e.g., 1 - 1249 Sq Ft"
                  className={validationErrors.name ? "border-red-500" : ""}
                />
                {validationErrors.name && (
                  <p className="text-xs text-red-500">{validationErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
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
                  onValueChange={(v: typeof form.display) => setForm(p => ({ ...p, display: v }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="Customer Frontend, Backend & Admin" /> Customer Frontend, Backend & Admin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="Customer Backend & Admin" /> Customer Backend & Admin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="Admin Only" /> Admin Only
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(p => ({ ...p, price: value }));
                    const error = validatePrice(value);
                    setValidationErrors(prev => ({ ...prev, price: error }));
                  }}
                  onBlur={(e) => {
                    const error = validatePrice(e.target.value);
                    setValidationErrors(prev => ({ ...prev, price: error }));
                  }}
                  placeholder="0.00"
                  className={validationErrors.price ? "border-red-500" : ""}
                />
                {validationErrors.price && (
                  <p className="text-xs text-red-500">{validationErrors.price}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hours" className="text-xs text-muted-foreground">Hours</Label>
                    <Input
                      id="hours"
                      type="number"
                      min={0}
                      value={form.hours}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm(p => ({ ...p, hours: value }));
                        const hoursError = validateHours(value, form.minutes);
                        const minutesError = validateMinutes(form.minutes, value);
                        setValidationErrors(prev => ({ ...prev, hours: hoursError, minutes: minutesError }));
                      }}
                      onBlur={(e) => {
                        const hoursError = validateHours(e.target.value, form.minutes);
                        const minutesError = validateMinutes(form.minutes, e.target.value);
                        setValidationErrors(prev => ({ ...prev, hours: hoursError, minutes: minutesError }));
                      }}
                      placeholder="0"
                      className={validationErrors.hours ? "border-red-500" : ""}
                    />
                    {validationErrors.hours && (
                      <p className="text-xs text-red-500">{validationErrors.hours}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minutes" className="text-xs text-muted-foreground">Minutes</Label>
                    <Input
                      id="minutes"
                      type="number"
                      min={0}
                      max={59}
                      value={form.minutes}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm(p => ({ ...p, minutes: value }));
                        const minutesError = validateMinutes(value, form.hours);
                        const hoursError = validateHours(form.hours, value);
                        setValidationErrors(prev => ({ ...prev, minutes: minutesError, hours: hoursError }));
                      }}
                      onBlur={(e) => {
                        const minutesError = validateMinutes(e.target.value, form.hours);
                        const hoursError = validateHours(form.hours, e.target.value);
                        setValidationErrors(prev => ({ ...prev, minutes: minutesError, hours: hoursError }));
                      }}
                      placeholder="0"
                      className={validationErrors.minutes ? "border-red-500" : ""}
                    />
                    {validationErrors.minutes && (
                      <p className="text-xs text-red-500">{validationErrors.minutes}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="default-tier"
                  checked={form.isDefault}
                  onCheckedChange={(v) => setForm(p => ({ ...p, isDefault: !!v }))}
                />
                <Label htmlFor="default-tier" className="text-sm">Set as Default</Label>
              </div>
            </TabsContent>

            {/* DEPENDENCIES TAB */}
            <TabsContent value="dependencies" className="mt-4 space-y-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Should the variables show based on the frequency?</Label>
                  <RadioGroup
                    value={form.showBasedOnFrequency ? "yes" : "no"}
                    onValueChange={(v) => setForm(p => ({ ...p, showBasedOnFrequency: v === "yes" }))}
                    className="grid gap-2 pl-4"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="yes" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" /> No
                    </label>
                  </RadioGroup>
                </div>

                {form.showBasedOnFrequency && (
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <div className="space-y-2 p-4 border rounded-lg bg-white">
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <Checkbox
                          id="select-all-frequencies"
                          checked={form.frequency.length === frequencies.length && frequencies.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, frequency: frequencies.map(f => f.name) }));
                            } else {
                              setForm(p => ({ ...p, frequency: [] }));
                            }
                          }}
                        />
                        <label htmlFor="select-all-frequencies" className="text-sm font-medium cursor-pointer">
                          Select All
                        </label>
                      </div>
                      <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                        {frequencies.map((frequency) => (
                          <div key={frequency.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`frequency-${frequency.id}`}
                              checked={form.frequency.includes(frequency.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, frequency: [...p.frequency, frequency.name] }));
                                } else {
                                  setForm(p => ({ ...p, frequency: p.frequency.filter(f => f !== frequency.name) }));
                                }
                              }}
                            />
                            <label htmlFor={`frequency-${frequency.id}`} className="text-sm cursor-pointer">
                              {frequency.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Should the variables show based on the service category?</Label>
                  <RadioGroup
                    value={form.showBasedOnServiceCategory ? "yes" : "no"}
                    onValueChange={(v) => setForm(p => ({ ...p, showBasedOnServiceCategory: v === "yes" }))}
                    className="grid gap-2 pl-4"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="yes" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" /> No
                    </label>
                  </RadioGroup>
                </div>

                {form.showBasedOnServiceCategory && (
                  <div className="space-y-2">
                    <Label htmlFor="service-category">Service Category</Label>
                    <div className="space-y-2 p-4 border rounded-lg bg-white">
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <Checkbox
                          id="select-all-service-categories"
                          checked={form.serviceCategory.length === serviceCategories.length && serviceCategories.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, serviceCategory: serviceCategories.map(c => c.name) }));
                            } else {
                              setForm(p => ({ ...p, serviceCategory: [] }));
                            }
                          }}
                        />
                        <label htmlFor="select-all-service-categories" className="text-sm font-medium cursor-pointer">
                          Select All
                        </label>
                      </div>
                      <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                        {serviceCategories.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`service-category-${category.id}`}
                              checked={form.serviceCategory.includes(category.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, serviceCategory: [...p.serviceCategory, category.name] }));
                                } else {
                                  setForm(p => ({ ...p, serviceCategory: p.serviceCategory.filter(c => c !== category.name) }));
                                }
                              }}
                            />
                            <label htmlFor={`service-category-${category.id}`} className="text-sm cursor-pointer">
                              {category.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                

                <div className="space-y-3">
                  {/* Exclude Parameters Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Exclude Parameters</Label>
                    {(() => {
                      // Filter exclude parameters based on frequency/service category settings
                      let filteredExcludeParams = excludeParameters;
                      
                      // If showBasedOnFrequency is Yes AND frequencies are selected, filter by those frequencies
                      // If showBasedOnServiceCategory is Yes AND service categories are selected, filter by those
                      // If both are No, show all exclude parameters (pricing parameter's own configuration)
                      
                      // Note: Currently we show all items regardless because exclude parameters don't have
                      // frequency/service category associations stored. When that data is available,
                      // implement filtering here based on form.showBasedOnFrequency and form.showBasedOnServiceCategory
                      
                      return filteredExcludeParams.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-4">No exclude parameters available</p>
                      ) : (
                        <div className="space-y-2 p-4 border rounded-lg bg-white">
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <Checkbox
                              id="select-all-exclude-parameters"
                              checked={form.excludeParameters.length === filteredExcludeParams.length && filteredExcludeParams.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, excludeParameters: filteredExcludeParams.map(ep => ep.id) }));
                                } else {
                                  setForm(p => ({ ...p, excludeParameters: [] }));
                                }
                              }}
                            />
                            <label htmlFor="select-all-exclude-parameters" className="text-sm font-medium cursor-pointer">
                              Select All
                            </label>
                          </div>
                          <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                            {filteredExcludeParams.map((param) => (
                              <div key={param.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`exclude-param-${param.id}`}
                                  checked={form.excludeParameters.includes(param.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setForm(p => ({ ...p, excludeParameters: [...p.excludeParameters, param.id] }));
                                    } else {
                                      setForm(p => ({ ...p, excludeParameters: p.excludeParameters.filter(id => id !== param.id) }));
                                    }
                                  }}
                                />
                                <label htmlFor={`exclude-param-${param.id}`} className="text-sm cursor-pointer">
                                  {param.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Extras Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Extras</Label>
                    {(() => {
                      // Filter extras based on frequency/service category settings
                      let filteredExtras = extras;
                      
                      // If showBasedOnFrequency is Yes AND frequencies are selected, filter by those frequencies
                      // If showBasedOnServiceCategory is Yes AND service categories are selected, filter by those
                      // If both are No, show all extras (pricing parameter's own configuration)
                      
                      // Note: Currently we show all items regardless because extras don't have
                      // frequency/service category associations stored. When that data is available,
                      // implement filtering here based on form.showBasedOnFrequency and form.showBasedOnServiceCategory
                      
                      return filteredExtras.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-4">No extras available</p>
                      ) : (
                        <div className="space-y-2 p-4 border rounded-lg bg-white">
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <Checkbox
                              id="select-all-extras"
                              checked={form.excludedExtras.length === filteredExtras.length && filteredExtras.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, excludedExtras: filteredExtras.map(e => e.id) }));
                                } else {
                                  setForm(p => ({ ...p, excludedExtras: [] }));
                                }
                              }}
                            />
                            <label htmlFor="select-all-extras" className="text-sm font-medium cursor-pointer">
                              Select All
                            </label>
                          </div>
                          <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                            {filteredExtras.map((extra) => (
                              <div key={extra.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`extra-${extra.id}`}
                                  checked={form.excludedExtras.includes(extra.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setForm(p => ({ ...p, excludedExtras: [...p.excludedExtras, extra.id] }));
                                    } else {
                                      setForm(p => ({ ...p, excludedExtras: p.excludedExtras.filter(id => id !== extra.id) }));
                                    }
                                  }}
                                />
                                <label htmlFor={`extra-${extra.id}`} className="text-sm cursor-pointer">
                                  {extra.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                                  </div>
              </div>
            </TabsContent>

            {/* PROVIDERS TAB */}
            <TabsContent value="providers" className="mt-4 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Check the providers you want to exclude from this pricing parameter.
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
              onClick={() => router.push(`/admin/settings/industries/form-1/pricing-parameter?industry=${encodeURIComponent(industry)}`)}
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={
                saving ||
                !form.variableCategory || 
                !form.name.trim() || 
                !form.price.trim() ||
                (!form.hours.trim() && !form.minutes.trim()) ||
                !!validationErrors.variableCategory ||
                !!validationErrors.name ||
                !!validationErrors.price ||
                !!validationErrors.hours ||
                !!validationErrors.minutes
              }
              className="text-white"
              style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
            >
              {saving ? "Saving..." : (editId ? "Save" : "Create")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
