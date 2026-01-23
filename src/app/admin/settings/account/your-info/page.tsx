"use client";

import { useEffect, useRef, useState } from "react";
import { useWebsiteConfig } from "@/hooks/useWebsiteConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Building2 } from "lucide-react";
import { useLogo } from "@/contexts/LogoContext";
import { toast } from "sonner";

export default function YourInfoPage() {
  const { logo: currentLogo, updateLogo } = useLogo();
  const [logoFileName, setLogoFileName] = useState("");
  const [logoPreview, setLogoPreview] = useState(currentLogo || "");
  const [logoError, setLogoError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { config, updateConfig } = useWebsiteConfig();

  useEffect(() => {
    // Initialize company name from config
    if (config?.branding?.companyName) {
      setCompanyName(config.branding.companyName);
    }
    
    // Initialize logo preview if we have a logo but no preview yet
    if (currentLogo && !logoPreview) {
      setLogoPreview(currentLogo);
    }
    
    return () => {
      // Only revoke the URL if it's a blob URL
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview, config, currentLogo]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Please select a valid image file.");
      setLogoFileName("");
      setLogoPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width > 300 || img.height > 300) {
        setLogoError("Image must be at most 300x300 pixels.");
        URL.revokeObjectURL(url);
        setLogoFileName("");
        setLogoPreview("");
      } else {
        if (logoPreview) URL.revokeObjectURL(logoPreview);
        setLogoFileName(file.name);
        setLogoPreview(url);
      }
    };
    img.onerror = () => {
      setLogoError("Could not load the selected image.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }

    try {
      setIsSaving(true);
      
      // If there's a logo to save, handle it first
      if (logoPreview) {
        // If the logo is a data URL (newly uploaded), convert it to a Blob for upload
        if (logoPreview.startsWith('data:')) {
          // In a real app, you would upload the blob to your server here
          // For now, we'll just use the data URL directly
          updateLogo(logoPreview);
        } else {
          updateLogo(logoPreview);
        }
      }
      
      // Update company name in config
      const updatedConfig = {
        ...config,
        branding: {
          ...config?.branding,
          companyName: companyName.trim(),
          // Update the logo URL in the config if we have a new one
          logo: logoPreview || config?.branding?.logo || ''
        }
      };
      
      // Save the config with updated company name and logo
      await updateConfig(updatedConfig);
      
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Business Info</CardTitle>
          </div>
          <CardDescription>
            Update your business information and company details. Changes will be reflected throughout the admin dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Details Section */}
          <div className="space-y-4 border-b pb-6 mb-6">
            <h3 className="text-lg font-medium">Business Details</h3>
            
            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-sm font-medium">Business Name</Label>
              <div className="max-w-md">
                <Input
                  id="businessName"
                  placeholder="Enter your business name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  This name will appear in the sidebar and dashboard headers.
                </p>
              </div>
            </div>
          </div>

          {/* Logo selector row */}
          <div className="space-y-2">
            <Label htmlFor="logo">Choose File</Label>
            <div className="flex items-center gap-4 max-w-2xl">
              {/* Preview */}
              <div className="h-14 w-14 rounded-full border bg-white overflow-hidden flex items-center justify-center">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-[10px] text-muted-foreground">No Logo</div>
                )}
              </div>

              {/* Filename + Browse */}
              <div className="flex-1 flex items-center gap-2">
                <Input readOnly value={logoFileName || "No file chosen"} className="bg-muted/40" />
                <input
                  ref={fileInputRef}
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <Button type="button" onClick={() => fileInputRef.current?.click()} className="min-w-[110px]">
                  Browse
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Image size should not be more than 300px by 300px.</div>
            {logoError && <div className="text-xs text-red-600">{logoError}</div>}
          </div>

          {/* Business Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Business Contact Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business-email">Business Email</Label>
                <Input id="business-email" type="email" placeholder="business@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-phone">Business Phone</Label>
                <Input id="business-phone" placeholder="+1 (555) 000-0000" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="business-address">Business Address</Label>
                <Input id="business-address" placeholder="Enter business address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-city">City</Label>
                <Input id="business-city" placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-zip">ZIP Code</Label>
                <Input id="business-zip" placeholder="ZIP Code" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="business-website">Website</Label>
                <Input id="business-website" placeholder="https://yourbusiness.com" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="business-description">Business Description</Label>
                <textarea
                  id="business-description"
                  placeholder="Describe your business services..."
                  className="w-full min-h-[100px] p-3 border rounded-md resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-6 flex justify-end">
            <Button 
              className="mt-6" 
              onClick={handleSave}
              disabled={isSaving || !logoPreview}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
