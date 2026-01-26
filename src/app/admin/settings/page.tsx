"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import { 
  Save,
  Building2,
  Mail,
  Phone,
  MapPin,
  Bell,
  Shield,
  ExternalLink,
  LayoutTemplate,
  Loader2
} from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    description: ""
  });

  const [notifications, setNotifications] = useState({
    emailBookings: true,
    emailCancellations: true,
    emailPayments: true,
    smsReminders: false,
    pushNotifications: true
  });

  // Fetch business data on component mount
  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        const response = await fetch('/api/admin/business');
        if (response.ok) {
          const data = await response.json();
          const business = data.business;
          
          if (business) {
            setCompanyInfo({
              name: business.name || "",
              email: business.business_email || "",
              phone: business.business_phone || "",
              address: business.address || "",
              description: business.description || ""
            });
          }
        } else {
          console.error('Failed to fetch business data');
          toast({
            title: "Error",
            description: "Failed to load business information",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error fetching business data:', error);
        toast({
          title: "Error", 
          description: "Failed to load business information",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessData();
  }, [toast]);

  const handleSaveCompanyInfo = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/business', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyInfo),
      });
      
      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Company information has been updated successfully.",
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Error",
          description: errorData.error || "Failed to save company information",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving company info:', error);
      toast({
        title: "Error",
        description: "Failed to save company information",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Preferences Saved",
      description: "Notification preferences have been updated.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Website Builder Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            <CardTitle>Website Builder</CardTitle>
          </div>
          <CardDescription>
            Preview and customize your website's appearance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative group">
            <div className="relative aspect-video overflow-hidden rounded-lg border">
              <Image
                src="/website-preview.jpg"
                alt="Website Preview"
                width={1200}
                height={675}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                <div className="text-white">
                  <h3 className="text-xl font-bold mb-1">Premier Pro Cleaners</h3>
                  <p className="text-sm text-white/80 mb-4">Professional Cleaning Services</p>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit Website
                    </Button>
                    <Button variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm">
                      Customize Design
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-sm font-medium mb-1">Homepage</div>
                <div className="text-xs text-muted-foreground">Main Landing</div>
              </div>
              <div className="p-4 border rounded-lg text-center bg-muted/50">
                <div className="text-sm font-medium mb-1">Services</div>
                <div className="text-xs text-muted-foreground">Our Offerings</div>
              </div>
              <div className="p-4 border rounded-lg text-center bg-muted/50">
                <div className="text-sm font-medium mb-1">About Us</div>
                <div className="text-xs text-muted-foreground">Our Story</div>
              </div>
              <div className="p-4 border rounded-lg text-center bg-muted/50">
                <div className="text-sm font-medium mb-1">Contact</div>
                <div className="text-xs text-muted-foreground">Get in Touch</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Company Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Company Information</CardTitle>
          </div>
          <CardDescription>
            Update your company details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading company information...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company-email"
                      type="email"
                      className="pl-10"
                      value={companyInfo.email}
                      onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company-phone"
                      className="pl-10"
                      value={companyInfo.phone}
                      onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company-address"
                      className="pl-10"
                      value={companyInfo.address}
                      onChange={(e) => setCompanyInfo({...companyInfo, address: e.target.value})}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="company-description">Description</Label>
                <Textarea
                  id="company-description"
                  rows={3}
                  value={companyInfo.description}
                  onChange={(e) => setCompanyInfo({...companyInfo, description: e.target.value})}
                  disabled={isSaving}
                />
              </div>

              <Button 
                onClick={handleSaveCompanyInfo} 
                className="mt-4" 
                style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Manage how you receive notifications about bookings and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-bookings">Email - New Bookings</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for new booking requests
                </p>
              </div>
              <Switch
                id="email-bookings"
                checked={notifications.emailBookings}
                onCheckedChange={(checked) => setNotifications({...notifications, emailBookings: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-cancellations">Email - Cancellations</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a booking is cancelled
                </p>
              </div>
              <Switch
                id="email-cancellations"
                checked={notifications.emailCancellations}
                onCheckedChange={(checked) => setNotifications({...notifications, emailCancellations: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-payments">Email - Payment Confirmations</Label>
                <p className="text-sm text-muted-foreground">
                  Receive confirmation when payments are received
                </p>
              </div>
              <Switch
                id="email-payments"
                checked={notifications.emailPayments}
                onCheckedChange={(checked) => setNotifications({...notifications, emailPayments: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sms-reminders">SMS - Appointment Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Send SMS reminders before appointments
                </p>
              </div>
              <Switch
                id="sms-reminders"
                checked={notifications.smsReminders}
                onCheckedChange={(checked) => setNotifications({...notifications, smsReminders: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Enable browser push notifications
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={notifications.pushNotifications}
                onCheckedChange={(checked) => setNotifications({...notifications, pushNotifications: checked})}
              />
            </div>
          </div>

          <Button onClick={handleSaveNotifications} className="mt-4" style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}>
            <Save className="h-4 w-4 mr-2" />
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>
            Manage your password and security settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <Button className="mt-4" style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}>
            <Shield className="h-4 w-4 mr-2" />
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
