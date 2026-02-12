"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Clock,
  Calendar,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Save,
  Loader2,
  ExternalLink
} from "lucide-react";
import { getSupabaseProviderClient } from '@/lib/supabaseProviderClient';
import { getProviderSession, handleAuthError, authenticatedFetch } from '@/lib/providerAuth';

interface Industry {
  id: string;
  name: string;
  description: string | null;
  business_id: string;
  is_custom: boolean;
}

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface Extra {
  id: string;
  name: string;
  price: number;
  time_minutes: number;
  description: string;
}

interface Frequency {
  id: string;
  name: string;
  description: string;
  discount: number;
  discount_type: string;
}

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
}

interface ProviderSettings {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    bookingReminders: boolean;
    newBookings: boolean;
    cancellations: boolean;
  };
  availability: {
    advanceBookingDays: number;
    minimumNoticeHours: number;
    acceptEmergencyBookings: boolean;
    timezone: string;
    workingHours: {
      [key: string]: { enabled: boolean; startTime: string; endTime: string };
    };
  };
  payment: {
    preferredMethod: string;
    autoAcceptPayment: boolean;
    requireDeposit: boolean;
    depositAmount: number;
  };
  business: {
    serviceCategories: string[];
    extras: string[];
    frequencies: string[];
    serviceAreas: string[];
  };
}

