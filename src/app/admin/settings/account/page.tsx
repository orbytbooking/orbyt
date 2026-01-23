"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Shield, CreditCard, FileText, Gift, User, Save, Briefcase } from "lucide-react";
import YourInfoPage from "./your-info/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
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

export default function AccountSettingsPage() {
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
    alert("Password changed successfully!");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="your-info" className="w-full">
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
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Billing</CardTitle>
              </div>
              <CardDescription>Manage your payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="card-name">Cardholder Name</Label>
                  <Input id="card-name" placeholder="Name on card" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input id="card-number" placeholder="•••• •••• •••• ••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp">Expiry</Label>
                  <Input id="exp" placeholder="MM/YY" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="CVC" />
                </div>
              </div>
              <Button className="mt-4" style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}>
                <Save className="h-4 w-4 mr-2" />
                Save Billing
              </Button>
            </CardContent>
          </Card>
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
