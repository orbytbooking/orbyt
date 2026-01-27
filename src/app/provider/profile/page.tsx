"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Star,
  Calendar,
  Award,
  Edit,
  Camera,
  Lock,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const services = [
  { id: 1, name: "Deep Cleaning", selected: true },
  { id: 2, name: "Standard Cleaning", selected: true },
  { id: 3, name: "Office Cleaning", selected: true },
  { id: 4, name: "Carpet Cleaning", selected: true },
  { id: 5, name: "Move In/Out Cleaning", selected: false },
  { id: 6, name: "Window Cleaning", selected: false },
];

const reviews = [
  {
    id: 1,
    rating: 5,
    comment: "Excellent service! Very thorough and professional.",
    date: "2025-12-05",
    service: "Deep Cleaning"
  },
  {
    id: 2,
    rating: 5,
    comment: "Great job! Will definitely book again.",
    date: "2025-12-04",
    service: "Standard Cleaning"
  },
  {
    id: 3,
    rating: 4,
    comment: "Good service overall, arrived on time.",
    date: "2025-12-03",
    service: "Office Cleaning"
  },
  {
    id: 4,
    rating: 5,
    comment: "Outstanding! My carpets look brand new.",
    date: "2025-12-02",
    service: "Carpet Cleaning"
  },
];

