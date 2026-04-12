"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Trash2, ArrowLeft, Pencil, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
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
import { Form1RichTextEditor } from "@/components/admin/Form1RichTextEditor";
import {
  normalizeFrequencyPopupDisplay,
  type FrequencyPopupDisplay,
} from "@/lib/frequencyPopupDisplay";
import {
  normalizePricingVariableDisplay,
  type PricingVariableDisplay,
} from "@/lib/pricing-variables";

const VARIABLE_UI_DEFAULTS = {
  showExplanationIconOnForm: false,
  explanationTooltipText: "",
  enablePopupOnSelection: false,
  popupContent: "",
  popupDisplay: "customer_frontend_backend_admin" as FrequencyPopupDisplay,
  display: "customer_frontend_backend_admin" as PricingVariableDisplay,
};

type PricingVariable = {
  id: string;
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
};

export default function ManageVariablesPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();

  const [variables, setVariables] = useState<PricingVariable[]>([]);
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newVariableCategory, setNewVariableCategory] = useState("");
  const [editingVariable, setEditingVariable] = useState<PricingVariable | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    description: "",
    differentOnCustomerEnd: false,
    customerEndName: "",
    ...VARIABLE_UI_DEFAULTS,
  });
  const [addingDefaults, setAddingDefaults] = useState(false);

  const defaultVariables: PricingVariable[] = [
    {
      id: "temp-sqft",
      name: "Sq Ft",
      category: "Sq Ft",
      description: "Square footage tiers",
      isActive: true,
      differentOnCustomerEnd: false,
      customerEndName: "",
      ...VARIABLE_UI_DEFAULTS,
    },
    {
      id: "temp-bedroom",
      name: "Bedroom",
      category: "Bedroom",
      description: "Number of bedrooms",
      isActive: false,
      differentOnCustomerEnd: false,
      customerEndName: "",
      ...VARIABLE_UI_DEFAULTS,
    },
    {
      id: "temp-bathroom",
      name: "Bathroom",
      category: "Bathroom",
      description: "Number of bathrooms",
      isActive: false,
      differentOnCustomerEnd: false,
      customerEndName: "",
      ...VARIABLE_UI_DEFAULTS,
    },
    {
      id: "temp-hours",
      name: "Hours",
      category: "Hours",
      description: "Service duration in hours",
      isActive: false,
      differentOnCustomerEnd: false,
      customerEndName: "",
      ...VARIABLE_UI_DEFAULTS,
    },
    {
      id: "temp-rooms",
      name: "Rooms",
      category: "Rooms",
      description: "Number of rooms",
      isActive: false,
      differentOnCustomerEnd: false,
      customerEndName: "",
      ...VARIABLE_UI_DEFAULTS,
    },
  ];

  const mapApiVariables = (raw: any[]) =>
    (raw || []).map(
      (v: {
        id: string;
        name: string;
        category: string;
        description?: string;
        is_active?: boolean;
        different_on_customer_end?: boolean;
        customer_end_name?: string | null;
        show_explanation_icon_on_form?: boolean;
        explanation_tooltip_text?: string | null;
        enable_popup_on_selection?: boolean;
        popup_content?: string | null;
        popup_display?: string | null;
        display?: string | null;
      }) => ({
        id: v.id,
        name: v.name ?? v.category ?? "",
        category: v.category ?? v.name ?? "",
        description: v.description ?? "",
        isActive: v.is_active ?? true,
        differentOnCustomerEnd: Boolean(v.different_on_customer_end),
        customerEndName: v.customer_end_name ?? "",
        showExplanationIconOnForm: Boolean(v.show_explanation_icon_on_form),
        explanationTooltipText: v.explanation_tooltip_text ?? "",
        enablePopupOnSelection: Boolean(v.enable_popup_on_selection),
        popupContent: v.popup_content ?? "",
        popupDisplay: normalizeFrequencyPopupDisplay(v.popup_display),
        display: normalizePricingVariableDisplay(v.display),
      }),
    );

  const loadVariables = useCallback(async () => {
    if (!currentBusiness?.id || !industry) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const indRes = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
      const indData = await indRes.json();
      const industriesList = indData.industries ?? [];
      const industryNorm = industry.trim().toLowerCase();
      const currentIndustry = industriesList.find(
        (ind: { name: string }) => (ind.name || "").trim().toLowerCase() === industryNorm
      ) ?? industriesList.find((ind: { name: string }) => (ind.name || "").toLowerCase().includes(industryNorm));
      if (!currentIndustry?.id) {
        setVariables([]);
        setIndustryId(null);
        setLoading(false);
        return;
      }
      setIndustryId(currentIndustry.id);
      const res = await fetch(`/api/pricing-variables?industryId=${encodeURIComponent(currentIndustry.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load variables");
      setVariables(mapApiVariables(data.variables ?? []));
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load variables", variant: "destructive" });
      setVariables([]);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, industry, toast]);

  useEffect(() => {
    loadVariables();
  }, [loadVariables]);

  const saveVariables = async () => {
    if (!industryId || !currentBusiness?.id) {
      toast({ title: "Error", description: "Industry or business not loaded.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/pricing-variables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industryId,
          businessId: currentBusiness.id,
          variables: variables.map((v) => ({
            id: v.id.startsWith("temp-") ? undefined : v.id,
            name: v.name,
            category: v.category,
            description: v.description || "",
            is_active: v.isActive,
            different_on_customer_end: v.differentOnCustomerEnd,
            customer_end_name: v.differentOnCustomerEnd
              ? v.customerEndName.trim() || null
              : null,
            show_explanation_icon_on_form: v.showExplanationIconOnForm,
            explanation_tooltip_text: v.showExplanationIconOnForm
              ? v.explanationTooltipText.trim() || null
              : null,
            enable_popup_on_selection: v.enablePopupOnSelection,
            popup_content: v.enablePopupOnSelection ? v.popupContent : "",
            popup_display: v.popupDisplay,
            display: v.display,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save variables");
      setVariables(mapApiVariables(data.variables ?? []));
      toast({ title: "Variables saved", description: "Pricing variables have been updated successfully." });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to save variables.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addDefaultVariables = async () => {
    if (!industryId || !currentBusiness?.id) return;
    setAddingDefaults(true);
    try {
      const res = await fetch("/api/pricing-variables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industryId,
          businessId: currentBusiness.id,
          variables: defaultVariables.map((v) => ({
            name: v.name,
            category: v.category,
            description: v.description || "",
            is_active: v.isActive,
            different_on_customer_end: v.differentOnCustomerEnd,
            customer_end_name: v.differentOnCustomerEnd
              ? v.customerEndName.trim() || null
              : null,
            show_explanation_icon_on_form: v.showExplanationIconOnForm,
            explanation_tooltip_text: v.showExplanationIconOnForm
              ? v.explanationTooltipText.trim() || null
              : null,
            enable_popup_on_selection: v.enablePopupOnSelection,
            popup_content: v.enablePopupOnSelection ? v.popupContent : "",
            popup_display: v.popupDisplay,
            display: v.display,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add default variables");
      setVariables(mapApiVariables(data.variables ?? []));
      toast({ title: "Default variables added", description: "Sq Ft, Bedroom, Bathroom, Hours, and Rooms have been added." });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to add default variables", variant: "destructive" });
    } finally {
      setAddingDefaults(false);
    }
  };

  const addVariable = () => {
    if (!newVariableCategory.trim()) {
      toast({
        title: "Error",
        description: "Variable category is required.",
        variant: "destructive",
      });
      return;
    }

    const newVar: PricingVariable = {
      id: `temp-${Date.now()}`,
      name: newVariableCategory.trim(),
      category: newVariableCategory.trim(),
      description: "",
      isActive: false,
      differentOnCustomerEnd: false,
      customerEndName: "",
      ...VARIABLE_UI_DEFAULTS,
    };

    setVariables([...variables, newVar]);
    setNewVariableCategory("");
    setShowAddDialog(false);
    toast({
      title: "Variable added",
      description: `${newVariableCategory} has been added. Click Save Changes to persist.`,
    });
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter((v) => v.id !== id));
    toast({
      title: "Variable removed",
      description: "The variable has been removed.",
    });
  };

  const openEditDialog = (variable: PricingVariable) => {
    setEditingVariable(variable);
    setEditForm({
      name: variable.name.trim(),
      category: variable.category.trim(),
      description: variable.description ?? "",
      differentOnCustomerEnd: variable.differentOnCustomerEnd,
      customerEndName: variable.customerEndName ?? "",
      showExplanationIconOnForm: variable.showExplanationIconOnForm,
      explanationTooltipText: variable.explanationTooltipText ?? "",
      enablePopupOnSelection: variable.enablePopupOnSelection,
      popupContent: variable.popupContent ?? "",
      popupDisplay: variable.popupDisplay,
      display: variable.display,
    });
    setShowEditDialog(true);
  };

  const updateVariable = () => {
    if (!editForm.category.trim()) {
      toast({
        title: "Error",
        description: "Variable category key is required (must match pricing parameters).",
        variant: "destructive",
      });
      return;
    }
    if (!editForm.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!editingVariable) return;

    setVariables(
      variables.map((v) =>
        v.id === editingVariable.id
          ? {
              ...v,
              name: editForm.name.trim(),
              category: editForm.category.trim(),
              description: editForm.description.trim(),
              differentOnCustomerEnd: editForm.differentOnCustomerEnd,
              customerEndName: editForm.differentOnCustomerEnd
                ? editForm.customerEndName.trim()
                : "",
              showExplanationIconOnForm: editForm.showExplanationIconOnForm,
              explanationTooltipText: editForm.explanationTooltipText.trim(),
              enablePopupOnSelection: editForm.enablePopupOnSelection,
              popupContent: editForm.popupContent,
              popupDisplay: editForm.popupDisplay,
              display: editForm.display,
            }
          : v,
      ),
    );
    setShowEditDialog(false);
    setEditingVariable(null);
    toast({
      title: "Variable updated",
      description: "Variable has been updated successfully.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/settings/industries/form-1/pricing-parameter?industry=${encodeURIComponent(industry)}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pricing Parameters
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAddDialog(true)} disabled={!industryId}>
            <Plus className="h-4 w-4 mr-2" />
            Add Variable
          </Button>
          <Button onClick={saveVariables} disabled={saving || !industryId}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Pricing Variables - {industry}</CardTitle>
          <CardDescription>
            Define and manage pricing variables that can be used for different pricing parameters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variable Name</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8">
                      <p className="text-sm text-muted-foreground mb-4">No variables defined.</p>
                      <p className="text-xs text-muted-foreground mb-4">Click &quot;Add Variable&quot; above to create one, or add common defaults below.</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addDefaultVariables}
                        disabled={!industryId || addingDefaults}
                      >
                        {addingDefaults ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Add default variables (Sq Ft, Bedroom, Bathroom, Hours, Rooms)
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  variables.map((variable) => (
                    <TableRow key={variable.id}>
                      <TableCell className="font-medium">{variable.name || variable.category || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(variable)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVariable(variable.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Variable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Variable Category</label>
              <Input
                placeholder="e.g., Bedroom, Bathroom, Pool Size"
                value={newVariableCategory}
                onChange={(e) => setNewVariableCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addVariable();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={addVariable}>
              Add Variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditingVariable(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit variable</DialogTitle>
          </DialogHeader>
          <TooltipProvider delayDuration={200}>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Variables are used to build pricing structures (for example, tiers like &quot;1 Bedroom&quot; starting at
                a set price).
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="edit-var-name">Name</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-sm"
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
                            className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-sm"
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
                <Label htmlFor="edit-var-desc">Description</Label>
                <Textarea
                  id="edit-var-desc"
                  rows={3}
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
                          <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none rounded-sm" aria-label="About explanation icon">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs text-sm">
                          When enabled, an info icon is shown next to this variable on the customer booking form. Use the
                          tooltip text below to explain it.
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
                          <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none rounded-sm" aria-label="About popup on selection">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-sm text-sm leading-snug">
                          When enabled, a popup with the content below is shown when the customer selects an option for
                          this variable (where visibility allows).
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
                                <button type="button" className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none rounded-sm" aria-label="About where popup appears">
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs text-sm leading-snug">
                                Control whether this popup appears on public book-now, logged-in customer booking, and/or
                                admin booking.
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
                <p className="text-xs text-muted-foreground">Where should this variable appear on booking flows?</p>
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
                <Label htmlFor="edit-var-category">Variable category key</Label>
                <p className="text-xs text-muted-foreground">
                  Must match <span className="font-medium">variable category</span> on pricing parameters (internal key).
                </p>
                <Input
                  id="edit-var-category"
                  placeholder="e.g., Sq Ft, Bedroom"
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                />
              </div>
            </div>
          </TooltipProvider>
          <DialogFooter className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" type="button" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={updateVariable}>
              Update Variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
