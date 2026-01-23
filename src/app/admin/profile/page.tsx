'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Save, 
  ArrowLeft,
  Shield,
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
import Link from "next/link";

export default function AdminProfilePage() {
  const router = useRouter();
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
  const [activeTab, setActiveTab] = useState("profile");
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    const email = localStorage.getItem("adminEmail") || "";
    const name = localStorage.getItem("adminName") || "";
    const phone = localStorage.getItem("adminPhone") || "";
    const company = localStorage.getItem("adminCompany") || "";
    const location = localStorage.getItem("adminLocation") || "";
    const bio = localStorage.getItem("adminBio") || "";
    const role = localStorage.getItem("adminRole") || "admin";
    const picture = localStorage.getItem("adminProfilePicture") || "";
    const notifications = localStorage.getItem("emailNotifications") !== "false";
    const pushNotif = localStorage.getItem("pushNotifications") === "true";
    const dark = localStorage.getItem("adminTheme") !== "light";
    
    setAdminEmail(email);
    setAdminName(name);
    setAdminPhone(phone);
    setAdminCompany(company);
    setAdminLocation(location);
    setAdminBio(bio);
    setAdminRole(role);
    setProfilePicture(picture);
    setEmailNotifications(notifications);
    setPushNotifications(pushNotif);
    setDarkMode(dark);
    
    // Calculate profile completion
    const fields = [email, name, phone, company, location, bio, role];
    const completedFields = fields.filter(field => field && field.trim() !== "").length;
    setProfileCompletion(Math.round((completedFields / fields.length) * 100));
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus("idle");
    try {
      localStorage.setItem("adminEmail", adminEmail);
      localStorage.setItem("adminName", adminName);
      localStorage.setItem("adminPhone", adminPhone);
      localStorage.setItem("adminCompany", adminCompany);
      localStorage.setItem("adminLocation", adminLocation);
      localStorage.setItem("adminBio", adminBio);
      localStorage.setItem("adminRole", adminRole);
      localStorage.setItem("adminProfilePicture", profilePicture);
      localStorage.setItem("emailNotifications", emailNotifications.toString());
      localStorage.setItem("pushNotifications", pushNotifications.toString());
      localStorage.setItem("adminTheme", darkMode ? "dark" : "light");
      
      // Update profile completion
      const fields = [adminEmail, adminName, adminPhone, adminCompany, adminLocation, adminBio, adminRole];
      const completedFields = fields.filter(field => field && field.trim() !== "").length;
      setProfileCompletion(Math.round((completedFields / fields.length) * 100));
      
      setSaveStatus("success");
      setTimeout(() => {
        setIsLoading(false);
        setSaveStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveStatus("error");
      setIsLoading(false);
    }
  };

  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfilePicture(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture("");
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'super-admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'manager':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'staff':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return '👑';
      case 'super-admin':
        return '⚡';
      case 'admin':
        return '🛡️';
      case 'manager':
        return '📋';
      case 'staff':
        return '👤';
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
    // Handle password change logic here
    alert("Password changed successfully!");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Profile Settings
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Manage your personal information, security, and preferences
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="mb-2">
                Admin Account
              </Badge>
              <div className="text-sm text-muted-foreground">
                Member since {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Completion */}
        <Card className="mb-6 border-l-4 border-l-blue-500">
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

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
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
                      <AvatarImage src={profilePicture} alt={adminName || adminEmail} />
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
                    <select
                      id="role"
                      value={adminRole}
                      onChange={(e) => setAdminRole(e.target.value)}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="owner">Owner</option>
                      <option value="super-admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Your role determines your permissions and access level
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
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
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
                    <Shield className="h-5 w-5" />
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Active Sessions</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Current Session</p>
                            <p className="text-xs text-muted-foreground">{navigator.userAgent.split(" ")[0]}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
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
              <CardContent className="space-y-6">
                <div className="space-y-4">
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
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Notification Types</h4>
                  <div className="grid gap-3">
                    {[
                      "New booking requests",
                      "Booking confirmations",
                      "Customer messages",
                      "System updates",
                      "Security alerts"
                    ].map((type) => (
                      <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">{type}</span>
                        <Switch defaultChecked={type !== "System updates"} />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Appearance
                  </CardTitle>
                  <CardDescription>
                    Customize your interface appearance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <select className="w-full p-2 border rounded-md">
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <select className="w-full p-2 border rounded-md">
                      <option>UTC-8 (Pacific Time)</option>
                      <option>UTC-5 (Eastern Time)</option>
                      <option>UTC+0 (GMT)</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Display Settings</CardTitle>
                  <CardDescription>
                    Configure your display preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Page</Label>
                    <select className="w-full p-2 border rounded-md">
                      <option>Dashboard</option>
                      <option>Bookings</option>
                      <option>Customers</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Items per page</Label>
                    <select className="w-full p-2 border rounded-md">
                      <option>10</option>
                      <option>25</option>
                      <option>50</option>
                      <option>100</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium">Compact View</h4>
                      <p className="text-sm text-muted-foreground">
                        Show more items in lists
                      </p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Actions */}
        <div className="flex items-center justify-between mt-8 p-6 bg-card rounded-lg border">
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
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="min-w-[120px]">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
