"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Factory, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function IndustriesSettingsPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [customIndustry, setCustomIndustry] = useState({ name: "", description: "" });
  const [industryToRemove, setIndustryToRemove] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const allIndustries = useMemo(
    () => [
      "Carpet Cleaning",
      "Spa",
      "Lawn Care",
      "Gutter Cleaning",
      "Home Cleaning",
      "Financial Advisor",
      "Car Wash",
      "Dog Walker",
      "Exfoliation",
      "Pool Cleaning",
      "Nail Salon",
      "Hair Salon",
      "Accountant",
      "Lawyer",
      "Personal Trainer",
      "Window Cleaning",
      "Office Cleaning",
      "Barber",
      "Moving Service",
      "Pet Groomer",
      "Massage",
      "Roof Construction",
      "Photographer",
      "Education/Tutor",
    ],
    []
  );

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("industries") || "[]");
    setSelected(stored);
  }, []);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name];
      localStorage.setItem("industries", JSON.stringify(next));
      return next;
    });
  };

  const saveCustom = () => {
    if (!customIndustry.name.trim()) return;
    const name = customIndustry.name.trim();
    const next = Array.from(new Set([...selected, name]));
    setSelected(next);
    localStorage.setItem("industries", JSON.stringify(next));
    setCustomIndustry({ name: "", description: "" });
  };

  const handleRemoveClick = (name: string) => {
    setIndustryToRemove(name);
    setIsDialogOpen(true);
  };

  const confirmRemove = () => {
    if (industryToRemove) {
      toggle(industryToRemove);
      setIndustryToRemove(null);
      setIsDialogOpen(false);
    }
  };

  const cancelRemove = () => {
    setIndustryToRemove(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            <CardTitle>Industries</CardTitle>
          </div>
          <CardDescription>
            Select one or more industries you support. You can also add a custom industry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="add" className="w-full">
            <TabsList>
              <TabsTrigger value="add">Add Industry</TabsTrigger>
              <TabsTrigger value="added">Added Industries ({selected.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allIndustries.map((name) => {
                  const isOn = selected.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggle(name)}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left hover:bg-muted ${
                        isOn ? "border-cyan-500 bg-cyan-50" : "border-border"
                      }`}
                    >
                      <span className="text-sm font-medium">{name}</span>
                      {isOn && <CheckCircle2 className="h-4 w-4 text-cyan-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry-name">Custom Industry Name</Label>
                <Input
                  id="industry-name"
                  placeholder="Residential Cleaning"
                  value={customIndustry.name}
                  onChange={(e) => setCustomIndustry((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry-description">Description (optional)</Label>
                <Textarea
                  id="industry-description"
                  rows={3}
                  placeholder="Describe the services and scope provided for this industry"
                  value={customIndustry.description}
                  onChange={(e) => setCustomIndustry((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveCustom}
                  className="mt-2"
                  style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)", color: "white" }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Industry
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="added" className="space-y-4">
              {selected.length === 0 ? (
                <p className="text-sm text-muted-foreground">No industries added yet.</p>
              ) : (
                <div className="space-y-2">
                  {selected.map((name) => (
                    <div key={name} className="flex items-center justify-between rounded-lg border border-border px-4 py-2">
                      <span className="text-sm">{name}</span>
                      <div className="flex gap-2">
                        <Button variant="destructive" size="sm" onClick={() => handleRemoveClick(name)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Industry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{industryToRemove}" from your industries list? This action can be undone by adding the industry again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelRemove}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
