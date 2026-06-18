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
  Loader2,
} from "lucide-react";
import { withTenantBusiness } from "@/lib/adminTenantFetch";
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

interface AdminNotificationItem {
  id: string;
  name: string;
  description: string;
}

interface AdminNotificationSection {
  id: string;
  label: string;
  items: AdminNotificationItem[];
}

type NotificationRole = "admin" | "customer" | "provider" | "staff";
type MasterTemplate = Pick<
  BusinessNotificationTemplate,
  "id" | "name" | "enabled" | "subject" | "body" | "is_default"
>;

type CoreNotificationPreferences = {
  emailBookings: boolean;
  emailCancellations: boolean;
  emailPayments: boolean;
  smsReminders: boolean;
  pushNotifications: boolean;
};

const DEFAULT_CORE_PREFERENCES: CoreNotificationPreferences = {
  emailBookings: true,
  emailCancellations: true,
  emailPayments: true,
  smsReminders: false,
  pushNotifications: true,
};

function defaultSupportEmail(businessName?: string | null): string {
  return `support@${businessName?.toLowerCase().replace(/\s+/g, "") || "business"}.com`;
}


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
  const [corePreferences, setCorePreferences] = useState<CoreNotificationPreferences>(DEFAULT_CORE_PREFERENCES);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
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

  const applyPreferencesToForm = useCallback(
    (prefs: Record<string, unknown>, businessName?: string | null) => {
      const fallbackEmail = defaultSupportEmail(businessName);
      setSenderEmail(
        typeof prefs.senderEmail === "string" && prefs.senderEmail.trim()
          ? prefs.senderEmail.trim()
          : fallbackEmail,
      );
      setDisplayName(
        typeof prefs.displayName === "string" && prefs.displayName.trim()
          ? prefs.displayName.trim()
          : businessName || "Your Business",
      );
      setAdminEmail(
        typeof prefs.adminEmail === "string" && prefs.adminEmail.trim()
          ? prefs.adminEmail.trim()
          : fallbackEmail,
      );
      setReplyToEmail(
        typeof prefs.replyToEmail === "string" && prefs.replyToEmail.trim()
          ? prefs.replyToEmail.trim()
          : fallbackEmail,
      );
      setQuietHours(typeof prefs.quietHours === "boolean" ? prefs.quietHours : false);
      setEmailFrequency(
        prefs.emailFrequency === "hourly" ||
          prefs.emailFrequency === "daily" ||
          prefs.emailFrequency === "weekly"
          ? prefs.emailFrequency
          : "instant",
      );
      setCorePreferences({
        emailBookings:
          typeof prefs.emailBookings === "boolean" ? prefs.emailBookings : DEFAULT_CORE_PREFERENCES.emailBookings,
        emailCancellations:
          typeof prefs.emailCancellations === "boolean"
            ? prefs.emailCancellations
            : DEFAULT_CORE_PREFERENCES.emailCancellations,
        emailPayments:
          typeof prefs.emailPayments === "boolean" ? prefs.emailPayments : DEFAULT_CORE_PREFERENCES.emailPayments,
        smsReminders:
          typeof prefs.smsReminders === "boolean" ? prefs.smsReminders : DEFAULT_CORE_PREFERENCES.smsReminders,
        pushNotifications:
          typeof prefs.pushNotifications === "boolean"
            ? prefs.pushNotifications
            : DEFAULT_CORE_PREFERENCES.pushNotifications,
      });
    },
    [],
  );

  const fetchPreferences = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setPreferencesLoading(true);
    try {
      const res = await fetch(
        "/api/admin/notification-preferences",
        withTenantBusiness(currentBusiness.id),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load notification preferences");
      if (data.preferences && typeof data.preferences === "object") {
        applyPreferencesToForm(data.preferences as Record<string, unknown>, currentBusiness.name);
      }
    } catch (e) {
      toast({
        title: "Could not load preferences",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPreferencesLoading(false);
    }
  }, [applyPreferencesToForm, currentBusiness?.id, currentBusiness?.name, toast]);

  useEffect(() => {
    void fetchPreferences();
  }, [fetchPreferences]);

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

  const handleSave = async () => {
    if (!currentBusiness?.id) return;

    for (const [label, value] of [
      ["Sender email", senderEmail],
      ["Admin email", adminEmail],
      ["Reply-to email", replyToEmail],
    ] as const) {
      const trimmed = value.trim();
      if (!trimmed || !trimmed.includes("@")) {
        toast({
          title: "Invalid email",
          description: `Enter a valid ${label.toLowerCase()}.`,
          variant: "destructive",
        });
        return;
      }
    }

    setPreferencesSaving(true);
    try {
      const res = await fetch(
        "/api/admin/notification-preferences",
        withTenantBusiness(currentBusiness.id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...corePreferences,
            senderEmail: senderEmail.trim(),
            displayName: displayName.trim(),
            adminEmail: adminEmail.trim(),
            replyToEmail: replyToEmail.trim(),
            quietHours,
            emailFrequency,
          }),
        }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save notification preferences");
      if (data.preferences && typeof data.preferences === "object") {
        applyPreferencesToForm(data.preferences as Record<string, unknown>, currentBusiness.name);
      }
      toast({
        title: "Preferences saved",
        description: "Your notification settings have been updated.",
      });
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Failed to save notification preferences",
        variant: "destructive",
      });
    } finally {
      setPreferencesSaving(false);
    }
  };

  const adminNotificationSections: AdminNotificationSection[] = [
    {
      id: "account",
      label: "Account",
      items: [
        {
          id: "account_deactivation_request",
          name: "Account deactivation request",
          description: "This email notification is sent to you when your customer requests to deactivate their account.",
        },
      ],
    },
    {
      id: "general",
      label: "General",
      items: [
        {
          id: "google_calendar_failed_sync",
          name: "Google calendar failed sync",
          description: "This email notification is sent to you when the bookings sync to your Google Calendar fails.",
        },
        {
          id: "google_calendar_failed_sync_provider",
          name: "Google calendar failed sync for provider",
          description:
            "This email notification is sent to you when a bookings sync fails for any provider's Google Calendar.",
        },
        {
          id: "google_sheets_failed_sync",
          name: "Google sheets failed sync",
          description: "This email notification is sent to you when the event sync to your Google Sheets fails.",
        },
      ],
    },
    {
      id: "new_modified_booking",
      label: "New & modified booking",
      items: [
        {
          id: "admin_new_booking",
          name: "New booking",
          description: "This email notification is sent to you when you have a new booking.",
        },
        {
          id: "admin_new_booking_via_referral",
          name: "New booking via referral",
          description: "This email notification is sent to you when you have a new booking via a referral.",
        },
        {
          id: "admin_booking_modified",
          name: "Booking modified",
          description: "This email notification is sent to you when a booking has been modified.",
        },
        {
          id: "admin_booking_modified_after_5pm",
          name: "Booking modified after 5 pm",
          description:
            "This email notification is sent to you when a booking has been modified after 5 pm the day before the booking is to take place.",
        },
        {
          id: "admin_booking_accepted",
          name: "Booking accepted",
          description: "This email notification is sent to you when the booking has been accepted.",
        },
        {
          id: "admin_booking_declined",
          name: "Booking declined",
          description: "This email notification is sent to you when the booking has been declined.",
        },
      ],
    },
    {
      id: "cancel_postponed_booking",
      label: "Canceled & postponed booking",
      items: [
        {
          id: "admin_booking_canceled",
          name: "Booking canceled",
          description: "This email notification is sent to you when a booking has been canceled.",
        },
        {
          id: "admin_booking_canceled_after_5pm",
          name: "Booking canceled after 5 pm",
          description:
            "This email notification is sent to you when a booking has been canceled after 5 pm the day before the booking is to take place.",
        },
        {
          id: "admin_booking_cancellation_request",
          name: "Booking cancellation request",
          description:
            "This email notification is sent to you when the customer has sent a request to cancel their booking.",
        },
        {
          id: "admin_booking_canceled_card_hold_failure",
          name: "Booking canceled due to card hold failure",
          description:
            "This email notification is sent to you when a booking has been canceled due to the debit/credit card on hold has failed.",
        },
        {
          id: "admin_postpone_booking",
          name: "Postpone booking",
          description:
            "This email notification is sent to you when a customer has postponed their next upcoming booking.",
        },
      ],
    },
    {
      id: "unassigned_booking",
      label: "Unassigned booking",
      items: [
        {
          id: "admin_new_booking_unassigned_folder",
          name: "New booking in unassigned folder",
          description:
            "This email notification is sent to you when there is a new booking that arrived in the unassigned folder.",
        },
        {
          id: "admin_booking_moved_to_unassigned_folder",
          name: "Booking moved to unassigned folder",
          description:
            "This email notification is sent to you when a booking is modified and subsequently moved to the unassigned folder.",
        },
        {
          id: "admin_booking_modified_in_unassigned_folder",
          name: "Booking modified in unassigned folder",
          description:
            "This email notification is sent to you when a booking was modified in the unassigned folder.",
        },
        {
          id: "admin_someone_grabbed_job_unassigned_folder",
          name: "Someone grabbed a job from unassigned folder",
          description:
            "This email notification is sent to you when a provider has accepted a job from the unassigned folder.",
        },
        {
          id: "admin_unassigned_starting_lt_12h",
          name: "Unassigned booking is starting in less than 12 hours",
          description:
            "This email notification is sent to you when a booking that is in the unassigned folder starts in less than 12 hours and it has not been paired with a provider yet.",
        },
        {
          id: "admin_unassigned_starting_lt_4h",
          name: "Unassigned booking is starting in less than 4 hours",
          description:
            "This email notification is sent to you when a booking that is in the unassigned folder starts in less than 4 hours and it has not been paired with a provider yet.",
        },
        {
          id: "admin_unassigned_starting_lt_1h",
          name: "Unassigned booking is starting in less than 1 hour",
          description:
            "This email notification is sent to you when a booking that is in the unassigned folder starts in less than 1 hour and it has not been paired with a provider yet.",
        },
      ],
    },
    {
      id: "reminders",
      label: "Reminders",
      items: [
        {
          id: "admin_job_reminders",
          name: "Job reminders",
          description: "This email notification is sent to you 24 hours before the booking is to start.",
        },
        {
          id: "admin_email_reminder_to_admin",
          name: "Email reminder to admin",
          description:
            "This email notification is sent to you when you set a job reminder while creating or editing a booking.",
        },
        {
          id: "admin_bookings_cash_check_reminder",
          name: "Bookings with cash/check reminder",
          description:
            "This email notification is sent to you when an upcoming booking has cash/check payment option.",
        },
      ],
    },
    {
      id: "booking_fee_charged",
      label: "Booking fee charged",
      items: [
        {
          id: "admin_cancellation_fee_charged_cash_check",
          name: "Cancellation fee charged with cash/check",
          description:
            "This email notification is sent to you when the cancellation fee has been successfully charged using the cash/check method.",
        },
        {
          id: "admin_canceled_after_1st_appointment_fee_cash_check",
          name: "Canceled after 1st appointment fee charged with cash/check",
          description:
            "This email notification is sent to you when the cancellation fee for a booking that cancelled after the first appointment has been successfully charged using the cash/check method.",
        },
        {
          id: "admin_tip_received_post_booking",
          name: "Tip received (Post-Booking)",
          description: "This email notification is sent to you when a tip has been charged post booking.",
        },
        {
          id: "admin_extra_charge_charged_cash_check",
          name: "Extra charge charged with cash/check",
          description:
            "This email notification is sent to you when an extra charge has been charged using the cash/check method.",
        },
      ],
    },
    {
      id: "payments_cards",
      label: "Payments/cards",
      items: [
        {
          id: "admin_declined_card",
          name: "Declined card",
          description: "This email notification is sent to you when a debit/credit card has declined.",
        },
        {
          id: "admin_card_declined_on_hold",
          name: "Card declined on hold",
          description:
            "This email notification is sent to you when a debit/credit card has declined when it is trying to place a hold for the booking amount.",
        },
        {
          id: "admin_booking_modified_card_hold_failed",
          name: "Booking modified but card hold failed",
          description:
            "This email notification is sent to you when there have been modifications made to the booking but the debit/credit card has declined when it is trying to place a hold for the booking amount.",
        },
        {
          id: "admin_new_card_added_by_customer",
          name: "New card added by customer",
          description:
            "This email notification is sent to you when a customer adds a new card along with the section it is added from. The card addition may happen from the following sections: 'invoice', 'link', or 'profile'.",
        },
        {
          id: "admin_card_hold_amount_released",
          name: "Card hold amount released",
          description:
            "This email notification is sent to you when a card hold released from payment processor directly.",
        },
      ],
    },
    {
      id: "rating_review",
      label: "Rating & review",
      items: [
        {
          id: "admin_new_review",
          name: "New review",
          description: "This email notification is sent to you when a provider gets rated for a job.",
        },
        {
          id: "admin_poor_rating",
          name: "Poor rating",
          description:
            "This email notification is sent to you when a provider has been rated 3 out of 5 or lower.",
        },
        {
          id: "admin_poor_rating_twice_a_week",
          name: "Poor rating twice a week",
          description:
            "This email notification is sent to you when a provider has been rated 3 out of 5 or lower twice in the same week.",
        },
        {
          id: "admin_provider_overall_rating_dropped",
          name: "Provider overall rating dropped",
          description:
            "This email notification is sent to you when a provider's overall rating has dropped below a 4 out of 5 and you will be notified each time it happens.",
        },
      ],
    },
    {
      id: "gift_card_referral",
      label: "Gift card & referral",
      items: [
        {
          id: "admin_new_gift_card_purchased",
          name: "New gift card purchased",
          description: "This email notification is sent to you when a new gift card has been purchased.",
        },
      ],
    },
    {
      id: "payment_processor",
      label: "Payment processor",
      items: [
        {
          id: "admin_payment_processor_account_pending",
          name: "Payment processor account pending",
          description:
            "This email notification is sent to you when the provider's payment processor account has been created with restricted status due to insufficient information.",
        },
        {
          id: "admin_payment_processor_account_verification_failed",
          name: "Payment processor account verification failed",
          description:
            "This email notification is sent to you when the provider's payment processor account verification fails.",
        },
        {
          id: "admin_payment_processor_account_connected",
          name: "Payment processor account connected",
          description:
            "This email notification is sent to you when the provider's payment processor account has been successfully connected with your account.",
        },
        {
          id: "admin_payment_processor_account_onboarding_completed",
          name: "Payment processor account onboarding completed",
          description:
            "This email notification is sent to you when the onboarding process of the provider's payment processor account has been completed.",
        },
        {
          id: "admin_payment_processor_account_restricted",
          name: "Payment processor account restricted",
          description:
            "This email notification is sent to you when the provider's payment processor account becomes restricted.",
        },
      ],
    },
    {
      id: "schedule_settings",
      label: "Schedule & settings",
      items: [
        {
          id: "admin_settings_modification_request",
          name: "Settings modification request",
          description:
            "This email notification is sent to you when a provider requests a modification to their settings.",
        },
        {
          id: "admin_schedule_modification_request",
          name: "Schedule modification request",
          description:
            "This email notification is sent to you when a provider requests a modification to their schedule.",
        },
        {
          id: "admin_schedule_updated",
          name: "Schedule updated",
          description: "This email notification is sent to you when a provider has updated their schedule.",
        },
        {
          id: "admin_settings_updated",
          name: "Settings updated",
          description: "This email notification is sent to you when a provider has updated their settings.",
        },
      ],
    },
    {
      id: "clock_in_out",
      label: "Clock in/clock out",
      items: [
        {
          id: "admin_provider_on_the_way",
          name: "Provider on the way",
          description:
            "This email notification is sent to you when a provider clicks 'On the Way' button for booking, allowing real-time tracking and management.",
        },
        {
          id: "admin_provider_not_on_the_way",
          name: "Provider not on the way",
          description:
            "This email notification is sent to you when a provider has not clicked 'On the Way' button for their booking.",
        },
        {
          id: "admin_booking_not_clocked_in",
          name: "Booking not clocked in",
          description: "This email notification is sent to you when a provider has not clocked in to their booking.",
        },
        {
          id: "admin_booking_clocked_in",
          name: "Booking clocked in",
          description: "This email notification is sent to you when a provider has clocked in to their booking.",
        },
        {
          id: "admin_booking_clocked_out",
          name: "Booking clocked out",
          description: "This email notification is sent to you when a provider has clocked out from their booking.",
        },
      ],
    },
    {
      id: "booking_reschedule_fee_charged_failed",
      label: "Booking reschedule fee charged & failed",
      items: [
        {
          id: "admin_booking_reschedule_fee_charged",
          name: "Booking reschedule fee charged",
          description: "This email notification is sent to you when the booking reschedule fee has been charged.",
        },
        {
          id: "admin_booking_reschedule_fee_declined",
          name: "Booking reschedule fee declined",
          description:
            "This email notification is sent to you when the booking rescheduling fee has declined.",
        },
      ],
    },
    {
      id: "checklist",
      label: "Checklist",
      items: [],
    },
    {
      id: "invoice",
      label: "Invoice",
      items: [
        {
          id: "admin_invoice_partial_charge",
          name: "Invoice partial charge",
          description: "This email notification is sent to you when an invoice has been partially charged.",
        },
        {
          id: "admin_invoice_charge",
          name: "Invoice charge",
          description: "This email notification is sent to you when an invoice has been fully charged.",
        },
        {
          id: "admin_invoice_card_declined",
          name: "Invoice card declined",
          description: "This email notification is sent to you when an invoice charge is declined.",
        },
        {
          id: "admin_skip_invoice",
          name: "Skip invoice",
          description:
            "This email notification is sent when an invoice is skipped due to the 'Create Booking and Send Invoice' setting. This can happen if a booking is charged, cancelled, or deleted, if a manual invoice was issued, or due to industry-specific scenarios with no active bookings at the time. The system skips the invoice generation when no valid bookings are found based on the selected settings.",
        },
        {
          id: "admin_end_recurring_invoice_schedule",
          name: "End recurring invoice schedule",
          description:
            "This email notification is sent to inform you when one or more recurring booking invoice schedules have been ended by the system due to no bookings or cancellations.",
        },
      ],
    },
    {
      id: "signup",
      label: "Signup",
      items: [
        {
          id: "admin_new_service_provider_signed_up",
          name: "New service provider signed up",
          description:
            "This email notification is sent to you when someone has successfully signed up as a service provider.",
        },
        {
          id: "admin_upgrade_plan_approve_new_provider",
          name: "Upgrade plan to approve new service provider",
          description:
            "This email notification is sent to you when a new provider tries to sign up but your maximum provider limit for your current plan has been reached.",
        },
        {
          id: "admin_review_provider_sign_up_request",
          name: "Review provider sign up request",
          description:
            "This email notification is sent to you when a new provider signs up and you need to approve the request.",
        },
      ],
    },
  ];

  const customerNotificationSections: AdminNotificationSection[] = [
    {
      id: "account",
      label: "Account",
      items: [
        {
          id: "customer_new_account",
          name: "New account",
          description: "This email notification is sent to the customer when they have created their new account.",
        },
        {
          id: "customer_set_up_new_password",
          name: "Set up new password",
          description: "This email notification is sent to the customer to set up a password for their account.",
        },
        {
          id: "customer_reset_password",
          name: "Reset password",
          description: "This email notification is sent to the customer when they need to reset their password.",
        },
        {
          id: "customer_password_changed",
          name: "Password changed",
          description: "This email notification is sent to the customer when their password has been successfully changed.",
        },
        {
          id: "customer_profile_info_changed",
          name: "Profile info changed",
          description: "This email notification is sent to the customer when information in their profile has changed.",
        },
        {
          id: "customer_activated",
          name: "Customer activated",
          description: "This email notification is sent to the customer letting them know that their account has been activated.",
        },
        {
          id: "customer_deactivated",
          name: "Customer deactivated",
          description: "This email notification is sent to the customer letting them know that their account has been deactivated.",
        },
        {
          id: "customer_add_card",
          name: "Add card",
          description: "This email notification is sent to the customer requesting them to add a card to their profile.",
        },
      ],
    },
    {
      id: "new_modified_booking",
      label: "New & modified booking",
      items: [
        {
          id: "customer_receipt_email_one_time",
          name: "Receipt email one-time",
          description:
            "This email notification is sent to the customer when they book a one-time booking using either card or cash/check.",
        },
        {
          id: "customer_receipt_email_recurring",
          name: "Receipt email recurring",
          description:
            "This email notification is sent to the customer when they book a recurring booking using either card or cash/check.",
        },
        {
          id: "customer_booking_confirmed",
          name: "Booking confirmed",
          description:
            "This email notification is sent to the customer when a booking has been confirmed by pairing a provider with that booking.",
        },
        {
          id: "customer_booking_modified",
          name: "Booking modified",
          description:
            "This email notification is sent to the customer letting them know that their booking has been modified.",
        },
      ],
    },
    {
      id: "canceled_booking",
      label: "Canceled booking",
      items: [
        {
          id: "customer_booking_cancellation",
          name: "Booking cancellation",
          description:
            "This email notification is sent to the customer letting them know that their booking has been cancelled.",
        },
        {
          id: "customer_booking_canceled_card_hold_failure",
          name: "Booking canceled due to card hold failure",
          description:
            "This email notification is sent to the customer when a booking has been canceled due to the debit/credit card on hold failing.",
        },
        {
          id: "customer_never_found_a_provider",
          name: "Never found a provider",
          description:
            "This email notification is sent to the customer when a provider was not found for their booking.",
        },
        {
          id: "customer_cancellation_fee_authentication",
          name: "Cancellation fee authentication",
          description:
            "This email notification is sent to the customer to authenticate their card for a cancellation fee.",
        },
      ],
    },
    { id: "reminders", label: "Reminders", items: [] },
    {
      id: "completed_booking",
      label: "Completed booking",
      items: [
        {
          id: "customer_leave_tip",
          name: "Leave tip",
          description: "This email notification is sent to the customer asking them to leave a tip.",
        },
      ],
    },
    {
      id: "booking_fee_charged_refund",
      label: "Booking fee charged & refund",
      items: [
        {
          id: "customer_booking_charged",
          name: "Booking charged",
          description: "This email notification is sent to the customer when a booking has been successfully charged.",
        },
        {
          id: "customer_service_receipt",
          name: "Service receipt",
          description: "This email notification is sent to the customer when we sent them a service receipt.",
        },
        {
          id: "customer_fees_charged",
          name: "Fees charged",
          description:
            "This email notification is sent to the customer when they have been charged a fee like a tip, cancellation, or extra.",
        },
        {
          id: "customer_bookings_pre_paid",
          name: "Bookings pre-paid",
          description:
            "This email notification is sent to the customer when they have been charged for pre-payment of booking(s).",
        },
        {
          id: "customer_refund_given",
          name: "Refund given",
          description: "This email notification is sent to the customer when they have been given a refund.",
        },
        {
          id: "customer_card_charge_authentication",
          name: "Card charge authentication",
          description:
            "This email notification is sent to the customer to authenticate their card for a booking charge.",
        },
        {
          id: "customer_pre_charge_authentication",
          name: "Pre-charge authentication",
          description:
            "This email notification is sent to the customer to authenticate their card for pre-paid booking charges.",
        },
        {
          id: "customer_bulk_bookings_charge",
          name: "Bulk bookings charge",
          description:
            "This email notification is sent to the customer when a bulk charge is performed on their bookings.",
        },
        {
          id: "customer_bulk_bookings_charge_authentication",
          name: "Bulk bookings charge authentication",
          description:
            "This email notification is sent to the customer to authenticate their card for a bulk bookings charge.",
        },
      ],
    },
    {
      id: "card_declined",
      label: "Card declined",
      items: [
        {
          id: "customer_card_declined",
          name: "Card declined",
          description: "This email notification is sent to the customer when their card declines.",
        },
        {
          id: "customer_card_declined_on_hold",
          name: "Card declined on hold",
          description:
            "This email notification is sent to the customer when their card declines during the card hold process.",
        },
        {
          id: "customer_booking_modified_card_hold_failed",
          name: "Booking modified but card hold failed",
          description:
            "This email notification is sent to the customer when there have been modifications made to the booking but the debit/credit card has declined when it is trying to place a hold for the booking amount.",
        },
        {
          id: "customer_card_hold_authentication",
          name: "Card hold authentication",
          description:
            "This email notification is sent to the customer to authenticate their card for a card hold/pre-authorization for their upcoming booking.",
        },
      ],
    },
    { id: "rating_review", label: "Rating & review", items: [] },
    {
      id: "gift_card_referral",
      label: "Gift card & referral",
      items: [
        {
          id: "customer_gift_card_receipt",
          name: "Gift card receipt",
          description: "This email notification is sent to the customer after they purchase a gift card.",
        },
        {
          id: "customer_new_gift_card",
          name: "New gift card",
          description: "This email notification is sent to the customer when they have received a new gift card.",
        },
        {
          id: "customer_gift_card_refund_given",
          name: "Gift card refund given",
          description: "This email notification is sent to the customer when they have been given a refund for a gift card.",
        },
        {
          id: "customer_gift_card_value_updated",
          name: "Gift card value updated",
          description:
            "This email notification is sent to the customer when a gift card sent to them is partially refunded.",
        },
        {
          id: "customer_gift_card_expired",
          name: "Gift card expired",
          description:
            "This email notification is sent to the customer when a gift card sent to them is fully refunded and has no amount left to be used.",
        },
        {
          id: "customer_referral_invitation",
          name: "Referral invitation",
          description:
            "This email notification is sent to the customer when someone sent them referral credits.",
        },
        {
          id: "customer_referral_accepted",
          name: "Referral accepted",
          description:
            "This email notification is sent to the customer when someone booked using their referral link.",
        },
        {
          id: "customer_earned_referral_credits",
          name: "Earned referral credits",
          description: "This email notification is sent to the customer when they earned referral credits.",
        },
        {
          id: "customer_gift_card_authentication",
          name: "Gift card authentication",
          description:
            "This email notification is sent to the customer to authenticate their credit card and finalize the purchase of their gift card.",
        },
      ],
    },
    { id: "quote", label: "Quote", items: [] },
    { id: "customer_checklist", label: "Checklist", items: [] },
    { id: "separate_charge", label: "Separate charge", items: [] },
    { id: "customer_invoice", label: "Invoice", items: [] },
  ];

  const providerNotificationSections: AdminNotificationSection[] = [
    {
      id: "account",
      label: "Account",
      items: [
        {
          id: "provider_new_account",
          name: "New account",
          description: "This email notification is sent to the provider when their account has been created.",
        },
        {
          id: "provider_how_it_works",
          name: "How it works",
          description:
            "This email notification is sent to the provider letting them know of all the things their new account can do.",
        },
        {
          id: "provider_reset_password",
          name: "Reset password",
          description: "This email notification is sent to the provider when they need to reset their password.",
        },
        {
          id: "provider_password_changed",
          name: "Password changed",
          description:
            "This email notification is sent to the provider when their password has been successfully changed.",
        },
        {
          id: "provider_account_activated",
          name: "Account activated",
          description: "This email notification is sent to the provider when their account has been activated.",
        },
        {
          id: "provider_account_deactivated",
          name: "Account deactivated",
          description: "This email notification is sent to the provider when their account has been deactivated.",
        },
        {
          id: "provider_sign_up_email_verification",
          name: "Provider sign up email verification",
          description: "This email notification is sent to the provider for email verification upon sign up.",
        },
        {
          id: "provider_sign_up_request_submitted",
          name: "Provider sign up request submitted",
          description:
            "This email notification is sent to the provider when their sign up request has been submitted.",
        },
        {
          id: "provider_sign_up_request_rejected",
          name: "Provider sign up request rejected",
          description:
            "This email notification is sent to the provider when their sign up request has been rejected.",
        },
      ],
    },
    { id: "drive", label: "Drive", items: [] },
    { id: "new_modified_booking", label: "New & modified booking", items: [] },
    { id: "cancel_postponed_booking", label: "Canceled & postponed booking", items: [] },
    { id: "unassigned_booking", label: "Unassigned booking", items: [] },
    { id: "reminders", label: "Reminders", items: [] },
    { id: "rating_review", label: "Rating & review", items: [] },
    { id: "payments", label: "Payments", items: [] },
    { id: "payment_processor", label: "Payment processor", items: [] },
    { id: "schedule_settings", label: "Schedule & settings", items: [] },
    { id: "checklist", label: "Checklist", items: [] },
  ];

  const staffNotificationSections: AdminNotificationSection[] = [
    {
      id: "account",
      label: "Account",
      items: [
        {
          id: "staff_new_account",
          name: "New account",
          description:
            "This email notification is sent to the staff member when their new account has been created and to create a password.",
        },
        {
          id: "staff_how_it_works",
          name: "How it works",
          description:
            "This email notification is sent to the staff member notifying them of what can be done in their account.",
        },
        {
          id: "staff_reset_password",
          name: "Reset password",
          description: "This email notification is sent to the staff member notifying them to change their password.",
        },
        {
          id: "staff_password_changed",
          name: "Password changed",
          description: "This email notification is sent to the staff member when their password has been changed.",
        },
        {
          id: "staff_account_activated",
          name: "Account activated",
          description:
            "This email notification is sent to the staff member notifying them that their account has been activated.",
        },
        {
          id: "staff_account_deactivated",
          name: "Account deactivated",
          description:
            "This email notification is sent to the staff member notifying them that their account has been deactivated.",
        },
      ],
    },
    {
      id: "general",
      label: "General",
      items: [
        {
          id: "staff_google_calendar_failed_sync",
          name: "Google calendar failed sync",
          description:
            "This email notification is sent to the staff member when the bookings sync to their Google Calendar fails.",
        },
      ],
    },
  ];

  const getTemplateForNotification = (notificationName: string) =>
    notificationTemplates.find((tpl) => tpl.name.trim().toLowerCase() === notificationName.trim().toLowerCase());

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
                          type="button"
                          disabled
                          variant="outline"
                          title="Custom sender domains are verified in Resend"
                        >
                          Resend Verification Email
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Custom sender domains are verified through Resend. Contact support if you need help adding your domain.
                      </p>
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
                  onClick={() => void handleSave()}
                  disabled={preferencesLoading || preferencesSaving}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                >
                  {preferencesSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
                                  <div className="px-4 pb-4 pt-0">
                                    {section.items.length === 0 ? (
                                      <p className="text-sm text-muted-foreground py-2">No notifications in this category yet.</p>
                                    ) : (
                                      <div className="rounded-md border bg-background overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-[100px]">Status</TableHead>
                                              <TableHead className="w-[280px]">Name</TableHead>
                                              <TableHead>Description</TableHead>
                                              <TableHead className="w-[90px] text-right">Action</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {section.items.map((item) => {
                                              const matchedTemplate = getTemplateForNotification(item.name);
                                              const hasTemplate = Boolean(matchedTemplate);
                                              const isEnabled = matchedTemplate?.enabled ?? false;
                                              return (
                                                <TableRow key={item.id}>
                                                  <TableCell>
                                                    <div className="flex items-center gap-2">
                                                      <Badge
                                                        variant="secondary"
                                                        className={
                                                          isEnabled
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : "bg-muted text-muted-foreground border border-border"
                                                        }
                                                      >
                                                        {isEnabled ? "Enabled" : "Disabled"}
                                                      </Badge>
                                                      <Toggle
                                                        checked={isEnabled}
                                                        onCheckedChange={(checked) => {
                                                          if (matchedTemplate) {
                                                            void setTemplateEnabled(matchedTemplate.id, checked);
                                                            return;
                                                          }

                                                          if (checked) {
                                                            router.push(
                                                              `/admin/settings/notifications/new?name=${encodeURIComponent(item.name)}`,
                                                            );
                                                          }
                                                        }}
                                                        aria-label={`Toggle ${item.name} notification`}
                                                      />
                                                    </div>
                                                  </TableCell>
                                                  <TableCell className="text-sm">{item.name}</TableCell>
                                                  <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                                                  <TableCell className="text-right">
                                                    {hasTemplate && matchedTemplate ? (
                                                      <Button
                                                        variant="link"
                                                        className="h-auto p-0"
                                                        onClick={() => goToEditTemplate(matchedTemplate.id)}
                                                      >
                                                        Edit
                                                      </Button>
                                                    ) : (
                                                      <Button
                                                        variant="link"
                                                        className="h-auto p-0"
                                                        onClick={() =>
                                                          router.push(
                                                            `/admin/settings/notifications/new?name=${encodeURIComponent(item.name)}`,
                                                          )
                                                        }
                                                      >
                                                        Add
                                                      </Button>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
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
                                  <div className="px-4 pb-4 pt-0">
                                    {section.items.length === 0 ? (
                                      <p className="text-sm text-muted-foreground py-2">No notifications in this category yet.</p>
                                    ) : (
                                      <div className="rounded-md border bg-background overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-[100px]">Status</TableHead>
                                              <TableHead className="w-[280px]">Name</TableHead>
                                              <TableHead>Description</TableHead>
                                              <TableHead className="w-[90px] text-right">Action</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {section.items.map((item) => {
                                              const matchedTemplate = getTemplateForNotification(item.name);
                                              const hasTemplate = Boolean(matchedTemplate);
                                              const isEnabled = matchedTemplate?.enabled ?? false;
                                              return (
                                                <TableRow key={item.id}>
                                                  <TableCell>
                                                    <div className="flex items-center gap-2">
                                                      <Badge
                                                        variant="secondary"
                                                        className={
                                                          isEnabled
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : "bg-muted text-muted-foreground border border-border"
                                                        }
                                                      >
                                                        {isEnabled ? "Enabled" : "Disabled"}
                                                      </Badge>
                                                      <Toggle
                                                        checked={isEnabled}
                                                        onCheckedChange={(checked) => {
                                                          if (matchedTemplate) {
                                                            void setTemplateEnabled(matchedTemplate.id, checked);
                                                            return;
                                                          }

                                                          if (checked) {
                                                            router.push(
                                                              `/admin/settings/notifications/new?name=${encodeURIComponent(item.name)}`,
                                                            );
                                                          }
                                                        }}
                                                        aria-label={`Toggle ${item.name} notification`}
                                                      />
                                                    </div>
                                                  </TableCell>
                                                  <TableCell className="text-sm">{item.name}</TableCell>
                                                  <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                                                  <TableCell className="text-right">
                                                    {hasTemplate && matchedTemplate ? (
                                                      <Button
                                                        variant="link"
                                                        className="h-auto p-0"
                                                        onClick={() => goToEditTemplate(matchedTemplate.id)}
                                                      >
                                                        Edit
                                                      </Button>
                                                    ) : (
                                                      <Button
                                                        variant="link"
                                                        className="h-auto p-0"
                                                        onClick={() =>
                                                          router.push(
                                                            `/admin/settings/notifications/new?name=${encodeURIComponent(item.name)}`,
                                                          )
                                                        }
                                                      >
                                                        Add
                                                      </Button>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
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
                                  <div className="px-4 pb-4 pt-0">
                                    {section.items.length === 0 ? (
                                      <p className="text-sm text-muted-foreground py-2">No notifications in this category yet.</p>
                                    ) : (
                                      <div className="rounded-md border bg-background overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-[100px]">Status</TableHead>
                                              <TableHead className="w-[280px]">Name</TableHead>
                                              <TableHead>Description</TableHead>
                                              <TableHead className="w-[90px] text-right">Action</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {section.items.map((item) => {
                                              const matchedTemplate = getTemplateForNotification(item.name);
                                              const hasTemplate = Boolean(matchedTemplate);
                                              const isEnabled = matchedTemplate?.enabled ?? false;
                                              return (
                                                <TableRow key={item.id}>
                                                  <TableCell>
                                                    <div className="flex items-center gap-2">
                                                      <Badge
                                                        variant="secondary"
                                                        className={
                                                          isEnabled
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : "bg-muted text-muted-foreground border border-border"
                                                        }
                                                      >
                                                        {isEnabled ? "Enabled" : "Disabled"}
                                                      </Badge>
                                                      <Toggle
                                                        checked={isEnabled}
                                                        onCheckedChange={(checked) => {
                                                          if (matchedTemplate) {
                                                            void setTemplateEnabled(matchedTemplate.id, checked);
                                                            return;
                                                          }

                                                          if (checked) {
                                                            router.push(
                                                              `/admin/settings/notifications/new?name=${encodeURIComponent(item.name)}`,
                                                            );
                                                          }
                                                        }}
                                                        aria-label={`Toggle ${item.name} notification`}
                                                      />
                                                    </div>
                                                  </TableCell>
                                                  <TableCell className="text-sm">{item.name}</TableCell>
                                                  <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                                                  <TableCell className="text-right">
                                                    {hasTemplate && matchedTemplate ? (
                                                      <Button
                                                        variant="link"
                                                        className="h-auto p-0"
                                                        onClick={() => goToEditTemplate(matchedTemplate.id)}
                                                      >
                                                        Edit
                                                      </Button>
                                                    ) : (
                                                      <Button
                                                        variant="link"
                                                        className="h-auto p-0"
                                                        onClick={() =>
                                                          router.push(
                                                            `/admin/settings/notifications/new?name=${encodeURIComponent(item.name)}`,
                                                          )
                                                        }
                                                      >
                                                        Add
                                                      </Button>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
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
                                  <div className="px-4 pb-4 pt-0">
                                    {section.items.length === 0 ? (
                                      <p className="text-sm text-muted-foreground py-2">No notifications in this category yet.</p>
                                    ) : (
                                      <div className="rounded-md border bg-background overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-[100px]">Status</TableHead>
                                              <TableHead className="w-[280px]">Name</TableHead>
                                              <TableHead>Description</TableHead>
                                              <TableHead className="w-[90px] text-right">Action</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {section.items.map((item) => {
                                              const matchedTemplate = getTemplateForNotification(item.name);
                                              const hasTemplate = Boolean(matchedTemplate);
                                              const isEnabled = matchedTemplate?.enabled ?? false;
                                              return (
                                                <TableRow key={item.id}>
                                                  <TableCell>
                                                    <div className="flex items-center gap-2">
                                                      <Badge
                                                        variant="secondary"
                                                        className={
                                                          isEnabled
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : "bg-muted text-muted-foreground border border-border"
                                                        }
                                                      >
                                                        {isEnabled ? "Enabled" : "Disabled"}
                                                      </Badge>
                                                      <Toggle
                                                        checked={isEnabled}
                                                        onCheckedChange={(checked) => {
                                                          if (matchedTemplate) {
                                                            void setTemplateEnabled(matchedTemplate.id, checked);
                                                            return;
                                                          }

                                                          if (checked) {
                                                            router.push(
                                                              `/admin/settings/notifications/new?name=${encodeURIComponent(item.name)}`,
                                                            );
                                                          }
                                                        }}
                                                        aria-label={`Toggle ${item.name} notification`}
                                                      />
                                                    </div>
                                                  </TableCell>
                                                  <TableCell className="text-sm">{item.name}</TableCell>
                                                  <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                                                  <TableCell className="text-right">
                                                    {hasTemplate && matchedTemplate ? (
                                                      <Button
                                                        variant="link"
                                                        className="h-auto p-0"
                                                        onClick={() => goToEditTemplate(matchedTemplate.id)}
                                                      >
                                                        Edit
                                                      </Button>
                                                    ) : (
                                                      <Button
                                                        variant="link"
                                                        className="h-auto p-0"
                                                        onClick={() =>
                                                          router.push(
                                                            `/admin/settings/notifications/new?name=${encodeURIComponent(item.name)}`,
                                                          )
                                                        }
                                                      >
                                                        Add
                                                      </Button>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
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
                  onClick={() => void handleSave()}
                  disabled={preferencesLoading || preferencesSaving}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                >
                  {preferencesSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
                  onClick={() => void handleSave()}
                  disabled={preferencesLoading || preferencesSaving}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                >
                  {preferencesSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
                  onClick={() => void handleSave()}
                  disabled={preferencesLoading || preferencesSaving}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                >
                  {preferencesSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
