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

export default function FrequencyNewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const editId = params.get("editId") ? Number(params.get("editId")) : null;

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
    serviceCategories?: string[];
    bathroomVariables?: string[];
    sqftVariables?: string[];
    bedroomVariables?: string[];
    excludeParameters?: string[];
    extras?: string[];
    serviceChecklists?: string[];
  };
  const storageKey = useMemo(() => `frequencies_${industry}`, [industry]);
  const [rows, setRows] = useState<Row[]>([]);
  
  // Dynamic data states
  const [pricingVariables, setPricingVariables] = useState<any[]>([]);
  const [excludeParameters, setExcludeParameters] = useState<any[]>([]);
  const [extras, setExtras] = useState<any[]>([]);

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
    serviceCategories: [] as string[],
    bathroomVariables: [] as string[],
    sqftVariables: [] as string[],
    bedroomVariables: [] as string[],
    excludeParameters: [] as string[],
    extras: [] as string[],
    serviceChecklists: [] as string[],
  });

  // Fetch providers from localStorage
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  
  // Load data for dependencies
  const [industries, setIndustries] = useState<string[]>([]);
  const [serviceCategories, setServiceCategories] = useState<Array<{ id: number; name: string }>>([]);
  
  const bathroomOptions = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5"];
  const sqftOptions = [
    "1 - 1249 Sq Ft", "1250 - 1499 Sq Ft", "1500 - 1799 Sq Ft", "1800 - 2099 Sq Ft",
    "2100 - 2399 Sq Ft", "2400 - 2699 Sq Ft", "2700 - 3000 Sq Ft", "3000 - 3299 Sq Ft",
    "3300 - 3699 Sq Ft", "3700 - 3999", "4000+"
  ];
  const bedroomOptions = ["0", "1", "2", "3", "4", "5"];
  const serviceChecklistOptions = ["Basic Clean Checklist", "Deep Clean Checklist", "Construction Clean Checklist", "Move In/Out Clean Checklist"];

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(stored)) setRows(stored);
    } catch {}
  }, [storageKey]);

  // Load industries from localStorage
  useEffect(() => {
    try {
      const storedIndustries = JSON.parse(localStorage.getItem("industries") || "[]");
      if (Array.isArray(storedIndustries)) {
        setIndustries(storedIndustries);
      }
    } catch {
      // ignore
    }
  }, []);

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
  
  // Load service categories and extras
  useEffect(() => {
    try {
      const categoriesKey = `service_categories_${industry}`;
      const storedCategories = JSON.parse(localStorage.getItem(categoriesKey) || "[]");
      if (Array.isArray(storedCategories)) {
        setServiceCategories(storedCategories.map((c: any) => ({ id: c.id, name: c.name })));
      }
      
      const extrasKey = `extras_${industry}`;
      const storedExtras = JSON.parse(localStorage.getItem(extrasKey) || "[]");
      if (Array.isArray(storedExtras)) {
        setExtras(storedExtras.map((e: any) => ({ id: e.id, name: e.name })));
      }
    } catch {
      // ignore
    }
  }, [industry]);

  // Load pricing variables from localStorage
  useEffect(() => {
    try {
      const variablesKey = `pricingVariables_${industry}`;
      const storedVariables = JSON.parse(localStorage.getItem(variablesKey) || "[]");
      if (Array.isArray(storedVariables)) {
        setPricingVariables(storedVariables);
      }
    } catch {
      // ignore
    }
  }, [industry]);

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
    if (editId && rows.length > 0) {
      const existing = rows.find(r => r.id === editId);
      if (existing) {
        setForm({
          name: existing.name,
          description: existing.description || "",
          differentOnCustomerEnd: !!existing.differentOnCustomerEnd,
          showExplanation: !!existing.showExplanation,
          enablePopup: !!existing.enablePopup,
          display: existing.display,
          occurrenceTime: existing.occurrenceTime || "",
          discount: String(existing.discount ?? 0),
          discountType: existing.discountType || "%",
          isDefault: !!existing.isDefault,
          excludedProviders: existing.excludedProviders || [],
          addToOtherIndustries: !!existing.addToOtherIndustries,
          enabledIndustries: existing.enabledIndustries || [],
          showBasedOnLocation: !!existing.showBasedOnLocation,
          serviceCategories: existing.serviceCategories || [],
          bathroomVariables: existing.bathroomVariables || [],
          sqftVariables: existing.sqftVariables || [],
          bedroomVariables: existing.bedroomVariables || [],
          excludeParameters: existing.excludeParameters || [],
          extras: existing.extras || [],
          serviceChecklists: existing.serviceChecklists || [],
        });
      }
    }
  }, [editId, rows]);

  const save = () => {
    const discount = Number(form.discount) || 0;
    if (!form.name.trim()) return;

    if (editId) {
      const updated = rows.map(r => r.id === editId ? {
        ...r,
        name: form.name.trim(),
        discount,
        discountType: form.discountType,
        display: form.display,
        isDefault: form.isDefault,
        description: form.description,
        differentOnCustomerEnd: form.differentOnCustomerEnd,
        showExplanation: form.showExplanation,
        enablePopup: form.enablePopup,
        occurrenceTime: form.occurrenceTime,
        excludedProviders: form.excludedProviders,
        addToOtherIndustries: form.addToOtherIndustries,
        enabledIndustries: form.enabledIndustries,
        showBasedOnLocation: form.showBasedOnLocation,
        serviceCategories: form.serviceCategories,
        bathroomVariables: form.bathroomVariables,
        sqftVariables: form.sqftVariables,
        bedroomVariables: form.bedroomVariables,
        excludeParameters: form.excludeParameters,
        extras: form.extras,
        serviceChecklists: form.serviceChecklists,
      } : r);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } else {
      const nextId = (rows.reduce((m, r) => Math.max(m, r.id), 0) || 0) + 1;
      const newRow: Row = {
        id: nextId,
        name: form.name.trim(),
        discount,
        discountType: form.discountType,
        display: form.display,
        isDefault: form.isDefault,
        description: form.description,
        differentOnCustomerEnd: form.differentOnCustomerEnd,
        showExplanation: form.showExplanation,
        enablePopup: form.enablePopup,
        occurrenceTime: form.occurrenceTime,
        excludedProviders: form.excludedProviders,
        addToOtherIndustries: form.addToOtherIndustries,
        enabledIndustries: form.enabledIndustries,
        showBasedOnLocation: form.showBasedOnLocation,
        serviceCategories: form.serviceCategories,
        bathroomVariables: form.bathroomVariables,
        sqftVariables: form.sqftVariables,
        bedroomVariables: form.bedroomVariables,
        excludeParameters: form.excludeParameters,
        extras: form.extras,
        serviceChecklists: form.serviceChecklists,
      };
      localStorage.setItem(storageKey, JSON.stringify([...rows, newRow]));
    }

    router.push(`/admin/settings/industries/form-1/frequencies?industry=${encodeURIComponent(industry)}`);
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
                <Label htmlFor="freq-name">Name</Label>
                <Input id="freq-name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex. Weekly" />
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
                <Label>Set occurrence time</Label>
                <Select value={form.occurrenceTime} onValueChange={(v) => setForm(p => ({ ...p, occurrenceTime: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every other week</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="freq-discount">Discount</Label>
                  <Input id="freq-discount" type="number" value={form.discount} onChange={(e) => setForm(p => ({ ...p, discount: e.target.value }))} />
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
                    {industries.filter(ind => ind !== industry).length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-2">
                        No other industries available. Add industries from the admin portal first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {industries.filter(ind => ind !== industry).map((ind) => (
                          <div key={ind} className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="text-sm font-medium">{ind}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant={form.enabledIndustries.includes(ind) ? "default" : "outline"}
                              onClick={() => {
                                if (form.enabledIndustries.includes(ind)) {
                                  setForm(p => ({ ...p, enabledIndustries: p.enabledIndustries.filter(i => i !== ind) }));
                                } else {
                                  setForm(p => ({ ...p, enabledIndustries: [...p.enabledIndustries, ind] }));
                                }
                              }}
                            >
                              {form.enabledIndustries.includes(ind) ? "Enabled" : "Disabled"}
                            </Button>
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

                {/* Service Category */}
                <div className="space-y-3 mb-6">
                  <Label className="text-base font-semibold">Service Category</Label>
                  <p className="text-sm text-muted-foreground">
                    Which service categories does this option belong to? In other words will they see this option if they select a specific service category?
                  </p>
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

                  {pricingVariables.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No pricing variables added yet. Add pricing variables from the Pricing section.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          id="select-all-variables"
                          checked={form.bathroomVariables.length + form.sqftVariables.length + form.bedroomVariables.length === pricingVariables.length && pricingVariables.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ 
                                ...p, 
                                bathroomVariables: pricingVariables.filter(v => v.category === "Bathroom").map(v => v.name),
                                sqftVariables: pricingVariables.filter(v => v.category === "Sq Ft").map(v => v.name),
                                bedroomVariables: pricingVariables.filter(v => v.category === "Bedroom").map(v => v.name)
                              }));
                            } else {
                              setForm(p => ({ ...p, bathroomVariables: [], sqftVariables: [], bedroomVariables: [] }));
                            }
                          }}
                        />
                        <Label htmlFor="select-all-variables" className="text-sm cursor-pointer">Select All</Label>
                      </div>
                      
                      {/* Group variables by category */}
                      {['Bathroom', 'Sq Ft', 'Bedroom'].map(category => {
                        const categoryVariables = pricingVariables.filter(v => v.category === category);
                        if (categoryVariables.length === 0) return null;
                        
                        return (
                          <div key={category} className="space-y-2">
                            <Label className="text-sm font-semibold">{category}</Label>
                            <div className="grid grid-cols-4 gap-2">
                              {categoryVariables.map((variable) => (
                                <div key={variable.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`variable-${variable.id}`}
                                    checked={
                                      category === 'Bathroom' ? form.bathroomVariables.includes(variable.name) :
                                      category === 'Sq Ft' ? form.sqftVariables.includes(variable.name) :
                                      form.bedroomVariables.includes(variable.name)
                                    }
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        if (category === 'Bathroom') {
                                          setForm(p => ({ ...p, bathroomVariables: [...p.bathroomVariables, variable.name] }));
                                        } else if (category === 'Sq Ft') {
                                          setForm(p => ({ ...p, sqftVariables: [...p.sqftVariables, variable.name] }));
                                        } else {
                                          setForm(p => ({ ...p, bedroomVariables: [...p.bedroomVariables, variable.name] }));
                                        }
                                      } else {
                                        if (category === 'Bathroom') {
                                          setForm(p => ({ ...p, bathroomVariables: p.bathroomVariables.filter(v => v !== variable.name) }));
                                        } else if (category === 'Sq Ft') {
                                          setForm(p => ({ ...p, sqftVariables: p.sqftVariables.filter(v => v !== variable.name) }));
                                        } else {
                                          setForm(p => ({ ...p, bedroomVariables: p.bedroomVariables.filter(v => v !== variable.name) }));
                                        }
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
                </div>

                {/* Service Checklist */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Service Checklist</Label>
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-checklists"
                        checked={form.serviceChecklists.length === serviceChecklistOptions.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setForm(p => ({ ...p, serviceChecklists: [...serviceChecklistOptions] }));
                          } else {
                            setForm(p => ({ ...p, serviceChecklists: [] }));
                          }
                        }}
                      />
                      <Label htmlFor="select-all-checklists" className="text-sm font-medium cursor-pointer">Select All</Label>
                    </div>
                    {serviceChecklistOptions.map((opt) => (
                      <div key={opt} className="flex items-center gap-2">
                        <Checkbox
                          id={`checklist-${opt}`}
                          checked={form.serviceChecklists.includes(opt)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, serviceChecklists: [...p.serviceChecklists, opt] }));
                            } else {
                              setForm(p => ({ ...p, serviceChecklists: p.serviceChecklists.filter(c => c !== opt) }));
                            }
                          }}
                        />
                        <Label htmlFor={`checklist-${opt}`} className="text-sm cursor-pointer">{opt}</Label>
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
