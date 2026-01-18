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
    variables?: { [key: string]: string[] };
    excludeParameters?: {
      pets: boolean;
      smoking: boolean;
      deepCleaning: boolean;
    };
    extras?: string[];
    selectedExcludeParameters?: string[];
  };
  
  const storageKey = useMemo(() => `service_categories_${industry}`, [industry]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    excludedProviders: [] as string[],
    serviceCategoryFrequency: false,
    variables: {} as { [key: string]: string[] },
    excludeParameters: {
      pets: false,
      smoking: false,
      deepCleaning: false
    },
    extras: [] as string[],
    selectedExcludeParameters: [] as string[],
  });

  // Fetch pricing parameters and extras from localStorage
  const [pricingParameters, setPricingParameters] = useState<{ [key: string]: string[] }>({});
  const [availableExtras, setAvailableExtras] = useState<string[]>([]);
  const [excludeParameters, setExcludeParameters] = useState<any[]>([]);

  // Fetch providers from localStorage
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(stored)) setCategories(stored);
    } catch {}
  }, [storageKey]);

  // Load pricing parameters from localStorage
  useEffect(() => {
    try {
      const storedParams = JSON.parse(localStorage.getItem("pricingParameters") || "{}");
      if (storedParams && typeof storedParams === "object") {
        setPricingParameters(storedParams);
      }
    } catch {
      // ignore
    }
  }, []);

  // Load extras from localStorage
  useEffect(() => {
    try {
      const storedExtras = JSON.parse(localStorage.getItem("extras") || "[]");
      if (Array.isArray(storedExtras)) {
        setAvailableExtras(storedExtras);
      }
    } catch {
      // ignore
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
          variables: existing.variables || {},
          excludeParameters: existing.excludeParameters || {
            pets: false,
            smoking: false,
            deepCleaning: false
          },
          extras: existing.extras || [],
          selectedExcludeParameters: existing.selectedExcludeParameters || [],
        });
      }
    }
  }, [editId, categories]);

  const save = () => {
    if (!form.name.trim()) return;

    let updatedCategories: ServiceCategory[];
    
    if (editId) {
      updatedCategories = categories.map(c => c.id === editId ? {
        ...c,
        name: form.name.trim(),
        description: form.description,
        excludedProviders: form.excludedProviders,
        serviceCategoryFrequency: form.serviceCategoryFrequency,
        variables: form.variables,
        excludeParameters: form.excludeParameters,
        extras: form.extras,
        selectedExcludeParameters: form.selectedExcludeParameters,
      } : c);
    } else {
      const nextId = (categories.reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1;
      const newCategory: ServiceCategory = {
        id: nextId,
        name: form.name.trim(),
        description: form.description,
        excludedProviders: form.excludedProviders,
        serviceCategoryFrequency: form.serviceCategoryFrequency,
        variables: form.variables,
        excludeParameters: form.excludeParameters,
        extras: form.extras,
        selectedExcludeParameters: form.selectedExcludeParameters,
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

                {/* Variables */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Variables</h4>
                  
                  {Object.entries(pricingParameters).map(([paramName, options]) => (
                    <div key={paramName} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`select-all-${paramName}`}
                          checked={form.variables[paramName]?.length === options.length && options.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({
                                ...p,
                                variables: {
                                  ...p.variables,
                                  [paramName]: options
                                }
                              }));
                            } else {
                              setForm(p => ({
                                ...p,
                                variables: {
                                  ...p.variables,
                                  [paramName]: []
                                }
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`select-all-${paramName}`} className="text-sm font-medium cursor-pointer">
                          Select All {paramName.charAt(0).toUpperCase() + paramName.slice(1)}
                        </Label>
                      </div>
                      <div className="ml-6 space-y-2">
                        {options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Checkbox
                              id={`${paramName}-${index}`}
                              checked={form.variables[paramName]?.includes(option) || false}
                              onCheckedChange={(checked) => {
                                const currentSelections = form.variables[paramName] || [];
                                if (checked) {
                                  setForm(p => ({
                                    ...p,
                                    variables: {
                                      ...p.variables,
                                      [paramName]: [...currentSelections, option]
                                    }
                                  }));
                                } else {
                                  setForm(p => ({
                                    ...p,
                                    variables: {
                                      ...p.variables,
                                      [paramName]: currentSelections.filter(item => item !== option)
                                    }
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={`${paramName}-${index}`} className="text-sm font-normal cursor-pointer">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {Object.keys(pricingParameters).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      No pricing parameters added yet. Add pricing parameters from the Pricing section.
                    </p>
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
                            setForm(p => ({ ...p, extras: availableExtras }));
                          } else {
                            setForm(p => ({ ...p, extras: [] }));
                          }
                        }}
                      />
                      <Label htmlFor="select-all-extras" className="text-sm font-medium cursor-pointer">Select All</Label>
                    </div>
                    {availableExtras.map((extra, index) => (
                      <div key={index} className="flex items-center gap-2 ml-6">
                        <Checkbox
                          id={`extra-${index}`}
                          checked={form.extras.includes(extra)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, extras: [...p.extras, extra] }));
                            } else {
                              setForm(p => ({ ...p, extras: p.extras.filter(e => e !== extra) }));
                            }
                          }}
                        />
                        <Label htmlFor={`extra-${index}`} className="text-sm font-normal cursor-pointer">
                          {extra}
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
