"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2, MapPin, Pen } from "lucide-react";
import GoogleDrawMap from "@/components/map/GoogleDrawMap";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";

interface DrawnShape {
  id: string;
  type: "polygon" | "circle" | "rectangle" | "marker";
  coordinates: unknown;
  properties?: { radius?: number; area?: number };
}

function normalizeShapeForApi(s: DrawnShape): { type: string; coordinates: unknown; properties?: { radius?: number } } {
  const coords = s.coordinates as Record<string, unknown>;
  const isFeature = coords && typeof coords === "object" && "geometry" in coords;
  const geometry = isFeature ? (coords as { geometry?: { type?: string; coordinates?: unknown } }).geometry : null;
  return {
    type: s.type,
    coordinates: geometry ? { type: (geometry as { type?: string }).type, coordinates: (geometry as { coordinates?: unknown }).coordinates } : coords,
    properties: s.properties ? { radius: s.properties.radius } : undefined,
  };
}

export default function AddLocationPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const industryId = params.get("industryId") || "";
  const editId = params.get("editId");
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string>("");

  // Details
  const [name, setName] = useState("");
  const [primaryZipCodes, setPrimaryZipCodes] = useState("");
  const [wildcardZipCodes, setWildcardZipCodes] = useState("");
  const [excludeZipCodes, setExcludeZipCodes] = useState("");
  const [secondaryZipCodesActive, setSecondaryZipCodesActive] = useState(false);
  const [chargeServiceFee, setChargeServiceFee] = useState(false);
  const [enableDraw, setEnableDraw] = useState(false);
  const [drawnShapes, setDrawnShapes] = useState<DrawnShape[]>([]);
  const [zipcodesLoadingShapeId, setZipcodesLoadingShapeId] = useState<string | null>(null);
  const [zipcodesByShapeId, setZipcodesByShapeId] = useState<Record<string, string[]>>({});

  // Dependencies
  const [addToOtherIndustries, setAddToOtherIndustries] = useState(false);
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<string[]>([]);
  const [industries, setIndustries] = useState<{ id: string; name: string }[]>([]);
  const [frequencies, setFrequencies] = useState<{ id: string; name: string }[]>([]);
  const [serviceCategories, setServiceCategories] = useState<{ id: string; name: string }[]>([]);
  const [pricingParams, setPricingParams] = useState<{ id: string; name: string; category?: string }[]>([]);
  const [excludeParams, setExcludeParams] = useState<{ id: string; name: string }[]>([]);
  const [extras, setExtras] = useState<{ id: string; name: string }[]>([]);
  const [depFreqIds, setDepFreqIds] = useState<string[]>([]);
  const [depCategoryIds, setDepCategoryIds] = useState<string[]>([]);
  const [depVariableIds, setDepVariableIds] = useState<string[]>([]);
  const [depExcludeIds, setDepExcludeIds] = useState<string[]>([]);
  const [depExtraIds, setDepExtraIds] = useState<string[]>([]);

  // Providers
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [excludedProviderIds, setExcludedProviderIds] = useState<string[]>([]);

  const listHref = `/admin/settings/industries/form-1/locations?industry=${encodeURIComponent(industry)}${industryId ? `&industryId=${industryId}` : ""}`;

  useEffect(() => {
    const resolveBusiness = async () => {
      if (currentBusiness?.id) {
        setBusinessId(currentBusiness.id);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("businesses").select("id").eq("owner_id", user.id).eq("is_active", true).single();
      if (data) setBusinessId(data.id);
    };
    resolveBusiness();
  }, [currentBusiness?.id]);

  // Load existing location when editing
  useEffect(() => {
    if (!editId || !businessId) return;
    const load = async () => {
      const { data: loc } = await supabase.from("locations").select("*").eq("id", editId).eq("business_id", businessId).single();
      if (loc) {
        setName(loc.name ?? "");
        setPrimaryZipCodes(""); // load from location_zip_codes if needed
        if (Array.isArray(loc.excluded_provider_ids) && loc.excluded_provider_ids.length > 0) {
          setExcludedProviderIds(loc.excluded_provider_ids);
        }
        // Restore drawn shapes (coordinates as JSON) for map
        const stored = loc.drawn_shape_json;
        if (Array.isArray(stored) && stored.length > 0) {
          setDrawnShapes(
            stored.map((s: { id?: string; type: string; coordinates: unknown; properties?: Record<string, unknown> }, i: number) => ({
              id: s.id ?? `shape-${i}-${Date.now()}`,
              type: s.type || "polygon",
              coordinates: s.coordinates,
              properties: s.properties ?? {},
            }))
          );
        }
      }
      const { data: zips } = await supabase.from("location_zip_codes").select("zip_code").eq("location_id", editId).eq("active", true);
      if (zips?.length) setPrimaryZipCodes(zips.map((z: { zip_code: string }) => z.zip_code).join(","));
      if (industryId) {
        const { data: dep } = await supabase
          .from("industry_location")
          .select("*")
          .eq("location_id", editId)
          .eq("industry_id", industryId)
          .single();
        if (dep) {
          setAddToOtherIndustries(!!dep.add_to_other_industries);
          if (Array.isArray(dep.enabled_industry_ids)) setSelectedIndustryIds(dep.enabled_industry_ids);
          if (Array.isArray(dep.frequency_ids)) setDepFreqIds(dep.frequency_ids);
          if (Array.isArray(dep.service_category_ids)) setDepCategoryIds(dep.service_category_ids);
          if (Array.isArray(dep.variable_ids)) setDepVariableIds(dep.variable_ids);
          if (Array.isArray(dep.exclude_param_ids)) setDepExcludeIds(dep.exclude_param_ids);
          if (Array.isArray(dep.extra_ids)) setDepExtraIds(dep.extra_ids);
        }
      }
    };
    load();
  }, [editId, businessId, industryId]);

  // Load industries, frequencies, categories, etc. for Dependencies
  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const [indRes, freqRes, catRes, paramRes, exclRes, extRes] = await Promise.all([
        fetch(`/api/industries?business_id=${businessId}`),
        industryId ? fetch(`/api/industry-frequency?industryId=${industryId}&includeAll=true`) : null,
        industryId ? fetch(`/api/service-categories?industryId=${industryId}`) : null,
        industryId ? fetch(`/api/pricing-parameters?industryId=${industryId}`) : null,
        industryId ? fetch(`/api/exclude-parameters?industryId=${industryId}`) : null,
        industryId ? fetch(`/api/extras?industryId=${industryId}`) : null,
      ]);
      const indData = await indRes.json();
      if (indData.industries) setIndustries(indData.industries.map((i: { id: string; name: string }) => ({ id: i.id, name: i.name })));
      if (freqRes?.ok) {
        const d = await freqRes.json();
        setFrequencies((d.frequencies || d).map((f: { id: string; name?: string; frequency?: string }) => ({ id: f.id, name: f.name || f.frequency || "" })));
      }
      if (catRes?.ok) {
        const d = await catRes.json();
        const list = d.serviceCategories || d.categories || d;
        setServiceCategories(Array.isArray(list) ? list.map((c: { id: string; name?: string }) => ({ id: c.id, name: c.name || "" })) : []);
      }
      if (paramRes?.ok) {
        const d = await paramRes.json();
        const list = d.pricingParameters || d.parameters || d || [];
        setPricingParams(Array.isArray(list) ? list.map((p: { id: string; name?: string; description?: string; variable_category?: string }) => ({ id: p.id, name: p.description || p.name || "", category: p.variable_category })) : []);
      }
      if (exclRes?.ok) {
        const d = await exclRes.json();
        setExcludeParams((d.excludeParameters || d).map((e: { id: string; name?: string }) => ({ id: e.id, name: e.name || "" })));
      }
      if (extRes?.ok) {
        const d = await extRes.json();
        setExtras((d.extras || d).map((e: { id: string; name?: string }) => ({ id: e.id, name: e.name || "" })));
      }
    })();
  }, [businessId, industryId]);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const res = await fetch(`/api/admin/providers?businessId=${businessId}`);
      const data = await res.json();
      if (data.providers) setProviders(data.providers.map((p: { id: string; name?: string; firstName?: string; lastName?: string }) => ({ id: p.id, name: p.name || [p.firstName, p.lastName].filter(Boolean).join(" ") || "" })));
    })();
  }, [businessId]);

  const handleShapeCreated = useCallback((shape: DrawnShape) => setDrawnShapes((prev) => [...prev, shape]), []);
  const handleShapeEdited = useCallback((shape: DrawnShape) => {
    setDrawnShapes((prev) => prev.map((s) => (s.id === shape.id ? shape : s)));
    setZipcodesByShapeId((prev) => {
      const next = { ...prev };
      delete next[shape.id];
      return next;
    });
  }, []);
  const handleShapeDeleted = useCallback((shapeId: string) => {
    setDrawnShapes((prev) => prev.filter((s) => s.id !== shapeId));
    setZipcodesByShapeId((prev) => {
      const next = { ...prev };
      delete next[shapeId];
      return next;
    });
  }, []);

  const handleGetZipcodes = async (shape: DrawnShape) => {
    if (shape.type === "marker") {
      toast({ title: "Draw a polygon, circle, or rectangle to get zip codes.", variant: "destructive" });
      return;
    }
    setZipcodesLoadingShapeId(shape.id);
    try {
      const res = await fetch("/api/locations/map/zipcodes-in-area", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shape: normalizeShapeForApi(shape) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to get zip codes");
      const zips = (data.zipcodes || []) as string[];
      setZipcodesByShapeId((prev) => ({ ...prev, [shape.id]: zips }));
      setPrimaryZipCodes((prev) => {
        const existing = prev ? prev.split(",").map((z) => z.trim()).filter(Boolean) : [];
        return [...new Set([...existing, ...zips])].sort().join(",");
      });
      toast({ title: `Found ${data.count ?? zips.length} zip code(s).` });
    } catch (e) {
      toast({ title: "Could not get zip codes", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setZipcodesLoadingShapeId(null);
    }
  };

  const persistDependencies = async (locId: string) => {
    if (!industryId || !businessId) return;
    const deps = {
      location_id: locId,
      industry_id: industryId,
      business_id: businessId,
      add_to_other_industries: addToOtherIndustries,
      enabled_industry_ids: selectedIndustryIds,
      frequency_ids: depFreqIds,
      service_category_ids: depCategoryIds,
      variable_ids: depVariableIds,
      exclude_param_ids: depExcludeIds,
      extra_ids: depExtraIds,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("industry_location")
      .upsert(deps, { onConflict: "location_id,industry_id", ignoreDuplicates: false });
    if (error) throw error;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!businessId) {
      toast({ title: "Business not found", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const zips = primaryZipCodes.split(",").map((z) => z.trim()).filter(Boolean);
      const firstZip = zips[0] || undefined;

      const drawnShapeJson = drawnShapes.length > 0
        ? drawnShapes.map((s) => ({ id: s.id, type: s.type, coordinates: s.coordinates, properties: s.properties ?? {} }))
        : null;

      if (editId) {
        await supabase
          .from("locations")
          .update({
            name: name.trim(),
            postal_code: firstZip,
            drawn_shape_json: drawnShapeJson,
            excluded_provider_ids: excludedProviderIds,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editId)
          .eq("business_id", businessId);

        await supabase.from("location_zip_codes").delete().eq("location_id", editId);
        if (zips.length > 0) {
          await supabase.from("location_zip_codes").insert(
            zips.map((zip_code) => ({ location_id: editId, zip_code, country: "USA", active: true }))
          );
        }
        await persistDependencies(editId);
        toast({ title: "Location updated." });
      } else {
        const { data: loc, error } = await supabase
          .from("locations")
          .insert([{ business_id: businessId, name: name.trim(), postal_code: firstZip, drawn_shape_json: drawnShapeJson, excluded_provider_ids: excludedProviderIds, active: true }])
          .select()
          .single();
        if (error) throw error;
        const locId = loc.id;
        if (zips.length > 0) {
          await supabase.from("location_zip_codes").insert(
            zips.map((zip_code) => ({ location_id: locId, zip_code, country: "USA", active: true }))
          );
        }
        await persistDependencies(locId);
        toast({ title: "Location created." });
      }
      router.push(listHref);
    } catch (e) {
      toast({ title: "Failed to save location", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleDepFreq = (id: string) => setDepFreqIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleDepCategory = (id: string) => setDepCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleDepVariable = (id: string) => setDepVariableIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleDepExclude = (id: string) => setDepExcludeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleDepExtra = (id: string) => setDepExtraIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleProvider = (id: string) => setExcludedProviderIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const variablesByCategory = useMemo(() => {
    const map: Record<string, { id: string; name: string }[]> = {};
    for (const p of pricingParams) {
      const cat = p.category || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push({ id: p.id, name: p.name });
    }
    return map;
  }, [pricingParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={listHref} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Locations
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Location" : "Add Location"}</CardTitle>
          <CardDescription>
            Add a service area or merchant location. Configure details, payment processor, dependencies, and providers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground mb-6">
            From here you can add your locations whether it is a merchant location/store, a service area/customer location or both.
            If you save without adding a payment processor, you will not be able to take credit card transactions for that location.
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="payment">Payment Processor</TabsTrigger>
              <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              <TabsTrigger value="providers">Providers</TabsTrigger>
            </TabsList>

            {/* DETAILS */}
            <TabsContent value="details" className="mt-4 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="location-name">Name of service area</Label>
                <Input
                  id="location-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Austin"
                />
              </div>

              <div className="space-y-2">
                <Label>Primary location</Label>
                <p className="text-xs text-muted-foreground">Draw your area on the map to retrieve zip codes (US).</p>
                <div className="flex gap-2">
                  <Button type="button" variant={enableDraw ? "default" : "outline"} size="sm" onClick={() => setEnableDraw(!enableDraw)} className="gap-2">
                    <Pen className="h-4 w-4" />
                    {enableDraw ? "Drawing on" : "Drawing off"}
                  </Button>
                  {drawnShapes.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { setDrawnShapes([]); setZipcodesByShapeId({}); }}>
                      Reset area
                    </Button>
                  )}
                </div>
                <GoogleDrawMap
                  height="360px"
                  center={[40.7128, -74.006]}
                  zoom={6}
                  enableDraw={enableDraw}
                  onShapeCreated={handleShapeCreated}
                  onShapeEdited={handleShapeEdited}
                  onShapeDeleted={handleShapeDeleted}
                  drawnShapes={drawnShapes}
                />
                {drawnShapes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {drawnShapes.map((shape) =>
                      shape.type !== "marker" ? (
                        <Button
                          key={shape.id}
                          variant="outline"
                          size="sm"
                          disabled={zipcodesLoadingShapeId === shape.id}
                          onClick={() => handleGetZipcodes(shape)}
                        >
                          {zipcodesLoadingShapeId === shape.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                          {" "}Get zip codes
                        </Button>
                      ) : null
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Primary zip/postal codes or areas</Label>
                <p className="text-xs text-muted-foreground">Comma-separated, no spaces. US zip code finder above; for other countries enter or upload.</p>
                <Textarea
                  className="min-h-[80px]"
                  placeholder="10001,10003,10005"
                  value={primaryZipCodes}
                  onChange={(e) => setPrimaryZipCodes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Wildcard zip/postal codes</Label>
                <p className="text-xs text-muted-foreground">Abbreviated codes can allow flexible booking.</p>
                <Textarea className="min-h-[60px]" placeholder="A1A, A1B, A1C" value={wildcardZipCodes} onChange={(e) => setWildcardZipCodes(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Exclude zip/postal codes</Label>
                <p className="text-xs text-muted-foreground">Codes entered here will prevent bookings.</p>
                <Textarea className="min-h-[60px]" placeholder="A1A 1A1, A1A 1A2" value={excludeZipCodes} onChange={(e) => setExcludeZipCodes(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Activate secondary zip/postal codes?</Label>
                <RadioGroup value={secondaryZipCodesActive ? "yes" : "no"} onValueChange={(v) => setSecondaryZipCodesActive(v === "yes")} className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="yes" /> Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="no" /> No
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Charge a service fee for traveling to the location?</Label>
                <RadioGroup value={chargeServiceFee ? "yes" : "no"} onValueChange={(v) => setChargeServiceFee(v === "yes")} className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="yes" /> Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="no" /> No
                  </label>
                </RadioGroup>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" asChild><Link href={listHref}>Cancel</Link></Button>
                <Button onClick={() => setActiveTab("payment")}>Next</Button>
              </div>
            </TabsContent>

            {/* PAYMENT PROCESSOR */}
            <TabsContent value="payment" className="mt-4 space-y-6">
              <p className="text-sm text-muted-foreground">Configure payment processor for this location. Coming soon.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActiveTab("details")}>Back</Button>
                <Button onClick={() => setActiveTab("dependencies")}>Next</Button>
              </div>
            </TabsContent>

            {/* DEPENDENCIES */}
            <TabsContent value="dependencies" className="mt-4 space-y-6">
              <div className="space-y-2">
                <Label>Add this location to any other industries?</Label>
                <RadioGroup value={addToOtherIndustries ? "yes" : "no"} onValueChange={(v) => setAddToOtherIndustries(v === "yes")} className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="yes" /> Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="no" /> No
                  </label>
                </RadioGroup>
              </div>
              {addToOtherIndustries && (
                <div className="space-y-2">
                  <Label>Industries</Label>
                  <div className="flex flex-wrap gap-4">
                    {industries.map((ind) => (
                      <label key={ind.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIndustryIds.includes(ind.id)}
                          onCheckedChange={() => setSelectedIndustryIds((prev) => (prev.includes(ind.id) ? prev.filter((x) => x !== ind.id) : [...prev, ind.id]))}
                        />
                        {ind.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-medium">{industry} – Form 1</h4>
                <div className="space-y-4">
                  {frequencies.length > 0 && (
                    <div>
                      <Label className="mb-2 block">Frequencies</Label>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={depFreqIds.length === frequencies.length}
                            onCheckedChange={(c) => (c ? setDepFreqIds(frequencies.map((f) => f.id)) : setDepFreqIds([]))}
                          />
                          Select All
                        </label>
                        {frequencies.map((f) => (
                          <label key={f.id} className="flex items-center gap-2">
                            <Checkbox checked={depFreqIds.includes(f.id)} onCheckedChange={() => toggleDepFreq(f.id)} />
                            {f.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {serviceCategories.length > 0 && (
                    <div>
                      <Label className="mb-2 block">Service category</Label>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={depCategoryIds.length === serviceCategories.length}
                            onCheckedChange={(c) => (c ? setDepCategoryIds(serviceCategories.map((c) => c.id)) : setDepCategoryIds([]))}
                          />
                          Select All
                        </label>
                        {serviceCategories.map((c) => (
                          <label key={c.id} className="flex items-center gap-2">
                            <Checkbox checked={depCategoryIds.includes(c.id)} onCheckedChange={() => toggleDepCategory(c.id)} />
                            {c.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.keys(variablesByCategory).length > 0 && (
                    <div>
                      <Label className="mb-2 block">Variables</Label>
                      {Object.entries(variablesByCategory).map(([cat, list]) => (
                        <div key={cat} className="mb-3">
                          <span className="text-sm font-medium text-muted-foreground">{cat}</span>
                          <div className="flex flex-wrap gap-4 mt-1">
                            <label className="flex items-center gap-2">
                              <Checkbox
                                checked={list.every((v) => depVariableIds.includes(v.id))}
                                onCheckedChange={(c) =>
                                  c ? setDepVariableIds((prev) => [...new Set([...prev, ...list.map((v) => v.id)])]) : setDepVariableIds((prev) => prev.filter((id) => !list.some((v) => v.id === id)))
                                }
                              />
                              Select All
                            </label>
                            {list.map((v) => (
                              <label key={v.id} className="flex items-center gap-2">
                                <Checkbox checked={depVariableIds.includes(v.id)} onCheckedChange={() => toggleDepVariable(v.id)} />
                                {v.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {excludeParams.length > 0 && (
                    <div>
                      <Label className="mb-2 block">Exclude parameters</Label>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={depExcludeIds.length === excludeParams.length}
                            onCheckedChange={(c) => (c ? setDepExcludeIds(excludeParams.map((e) => e.id)) : setDepExcludeIds([]))}
                          />
                          Select All
                        </label>
                        {excludeParams.map((e) => (
                          <label key={e.id} className="flex items-center gap-2">
                            <Checkbox checked={depExcludeIds.includes(e.id)} onCheckedChange={() => toggleDepExclude(e.id)} />
                            {e.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {extras.length > 0 && (
                    <div>
                      <Label className="mb-2 block">Extras</Label>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={depExtraIds.length === extras.length}
                            onCheckedChange={(c) => (c ? setDepExtraIds(extras.map((e) => e.id)) : setDepExtraIds([]))}
                          />
                          Select All
                        </label>
                        {extras.map((e) => (
                          <label key={e.id} className="flex items-center gap-2">
                            <Checkbox checked={depExtraIds.includes(e.id)} onCheckedChange={() => toggleDepExtra(e.id)} />
                            {e.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActiveTab("payment")}>Back</Button>
                <Button onClick={() => setActiveTab("providers")}>Next</Button>
              </div>
            </TabsContent>

            {/* PROVIDERS */}
            <TabsContent value="providers" className="mt-4 space-y-6">
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-sm">
                When you check the box next to a provider&apos;s name, you will exclude this location from the provider&apos;s repertoire. They will not receive jobs for this location.
              </div>
              <Label>Check the providers you want to exclude from this location</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={providers.length > 0 && excludedProviderIds.length === providers.length}
                    onCheckedChange={(c) => (c ? setExcludedProviderIds(providers.map((p) => p.id)) : setExcludedProviderIds([]))}
                  />
                  Select All
                </label>
                {providers.map((p) => (
                  <label key={p.id} className="flex items-center gap-2">
                    <Checkbox checked={excludedProviderIds.includes(p.id)} onCheckedChange={() => toggleProvider(p.id)} />
                    {p.name || p.id.slice(0, 8)}
                  </label>
                ))}
              </div>
              {providers.length === 0 && <p className="text-sm text-muted-foreground">No providers added yet.</p>}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActiveTab("dependencies")}>Back</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