const ProviderProfile = () => {
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStripeConnected, setIsStripeConnected] = useState(false);
  const [stripeAccountEmail, setStripeAccountEmail] = useState('');
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [isProviderStripeConnectEnabled, setIsProviderStripeConnectEnabled] = useState(false);

  // Load saved Stripe account info on component mount
  useEffect(() => {
    const savedStripeAccount = localStorage.getItem('providerStripeAccount');
    if (savedStripeAccount) {
      const { accountId, email, isConnected } = JSON.parse(savedStripeAccount);
      setStripeAccountId(accountId || '');
      setStripeAccountEmail(email || '');
      setIsStripeConnected(!!isConnected);
    }
    
    const savedProviderStripeEnabled = localStorage.getItem('providerStripeConnectEnabled');
    if (savedProviderStripeEnabled) {
      setIsProviderStripeConnectEnabled(savedProviderStripeEnabled === 'true');
    }
  }, []);

  // Handle Stripe Connect button click
  const handleStripeConnect = async () => {
    try {
      setIsLoading(true);
      // In a real app, this would redirect to Stripe OAuth flow
      // For demo purposes, we'll simulate a successful connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate getting Stripe account info
      const mockStripeAccount = {
        accountId: `acct_${Math.random().toString(36).substring(2, 15)}`,
        email: email, // Using the provider's email from profile
        isConnected: true
      };
      
      // Save to local storage
      localStorage.setItem('providerStripeAccount', JSON.stringify({
        accountId: mockStripeAccount.accountId,
        email: mockStripeAccount.email,
        isConnected: true
      }));
      
      // Update state
      setStripeAccountId(mockStripeAccount.accountId);
      setStripeAccountEmail(mockStripeAccount.email);
      setIsStripeConnected(true);
      
      toast({
        title: 'Stripe Connected',
        description: 'Your Stripe account has been successfully connected!',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      toast({
        title: 'Connection Failed',
        description: 'There was an error connecting your Stripe account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle disconnecting Stripe
  const handleDisconnectStripe = () => {
    // Clear saved Stripe account info
    localStorage.removeItem('providerStripeAccount');
    setStripeAccountId('');
    setStripeAccountEmail('');
    setIsStripeConnected(false);
    
    toast({
      title: 'Stripe Disconnected',
      description: 'Your Stripe account has been disconnected.',
      variant: 'default',
    });
  };
  
  // Handle provider stripe toggle
  const handleProviderStripeToggle = (checked: boolean) => {
    setIsProviderStripeConnectEnabled(checked);
    localStorage.setItem('providerStripeConnectEnabled', String(checked));
    
    if (!checked) {
      // If turning off, clear any saved provider stripe ID
      setStripeAccountId('');
      localStorage.removeItem('providerStripeAccount');
    }
  };
  
  // Handle saving provider stripe account ID
  const handleSaveStripeAccountId = () => {
    if (!stripeAccountId.trim()) return;
    
    // Save to local storage
    localStorage.setItem('providerStripeAccount', JSON.stringify({
      accountId: stripeAccountId,
      email: '', // No email for manual entry
      isConnected: true
    }));
    
    toast({
      title: 'Stripe Account ID Saved',
      description: 'The Stripe account ID has been saved successfully.',
      variant: 'default',
    });
  };
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [providerName, setProviderName] = useState("John Smith");
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    sms: false,
    bookingConfirmations: true,
    bookingReminders: true,
    newReviews: true,
    promotions: true,
    newsletter: false,
  });

  // Handle notification toggle
  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  const [email, setEmail] = useState("provider@orbitbooking.com");
  const [phone, setPhone] = useState("(555) 123-4567");
  const [location, setLocation] = useState("New York, NY");
  const [bio, setBio] = useState("Professional cleaning service provider. Specialized in residential and commercial cleaning.");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleResetPassword = async () => {
    try {
      setIsResetting(true);
      // Simulate API call to request password reset
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      toast({
        title: "Password Reset Requested",
        description: "Your request to reset the password has been sent to the admin. You will receive an email with further instructions.",
      });
      
      // Close the dialog
      setIsResetDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset request. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    const name = localStorage.getItem("providerName");
    const storedEmail = localStorage.getItem("providerEmail");
    const storedImage = localStorage.getItem("providerProfileImage");
    if (name) setProviderName(name);
    if (storedEmail) setEmail(storedEmail);
    if (storedImage) setProfileImage(storedImage);
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem("providerName", providerName);
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    });
    setIsEditing(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfileImage(base64String);
        localStorage.setItem("providerProfileImage", base64String);
        toast({
          title: "Profile Image Updated",
          description: "Your profile image has been successfully updated.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const averageRating = (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your profile and service offerings</p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="h-32 w-32 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-4xl font-bold">
                    {providerName.charAt(0)}
                  </div>
                )}
                <input
                  type="file"
                  id="profile-image-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <label
                  htmlFor="profile-image-upload"
                  className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Camera className="h-5 w-5" />
                </label>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center mb-1">
                  <Star className="h-5 w-5 fill-orange-400 text-orange-400" />
                  <span className="font-bold text-lg">{averageRating}</span>
                </div>
                <p className="text-sm text-muted-foreground">{reviews.length} reviews</p>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Full Name</label>
                    <Input
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Email</label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Phone</label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Location</label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Bio</label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}>
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{providerName}</h2>
                    <p className="text-muted-foreground">{bio}</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Member since Nov 2024</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {mounted && (
                      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                            <Lock className="h-4 w-4 mr-2" />
                            Reset Password
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-full bg-red-100">
                              <AlertCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                              <DialogTitle>Reset Your Password</DialogTitle>
                              <DialogDescription className="mt-1">
                                Request admin to reset your password
                              </DialogDescription>
                            </div>
                          </div>
                        </DialogHeader>
                        <div className="py-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            A request will be sent to the admin to reset your password. You will receive an email with further instructions once the admin approves your request.
                          </p>
                          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md text-amber-700 dark:text-amber-400 text-sm">
                            <p>Note: For security reasons, the admin will need to approve your password reset request before you can set a new password.</p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsResetDialogOpen(false)}
                            disabled={isResetting}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleResetPassword}
                            disabled={isResetting}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {isResetting ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending Request...
                              </>
                            ) : (
                              'Request Password Reset'
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="payment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payment">Payment Processor</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        {/* Payment Processor Tab */}
        <TabsContent value="payment">
          <Card>
        <CardHeader>
          <CardTitle>Payment Processor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage your payment processing settings
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stripe Connect Section */}
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.976 9.5H22.5L28 0H0L5.5 9.5H13.5V14.5H0L5.5 24H14L8.5 14.5H13.976V9.5Z" fill="#635bff"/>
                  </svg>
                  {isStripeConnected ? 'Stripe Connected' : 'Connect with Stripe'}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {isStripeConnected 
                    ? 'Your Stripe account is connected and ready to accept payments.'
                    : 'Securely connect your Stripe account to receive payments directly'}
                </p>
              </div>
              <Button 
                variant={isStripeConnected ? 'outline' : 'default'}
                className={cn(
                  'flex items-center gap-2',
                  isStripeConnected ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-800/30' : ''
                )}
                onClick={handleStripeConnect}
                disabled={isStripeConnected}
              >
                {isStripeConnected ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Connected
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 28 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.976 9.5H22.5L28 0H0L5.5 9.5H13.5V14.5H0L5.5 24H14L8.5 14.5H13.976V9.5Z"/>
                    </svg>
                    Connect with Stripe
                  </>
                )}
              </Button>
            </div>
            
            {isStripeConnected && (
              <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-md border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Stripe Account</p>
                    <p className="text-sm text-muted-foreground">Connected as {stripeAccountEmail || 'your account'}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                    onClick={handleDisconnectStripe}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Provider Stripe Connect Section */}
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Provider Stripe Connect</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Here you can add the provider's Stripe id to connect their Stripe account for them.
                </p>
              </div>
              <Switch 
                checked={isProviderStripeConnectEnabled} 
                onCheckedChange={handleProviderStripeToggle}
              />
            </div>
            
            {isProviderStripeConnectEnabled && (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stripeAccountId">Stripe Account ID</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="stripeAccountId" 
                      placeholder="acct_xxxxxxxxxxxxxx"
                      value={stripeAccountId}
                      onChange={(e) => setStripeAccountId(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSaveStripeAccountId}
                      disabled={!stripeAccountId.trim()}
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the Stripe account ID for this provider (e.g., acct_xxxxxxxxxxxxxx)
                  </p>
                </div>
                
                {stripeAccountId && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm rounded-md">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Stripe account connected</p>
                        <p className="text-xs opacity-80">ID: {stripeAccountId}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage your notification preferences
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Channels */}
              <div className="space-y-4">
                <h4 className="font-medium">Notification Channels</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="email-notifications">Email</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={notificationSettings.email}
                      onCheckedChange={() => handleNotificationToggle('email')}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="push-notifications">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive push notifications</p>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={notificationSettings.push}
                      onCheckedChange={() => handleNotificationToggle('push')}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="sms-notifications">SMS Alerts</Label>
                      <p className="text-sm text-muted-foreground">Receive text message alerts</p>
                    </div>
                    <Switch
                      id="sms-notifications"
                      checked={notificationSettings.sms}
                      onCheckedChange={() => handleNotificationToggle('sms')}
                    />
                  </div>
                </div>
              </div>

              {/* Notification Types */}
              <div className="space-y-4">
                <h4 className="font-medium">Notification Types</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="booking-confirmations">Booking Confirmations</Label>
                      <p className="text-sm text-muted-foreground">When a customer books your service</p>
                    </div>
                    <Switch
                      id="booking-confirmations"
                      checked={notificationSettings.bookingConfirmations}
                      onCheckedChange={() => handleNotificationToggle('bookingConfirmations')}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="booking-reminders">Booking Reminders</Label>
                      <p className="text-sm text-muted-foreground">Reminders for upcoming appointments</p>
                    </div>
                    <Switch
                      id="booking-reminders"
                      checked={notificationSettings.bookingReminders}
                      onCheckedChange={() => handleNotificationToggle('bookingReminders')}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="new-reviews">New Reviews</Label>
                      <p className="text-sm text-muted-foreground">When you receive a new review</p>
                    </div>
                    <Switch
                      id="new-reviews"
                      checked={notificationSettings.newReviews}
                      onCheckedChange={() => handleNotificationToggle('newReviews')}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="promotions">Promotions & Updates</Label>
                      <p className="text-sm text-muted-foreground">Special offers and platform updates</p>
                    </div>
                    <Switch
                      id="promotions"
                      checked={notificationSettings.promotions}
                      onCheckedChange={() => handleNotificationToggle('promotions')}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="newsletter">Newsletter</Label>
                      <p className="text-sm text-muted-foreground">Weekly tips and industry news</p>
                    </div>
                    <Switch
                      id="newsletter"
                      checked={notificationSettings.newsletter}
                      onCheckedChange={() => handleNotificationToggle('newsletter')}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => {
                    // In a real app, you would save these settings to your backend
                    toast({
                      title: "Notification settings updated",
                      description: "Your notification preferences have been saved.",
                    });
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            What customers are saying about you
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${i < review.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>
                <p className="text-sm">{review.comment}</p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400">
                    {review.service}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderProfile;