export default function ProviderSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<any>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [frequencies, setFrequencies] = useState<Frequency[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  // Auto-detect user's timezone
  const [userTimezone, setUserTimezone] = useState<string>(
    typeof window !== 'undefined' && 'Intl' in window 
      ? Intl.DateTimeFormat().resolvedOptions().timeZone 
      : 'Asia/Manila' // Default fallback
  );
  
  const [settings, setSettings] = useState<ProviderSettings>({
    notifications: {
      email: true,
      sms: false,
      push: true,
      bookingReminders: true,
      newBookings: true,
      cancellations: true,
    },
    availability: {
      advanceBookingDays: 7,
      minimumNoticeHours: 2,
      acceptEmergencyBookings: false,
      timezone: "Asia/Manila",
      workingHours: {
        monday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        tuesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        wednesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        thursday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        friday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      },
    },
    payment: {
      preferredMethod: "bank_transfer",
      autoAcceptPayment: true,
      requireDeposit: false,
      depositAmount: 0,
    },
    business: {
      serviceCategories: [],
      extras: [],
      frequencies: [],
      serviceAreas: [],
    },
  });

  useEffect(() => {
    fetchProviderData();
  }, []);

  const fetchProviderData = async () => {
    try {
      setLoading(true);
      
      console.log('=== FETCHING PROVIDER SETTINGS DATA ===');
      
      // Get provider session
      const { session, user } = await getProviderSession();
      console.log('Session found for user:', user.email);
      
      // Fetch provider settings data from API
      const response = await authenticatedFetch('/api/provider/settings');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Settings API response:', data);
        
        if (data.provider) {
          setProvider(data.provider);
          console.log('Provider data set:', data.provider);
        }
        
        if (data.industries && data.industries.length > 0) {
          setIndustries(data.industries);
          setSelectedIndustry(data.industries[0]);
          console.log('Industries set:', data.industries);
          console.log('Selected industry:', data.industries[0]);
          
          // Fetch industry-specific data
          await fetchIndustryData(data.industries[0].id, data.provider.business_id);
        } else {
          console.log('No industries found for business');
        }
        
        if (data.preferences) {
          // Update settings with fetched preferences
          setSettings(prev => ({
            ...prev,
            notifications: {
              ...prev.notifications,
              email: data.preferences.email_notifications,
              sms: data.preferences.sms_notifications,
            },
            availability: {
              ...prev.availability,
              advanceBookingDays: data.preferences.advance_booking_days,
              minimumNoticeHours: data.preferences.minimum_booking_notice_hours,
              acceptEmergencyBookings: data.preferences.accepts_emergency_bookings,
              workingHours: data.workingHours || prev.availability.workingHours
            }
          }));
          console.log('Settings updated with workingHours:', data.workingHours);
        } else if (data.workingHours) {
          // No preferences but have working hours
          setSettings(prev => ({
            ...prev,
            availability: {
              ...prev.availability,
              workingHours: data.workingHours
            }
          }));
          console.log('Settings updated with workingHours only:', data.workingHours);
        }
      } else {
        console.error('Failed to fetch settings:', response.status);
        throw new Error('Failed to fetch settings data');
      }
    } catch (error) {
      handleAuthError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndustryData = async (industryId: string, businessId: string) => {
    try {
      console.log('=== FETCHING INDUSTRY DATA ===');
      console.log('Industry ID:', industryId);
      console.log('Business ID:', businessId);
      
      // Fetch industry data from API
      const response = await authenticatedFetch(`/api/provider/industry-data?industryId=${industryId}&businessId=${businessId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Industry data response:', data);
        
        setServiceCategories(data.serviceCategories || []);
        setExtras(data.extras || []);
        setFrequencies(data.frequencies || []);
        setLocations(data.locations || []);
        
        console.log('Categories set:', data.serviceCategories);
        console.log('Extras set:', data.extras);
        console.log('Frequencies set:', data.frequencies);
        console.log('Locations set:', data.locations);
      } else {
        console.error('Failed to fetch industry data:', response.status);
        // Set empty arrays as fallback
        setServiceCategories([]);
        setExtras([]);
        setFrequencies([]);
        setLocations([]);
      }
    } catch (error) {
      console.error('Error fetching industry data:', error);
      // Set empty arrays as fallback
      setServiceCategories([]);
      setExtras([]);
      setFrequencies([]);
      setLocations([]);
    }
  };

  const handleIndustryChange = async (industry: Industry) => {
    setSelectedIndustry(industry);
    if (provider) {
      await fetchIndustryData(industry.id, provider.business_id);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      console.log('=== SAVING PROVIDER SETTINGS ===');
      
      // Save settings via API
      console.log('🔍 Debug save settings:');
      console.log('  - Settings to save:', JSON.stringify(settings, null, 2));
      
      const response = await authenticatedFetch('/api/provider/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      
      console.log('  - Response status:', response.status);
      console.log('  - Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Settings saved successfully:', data);
        
        // Generate availability slots from working hours
        await generateAvailabilitySlots();
        
        toast({
          title: "Settings Saved",
          description: "Your preferences and availability have been updated successfully.",
        });
      } else {
        const errorText = await response.text();
        console.error('Failed to save settings:', response.status);
        console.error('Error response:', errorText);
        throw new Error(`Failed to save settings: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Generate availability slots from working hours settings
  const generateAvailabilitySlots = async () => {
    try {
      console.log('=== GENERATING AVAILABILITY SLOTS FROM SETTINGS ===');
      console.log('Working hours:', settings.availability.workingHours);
      console.log('Working hours JSON:', JSON.stringify(settings.availability.workingHours, null, 2));
      
      const response = await authenticatedFetch('/api/provider/generate-slots-from-settings', {
        method: 'POST',
        body: JSON.stringify({
          workingHours: settings.availability.workingHours
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Availability slots generated successfully:', data);
        
        if (data.errors && data.errors.length > 0) {
          console.warn('Some errors occurred:', data.errors);
          toast({
            title: "Availability Updated",
            description: `Generated slots for ${data.results.length} days. Some errors occurred.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Availability Updated", 
            description: `Generated availability slots for ${data.results.length} days.`,
            variant: "default",
          });
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to generate availability slots:', response.status, errorText);
        toast({
          title: "Warning",
          description: "Settings saved but failed to update availability slots.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating availability slots:', error);
      toast({
        title: "Warning", 
        description: "Settings saved but failed to update availability slots.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your provider preferences and business configurations
          </p>
        </div>
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and professional details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={provider?.first_name || ''}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={provider?.last_name || ''}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={provider?.email || ''}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={provider?.phone || ''}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={provider?.specialization || ''}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Channels</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch
                    checked={settings.notifications.email}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, email: checked }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive updates via text message</p>
                  </div>
                  <Switch
                    checked={settings.notifications.sms}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, sms: checked }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive browser notifications</p>
                  </div>
                  <Switch
                    checked={settings.notifications.push}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, push: checked }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Types</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Booking Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get reminded about upcoming bookings</p>
                  </div>
                  <Switch
                    checked={settings.notifications.bookingReminders}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, bookingReminders: checked }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>New Bookings</Label>
                    <p className="text-sm text-muted-foreground">Notify when new bookings are assigned</p>
                  </div>
                  <Switch
                    checked={settings.notifications.newBookings}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, newBookings: checked }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cancellations</Label>
                    <p className="text-sm text-muted-foreground">Notify when bookings are cancelled</p>
                  </div>
                  <Switch
                    checked={settings.notifications.cancellations}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, cancellations: checked }
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Availability Settings
              </CardTitle>
              <CardDescription>
                Configure your working hours and booking preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prominent link to full availability management */}
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">Manage Your Calendar</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Add, edit, and remove specific time slots in your availability calendar
                      </p>
                    </div>
                    <Link href="/provider/availability">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Calendar className="h-4 w-4 mr-2" />
                        Manage Calendar
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Booking Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="advanceDays">Advance Booking Days</Label>
                    <Input
                      id="advanceDays"
                      type="number"
                      value={settings.availability.advanceBookingDays}
                      onChange={(e) =>
                        setSettings(prev => ({
                          ...prev,
                          availability: { ...prev.availability, advanceBookingDays: parseInt(e.target.value) }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="minimumNotice">Minimum Notice (Hours)</Label>
                    <Input
                      id="minimumNotice"
                      type="number"
                      value={settings.availability.minimumNoticeHours}
                      onChange={(e) =>
                        setSettings(prev => ({
                          ...prev,
                          availability: { ...prev.availability, minimumNoticeHours: parseInt(e.target.value) }
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={settings.availability.timezone || userTimezone} onValueChange={(value) =>
                      setSettings(prev => ({
                        ...prev,
                        availability: { ...prev.availability, timezone: value }
                      }))
                    }>
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Manila">Asia/Manila (GMT+8)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo (GMT+9)</SelectItem>
                        <SelectItem value="Asia/Shanghai">Asia/Shanghai (GMT+8)</SelectItem>
                        <SelectItem value="Asia/Singapore">Asia/Singapore (GMT+8)</SelectItem>
                        <SelectItem value="Asia/Hong_Kong">Asia/Hong Kong (GMT+8)</SelectItem>
                        <SelectItem value="Asia/Seoul">Asia/Seoul (GMT+9)</SelectItem>
                        <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (GMT-5)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los Angeles (GMT-8)</SelectItem>
                        <SelectItem value="America/Chicago">America/Chicago (GMT-6)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                        <SelectItem value="Europe/Paris">Europe/Paris (GMT+1)</SelectItem>
                        <SelectItem value="Europe/Berlin">Europe/Berlin (GMT+1)</SelectItem>
                        <SelectItem value="Australia/Sydney">Australia/Sydney (GMT+11)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically detected: {userTimezone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Accept Emergency Bookings</Label>
                    <p className="text-sm text-muted-foreground">Allow bookings with short notice</p>
                  </div>
                  <Switch
                    checked={settings.availability.acceptEmergencyBookings}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({
                        ...prev,
                        availability: { ...prev.availability, acceptEmergencyBookings: checked }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Working Hours</h3>
                <div className="grid gap-4">
                  {Object.entries(settings.availability.workingHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={hours.enabled}
                          onCheckedChange={(checked) => {
                            console.log(`🔍 Toggle ${day}: ${hours.enabled} -> ${checked}`);
                            setSettings(prev => {
                              const newWorkingHours = {
                                ...prev.availability.workingHours,
                                [day]: { 
                                  ...prev.availability.workingHours[day], 
                                  enabled: checked 
                                }
                              };
                              console.log(`🔍 New working hours for ${day}:`, newWorkingHours[day]);
                              console.log(`🔍 All working hours:`, newWorkingHours);
                              return {
                                ...prev,
                                availability: {
                                  ...prev.availability,
                                  workingHours: newWorkingHours
                                }
                              };
                            });
                          }}
                        />
                        <Label className="capitalize">{day}</Label>
                      </div>
                      {hours.enabled && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={hours.startTime}
                            onChange={(e) => {
                              console.log(`🔍 Start time change for ${day}: ${hours.startTime} -> ${e.target.value}`);
                              setSettings(prev => {
                                const newWorkingHours = {
                                  ...prev.availability.workingHours,
                                  [day]: { 
                                    ...prev.availability.workingHours[day], 
                                    startTime: e.target.value 
                                  }
                                };
                                console.log(`🔍 Updated ${day} start time:`, newWorkingHours[day]);
                                return {
                                  ...prev,
                                  availability: {
                                    ...prev.availability,
                                    workingHours: newWorkingHours
                                  }
                                };
                              });
                            }}
                          />
                          <span>to</span>
                          <Input
                            type="time"
                            value={hours.endTime}
                            onChange={(e) => {
                              console.log(`🔍 End time change for ${day}: ${hours.endTime} -> ${e.target.value}`);
                              setSettings(prev => {
                                const newWorkingHours = {
                                  ...prev.availability.workingHours,
                                  [day]: { 
                                    ...prev.availability.workingHours[day], 
                                    endTime: e.target.value 
                                  }
                                };
                                console.log(`🔍 Updated ${day} end time:`, newWorkingHours[day]);
                                return {
                                  ...prev,
                                  availability: {
                                    ...prev.availability,
                                    workingHours: newWorkingHours
                                  }
                                };
                              });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Business Configuration
              </CardTitle>
              <CardDescription>
                Industry forms and services configured by your administrator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {industries.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Select Industry</h3>
                  <div className="flex gap-2 flex-wrap">
                    {industries.map((industry) => (
                      <Button
                        key={industry.id}
                        variant={selectedIndustry?.id === industry.id ? "default" : "outline"}
                        onClick={() => handleIndustryChange(industry)}
                      >
                        {industry.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {selectedIndustry && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Service Categories</h3>
                    <div className="grid gap-2">
                      {serviceCategories.length > 0 ? (
                        serviceCategories.map((category) => (
                          <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{category.name}</div>
                              <div className="text-sm text-muted-foreground">{category.description}</div>
                            </div>
                            <Badge variant="secondary">{category.color}</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">No service categories configured</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Service Extras</h3>
                    <div className="grid gap-2">
                      {extras.length > 0 ? (
                        extras.map((extra) => (
                          <div key={extra.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{extra.name}</div>
                              <div className="text-sm text-muted-foreground">{extra.description}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${extra.price}</div>
                              <div className="text-sm text-muted-foreground">{extra.time_minutes} min</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">No service extras configured</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Service Frequencies</h3>
                    <div className="grid gap-2">
                      {frequencies.length > 0 ? (
                        frequencies.map((frequency) => (
                          <div key={frequency.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{frequency.name}</div>
                              <div className="text-sm text-muted-foreground">{frequency.description}</div>
                            </div>
                            <Badge variant="secondary">
                              {frequency.discount_type === '%' ? `${frequency.discount}%` : `$${frequency.discount}`} off
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">No service frequencies configured</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Service Areas</h3>
                    <div className="grid gap-2">
                      {locations.length > 0 ? (
                        locations.map((location) => (
                          <div key={location.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{location.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {location.address}, {location.city}, {location.state}
                              </div>
                            </div>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">No service areas configured</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Settings
              </CardTitle>
              <CardDescription>
                Configure your payment preferences and methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Payment Preferences</h3>
                <div>
                  <Label htmlFor="paymentMethod">Preferred Payment Method</Label>
                  <select
                    id="paymentMethod"
                    className="w-full p-2 border rounded-md"
                    value={settings.payment.preferredMethod}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        payment: { ...prev.payment, preferredMethod: e.target.value }
                      }))
                    }
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Accept Payments</Label>
                    <p className="text-sm text-muted-foreground">Automatically accept confirmed payments</p>
                  </div>
                  <Switch
                    checked={settings.payment.autoAcceptPayment}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({
                        ...prev,
                        payment: { ...prev.payment, autoAcceptPayment: checked }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Deposit</Label>
                    <p className="text-sm text-muted-foreground">Require deposit for new bookings</p>
                  </div>
                  <Switch
                    checked={settings.payment.requireDeposit}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({
                        ...prev,
                        payment: { ...prev.payment, requireDeposit: checked }
                      }))
                    }
                  />
                </div>
                {settings.payment.requireDeposit && (
                  <div>
                    <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                    <Input
                      id="depositAmount"
                      type="number"
                      value={settings.payment.depositAmount}
                      onChange={(e) =>
                        setSettings(prev => ({
                          ...prev,
                          payment: { ...prev.payment, depositAmount: parseFloat(e.target.value) }
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
