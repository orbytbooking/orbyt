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
import { Plus, Trash2, ArrowLeft, Pencil, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";

type PricingVariable = {
  id: string;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
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
  const [editVariableCategory, setEditVariableCategory] = useState("");
  const [addingDefaults, setAddingDefaults] = useState(false);

  const defaultVariables: PricingVariable[] = [
    { id: "temp-sqft", name: "Sq Ft", category: "Sq Ft", description: "Square footage tiers", isActive: true },
    { id: "temp-bedroom", name: "Bedroom", category: "Bedroom", description: "Number of bedrooms", isActive: false },
    { id: "temp-bathroom", name: "Bathroom", category: "Bathroom", description: "Number of bathrooms", isActive: false },
    { id: "temp-hours", name: "Hours", category: "Hours", description: "Service duration in hours", isActive: false },
    { id: "temp-rooms", name: "Rooms", category: "Rooms", description: "Number of rooms", isActive: false },
  ];

  const mapApiVariables = (raw: any[]) =>
    (raw || []).map((v: { id: string; name: string; category: string; description?: string; is_active?: boolean }) => ({
      id: v.id,
      name: v.name ?? v.category ?? "",
      category: v.category ?? v.name ?? "",
      description: v.description ?? "",
      isActive: v.is_active ?? true,
    }));

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

  const toggleVariableActive = (id: string) => {
    setVariables(variables.map((v) => 
      v.id === id ? { ...v, isActive: !v.isActive } : v
    ));
  };

  const openEditDialog = (variable: PricingVariable) => {
    setEditingVariable(variable);
    setEditVariableCategory(variable.category);
    setShowEditDialog(true);
  };

  const updateVariable = () => {
    if (!editVariableCategory.trim()) {
      toast({
        title: "Error",
        description: "Variable category is required.",
        variant: "destructive",
      });
      return;
    }

    if (!editingVariable) return;

    setVariables(variables.map((v) => 
      v.id === editingVariable.id 
        ? { ...v, name: editVariableCategory, category: editVariableCategory }
        : v
    ));
    setShowEditDialog(false);
    setEditingVariable(null);
    setEditVariableCategory("");
    toast({
      title: "Variable updated",
      description: `Variable has been updated successfully.`,
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

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Variable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Variable Category</label>
              <Input
                placeholder="e.g., Bedroom, Bathroom, Pool Size"
                value={editVariableCategory}
                onChange={(e) => setEditVariableCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateVariable();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={updateVariable}>
              Update Variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
