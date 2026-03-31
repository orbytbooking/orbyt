"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusiness } from "@/contexts/BusinessContext";
import { useWebsiteConfig } from "@/hooks/useWebsiteConfig";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Calendar,
  Users,
  Briefcase,
  AlertCircle,
  Plus,
  Minus,
  MoreHorizontal,
  Mail,
  Trash2,
  Copy,
  Check,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Link as LinkIcon,
  Image,
  Table2,
  Undo2,
  Redo2,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch as Toggle } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_MASTER_TEMPLATE_BODY_HTML, TEMPLATE_SHORT_CODES } from "@/lib/notificationMasterTemplate";
import type { BusinessNotificationTemplate } from "@/lib/businessNotificationTemplates";

interface NotificationPreference {
  id: string;
  title: string;
  description: string;
  email: boolean;
  sms: boolean;
  icon: any;
}

type NotificationRole = "admin" | "customer" | "provider" | "staff";
type MasterTemplate = Pick<
  BusinessNotificationTemplate,
  "id" | "name" | "enabled" | "subject" | "body" | "is_default"
>;


export default function NotificationsSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentBusiness } = useBusiness(); // Get current business
  const { config } = useWebsiteConfig();
  const defaultPreferences: NotificationPreference[] = [
    {
      id: "bookings",
      title: "Booking Notifications",
      description: "Get notified about new bookings, confirmations, and cancellations",
      email: true,
      sms: false,
      icon: Calendar,
    },
    {
      id: "providers",
      title: "Provider Updates",
      description: "Notifications about provider registrations, completions, and status changes",
      email: true,
      sms: false,
      icon: Briefcase,
    },
    {
      id: "customers",
      title: "Customer Activity",
      description: "Updates about customer registrations, inquiries, and feedback",
      email: true,
      sms: false,
      icon: Users,
    },
    {
      id: "payments",
      title: "Payment Notifications",
      description: "Alerts for successful payments, refunds, and payment issues",
      email: true,
      sms: true,
      icon: AlertCircle,
    },
    {
      id: "system",
      title: "System Alerts",
      description: "Important system updates, maintenance, and security notifications",
      email: true,
      sms: false,
      icon: Bell,
    },
  ];

  const cloneDefaultPreferences = () => defaultPreferences.map((p) => ({ ...p }));

  const [rolePreferences, setRolePreferences] = useState<Record<NotificationRole, NotificationPreference[]>>(
    {
      admin: cloneDefaultPreferences(),
      customer: cloneDefaultPreferences(),
      provider: cloneDefaultPreferences(),
      staff: cloneDefaultPreferences(),
    }
  );

  const [emailFrequency, setEmailFrequency] = useState('instant');
  const [quietHours, setQuietHours] = useState(false);
  const [senderEmail, setSenderEmail] = useState(`support@${currentBusiness?.name?.toLowerCase().replace(/\s+/g, '') || 'business'}.com`);
  const [displayName, setDisplayName] = useState(currentBusiness?.name || 'Your Business');
  const [adminEmail, setAdminEmail] = useState(`support@${currentBusiness?.name?.toLowerCase().replace(/\s+/g, '') || 'business'}.com`);
  const [replyToEmail, setReplyToEmail] = useState(`support@${currentBusiness?.name?.toLowerCase().replace(/\s+/g, '') || 'business'}.com`);
  const [notificationTemplates, setNotificationTemplates] = useState<MasterTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [shortCodesDialogOpen, setShortCodesDialogOpen] = useState(false);
  const [copiedShortCode, setCopiedShortCode] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState("general");

  const fetchTemplates = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/admin/notification-templates", {
        credentials: "include",
        headers: { "x-business-id": currentBusiness.id },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to load templates");
      }
      const rows = (data.templates || []) as BusinessNotificationTemplate[];
      setNotificationTemplates(
        rows.map((t) => ({
          id: t.id,
          name: t.name,
          enabled: t.enabled,
          subject: t.subject ?? "",
          body: t.body ?? "",
          is_default: t.is_default,
        })),
      );
    } catch (e) {
      toast({
        title: "Could not load templates",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTemplatesLoading(false);
    }
  }, [currentBusiness?.id, toast]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "notification-template") {
      setSettingsTab("notification-template");
      window.history.replaceState(null, "", "/admin/settings/notifications");
    }
  }, []);

  const goToEditTemplate = (id: string) => {
    router.push(`/admin/settings/notifications/${id}/edit`);
  };

  const setTemplateEnabled = async (id: string, enabled: boolean) => {
    if (!currentBusiness?.id) return;
    const prev = notificationTemplates;
    setNotificationTemplates((p) => p.map((t) => (t.id === id ? { ...t, enabled } : t)));
    try {
      const res = await fetch(`/api/admin/notification-templates/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-business-id": currentBusiness.id },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");
      if (data.template) {
        const t = data.template as BusinessNotificationTemplate;
        setNotificationTemplates((list) =>
          list.map((row) =>
            row.id === id
              ? {
                  ...row,
                  enabled: t.enabled,
                  name: t.name,
                  subject: t.subject ?? "",
                  body: t.body ?? "",
                  is_default: t.is_default,
                }
              : row,
          ),
        );
      }
    } catch (e) {
      setNotificationTemplates(prev);
      toast({
        title: "Could not update template",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const applyTemplateToEmails = async (id: string) => {
    if (!currentBusiness?.id) return;
    try {
      const res = await fetch(`/api/admin/notification-templates/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-business-id": currentBusiness.id },
        body: JSON.stringify({ is_default: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");
      await fetchTemplates();
      toast({ title: "Default template updated", description: "This layout is used for outbound notification emails." });
    } catch (e) {
      toast({
        title: "Could not apply template",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const duplicateTemplate = async (tpl: MasterTemplate) => {
    if (!currentBusiness?.id) return;
    try {
      const res = await fetch("/api/admin/notification-templates", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-business-id": currentBusiness.id },
        body: JSON.stringify({
          name: `${tpl.name} (copy)`,
          subject: tpl.subject,
          body: tpl.body?.trim() ? tpl.body : DEFAULT_MASTER_TEMPLATE_BODY_HTML,
          enabled: true,
          is_default: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Duplicate failed");
      await fetchTemplates();
      toast({ title: "Template duplicated" });
    } catch (e) {
      toast({
        title: "Could not duplicate",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!currentBusiness?.id) return;
    if (!window.confirm("Delete this notification template? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/notification-templates/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "x-business-id": currentBusiness.id },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await fetchTemplates();
      toast({ title: "Template deleted" });
    } catch (e) {
      toast({
        title: "Could not delete",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const copyShortCode = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedShortCode(token);
      window.setTimeout(() => {
        setCopiedShortCode((current) => (current === token ? null : current));
      }, 1500);
    } catch (error) {
      console.error("Failed to copy short code", error);
    }
  };

  const updatePreference = (role: NotificationRole, id: string, channel: "email" | "sms", value: boolean) => {
    setRolePreferences((prev) => ({
      ...prev,
      [role]: prev[role].map((pref) => (pref.id === id ? { ...pref, [channel]: value } : pref)),
    }));
  };

  const handleSave = () => {
    console.log("Saving notification preferences:", rolePreferences);
  };

  const handleResendVerification = () => {
    console.log('Resending verification email to:', senderEmail);
  };

  const adminNotificationSections = [
    { id: "account", label: "Account" },
    { id: "general", label: "General" },
    { id: "new_modified_booking", label: "New & modified booking" },
    { id: "cancel_postponed_booking", label: "Canceled & postponed booking" },
    { id: "unassigned_booking", label: "Unassigned booking" },
    { id: "reminders", label: "Reminders" },
    { id: "booking_fee_charged", label: "Booking fee charged" },
    { id: "payments_cards", label: "Payments/cards" },
    { id: "rating_review", label: "Rating & review" },
    { id: "gift_card_referral", label: "Gift card & referral" },
    { id: "payment_processor", label: "Payment processor" },
    { id: "schedule_settings", label: "Schedule & settings" },
    { id: "clock_in_out", label: "Clock in/clock out" },
    { id: "booking_reschedule_fee_charged_failed", label: "Booking reschedule fee charged & failed" },
    { id: "checklist", label: "Checklist" },
    { id: "invoice", label: "Invoice" },
    { id: "signup", label: "Signup" },
  ];

  const customerNotificationSections = [
    { id: "account", label: "Account" },
    { id: "new_modified_booking", label: "New & modified booking" },
    { id: "canceled_booking", label: "Canceled booking" },
    { id: "reminders", label: "Reminders" },
    { id: "completed_booking", label: "Completed booking" },
    { id: "booking_fee_charged_refund", label: "Booking fee charged & refund" },
    { id: "card_declined", label: "Card declined" },
    { id: "rating_review", label: "Rating & review" },
    { id: "gift_card_referral", label: "Gift card & referral" },
    { id: "quote", label: "Quote" },
    { id: "customer_checklist", label: "Checklist" },
    { id: "separate_charge", label: "Separate charge" },
    { id: "customer_invoice", label: "Invoice" },
  ];

  const providerNotificationSections = [
    { id: "account", label: "Account" },
    { id: "drive", label: "Drive" },
    { id: "new_modified_booking", label: "New & modified booking" },
    { id: "cancel_postponed_booking", label: "Canceled & postponed booking" },
    { id: "unassigned_booking", label: "Unassigned booking" },
    { id: "reminders", label: "Reminders" },
    { id: "rating_review", label: "Rating & review" },
    { id: "payments", label: "Payments" },
    { id: "payment_processor", label: "Payment processor" },
    { id: "schedule_settings", label: "Schedule & settings" },
    { id: "checklist", label: "Checklist" },
  ];

  const staffNotificationSections = [
    { id: "account", label: "Account" },
    { id: "general", label: "General" },
  ];

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
          <Tabs value={settingsTab} onValueChange={setSettingsTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="notification-template">Notification Template</TabsTrigger>
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

            {/* Notification Template Tab */}
            <TabsContent value="notification-template" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold mb-1">Notification templates</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200"
                      onClick={() => setShortCodesDialogOpen(true)}
                    >
                      View short codes
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                      <Link href="/admin/settings/notifications/new">Create template</Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[120px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templatesLoading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-sm text-muted-foreground py-8 text-center">
                            Loading templates…
                          </TableCell>
                        </TableRow>
                      ) : notificationTemplates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-sm text-muted-foreground py-8 text-center">
                            No templates yet. Create one to customize your notification email layout.
                          </TableCell>
                        </TableRow>
                      ) : (
                        notificationTemplates.map((tpl) => (
                          <TableRow key={tpl.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant="secondary"
                                  className={tpl.enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : ""}
                                >
                                  {tpl.enabled ? "Enabled" : "Disabled"}
                                </Badge>
                                <Toggle
                                  checked={tpl.enabled}
                                  onCheckedChange={(checked) => void setTemplateEnabled(tpl.id, checked)}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-muted-foreground">{tpl.name}</span>
                                {tpl.is_default ? (
                                  <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-800">
                                    Default for emails
                                  </Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => goToEditTemplate(tpl.id)}>
                                  Edit
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => void applyTemplateToEmails(tpl.id)}>
                                      <Mail className="mr-2 h-4 w-4" />
                                      Apply to emails
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => void duplicateTemplate(tpl)}>
                                      <Copy className="mr-2 h-4 w-4" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => void deleteTemplate(tpl.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Dialog open={shortCodesDialogOpen} onOpenChange={setShortCodesDialogOpen}>
                <DialogContent className="max-w-5xl w-[98vw]">
                  <DialogHeader>
                    <DialogTitle>Template short codes</DialogTitle>
                  </DialogHeader>

                  <div className="max-h-[420px] overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Short code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[110px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {TEMPLATE_SHORT_CODES.map((shortCode) => (
                          <TableRow key={shortCode.token}>
                            <TableCell className="font-mono text-xs">{shortCode.token}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{shortCode.description}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => copyShortCode(shortCode.token)}>
                                {copiedShortCode === shortCode.token ? (
                                  <>
                                    <Check className="mr-1 h-4 w-4" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="mr-1 h-4 w-4" />
                                    Copy
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
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

                  <Tabs defaultValue="admin" className="w-full">
                    <div className="border-b border-border">
                      <TabsList className="h-auto w-full justify-start rounded-none border-0 bg-transparent p-0 gap-0">
                        <TabsTrigger
                          value="admin"
                          className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                          Admin
                        </TabsTrigger>
                        <TabsTrigger
                          value="customer"
                          className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                          Customer
                        </TabsTrigger>
                        <TabsTrigger
                          value="provider"
                          className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                          Provider
                        </TabsTrigger>
                        <TabsTrigger
                          value="staff"
                          className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                          Staff
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {(["admin", "customer", "provider", "staff"] as NotificationRole[]).map((role) => (
                      <TabsContent key={role} value={role} className="space-y-3">
                        {role === "admin" ? (
                          <div className="rounded-lg border bg-card overflow-hidden">
                            {adminNotificationSections.map((section) => (
                              <Collapsible key={section.id} className="group">
                                <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-muted/50 transition-colors shrink-0">
                                  <span>{section.label}</span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background group-data-[state=open]:hidden">
                                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background hidden group-data-[state=open]:flex">
                                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-visible">
                                  <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
                                    {/* Placeholder for future toggle/email template options */}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        ) : role === "customer" ? (
                          <div className="rounded-lg border bg-card overflow-hidden">
                            {customerNotificationSections.map((section) => (
                              <Collapsible key={section.id} className="group">
                                <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-muted/50 transition-colors shrink-0">
                                  <span>{section.label}</span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background group-data-[state=open]:hidden">
                                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background hidden group-data-[state=open]:flex">
                                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-visible">
                                  <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
                                    {/* Placeholder for future toggle/email template options */}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        ) : role === "provider" ? (
                          <div className="rounded-lg border bg-card overflow-hidden">
                            {providerNotificationSections.map((section) => (
                              <Collapsible key={section.id} className="group">
                                <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-muted/50 transition-colors shrink-0">
                                  <span>{section.label}</span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background group-data-[state=open]:hidden">
                                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background hidden group-data-[state=open]:flex">
                                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-visible">
                                  <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
                                    {/* Placeholder for future toggle/email template options */}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        ) : role === "staff" ? (
                          <div className="rounded-lg border bg-card overflow-hidden">
                            {staffNotificationSections.map((section) => (
                              <Collapsible key={section.id} className="group">
                                <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-muted/50 transition-colors shrink-0">
                                  <span>{section.label}</span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background group-data-[state=open]:hidden">
                                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background hidden group-data-[state=open]:flex">
                                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-visible">
                                  <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
                                    {/* Placeholder for future toggle/email template options */}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        ) : role === "staff" ? (
                          <div className="rounded-lg border bg-card overflow-hidden">
                            {staffNotificationSections.map((section) => (
                              <Collapsible key={section.id} className="group">
                                <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-muted/50 transition-colors shrink-0">
                                  <span>{section.label}</span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background group-data-[state=open]:hidden">
                                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background hidden group-data-[state=open]:flex">
                                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-visible">
                                  <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
                                    {/* Placeholder for future SMS toggle/options */}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        ) : null}
                      </TabsContent>
                    ))}
                  </Tabs>
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

                  <Tabs defaultValue="admin" className="w-full">
                    <div className="border-b border-border">
                      <TabsList className="h-auto w-full justify-start rounded-none border-0 bg-transparent p-0 gap-0">
                        <TabsTrigger
                          value="admin"
                          className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                          Admin
                        </TabsTrigger>
                        <TabsTrigger
                          value="customer"
                          className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                          Customer
                        </TabsTrigger>
                        <TabsTrigger
                          value="provider"
                          className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                          Provider
                        </TabsTrigger>
                        <TabsTrigger
                          value="staff"
                          className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                          Staff
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {(["admin", "customer", "provider", "staff"] as NotificationRole[]).map((role) => (
                      <TabsContent key={role} value={role} className="space-y-3">
                        {role === "admin" ? (
                          <div className="rounded-lg border bg-card overflow-hidden">
                            {adminNotificationSections.map((section) => (
                              <Collapsible key={section.id} className="group">
                                <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-muted/50 transition-colors shrink-0">
                                  <span>{section.label}</span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background group-data-[state=open]:hidden">
                                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background hidden group-data-[state=open]:flex">
                                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-visible">
                                  <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
                                    {/* Placeholder for future SMS toggle/options */}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        ) : role === "customer" ? (
                          <div className="rounded-lg border bg-card overflow-hidden">
                            {customerNotificationSections.map((section) => (
                              <Collapsible key={section.id} className="group">
                                <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-muted/50 transition-colors shrink-0">
                                  <span>{section.label}</span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background group-data-[state=open]:hidden">
                                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background hidden group-data-[state=open]:flex">
                                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-visible">
                                  <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
                                    {/* Placeholder for future SMS toggle/options */}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        ) : role === "provider" ? (
                          <div className="rounded-lg border bg-card overflow-hidden">
                            {providerNotificationSections.map((section) => (
                              <Collapsible key={section.id} className="group">
                                <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 text-left font-semibold text-sm hover:bg-muted/50 transition-colors shrink-0">
                                  <span>{section.label}</span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background group-data-[state=open]:hidden">
                                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background hidden group-data-[state=open]:flex">
                                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-visible">
                                  <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
                                    {/* Placeholder for future SMS toggle/options */}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        ) : null}
                      </TabsContent>
                    ))}
                  </Tabs>
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
