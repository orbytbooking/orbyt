"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Users, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ProviderType = "individual" | "team";
type ProviderStatus = "active" | "inactive" | "suspended";

interface ProviderForm {
  type: ProviderType;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  sendEmailNotification: boolean;
}

const createEmptyProviderForm = (): ProviderForm => ({
  type: "individual",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  sendEmailNotification: false,
});

export default function AddProviderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<"selection" | "form">("selection");
  const [provider, setProvider] = useState<ProviderForm>(createEmptyProviderForm());
  const [loading, setLoading] = useState(false);

  const handleTypeSelection = (type: ProviderType) => {
    setProvider({ ...provider, type });
    setStep("form");
  };

  const handleBack = () => {
    if (step === "form") {
      setStep("selection");
    } else {
      router.push("/admin/providers");
    }
  };

  const handleCancel = () => {
    router.push("/admin/providers");
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!provider.firstName || !provider.lastName || !provider.email || !provider.phone || !provider.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Get current business ID from localStorage
      const currentBusinessId = localStorage.getItem('currentBusinessId');
      if (!currentBusinessId) {
        toast({
          title: "Configuration Error",
          description: "No business context found. Please select a business first.",
          variant: "destructive",
        });
        return;
      }

      // Call API route to create provider
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: provider.firstName,
          lastName: provider.lastName,
          email: provider.email,
          phone: provider.phone,
          address: provider.address,
          type: provider.type,
          sendEmailNotification: provider.sendEmailNotification,
          businessId: currentBusinessId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create provider');
      }

      toast({
        title: "Provider Invitation Sent",
        description: `${provider.firstName} ${provider.lastName} has been invited successfully. They will receive an email to set up their account.`,
      });

      router.push("/admin/providers");
      
    } catch (error: any) {
      console.error('Provider creation error:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "An error occurred while creating the provider account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === "selection") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8 text-white hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Add Service Provider</h1>
            <p className="text-sm text-white/70">
              Choose the type of service provider you want to add
            </p>
          </div>
        </div>

        {/* Provider Type Selection */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-cyan-400/50 bg-gray-900/60 backdrop-blur-xl border-cyan-500/30"
            onClick={() => handleTypeSelection("individual")}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 rounded-full bg-blue-100 w-fit">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Individual Provider</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Add a single service provider who works independently
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-cyan-400/50 bg-gray-900/60 backdrop-blur-xl border-cyan-500/30"
            onClick={() => handleTypeSelection("team")}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 rounded-full bg-green-100 w-fit">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Team Provider</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Add a team of service providers who work together
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-8 w-8 text-white hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Add {provider.type === "individual" ? "Individual" : "Team"} Provider
          </h1>
          <p className="text-sm text-white/70">
            Enter the provider details below
          </p>
        </div>
      </div>

      {/* Provider Form */}
      <Card className="w-full bg-gray-900/60 backdrop-blur-xl border-cyan-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {provider.type === "individual" ? (
              <User className="h-5 w-5 text-blue-600" />
            ) : (
              <Users className="h-5 w-5 text-green-600" />
            )}
            {provider.type === "individual" ? "Individual" : "Team"} Provider Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                {provider.type === "individual" ? "First Name" : "Company/Team Name"} *
              </Label>
              <Input
                id="firstName"
                placeholder={provider.type === "individual" ? "Enter first name" : "Enter company/team name"}
                value={provider.firstName}
                onChange={(e) => setProvider({ ...provider, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">
                {provider.type === "individual" ? "Last Name" : "Contact Person"} *
              </Label>
              <Input
                id="lastName"
                placeholder={provider.type === "individual" ? "Enter last name" : "Enter contact person name"}
                value={provider.lastName}
                onChange={(e) => setProvider({ ...provider, lastName: e.target.value })}
              />
            </div>
          </div>

          {/* Address Field */}
          <div className="space-y-2">
            <Label htmlFor="address">Full Address *</Label>
            <Input
              id="address"
              placeholder="Enter complete address (street, city, state, zip, country)"
              value={provider.address}
              onChange={(e) => setProvider({ ...provider, address: e.target.value })}
            />
          </div>

          {/* Contact Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={provider.email}
                onChange={(e) => setProvider({ ...provider, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={provider.phone}
                onChange={(e) => setProvider({ ...provider, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Email Notification Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendEmailNotification"
              checked={provider.sendEmailNotification}
              onCheckedChange={(checked) => setProvider({ ...provider, sendEmailNotification: !!checked })}
            />
            <Label htmlFor="sendEmailNotification" className="text-sm">
              Send email notifications
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="text-white flex-1"
              style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' }}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  Add Provider
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
