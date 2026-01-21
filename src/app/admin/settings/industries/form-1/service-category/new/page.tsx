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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";

export default function ServiceCategoryNewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const editId = params.get("editId") ? Number(params.get("editId")) : null;

  type ServiceCategory = {
    id: number;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    excludedProviders?: string[];
    serviceCategoryFrequency?: boolean;
    selectedFrequencies?: string[];
    variables?: { [key: string]: string[] };
    excludeParameters?: {
      pets: boolean;
      smoking: boolean;
      deepCleaning: boolean;
    };
    extras?: number[];
    selectedExcludeParameters?: string[];
    display?: string;
    displayServiceLengthCustomer?: string;
    displayServiceLengthProvider?: boolean;
    canCustomerEditService?: boolean;
    serviceFeeEnabled?: boolean;
    expeditedCharge?: {
      enabled: boolean;
      amount: string;
      displayText: string;
      currency: string;
    };
    cancellationFee?: {
      enabled: boolean;
      type: 'single' | 'multiple';
      fee: string;
      currency: string;
      payProvider: boolean;
      providerFee: string;
      providerCurrency: string;
      chargeTiming: 'beforeDay' | 'hoursBefore';
      beforeDayTime: string;
      hoursBefore: string;
    };
    hourlyService?: {
      enabled: boolean;
      price: string;
      currency: string;
      priceCalculationType: 'customTime' | 'pricingParametersTime';
      countExtrasSeparately: boolean;
    };
    serviceCategoryPrice?: {
      enabled: boolean;
      price: string;
      currency: string;
    };
    serviceCategoryTime?: {
      enabled: boolean;
      hours: string;
      minutes: string;
    };
    minimumPrice?: {
      enabled: boolean;
      checkAmountType: 'discounted' | 'final';
      price: string;
      checkRecurringSchedule: boolean;
      textToDisplay: boolean;
      noticeText: string;
    };
    overrideProviderPay?: {
      enabled: boolean;
      amount: string;
      currency: string;
    };
    extrasConfig?: {
      tip: {
        enabled: boolean;
        saveTo: 'all' | 'first';
        display: 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only';
      };
      parking: {
        enabled: boolean;
        saveTo: 'all' | 'first';
        display: 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only';
      };
    };
  };
  
  const storageKey = useMemo(() => `service_categories_${industry}`, [industry]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    excludedProviders: [] as string[],
    serviceCategoryFrequency: false,
    selectedFrequencies: [] as string[],
    variables: {} as { [key: string]: string[] },
    excludeParameters: {
      pets: false,
      smoking: false,
      deepCleaning: false
    },
    extras: [] as number[],
    selectedExcludeParameters: [] as string[],
    display: "customer_frontend_backend_admin",
    displayServiceLengthCustomer: "admin_only",
    displayServiceLengthProvider: false,
    canCustomerEditService: false,
    serviceFeeEnabled: false,
    expeditedCharge: {
      enabled: false,
      amount: "",
      displayText: "",
      currency: "$"
    },
    cancellationFee: {
      enabled: false,
      type: 'single' as 'single' | 'multiple',
      fee: "",
      currency: "$",
      payProvider: false,
      providerFee: "",
      providerCurrency: "$",
      chargeTiming: 'beforeDay' as 'beforeDay' | 'hoursBefore',
      beforeDayTime: "",
      hoursBefore: ""
    },
    hourlyService: {
      enabled: false,
      price: "",
      currency: "$",
      priceCalculationType: 'customTime' as 'customTime' | 'pricingParametersTime',
      countExtrasSeparately: false
    },
    serviceCategoryPrice: {
      enabled: false,
      price: "",
      currency: "$"
    },
    serviceCategoryTime: {
      enabled: false,
      hours: "0",
      minutes: "0"
    },
    minimumPrice: {
      enabled: false,
      checkAmountType: 'discounted' as 'discounted' | 'final',
      price: "",
      checkRecurringSchedule: false,
      textToDisplay: false,
      noticeText: ""
    },
    overrideProviderPay: {
      enabled: false,
      amount: "",
      currency: "$"
    },
    extrasConfig: {
      tip: {
        enabled: false,
        saveTo: 'all' as 'all' | 'first',
        display: 'customer_frontend_backend_admin' as 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only'
      },
      parking: {
        enabled: false,
        saveTo: 'all' as 'all' | 'first',
        display: 'customer_frontend_backend_admin' as 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only'
      }
    }
  });

  // Fetch pricing parameters and extras from localStorage
  const [pricingParameters, setPricingParameters] = useState<{ [key: string]: any[] }>({});
  const [availableExtras, setAvailableExtras] = useState<Array<{ id: number; name: string }>>([]);
  const [excludeParameters, setExcludeParameters] = useState<any[]>([]);
  const [frequencies, setFrequencies] = useState<string[]>([]);

  // Fetch providers from localStorage
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);

  // Error state for real-time validation
  const [errors, setErrors] = useState<{
    cancellationFee?: string;
    providerFee?: string;
    beforeDayTime?: string;
    hoursBefore?: string;
    expeditedCharge?: string;
    hourlyService?: string;
    serviceCategoryPrice?: string;
    serviceCategoryTime?: string;
    minimumPrice?: string;
    overrideProviderPay?: string;
  }>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(stored)) setCategories(stored);
    } catch {}
  }, [storageKey]);

  // Load pricing parameters from localStorage
  useEffect(() => {
    try {
      const allDataKey = `pricingParamsAll_${industry}`;
      const storedData = JSON.parse(localStorage.getItem(allDataKey) || "{}");
      if (storedData && typeof storedData === "object") {
        setPricingParameters(storedData);
      }
    } catch {
      // ignore
    }
  }, [industry]);

  // Load extras from localStorage
  useEffect(() => {
    try {
      const extrasKey = `extras_${industry}`;
      const storedExtras = JSON.parse(localStorage.getItem(extrasKey) || "[]");
      if (Array.isArray(storedExtras)) {
        setAvailableExtras(storedExtras.map((e: any) => ({ id: e.id, name: e.name })));
      }
    } catch {
      // ignore
    }
  }, [industry]);

  // Load frequencies from localStorage
  useEffect(() => {
    try {
      // Load from pricing parameters data structure (same as pricing parameter page)
      const pricingDataKey = `pricingParamsAll_${industry}`;
      const storedPricingData = JSON.parse(localStorage.getItem(pricingDataKey) || "null");
      
      if (storedPricingData && typeof storedPricingData === "object") {
        // Extract frequencies from all pricing parameter rows
        const allFrequencies: string[] = [];
        Object.values(storedPricingData).forEach((rows: any[]) => {
          rows.forEach((row: any) => {
            if (row.frequency && typeof row.frequency === "string") {
              const rowFrequencies = row.frequency.split(',').map((f: string) => f.trim());
              allFrequencies.push(...rowFrequencies);
            }
          });
        });
        
        // Remove duplicates and set
        const uniqueFrequencies = [...new Set(allFrequencies)];
        setFrequencies(uniqueFrequencies);
      } else {
        // Fallback to default frequencies if no pricing data exists
        const defaultFrequencies = ["Daily", "Weekly", "Monthly", "One-time"];
        setFrequencies(defaultFrequencies);
      }
    } catch {
      // Fallback to default frequencies on error
      const defaultFrequencies = ["Daily", "Weekly", "Monthly", "One-time"];
      setFrequencies(defaultFrequencies);
    }
  }, []);

  // Load exclude parameters from localStorage
  useEffect(() => {
    try {
      const storedExcludeParams = JSON.parse(localStorage.getItem(`excludeParameters_${industry}`) || "[]");
      if (Array.isArray(storedExcludeParams)) {
        setExcludeParameters(storedExcludeParams);
      }
    } catch {
      // ignore
    }
  }, [industry]);

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

  useEffect(() => {
    if (editId && categories.length > 0) {
      const existing = categories.find(c => c.id === editId);
      if (existing) {
        setForm({
          name: existing.name,
          description: existing.description || "",
          excludedProviders: existing.excludedProviders || [],
          serviceCategoryFrequency: existing.serviceCategoryFrequency || false,
          selectedFrequencies: existing.selectedFrequencies || [],
          variables: existing.variables || {},
          excludeParameters: existing.excludeParameters || {
            pets: false,
            smoking: false,
            deepCleaning: false
          },
          extras: existing.extras || [],
          selectedExcludeParameters: existing.selectedExcludeParameters || [],
          display: existing.display || "customer_frontend_backend_admin",
          displayServiceLengthCustomer: existing.displayServiceLengthCustomer || "admin_only",
          displayServiceLengthProvider: existing.displayServiceLengthProvider || false,
          canCustomerEditService: existing.canCustomerEditService || false,
          serviceFeeEnabled: existing.serviceFeeEnabled || false,
          expeditedCharge: existing.expeditedCharge || {
            enabled: false,
            amount: "",
            displayText: "",
            currency: "$"
          },
          cancellationFee: existing.cancellationFee || {
            enabled: false,
            type: 'single',
            fee: "",
            currency: "$",
            payProvider: false,
            providerFee: "",
            providerCurrency: "$",
            chargeTiming: 'beforeDay',
            beforeDayTime: "",
            hoursBefore: ""
          },
          hourlyService: existing.hourlyService || {
            enabled: false,
            price: "",
            currency: "$",
            priceCalculationType: 'customTime',
            countExtrasSeparately: false
          },
          serviceCategoryPrice: existing.serviceCategoryPrice || {
            enabled: false,
            price: "",
            currency: "$"
          },
          serviceCategoryTime: existing.serviceCategoryTime || {
            enabled: false,
            hours: "0",
            minutes: "0"
          },
          minimumPrice: existing.minimumPrice || {
            enabled: false,
            checkAmountType: 'discounted',
            price: "",
            checkRecurringSchedule: false,
            textToDisplay: false,
            noticeText: ""
          },
          overrideProviderPay: existing.overrideProviderPay || {
            enabled: false,
            amount: "",
            currency: "$"
          },
          extrasConfig: existing.extrasConfig || {
            tip: {
              enabled: false,
              saveTo: 'all',
              display: 'customer_frontend_backend_admin'
            },
            parking: {
              enabled: false,
              saveTo: 'all',
              display: 'customer_frontend_backend_admin'
            }
          }
        });
      }
    }
  }, [editId, categories]);

  // Real-time validation functions
  const validateCancellationFee = (value: string) => {
    if (form.cancellationFee.enabled && !value.trim()) {
      setErrors(prev => ({ ...prev, cancellationFee: "Cancellation fee amount is required" }));
    } else {
      setErrors(prev => ({ ...prev, cancellationFee: undefined }));
    }
  };

  const validateProviderFee = (value: string) => {
    if (form.cancellationFee.payProvider && !value.trim()) {
      setErrors(prev => ({ ...prev, providerFee: "Provider fee amount is required" }));
    } else {
      setErrors(prev => ({ ...prev, providerFee: undefined }));
    }
  };

  const validateBeforeDayTime = (value: string) => {
    if (form.cancellationFee.enabled && form.cancellationFee.chargeTiming === 'beforeDay' && !value.trim()) {
      setErrors(prev => ({ ...prev, beforeDayTime: "Time is required" }));
    } else {
      setErrors(prev => ({ ...prev, beforeDayTime: undefined }));
    }
  };

  const validateHoursBefore = (value: string) => {
    if (form.cancellationFee.enabled && form.cancellationFee.chargeTiming === 'hoursBefore' && !value.trim()) {
      setErrors(prev => ({ ...prev, hoursBefore: "Hours is required" }));
    } else {
      setErrors(prev => ({ ...prev, hoursBefore: undefined }));
    }
  };

  const validateExpeditedCharge = (value: string) => {
    if (form.expeditedCharge.enabled && !value.trim()) {
      setErrors(prev => ({ ...prev, expeditedCharge: "Expedited charge amount is required" }));
    } else {
      setErrors(prev => ({ ...prev, expeditedCharge: undefined }));
    }
  };

  const validateHourlyService = (value: string) => {
    if (form.hourlyService.enabled && !value.trim()) {
      setErrors(prev => ({ ...prev, hourlyService: "Hourly service price is required" }));
    } else {
      setErrors(prev => ({ ...prev, hourlyService: undefined }));
    }
  };

  const validateServiceCategoryPrice = (value: string) => {
    if (form.serviceCategoryPrice.enabled && !value.trim()) {
      setErrors(prev => ({ ...prev, serviceCategoryPrice: "Service category price is required" }));
    } else {
      setErrors(prev => ({ ...prev, serviceCategoryPrice: undefined }));
    }
  };

  const validateServiceCategoryTime = (hours: string, minutes: string) => {
    if (form.serviceCategoryTime.enabled && !hours.trim() && !minutes.trim()) {
      setErrors(prev => ({ ...prev, serviceCategoryTime: "Hours or minutes is required" }));
    } else {
      setErrors(prev => ({ ...prev, serviceCategoryTime: undefined }));
    }
  };

  const validateMinimumPrice = (value: string) => {
    if (form.minimumPrice.enabled && !value.trim()) {
      setErrors(prev => ({ ...prev, minimumPrice: "Minimum price is required" }));
    } else {
      setErrors(prev => ({ ...prev, minimumPrice: undefined }));
    }
  };

  const validateOverrideProviderPay = (value: string) => {
    if (form.overrideProviderPay.enabled && !value.trim()) {
      setErrors(prev => ({ ...prev, overrideProviderPay: "Override provider pay amount is required" }));
    } else {
      setErrors(prev => ({ ...prev, overrideProviderPay: undefined }));
    }
  };

  const save = () => {
    if (!form.name.trim()) {
      alert("Service category name is required");
      return;
    }

    // Validation for cancellation fee
    if (form.cancellationFee.enabled && !form.cancellationFee.fee.trim()) {
      alert("Cancellation fee amount is required when cancellation fee is enabled");
      return;
    }

    // Validation for provider fee
    if (form.cancellationFee.payProvider && !form.cancellationFee.providerFee.trim()) {
      alert("Provider fee amount is required when paying provider is enabled");
      return;
    }

    // Validation for charge timing
    if (form.cancellationFee.enabled) {
      if (form.cancellationFee.chargeTiming === 'beforeDay' && !form.cancellationFee.beforeDayTime.trim()) {
        alert("Time is required when 'If they cancel after' option is selected");
        return;
      }
      if (form.cancellationFee.chargeTiming === 'hoursBefore' && !form.cancellationFee.hoursBefore.trim()) {
        alert("Hours is required when 'If they cancel' option is selected");
        return;
      }
    }

    // Validation for expedited charge
    if (form.expeditedCharge.enabled && !form.expeditedCharge.amount.trim()) {
      alert("Expedited charge amount is required when expedited charge is enabled");
      return;
    }

    // Validation for hourly service
    if (form.hourlyService.enabled && !form.hourlyService.price.trim()) {
      alert("Hourly service price is required when hourly service is enabled");
      return;
    }

    // Validation for service category price
    if (form.serviceCategoryPrice.enabled && !form.serviceCategoryPrice.price.trim()) {
      alert("Service category price is required when price is enabled");
      return;
    }

    // Validation for service category time
    if (form.serviceCategoryTime.enabled && (!form.serviceCategoryTime.hours.trim() && !form.serviceCategoryTime.minutes.trim())) {
      alert("Hours or minutes is required when service time is enabled");
      return;
    }

    // Validation for minimum price
    if (form.minimumPrice.enabled && !form.minimumPrice.price.trim()) {
      alert("Minimum price is required when minimum price is enabled");
      return;
    }

    // Validation for override provider pay
    if (form.overrideProviderPay.enabled && !form.overrideProviderPay.amount.trim()) {
      alert("Override provider pay amount is required when override is enabled");
      return;
    }

    let updatedCategories: ServiceCategory[];
    
    if (editId) {
      updatedCategories = categories.map(c => c.id === editId ? {
        ...c,
        name: form.name.trim(),
        description: form.description,
        excludedProviders: form.excludedProviders,
        serviceCategoryFrequency: form.serviceCategoryFrequency,
        selectedFrequencies: form.selectedFrequencies,
        variables: form.variables,
        excludeParameters: form.excludeParameters,
        extras: form.extras,
        selectedExcludeParameters: form.selectedExcludeParameters,
        display: form.display,
        displayServiceLengthCustomer: form.displayServiceLengthCustomer,
        displayServiceLengthProvider: form.displayServiceLengthProvider,
        canCustomerEditService: form.canCustomerEditService,
        serviceFeeEnabled: form.serviceFeeEnabled,
        expeditedCharge: form.expeditedCharge,
        cancellationFee: form.cancellationFee,
        hourlyService: form.hourlyService,
        serviceCategoryPrice: form.serviceCategoryPrice,
        serviceCategoryTime: form.serviceCategoryTime,
        minimumPrice: form.minimumPrice,
        overrideProviderPay: form.overrideProviderPay,
        extrasConfig: form.extrasConfig
      } : {
        ...c,
        display: c.display || "customer_frontend_backend_admin",
        displayServiceLengthCustomer: c.displayServiceLengthCustomer || "admin_only",
        displayServiceLengthProvider: c.displayServiceLengthProvider || false,
        expeditedCharge: c.expeditedCharge || {
          enabled: false,
          amount: "",
          displayText: "",
          currency: "$"
        },
        cancellationFee: c.cancellationFee || {
          enabled: false,
          type: 'single' as const,
          fee: "",
          currency: "$",
          payProvider: false,
          providerFee: "",
          providerCurrency: "$",
          chargeTiming: 'beforeDay' as const,
          beforeDayTime: "",
          hoursBefore: ""
        },
        hourlyService: c.hourlyService || {
          enabled: false,
          price: "",
          currency: "$",
          priceCalculationType: 'customTime' as const,
          countExtrasSeparately: false
        },
        serviceCategoryPrice: c.serviceCategoryPrice || {
          enabled: false,
          price: "",
          currency: "$"
        },
        serviceCategoryTime: c.serviceCategoryTime || {
          enabled: false,
          hours: "0",
          minutes: "0"
        },
        minimumPrice: c.minimumPrice || {
          enabled: false,
          checkAmountType: 'discounted' as const,
          price: "",
          checkRecurringSchedule: false,
          textToDisplay: false,
          noticeText: ""
        },
        overrideProviderPay: c.overrideProviderPay || {
          enabled: false,
          amount: "",
          currency: "$"
        },
        extrasConfig: c.extrasConfig || {
          tip: {
            enabled: false,
            saveTo: 'all' as const,
            display: 'customer_frontend_backend_admin' as const
          },
          parking: {
            enabled: false,
            saveTo: 'all' as const,
            display: 'customer_frontend_backend_admin' as const
          }
        }
      });
    } else {
      const nextId = (categories.reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1;
      const newCategory: ServiceCategory = {
        id: nextId,
        name: form.name.trim(),
        description: form.description,
        excludedProviders: form.excludedProviders,
        serviceCategoryFrequency: form.serviceCategoryFrequency,
        selectedFrequencies: form.selectedFrequencies,
        variables: form.variables,
        excludeParameters: form.excludeParameters,
        extras: form.extras,
        selectedExcludeParameters: form.selectedExcludeParameters,
        display: form.display,
        displayServiceLengthCustomer: form.displayServiceLengthCustomer,
        displayServiceLengthProvider: form.displayServiceLengthProvider,
        canCustomerEditService: form.canCustomerEditService,
        serviceFeeEnabled: form.serviceFeeEnabled,
        expeditedCharge: form.expeditedCharge,
        cancellationFee: form.cancellationFee,
        hourlyService: form.hourlyService,
        serviceCategoryPrice: form.serviceCategoryPrice,
        serviceCategoryTime: form.serviceCategoryTime,
        minimumPrice: form.minimumPrice,
        overrideProviderPay: form.overrideProviderPay,
        extrasConfig: form.extrasConfig
      };
      updatedCategories = [...categories, newCategory];
    }
    
    // Update localStorage
    localStorage.setItem(storageKey, JSON.stringify(updatedCategories));
    
    // Force update the parent page state by dispatching a custom event
    window.dispatchEvent(new CustomEvent('serviceCategoriesUpdated', { 
      detail: { categories: updatedCategories, storageKey } 
    }));

    router.push(`/admin/settings/industries/form-1/service-category?industry=${encodeURIComponent(industry)}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Service Category" : "Add Service Category"}</CardTitle>
          <CardDescription>Configure a service category for {industry}.</CardDescription>
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
                <Label htmlFor="category-name">Name *</Label>
                <Input 
                  id="category-name" 
                  value={form.name} 
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} 
                  placeholder="Ex. Kitchen, Bathroom, etc." 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-desc">Description</Label>
                <Textarea 
                  id="category-desc" 
                  rows={3} 
                  value={form.description} 
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} 
                  placeholder="Add a brief description of this category" 
                />
              </div>

              {/* Display Settings */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Display</h4>
                <p className="text-xs text-muted-foreground">Where do you want this service category to show up?</p>
                <RadioGroup
                  value={form.display}
                  onValueChange={(value) => setForm(p => ({ ...p, display: value }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="customer_frontend_backend_admin" /> Customer frontend, backend & admin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="customer_backend_admin" /> Customer backend & admin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="admin_only" /> Admin only
                  </label>
                </RadioGroup>
              </div>

              {/* Display Service Length on Customer End */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Display service length on customer end</h4>
                <p className="text-xs text-muted-foreground">Would you like the customer to see how long the service will take in the summary box?</p>
                <RadioGroup
                  value={form.displayServiceLengthCustomer}
                  onValueChange={(value) => setForm(p => ({ ...p, displayServiceLengthCustomer: value }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="customer_frontend_backend_admin" /> Customer frontend, backend & admin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="customer_backend_admin" /> Customer backend & admin
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="admin_only" /> Admin only
                  </label>
                </RadioGroup>
              </div>

              {/* Display Service Length on Provider End */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">Display service length on provider end</h4>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <RadioGroup
                  value={form.displayServiceLengthProvider ? "yes" : "no"}
                  onValueChange={(value) => setForm(p => ({ ...p, displayServiceLengthProvider: value === "yes" }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="yes" /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="no" /> No
                  </label>
                </RadioGroup>
              </div>

              {/* Can Customer Edit Service */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Can customer edit this service?</h4>
                <RadioGroup
                  value={form.canCustomerEditService ? "yes" : "no"}
                  onValueChange={(value) => setForm(p => ({ ...p, canCustomerEditService: value === "yes" }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="yes" /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="no" /> No
                  </label>
                </RadioGroup>
              </div>

              {/* Service Fee */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Will you charge a service fee for this service category?</h4>
                <RadioGroup
                  value={form.serviceFeeEnabled ? "yes" : "no"}
                  onValueChange={(value) => setForm(p => ({ ...p, serviceFeeEnabled: value === "yes" }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="yes" /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="no" /> No
                  </label>
                </RadioGroup>
              </div>

              {/* Expedited Charge */}
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="expedited-charge"
                      checked={form.expeditedCharge.enabled}
                      onCheckedChange={(checked) => setForm(p => ({ 
                        ...p, 
                        expeditedCharge: { ...p.expeditedCharge, enabled: checked as boolean }
                      }))}
                    />
                    <Label htmlFor="expedited-charge" className="text-sm font-medium">
                      Expedited charge (same day)
                    </Label>
                  </div>
                  
                  {form.expeditedCharge.enabled && (
                    <div className="ml-6 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="expedited-amount" className="text-sm">Amount</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="expedited-amount"
                            type="number"
                            placeholder="0.00"
                            value={form.expeditedCharge.amount}
                            onChange={(e) => {
                              setForm(p => ({ 
                                ...p, 
                                expeditedCharge: { ...p.expeditedCharge, amount: e.target.value }
                              }));
                              validateExpeditedCharge(e.target.value);
                            }}
                            onBlur={(e) => validateExpeditedCharge(e.target.value)}
                            className={`w-24 ${errors.expeditedCharge ? 'border-red-500' : ''}`}
                          />
                          <span className="text-sm font-medium">$</span>
                        </div>
                        {errors.expeditedCharge && (
                          <p className="text-red-700 dark:text-red-400 text-xs font-semibold">{errors.expeditedCharge}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="expedited-display-text" className="text-sm">Text to display</Label>
                        <Input
                          id="expedited-display-text"
                          placeholder="Enter text to display"
                          value={form.expeditedCharge.displayText}
                          onChange={(e) => setForm(p => ({ 
                            ...p, 
                            expeditedCharge: { ...p.expeditedCharge, displayText: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cancellation Fee */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cancellation-fee"
                    checked={form.cancellationFee.enabled}
                    onCheckedChange={(checked) => setForm(p => ({ 
                      ...p, 
                      cancellationFee: { ...p.cancellationFee, enabled: checked as boolean }
                    }))}
                  />
                  <Label htmlFor="cancellation-fee" className="text-sm font-medium">
                    Cancellation fee
                  </Label>
                </div>
                
                {form.cancellationFee.enabled && (
                  <div className="ml-6 space-y-4">
                    {/* Fee Type */}
                    <div className="space-y-2">
                      <Label className="text-sm">Do you want to set a single cancellation fee or multiple cancellation fees?</Label>
                      <RadioGroup
                        value={form.cancellationFee.type}
                        onValueChange={(value: 'single' | 'multiple') => setForm(p => ({ 
                          ...p, 
                          cancellationFee: { ...p.cancellationFee, type: value }
                        }))}
                        className="grid gap-2"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="single" /> Single
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="multiple" /> Multiple
                        </label>
                      </RadioGroup>
                    </div>

                    {/* Fee Amount */}
                    <div className="space-y-2">
                      <Label htmlFor="cancellation-fee-amount" className="text-sm">Cancellation fee</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="cancellation-fee-amount"
                          type="number"
                          placeholder="50.00"
                          value={form.cancellationFee.fee}
                          onChange={(e) => {
                            setForm(p => ({ 
                              ...p, 
                              cancellationFee: { ...p.cancellationFee, fee: e.target.value }
                            }));
                            validateCancellationFee(e.target.value);
                          }}
                          onBlur={(e) => validateCancellationFee(e.target.value)}
                          className={`w-24 ${errors.cancellationFee ? 'border-red-500' : ''}`}
                        />
                        <Select
                          value={form.cancellationFee.currency}
                          onValueChange={(value) => setForm(p => ({ 
                            ...p, 
                            cancellationFee: { ...p.cancellationFee, currency: value }
                          }))}
                        >
                          <SelectTrigger className="w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="$">$</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {errors.cancellationFee && (
                        <p className="text-red-700 dark:text-red-400 text-xs font-semibold">{errors.cancellationFee}</p>
                      )}
                    </div>

                    {/* Pay Provider */}
                    <div className="space-y-2">
                      <Label className="text-sm">Do you want to pay a cancellation fee to the Provider?</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="pay-provider"
                          checked={form.cancellationFee.payProvider}
                          onCheckedChange={(checked) => setForm(p => ({ 
                            ...p, 
                            cancellationFee: { ...p.cancellationFee, payProvider: checked }
                          }))}
                        />
                        <Label htmlFor="pay-provider" className="text-sm">
                          {form.cancellationFee.payProvider ? "Enabled" : "Disabled"}
                        </Label>
                      </div>
                    </div>

                    {/* Provider Fee Amount - Only show when payProvider is enabled */}
                    {form.cancellationFee.payProvider && (
                      <div className="space-y-2">
                        <Label htmlFor="provider-fee-amount" className="text-sm">Provider fee amount</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="provider-fee-amount"
                            type="number"
                            placeholder="0.00"
                            value={form.cancellationFee.providerFee}
                            onChange={(e) => {
                              setForm(p => ({ 
                                ...p, 
                                cancellationFee: { ...p.cancellationFee, providerFee: e.target.value }
                              }));
                              validateProviderFee(e.target.value);
                            }}
                            onBlur={(e) => validateProviderFee(e.target.value)}
                            className={`w-24 ${errors.providerFee ? 'border-red-500' : ''}`}
                          />
                          <Select
                            value={form.cancellationFee.providerCurrency}
                            onValueChange={(value) => setForm(p => ({ 
                              ...p, 
                              cancellationFee: { ...p.cancellationFee, providerCurrency: value }
                            }))}
                          >
                            <SelectTrigger className="w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="$">$</SelectItem>
                              <SelectItem value="%">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {errors.providerFee && (
                          <p className="text-red-700 dark:text-red-400 text-xs font-semibold">{errors.providerFee}</p>
                        )}
                      </div>
                    )}

                    {/* Charge Timing */}
                    <div className="space-y-2">
                      <Label className="text-sm">When will your customers be charged a cancellation fee?</Label>
                      <RadioGroup
                        value={form.cancellationFee.chargeTiming}
                        onValueChange={(value: 'beforeDay' | 'hoursBefore') => setForm(p => ({ 
                          ...p, 
                          cancellationFee: { ...p.cancellationFee, chargeTiming: value }
                        }))}
                        className="grid gap-2"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="beforeDay" />
                          If they cancel after: 
                          <Input
                            type="time"
                            value={form.cancellationFee.beforeDayTime}
                            onChange={(e) => {
                              setForm(p => ({ 
                                ...p, 
                                cancellationFee: { ...p.cancellationFee, beforeDayTime: e.target.value }
                              }));
                              validateBeforeDayTime(e.target.value);
                            }}
                            onBlur={(e) => validateBeforeDayTime(e.target.value)}
                            className={`w-32 h-8 ${errors.beforeDayTime ? 'border-red-500' : ''}`}
                          />
                          the day before the job.
                        </label>
                        {errors.beforeDayTime && (
                          <p className="text-red-700 dark:text-red-400 text-xs ml-6 font-semibold">{errors.beforeDayTime}</p>
                        )}
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="hoursBefore" />
                          If they cancel: 
                          <Input
                            type="number"
                            min="1"
                            max="24"
                            value={form.cancellationFee.hoursBefore}
                            onChange={(e) => {
                              setForm(p => ({ 
                                ...p, 
                                cancellationFee: { ...p.cancellationFee, hoursBefore: e.target.value }
                              }));
                              validateHoursBefore(e.target.value);
                            }}
                            onBlur={(e) => validateHoursBefore(e.target.value)}
                            className={`w-16 h-8 ${errors.hoursBefore ? 'border-red-500' : ''}`}
                          />
                          Hours before the job.
                        </label>
                        {errors.hoursBefore && (
                          <p className="text-red-700 dark:text-red-400 text-xs ml-6 font-semibold">{errors.hoursBefore}</p>
                        )}
                      </RadioGroup>
                    </div>
                  </div>
                )}
              </div>

              {/* Set Service Category Price */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="service-category-price"
                    checked={form.serviceCategoryPrice.enabled}
                    onCheckedChange={(checked) => setForm(p => ({
                      ...p,
                      serviceCategoryPrice: { ...p.serviceCategoryPrice, enabled: checked as boolean }
                    }))}
                  />
                  <Label htmlFor="service-category-price" className="text-sm font-medium">
                    Set service category price
                  </Label>
                </div>
                
                {form.serviceCategoryPrice.enabled && (
                  <div className="ml-6 space-y-2">
                    <div className="flex gap-2 items-center">
                      <span className="text-sm font-medium">$</span>
                      <Input
                        id="service-category-price-amount"
                        type="number"
                        placeholder="0.00"
                        value={form.serviceCategoryPrice.price}
                        onChange={(e) => {
                          setForm(p => ({
                            ...p,
                            serviceCategoryPrice: { ...p.serviceCategoryPrice, price: e.target.value }
                          }));
                          validateServiceCategoryPrice(e.target.value);
                        }}
                        onBlur={(e) => validateServiceCategoryPrice(e.target.value)}
                        className={`w-24 ${errors.serviceCategoryPrice ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.serviceCategoryPrice && (
                      <p className="text-red-500 dark:text-red-400 text-xs font-medium">{errors.serviceCategoryPrice}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Set Service Category Time */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="service-category-time"
                    checked={form.serviceCategoryTime.enabled}
                    onCheckedChange={(checked) => setForm(p => ({
                      ...p,
                      serviceCategoryTime: { ...p.serviceCategoryTime, enabled: checked as boolean }
                    }))}
                  />
                  <Label htmlFor="service-category-time" className="text-sm font-medium">
                    Set service category time
                  </Label>
                </div>
                
                {form.serviceCategoryTime.enabled && (
                  <div className="ml-6 space-y-2">
                    <div className="text-xs text-red-500 mb-2">
                      Note: This option will not work in case of hourly service (custom time based).
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="space-y-1">
                        <Label className="text-xs">Hours</Label>
                        <Select
                          value={form.serviceCategoryTime.hours}
                          onValueChange={(value) => {
                            setForm(p => ({
                              ...p,
                              serviceCategoryTime: { ...p.serviceCategoryTime, hours: value }
                            }));
                            validateServiceCategoryTime(value, form.serviceCategoryTime.minutes);
                          }}
                        >
                          <SelectTrigger className={`w-20 ${errors.serviceCategoryTime ? 'border-red-500' : ''}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Minutes</Label>
                        <Select
                          value={form.serviceCategoryTime.minutes}
                          onValueChange={(value) => {
                            setForm(p => ({
                              ...p,
                              serviceCategoryTime: { ...p.serviceCategoryTime, minutes: value }
                            }));
                            validateServiceCategoryTime(form.serviceCategoryTime.hours, value);
                          }}
                        >
                          <SelectTrigger className={`w-20 ${errors.serviceCategoryTime ? 'border-red-500' : ''}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 60 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {errors.serviceCategoryTime && (
                          <p className="text-red-700 dark:text-red-400 text-xs font-semibold">{errors.serviceCategoryTime}</p>
                        )}
                  </div>
                )}
              </div>

              {/* Set Minimum Price */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="minimum-price"
                    checked={form.minimumPrice.enabled}
                    onCheckedChange={(checked) => setForm(p => ({
                      ...p,
                      minimumPrice: { ...p.minimumPrice, enabled: checked as boolean }
                    }))}
                  />
                  <Label htmlFor="minimum-price" className="text-sm font-medium">
                    Set minimum price
                  </Label>
                </div>

                {form.minimumPrice.enabled && (
                  <div className="ml-6 space-y-4">
                    {/* Check Amount Type */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">On which amount you want to check minimum price?</h5>
                      <RadioGroup
                        value={form.minimumPrice.checkAmountType}
                        onValueChange={(value) => setForm(p => ({
                          ...p,
                          minimumPrice: { ...p.minimumPrice, checkAmountType: value as 'discounted' | 'final' }
                        }))}
                        className="flex gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="discounted" id="discounted-total" />
                          <Label htmlFor="discounted-total">Discounted total</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="final" id="final-total" />
                          <Label htmlFor="final-total">Final total</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Price</h5>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">$</span>
                        <Input
                          id="minimum-price-amount"
                          type="number"
                          placeholder="0.00"
                          value={form.minimumPrice.price}
                          onChange={(e) => {
                            setForm(p => ({
                              ...p,
                              minimumPrice: { ...p.minimumPrice, price: e.target.value }
                            }));
                            validateMinimumPrice(e.target.value);
                          }}
                          onBlur={(e) => validateMinimumPrice(e.target.value)}
                          className={`w-24 ${errors.minimumPrice ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.minimumPrice && (
                        <p className="text-red-500 dark:text-red-400 text-xs font-medium">{errors.minimumPrice}</p>
                      )}
                    </div>

                    {/* Check Recurring Schedule */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="check-recurring-schedule"
                        checked={form.minimumPrice.checkRecurringSchedule}
                        onCheckedChange={(checked) => setForm(p => ({
                          ...p,
                          minimumPrice: { ...p.minimumPrice, checkRecurringSchedule: checked as boolean }
                        }))}
                      />
                      <Label htmlFor="check-recurring-schedule" className="text-sm font-medium">
                        Check minimum price for complete recurring schedule.
                      </Label>
                    </div>

                    {/* Text to Display */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="text-to-display"
                          checked={form.minimumPrice.textToDisplay}
                          onCheckedChange={(checked) => setForm(p => ({
                            ...p,
                            minimumPrice: { ...p.minimumPrice, textToDisplay: checked as boolean }
                          }))}
                        />
                        <Label htmlFor="text-to-display" className="text-sm font-medium">
                          Text to display
                        </Label>
                      </div>

                      {form.minimumPrice.textToDisplay && (
                        <div className="ml-6">
                          <Textarea
                            id="minimum-notice-text"
                            placeholder="Add Minimum Notice Text"
                            value={form.minimumPrice.noticeText}
                            onChange={(e) => setForm(p => ({
                              ...p,
                              minimumPrice: { ...p.minimumPrice, noticeText: e.target.value }
                            }))}
                            rows={3}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Override Provider Pay */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="override-provider-pay"
                    checked={form.overrideProviderPay.enabled}
                    onCheckedChange={(checked) => setForm(p => ({
                      ...p,
                      overrideProviderPay: { ...p.overrideProviderPay, enabled: checked as boolean }
                    }))}
                  />
                  <Label htmlFor="override-provider-pay" className="text-sm font-medium">
                    Override provider pay
                  </Label>
                </div>

                {form.overrideProviderPay.enabled && (
                  <div className="ml-6 space-y-2">
                    <div className="flex gap-2 items-center">
                      <span className="text-sm font-medium">$</span>
                      <Input
                        id="override-provider-pay-amount"
                        type="number"
                        placeholder="0.00"
                        value={form.overrideProviderPay.amount}
                        onChange={(e) => {
                          setForm(p => ({
                            ...p,
                            overrideProviderPay: { ...p.overrideProviderPay, amount: e.target.value }
                          }));
                          validateOverrideProviderPay(e.target.value);
                        }}
                        onBlur={(e) => validateOverrideProviderPay(e.target.value)}
                        className={`w-24 ${errors.overrideProviderPay ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.overrideProviderPay && (
                      <p className="text-red-700 dark:text-red-400 text-xs font-semibold">{errors.overrideProviderPay}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Hourly Service */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">Is it an hourly service?</h4>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <RadioGroup
                  value={form.hourlyService.enabled ? "yes" : "no"}
                  onValueChange={(value) => setForm(p => ({ 
                    ...p, 
                    hourlyService: { ...p.hourlyService, enabled: value === "yes" ? true : false }
                  }))}
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="yes" /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="no" /> No
                  </label>
                </RadioGroup>

                {form.hourlyService.enabled && (
                  <div className="ml-6 space-y-4">
                    {/* Hourly Price */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="hourly-price-amount" className="text-sm">Hourly price</Label>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">$</span>
                        <Input
                          id="hourly-price-amount"
                          type="number"
                          placeholder="50.00"
                          value={form.hourlyService.price}
                          onChange={(e) => {
                            setForm(p => ({
                              ...p,
                              hourlyService: { ...p.hourlyService, price: e.target.value }
                            }));
                            validateHourlyService(e.target.value);
                          }}
                          onBlur={(e) => validateHourlyService(e.target.value)}
                          className={`w-24 ${errors.hourlyService ? 'border-red-500' : ''}`}
                        />
                        <span className="text-sm text-muted-foreground">/Hr</span>
                      </div>
                      {errors.hourlyService && (
                        <p className="text-red-500 dark:text-red-400 text-xs font-medium">{errors.hourlyService}</p>
                      )}
                    </div>

                    {/* Calculate price based on custom time or pricing parameters time? */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Would you like to calculate the price of an hourly service based on a custom time or based on the pricing parameters time?</Label>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <RadioGroup
                        value={form.hourlyService.priceCalculationType}
                        onValueChange={(value: 'customTime' | 'pricingParametersTime') => setForm(p => ({
                          ...p,
                          hourlyService: { ...p.hourlyService, priceCalculationType: value }
                        }))}
                        className="grid gap-2"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="customTime" /> Based on custom time
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="pricingParametersTime" /> Based on the pricing parameters time
                        </label>
                      </RadioGroup>
                    </div>

                    {/* Count extras as a separate charge? */}
                    {form.hourlyService.priceCalculationType === 'customTime' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Would you like to count extras as a separate charge?</Label>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <RadioGroup
                          value={form.hourlyService.countExtrasSeparately ? "yes" : "no"}
                          onValueChange={(value) => setForm(p => ({
                            ...p,
                            hourlyService: { ...p.hourlyService, countExtrasSeparately: value === "yes" ? true : false }
                          }))}
                          className="grid gap-2"
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="yes" /> Yes
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="no" /> No
                          </label>
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Extras Configuration */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Extras</h3>
                <p className="text-sm text-muted-foreground">
                  If you want to add variables to your forms for this service you can activate them here.
                </p>

                {/* Tip Configuration */}
                <div className="border p-4 rounded-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Tip</h4>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Switch
                      id="tip-enabled"
                      checked={form.extrasConfig.tip.enabled}
                      onCheckedChange={(checked) => setForm(p => ({
                        ...p,
                        extrasConfig: {
                          ...p.extrasConfig,
                          tip: { ...p.extrasConfig.tip, enabled: checked }
                        }
                      }))}
                    />
                  </div>

                  {form.extrasConfig.tip.enabled && (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Save to</p>
                        <Select
                          value={form.extrasConfig.tip.saveTo}
                          onValueChange={(value) => setForm(p => ({
                            ...p,
                            extrasConfig: {
                              ...p.extrasConfig,
                              tip: { ...p.extrasConfig.tip, saveTo: value as 'all' | 'first' }
                            }
                          }))}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="first">First</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">Booking(s)</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">Display</p>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <RadioGroup
                          value={form.extrasConfig.tip.display}
                          onValueChange={(value) => setForm(p => ({
                            ...p,
                            extrasConfig: {
                              ...p.extrasConfig,
                              tip: { ...p.extrasConfig.tip, display: value as 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only' }
                            }
                          }))}
                          className="flex items-center gap-4"
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="customer_frontend_backend_admin" /> Customer frontend, backend & admin
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="customer_backend_admin" /> Customer backend & admin
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="admin_only" /> Admin only
                          </label>
                        </RadioGroup>
                      </div>
                    </>
                  )}
                </div>

                {/* Parking Configuration */}
                <div className="border p-4 rounded-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Parking</h4>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Switch
                      id="parking-enabled"
                      checked={form.extrasConfig.parking.enabled}
                      onCheckedChange={(checked) => setForm(p => ({
                        ...p,
                        extrasConfig: {
                          ...p.extrasConfig,
                          parking: { ...p.extrasConfig.parking, enabled: checked }
                        }
                      }))}
                    />
                  </div>

                  {form.extrasConfig.parking.enabled && (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Save to</p>
                        <Select
                          value={form.extrasConfig.parking.saveTo}
                          onValueChange={(value) => setForm(p => ({
                            ...p,
                            extrasConfig: {
                              ...p.extrasConfig,
                              parking: { ...p.extrasConfig.parking, saveTo: value as 'all' | 'first' }
                            }
                          }))}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="first">First</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">Booking(s)</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">Display</p>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <RadioGroup
                          value={form.extrasConfig.parking.display}
                          onValueChange={(value) => setForm(p => ({
                            ...p,
                            extrasConfig: {
                              ...p.extrasConfig,
                              parking: { ...p.extrasConfig.parking, display: value as 'customer_frontend_backend_admin' | 'customer_backend_admin' | 'admin_only' }
                            }
                          }))}
                          className="flex items-center gap-4"
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="customer_frontend_backend_admin" /> Customer frontend, backend & admin
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="customer_backend_admin" /> Customer backend & admin
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="admin_only" /> Admin only
                          </label>
                        </RadioGroup>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* DEPENDENCIES TAB */}
            <TabsContent value="dependencies" className="mt-4 space-y-6">
              <div className="space-y-6">
                {/* Service Category Frequency */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Should the service category show based on the frequency?</h4>
                  <RadioGroup
                    value={form.serviceCategoryFrequency ? "yes" : "no"}
                    onValueChange={(value) => setForm(p => ({ ...p, serviceCategoryFrequency: value === "yes" ? true : false }))}
                    className="grid gap-2"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="yes" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" /> No
                    </label>
                  </RadioGroup>
                </div>

                {form.serviceCategoryFrequency && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Select Frequencies</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-frequencies"
                          checked={form.selectedFrequencies.length === frequencies.length && frequencies.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, selectedFrequencies: frequencies }));
                            } else {
                              setForm(p => ({ ...p, selectedFrequencies: [] }));
                            }
                          }}
                        />
                        <Label htmlFor="select-all-frequencies" className="text-sm font-medium cursor-pointer">Select All</Label>
                      </div>
                      {frequencies.map((frequency, index) => (
                        <div key={index} className="flex items-center gap-2 ml-6">
                          <Checkbox
                            id={`frequency-${index}`}
                            checked={form.selectedFrequencies.includes(frequency)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, selectedFrequencies: [...p.selectedFrequencies, frequency] }));
                              } else {
                                setForm(p => ({ ...p, selectedFrequencies: p.selectedFrequencies.filter(f => f !== frequency) }));
                              }
                            }}
                          />
                          <Label htmlFor={`frequency-${index}`} className="text-sm font-normal cursor-pointer">
                            {frequency}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    {frequencies.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        No frequencies added yet. Add frequencies from the Frequencies section.
                      </p>
                    )}
                  </div>
                )}

                {/* Variables */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium">Variables</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select which variable(s) will display for this service category. Any variables that have not been checked off in this section will not display when this service category is selected on the booking form.
                    </p>
                  </div>
                  
                  {Object.keys(pricingParameters).length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No pricing parameters added yet. Add pricing parameters from the Pricing section.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Group variables by category */}
                      {['Bathroom', 'Sq Ft', 'Bedroom'].map(category => {
                        const categoryParams = pricingParameters[category] || [];
                        if (categoryParams.length === 0) return null;
                        
                        return (
                          <div key={category} className="space-y-2">
                            <h4 className="text-sm font-semibold">{category}</h4>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`select-all-service-${category.toLowerCase().replace(' ', '-')}`}
                                checked={form.variables[category]?.length === categoryParams.length && categoryParams.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setForm(p => ({
                                      ...p,
                                      variables: {
                                        ...p.variables,
                                        [category]: categoryParams.map(param => param.name)
                                      }
                                    }));
                                  } else {
                                    setForm(p => ({
                                      ...p,
                                      variables: {
                                        ...p.variables,
                                        [category]: []
                                      }
                                    }));
                                  }
                                }}
                              />
                              <Label htmlFor={`select-all-service-${category.toLowerCase().replace(' ', '-')}`} className="text-sm cursor-pointer">Select All</Label>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {categoryParams.map((param) => (
                                <div key={param.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`service-variable-${param.id}`}
                                    checked={form.variables[category]?.includes(param.name) || false}
                                    onCheckedChange={(checked) => {
                                      const currentSelections = form.variables[category] || [];
                                      if (checked) {
                                        setForm(p => ({
                                          ...p,
                                          variables: {
                                            ...p.variables,
                                            [category]: [...currentSelections, param.name]
                                          }
                                        }));
                                      } else {
                                        setForm(p => ({
                                          ...p,
                                          variables: {
                                            ...p.variables,
                                            [category]: currentSelections.filter(item => item !== param.name)
                                          }
                                        }));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`service-variable-${param.id}`} className="text-sm cursor-pointer">{param.name}</Label>
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
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Exclude Parameters</h4>
                  {excludeParameters.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No exclude parameters added yet. Add exclude parameters from the Pricing section.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-exclude-params"
                          checked={form.selectedExcludeParameters.length === excludeParameters.length && excludeParameters.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, selectedExcludeParameters: excludeParameters.map(param => param.name) }));
                            } else {
                              setForm(p => ({ ...p, selectedExcludeParameters: [] }));
                            }
                          }}
                        />
                        <Label htmlFor="select-all-exclude-params" className="text-sm font-medium cursor-pointer">Select All</Label>
                      </div>
                      {excludeParameters.map((param) => (
                        <div key={param.id} className="flex items-center gap-2 ml-6">
                          <Checkbox
                            id={`exclude-param-${param.id}`}
                            checked={form.selectedExcludeParameters.includes(param.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, selectedExcludeParameters: [...p.selectedExcludeParameters, param.name] }));
                              } else {
                                setForm(p => ({ ...p, selectedExcludeParameters: p.selectedExcludeParameters.filter(name => name !== param.name) }));
                              }
                            }}
                          />
                          <Label htmlFor={`exclude-param-${param.id}`} className="text-sm font-normal cursor-pointer">
                            {param.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Extras */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Extras</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-extras"
                        checked={form.extras.length === availableExtras.length && availableExtras.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setForm(p => ({ ...p, extras: availableExtras.map(e => e.id) }));
                          } else {
                            setForm(p => ({ ...p, extras: [] }));
                          }
                        }}
                      />
                      <Label htmlFor="select-all-extras" className="text-sm font-medium cursor-pointer">Select All</Label>
                    </div>
                    {availableExtras.map((extra) => (
                      <div key={extra.id} className="flex items-center gap-2 ml-6">
                        <Checkbox
                          id={`extra-${extra.id}`}
                          checked={form.extras.includes(extra.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, extras: [...p.extras, extra.id] }));
                            } else {
                              setForm(p => ({ ...p, extras: p.extras.filter(e => e !== extra.id) }));
                            }
                          }}
                        />
                        <Label htmlFor={`extra-${extra.id}`} className="text-sm font-normal cursor-pointer">
                          {extra.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  
                  {availableExtras.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      No extras added yet. Add extras from the Extras section.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* PROVIDERS TAB */}
            <TabsContent value="providers" className="mt-4 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Check the providers you want to exclude from this service category.
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
              onClick={() => router.push(`/admin/settings/industries/form-1/service-category?industry=${encodeURIComponent(industry)}`)}
            >
              Cancel
            </Button>
            <Button 
              onClick={save} 
              className="text-white" 
              style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
              disabled={!form.name.trim()}
            >
              {editId ? "Save" : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
