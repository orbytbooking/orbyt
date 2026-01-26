"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, UserRound, Upload, Trash2 } from "lucide-react";

import { CustomerSidebar } from "@/components/customer/CustomerSidebar";
import { useCustomerAccount } from "@/hooks/useCustomerAccount";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const CustomerProfilePage = () => {
  const { customerAccount, accountLoading, handleLogout, updateAccount, updatePassword } = useCustomerAccount();
  const { toast } = useToast();
  const [formState, setFormState] = useState(customerAccount);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormState(customerAccount);
  }, [customerAccount]);

  const initials = useMemo(() => (
    customerAccount.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "PP"
  ), [customerAccount.name]);

  const isDirty = useMemo(() => JSON.stringify(formState) !== JSON.stringify(customerAccount), [formState, customerAccount]);

  const handleFieldChange = (field: keyof typeof customerAccount) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field: keyof typeof customerAccount.notifications) => (checked: boolean) => {
    setFormState((prev) => ({ ...prev, notifications: { ...prev.notifications, [field]: checked } }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateAccount(formState);
    toast({
      title: "Profile updated",
      description: "Your preferences have been saved.",
    });
  };

  const handlePasswordFieldChange = (field: keyof typeof passwordForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordSaving) return;
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({ title: "Missing information", description: "Please complete all password fields.", variant: "destructive" });
      return;
    }
    if (passwordForm.currentPassword !== customerAccount.password) {
      toast({ title: "Incorrect password", description: "Your current password doesn't match our records.", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "Password too short", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords don't match", description: "Make sure the new passwords match.", variant: "destructive" });
      return;
    }

    setPasswordSaving(true);
    updatePassword(passwordForm.newPassword);
    setPasswordSaving(false);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    toast({ title: "Password updated", description: "You're all set with a fresh password." });
  };

  const handleTriggerAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({ title: "Image too large", description: "Please upload a file smaller than 3MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormState((prev) => ({ ...prev, avatar: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = () => {
    setFormState((prev) => ({ ...prev, avatar: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Clock className="h-8 w-8 animate-spin" />
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[280px_1fr]">
        <CustomerSidebar
          customerName={customerAccount.name}
          customerEmail={customerAccount.email}
          initials={initials}
          onLogout={handleLogout}
        />
        <div className="order-1 flex flex-col lg:order-2">
          <header className="bg-background border-b border-border shadow-sm">
            <div className="flex flex-col gap-2 px-6 py-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4" />
                Account settings
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Profile settings</h1>
              <p className="text-sm text-muted-foreground">
                Keep your contact info and notification preferences up to date.
              </p>
            </div>
          </header>
          <main className="flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-10">
            <Card>
              <CardHeader>
                <CardTitle>Personal information</CardTitle>
                <CardDescription>We use this to personalize your experience and keep your appointments organized.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-8" onSubmit={handleSubmit}>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border p-4 sm:flex-row sm:items-center">
                    <Avatar className="h-16 w-16">
                      {formState.avatar ? <AvatarImage src={formState.avatar} alt={formState.name} /> : null}
                      <AvatarFallback className="text-base font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <p className="font-semibold">Profile photo</p>
                      <p className="text-sm text-muted-foreground">Upload a JPG or PNG (max 3MB) to personalize your account.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" onClick={handleTriggerAvatarUpload}>
                          <Upload className="mr-2 h-4 w-4" /> Upload photo
                        </Button>
                        {formState.avatar && (
                          <Button type="button" size="sm" variant="outline" onClick={handleAvatarRemove}>
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profile-name">Full name</Label>
                      <Input
                        id="profile-name"
                        value={formState.name}
                        onChange={handleFieldChange("name")}
                        placeholder="Jane Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-email">Email address</Label>
                      <Input
                        id="profile-email"
                        type="email"
                        value={formState.email}
                        onChange={handleFieldChange("email")}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-phone">Phone number</Label>
                      <Input
                        id="profile-phone"
                        value={formState.phone}
                        onChange={handleFieldChange("phone")}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-address">Service address</Label>
                      <Input
                        id="profile-address"
                        value={formState.address}
                        onChange={handleFieldChange("address")}
                        placeholder="123 Main St"
                      />
                    </div>
                  </div>

                  <Card className="border-dashed">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base">Notifications</CardTitle>
                      <CardDescription>Choose when we reach out about bookings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">Email updates</p>
                          <p className="text-sm text-muted-foreground">Get confirmations and receipts in your inbox.</p>
                        </div>
                        <Switch
                          checked={formState.notifications.emailUpdates}
                          onCheckedChange={handleNotificationChange("emailUpdates")}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">SMS updates</p>
                          <p className="text-sm text-muted-foreground">Receive quick texts when your pro is on the way.</p>
                        </div>
                        <Switch
                          checked={formState.notifications.smsUpdates}
                          onCheckedChange={handleNotificationChange("smsUpdates")}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setFormState(customerAccount)} disabled={!isDirty}>
                      Reset changes
                    </Button>
                    <Button type="submit" disabled={!isDirty}>
                      Save profile
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Choose a strong password to keep your account protected.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={handlePasswordSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordFieldChange("currentPassword")}
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordFieldChange("newPassword")}
                      placeholder="At least 6 characters"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordFieldChange("confirmPassword")}
                      placeholder="Re-enter new password"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={passwordSaving}>
                      {passwordSaving ? "Saving..." : "Update password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfilePage;
