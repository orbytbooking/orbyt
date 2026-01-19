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

type Extra = {
  id: number;
  name: string;
  time: number;
  serviceCategory: string;
  price: number;
  display: "frontend-backend-admin" | "backend-admin" | "admin-only";
  qtyBased: boolean;
  exemptFromDiscount: boolean;
  description?: string;
  serviceChecklists?: string[];
  showBasedOnFrequency?: boolean;
  frequencyOptions?: string[];
  showBasedOnServiceCategory?: boolean;
  serviceCategoryOptions?: string[];
  showBasedOnVariables?: boolean;
  variableOptions?: string[];
};

export default function ExtraNewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const editId = params.get("editId") ? Number(params.get("editId")) : null;
  
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
    // Dependencies
    showBasedOnFrequency: false,
    frequencyOptions: [] as string[],
    showBasedOnServiceCategory: false,
    serviceCategoryOptions: [] as string[],
    showBasedOnVariables: false,
    variableOptions: [] as string[],
    serviceChecklists: [] as string[],
    // Providers
    excludedProviders: [] as string[],
  });

  // Fetch providers from localStorage
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  
  // Load available frequencies, service categories, and variables
  const [availableFrequencies, setAvailableFrequencies] = useState<string[]>([]);
  const [availableServiceCategories, setAvailableServiceCategories] = useState<string[]>([]);
  const [availableVariables, setAvailableVariables] = useState<{ [key: string]: string[] }>({});

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
      const storedVariables = JSON.parse(localStorage.getItem("pricingParameters") || "{}");
      if (storedVariables && typeof storedVariables === "object") {
        setAvailableVariables(storedVariables);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (editId && extras.length > 0) {
      const existing = extras.find(r => r.id === editId);
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
          showBasedOnFrequency: false,
          frequencyOptions: existing.frequencyOptions || [],
          showBasedOnServiceCategory: false,
          serviceCategoryOptions: existing.serviceCategoryOptions || [],
          showBasedOnVariables: false,
          variableOptions: existing.variableOptions || [],
          serviceChecklists: existing.serviceChecklists || [],
          excludedProviders: [],
        });
      }
    }
  }, [editId, extras]);

  const save = () => {
    const hours = Number(form.timeHours) || 0;
    const minutes = Number(form.timeMinutes) || 0;
    const time = hours * 60 + minutes;
    const price = Number(form.price) || 0;
    if (!form.name.trim()) return;

    if (editId) {
      const updated = extras.map(r => r.id === editId ? {
        ...r,
        name: form.name.trim(),
        time,
        serviceCategory: form.serviceCategory,
        price,
        display: form.display,
        qtyBased: form.qtyBased,
        exemptFromDiscount: form.exemptFromDiscount,
        description: form.description,
        serviceChecklists: form.serviceChecklists,
        showBasedOnFrequency: form.showBasedOnFrequency,
        frequencyOptions: form.frequencyOptions,
        showBasedOnServiceCategory: form.showBasedOnServiceCategory,
        serviceCategoryOptions: form.serviceCategoryOptions,
        showBasedOnVariables: form.showBasedOnVariables,
        variableOptions: form.variableOptions,
      } : r);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } else {
      const nextId = (extras.reduce((m, r) => Math.max(m, r.id), 0) || 0) + 1;
      const newExtra: Extra = {
        id: nextId,
        name: form.name.trim(),
        time,
        serviceCategory: form.serviceCategory,
        price,
        display: form.display,
        qtyBased: form.qtyBased,
        exemptFromDiscount: form.exemptFromDiscount,
        description: form.description,
        serviceChecklists: form.serviceChecklists,
        showBasedOnFrequency: form.showBasedOnFrequency,
        frequencyOptions: form.frequencyOptions,
        showBasedOnServiceCategory: form.showBasedOnServiceCategory,
        serviceCategoryOptions: form.serviceCategoryOptions,
        showBasedOnVariables: form.showBasedOnVariables,
        variableOptions: form.variableOptions,
      };
      localStorage.setItem(storageKey, JSON.stringify([...extras, newExtra]));
    }

    router.push(`/admin/settings/industries/form-1/extras?industry=${encodeURIComponent(industry)}`);
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
                <div className="space-y-2">
                  <Label htmlFor="maximum">Maximum</Label>
                  <Input 
                    id="maximum" 
                    type="number" 
                    value={form.maximum} 
                    onChange={(e) => setForm(p => ({ ...p, maximum: e.target.value }))} 
                    placeholder="Number"
                  />
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="extra-price">Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="extra-price" 
                      type="number" 
                      step="0.01"
                      value={form.price} 
                      onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))} 
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Time</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="time-hours" className="text-xs text-muted-foreground">Hours</Label>
                      <Input 
                        id="time-hours" 
                        type="number" 
                        min="0"
                        value={form.timeHours} 
                        onChange={(e) => setForm(p => ({ ...p, timeHours: e.target.value }))} 
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="time-minutes" className="text-xs text-muted-foreground">Minutes</Label>
                      <Input 
                        id="time-minutes" 
                        type="number" 
                        min="0"
                        max="59"
                        value={form.timeMinutes} 
                        onChange={(e) => setForm(p => ({ ...p, timeMinutes: e.target.value }))} 
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
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
                          <>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="select-all-variables"
                                checked={form.variableOptions.length === Object.keys(availableVariables).length && Object.keys(availableVariables).length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setForm(p => ({ ...p, variableOptions: Object.keys(availableVariables) }));
                                  } else {
                                    setForm(p => ({ ...p, variableOptions: [] }));
                                  }
                                }}
                              />
                              <Label htmlFor="select-all-variables" className="text-sm font-medium cursor-pointer">Select All</Label>
                            </div>
                            {Object.keys(availableVariables).map((variable) => (
                              <div key={variable} className="flex items-center gap-2">
                                <Checkbox
                                  id={`variable-${variable}`}
                                  checked={form.variableOptions.includes(variable)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setForm(p => ({ ...p, variableOptions: [...p.variableOptions, variable] }));
                                    } else {
                                      setForm(p => ({ ...p, variableOptions: p.variableOptions.filter(v => v !== variable) }));
                                    }
                                  }}
                                />
                                <Label htmlFor={`variable-${variable}`} className="text-sm font-normal cursor-pointer">{variable}</Label>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Service Checklist</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-checklists"
                        checked={form.serviceChecklists.length === 4}
                        onCheckedChange={(checked) => {
                          const allChecklists = ["Basic Clean Checklist", "Deep Clean Checklist", "Construction Clean Checklist", "Move In/Out Clean Checklist"];
                          if (checked) {
                            setForm(p => ({ ...p, serviceChecklists: allChecklists }));
                          } else {
                            setForm(p => ({ ...p, serviceChecklists: [] }));
                          }
                        }}
                      />
                      <Label htmlFor="select-all-checklists" className="text-sm font-medium cursor-pointer">Select All</Label>
                    </div>
                    {["Basic Clean Checklist", "Deep Clean Checklist", "Construction Clean Checklist", "Move In/Out Clean Checklist"].map((checklist) => (
                      <div key={checklist} className="flex items-center gap-2">
                        <Checkbox
                          id={checklist}
                          checked={form.serviceChecklists.includes(checklist)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, serviceChecklists: [...p.serviceChecklists, checklist] }));
                            } else {
                              setForm(p => ({ ...p, serviceChecklists: p.serviceChecklists.filter(c => c !== checklist) }));
                            }
                          }}
                        />
                        <Label htmlFor={checklist} className="text-sm font-normal cursor-pointer">{checklist}</Label>
                      </div>
                    ))}
                  </div>
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
              className="text-white" 
              style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
            >
              {editId ? "Save" : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
