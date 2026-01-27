"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Building2, Mail, Phone, Globe, MapPin, FileText } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import BusinessLogoUpload from "@/components/admin/BusinessLogoUpload";

export default function GeneralSettingsPage() {
  const { currentBusiness } = useBusiness();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    business_email: '',
    business_phone: '',
    website: '',
    address: '',
    city: '',
    zip_code: '',
    category: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentBusiness) {
      setFormData({
        name: currentBusiness.name || '',
        description: currentBusiness.description || '',
        business_email: currentBusiness.business_email || '',
        business_phone: currentBusiness.business_phone || '',
        website: currentBusiness.website || '',
        address: currentBusiness.address || '',
        city: currentBusiness.city || '',
        zip_code: currentBusiness.zip_code || '',
        category: currentBusiness.category || ''
      });
    }
  }, [currentBusiness]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/business', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update business information');
      }

      setMessage({ type: 'success', text: 'Business information updated successfully!' });
      
      // Refresh business data
      window.location.reload();

    } catch (error) {
      console.error('Update error:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update business information' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!currentBusiness) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading business information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Business Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Business Logo
          </CardTitle>
          <CardDescription>
            Upload your business logo to display on your website and communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessLogoUpload 
            businessId={currentBusiness.id}
            currentLogo={currentBusiness.logo_url}
            onLogoUpdate={async (logoUrl) => {
              // Refresh business data from database to get the updated logo_url
              try {
                const response = await fetch('/api/admin/business');
                const result = await response.json();
                
                if (response.ok && result.business) {
                  // Update the current business data with fresh data from database
                  Object.assign(currentBusiness, result.business);
                }
              } catch (error) {
                console.error('Failed to refresh business data:', error);
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Business Information Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Business Information</CardTitle>
          </div>
          <CardDescription>
            Update your business details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Business Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  <option value="cleaning">Cleaning Services</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="hvac">HVAC</option>
                  <option value="general">General Contracting</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your business..."
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Business Email
                </label>
                <input
                  type="email"
                  value={formData.business_email}
                  onChange={(e) => handleInputChange('business_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="business@example.com"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Business Phone
                </label>
                <input
                  type="tel"
                  value={formData.business_phone}
                  onChange={(e) => handleInputChange('business_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.example.com"
              />
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Business St"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="New York"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => handleInputChange('zip_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10001"
                  />
                </div>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
