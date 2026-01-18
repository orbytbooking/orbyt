"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Factory, CheckCircle2, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useMemo, useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
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

interface Industry {
  id: string;
  name: string;
  description: string | null;
  business_id: string;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export default function IndustriesSettingsPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [customIndustry, setCustomIndustry] = useState({ name: "", description: "" });
  const [industryToRemove, setIndustryToRemove] = useState<Industry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { currentBusiness } = useBusiness();

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

  const selectedIndustryNames = useMemo(
    () => industries.map(industry => industry.name),
    [industries]
  );

  useEffect(() => {
    if (currentBusiness) {
      fetchIndustries();
    }
  }, [currentBusiness]);

  const fetchIndustries = async () => {
    if (!currentBusiness) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch industries');
      }
      
      setIndustries(data.industries || []);
    } catch (error) {
      console.error('Error fetching industries:', error);
      toast.error('Failed to load industries');
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (name: string) => {
    if (!currentBusiness) return;
    
    const existingIndustry = industries.find(ind => ind.name === name);
    
    if (existingIndustry) {
      // Remove industry
      try {
        const response = await fetch(`/api/industries?id=${existingIndustry.id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to remove industry');
        }
        
        setIndustries(prev => prev.filter(ind => ind.id !== existingIndustry.id));
        toast.success('Industry removed successfully');
      } catch (error) {
        console.error('Error removing industry:', error);
        toast.error('Failed to remove industry');
      }
    } else {
      // Add industry
      try {
        setSaving(true);
        const response = await fetch('/api/industries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            business_id: currentBusiness.id,
            is_custom: !allIndustries.includes(name)
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to add industry');
        }
        
        setIndustries(prev => [...prev, data.industry]);
        toast.success('Industry added successfully');
      } catch (error) {
        console.error('Error adding industry:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to add industry');
      } finally {
        setSaving(false);
      }
    }
  };

  const saveCustom = async () => {
    if (!customIndustry.name.trim() || !currentBusiness) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/industries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: customIndustry.name.trim(),
          description: customIndustry.description.trim() || null,
          business_id: currentBusiness.id,
          is_custom: true
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add industry');
      }
      
      setIndustries(prev => [...prev, data.industry]);
      setCustomIndustry({ name: "", description: "" });
      toast.success('Custom industry added successfully');
    } catch (error) {
      console.error('Error adding custom industry:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add industry');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveClick = (industry: Industry) => {
    setIndustryToRemove(industry);
    setIsDialogOpen(true);
  };

  const confirmRemove = async () => {
    if (!industryToRemove) return;
    
    try {
      const response = await fetch(`/api/industries?id=${industryToRemove.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove industry');
      }
      
      setIndustries(prev => prev.filter(ind => ind.id !== industryToRemove.id));
      toast.success('Industry removed successfully');
    } catch (error) {
      console.error('Error removing industry:', error);
      toast.error('Failed to remove industry');
    } finally {
      setIndustryToRemove(null);
      setIsDialogOpen(false);
    }
  };

  const cancelRemove = () => {
    setIndustryToRemove(null);
    setIsDialogOpen(false);
  };

  if (!currentBusiness) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please select a business to manage industries.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <TabsTrigger value="added">Added Industries ({industries.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allIndustries.map((name) => {
                  const isOn = selectedIndustryNames.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggle(name)}
                      disabled={loading || saving}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${
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
                  disabled={loading || saving || !customIndustry.name.trim()}
                  className="mt-2"
                  style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)", color: "white" }}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Industry
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="added" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : industries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No industries added yet.</p>
              ) : (
                <div className="space-y-2">
                  {industries.map((industry) => (
                    <div key={industry.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-2">
                      <div className="flex-1">
                        <span className="text-sm font-medium">{industry.name}</span>
                        {industry.is_custom && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Custom</span>
                        )}
                        {industry.description && (
                          <p className="text-xs text-muted-foreground mt-1">{industry.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleRemoveClick(industry)}
                          disabled={loading || saving}
                        >
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
              Are you sure you want to remove "{industryToRemove?.name}" from your industries list? This action can be undone by adding the industry again.
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
