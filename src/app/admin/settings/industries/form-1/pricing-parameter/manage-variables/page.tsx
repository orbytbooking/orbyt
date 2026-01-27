"use client";

import { useEffect, useState } from "react";
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
import { Plus, Trash2, ArrowLeft, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const [variables, setVariables] = useState<PricingVariable[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newVariableCategory, setNewVariableCategory] = useState("");
  const [editingVariable, setEditingVariable] = useState<PricingVariable | null>(null);
  const [editVariableCategory, setEditVariableCategory] = useState("");

  const defaultVariables: PricingVariable[] = [
    { id: "sq-ft", name: "Sq Ft", category: "Sq Ft", description: "Square footage tiers", isActive: true },
    { id: "bedroom", name: "Bedroom", category: "Bedroom", description: "Number of bedrooms", isActive: false },
    { id: "bathroom", name: "Bathroom", category: "Bathroom", description: "Number of bathrooms", isActive: false },
    { id: "hours", name: "Hours", category: "Hours", description: "Service duration in hours", isActive: false },
    { id: "rooms", name: "Rooms", category: "Rooms", description: "Number of rooms", isActive: false },
  ];

  useEffect(() => {
    // Load variables
    try {
      const variablesKey = `pricingVariables_${industry}`;
      const storedVars = JSON.parse(localStorage.getItem(variablesKey) || "null");
      if (Array.isArray(storedVars) && storedVars.length > 0) {
        setVariables(storedVars);
      } else {
        setVariables(defaultVariables);
        localStorage.setItem(variablesKey, JSON.stringify(defaultVariables));
      }
    } catch {
      setVariables(defaultVariables);
    }
  }, [industry]);

  const saveVariables = () => {
    try {
      const variablesKey = `pricingVariables_${industry}`;
      localStorage.setItem(variablesKey, JSON.stringify(variables));
      toast({
        title: "Variables saved",
        description: "Pricing variables have been updated successfully.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save variables.",
        variant: "destructive",
      });
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
      id: newVariableCategory.toLowerCase().replace(/\s+/g, "-"),
      name: newVariableCategory,
      category: newVariableCategory,
      description: "",
      isActive: false,
    };

    setVariables([...variables, newVar]);
    setNewVariableCategory("");
    setShowAddDialog(false);
    toast({
      title: "Variable added",
      description: `${newVariableCategory} has been added to the list.`,
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
          <Button variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Variable
          </Button>
          <Button onClick={saveVariables}>
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
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                      No variables defined.
                    </TableCell>
                  </TableRow>
                ) : (
                  variables.map((variable) => (
                    <TableRow key={variable.id}>
                      <TableCell className="font-medium">{variable.name}</TableCell>
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
