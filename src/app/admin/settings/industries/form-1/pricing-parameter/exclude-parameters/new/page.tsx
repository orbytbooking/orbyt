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
  const editId = params.get("editId") ? Number(params.get("editId")) : null;

  const [allRows, setAllRows] = useState<ExcludeParameterRow[]>([]);
  const [extras, setExtras] = useState<Array<{id: number; name: string}>>([]);
  const [services, setServices] = useState<Array<{id: number; name: string}>>([]);
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  const [frequencies, setFrequencies] = useState<Array<{ id: number; name: string }>>([]);
  const [variables, setVariables] = useState<Array<{ id: string; name: string; category: string }>>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    display: "Customer Frontend, Backend & Admin" as "Customer Frontend, Backend & Admin" | "Customer Backend & Admin" | "Admin Only",
    price: "0",
    hours: "0",
    minutes: "0",
    showBasedOnFrequency: false,
    showBasedOnServiceCategory: true,
    showBasedOnVariables: false,
    excludedExtras: [] as number[],
    excludedServices: [] as number[],
    excludedProviders: [] as string[],
    frequency: [] as string[],
    serviceCategory: [] as string[],
    variableCategories: [] as string[],
  });

  const allDataKey = useMemo(() => `excludeParameters_${industry}`, [industry]);
  const extrasKey = useMemo(() => `extras_${industry}`, [industry]);
  const servicesKey = useMemo(() => `service_categories_${industry}`, [industry]);

  useEffect(() => {
    // Load all exclude parameters data
    try {
      const storedData = JSON.parse(localStorage.getItem(allDataKey) || "[]");
      if (Array.isArray(storedData)) {
        setAllRows(storedData);
      }
    } catch (e) {
      console.error("Error loading exclude parameters data:", e);
    }

    // Load extras
    try {
      const storedExtras = JSON.parse(localStorage.getItem(extrasKey) || "[]");
      if (Array.isArray(storedExtras)) {
        setExtras(storedExtras.map((e: any) => ({ id: e.id, name: e.name })));
      }
    } catch (e) {
      console.error("Error loading extras:", e);
    }

    // Load service categories
    try {
      const storedServices = JSON.parse(localStorage.getItem(servicesKey) || "[]");
      if (Array.isArray(storedServices)) {
        setServices(storedServices.map((s: any) => ({ id: s.id, name: s.name })));
      }
    } catch (e) {
      console.error("Error loading services:", e);
    }

    // Load providers
    try {
      const storedProviders = JSON.parse(localStorage.getItem("adminProviders") || "[]");
      if (Array.isArray(storedProviders)) {
        setProviders(storedProviders.map((p: any) => ({ id: p.id, name: p.name })));
      }
    } catch (e) {
      console.error("Error loading providers:", e);
    }

    // Load frequencies
    try {
      const frequenciesKey = `frequencies_${industry}`;
      const storedFrequencies = JSON.parse(localStorage.getItem(frequenciesKey) || "[]");
      if (Array.isArray(storedFrequencies)) {
        setFrequencies(storedFrequencies.map((f: any) => ({ id: f.id, name: f.name })));
      }
    } catch (e) {
      console.error("Error loading frequencies:", e);
    }

    // Load variables (pricing parameters)
    try {
      const allDataKey = `pricingParamsAll_${industry}`;
      const storedData = JSON.parse(localStorage.getItem(allDataKey) || "{}");
      if (storedData && typeof storedData === "object") {
        const allVariables: Array<{ id: string; name: string; category: string }> = [];
        Object.keys(storedData).forEach(category => {
          const rows = storedData[category] || [];
          rows.forEach((row: any) => {
            allVariables.push({
              id: `${category}-${row.id}`,
              name: row.name,
              category: category
            });
          });
        });
        setVariables(allVariables);
      }
    } catch (e) {
      console.error("Error loading variables:", e);
    }
  }, [allDataKey, extrasKey, servicesKey, industry]);

  useEffect(() => {
    if (editId && allRows.length > 0) {
      const existing = allRows.find(r => r.id === editId);
      if (existing) {
        const [hours, minutes] = existing.time.split(" ").reduce((acc, part) => {
          if (part.includes("Hr")) acc[0] = part.replace("Hr", "").trim();
          if (part.includes("Min")) acc[1] = part.replace("Min", "").trim();
          return acc;
        }, ["0", "0"]);

        setForm({
          name: existing.name,
          description: existing.description || "",
          display: existing.display,
          price: String(existing.price ?? 0),
          hours: hours || "0",
          minutes: minutes || "0",
          showBasedOnFrequency: existing.showBasedOnFrequency,
          showBasedOnServiceCategory: existing.showBasedOnServiceCategory,
          showBasedOnVariables: existing.showBasedOnVariables,
          excludedExtras: existing.excludedExtras || [],
          excludedServices: existing.excludedServices || [],
          excludedProviders: existing.excludedProviders || [],
          frequency: existing.frequency ? existing.frequency.split(", ") : [],
          serviceCategory: existing.serviceCategory ? existing.serviceCategory.split(", ") : [],
          variableCategories: existing.variableCategories ? existing.variableCategories.split(", ") : [],
        });
      }
    }
  }, [editId, allRows]);

  const save = () => {
    if (!form.name.trim()) return;

    const price = Number(form.price) || 0;
    const hours = Number(form.hours) || 0;
    const minutes = Number(form.minutes) || 0;
    const timeString = `${hours > 0 ? `${hours} Hr` : ""}${minutes > 0 ? ` ${minutes} Min` : ""}`.trim() || "0";

    // Auto-set frequency, service category, and variable categories based on form state
    const frequencyValue = form.showBasedOnFrequency ? form.frequency.join(", ") : "";
    const serviceCategoryValue = form.showBasedOnServiceCategory ? form.serviceCategory.join(", ") : "";
    const variableCategoriesValue = form.showBasedOnVariables ? form.variableCategories.join(", ") : "";

    if (editId) {
      // Update existing
      const updated = allRows.map(r => r.id === editId ? {
        ...r,
        name: form.name.trim(),
        description: form.description,
        display: form.display,
        price,
        time: timeString,
        frequency: frequencyValue,
        serviceCategory: serviceCategoryValue,
        variableCategories: variableCategoriesValue,
        showBasedOnFrequency: form.showBasedOnFrequency,
        showBasedOnServiceCategory: form.showBasedOnServiceCategory,
        showBasedOnVariables: form.showBasedOnVariables,
        excludedExtras: form.excludedExtras,
        excludedServices: form.excludedServices,
        excludedProviders: form.excludedProviders,
      } : r);
      
      localStorage.setItem(allDataKey, JSON.stringify(updated));
    } else {
      // Create new
      const maxId = allRows.reduce((max, r) => (r.id > max ? r.id : max), 0);
      const newRow: ExcludeParameterRow = {
        id: maxId + 1,
        name: form.name.trim(),
        description: form.description,
        display: form.display,
        price,
        time: timeString,
        frequency: frequencyValue,
        serviceCategory: serviceCategoryValue,
        variableCategories: variableCategoriesValue,
        showBasedOnFrequency: form.showBasedOnFrequency,
        showBasedOnServiceCategory: form.showBasedOnServiceCategory,
        showBasedOnVariables: form.showBasedOnVariables,
        excludedExtras: form.excludedExtras,
        excludedServices: form.excludedServices,
        excludedProviders: form.excludedProviders,
      };

      localStorage.setItem(allDataKey, JSON.stringify([...allRows, newRow]));
    }

    router.push(`/admin/settings/industries/form-1/pricing-parameter?industry=${encodeURIComponent(industry)}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Exclude Parameter" : "Add Exclude Parameter"}</CardTitle>
          <CardDescription>Configure exclude parameter for {industry}.</CardDescription>
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
                      {/* Group variables by category */}
                      {Array.from(new Set(variables.map(v => v.category))).map(category => {
                        const categoryVariables = variables.filter(v => v.category === category);
                        const allCategoryVariablesSelected = categoryVariables.every(v => form.variableCategories.includes(v.name));
                        
                        return (
                          <div key={category} className="border rounded-md p-3 space-y-2">
                            {/* Category header with select all */}
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`category-all-${category}`}
                                checked={allCategoryVariablesSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    // Add all variables from this category
                                    const newVariableCategories = [...form.variableCategories];
                                    categoryVariables.forEach(v => {
                                      if (!newVariableCategories.includes(v.name)) {
                                        newVariableCategories.push(v.name);
                                      }
                                    });
                                    setForm(p => ({ ...p, variableCategories: newVariableCategories }));
                                  } else {
                                    // Remove all variables from this category
                                    setForm(p => ({ 
                                      ...p, 
                                      variableCategories: p.variableCategories.filter(vc => 
                                        !categoryVariables.some(v => v.name === vc)
                                      )
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
                                <div key={variable.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`variable-${variable.id}`}
                                    checked={form.variableCategories.includes(variable.name)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setForm(p => ({ ...p, variableCategories: [...p.variableCategories, variable.name] }));
                                      } else {
                                        setForm(p => ({ ...p, variableCategories: p.variableCategories.filter(v => v !== variable.name) }));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`variable-${variable.id}`} className="text-sm cursor-pointer">{variable.name}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
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

          <div className="mt-6 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/settings/industries/form-1/pricing-parameter?industry=${encodeURIComponent(industry)}`)}
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={!form.name.trim()}
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
