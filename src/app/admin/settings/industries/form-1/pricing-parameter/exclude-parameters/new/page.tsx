"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { serviceCategoriesService, ServiceCategory } from "@/lib/serviceCategories";
import { pricingParametersService, PricingParameter } from "@/lib/pricing-parameters";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { Shirt, Sofa, Droplets, Wind, Trash2, Upload, X, Flower2, Flame, Warehouse, Paintbrush, Info } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ExcludeParameterRow = {
  id: number;
  name: string;
  description: string;
  display: "Customer Frontend, Backend & Admin" | "Customer Backend & Admin" | "Admin Only";
  price: number;
  time: string;
  frequency: string;
  serviceCategory: string;
  variableCategories: string;
  showBasedOnFrequency: boolean;
  showBasedOnServiceCategory: boolean;
  showBasedOnVariables: boolean;
  excludedExtras: number[];
  excludedServices: number[];
  excludedProviders?: string[];
};

export default function ExcludeParameterNewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const industryId = params.get("industryId");
  const editId = params.get("editId");
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [allRows, setAllRows] = useState<ExcludeParameterRow[]>([]);
  const [extras, setExtras] = useState<Array<{id: number; name: string}>>([]);
  const [services, setServices] = useState<Array<{id: string; name: string}>>([]);
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  const [frequencies, setFrequencies] = useState<Array<{ id: string; name: string }>>([]);
  const [variables, setVariables] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "",
    display: "Customer Frontend, Backend & Admin" as "Customer Frontend, Backend & Admin" | "Customer Backend & Admin" | "Admin Only",
    price: "0",
    hours: "0",
    minutes: "0",
    qtyBased: false,
    maximum: "",
    applyToAllBookings: true,
    showBasedOnFrequency: false,
    showBasedOnServiceCategory: true,
    showBasedOnVariables: false,
    excludedExtras: [] as number[],
    excludedServices: [] as number[],
    excludedProviders: [] as string[],
    frequency: [] as string[],
    serviceCategory: [] as string[],
    variables: {} as { [key: string]: string[] },
  });

  const [showIconPicker, setShowIconPicker] = useState(false);
  const [uploadedIcon, setUploadedIcon] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const predefinedIcons = [
    { name: "Laundry", icon: Shirt, value: "laundry" },
    { name: "Furniture", icon: Sofa, value: "furniture" },
    { name: "Water/Mold", icon: Droplets, value: "water" },
    { name: "Odor", icon: Wind, value: "odor" },
    { name: "Trash/Clutter", icon: Trash2, value: "trash" },
    { name: "Garden/Plants", icon: Flower2, value: "plants" },
    { name: "Fire Damage", icon: Flame, value: "fire" },
    { name: "Storage", icon: Warehouse, value: "storage" },
    { name: "Paint Removal", icon: Paintbrush, value: "paint" },
  ];

  const allDataKey = useMemo(() => `excludeParameters_${industry}`, [industry]);

  // Fetch industry ID if not provided
  useEffect(() => {
    const fetchIndustryId = async () => {
      if (!currentBusiness?.id || industryId) return;

      try {
        const response = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const data = await response.json();
        const currentIndustry = data.industries?.find((ind: any) => ind.name === industry);
        
        if (currentIndustry) {
          // Update URL with industryId
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('industryId', currentIndustry.id);
          window.history.replaceState({}, '', newUrl.toString());
        }
      } catch (error) {
        console.error('Error fetching industry ID:', error);
      }
    };
    
    fetchIndustryId();
  }, [industry, industryId, currentBusiness?.id]);

  // Load all data from database
  useEffect(() => {
    const loadData = async () => {
      if (!industryId) return;

      try {
        setLoading(true);

        // Load service categories
        try {
          const serviceCategoriesData = await serviceCategoriesService.getServiceCategoriesByIndustry(industryId);
          setServices(serviceCategoriesData.map(s => ({ id: s.id, name: s.name })));
        } catch (error) {
          console.error('Error loading service categories:', error);
        }

        // Load pricing parameters (variables)
        try {
          const pricingParamsData = await pricingParametersService.getPricingParametersByIndustry(industryId);
          const allVariables: Array<{ id: string; name: string; category: string }> = [];
          pricingParamsData.forEach(param => {
            allVariables.push({
              id: param.id,
              name: param.name,
              category: param.variable_category
            });
          });
          setVariables(allVariables);
        } catch (error) {
          console.error('Error loading pricing parameters:', error);
        }

        // Load frequencies from API
        try {
          const response = await fetch(`/api/industry-frequency?industryId=${industryId}`);
          const data = await response.json();
          if (data.frequencies && Array.isArray(data.frequencies)) {
            setFrequencies(data.frequencies.map((f: any) => ({ id: f.id, name: f.name })));
          }
        } catch (error) {
          console.error('Error loading frequencies:', error);
        }

        // Load providers
        try {
          if (currentBusiness?.id) {
            const response = await fetch(`/api/admin/providers?businessId=${currentBusiness.id}`);
            const data = await response.json();
            if (data.providers && Array.isArray(data.providers)) {
              setProviders(data.providers.map((p: any) => ({
                id: p.id,
                name: p.name ?? ([p.first_name ?? p.firstName, p.last_name ?? p.lastName].filter(Boolean).join(' ').trim() || 'Unknown'),
              })));
            }
          }
        } catch (error) {
          console.error('Error loading providers:', error);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load some data. Please try refreshing the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [industryId, currentBusiness?.id, toast]);

  // Fetch existing exclude parameter data when editing
  useEffect(() => {
    if (!editId || !industryId) return;

    const fetchExistingData = async () => {
      try {
        const response = await fetch(`/api/exclude-parameters?industryId=${industryId}`);
        const data = await response.json();
        
        if (data.excludeParameters) {
          const existing = data.excludeParameters.find((p: any) => p.id === editId);
          
          if (existing) {
            const hours = Math.floor(existing.time_minutes / 60);
            const minutes = existing.time_minutes % 60;

            setForm({
              name: existing.name,
              description: existing.description || "",
              icon: existing.icon || "",
              display: existing.display,
              price: String(existing.price ?? 0),
              hours: String(hours),
              minutes: String(minutes),
              qtyBased: (existing as any).qty_based || false,
              maximum: String((existing as any).maximum_quantity || ""),
              applyToAllBookings: (existing as any).apply_to_all_bookings !== undefined ? (existing as any).apply_to_all_bookings : true,
              showBasedOnFrequency: existing.show_based_on_frequency || false,
              showBasedOnServiceCategory: existing.show_based_on_service_category || false,
              showBasedOnVariables: existing.show_based_on_variables || false,
              excludedExtras: [],
              excludedServices: [],
              excludedProviders: existing.excluded_providers || [],
              frequency: existing.frequency ? existing.frequency.split(", ") : [],
              serviceCategory: existing.service_category ? existing.service_category.split(", ") : [],
              variables: existing.variables || {},
            });

            if (existing.icon && existing.icon.startsWith('data:')) {
              setUploadedIcon(existing.icon);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching exclude parameter for edit:', error);
        toast({
          title: "Error",
          description: "Failed to load exclude parameter data",
          variant: "destructive",
        });
      }
    };

    fetchExistingData();
  }, [editId, industryId, toast]);

  // Fetch providers from database
  useEffect(() => {
    const fetchProviders = async () => {
      if (!currentBusiness) return;
      
      try {
        const response = await fetch(`/api/admin/providers?businessId=${encodeURIComponent(currentBusiness.id)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.providers && Array.isArray(data.providers)) {
            setProviders(data.providers.map((p: any) => ({
              id: p.id,
              name: p.name ?? ([p.first_name ?? p.firstName, p.last_name ?? p.lastName].filter(Boolean).join(' ').trim() || 'Unknown'),
            })));
          } else {
            setProviders([]);
          }
        } else {
          console.error('API response not ok:', response.status, response.statusText);
          setProviders([]);
        }
      } catch (error) {
        console.error('Error fetching providers:', error);
        setProviders([]);
      }
    };
    
    fetchProviders();
  }, [currentBusiness]);

  const save = async () => {
    if (!form.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required",
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

    setSaving(true);

    try {
      const price = Number(form.price) || 0;
      const hours = Number(form.hours) || 0;
      const minutes = Number(form.minutes) || 0;
      const timeMinutes = (hours * 60) + minutes;

      // Auto-set frequency and service category based on form state
      const frequencyValue = form.showBasedOnFrequency ? form.frequency.join(", ") : "";
      const serviceCategoryValue = form.showBasedOnServiceCategory ? form.serviceCategory.join(", ") : "";

      const paramData = {
        business_id: currentBusiness.id,
        industry_id: industryId,
        name: form.name.trim(),
        description: form.description || undefined,
        icon: form.icon || uploadedIcon || undefined,
        price,
        time_minutes: timeMinutes,
        display: form.display,
        qty_based: form.qtyBased,
        maximum_quantity: form.maximum ? parseInt(form.maximum, 10) : null,
        apply_to_all_bookings: form.applyToAllBookings,
        service_category: serviceCategoryValue || undefined,
        frequency: frequencyValue || undefined,
        show_based_on_frequency: form.showBasedOnFrequency,
        show_based_on_service_category: form.showBasedOnServiceCategory,
        show_based_on_variables: form.showBasedOnVariables,
        variables: form.variables,
        excluded_providers: form.excludedProviders,
      };

      if (editId) {
        // Update existing
        const response = await fetch('/api/exclude-parameters', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...paramData }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update exclude parameter');
        }

        toast({
          title: "Success",
          description: "Exclude parameter updated successfully",
        });
      } else {
        // Create new
        const response = await fetch('/api/exclude-parameters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paramData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create exclude parameter');
        }

        toast({
          title: "Success",
          description: "Exclude parameter created successfully",
        });
      }

      router.push(`/admin/settings/industries/form-1/pricing-parameter?industry=${encodeURIComponent(industry)}`);
    } catch (error: any) {
      console.error('Error saving exclude parameter:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to save exclude parameter',
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
          <CardTitle>{editId ? "Edit Exclude Parameter" : "Add Exclude Parameter"}</CardTitle>
          <CardDescription>Configure exclude parameter for {industry}.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading data...</div>
            </div>
          ) : (
            <>
            <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              <TabsTrigger value="providers">Providers</TabsTrigger>
            </TabsList>

            {/* DETAILS TAB */}
            <TabsContent value="details" className="mt-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Pets, Smoking, Deep Cleaning"
                />
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
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))}
                  placeholder="0.00"
                />
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
                      onChange={(e) => setForm(p => ({ ...p, hours: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minutes" className="text-xs text-muted-foreground">Minutes</Label>
                    <Input
                      id="minutes"
                      type="number"
                      min={0}
                      max={59}
                      value={form.minutes}
                      onChange={(e) => setForm(p => ({ ...p, minutes: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="maximum">Maximum</Label>
                  <Select
                    value={form.maximum}
                    onValueChange={(value) => setForm(p => ({ ...p, maximum: value }))}
                  >
                    <SelectTrigger id="maximum">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={String(num)}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                <Label>Icon</Label>
                <div className="space-y-3">
                  {/* Current Icon Display */}
                  {(form.icon || uploadedIcon) && (
                    <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/50">
                      <div className="flex items-center justify-center w-12 h-12 border rounded-md bg-background">
                        {uploadedIcon ? (
                          <img src={uploadedIcon} alt="Custom icon" className="w-8 h-8 object-contain" />
                        ) : (
                          (() => {
                            const IconComponent = predefinedIcons.find(i => i.value === form.icon)?.icon;
                            return IconComponent ? <IconComponent className="w-6 h-6" /> : null;
                          })()
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {uploadedIcon ? "Custom Icon" : predefinedIcons.find(i => i.value === form.icon)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">Current icon</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setForm(p => ({ ...p, icon: "" }));
                          setUploadedIcon(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Icon Selection Buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="flex-1"
                    >
                      Select Icon
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Icon
                    </Button>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          toast({
                            title: "File too large",
                            description: "Please upload an image smaller than 2MB",
                            variant: "destructive",
                          });
                          return;
                        }

                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64String = reader.result as string;
                          setUploadedIcon(base64String);
                          setForm(p => ({ ...p, icon: "" }));
                          toast({
                            title: "Icon uploaded",
                            description: "Custom icon has been uploaded successfully",
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                  {/* Icon Picker Grid */}
                  {showIconPicker && (
                    <div className="border rounded-md p-4 bg-background">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium">Select an icon</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowIconPicker(false)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {predefinedIcons.map((iconItem) => {
                          const IconComponent = iconItem.icon;
                          return (
                            <button
                              key={iconItem.value}
                              type="button"
                              onClick={() => {
                                setForm(p => ({ ...p, icon: iconItem.value }));
                                setUploadedIcon(null);
                                setShowIconPicker(false);
                                toast({
                                  title: "Icon selected",
                                  description: `${iconItem.name} icon has been selected`,
                                });
                              }}
                              className={`flex flex-col items-center justify-center p-3 border rounded-md hover:bg-muted transition-colors ${
                                form.icon === iconItem.value ? "border-primary bg-primary/10" : ""
                              }`}
                            >
                              <IconComponent className="w-6 h-6 mb-1" />
                              <span className="text-xs text-center">{iconItem.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
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
                      <Info className="h-4 w-4 text-orange-500 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        This exclude parameter will be applied to all bookings in the service
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="first" /> Apply only to the first appointment
                    <div className="relative group">
                      <Info className="h-4 w-4 text-orange-500 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        This exclude parameter will only be applied to the first appointment in the service
                      </div>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </TabsContent>

            {/* DEPENDENCIES TAB */}
            <TabsContent value="dependencies" className="mt-4 space-y-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Should the exclusion parameter show based on the frequency?</Label>
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
                    <div className="space-y-2">
                      {frequencies.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          No frequencies available. Please add frequencies for this industry first.
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2">
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
                            <Label htmlFor="select-all-frequencies" className="text-sm font-medium cursor-pointer">Select All</Label>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {frequencies.map((frequency) => (
                              <div key={frequency.id} className="flex items-center gap-2">
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
                                <Label htmlFor={`frequency-${frequency.id}`} className="text-sm cursor-pointer">{frequency.name}</Label>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Should the exclusion parameter show based on the service category?</Label>
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
                    <div className="space-y-2">
                      {services.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          No service categories available. Please add service categories for this industry first.
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                              id="select-all-service-categories"
                              checked={form.serviceCategory.length === services.length && services.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, serviceCategory: services.map(s => s.name) }));
                                } else {
                                  setForm(p => ({ ...p, serviceCategory: [] }));
                                }
                              }}
                            />
                            <Label htmlFor="select-all-service-categories" className="text-sm font-medium cursor-pointer">Select All</Label>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {services.map((service) => (
                              <div key={service.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`service-category-${service.id}`}
                                  checked={form.serviceCategory.includes(service.name)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setForm(p => ({ ...p, serviceCategory: [...p.serviceCategory, service.name] }));
                                    } else {
                                      setForm(p => ({ ...p, serviceCategory: p.serviceCategory.filter(s => s !== service.name) }));
                                    }
                                  }}
                                />
                                <Label htmlFor={`service-category-${service.id}`} className="text-sm cursor-pointer">{service.name}</Label>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Should the exclusion parameter show based on the variables?</Label>
                  <RadioGroup
                    value={form.showBasedOnVariables ? "yes" : "no"}
                    onValueChange={(v) => setForm(p => ({ ...p, showBasedOnVariables: v === "yes" }))}
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

                {form.showBasedOnVariables && (
                  <div className="space-y-2">
                    <Label htmlFor="variable-categories">Variable</Label>
                    <div className="space-y-2">
                      {variables.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          No variables available. Please add pricing parameters/variables for this industry first.
                        </p>
                      ) : (
                        /* Group variables by category */
                        Array.from(new Set(variables.map(v => v.category))).map(category => {
                          const categoryVariables = variables.filter(v => v.category === category);
                          const allCategoryVariablesSelected = form.variables[category]?.length === categoryVariables.length && categoryVariables.length > 0;
                          
                          return (
                            <div key={category} className="border rounded-md p-3 space-y-2">
                              {/* Category header with select all */}
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`category-all-${category}`}
                                  checked={allCategoryVariablesSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setForm(p => ({
                                        ...p,
                                        variables: {
                                          ...p.variables,
                                          [category]: categoryVariables.map(v => v.name)
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
                                <Label htmlFor={`category-all-${category}`} className="text-sm font-medium cursor-pointer">
                                  {category}
                                </Label>
                              </div>
                              
                              {/* Individual variables in this category */}
                              <div className="grid grid-cols-10 gap-2 pl-6">
                                {categoryVariables.map(variable => (
                                  <div key={`${variable.category}-${variable.id}`} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`variable-${variable.category}-${variable.id}`}
                                      checked={form.variables[category]?.includes(variable.name) || false}
                                      onCheckedChange={(checked) => {
                                        const currentSelections = form.variables[category] || [];
                                        if (checked) {
                                          setForm(p => ({
                                            ...p,
                                            variables: {
                                              ...p.variables,
                                              [category]: [...currentSelections, variable.name]
                                            }
                                          }));
                                        } else {
                                          setForm(p => ({
                                            ...p,
                                            variables: {
                                              ...p.variables,
                                              [category]: currentSelections.filter(item => item !== variable.name)
                                            }
                                          }));
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`variable-${variable.category}-${variable.id}`} className="text-sm cursor-pointer">{variable.name}</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PROVIDERS TAB */}
            <TabsContent value="providers" className="mt-4 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Check the providers you want to exclude from this exclude parameter.
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
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/admin/settings/industries/form-1/pricing-parameter?industry=${encodeURIComponent(industry)}`)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={!form.name.trim() || saving}
              className="text-white"
              style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
            >
              {saving ? "Saving..." : (editId ? "Save" : "Create")}
            </Button>
          </div>
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
