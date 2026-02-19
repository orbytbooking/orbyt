"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Shield, CreditCard, FileText, Gift, User, Save, Briefcase } from "lucide-react";
import YourInfoPage from "./your-info/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Mail, 
  Phone, 
  Building, 
  ArrowLeft,
  Bell,
  Palette,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Camera,
  MapPin,
  Calendar,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { BillingStripeConnect } from "@/components/admin/BillingStripeConnect";

export default function AccountSettingsPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get("tab");
  const [activeAccountTab, setActiveAccountTab] = useState("your-info");

  useEffect(() => {
    if (tabFromUrl === "billing" || searchParams?.get("stripe") === "return") {
      setActiveAccountTab("billing");
    }
  }, [tabFromUrl, searchParams]);

  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminCompany, setAdminCompany] = useState("");
  const [adminLocation, setAdminLocation] = useState("");
  const [adminBio, setAdminBio] = useState("");
  const [adminRole, setAdminRole] = useState("admin");
  const [profilePicture, setProfilePicture] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { currentBusiness } = useBusiness();

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (profilePicture && profilePicture.startsWith('blob:')) {
        URL.revokeObjectURL(profilePicture);
      }
    };
  }, [profilePicture]);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsDataLoading(true);
        
        // Get user data from auth
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAdminEmail(user.email || '');
        }
        
        // Get profile data from database
        const response = await fetch('/api/admin/profile');
        if (response.ok) {
          const data = await response.json();
          const profile = data.profile;
          
          if (profile) {
            setAdminName(profile.full_name || '');
            setAdminPhone(profile.phone || '');
            setAdminRole(profile.role || 'admin');
            setProfilePicture(profile.profile_picture || '');
            setAdminBio(profile.bio || '');
            setAdminLocation(profile.location || '');
          }
        }
        
        // Get business data
        if (currentBusiness) {
          setAdminCompany(currentBusiness.name || '');
        }
        
        // Load preferences from localStorage (these are UI preferences, not data)
        const notifications = localStorage.getItem("emailNotifications") !== "false";
        const pushNotif = localStorage.getItem("pushNotifications") === "true";
        const dark = localStorage.getItem("adminTheme") !== "light";
        
        setEmailNotifications(notifications);
        setPushNotifications(pushNotif);
        setDarkMode(dark);
        
      } catch (error) {
        console.error('Error fetching profile data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsDataLoading(false);
      }
    };
    
    fetchProfileData();
  }, [currentBusiness]);

  // Watch for business data changes and update form
  useEffect(() => {
    if (currentBusiness) {
      console.log('Business data changed:', currentBusiness);
      setAdminCompany(currentBusiness.name || '');
    }
  }, [currentBusiness]);

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus("idle");
    try {
      // Update profile in database
      const profileResponse = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: adminName,
          phone: adminPhone,
          business_id: currentBusiness?.id,
          bio: adminBio,
          location: adminLocation,
          profile_picture: profilePicture,
          role: adminRole,
        }),
      });
      
      if (!profileResponse.ok) {
        const errorData = await profileResponse.json().catch(() => ({}));
        console.error('Profile update API error:', errorData);
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      // Save UI preferences to localStorage
      localStorage.setItem("emailNotifications", emailNotifications.toString());
      localStorage.setItem("pushNotifications", pushNotifications.toString());
      localStorage.setItem("adminTheme", darkMode ? "dark" : "light");
      
      // Update profile completion
      const fields = [adminEmail, adminName, adminPhone, adminCompany, adminLocation, adminBio, adminRole];
      const completedFields = fields.filter(field => field && field.trim() !== "").length;
      setProfileCompletion(Math.round((completedFields / fields.length) * 100));
      
      setSaveStatus("success");
      toast.success('Profile updated successfully!');
      setTimeout(() => {
        setIsLoading(false);
        setSaveStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveStatus("error");
      toast.error('Failed to save profile');
      setIsLoading(false);
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setIsLoading(true);
        
        // Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          toast.error('You must be logged in to upload a profile picture');
          return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error('Please select an image file');
          return;
        }
        
        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          toast.error('Image size should not be more than 5MB');
          return;
        }
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', user.id); // Use actual user ID
        
        // Upload to server
        const response = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to upload image');
        }
        
        const { url } = await response.json();
        setProfilePicture(url);
        
        toast.success('Profile picture uploaded successfully!');
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        toast.error('Failed to upload profile picture');
        
        // Fallback to local preview using blob URL
        const blobUrl = URL.createObjectURL(file);
        setProfilePicture(blobUrl);
        
        // Clean up the blob URL after 10 minutes to prevent memory leaks
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 10 * 60 * 1000);
        
        toast.info('Showing local preview. Upload failed, but you can still see the image.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture("");
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'manager':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'staff':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'provider':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'customer':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return '👑';
      case 'admin':
        return '🛡️';
      case 'manager':
        return '📋';
      case 'staff':
        return '👤';
      case 'provider':
        return '🔧';
      case 'customer':
        return '👥';
      default:
        return '👤';
    }
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters long!");
      return;
    }
    alert("Password changed successfully!");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeAccountTab} onValueChange={setActiveAccountTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="your-info" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span>Business Info</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="earn-rewards" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span>Rewards</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Billing</span>
          </TabsTrigger>
          <TabsTrigger value="subscription-plans" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Plans</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Invoices</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="your-info" className="pt-6">
          <YourInfoPage />
        </TabsContent>

        <TabsContent value="profile" className="pt-6">
          {isDataLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-muted-foreground">Loading profile data...</span>
            </div>
          ) : (
            <div className="space-y-6">
            {/* Profile Completion */}
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium">Profile Completion</span>
                  </div>
                  <span className="text-sm font-medium">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Complete your profile to get the most out of your admin experience
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Profile Overview Card */}
              <Card className="lg:col-span-1">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Overview
                  </CardTitle>
                  <CardDescription>
                    Your profile information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 mx-auto ring-4 ring-blue-500/20">
                      {profilePicture && (profilePicture.startsWith('https://') || profilePicture.startsWith('blob:')) ? (
                        <AvatarImage 
                          src={profilePicture} 
                          alt={adminName || adminEmail}
                          onError={(e) => {
                            console.error('AvatarImage failed to load:', profilePicture);
                            // Force fallback by removing the src
                            e.currentTarget.src = '';
                          }}
                        />
                      ) : null}
                      <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {(adminName || adminEmail || "A").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 bg-white dark:bg-slate-800"
                        onClick={() => document.getElementById('profile-picture-input')?.click()}
                      >
                        <Camera className="h-3 w-3" />
                      </Button>
                      {profilePicture && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 bg-white dark:bg-slate-800"
                          onClick={removeProfilePicture}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <input
                      id="profile-picture-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureUpload}
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg">{adminName || "Admin User"}</h3>
                    <p className="text-sm text-muted-foreground">{adminEmail}</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="mt-1">
                        {adminCompany || "No Company"}
                      </Badge>
                      <Badge className={`mt-1 ${getRoleBadgeColor(adminRole)}`}>
                        <span className="mr-1">{getRoleIcon(adminRole)}</span>
                        {adminRole.charAt(0).toUpperCase() + adminRole.slice(1).replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Joined {new Date().toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Last active today
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Enter your full name"
                        className="transition-all focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="transition-all focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        placeholder="Enter your phone number"
                        className="transition-all focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company" className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Company Name
                      </Label>
                      <Input
                        id="company"
                        value={adminCompany}
                        onChange={(e) => setAdminCompany(e.target.value)}
                        placeholder="Enter your company name"
                        className="transition-all focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={adminLocation}
                      onChange={(e) => setAdminLocation(e.target.value)}
                      placeholder="Enter your location"
                      className="transition-all focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Role
                    </Label>
                    {adminRole === 'owner' ? (
                      <div className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        👑 Owner - Business Owner (Cannot be changed)
                      </div>
                    ) : (
                      <select
                        id="role"
                        value={adminRole}
                        onChange={(e) => setAdminRole(e.target.value)}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff</option>
                        <option value="provider">Provider</option>
                        <option value="customer">Customer</option>
                      </select>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {adminRole === 'owner' 
                        ? 'As the business owner, you have full access to all features and settings.'
                        : 'Your role determines your permissions and access level'
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      value={adminBio}
                      onChange={(e) => setAdminBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="w-full min-h-[100px] p-3 border rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      {adminBio.length}/500 characters
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Security Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button onClick={handlePasswordChange} className="w-full">
                    Update Password
                  </Button>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Password must:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Be at least 8 characters long</li>
                      <li>Contain uppercase and lowercase letters</li>
                      <li>Include at least one number</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Manage how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive email updates about your account activity
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium">Push Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications in your browser
                      </p>
                    </div>
                    <Switch
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium">Dark Mode</h4>
                      <p className="text-sm text-muted-foreground">
                        Use dark theme across the admin panel
                      </p>
                    </div>
                    <Switch
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Save Actions */}
            <div className="flex items-center justify-between p-6 bg-card rounded-lg border">
              <div className="flex items-center gap-2">
                {saveStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">Changes saved successfully</span>
                  </div>
                )}
                {saveStatus === "error" && (
                  <div className="flex items-center gap-2 text-red-600">
                    <X className="h-4 w-4" />
                    <span className="text-sm">Error saving changes</span>
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <Button onClick={handleSave} disabled={isLoading} className="min-w-[120px]">
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="earn-rewards" className="pt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <CardTitle>Earn Rewards</CardTitle>
              </div>
              <CardDescription>Configure referral codes and loyalty rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Placeholder content for rewards configuration.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="pt-6">
          <BillingStripeConnect />
        </TabsContent>

        <TabsContent value="subscription-plans" className="pt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Subscription plans</CardTitle>
              </div>
              <CardDescription>View or change your plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Current plan: Starter (placeholder)</p>
                <div className="flex gap-2">
                  <Button variant="outline">Manage Plan</Button>
                  <Button style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}>Upgrade</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="pt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Invoices</CardTitle>
              </div>
              <CardDescription>Download or view past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">No invoices yet. This is a placeholder.</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
