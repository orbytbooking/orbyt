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
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/lib/supabaseClient";

export default function YourInfoPage() {
  const { logo: currentLogo, updateLogo } = useLogo();
  const [logoFileName, setLogoFileName] = useState("");
  const [logoPreview, setLogoPreview] = useState(currentLogo || "");
  const [logoError, setLogoError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { config, updateConfig } = useWebsiteConfig();
  const { currentBusiness } = useBusiness();

  // Debug: Log initial state
  console.log('Logo Debug - Initial state:', { currentLogo, logoPreview, currentBusiness: currentBusiness?.logo_url });
  
  // Business form state
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessZip, setBusinessZip] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        setIsDataLoading(true);
        
        // Initialize company name from config
        if (config?.branding?.companyName) {
          setBusinessName(config.branding.companyName);
        }
        
        // Initialize logo preview if we have a logo but no preview yet
        if (currentLogo && !logoPreview) {
          setLogoPreview(currentLogo);
        }
        
        // Get business data from API
        const response = await fetch('/api/admin/business');
        if (response.ok) {
          const data = await response.json();
          const business = data.business;
          
          if (business) {
            setBusinessName(business.name || '');
            setBusinessAddress(business.address || '');
            setBusinessCategory(business.category || '');
            setBusinessWebsite(business.domain || business.website || '');
            setBusinessEmail(business.business_email || '');
            setBusinessPhone(business.business_phone || '');
            setBusinessCity(business.city || '');
            setBusinessZip(business.zip_code || '');
            setBusinessDescription(business.description || '');
            
            // Load logo from business data
            if (business.logo_url) {
              console.log('Logo Debug - Setting logo from business data:', business.logo_url);
              setLogoPreview(business.logo_url);
              updateLogo(business.logo_url);
            }
          }
        } else if (currentBusiness) {
          // Fallback to business context data
          setBusinessName(currentBusiness.name || '');
          setBusinessAddress(currentBusiness.address || '');
          setBusinessCategory(currentBusiness.category || '');
          setBusinessWebsite(currentBusiness.domain || currentBusiness.website || '');
          setBusinessEmail(currentBusiness.business_email || '');
          setBusinessPhone(currentBusiness.business_phone || '');
          setBusinessCity(currentBusiness.city || '');
          setBusinessZip(currentBusiness.zip_code || '');
          setBusinessDescription(currentBusiness.description || '');
          
          // Load logo from business context
          if (currentBusiness.logo_url) {
            setLogoPreview(currentBusiness.logo_url);
            updateLogo(currentBusiness.logo_url);
          }
        }
        
      } catch (error) {
        console.error('Error fetching business data:', error);
        toast.error('Failed to load business data');
        
        // Fallback to business context data
        if (currentBusiness) {
          setBusinessName(currentBusiness.name || '');
          setBusinessAddress(currentBusiness.address || '');
          setBusinessCategory(currentBusiness.category || '');
          setBusinessWebsite(currentBusiness.domain || currentBusiness.website || '');
          setBusinessEmail(currentBusiness.business_email || '');
          setBusinessPhone(currentBusiness.business_phone || '');
          setBusinessCity(currentBusiness.city || '');
          setBusinessZip(currentBusiness.zip_code || '');
          setBusinessDescription(currentBusiness.description || '');
          
          // Load logo from business context
          if (currentBusiness.logo_url) {
            setLogoPreview(currentBusiness.logo_url);
            updateLogo(currentBusiness.logo_url);
          }
        }
      } finally {
        setIsDataLoading(false);
      }
    };
    
    fetchBusinessData();
  }, [config, currentLogo, currentBusiness]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoError("");
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setLogoError("Please select a valid image file.");
      setLogoFileName("");
      setLogoPreview("");
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setLogoError("Image size should not be more than 5MB.");
      setLogoFileName("");
      setLogoPreview("");
      return;
    }
    
    // Create preview
    const url = URL.createObjectURL(file);
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFileName(file.name);
    setLogoPreview(url);
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      toast.error("Please enter a business name");
      return;
    }

    try {
      setIsSaving(true);
      
      // Update business data in database
      const businessResponse = await fetch('/api/admin/business', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: businessName.trim(),
          address: businessAddress.trim(),
          category: businessCategory.trim(),
          domain: businessWebsite.trim(),
          business_email: businessEmail.trim(),
          business_phone: businessPhone.trim(),
          city: businessCity.trim(),
          zip_code: businessZip.trim(),
          website: businessWebsite.trim(),
          description: businessDescription.trim(),
        }),
      });
      
      if (!businessResponse.ok) {
        throw new Error('Failed to update business information');
      }
      
      // If there's a logo to save, handle it
      if (logoPreview && (logoPreview.startsWith('data:') || logoPreview.startsWith('blob:'))) {
        console.log('🎯 Logo Debug: Starting upload process');
        console.log('🎯 Logo Debug: logoPreview type:', logoPreview.startsWith('data:') ? 'data URL' : 'blob URL');
        console.log('🎯 Logo Debug: businessId:', currentBusiness?.id);
        
        // This is a newly uploaded file, convert to blob and upload
        try {
          const response = await fetch(logoPreview);
          const blob = await response.blob();
          const file = new File([blob], logoFileName || 'logo.png', { type: blob.type });
          
          console.log('🎯 Logo Debug: File created:', file.name, file.size, file.type);
          
          const formData = new FormData();
          formData.append('file', file);
          formData.append('businessId', currentBusiness?.id || '');
          
          // Get current session
          const { data: { session } } = await supabase.auth.getSession();
          
          console.log('🎯 Logo Debug: Got session:', session ? 'Yes' : 'No');
          
          const uploadResponse = await fetch('/api/admin/business/upload-logo', {
            method: 'POST',
            body: formData,
          });
          
          const uploadResult = await uploadResponse.json();
          console.log('🎯 Logo Debug: Upload response:', uploadResult);
          
          if (!uploadResponse.ok) {
            throw new Error(uploadResult.error || 'Failed to upload logo');
          }
          
          // Update logo with the permanent URL from Supabase
          console.log('🎯 Logo Debug: Setting new logo URL:', uploadResult.logo_url);
          updateLogo(uploadResult.logo_url);
          setLogoPreview(uploadResult.logo_url);
          
        } catch (uploadError) {
          console.error('Logo upload error:', uploadError);
          toast.error('Failed to upload logo');
          throw uploadError;
        }
      } else if (logoPreview) {
        // This is an existing URL, just update it
        updateLogo(logoPreview);
      }
      
      // Update company name in config
      const updatedConfig = {
        ...config,
        branding: {
          ...config?.branding,
          companyName: businessName.trim(),
          // Use the final logo URL (after upload) or existing one
          logo: logoPreview || config?.branding?.logo || ''
        }
      };
      
      // Save the config with updated company name and logo
      await updateConfig(updatedConfig);
      
      toast.success("Business information saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save business information. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {isDataLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-muted-foreground">Loading business data...</span>
        </div>
      ) : (
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
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
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
                {logoPreview && (logoPreview.startsWith('http') || logoPreview.startsWith('data:')) ? (
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
            {logoError && <div className="text-xs text-red-600">{logoError}</div>}
          </div>

          {/* Business Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Business Contact Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business-email">Business Email</Label>
                <Input 
                  id="business-email" 
                  type="email" 
                  placeholder="business@example.com"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-phone">Business Phone</Label>
                <Input 
                  id="business-phone" 
                  placeholder="+1 (555) 000-0000"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="business-address">Business Address</Label>
                <Input 
                  id="business-address" 
                  placeholder="Enter business address"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-city">City</Label>
                <Input 
                  id="business-city" 
                  placeholder="City"
                  value={businessCity}
                  onChange={(e) => setBusinessCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-zip">ZIP Code</Label>
                <Input 
                  id="business-zip" 
                  placeholder="ZIP Code"
                  value={businessZip}
                  onChange={(e) => setBusinessZip(e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="business-website">Website</Label>
                <Input 
                  id="business-website" 
                  placeholder="https://yourbusiness.com"
                  value={businessWebsite}
                  onChange={(e) => setBusinessWebsite(e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="business-category">Business Category</Label>
                <Input 
                  id="business-category" 
                  placeholder="e.g., Cleaning Services, Consulting, Retail"
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="business-description">Business Description</Label>
                <textarea
                  id="business-description"
                  placeholder="Describe your business services..."
                  className="w-full min-h-[100px] p-3 border rounded-md resize-none"
                  rows={3}
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-6 flex justify-end">
            <Button 
              className="mt-6" 
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
