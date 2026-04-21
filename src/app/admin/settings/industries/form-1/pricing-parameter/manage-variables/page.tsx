"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import { bookingFormScopeFromSearchParams } from "@/lib/bookingFormScope";
import {
  VARIABLE_UI_DEFAULTS,
  type ManagePricingVariableUI,
  mapApiPricingVariables,
  mapPricingVariableToPostBody,
  pricingVariableDisplayLabel,
  pricingVariableDependenciesSummary,
  getManageVariableLabels,
} from "./pricingVariableManageShared";

export default function ManageVariablesPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const bookingFormScope = bookingFormScopeFromSearchParams(params.get("bookingFormScope"));
  const scopeQs = `&bookingFormScope=${bookingFormScope}`;
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const isForm2 = bookingFormScope === "form2";
  const labels = useMemo(() => getManageVariableLabels(isForm2, industry), [isForm2, industry]);
  const listTitle = useMemo(
    () =>
      isForm2
        ? `${industry} - Form 2 / Items`
        : `${industry} - Form 1 / Pricing variables`,
    [isForm2, industry],
  );

  const [variables, setVariables] = useState<ManagePricingVariableUI[]>([]);
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newVariableCategory, setNewVariableCategory] = useState("");
  const [addingDefaults, setAddingDefaults] = useState(false);

  const defaultVariables: ManagePricingVariableUI[] = [
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
      const iid = encodeURIComponent(currentIndustry.id);
      const bid = encodeURIComponent(currentBusiness.id);
      const res = await fetch(`/api/pricing-variables?industryId=${iid}&businessId=${bid}${scopeQs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || labels.loadFail);
      setVariables(mapApiPricingVariables(data.variables ?? []));
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: labels.loadFail, variant: "destructive" });
      setVariables([]);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, industry, toast, bookingFormScope, labels.loadFail]);

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
          bookingFormScope,
          variables: variables.map(mapPricingVariableToPostBody),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || labels.saveFail);
      setVariables(mapApiPricingVariables(data.variables ?? []));
      toast({ title: labels.saveOkTitle, description: labels.saveOkDesc });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: labels.saveFail, variant: "destructive" });
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
          bookingFormScope,
          variables: defaultVariables.map(mapPricingVariableToPostBody),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || labels.defaultsFail);
      setVariables(mapApiPricingVariables(data.variables ?? []));
      toast({
        title: labels.defaultsOkTitle,
        description: "Sq Ft, Bedroom, Bathroom, Hours, and Rooms have been added.",
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: labels.defaultsFail, variant: "destructive" });
    } finally {
      setAddingDefaults(false);
    }
  };

  const addVariable = () => {
    const addedName = newVariableCategory.trim();
    if (!addedName) {
      toast({
        title: "Error",
        description: labels.addRequired,
        variant: "destructive",
      });
      return;
    }

    const newVar: ManagePricingVariableUI = {
      id: `temp-${Date.now()}`,
      name: addedName,
      category: addedName,
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
      title: labels.addTitle,
      description: `${addedName} has been added. ${labels.addPersistHint}`,
    });
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter((v) => v.id !== id));
    toast({
      title: labels.removeTitle,
      description: labels.removeDesc,
    });
  };

  const move = (id: string, dir: -1 | 1) =>
    setVariables((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(j, 0, item);
      return copy;
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAddDialog(true)} disabled={!industryId || loading}>
            {labels.addBtn}
          </Button>
          <Button variant="default" onClick={saveVariables} disabled={saving || !industryId || loading}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{listTitle}</CardTitle>
          <CardDescription>{labels.cardDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Display</TableHead>
                  <TableHead>Dependencies</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : variables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-sm text-muted-foreground mb-4">{labels.emptyLine1}</p>
                      <p className="text-xs text-muted-foreground mb-4">{labels.emptyLine2}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addDefaultVariables}
                        disabled={!industryId || addingDefaults}
                      >
                        {addingDefaults ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {labels.defaultsBtn}
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  variables.map((variable) => (
                    <TableRow key={variable.id}>
                      <TableCell className="font-medium">{variable.name || variable.category || "—"}</TableCell>
                      <TableCell className="text-sm">{pricingVariableDisplayLabel(variable.display)}</TableCell>
                      <TableCell className="text-sm max-w-[240px]">
                        {pricingVariableDependenciesSummary(variable)}
                      </TableCell>
                      <TableCell className="text-sm">{variable.isActive ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                              Options <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {variable.id.startsWith("temp-") ? (
                              <DropdownMenuItem disabled>Save changes first to edit</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/admin/settings/industries/form-1/pricing-parameter/manage-variables/edit?industry=${encodeURIComponent(industry)}${scopeQs}&itemId=${encodeURIComponent(variable.id)}`,
                                  )
                                }
                              >
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => move(variable.id, -1)}>Move Up</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => move(variable.id, 1)}>Move Down</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => removeVariable(variable.id)}
                              className="text-red-600"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
            <DialogTitle>{labels.addDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{labels.addField}</label>
              <Input
                placeholder={labels.addPlaceholder}
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
              {labels.addSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
