"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form1RichTextEditor } from "@/components/admin/Form1RichTextEditor";
import { Info, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import type { FrequencyPopupDisplay } from "@/lib/frequencyPopupDisplay";
import type { PricingVariableDisplay } from "@/lib/pricing-variables";
import { bookingFormScopeFromSearchParams } from "@/lib/bookingFormScope";
import {
  VARIABLE_UI_DEFAULTS,
  type ManagePricingVariableUI,
  mapApiPricingVariables,
  mapPricingVariableToPostBody,
  getManageVariableLabels,
} from "../pricingVariableManageShared";

type EditFormState = {
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  differentOnCustomerEnd: boolean;
  customerEndName: string;
  showExplanationIconOnForm: boolean;
  explanationTooltipText: string;
  enablePopupOnSelection: boolean;
  popupContent: string;
  popupDisplay: FrequencyPopupDisplay;
  display: PricingVariableDisplay;
  showBasedOnFrequency: boolean;
  frequencyOptions: string[];
  showBasedOnServiceCategory: boolean;
  serviceCategoryOptions: string[];
};

function formFromVariable(v: ManagePricingVariableUI): EditFormState {
  return {
    name: v.name.trim(),
    category: v.category.trim(),
    description: v.description ?? "",
    isActive: v.isActive,
    differentOnCustomerEnd: v.differentOnCustomerEnd,
    customerEndName: v.customerEndName ?? "",
    showExplanationIconOnForm: v.showExplanationIconOnForm,
    explanationTooltipText: v.explanationTooltipText ?? "",
    enablePopupOnSelection: v.enablePopupOnSelection,
    popupContent: v.popupContent ?? "",
    popupDisplay: v.popupDisplay,
    display: v.display,
    showBasedOnFrequency: v.showBasedOnFrequency,
    frequencyOptions: [...v.frequencyOptions],
    showBasedOnServiceCategory: v.showBasedOnServiceCategory,
    serviceCategoryOptions: [...v.serviceCategoryOptions],
  };
}

function variableFromForm(id: string, form: EditFormState): ManagePricingVariableUI {
  return {
    id,
    name: form.name.trim(),
    category: form.category.trim(),
    description: form.description.trim(),
    isActive: form.isActive,
    differentOnCustomerEnd: form.differentOnCustomerEnd,
    customerEndName: form.differentOnCustomerEnd ? form.customerEndName.trim() : "",
    showExplanationIconOnForm: form.showExplanationIconOnForm,
    explanationTooltipText: form.explanationTooltipText.trim(),
    enablePopupOnSelection: form.enablePopupOnSelection,
    popupContent: form.popupContent,
    popupDisplay: form.popupDisplay,
    display: form.display,
    showBasedOnFrequency: form.showBasedOnFrequency,
    frequencyOptions: form.showBasedOnFrequency ? [...form.frequencyOptions] : [],
    showBasedOnServiceCategory: form.showBasedOnServiceCategory,
    serviceCategoryOptions: form.showBasedOnServiceCategory ? [...form.serviceCategoryOptions] : [],
  };
}

export default function EditPricingVariablePage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const itemId = params.get("itemId") || "";
  const bookingFormScope = bookingFormScopeFromSearchParams(params.get("bookingFormScope"));
  const scopeQs = `&bookingFormScope=${bookingFormScope}`;
  const isForm2 = bookingFormScope === "form2";
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const labels = useMemo(() => getManageVariableLabels(isForm2, industry), [isForm2, industry]);

  const listHref = `/admin/settings/industries/form-1/pricing-parameter/manage-variables?industry=${encodeURIComponent(industry)}${scopeQs}`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [allRows, setAllRows] = useState<ManagePricingVariableUI[]>([]);
  const [editForm, setEditForm] = useState<EditFormState>({
    name: "",
    category: "",
    description: "",
    isActive: true,
    differentOnCustomerEnd: false,
    customerEndName: "",
    ...VARIABLE_UI_DEFAULTS,
  });
  const [frequencyNames, setFrequencyNames] = useState<string[]>([]);
  const [serviceCategoryNames, setServiceCategoryNames] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("details");

  const load = useCallback(async () => {
    if (!currentBusiness?.id || !industry || !itemId || itemId.startsWith("temp-")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const indRes = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
      const indData = await indRes.json();
      const industriesList = indData.industries ?? [];
      const industryNorm = industry.trim().toLowerCase();
      const currentIndustry =
        industriesList.find(
          (ind: { name: string }) => (ind.name || "").trim().toLowerCase() === industryNorm,
        ) ??
        industriesList.find((ind: { name: string }) => (ind.name || "").toLowerCase().includes(industryNorm));
      if (!currentIndustry?.id) {
        setIndustryId(null);
        setAllRows([]);
        setLoading(false);
        return;
      }
      setIndustryId(currentIndustry.id);
      const iid = encodeURIComponent(currentIndustry.id);
      const bid = encodeURIComponent(currentBusiness.id);
      const [res, freqRes, catRes] = await Promise.all([
        fetch(`/api/pricing-variables?industryId=${iid}&businessId=${bid}${scopeQs}`),
        fetch(`/api/industry-frequency?industryId=${iid}&includeAll=true${scopeQs}`),
        fetch(`/api/service-categories?industryId=${iid}&businessId=${bid}${scopeQs}`),
      ]);
      const data = await res.json();
      const freqData = await freqRes.json().catch(() => ({}));
      const catData = await catRes.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || labels.loadFail);
      const rows = mapApiPricingVariables(data.variables ?? []);
      setAllRows(rows);
      const found = rows.find((r) => r.id === itemId);
      if (!found) {
        toast({ title: "Not found", description: labels.loadFail, variant: "destructive" });
        setAllRows([]);
      } else {
        setEditForm(formFromVariable(found));
      }
      setFrequencyNames(
        Array.isArray(freqData.frequencies)
          ? freqData.frequencies
              .map((f: { name?: string }) => String(f.name ?? "").trim())
              .filter(Boolean)
          : [],
      );
      setServiceCategoryNames(
        Array.isArray(catData.serviceCategories)
          ? catData.serviceCategories
              .map((c: { name?: string }) => String(c.name ?? "").trim())
              .filter(Boolean)
          : [],
      );
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: labels.loadFail, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, industry, itemId, toast, bookingFormScope, labels.loadFail]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!industryId || !currentBusiness?.id) {
      toast({ title: "Error", description: "Industry or business not loaded.", variant: "destructive" });
      return;
    }
    if (!editForm.category.trim()) {
      toast({ title: "Error", description: labels.catKeyRequired, variant: "destructive" });
      return;
    }
    if (!editForm.name.trim()) {
      toast({ title: "Error", description: labels.nameRequired, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const merged = allRows.map((v) => (v.id === itemId ? variableFromForm(itemId, editForm) : v));
      const res = await fetch("/api/pricing-variables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industryId,
          businessId: currentBusiness.id,
          bookingFormScope,
          variables: merged.map(mapPricingVariableToPostBody),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || labels.saveFail);
      toast({ title: labels.updateTitle, description: labels.updateDesc });
      router.push(listHref);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: labels.saveFail, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!itemId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{labels.editTitle}</CardTitle>
            <CardDescription>Missing item id. Return to the list and choose Edit again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" type="button" onClick={() => router.push(listHref)}>
              {labels.cancelBtn}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (itemId.startsWith("temp-")) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{labels.editTitle}</CardTitle>
            <CardDescription>
              Save new rows from the list with &quot;Save changes&quot; before editing them here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" type="button" onClick={() => router.push(listHref)}>
              {labels.cancelBtn}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{labels.editTitle}</CardTitle>
            <CardDescription>
              {isForm2 ? `Configure this item for ${industry}.` : `Configure this variable for ${industry}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!allRows.some((r) => r.id === itemId)) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{labels.editTitle}</CardTitle>
            <CardDescription>This row could not be loaded.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" type="button" onClick={() => router.push(listHref)}>
              {labels.cancelBtn}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const depsHintVisible =
    labels.depsTabHint &&
    !editForm.showBasedOnFrequency &&
    !editForm.showBasedOnServiceCategory;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{labels.editTitle}</CardTitle>
          <CardDescription>
            {labels.editIntro}
            {!industryId && (
              <span className="text-red-500 ml-2">Loading industry information...</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="details">{labels.tabDetails}</TabsTrigger>
              <TabsTrigger value="dependencies">{labels.tabDependencies}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-5">
            <TooltipProvider delayDuration={200}>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="edit-var-name">Name *</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 rounded-sm"
                        aria-label="About name"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-sm">
                      Admin-side label. If you want the customer to see a different name, use &quot;Different on
                      customer end&quot; below.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="edit-var-name"
                  placeholder="e.g., Sq Ft, 1 - 1249 Sq Ft"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                <Checkbox
                  id="edit-var-active"
                  checked={editForm.isActive}
                  onCheckedChange={(checked) => setEditForm((p) => ({ ...p, isActive: !!checked }))}
                />
                <Label htmlFor="edit-var-active" className="text-sm font-medium cursor-pointer">
                  Active
                </Label>
              </div>

              <div className="rounded-lg border border-sky-200/90 bg-sky-50/90 p-4 dark:border-sky-900/55 dark:bg-sky-950/30">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="edit-diff-customer-end"
                    className="mt-0.5"
                    checked={editForm.differentOnCustomerEnd}
                    onCheckedChange={(checked) =>
                      setEditForm((p) => ({
                        ...p,
                        differentOnCustomerEnd: !!checked,
                        ...(!checked ? { customerEndName: "" } : {}),
                      }))
                    }
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="edit-diff-customer-end" className="text-sm font-medium cursor-pointer">
                        Different on customer end
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 rounded-sm"
                            aria-label="About different on customer end"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs text-sm">
                          If you want the customer to see a different name you can add that name here.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {editForm.differentOnCustomerEnd && (
                      <Input
                        id="edit-customer-end-name"
                        value={editForm.customerEndName}
                        onChange={(e) => setEditForm((p) => ({ ...p, customerEndName: e.target.value }))}
                        placeholder="Enter Customer End Name"
                        className="bg-background"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="edit-var-desc">Description</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 rounded-sm"
                        aria-label="About description"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-sm">
                      Shown internally and where your booking UI surfaces descriptions for this row.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  id="edit-var-desc"
                  rows={4}
                  placeholder="Add Description"
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="edit-show-explanation"
                    checked={editForm.showExplanationIconOnForm}
                    onCheckedChange={(checked) =>
                      setEditForm((p) => ({
                        ...p,
                        showExplanationIconOnForm: !!checked,
                        ...(!checked ? { explanationTooltipText: "" } : {}),
                      }))
                    }
                  />
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="edit-show-explanation" className="text-sm font-medium cursor-pointer">
                        Show explanation icon on form
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 rounded-sm"
                            aria-label="About explanation icon"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs text-sm">
                          {labels.explTooltip}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {editForm.showExplanationIconOnForm && (
                      <Textarea
                        placeholder="Add Tooltip Text"
                        value={editForm.explanationTooltipText}
                        onChange={(e) => setEditForm((p) => ({ ...p, explanationTooltipText: e.target.value }))}
                        className="min-h-[80px] resize-y bg-background mt-2"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-sky-200/90 bg-sky-50/90 p-4 dark:border-sky-900/55 dark:bg-sky-950/30">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="edit-enable-popup"
                    className="mt-0.5"
                    checked={editForm.enablePopupOnSelection}
                    onCheckedChange={(checked) =>
                      setEditForm((p) => ({
                        ...p,
                        enablePopupOnSelection: !!checked,
                        ...(!checked ? { popupContent: "" } : {}),
                      }))
                    }
                  />
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="edit-enable-popup" className="text-sm font-medium cursor-pointer">
                        Enable popup on selection
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 rounded-sm"
                            aria-label="About popup on selection"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-sm text-sm leading-snug">
                          {labels.popupTooltip}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {editForm.enablePopupOnSelection && (
                      <div className="space-y-4">
                        <Form1RichTextEditor
                          value={editForm.popupContent}
                          onChange={(html) => setEditForm((p) => ({ ...p, popupContent: html }))}
                        />
                        <div className="space-y-3 border-t border-sky-200/80 pt-4 dark:border-sky-800/60">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-sm font-medium">Display popup on</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 rounded-sm"
                                  aria-label="About where popup appears"
                                >
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs text-sm leading-snug">
                                Control whether this popup appears on public book-now, logged-in customer booking,
                                and/or admin booking.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <RadioGroup
                            value={editForm.popupDisplay}
                            onValueChange={(val) =>
                              setEditForm((p) => ({ ...p, popupDisplay: val as FrequencyPopupDisplay }))
                            }
                            className="grid gap-2"
                          >
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <RadioGroupItem value="customer_frontend_backend_admin" />
                              Customer frontend, backend &amp; admin
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <RadioGroupItem value="customer_backend_admin" />
                              Customer backend &amp; admin
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <RadioGroupItem value="customer_frontend_backend" />
                              Customer only (frontend &amp; backend)
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <RadioGroupItem value="admin_only" />
                              Admin only
                            </label>
                          </RadioGroup>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Display</h4>
                <p className="text-xs text-muted-foreground">
                  {labels.displayWhereLong ?? labels.displayWhere}
                </p>
                <RadioGroup
                  value={editForm.display}
                  onValueChange={(val) =>
                    setEditForm((p) => ({ ...p, display: val as PricingVariableDisplay }))
                  }
                  className="grid gap-2"
                >
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="customer_frontend_backend_admin" />
                    Customer frontend, backend &amp; admin
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="customer_backend_admin" />
                    Customer backend &amp; admin
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="admin_only" />
                    Admin only
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-var-category">{labels.editCategoryLabel}</Label>
                <p className="text-xs text-muted-foreground">{labels.editCategoryHelp}</p>
                <Input
                  id="edit-var-category"
                  placeholder={labels.editCategoryPh}
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                />
              </div>
            </TooltipProvider>
        </TabsContent>

        <TabsContent value="dependencies" className="mt-4 space-y-5">
            {isForm2 ? (
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Form 2</h3>
            ) : null}
            <p className="text-sm text-muted-foreground">{labels.depsIntro}</p>
            {depsHintVisible ? (
              <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
                {labels.depsTabHint}
              </div>
            ) : null}

            <div className="flex items-start gap-2">
              <Checkbox
                id="edit-dep-frequency"
                className="mt-0.5"
                checked={editForm.showBasedOnFrequency}
                onCheckedChange={(checked) =>
                  setEditForm((p) => ({
                    ...p,
                    showBasedOnFrequency: !!checked,
                    ...(!checked ? { frequencyOptions: [] } : {}),
                  }))
                }
              />
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="edit-dep-frequency" className="text-sm font-medium cursor-pointer">
                  Show based on frequency
                </Label>
                {editForm.showBasedOnFrequency &&
                  (frequencyNames.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No frequencies found. Add frequencies for this industry first.
                    </p>
                  ) : (
                    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="edit-dep-freq-all"
                          checked={
                            frequencyNames.length > 0 && editForm.frequencyOptions.length === frequencyNames.length
                          }
                          onCheckedChange={(c) =>
                            setEditForm((p) => ({
                              ...p,
                              frequencyOptions: c === true ? [...frequencyNames] : [],
                            }))
                          }
                        />
                        <Label htmlFor="edit-dep-freq-all" className="text-sm font-medium cursor-pointer">
                          Select all
                        </Label>
                      </div>
                      <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                        {frequencyNames.map((freq, fi) => (
                          <div key={`${freq}-${fi}`} className="flex items-center gap-2 min-w-0">
                            <Checkbox
                              id={`edit-dep-freq-${fi}`}
                              checked={editForm.frequencyOptions.includes(freq)}
                              onCheckedChange={(c) =>
                                setEditForm((p) => {
                                  const set = new Set(p.frequencyOptions);
                                  if (c === true) set.add(freq);
                                  else set.delete(freq);
                                  return { ...p, frequencyOptions: Array.from(set) };
                                })
                              }
                            />
                            <Label
                              htmlFor={`edit-dep-freq-${fi}`}
                              className="text-sm font-normal cursor-pointer truncate"
                            >
                              {freq}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="edit-dep-service-category"
                className="mt-0.5"
                checked={editForm.showBasedOnServiceCategory}
                onCheckedChange={(checked) =>
                  setEditForm((p) => ({
                    ...p,
                    showBasedOnServiceCategory: !!checked,
                    ...(!checked ? { serviceCategoryOptions: [] } : {}),
                  }))
                }
              />
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="edit-dep-service-category" className="text-sm font-medium cursor-pointer">
                  Show based on service category
                </Label>
                {editForm.showBasedOnServiceCategory &&
                  (serviceCategoryNames.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No service categories found. Add service categories for this industry first.
                    </p>
                  ) : (
                    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="edit-dep-cat-all"
                          checked={
                            serviceCategoryNames.length > 0 &&
                            editForm.serviceCategoryOptions.length === serviceCategoryNames.length
                          }
                          onCheckedChange={(c) =>
                            setEditForm((p) => ({
                              ...p,
                              serviceCategoryOptions: c === true ? [...serviceCategoryNames] : [],
                            }))
                          }
                        />
                        <Label htmlFor="edit-dep-cat-all" className="text-sm font-medium cursor-pointer">
                          Select all
                        </Label>
                      </div>
                      <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                        {serviceCategoryNames.map((cat, ci) => (
                          <div key={`${cat}-${ci}`} className="flex items-center gap-2 min-w-0">
                            <Checkbox
                              id={`edit-dep-cat-${ci}`}
                              checked={editForm.serviceCategoryOptions.includes(cat)}
                              onCheckedChange={(c) =>
                                setEditForm((p) => {
                                  const set = new Set(p.serviceCategoryOptions);
                                  if (c === true) set.add(cat);
                                  else set.delete(cat);
                                  return { ...p, serviceCategoryOptions: Array.from(set) };
                                })
                              }
                            />
                            <Label
                              htmlFor={`edit-dep-cat-${ci}`}
                              className="text-sm font-normal cursor-pointer truncate"
                            >
                              {cat}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
        </TabsContent>
      </Tabs>

          <div className="mt-6 flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => router.push(listHref)}>
              {labels.cancelBtn}
            </Button>
            <Button
              type="button"
              onClick={save}
              className="text-white"
              style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
              disabled={saving || !industryId || !editForm.name.trim() || !editForm.category.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                labels.updateBtn
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
