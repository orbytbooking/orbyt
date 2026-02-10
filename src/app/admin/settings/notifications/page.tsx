"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusiness } from "@/contexts/BusinessContext";
import { useWebsiteConfig } from "@/hooks/useWebsiteConfig";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare, Calendar, Users, Briefcase, AlertCircle, Smartphone } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NotificationPreference {
  id: string;
  title: string;
  description: string;
  email: boolean;
  sms: boolean;
  icon: any;
}

export default function NotificationsSettingsPage() {
  const { currentBusiness } = useBusiness(); // Get current business
  const { config } = useWebsiteConfig();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      id: 'bookings',
      title: 'Booking Notifications',
      description: 'Get notified about new bookings, confirmations, and cancellations',
      email: true,
      sms: false,
      icon: Calendar,
    },
    {
      id: 'providers',
      title: 'Provider Updates',
      description: 'Notifications about provider registrations, completions, and status changes',
      email: true,
      sms: false,
      icon: Briefcase,
    },
    {
      id: 'customers',
      title: 'Customer Activity',
      description: 'Updates about customer registrations, inquiries, and feedback',
      email: true,
      sms: false,
      icon: Users,
    },
    {
      id: 'payments',
      title: 'Payment Notifications',
      description: 'Alerts for successful payments, refunds, and payment issues',
      email: true,
      sms: true,
      icon: AlertCircle,
    },
    {
      id: 'system',
      title: 'System Alerts',
      description: 'Important system updates, maintenance, and security notifications',
      email: true,
      sms: false,
      icon: Bell,
    },
  ]);

  const [emailFrequency, setEmailFrequency] = useState('instant');
  const [quietHours, setQuietHours] = useState(false);
  const [senderEmail, setSenderEmail] = useState(`support@${currentBusiness?.name?.toLowerCase().replace(/\s+/g, '') || 'business'}.com`);
  const [displayName, setDisplayName] = useState(currentBusiness?.name || 'Your Business');
  const [adminEmail, setAdminEmail] = useState(`support@${currentBusiness?.name?.toLowerCase().replace(/\s+/g, '') || 'business'}.com`);
  const [replyToEmail, setReplyToEmail] = useState(`support@${currentBusiness?.name?.toLowerCase().replace(/\s+/g, '') || 'business'}.com`);

  const updatePreference = (id: string, channel: 'email' | 'sms', value: boolean) => {
    setPreferences(prev => prev.map(pref => 
      pref.id === id ? { ...pref, [channel]: value } : pref
    ));
  };

  const handleSave = () => {
    console.log('Saving notification preferences:', preferences);
  };

  const handleResendVerification = () => {
    console.log('Resending verification email to:', senderEmail);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notification Settings</CardTitle>
          </div>
          <CardDescription>
            Configure how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="sms">SMS</TabsTrigger>
              <TabsTrigger value="app">App Notification</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-6">
              <div className="space-y-6">
                {/* Email Settings Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Email settings</h3>
                    <p className="text-sm text-muted-foreground">
                      You can control what emails you receive as admin here. You can also modify them to your preference.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Sender Email Address */}
                    <div className="space-y-2">
                      <Label htmlFor="sender-email" className="text-sm font-medium">
                        Sender email address
                      </Label>
                      <div className="flex gap-3">
                        <Input
                          id="sender-email"
                          type="email"
                          value={senderEmail}
                          onChange={(e) => setSenderEmail(e.target.value)}
                          className="flex-1"
                          placeholder="support@orbytcleaners.com"
                        />
                        <Button 
                          onClick={handleResendVerification}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Resend Verification Email
                        </Button>
                      </div>
                    </div>

                    {/* Display Name */}
                    <div className="space-y-2">
                      <Label htmlFor="display-name" className="text-sm font-medium">
                        Display name
                      </Label>
                      <Input
                        id="display-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={currentBusiness?.name || 'Your Business'}
                      />
                    </div>

                    {/* Admin Email Address */}
                    <div className="space-y-2">
                      <Label htmlFor="admin-email" className="text-sm font-medium">
                        Admin email address
                      </Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="support@orbytcleaners.com"
                      />
                    </div>

                    {/* Customer Reply To Email Address */}
                    <div className="space-y-2">
                      <Label htmlFor="reply-to-email" className="text-sm font-medium">
                        Customer reply to email address
                      </Label>
                      <Input
                        id="reply-to-email"
                        type="email"
                        value={replyToEmail}
                        onChange={(e) => setReplyToEmail(e.target.value)}
                        placeholder="support@orbytcleaners.com"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* General Preferences */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">General Preferences</h3>
                    <p className="text-xs text-muted-foreground">
                      Configure your overall notification preferences
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                      <div className="space-y-0.5">
                        <Label htmlFor="quiet-hours" className="text-sm font-medium">
                          Quiet Hours (10 PM - 6 AM)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Pause non-urgent notifications during quiet hours
                        </p>
                      </div>
                      <Switch
                        id="quiet-hours"
                        checked={quietHours}
                        onCheckedChange={setQuietHours}
                      />
                    </div>
                  </div>

                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                >
                  Update
                </Button>
              </div>
            </TabsContent>

            {/* Email Tab */}
            <TabsContent value="email" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Email Notifications</h3>
                  <p className="text-xs text-muted-foreground">
                    Configure your email notification preferences
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-frequency" className="text-sm font-medium">
                      Email Digest Frequency
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      How often to receive email summaries
                    </p>
                  </div>
                  <Select value={emailFrequency} onValueChange={setEmailFrequency}>
                    <SelectTrigger id="email-frequency" className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Email Notifications by Category</h4>
                  {preferences.map((pref) => {
                    const Icon = pref.icon;
                    return (
                      <div key={pref.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100">
                            <Icon className="h-4 w-4 text-cyan-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{pref.title}</p>
                            <p className="text-xs text-muted-foreground">{pref.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={pref.email}
                          onCheckedChange={(value) => updatePreference(pref.id, 'email', value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                >
                  Save Preferences
                </Button>
              </div>
            </TabsContent>

            {/* SMS Tab */}
            <TabsContent value="sms" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">SMS Notifications</h3>
                  <p className="text-xs text-muted-foreground">
                    Configure your SMS notification preferences
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">SMS Notifications by Category</h4>
                  <p className="text-xs text-muted-foreground">
                    Choose which notifications you want to receive via SMS
                  </p>
                  {preferences.map((pref) => {
                    const Icon = pref.icon;
                    return (
                      <div key={pref.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100">
                            <Icon className="h-4 w-4 text-cyan-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{pref.title}</p>
                            <p className="text-xs text-muted-foreground">{pref.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={pref.sms}
                          onCheckedChange={(value) => updatePreference(pref.id, 'sms', value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                >
                  Save Preferences
                </Button>
              </div>
            </TabsContent>

            {/* App Notification Tab */}
            <TabsContent value="app" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">App Notifications</h3>
                  <p className="text-xs text-muted-foreground">
                    Configure in-app notification preferences
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      Sound Notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Play sound when receiving notifications
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      Desktop Notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Show desktop notifications when app is open
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      Badge Count
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Show unread notification count badge
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">In-App Notification Preview</h4>
                  <div className="p-4 rounded-lg border bg-cyan-50/50 border-cyan-200">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100">
                        <Bell className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">New Booking Confirmed</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Booking BK005 has been confirmed by the customer.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">Just now</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                >
                  Save Preferences
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
