"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, Tag, MailX, Receipt, List, Plug, Plus, Minus, Loader2, Pencil, Trash2, Info, Clock, Users, Bell, Settings, Calendar, CalendarDays } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Link from 'next/link';
import { toast } from 'sonner';

interface AdminTag {
  id: string;
  name: string;
  display_order: number;
}

type SchedulingType = "accepted_automatically" | "accept_or_decline" | "accepts_same_day_only";

type BookingCompletionMode = "manual" | "automatic";

type ProviderAssignmentMode = "manual" | "automatic";

type RecurringUpdateDefault = "this_booking_only" | "all_future";

type HolidayBlockedWho = "customer" | "both";

interface StoreOptions {
  id?: string;
  business_id?: string;
  scheduling_type: SchedulingType;
  accept_decline_timeout_minutes: number;
  providers_can_see_unassigned: boolean;
  providers_can_see_all_unassigned: boolean;
  notify_providers_on_unassigned: boolean;
  waitlist_enabled: boolean;
  clock_in_out_enabled: boolean;
  booking_completion_mode: BookingCompletionMode;
  spots_based_on_provider_availability?: boolean;
  provider_assignment_mode?: ProviderAssignmentMode;
  recurring_update_default?: RecurringUpdateDefault;
  specific_provider_for_customers?: boolean;
  specific_provider_for_admin?: boolean;
  same_provider_for_recurring_cron?: boolean;
  max_minutes_per_provider_per_booking?: number;
  spot_limits_enabled?: boolean;
  holiday_skip_to_next?: boolean;
  holiday_blocked_who?: HolidayBlockedWho;
  show_provider_score_to_customers?: boolean;
  show_provider_completed_jobs_to_customers?: boolean;
  show_provider_availability_to_customers?: boolean;
  time_tracking_mode?: "timestamps_only" | "timestamps_and_gps";
  distance_unit?: "miles" | "kilometers";
  disable_auto_clock_in?: boolean;
  auto_clock_out_enabled?: boolean;
  auto_clock_out_distance_meters?: number;
  completion_on_clock_out?: boolean;
  allow_reclock_in?: boolean;
  time_log_updates_booking?: boolean;
}

const SCHEDULING_DEFAULT_OPTIONS: StoreOptions = {
  scheduling_type: "accepted_automatically",
  accept_decline_timeout_minutes: 60,
  providers_can_see_unassigned: true,
  providers_can_see_all_unassigned: false,
  notify_providers_on_unassigned: true,
  waitlist_enabled: false,
  clock_in_out_enabled: false,
  booking_completion_mode: "manual",
  spots_based_on_provider_availability: true,
  provider_assignment_mode: "automatic",
  recurring_update_default: "all_future",
  specific_provider_for_customers: false,
  specific_provider_for_admin: true,
  same_provider_for_recurring_cron: true,
  max_minutes_per_provider_per_booking: 0,
  spot_limits_enabled: false,
  holiday_skip_to_next: false,
  holiday_blocked_who: "customer",
  show_provider_score_to_customers: true,
  show_provider_completed_jobs_to_customers: true,
  show_provider_availability_to_customers: true,
  time_tracking_mode: "timestamps_only",
  distance_unit: "miles",
  disable_auto_clock_in: false,
  auto_clock_out_enabled: false,
  auto_clock_out_distance_meters: 500,
  completion_on_clock_out: false,
  allow_reclock_in: false,
  time_log_updates_booking: false,
};

export default function GeneralSettingsPage() {
  const { currentBusiness } = useBusiness();
  const searchParams = useSearchParams();
  const storeTab = searchParams.get('tab') || 'general';
  const [tags, setTags] = useState<AdminTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<AdminTag | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalDisplayOrder, setModalDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteTag, setDeleteTag] = useState<AdminTag | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [locationSettingsExpanded, setLocationSettingsExpanded] = useState(false);
  const [locationManagement, setLocationManagement] = useState<'zip' | 'name' | 'none'>('zip');
  const [wildcardZipEnabled, setWildcardZipEnabled] = useState<'yes' | 'no'>('yes');
  const [storeInfoExpanded, setStoreInfoExpanded] = useState(false);
  const [storeCurrency, setStoreCurrency] = useState('USD');
  const [storeEmail, setStoreEmail] = useState('');
  const [storeTimeZone, setStoreTimeZone] = useState('America/Chicago');
  const [storeTimeFormat, setStoreTimeFormat] = useState('12h');
  const [storeDateFormat, setStoreDateFormat] = useState('MM/DD/YYYY');
  const [countryCodePhone, setCountryCodePhone] = useState<'yes' | 'no'>('no');
  const [storePhone, setStorePhone] = useState('');
  const [storePhoneFormat, setStorePhoneFormat] = useState('999-999-9999');
  const [paymentCreditCard, setPaymentCreditCard] = useState(true);
  const [paymentCashCheck, setPaymentCashCheck] = useState(false);
  const [formBooking, setFormBooking] = useState(true);
  const [calendarColorManagement, setCalendarColorManagement] = useState<'booking' | 'provider'>('booking');
  const [rememberFilter, setRememberFilter] = useState<'yes' | 'no'>('no');
  const [changeServiceFeeName, setChangeServiceFeeName] = useState<'yes' | 'no'>('no');
  const [serviceFeeCustomName, setServiceFeeCustomName] = useState('');
  const [addressSettingsExpanded, setAddressSettingsExpanded] = useState(false);
  const [showLocationNameAtEnd, setShowLocationNameAtEnd] = useState<'yes' | 'no'>('no');
  const [multispotSettingsExpanded, setMultispotSettingsExpanded] = useState(false);
  const [multispotMultiplePerSpot, setMultispotMultiplePerSpot] = useState<'yes' | 'no'>('no');
  const [quoteExpanded, setQuoteExpanded] = useState(false);
  const [quoteAllowModify, setQuoteAllowModify] = useState<'yes' | 'no'>('yes');
  const [priceTimeExpanded, setPriceTimeExpanded] = useState(false);
  const [priceAdjustmentNote, setPriceAdjustmentNote] = useState<'yes' | 'no'>('no');
  const [timeAdjustmentNote, setTimeAdjustmentNote] = useState<'yes' | 'no'>('no');
  const [calendarSettingsExpanded, setCalendarSettingsExpanded] = useState(false);
  const [calendarDefaultView, setCalendarDefaultView] = useState<'calendar' | 'listing'>('calendar');
  const [calendarViewDefault, setCalendarViewDefault] = useState<'month' | 'week' | 'day'>('month');
  const [calendarProvidersPosition, setCalendarProvidersPosition] = useState<'top' | 'timeline' | 'side'>('side');
  const [calendarMonthShow, setCalendarMonthShow] = useState<'names' | 'dots'>('names');
  const [calendarMultipleBookings, setCalendarMultipleBookings] = useState<'side_by_side' | 'overlapped'>('side_by_side');
  const [calendarHideNonWorkingHours, setCalendarHideNonWorkingHours] = useState<'yes' | 'no'>('no');
  const [timeZoneSettingsExpanded, setTimeZoneSettingsExpanded] = useState(false);
  const [timeZoneMultipleEnabled, setTimeZoneMultipleEnabled] = useState<'yes' | 'no'>('no');
  const [chatSettingsExpanded, setChatSettingsExpanded] = useState(false);
  const [chatFeatureEnabled, setChatFeatureEnabled] = useState<'yes' | 'no'>('no');
  const [invoiceSettingsExpanded, setInvoiceSettingsExpanded] = useState(false);
  const [invoiceCardHoldAction, setInvoiceCardHoldAction] = useState<'release' | 'capture'>('capture');
  const [cardHoldExpanded, setCardHoldExpanded] = useState(false);
  const [cardHoldPlaceHold, setCardHoldPlaceHold] = useState<'yes' | 'no'>('yes');
  const [cardHoldChargingMethod, setCardHoldChargingMethod] = useState<'manual' | 'automatic' | 'both'>('both');
  const [cardHoldBookingTypes, setCardHoldBookingTypes] = useState<'new' | 'reschedule' | 'both'>('both');
  const [cardHoldAllowBookingWhenFail, setCardHoldAllowBookingWhenFail] = useState<'yes' | 'no'>('yes');
  const [cardHoldWhen, setCardHoldWhen] = useState<'day_of' | 'days_before'>('days_before');
  const [cardHoldDayOfTime, setCardHoldDayOfTime] = useState('08:00 AM');
  const [cardHoldDaysBefore, setCardHoldDaysBefore] = useState('1');
  const [cardHoldOnFail, setCardHoldOnFail] = useState<'cancel' | 'leave'>('leave');
  const [cancellationExpanded, setCancellationExpanded] = useState(false);
  const [cancellationChargeFee, setCancellationChargeFee] = useState<'yes' | 'no'>('yes');
  const [cancellationFeeType, setCancellationFeeType] = useState<'single' | 'multiple'>('single');
  const [cancellationFeeAmount, setCancellationFeeAmount] = useState('50.00');
  const [cancellationFeeCurrency, setCancellationFeeCurrency] = useState('$');
  const [cancellationPayProvider, setCancellationPayProvider] = useState(false);
  const [cancellationOverrideServiceCategory, setCancellationOverrideServiceCategory] = useState(false);
  const [cancellationStopRecurring, setCancellationStopRecurring] = useState<'yes' | 'no'>('yes');
  const [cancellationChargeWhen, setCancellationChargeWhen] = useState<'after_time_day_before' | 'hours_before'>('after_time_day_before');
  const [cancellationAfterTime, setCancellationAfterTime] = useState('06:00');
  const [cancellationAfterAmPm, setCancellationAfterAmPm] = useState<'AM' | 'PM'>('PM');
  const [cancellationHoursBefore, setCancellationHoursBefore] = useState('1');
  const [cancellationExcludeSameDay, setCancellationExcludeSameDay] = useState(false);
  const [cancellationReasonsSetup, setCancellationReasonsSetup] = useState<'yes' | 'no'>('yes');
  const [cancellationReasonOptional, setCancellationReasonOptional] = useState<'yes' | 'no'>('no');
  const [cancellationCommentBox, setCancellationCommentBox] = useState<'yes' | 'no'>('yes');
  const [cancellationBookingTypeOneTime, setCancellationBookingTypeOneTime] = useState(true);
  const [cancellationBookingTypeRecurring, setCancellationBookingTypeRecurring] = useState(true);
  const [cancellationReasonsDisplay, setCancellationReasonsDisplay] = useState<'admin_only' | 'both'>('both');
  const [cancellationServiceReasons, setCancellationServiceReasons] = useState<Record<string, boolean>>({});
  const [cancellationServiceCategories, setCancellationServiceCategories] = useState<{ id: string; name: string; industry_id?: string }[]>([]);
  const [cancellationServiceCategoriesLoading, setCancellationServiceCategoriesLoading] = useState(false);
  const [cancellationIndustries, setCancellationIndustries] = useState<{ id: string; name: string }[]>([]);
  const [cancellationSettingsLoading, setCancellationSettingsLoading] = useState(false);
  const [cancellationSettingsSaving, setCancellationSettingsSaving] = useState(false);
  const [reschedulingFeesExpanded, setReschedulingFeesExpanded] = useState(false);
  const [chargeRescheduleFee, setChargeRescheduleFee] = useState<'yes' | 'no'>('yes');
  const [rescheduleFeeAmount, setRescheduleFeeAmount] = useState('');
  const [rescheduleFeeCurrency, setRescheduleFeeCurrency] = useState('$');
  const [overrideServiceCategoryReschedule, setOverrideServiceCategoryReschedule] = useState(false);
  const [rescheduleConsiderDate, setRescheduleConsiderDate] = useState(false);
  const [rescheduleConsiderTime, setRescheduleConsiderTime] = useState(false);
  const [rescheduleConsiderAnyChanges, setRescheduleConsiderAnyChanges] = useState(true);
  const [chargeRescheduleWhen, setChargeRescheduleWhen] = useState<'after_time_day_before' | 'hours_before'>('after_time_day_before');
  const [chargeAfterTime, setChargeAfterTime] = useState('01:00');
  const [chargeAfterAmPm, setChargeAfterAmPm] = useState<'AM' | 'PM'>('AM');
  const [chargeHoursBefore, setChargeHoursBefore] = useState('1');
  const [excludeSameDayBookings, setExcludeSameDayBookings] = useState(false);
  const [chargeMultipleFeesOneDay, setChargeMultipleFeesOneDay] = useState(false);
  const [chargeFeeOnPostpone, setChargeFeeOnPostpone] = useState(false);
  const [accessSettingsExpanded, setAccessSettingsExpanded] = useState(false);
  const [customerBlockedMessage, setCustomerBlockedMessage] = useState(
    'We apologize for the inconvenience. Please contact our office if you have any questions.'
  );
  const [providerDeactivatedMessage, setProviderDeactivatedMessage] = useState(
    'We apologize for the inconvenience. Please contact our office if you have any questions.'
  );
  const [accessSettingsLoading, setAccessSettingsLoading] = useState(false);
  const [accessSettingsSaving, setAccessSettingsSaving] = useState(false);
  const [paymentExpanded, setPaymentExpanded] = useState(false);
  const [paymentChargeUnassigned, setPaymentChargeUnassigned] = useState<'yes' | 'no'>('no');
  const [paymentAutoChargeAfterDone, setPaymentAutoChargeAfterDone] = useState<'yes' | 'no'>('yes');
  const [paymentChargeWhen, setPaymentChargeWhen] = useState<'immediately' | 'hours_after' | 'at_time'>('immediately');
  const [paymentChargeHoursAfter, setPaymentChargeHoursAfter] = useState('1');
  const [paymentChargeAtTime, setPaymentChargeAtTime] = useState('01:00');
  const [paymentChargeAtAmPm, setPaymentChargeAtAmPm] = useState<'AM' | 'PM'>('AM');
  const [paymentChargePastDate, setPaymentChargePastDate] = useState<'yes' | 'no'>('no');
  const [paymentChargeOnRescheduleHistory, setPaymentChargeOnRescheduleHistory] = useState<'yes' | 'no'>('no');
  const [paymentApplyToServices, setPaymentApplyToServices] = useState<Record<string, boolean>>({});
  const [paymentServiceCategories, setPaymentServiceCategories] = useState<{ id: string; name: string; industry_id?: string }[]>([]);
  const [paymentServiceCategoriesLoading, setPaymentServiceCategoriesLoading] = useState(false);
  const [paymentIndustriesList, setPaymentIndustriesList] = useState<{ id: string; name: string }[]>([]);
  const [paymentApplyToCredit, setPaymentApplyToCredit] = useState(true);
  const [paymentApplyToCash, setPaymentApplyToCash] = useState(true);
  const [paymentRefundWhenUpdatedToCash, setPaymentRefundWhenUpdatedToCash] = useState<'yes' | 'no'>('yes');
  const [paymentRefundWhenDecreasedNoLogs, setPaymentRefundWhenDecreasedNoLogs] = useState<'yes' | 'no'>('yes');
  const [paymentRefundHandling, setPaymentRefundHandling] = useState<'consider' | 'do_not_consider'>('do_not_consider');
  const [paymentRefundWhenDecreasedWithLogs, setPaymentRefundWhenDecreasedWithLogs] = useState<'yes' | 'no'>('yes');
  const [paymentDeclinedPrePayment, setPaymentDeclinedPrePayment] = useState<'leave' | 'cancel_24h'>('leave');
  const [paymentIndividualChargeNotifications, setPaymentIndividualChargeNotifications] = useState<'yes' | 'no'>('no');

  // Scheduling tab (store options)
  const [schedulingOptions, setSchedulingOptions] = useState<StoreOptions>(SCHEDULING_DEFAULT_OPTIONS);
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [schedulingSaving, setSchedulingSaving] = useState(false);
  // Provider eligibility (scores / preview)
  const [eligibilityProviders, setEligibilityProviders] = useState<Array<{ id: string; name: string; invitation_priority: number; score: number; reasons: string[]; eligible: boolean }>>([]);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [recentAssignments, setRecentAssignments] = useState<Array<{ id: string; providerName: string; service: string; score: number; assignedAt: string }>>([]);
  const [recentAssignmentsLoading, setRecentAssignmentsLoading] = useState(false);
  const [previewDate, setPreviewDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Admin tab (store options): gift card, referral, payment descriptions
  const [giftCardMinAmount, setGiftCardMinAmount] = useState('150.00');
  const [giftCardEditBelowMin, setGiftCardEditBelowMin] = useState<'yes' | 'no'>('no');
  const [giftCardMaxLimitEnabled, setGiftCardMaxLimitEnabled] = useState<'yes' | 'no'>('yes');
  const [giftCardMaxAmount, setGiftCardMaxAmount] = useState('');
  const [referralCreditsReferred, setReferralCreditsReferred] = useState('50.00');
  const [referralCreditsReferrer, setReferralCreditsReferrer] = useState('50.00');
  const [cardHoldDescription, setCardHoldDescription] = useState('Card hold for premierprocleaner by OrbytBooking -');
  const [chargeBookingDescription, setChargeBookingDescription] = useState('Amount charged by OrbytBooking.');
  const [separateChargeDescription, setSeparateChargeDescription] = useState('');
  const [chargeInvoiceDescription, setChargeInvoiceDescription] = useState('');
  const [adminSettingsSaving, setAdminSettingsSaving] = useState(false);

  const fetchAccessSettings = async () => {
    if (!currentBusiness?.id) return;
    setAccessSettingsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/access-settings?businessId=${encodeURIComponent(currentBusiness.id)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch access settings');
      if (data.settings) {
        setCustomerBlockedMessage(
          data.settings.customer_blocked_message ||
            'We apologize for the inconvenience. Please contact our office if you have any questions.'
        );
        setProviderDeactivatedMessage(
          data.settings.provider_deactivated_message ||
            'We apologize for the inconvenience. Please contact our office if you have any questions.'
        );
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to load access settings');
    } finally {
      setAccessSettingsLoading(false);
    }
  };

  const saveAccessSettings = async () => {
    if (!currentBusiness?.id) return;
    setAccessSettingsSaving(true);
    try {
      const res = await fetch('/api/admin/access-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-business-id': currentBusiness.id },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          customer_blocked_message: customerBlockedMessage,
          provider_deactivated_message: providerDeactivatedMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save access settings');
      toast.success('Access settings saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save access settings');
    } finally {
      setAccessSettingsSaving(false);
    }
  };

  const fetchTags = async () => {
    if (!currentBusiness?.id) return;
    setTagsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/tags?businessId=${encodeURIComponent(currentBusiness.id)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tags');
      setTags(data.tags ?? []);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to load tags');
      setTags([]);
    } finally {
      setTagsLoading(false);
    }
  };

  useEffect(() => {
    if (currentBusiness?.id) fetchTags();
  }, [currentBusiness?.id]);

  const fetchSchedulingOptions = async () => {
    if (!currentBusiness?.id) return;
    setSchedulingLoading(true);
    try {
      const res = await fetch(`/api/admin/store-options?businessId=${currentBusiness.id}`, {
        headers: { "x-business-id": currentBusiness.id },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setSchedulingOptions(data.options ? { ...SCHEDULING_DEFAULT_OPTIONS, ...data.options } : SCHEDULING_DEFAULT_OPTIONS);
    } catch {
      toast.error("Failed to load scheduling settings");
      setSchedulingOptions(SCHEDULING_DEFAULT_OPTIONS);
    } finally {
      setSchedulingLoading(false);
    }
  };

  useEffect(() => {
    if (currentBusiness?.id) fetchSchedulingOptions();
  }, [currentBusiness?.id]);

  const fetchRecentAutoAssignments = async () => {
    if (!currentBusiness?.id) return;
    setRecentAssignmentsLoading(true);
    try {
      const res = await fetch(`/api/admin/auto-assign?businessId=${encodeURIComponent(currentBusiness.id)}`);
      const data = await res.json();
      if (data.success && data.stats?.recentAssignments) {
        setRecentAssignments(data.stats.recentAssignments);
      } else {
        setRecentAssignments([]);
      }
    } catch {
      setRecentAssignments([]);
    } finally {
      setRecentAssignmentsLoading(false);
    }
  };

  const fetchEligibilityPreview = async () => {
    if (!currentBusiness?.id) return;
    setEligibilityLoading(true);
    try {
      const params = new URLSearchParams({ businessId: currentBusiness.id });
      if (previewDate) params.set('date', previewDate);
      const res = await fetch(`/api/admin/auto-assign/preview?${params}`);
      const data = await res.json();
      setEligibilityProviders(data.providers ?? []);
    } catch {
      setEligibilityProviders([]);
    } finally {
      setEligibilityLoading(false);
    }
  };

  const handleSaveScheduling = async () => {
    if (!currentBusiness?.id) return;
    setSchedulingSaving(true);
    try {
      const res = await fetch("/api/admin/store-options", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-business-id": currentBusiness.id },
        body: JSON.stringify({ ...schedulingOptions, businessId: currentBusiness.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSchedulingOptions(data.options ? { ...SCHEDULING_DEFAULT_OPTIONS, ...data.options } : schedulingOptions);
      toast.success("Scheduling settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSchedulingSaving(false);
    }
  };

  const fetchCancellationServiceCategories = async () => {
    if (!currentBusiness?.id) return;
    setCancellationServiceCategoriesLoading(true);
    try {
      const [catRes, indRes] = await Promise.all([
        fetch(`/api/service-categories?businessId=${encodeURIComponent(currentBusiness.id)}`),
        fetch(`/api/industries?business_id=${encodeURIComponent(currentBusiness.id)}`),
      ]);
      const catData = await catRes.json();
      const indData = await indRes.json();
      const categories = catData.serviceCategories ?? [];
      const industries = indData.industries ?? [];
      setCancellationServiceCategories(
        categories.map((c: { id: string; name?: string; industry_id?: string }) => ({
          id: c.id,
          name: c.name ?? 'Unnamed',
          industry_id: c.industry_id,
        }))
      );
      setCancellationIndustries(
        industries.map((i: { id: string; name?: string }) => ({ id: i.id, name: i.name ?? 'Unnamed' }))
      );
    } catch (e) {
      console.error(e);
      toast.error('Failed to load service categories');
      setCancellationServiceCategories([]);
      setCancellationIndustries([]);
    } finally {
      setCancellationServiceCategoriesLoading(false);
    }
  };

  const fetchCancellationSettings = async () => {
    if (!currentBusiness?.id) return;
    setCancellationSettingsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/cancellation-settings?businessId=${encodeURIComponent(currentBusiness.id)}`,
        { headers: { 'x-business-id': currentBusiness.id } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch cancellation settings');
      const s = data.settings || {};
      if (s.chargeFee !== undefined) setCancellationChargeFee(s.chargeFee === 'no' ? 'no' : 'yes');
      if (s.feeType !== undefined) setCancellationFeeType(s.feeType === 'multiple' ? 'multiple' : 'single');
      if (s.feeAmount !== undefined) setCancellationFeeAmount(String(s.feeAmount ?? '50.00'));
      if (s.feeCurrency !== undefined) setCancellationFeeCurrency(s.feeCurrency || '$');
      if (s.payProvider !== undefined) setCancellationPayProvider(!!s.payProvider);
      if (s.overrideServiceCategory !== undefined) setCancellationOverrideServiceCategory(!!s.overrideServiceCategory);
      if (s.chargeWhen !== undefined) setCancellationChargeWhen(s.chargeWhen === 'hours_before' ? 'hours_before' : 'after_time_day_before');
      if (s.afterTime !== undefined) setCancellationAfterTime(s.afterTime || '06:00');
      if (s.afterAmPm !== undefined) setCancellationAfterAmPm(s.afterAmPm === 'AM' ? 'AM' : 'PM');
      if (s.hoursBefore !== undefined) setCancellationHoursBefore(s.hoursBefore || '1');
      if (s.excludeSameDay !== undefined) setCancellationExcludeSameDay(!!s.excludeSameDay);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to load cancellation settings');
    } finally {
      setCancellationSettingsLoading(false);
    }
  };

  const saveCancellationSettings = async () => {
    if (!currentBusiness?.id) return;
    setCancellationSettingsSaving(true);
    try {
      const res = await fetch('/api/admin/cancellation-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-business-id': currentBusiness.id },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          chargeFee: cancellationChargeFee,
          feeType: cancellationFeeType,
          feeAmount: cancellationFeeAmount,
          feeCurrency: cancellationFeeCurrency,
          payProvider: cancellationPayProvider,
          overrideServiceCategory: cancellationOverrideServiceCategory,
          chargeWhen: cancellationChargeWhen,
          afterTime: cancellationAfterTime,
          afterAmPm: cancellationAfterAmPm,
          hoursBefore: cancellationHoursBefore,
          excludeSameDay: cancellationExcludeSameDay,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save cancellation settings');
      toast.success('Cancellation settings saved');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to save cancellation settings');
    } finally {
      setCancellationSettingsSaving(false);
    }
  };

  useEffect(() => {
    if (cancellationExpanded && currentBusiness?.id) {
      fetchCancellationServiceCategories();
      fetchCancellationSettings();
    }
  }, [cancellationExpanded, currentBusiness?.id]);

  const fetchPaymentServiceCategories = async () => {
    if (!currentBusiness?.id) return;
    setPaymentServiceCategoriesLoading(true);
    try {
      const [catRes, indRes] = await Promise.all([
        fetch(`/api/service-categories?businessId=${encodeURIComponent(currentBusiness.id)}`),
        fetch(`/api/industries?business_id=${encodeURIComponent(currentBusiness.id)}`),
      ]);
      const catData = await catRes.json();
      const indData = await indRes.json();
      const categories = catData.serviceCategories ?? [];
      const industries = indData.industries ?? [];
      setPaymentServiceCategories(
        categories.map((c: { id: string; name?: string; industry_id?: string }) => ({
          id: c.id,
          name: c.name ?? 'Unnamed',
          industry_id: c.industry_id,
        }))
      );
      setPaymentIndustriesList(
        industries.map((i: { id: string; name?: string }) => ({ id: i.id, name: i.name ?? 'Unnamed' }))
      );
    } catch (e) {
      console.error(e);
      setPaymentServiceCategories([]);
      setPaymentIndustriesList([]);
    } finally {
      setPaymentServiceCategoriesLoading(false);
    }
  };

  useEffect(() => {
    if (paymentExpanded && currentBusiness?.id) {
      fetchPaymentServiceCategories();
    }
  }, [paymentExpanded, currentBusiness?.id]);

  const openAddModal = () => {
    setEditingTag(null);
    setModalName('');
    setModalDisplayOrder(tags.length > 0 ? Math.max(...tags.map((t) => t.display_order), 0) + 1 : 0);
    setModalOpen(true);
  };

  const openEditModal = (tag: AdminTag) => {
    setEditingTag(tag);
    setModalName(tag.name);
    setModalDisplayOrder(tag.display_order);
    setModalOpen(true);
  };

  const handleSaveTag = async () => {
    const name = modalName.trim();
    if (!name || !currentBusiness?.id) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingTag) {
        const res = await fetch(`/api/admin/tags/${encodeURIComponent(editingTag.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, display_order: modalDisplayOrder }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update tag');
        setModalOpen(false);
        await fetchTags();
        toast.success('Tag updated successfully');
      } else {
        const res = await fetch('/api/admin/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: currentBusiness.id,
            name,
            display_order: modalDisplayOrder,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create tag');
        setModalOpen(false);
        await fetchTags();
        toast.success('Tag created successfully');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTag) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(deleteTag.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete tag');
      }
      setDeleteTag(null);
      await fetchTags();
      toast.success('Tag deleted successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete tag');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">General</h3>
        <p className="text-sm text-muted-foreground">
          Manage your general account settings and preferences.
        </p>
      </div>
      <Separator />
      <Tabs defaultValue="store-options" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="store-options" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span>Store options</span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span>Tags</span>
          </TabsTrigger>
          <TabsTrigger value="taxes" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span>Taxes</span>
          </TabsTrigger>
          <TabsTrigger value="email-lists" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span>Email lists</span>
          </TabsTrigger>
          <TabsTrigger value="undelivered-emails" className="flex items-center gap-2">
            <MailX className="h-4 w-4" />
            <span>Undelivered emails</span>
          </TabsTrigger>
          <TabsTrigger value="apps-integrations" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span>Apps & Integrations</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="store-options" className="pt-6 space-y-0">
          <Tabs defaultValue={storeTab} className="w-full">
            <div className="border-b border-border">
              <TabsList className="h-auto w-full justify-start rounded-none border-0 bg-transparent p-0 gap-0">
                <TabsTrigger
                  value="general"
                  className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  General
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
                  value="admin"
                  className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Admin
                </TabsTrigger>
                <TabsTrigger
                  value="scheduling"
                  className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Scheduling
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="pt-6">
              <TabsContent value="general" className="mt-0 space-y-6">
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Store Info</h4>
                      <p className="text-sm text-muted-foreground">
                        Here are your businesses general settings. This is where you can upload your logo, change your currency, set your time zone, set your methods of payment that you accept and more!
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setStoreInfoExpanded((v) => !v)}
                      aria-expanded={storeInfoExpanded}
                    >
                      {storeInfoExpanded ? (
                        <Minus className="h-5 w-5" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  {storeInfoExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-6">
                      <TooltipProvider>
                        <div className="grid gap-4 sm:grid-cols-1 max-w-xl">
                          <div className="space-y-2">
                            <Label className="font-semibold">Store currency</Label>
                            <Select value={storeCurrency} onValueChange={setStoreCurrency}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD (United States dollar)</SelectItem>
                                <SelectItem value="EUR">EUR (Euro)</SelectItem>
                                <SelectItem value="GBP">GBP (British pound)</SelectItem>
                                <SelectItem value="CAD">CAD (Canadian dollar)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold">Email</Label>
                            <Input
                              type="email"
                              placeholder="office@example.com"
                              value={storeEmail}
                              onChange={(e) => setStoreEmail(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold">Time zone</Label>
                            <Select value={storeTimeZone} onValueChange={setStoreTimeZone}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select time zone" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="America/Chicago">America/Chicago</SelectItem>
                                <SelectItem value="America/New_York">America/New_York</SelectItem>
                                <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                                <SelectItem value="Europe/London">Europe/London</SelectItem>
                                <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold">Time format</Label>
                            <Select value={storeTimeFormat} onValueChange={setStoreTimeFormat}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="12h">12-hour time</SelectItem>
                                <SelectItem value="24h">24-hour time</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold">Date format</Label>
                            <Select value={storeDateFormat} onValueChange={setStoreDateFormat}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold">Would you like to give the option to add the country code for phone numbers?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Allow customers to include country code when entering their phone number.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={countryCodePhone} onValueChange={(v) => setCountryCodePhone(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="country-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="country-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold">Phone number</Label>
                            <Input
                              type="tel"
                              placeholder="Phone No."
                              value={storePhone}
                              onChange={(e) => setStorePhone(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold">Phone number format</Label>
                            <Select value={storePhoneFormat} onValueChange={setStorePhoneFormat}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="999-999-9999">999-999-9999</SelectItem>
                                <SelectItem value="(999) 999-9999">(999) 999-9999</SelectItem>
                                <SelectItem value="999.999.9999">999.999.9999</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold">Accepted forms of payment</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Choose which payment methods your store accepts from customers.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex flex-row flex-wrap gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={paymentCreditCard} onCheckedChange={(c) => setPaymentCreditCard(!!c)} />
                                <span className="text-sm">Credit/Debit card</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={paymentCashCheck} onCheckedChange={(c) => setPaymentCashCheck(!!c)} />
                                <span className="text-sm">Cash/Check</span>
                              </label>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold">What type(s) of form(s) do you want to offer?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Select the types of forms available to your customers.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={formBooking} onCheckedChange={(c) => setFormBooking(!!c)} />
                                <span className="text-sm">Booking forms</span>
                              </label>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold">How do you want to manage the colors in your admin booking calendar?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Calendar events can be colored by booking type or by provider.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={calendarColorManagement} onValueChange={(v) => setCalendarColorManagement(v as 'booking' | 'provider')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="booking" id="cal-booking" />
                                <span className="text-sm">Booking type based</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="provider" id="cal-provider" />
                                <span className="text-sm">Provider based</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold">Would you like to remember the last selected option in filter(s)?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Persist filter choices when navigating the admin.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={rememberFilter} onValueChange={(v) => setRememberFilter(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="filter-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="filter-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold">Would you like to change the name &apos;Service Fee&apos; to something else inside your store?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Use a custom label instead of &quot;Service Fee&quot; in your store.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={changeServiceFeeName} onValueChange={(v) => setChangeServiceFeeName(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="fee-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="fee-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                            {changeServiceFeeName === 'yes' && (
                              <div className="pt-2">
                                <Input
                                  placeholder="Service Fee"
                                  value={serviceFeeCustomName}
                                  onChange={(e) => setServiceFeeCustomName(e.target.value)}
                                  className="max-w-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Location Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Here you can find the settings on how you would like to manage your locations. You can set your form up to collect zip/postal codes, city or town names or you can choose to not have locations mandatory on your form in order for your customers to book.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocationSettingsExpanded((v) => !v);
                      }}
                      aria-expanded={locationSettingsExpanded}
                    >
                      {locationSettingsExpanded ? (
                        <Minus className="h-5 w-5" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  {locationSettingsExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-6">
                      <div className="space-y-3">
                        <p className="font-semibold text-sm">How do you want to manage the locations?</p>
                        <RadioGroup
                          value={locationManagement}
                          onValueChange={(v) => setLocationManagement(v as 'zip' | 'name' | 'none')}
                          className="flex flex-col gap-2"
                        >
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="zip" id="location-zip" />
                            <span className="text-sm">Zip/Postal code based</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="name" id="location-name" />
                            <span className="text-sm">Name based</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="none" id="location-none" />
                            <span className="text-sm">No location</span>
                          </label>
                        </RadioGroup>
                      </div>
                      <div className="space-y-3">
                        <p className="font-semibold text-sm">Do you want to activate the wildcard zip/postal code feature?</p>
                        <RadioGroup
                          value={wildcardZipEnabled}
                          onValueChange={(v) => setWildcardZipEnabled(v as 'yes' | 'no')}
                          className="flex flex-col gap-2"
                        >
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="yes" id="wildcard-yes" />
                            <span className="text-sm">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="no" id="wildcard-no" />
                            <span className="text-sm">No</span>
                          </label>
                        </RadioGroup>
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Address Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Here you can find settings for your addresses which will be displayed for bookings and if you would like to show your location name in addition to the customer&apos;s address.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setAddressSettingsExpanded((v) => !v)}
                      aria-expanded={addressSettingsExpanded}
                    >
                      {addressSettingsExpanded ? (
                        <Minus className="h-5 w-5" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  {addressSettingsExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-4">
                      <TooltipProvider>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Label className="font-semibold text-sm">Would you like to show the location name at the end of the address?</Label>
                            <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              When enabled, the location name will appear at the end of the address shown for bookings.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <RadioGroup
                          value={showLocationNameAtEnd}
                          onValueChange={(v) => setShowLocationNameAtEnd(v as 'yes' | 'no')}
                          className="flex gap-4 pt-1"
                        >
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="yes" id="address-location-yes" />
                            <span className="text-sm">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="no" id="address-location-no" />
                            <span className="text-sm">No</span>
                          </label>
                        </RadioGroup>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Calendar Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Here you can customize how you would like your bookings to appear in your admin dashboard either by calendar view or list view. You can customize your calendar view settings in depth with these options as well.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setCalendarSettingsExpanded((v) => !v)}
                      aria-expanded={calendarSettingsExpanded}
                    >
                      {calendarSettingsExpanded ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </Button>
                  </div>
                  {calendarSettingsExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-6">
                      <TooltipProvider>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                Would you like your bookings to appear in the calendar view or listing view by default?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Choose the default view when opening the admin booking dashboard.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup
                              value={calendarDefaultView}
                              onValueChange={(v) => setCalendarDefaultView(v as 'calendar' | 'listing')}
                              className="flex gap-4 pt-1"
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="calendar" id="cal-view-calendar" />
                                <span className="text-sm">Calendar view</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="listing" id="cal-view-listing" />
                                <span className="text-sm">Listing view</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                How would you like to set up the calendar view by default?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Default zoom level for the calendar (month, week, or day).
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup
                              value={calendarViewDefault}
                              onValueChange={(v) => setCalendarViewDefault(v as 'month' | 'week' | 'day')}
                              className="flex gap-4 pt-1"
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="month" id="cal-default-month" />
                                <span className="text-sm">Month</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="week" id="cal-default-week" />
                                <span className="text-sm">Week</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="day" id="cal-default-day" />
                                <span className="text-sm">Day</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                Where should the providers show on your calendar by default?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Position of the provider list or timeline on the calendar.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup
                              value={calendarProvidersPosition}
                              onValueChange={(v) => setCalendarProvidersPosition(v as 'top' | 'timeline' | 'side')}
                              className="flex gap-4 pt-1"
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="top" id="cal-providers-top" />
                                <span className="text-sm">Top</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="timeline" id="cal-providers-timeline" />
                                <span className="text-sm">Timeline/Horizontal</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="side" id="cal-providers-side" />
                                <span className="text-sm">Side</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">
                              Would you like to show customer names in the month view or the dots for bookings?
                            </Label>
                            <RadioGroup
                              value={calendarMonthShow}
                              onValueChange={(v) => setCalendarMonthShow(v as 'names' | 'dots')}
                              className="flex gap-4 pt-1"
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="names" id="cal-month-names" />
                                <span className="text-sm">Names</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="dots" id="cal-month-dots" />
                                <span className="text-sm">Dots</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">
                              How you want to show multiple bookings on single date?
                            </Label>
                            <RadioGroup
                              value={calendarMultipleBookings}
                              onValueChange={(v) => setCalendarMultipleBookings(v as 'side_by_side' | 'overlapped')}
                              className="flex gap-4 pt-1"
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="side_by_side" id="cal-multi-side" />
                                <span className="text-sm">Side By Side</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="overlapped" id="cal-multi-overlapped" />
                                <span className="text-sm">Overlapped</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                Would you like to hide the provider&apos;s non-working hours (grey area)?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  When enabled, the grey non-working hours will be hidden on the calendar.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup
                              value={calendarHideNonWorkingHours}
                              onValueChange={(v) => setCalendarHideNonWorkingHours(v as 'yes' | 'no')}
                              className="flex gap-4 pt-1"
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="cal-hide-hours-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="cal-hide-hours-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                          </div>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Rescheduling Fees</h4>
                      <p className="text-sm text-muted-foreground">
                        Here you can find your settings for customer reschedule. You can set up your fees, when to charge the fee and more.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setReschedulingFeesExpanded((v) => !v)}
                      aria-expanded={reschedulingFeesExpanded}
                    >
                      {reschedulingFeesExpanded ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </Button>
                  </div>
                  {reschedulingFeesExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-6">
                      <TooltipProvider>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">Would you like to charge a rescheduling fee?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Set a fee when customers reschedule their appointments.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup
                              value={chargeRescheduleFee}
                              onValueChange={(v) => setChargeRescheduleFee(v as 'yes' | 'no')}
                              className="flex gap-4 pt-1"
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="reschedule-fee-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="reschedule-fee-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                            {chargeRescheduleFee === 'yes' && (
                              <div className="flex items-center gap-2 pt-2">
                                <Input
                                  placeholder="Amount"
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={rescheduleFeeAmount}
                                  onChange={(e) => setRescheduleFeeAmount(e.target.value)}
                                  className="w-32"
                                />
                                <Select value={rescheduleFeeCurrency} onValueChange={setRescheduleFeeCurrency}>
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="$">$</SelectItem>
                                    <SelectItem value="€">€</SelectItem>
                                    <SelectItem value="£">£</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="GBP">GBP</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={overrideServiceCategoryReschedule}
                                onCheckedChange={(c) => setOverrideServiceCategoryReschedule(!!c)}
                              />
                              <span className="text-sm">Override the service category settings for reschedule fee and apply based on these settings.</span>
                            </label>
                            <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-200">
                              If the above option is not selected, then the reschedule fee will be applied based on the service category settings. Please enable the reschedule fee in the service categories if it is not enabled already or select the above option to apply global settings but it will not be based on the service categories.
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">What do you consider a rescheduled booking?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Choose which types of changes count as a reschedule for fee purposes.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex flex-wrap gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={rescheduleConsiderDate} onCheckedChange={(c) => setRescheduleConsiderDate(!!c)} />
                                <span className="text-sm">Date</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={rescheduleConsiderTime} onCheckedChange={(c) => setRescheduleConsiderTime(!!c)} />
                                <span className="text-sm">Time (Spots)</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={rescheduleConsiderAnyChanges} onCheckedChange={(c) => setRescheduleConsiderAnyChanges(!!c)} />
                                <span className="text-sm">Any changes made to the booking</span>
                              </label>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">When would you like the system to charge the customer a rescheduling fee?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Set the cutoff time or window for when a reschedule triggers a fee.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup
                              value={chargeRescheduleWhen}
                              onValueChange={(v) => setChargeRescheduleWhen(v as 'after_time_day_before' | 'hours_before')}
                              className="flex flex-col gap-3 pt-1"
                            >
                              <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                                <RadioGroupItem value="after_time_day_before" id="charge-after-day" />
                                <span className="text-sm">If they reschedule after:</span>
                                <Select value={chargeAfterTime} onValueChange={setChargeAfterTime}>
                                  <SelectTrigger className="w-24 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {['12:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00'].map((t) => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select value={chargeAfterAmPm} onValueChange={(v) => setChargeAfterAmPm(v as 'AM' | 'PM')}>
                                  <SelectTrigger className="w-20 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                  </SelectContent>
                                </Select>
                                <span className="text-sm">the day before the job.</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                                <RadioGroupItem value="hours_before" id="charge-hours-before" />
                                <span className="text-sm">If they reschedule:</span>
                                <Select value={chargeHoursBefore} onValueChange={setChargeHoursBefore}>
                                  <SelectTrigger className="w-20 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => String(i + 1)).map((h) => (
                                      <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="text-sm">Hours before the job.</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={excludeSameDayBookings} onCheckedChange={(c) => setExcludeSameDayBookings(!!c)} />
                              <span className="text-sm">Exclude same day bookings.</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={chargeMultipleFeesOneDay} onCheckedChange={(c) => setChargeMultipleFeesOneDay(!!c)} />
                              <span className="text-sm">Check this box if you would like to charge multiple rescheduling fees for changes made within one day.</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Charge a fee for each reschedule when the customer makes multiple changes in one day.
                                </TooltipContent>
                              </Tooltip>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={chargeFeeOnPostpone} onCheckedChange={(c) => setChargeFeeOnPostpone(!!c)} />
                              <span className="text-sm">Check this box if you would like to charge reschedule fee on booking postpone.</span>
                            </label>
                          </div>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Cancellation</h4>
                      <p className="text-sm text-muted-foreground">
                        Here you can find your settings for customer cancellations. You can set up your fees, when to charge the fee, reasons for cancellation and more.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setCancellationExpanded((v) => !v)}
                      aria-expanded={cancellationExpanded}
                    >
                      {cancellationExpanded ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </Button>
                  </div>
                  {cancellationExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-6">
                      <TooltipProvider>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">Do you charge a cancellation fee?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Charge customers a fee when they cancel within your policy window.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cancellationChargeFee} onValueChange={(v) => setCancellationChargeFee(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="cancel-fee-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="cancel-fee-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">Do you want to set a single cancellation fee or multiple cancellation fees?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Single fee for all cancellations or different fees based on timing/service.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cancellationFeeType} onValueChange={(v) => setCancellationFeeType(v as 'single' | 'multiple')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="single" id="cancel-single" />
                                <span className="text-sm">Single</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="multiple" id="cancel-multiple" />
                                <span className="text-sm">Multiple</span>
                              </label>
                            </RadioGroup>
                          </div>
                          {cancellationChargeFee === 'yes' && (
                            <div className="space-y-2">
                              <Label className="font-semibold text-sm">Cancellation fee</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="50.00"
                                  value={cancellationFeeAmount}
                                  onChange={(e) => setCancellationFeeAmount(e.target.value)}
                                  className="w-32"
                                />
                                <Select value={cancellationFeeCurrency} onValueChange={setCancellationFeeCurrency}>
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="$">$</SelectItem>
                                    <SelectItem value="€">€</SelectItem>
                                    <SelectItem value="£">£</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                This cancellation fee is applied based on the settings above when customers cancel within the policy window (e.g. after the set time the day before or within the set hours before the appointment).
                              </p>
                            </div>
                          )}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-1.5">
                                <Label className="font-semibold text-sm">Do you want to pay a cancellation fee to the Provider?</Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                      <Info className="h-4 w-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    Pay providers a fee when a booking is cancelled.
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Switch
                                  id="cancel-pay-provider"
                                  checked={cancellationPayProvider}
                                  onCheckedChange={setCancellationPayProvider}
                                />
                                <span className={cancellationPayProvider ? 'text-sm' : 'text-sm text-destructive'}>
                                  {cancellationPayProvider ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={cancellationOverrideServiceCategory}
                                onCheckedChange={(c) => setCancellationOverrideServiceCategory(!!c)}
                              />
                              <span className="text-sm">Override the service category settings for cancellation fee and apply based on these settings.</span>
                            </label>
                            <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-200">
                              If the above option is not selected, then the cancellation fee will be applied based on the service category settings. Please enable the cancellation fee in the service categories if it is not enabled already or select the above option to apply global settings but it will not be based on the service categories.
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                Should the system stop automatically adding new bookings to the end of the schedule if a recurring service is canceled midway?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  When a recurring booking is cancelled partway through, stop adding future occurrences.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cancellationStopRecurring} onValueChange={(v) => setCancellationStopRecurring(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="cancel-stop-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="cancel-stop-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                            <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-200">
                              If a recurring booking is canceled after initially being configured as &quot;No&quot; in the store options, and subsequently changed to &quot;Yes,&quot; the determination of whether to add a new booking upon completion will be based on the settings stored with the recurring schedule. However, if the settings are modified again and a cancellation follows, the newly updated settings will take precedence.
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">When will your customers be charged a cancellation fee?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Set the cutoff for when a cancellation triggers a fee.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cancellationChargeWhen} onValueChange={(v) => setCancellationChargeWhen(v as 'after_time_day_before' | 'hours_before')} className="flex flex-col gap-3 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                                <RadioGroupItem value="after_time_day_before" id="cancel-when-day" />
                                <span className="text-sm">If they cancel after:</span>
                                <Select value={cancellationAfterTime} onValueChange={setCancellationAfterTime}>
                                  <SelectTrigger className="w-24 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {['12:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00'].map((t) => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select value={cancellationAfterAmPm} onValueChange={(v) => setCancellationAfterAmPm(v as 'AM' | 'PM')}>
                                  <SelectTrigger className="w-20 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                  </SelectContent>
                                </Select>
                                <span className="text-sm">the day before the job.</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                                <RadioGroupItem value="hours_before" id="cancel-when-hours" />
                                <span className="text-sm">If they cancel:</span>
                                <Select value={cancellationHoursBefore} onValueChange={setCancellationHoursBefore}>
                                  <SelectTrigger className="w-20 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => String(i + 1)).map((h) => (
                                      <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="text-sm">Hours before the job.</span>
                              </label>
                            </RadioGroup>
                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                              <Checkbox checked={cancellationExcludeSameDay} onCheckedChange={(c) => setCancellationExcludeSameDay(!!c)} />
                              <span className="text-sm">Exclude same day bookings.</span>
                            </label>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">Would you like to set up reasons for why the booking is being cancelled?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Define a list of cancellation reasons for customers and staff to choose from.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cancellationReasonsSetup} onValueChange={(v) => setCancellationReasonsSetup(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="cancel-reasons-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="cancel-reasons-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                            {cancellationReasonsSetup === 'yes' && (
                              <Link href="#" className="text-sm text-primary hover:underline pt-1 block">Manage reasons</Link>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">Would you like it to be optional to give a reason with the cancellation?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Allow customers to skip selecting a reason when cancelling.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cancellationReasonOptional} onValueChange={(v) => setCancellationReasonOptional(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="cancel-optional-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="cancel-optional-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">Would you like to have a comment box in the cancellation section?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Allow free-text comments when cancelling a booking.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cancellationCommentBox} onValueChange={(v) => setCancellationCommentBox(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="cancel-comment-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="cancel-comment-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                          </div>
                          {cancellationCommentBox === 'yes' && (
                            <div className="space-y-2">
                              <Label className="font-semibold text-sm">Booking type</Label>
                              <div className="flex flex-wrap gap-4 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox checked={cancellationBookingTypeOneTime} onCheckedChange={(c) => setCancellationBookingTypeOneTime(!!c)} />
                                  <span className="text-sm">One time</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox checked={cancellationBookingTypeRecurring} onCheckedChange={(c) => setCancellationBookingTypeRecurring(!!c)} />
                                  <span className="text-sm">Recurring</span>
                                </label>
                              </div>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">Please select which services you would like to display the cancellation reasons in the pop-up.</Label>
                            <div className="pt-2">
                              {cancellationServiceCategoriesLoading ? (
                                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-sm">Loading service categories…</span>
                                </div>
                              ) : cancellationServiceCategories.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">No service categories added yet. Add categories in Settings → Industries.</p>
                              ) : (
                                (() => {
                                  const byIndustry = cancellationIndustries.length > 0
                                    ? cancellationIndustries.map((ind) => ({
                                        industry: ind,
                                        categories: cancellationServiceCategories.filter((c) => c.industry_id === ind.id),
                                      })).filter((g) => g.categories.length > 0)
                                    : [];
                                  const uncategorized = cancellationServiceCategories.filter((c) => !c.industry_id || !cancellationIndustries.some((i) => i.id === c.industry_id));
                                  const hasGroups = byIndustry.length > 0 || uncategorized.length > 0;
                                  if (!hasGroups) {
                                    return (
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {cancellationServiceCategories.map((cat) => (
                                          <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                            <Checkbox
                                              checked={cancellationServiceReasons[cat.id] ?? false}
                                              onCheckedChange={(c) => setCancellationServiceReasons((prev) => ({ ...prev, [cat.id]: !!c }))}
                                            />
                                            <span className="text-sm">{cat.name}</span>
                                          </label>
                                        ))}
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="space-y-4">
                                      {byIndustry.map(({ industry, categories }) => (
                                        <div key={industry.id}>
                                          <p className="font-medium text-sm mb-2">{industry.name}</p>
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {categories.map((cat) => (
                                              <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                  checked={cancellationServiceReasons[cat.id] ?? false}
                                                  onCheckedChange={(c) => setCancellationServiceReasons((prev) => ({ ...prev, [cat.id]: !!c }))}
                                                />
                                                <span className="text-sm">{cat.name}</span>
                                              </label>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                      {uncategorized.length > 0 && (
                                        <div>
                                          <p className="font-medium text-sm mb-2">Other</p>
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {uncategorized.map((cat) => (
                                              <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                  checked={cancellationServiceReasons[cat.id] ?? false}
                                                  onCheckedChange={(c) => setCancellationServiceReasons((prev) => ({ ...prev, [cat.id]: !!c }))}
                                                />
                                                <span className="text-sm">{cat.name}</span>
                                              </label>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">Will the reasons in the pop-up be displayed for the admin only or customers as well?</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Show cancellation reasons only to staff or to both staff and customers.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cancellationReasonsDisplay} onValueChange={(v) => setCancellationReasonsDisplay(v as 'admin_only' | 'both')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="admin_only" id="cancel-display-admin" />
                                <span className="text-sm">Only admin/staff</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="both" id="cancel-display-both" />
                                <span className="text-sm">Both</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="pt-4 border-t">
                            <Button onClick={saveCancellationSettings} disabled={cancellationSettingsSaving || cancellationSettingsLoading}>
                              {cancellationSettingsSaving ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Saving...
                                </>
                              ) : (
                                'Save cancellation settings'
                              )}
                            </Button>
                          </div>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Quote</h4>
                      <p className="text-sm text-muted-foreground">
                        Here you can find your settings for quote.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setQuoteExpanded((v) => !v)}
                      aria-expanded={quoteExpanded}
                    >
                      {quoteExpanded ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </Button>
                  </div>
                  {quoteExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-4">
                      <TooltipProvider>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Label className="font-semibold text-sm">
                              Do you want to allow customer to modify quote?
                            </Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                When enabled, customers can edit or adjust the quote before accepting.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <RadioGroup
                            value={quoteAllowModify}
                            onValueChange={(v) => setQuoteAllowModify(v as 'yes' | 'no')}
                            className="flex gap-4 pt-1"
                          >
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="yes" id="quote-modify-yes" />
                              <span className="text-sm">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="no" id="quote-modify-no" />
                              <span className="text-sm">No</span>
                            </label>
                          </RadioGroup>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Price & Time Adjustment</h4>
                      <p className="text-sm text-muted-foreground">
                        Here you can find your settings for price and time adjustments. These settings allow you to create more options for your adjustments on bookings.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setPriceTimeExpanded((v) => !v)}
                      aria-expanded={priceTimeExpanded}
                    >
                      {priceTimeExpanded ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </Button>
                  </div>
                  {priceTimeExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-6">
                      <TooltipProvider>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                Would you like to enable a note section for price adjustments on your bookings?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Add a notes field when applying price adjustments to bookings.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup
                              value={priceAdjustmentNote}
                              onValueChange={(v) => setPriceAdjustmentNote(v as 'yes' | 'no')}
                              className="flex gap-4 pt-1"
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="price-note-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="price-note-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                Would you like to enable a note section for time adjustments on your bookings?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Add a notes field when applying time adjustments to bookings.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup
                              value={timeAdjustmentNote}
                              onValueChange={(v) => setTimeAdjustmentNote(v as 'yes' | 'no')}
                              className="flex gap-4 pt-1"
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="time-note-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="time-note-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                          </div>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Payment</h4>
                      <p className="text-sm text-muted-foreground">
                        Here you can find your settings for your payment options. You can choose if you want to charge your customers automatically or not, when to charge them and more.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setPaymentExpanded((v) => !v)}
                      aria-expanded={paymentExpanded}
                    >
                      {paymentExpanded ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </Button>
                  </div>
                  {paymentExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-6">
                      <TooltipProvider>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">Do you want to allow a booking charge even if it&apos;s unassigned?</Label>
                            <p className="text-sm text-muted-foreground">If a booking is inside the unassigned folder, should we still charge it?</p>
                            <RadioGroup value={paymentChargeUnassigned} onValueChange={(v) => setPaymentChargeUnassigned(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="yes" id="pay-unassigned-yes" /><span className="text-sm">Yes</span></label>
                              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="no" id="pay-unassigned-no" /><span className="text-sm">No</span></label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2 text-left">
                            <Label className="font-semibold text-sm">Do you want bookings to be automatically charged after they are done?</Label>
                            <p className="text-sm text-muted-foreground">This allows you to have the bookings be automatically charged after they are completed. If this is not enabled, then you will have to manually charge your bookings.</p>
                            <RadioGroup value={paymentAutoChargeAfterDone} onValueChange={(v) => setPaymentAutoChargeAfterDone(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="yes" id="pay-auto-yes" /><span className="text-sm">Yes</span></label>
                              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="no" id="pay-auto-no" /><span className="text-sm">No</span></label>
                            </RadioGroup>
                          </div>
                          {paymentAutoChargeAfterDone === 'yes' && (
                          <div className="rounded-lg bg-muted/50 p-4 space-y-4 text-left">
                            <div className="space-y-2">
                                <Label className="font-semibold text-sm">When should the bookings be charged?</Label>
                                <p className="text-sm text-muted-foreground">This allows you to choose when the bookings are to be automatically charged.</p>
                                <RadioGroup value={paymentChargeWhen} onValueChange={(v) => setPaymentChargeWhen(v as 'immediately' | 'hours_after' | 'at_time')} className="flex flex-col gap-2 pt-1">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <RadioGroupItem value="immediately" id="pay-when-immediate" />
                                    <span className="text-sm">Immediately</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                                    <RadioGroupItem value="hours_after" id="pay-when-hours" />
                                    <Select value={paymentChargeHoursAfter} onValueChange={setPaymentChargeHoursAfter}>
                                      <SelectTrigger className="w-20 h-8 inline-flex"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => String(i + 1)).map((h) => (
                                          <SelectItem key={h} value={h}>{h.padStart(2, '0')}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <span className="text-sm">hours after booking completion.</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                                    <RadioGroupItem value="at_time" id="pay-when-at-time" />
                                    <span className="text-sm">At this time</span>
                                    <Select value={paymentChargeAtTime} onValueChange={setPaymentChargeAtTime}>
                                      <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {['12:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00'].map((t) => (
                                          <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select value={paymentChargeAtAmPm} onValueChange={(v) => setPaymentChargeAtAmPm(v as 'AM' | 'PM')}>
                                      <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="AM">AM</SelectItem>
                                        <SelectItem value="PM">PM</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <span className="text-sm">day after job was completed.</span>
                                  </label>
                                </RadioGroup>
                              </div>
                              <div className="space-y-2">
                                <Label className="font-semibold text-sm">If a booking is added for a past date, should it be charged upon addition?</Label>
                                <p className="text-sm text-muted-foreground">If you select &quot;Yes&quot; the system will immediately charge the customer when a booking is added for a past date.</p>
                                <RadioGroup value={paymentChargePastDate} onValueChange={(v) => setPaymentChargePastDate(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                                  <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="yes" id="pay-past-yes" /><span className="text-sm">Yes</span></label>
                                  <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="no" id="pay-past-no" /><span className="text-sm">No</span></label>
                                </RadioGroup>
                              </div>
                              <div className="space-y-2">
                                <Label className="font-semibold text-sm">If a booking moves to job history upon rescheduling, should it be charged?</Label>
                                <p className="text-sm text-muted-foreground">If you select &quot;Yes&quot; the system will immediately charge the customer when a booking is moved to job history after rescheduling.</p>
                                <RadioGroup value={paymentChargeOnRescheduleHistory} onValueChange={(v) => setPaymentChargeOnRescheduleHistory(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                                  <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="yes" id="pay-resched-yes" /><span className="text-sm">Yes</span></label>
                                  <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="no" id="pay-resched-no" /><span className="text-sm">No</span></label>
                                </RadioGroup>
                              </div>
                              <div className="space-y-2">
                                <Label className="font-semibold text-sm">Which services does this apply to?</Label>
                                <p className="text-sm text-muted-foreground">This allows you to choose which of the services you want the automatic charging to be applied to.</p>
                                {paymentServiceCategoriesLoading ? (
                                  <div className="flex items-center gap-2 py-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Loading…</span></div>
                                ) : paymentServiceCategories.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-2">No service categories added yet.</p>
                                ) : (() => {
                                  const byIndustry = paymentIndustriesList.length > 0
                                    ? paymentIndustriesList.map((ind) => ({
                                        industry: ind,
                                        categories: paymentServiceCategories.filter((c) => c.industry_id === ind.id),
                                      })).filter((g) => g.categories.length > 0)
                                    : [];
                                  const uncategorized = paymentServiceCategories.filter((c) => !c.industry_id || !paymentIndustriesList.some((i) => i.id === c.industry_id));
                                  if (byIndustry.length > 0 || uncategorized.length > 0) {
                                    return (
                                      <div className="space-y-4 pt-2">
                                        {byIndustry.map(({ industry, categories }) => (
                                          <div key={industry.id}>
                                            <p className="font-medium text-sm mb-2">{industry.name}</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                              {categories.map((cat) => (
                                                <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                                  <Checkbox
                                                    checked={paymentApplyToServices[cat.id] ?? false}
                                                    onCheckedChange={(c) => setPaymentApplyToServices((prev) => ({ ...prev, [cat.id]: !!c }))}
                                                  />
                                                  <span className="text-sm">{cat.name}</span>
                                                </label>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                        {uncategorized.length > 0 && (
                                          <div>
                                            <p className="font-medium text-sm mb-2">Other</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                              {uncategorized.map((cat) => (
                                                <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                                  <Checkbox
                                                    checked={paymentApplyToServices[cat.id] ?? false}
                                                    onCheckedChange={(c) => setPaymentApplyToServices((prev) => ({ ...prev, [cat.id]: !!c }))}
                                                  />
                                                  <span className="text-sm">{cat.name}</span>
                                                </label>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                                      {paymentServiceCategories.map((cat) => (
                                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                          <Checkbox
                                            checked={paymentApplyToServices[cat.id] ?? false}
                                            onCheckedChange={(c) => setPaymentApplyToServices((prev) => ({ ...prev, [cat.id]: !!c }))}
                                          />
                                          <span className="text-sm">{cat.name}</span>
                                        </label>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="space-y-2">
                                <Label className="font-semibold text-sm">Which payment methods does this apply to?</Label>
                                <p className="text-sm text-muted-foreground">You can choose whether or not you want the automatic charging to be applied to cash/check payments, credit/debit payments or both.</p>
                                <div className="flex flex-wrap gap-4 pt-1">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox checked={paymentApplyToCredit} onCheckedChange={(c) => setPaymentApplyToCredit(!!c)} />
                                    <span className="text-sm">Credit/Debit card</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox checked={paymentApplyToCash} onCheckedChange={(c) => setPaymentApplyToCash(!!c)} />
                                    <span className="text-sm">Cash/Check</span>
                                  </label>
                                </div>
                              </div>
                          </div>
                          )}
                          <Separator />
                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">When a booking is pre-charged with a card, then updated to cash/check, should we refund the charge?</Label>
                            <RadioGroup value={paymentRefundWhenUpdatedToCash} onValueChange={(v) => setPaymentRefundWhenUpdatedToCash(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="yes" id="pay-refund-cash-yes" /><span className="text-sm">Yes</span></label>
                              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="no" id="pay-refund-cash-no" /><span className="text-sm">No</span></label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">Should the system refund any additional amount charged if the booking was pre-charged and later the total amount was decreased, provided that there are no existing refund logs? (Refunds will be processed upon booking completion.)</Label>
                            <p className="text-sm text-muted-foreground">If a customer edits a booking and the edits decrease the amount of the appointment, we can either refund the difference automatically or not.</p>
                            <RadioGroup value={paymentRefundWhenDecreasedNoLogs} onValueChange={(v) => setPaymentRefundWhenDecreasedNoLogs(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="yes" id="pay-refund-no-logs-yes" /><span className="text-sm">Yes</span></label>
                              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="no" id="pay-refund-no-logs-no" /><span className="text-sm">No</span></label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">Should the system refund any extra charges if the booking was pre-charged and the total amount was subsequently reduced, given that there are existing refund records? (Refunds will be processed upon booking completion.)</Label>
                            <RadioGroup value={paymentRefundWhenDecreasedWithLogs} onValueChange={(v) => setPaymentRefundWhenDecreasedWithLogs(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="yes" id="pay-refund-with-logs-yes" /><span className="text-sm">Yes, refund the additional amount.</span></label>
                              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="no" id="pay-refund-with-logs-no" /><span className="text-sm">No, do not refund the additional amount.</span></label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">If there have been refunds on the booking and the total amount changes, how would you like the system to handle any additional charges or refunds?</Label>
                            <RadioGroup value={paymentRefundHandling} onValueChange={(v) => setPaymentRefundHandling(v as 'consider' | 'do_not_consider')} className="flex flex-col gap-2 pt-1">
                              <label className="flex flex-col gap-1 cursor-pointer">
                                <span className="flex items-center gap-2">
                                  <RadioGroupItem value="consider" id="pay-refund-consider" />
                                  <span className="text-sm font-medium">Consider Refund</span>
                                </span>
                                <span className="text-sm text-muted-foreground pl-6">If you choose this option, the system will consider both the amount charged initially and any refunds issued, ensuring accurate adjustments to the booking total.</span>
                              </label>
                              <label className="flex flex-col gap-1 cursor-pointer">
                                <span className="flex items-center gap-2">
                                  <RadioGroupItem value="do_not_consider" id="pay-refund-do-not" />
                                  <span className="text-sm font-medium">Do Not Consider Refund</span>
                                </span>
                                <span className="text-sm text-muted-foreground pl-6">By selecting this option, the system will base adjustments solely on the initial charged amount, without considering any refunds issued previously.</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">What should happen when charge is declined while pre payment of booking?</Label>
                            <RadioGroup value={paymentDeclinedPrePayment} onValueChange={(v) => setPaymentDeclinedPrePayment(v as 'leave' | 'cancel_24h')} className="flex flex-col gap-2 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="leave" id="pay-declined-leave" />
                                <span className="text-sm">Add booking & notify admin & leave the booking as it is.</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="cancel_24h" id="pay-declined-cancel" />
                                <span className="text-sm">Add booking, notify admin & cancel before 24 hours if not yet updated.</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">Do you want to send individual charge notifications to the customer with the bulk charge or invoice charge?</Label>
                            <p className="text-sm text-muted-foreground">Suppose B1, B2 and B3 are bookings or invoice bookings that are $100 each and when a full charge is performed, then a single charge notification is sent to the customer in the total amount of $300. If this setting is set to &quot;Yes&quot;, then individual charge notifications for each $100 booking will be sent to the customer along with the single $300 charge notification.</p>
                            <RadioGroup value={paymentIndividualChargeNotifications} onValueChange={(v) => setPaymentIndividualChargeNotifications(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="yes" id="pay-indiv-yes" /><span className="text-sm">Yes</span></label>
                              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="no" id="pay-indiv-no" /><span className="text-sm">No</span></label>
                            </RadioGroup>
                          </div>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Put Credit Card on Hold</h4>
                      <p className="text-sm text-muted-foreground">
                        Here you can find your settings for placing holds on payments for credit cards. If you allow your customers to book with credit cards and you are worried about payments failing then you can enable the card hold settings and make sure the payment is secured before the booking takes place.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setCardHoldExpanded((v) => !v)}
                      aria-expanded={cardHoldExpanded}
                    >
                      {cardHoldExpanded ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </Button>
                  </div>
                  {cardHoldExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-6">
                      <TooltipProvider>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                Would you like to place a hold on the customer&apos;s card payment to ensure funds?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Authorize the card before the booking to reduce payment failures.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cardHoldPlaceHold} onValueChange={(v) => setCardHoldPlaceHold(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="card-hold-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="card-hold-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                Which of your payment charging methods would you like this to be enabled for?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Apply card hold to manual, automatic, or both charging methods.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cardHoldChargingMethod} onValueChange={(v) => setCardHoldChargingMethod(v as 'manual' | 'automatic' | 'both')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="manual" id="card-hold-manual" />
                                <span className="text-sm">Manual charging</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="automatic" id="card-hold-automatic" />
                                <span className="text-sm">Automatic charging</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="both" id="card-hold-both-charge" />
                                <span className="text-sm">Both</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                Which of the booking types would you like this enabled for?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Apply card hold to new bookings, reschedules, or both.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cardHoldBookingTypes} onValueChange={(v) => setCardHoldBookingTypes(v as 'new' | 'reschedule' | 'both')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="new" id="card-hold-new" />
                                <span className="text-sm">New booking</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="reschedule" id="card-hold-reschedule" />
                                <span className="text-sm">Reschedule booking</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="both" id="card-hold-both-book" />
                                <span className="text-sm">Both</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                Do you want to allow booking addition when a card hold fails?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  When the hold fails, still allow the booking to be created or require payment first.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cardHoldAllowBookingWhenFail} onValueChange={(v) => setCardHoldAllowBookingWhenFail(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="yes" id="card-hold-allow-yes" />
                                <span className="text-sm">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="no" id="card-hold-allow-no" />
                                <span className="text-sm">No</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                When would you like to place the booking amount on hold?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Set when the authorization hold is placed relative to the booking date.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cardHoldWhen} onValueChange={(v) => setCardHoldWhen(v as 'day_of' | 'days_before')} className="flex flex-col gap-3 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                                <RadioGroupItem value="day_of" id="card-hold-day-of" />
                                <span className="text-sm">The day of booking at:</span>
                                <Select value={cardHoldDayOfTime} onValueChange={setCardHoldDayOfTime}>
                                  <SelectTrigger className="w-28 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {['06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'].map((t) => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                                <RadioGroupItem value="days_before" id="card-hold-days-before" />
                                <Select value={cardHoldDaysBefore} onValueChange={setCardHoldDaysBefore}>
                                  <SelectTrigger className="w-20 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 14 }, (_, i) => String(i + 1)).map((d) => (
                                      <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="text-sm">day(s) before the booking date.</span>
                              </label>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label className="font-semibold text-sm">
                                What would you like to happen if the hold for the booking amount fails?
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  Choose whether to cancel the booking or keep it and get notified when the hold fails.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <RadioGroup value={cardHoldOnFail} onValueChange={(v) => setCardHoldOnFail(v as 'cancel' | 'leave')} className="flex flex-col gap-2 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="cancel" id="card-hold-fail-cancel" />
                                <span className="text-sm">Cancel the booking immediately and notify the customer, provider and myself.</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value="leave" id="card-hold-fail-leave" />
                                <span className="text-sm">Leave the booking and notify me.</span>
                              </label>
                            </RadioGroup>
                          </div>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Invoices Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Here you can find your settings for your invoice options.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setInvoiceSettingsExpanded((v) => !v)}
                      aria-expanded={invoiceSettingsExpanded}
                    >
                      {invoiceSettingsExpanded ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </Button>
                  </div>
                  {invoiceSettingsExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-4">
                      <TooltipProvider>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Label className="font-semibold text-sm">
                              What should happen if you have a card hold with invoiced bookings? Do you prefer to release the card hold and perform a single charge of the invoice or capture the card hold and perform other charges separately?
                            </Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                Release: void the hold and charge the full invoice once. Capture: charge the held amount and add other charges separately.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <RadioGroup
                            value={invoiceCardHoldAction}
                            onValueChange={(v) => setInvoiceCardHoldAction(v as 'release' | 'capture')}
                            className="flex gap-4 pt-1"
                          >
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="release" id="invoice-hold-release" />
                              <span className="text-sm">Release</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="capture" id="invoice-hold-capture" />
                              <span className="text-sm">Capture</span>
                            </label>
                          </RadioGroup>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Time Zone Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Here you can choose whether or not you want to enable multiple time zones.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setTimeZoneSettingsExpanded((v) => !v)}
                      aria-expanded={timeZoneSettingsExpanded}
                    >
                      {timeZoneSettingsExpanded ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </Button>
                  </div>
                  {timeZoneSettingsExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-4">
                      <TooltipProvider>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Label className="font-semibold text-sm">
                              Would you like to activate the multiple time zones feature?
                            </Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                When enabled, you can use different time zones for locations or providers.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <RadioGroup
                            value={timeZoneMultipleEnabled}
                            onValueChange={(v) => setTimeZoneMultipleEnabled(v as 'yes' | 'no')}
                            className="flex gap-4 pt-1"
                          >
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="yes" id="timezone-multi-yes" />
                              <span className="text-sm">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="no" id="timezone-multi-no" />
                              <span className="text-sm">No</span>
                            </label>
                          </RadioGroup>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Chat Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Here you can enable if you would like to have the chat feature between your providers.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setChatSettingsExpanded((v) => !v)}
                      aria-expanded={chatSettingsExpanded}
                    >
                      {chatSettingsExpanded ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </Button>
                  </div>
                  {chatSettingsExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-4">
                      <TooltipProvider>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Label className="font-semibold text-sm">
                              Do you want to activate the chat feature?
                            </Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                Enable in-app chat between providers for coordination and messaging.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <RadioGroup
                            value={chatFeatureEnabled}
                            onValueChange={(v) => setChatFeatureEnabled(v as 'yes' | 'no')}
                            className="flex gap-4 pt-1"
                          >
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="yes" id="chat-feature-yes" />
                              <span className="text-sm">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="no" id="chat-feature-no" />
                              <span className="text-sm">No</span>
                            </label>
                          </RadioGroup>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Multispot Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Manage multiple spots or locations. Set availability, capacity, and rules per spot for your bookings.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => setMultispotSettingsExpanded((v) => !v)}
                      aria-expanded={multispotSettingsExpanded}
                    >
                      {multispotSettingsExpanded ? (
                        <Minus className="h-5 w-5" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  {multispotSettingsExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-4">
                      <TooltipProvider>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Label className="font-semibold text-sm">
                              Would you like to activate the multiple appointments per booking spot feature?
                            </Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                When enabled, customers can book multiple appointments in the same spot (e.g. multiple services or time slots per booking).
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <RadioGroup
                            value={multispotMultiplePerSpot}
                            onValueChange={(v) => setMultispotMultiplePerSpot(v as 'yes' | 'no')}
                            className="flex gap-4 pt-1"
                          >
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="yes" id="multispot-yes" />
                              <span className="text-sm">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="no" id="multispot-no" />
                              <span className="text-sm">No</span>
                            </label>
                          </RadioGroup>
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">Access Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Control who can access your booking system: staff roles, customer portal access, and visibility of services or locations.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => {
                        setAccessSettingsExpanded((v) => !v);
                        if (!accessSettingsExpanded) fetchAccessSettings();
                      }}
                      aria-expanded={accessSettingsExpanded}
                    >
                      {accessSettingsExpanded ? (
                        <Minus className="h-5 w-5" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  {accessSettingsExpanded && (
                    <div className="border-t bg-muted/30 px-6 py-6 space-y-6">
                      {accessSettingsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label className="font-semibold">
                              The message that is shown when a customer tries to log in or book but their account is blocked or deactivated.
                            </Label>
                            <Textarea
                              placeholder="We apologize for the inconvenience. Please contact our office if you have any questions."
                              value={customerBlockedMessage}
                              onChange={(e) => setCustomerBlockedMessage(e.target.value)}
                              rows={4}
                              className="resize-y min-h-[80px]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold">
                              The message that is shown when a provider tries to log in but they have been deactivated out of the system.
                            </Label>
                            <Textarea
                              placeholder="We apologize for the inconvenience. Please contact our office if you have any questions."
                              value={providerDeactivatedMessage}
                              onChange={(e) => setProviderDeactivatedMessage(e.target.value)}
                              rows={4}
                              className="resize-y min-h-[80px]"
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button onClick={saveAccessSettings} disabled={accessSettingsSaving}>
                              {accessSettingsSaving ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving…
                                </>
                              ) : (
                                'Save access settings'
                              )}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="customer" className="mt-0">
                <p className="text-sm text-muted-foreground">
                  Customer settings – Currently under development.
                </p>
              </TabsContent>
              <TabsContent value="provider" className="mt-0">
                {schedulingLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-0 rounded-lg bg-card border shadow-sm">
                    <p className="text-sm text-muted-foreground px-6 pt-6 pb-2">
                      Store-wide provider settings. Per-provider options (e.g. show unassigned, can set schedule) are in each provider&apos;s profile under Providers → [provider] → Settings → General.
                    </p>
                    <div className="border-t divide-y">
                      <Collapsible defaultOpen className="group">
                        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-semibold">Bookings</p>
                            <p className="text-sm text-muted-foreground mt-0.5">Set whether customers or admin can choose a specific provider when creating or booking.</p>
                          </div>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                            <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                            <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-6 pb-4 pt-0 space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold">Let customers choose a specific provider</Label>
                                <p className="text-sm text-muted-foreground mt-0.5">When booking online, customers can pick a provider (if off, assignment is automatic or admin-only).</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.specific_provider_for_customers ?? false}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, specific_provider_for_customers: v }))}
                              />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold">Let admin choose a specific provider when creating a booking</Label>
                                <p className="text-sm text-muted-foreground mt-0.5">When adding a booking from the admin side, you can assign a provider (recommended on).</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.specific_provider_for_admin ?? true}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, specific_provider_for_admin: v }))}
                              />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible defaultOpen className="group">
                        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-semibold">Scheduling</p>
                            <p className="text-sm text-muted-foreground mt-0.5">Control if providers can see unassigned jobs, edit their schedules, and get notifications.</p>
                          </div>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                            <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                            <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-6 pb-4 pt-0 space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold">Allow providers to see unassigned jobs</Label>
                                <p className="text-sm text-muted-foreground mt-0.5">Providers can see and grab jobs from the Unassigned folder in the portal (if also enabled per provider).</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.providers_can_see_unassigned}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, providers_can_see_unassigned: v }))}
                              />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold">Show all unassigned jobs to every provider</Label>
                                <p className="text-sm text-muted-foreground mt-0.5">When on, all providers see every unassigned job; when off, filter by location/industry.</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.providers_can_see_all_unassigned}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, providers_can_see_all_unassigned: v }))}
                              />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold flex items-center gap-2">
                                  <Bell className="h-4 w-4" />
                                  Notify providers when a new job is unassigned
                                </Label>
                                <p className="text-sm text-muted-foreground mt-0.5">Send email/notification when a booking enters the unassigned folder.</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.notify_providers_on_unassigned}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, notify_providers_on_unassigned: v }))}
                              />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible className="group">
                        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-semibold">GPS & Time Logs</p>
                            <p className="text-sm text-muted-foreground mt-0.5">Control clock in/out, tracking, automatic clock out, booking completion, and related options.</p>
                          </div>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                            <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                            <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-6 pb-4 pt-0 space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold">Activate clock in / clock out</Label>
                                <p className="text-sm text-muted-foreground mt-0.5">Allow providers to clock in and out on jobs in the portal.</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.clock_in_out_enabled}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, clock_in_out_enabled: v }))}
                              />
                            </div>
                            <div className="rounded-lg border p-4 space-y-2">
                              <Label className="font-semibold">What to track</Label>
                              <p className="text-sm text-muted-foreground">Only time stamps = no location tracking. Time stamps + path = GPS path (some regions restrict tracking).</p>
                              <RadioGroup
                                value={schedulingOptions.time_tracking_mode ?? "timestamps_only"}
                                onValueChange={(v) => setSchedulingOptions((o) => ({ ...o, time_tracking_mode: v as "timestamps_only" | "timestamps_and_gps" }))}
                                className="flex gap-4 pt-2"
                              >
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <RadioGroupItem value="timestamps_only" />
                                  <span>Only track time stamps</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <RadioGroupItem value="timestamps_and_gps" />
                                  <span>Time stamps and path (GPS)</span>
                                </label>
                              </RadioGroup>
                            </div>
                            <div className="rounded-lg border p-4 space-y-2">
                              <Label className="font-semibold">Distance unit</Label>
                              <Select
                                value={schedulingOptions.distance_unit ?? "miles"}
                                onValueChange={(v) => setSchedulingOptions((o) => ({ ...o, distance_unit: v as "miles" | "kilometers" }))}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="miles">Miles</SelectItem>
                                  <SelectItem value="kilometers">Kilometers</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold">Disable auto clock-in for a booking</Label>
                                <p className="text-sm text-muted-foreground mt-0.5">When on, providers must clock in manually (no auto clock-in).</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.disable_auto_clock_in ?? false}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, disable_auto_clock_in: v }))}
                              />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold">Enable automatic clock-out</Label>
                                <p className="text-sm text-muted-foreground mt-0.5">Auto clock out the provider when they leave the booking location (by distance).</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.auto_clock_out_enabled ?? false}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, auto_clock_out_enabled: v }))}
                              />
                            </div>
                            {(schedulingOptions.auto_clock_out_enabled ?? false) && (
                              <div className="rounded-lg border p-4 space-y-2">
                                <Label className="font-semibold">Auto clock-out distance (meters)</Label>
                                <Input
                                  type="number"
                                  min={100}
                                  max={10000}
                                  value={schedulingOptions.auto_clock_out_distance_meters ?? 500}
                                  onChange={(e) => setSchedulingOptions((o) => ({ ...o, auto_clock_out_distance_meters: Math.max(100, Math.min(10000, parseInt(e.target.value, 10) || 500)) }))}
                                />
                                <p className="text-xs text-muted-foreground">Distance from booking location at which the provider is auto clocked out.</p>
                              </div>
                            )}
                            <div className="rounded-lg border p-4 space-y-2">
                              <Label className="font-semibold">Mark booking complete</Label>
                              <p className="text-sm text-muted-foreground">When should the booking be marked completed?</p>
                              <RadioGroup
                                value={schedulingOptions.completion_on_clock_out ? "clock_out" : "job_length"}
                                onValueChange={(v) => setSchedulingOptions((o) => ({ ...o, completion_on_clock_out: v === "clock_out" }))}
                                className="flex gap-4 pt-2"
                              >
                                <label className="flex items-start gap-2 cursor-pointer">
                                  <RadioGroupItem value="job_length" className="mt-0.5" />
                                  <span>
                                    <span className="font-medium">On job length complete</span>
                                    <span className="block text-xs text-muted-foreground mt-0.5">
                                      Booking stays in progress when the provider clocks out. It is marked completed when the scheduled job length has passed (start time + duration), via the auto-complete cron, or when someone marks it completed manually.
                                    </span>
                                  </span>
                                </label>
                                <label className="flex items-start gap-2 cursor-pointer">
                                  <RadioGroupItem value="clock_out" className="mt-0.5" />
                                  <span>
                                    <span className="font-medium">On clock out</span>
                                    <span className="block text-xs text-muted-foreground mt-0.5">
                                      Booking is marked completed as soon as the provider clocks out.
                                    </span>
                                  </span>
                                </label>
                              </RadioGroup>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold">Allow providers to re-clock in on a booking</Label>
                                <p className="text-sm text-muted-foreground mt-0.5">After clocking out, allow them to clock in again on the same booking.</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.allow_reclock_in ?? false}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, allow_reclock_in: v }))}
                              />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold">Time log adjustments update the booking</Label>
                                <p className="text-sm text-muted-foreground mt-0.5">When time is adjusted in time logs, update the booking as well.</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.time_log_updates_booking ?? false}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, time_log_updates_booking: v }))}
                              />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible className="group">
                        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-semibold">Send Schedule Automatically</p>
                            <p className="text-sm text-muted-foreground mt-0.5">Make sure you enable the &quot;Send Schedule&quot; email template before sending schedule automatically, otherwise the schedule will not be sent to providers.</p>
                          </div>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                            <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                            <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-6 pb-4 pt-0">
                            <p className="text-sm text-muted-foreground">Automated schedule emails – coming soon. Configure email templates under Settings → Notifications.</p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible className="group">
                        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-semibold">Sign up</p>
                            <p className="text-sm text-muted-foreground mt-0.5">Set up the provider signup feature and manage related settings.</p>
                          </div>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                            <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                            <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-6 pb-4 pt-0">
                            <p className="text-sm text-muted-foreground">Provider self-signup – coming soon. For now, add providers from Admin → Providers → invite or add.</p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible defaultOpen className="group">
                        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-semibold">Provider options (customer visibility)</p>
                            <p className="text-sm text-muted-foreground mt-0.5">Control what customers see about providers when choosing one on the booking form.</p>
                          </div>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                            <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                            <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-6 pb-4 pt-0 space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold">Show provider score/rating to customers</Label>
                                <p className="text-sm text-muted-foreground mt-0.5">Display the provider&apos;s rating (or score) when customers pick a provider.</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.show_provider_score_to_customers ?? true}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, show_provider_score_to_customers: v }))}
                              />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold">Show provider completed jobs to customers</Label>
                                <p className="text-sm text-muted-foreground mt-0.5">Display how many jobs the provider has completed.</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.show_provider_completed_jobs_to_customers ?? true}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, show_provider_completed_jobs_to_customers: v }))}
                              />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <Label className="font-semibold">Show provider availability status to customers</Label>
                                <p className="text-sm text-muted-foreground mt-0.5">Show whether the provider is available (e.g. green indicator) when choosing.</p>
                              </div>
                              <Switch
                                checked={schedulingOptions.show_provider_availability_to_customers ?? true}
                                onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, show_provider_availability_to_customers: v }))}
                              />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                    <div className="flex justify-end p-6 border-t">
                      <Button onClick={handleSaveScheduling} disabled={schedulingSaving}>
                        {schedulingSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          'Save provider settings'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="admin" className="mt-0 space-y-6">
                <p className="text-sm text-muted-foreground">
                  In this section you can set up the minimum amount a gift card can be purchased for as well as the default referral amount a customer will get if they successfully refer a new customer to your business.
                </p>

                {/* Gift card */}
                <div className="rounded-lg border bg-card p-6 space-y-6">
                  <h4 className="text-lg font-semibold">Gift card</h4>
                  <TooltipProvider>
                    <div className="space-y-6 max-w-xl">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="font-semibold">Minimum gift card amount</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              The minimum value a customer can purchase when buying a gift card.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center rounded-md border bg-background">
                          <span className="pl-3 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            value={giftCardMinAmount}
                            onChange={(e) => setGiftCardMinAmount(e.target.value)}
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="font-semibold">Are you able to edit a gift card to have a total less than its minimum requirement?</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              When enabled, admins can reduce a gift card balance below the minimum purchase amount.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <RadioGroup value={giftCardEditBelowMin} onValueChange={(v) => setGiftCardEditBelowMin(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="yes" id="gift-edit-below-yes" />
                            <span className="text-sm">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="no" id="gift-edit-below-no" />
                            <span className="text-sm">No</span>
                          </label>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="font-semibold">Enable the maximum gift card amount limit?</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              When enabled, customers cannot purchase gift cards above the maximum amount.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <RadioGroup value={giftCardMaxLimitEnabled} onValueChange={(v) => setGiftCardMaxLimitEnabled(v as 'yes' | 'no')} className="flex gap-4 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="yes" id="gift-max-enable-yes" />
                            <span className="text-sm">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="no" id="gift-max-enable-no" />
                            <span className="text-sm">No</span>
                          </label>
                        </RadioGroup>
                      </div>
                      {giftCardMaxLimitEnabled === 'yes' && (
                        <div className="space-y-2">
                          <Label className="font-semibold">Maximum gift card amount</Label>
                          <div className="flex items-center rounded-md border bg-background">
                            <span className="pl-3 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Amount"
                              value={giftCardMaxAmount}
                              onChange={(e) => setGiftCardMaxAmount(e.target.value)}
                              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipProvider>
                </div>

                {/* Referral */}
                <div className="rounded-lg border bg-card p-6 space-y-6">
                  <h4 className="text-lg font-semibold">Referral</h4>
                  <TooltipProvider>
                    <div className="space-y-6 max-w-xl">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="font-semibold">Amount of credits given to the person being referred</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              Credit amount the new customer receives when referred.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center rounded-md border bg-background">
                          <span className="pl-3 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            value={referralCreditsReferred}
                            onChange={(e) => setReferralCreditsReferred(e.target.value)}
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="font-semibold">Amount of credits given to the person referring someone</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              Credit amount the referrer receives when their referral signs up.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center rounded-md border bg-background">
                          <span className="pl-3 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            value={referralCreditsReferrer}
                            onChange={(e) => setReferralCreditsReferrer(e.target.value)}
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none"
                          />
                        </div>
                      </div>
                    </div>
                  </TooltipProvider>
                </div>

                {/* Payment descriptions */}
                <div className="rounded-lg border bg-card p-6 space-y-6">
                  <h4 className="text-lg font-semibold">Payment descriptions</h4>
                  <Alert className="rounded-md border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-red-800 dark:text-red-200">
                    <AlertDescription>
                      Please Note: Payment gateways do not allow description updates. As a result, a card-hold description will become permanent upon successfully charging the customer. If a card is not &quot;on hold&quot; prior to charging, the charge booking description will be used instead of the card hold description.
                    </AlertDescription>
                  </Alert>
                  <TooltipProvider>
                    <div className="space-y-6 max-w-2xl">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="font-semibold">Card hold description</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              Description shown on the customer&apos;s statement for the card hold.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Textarea
                          placeholder="Card hold for premierprocleaner by OrbytBooking -"
                          value={cardHoldDescription}
                          onChange={(e) => setCardHoldDescription(e.target.value)}
                          className="min-h-[80px] resize-y"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="font-semibold">Charge booking description</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              Description used when charging if no card hold was placed.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Textarea
                          placeholder="Amount charged by OrbytBooking."
                          value={chargeBookingDescription}
                          onChange={(e) => setChargeBookingDescription(e.target.value)}
                          className="min-h-[80px] resize-y"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="font-semibold">Separate charge description</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              Description shown for separate/additional charges.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Textarea
                          placeholder="Separate charges by Premier Pro Cleaners."
                          value={separateChargeDescription}
                          onChange={(e) => setSeparateChargeDescription(e.target.value)}
                          className="min-h-[80px] resize-y"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="font-semibold">Charge invoice description</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground shrink-0">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              Description shown on the invoice charge.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Textarea
                          placeholder="Invoice Amount charged by Premier Pro Cleaners."
                          value={chargeInvoiceDescription}
                          onChange={(e) => setChargeInvoiceDescription(e.target.value)}
                          className="min-h-[80px] resize-y"
                        />
                      </div>
                    </div>
                  </TooltipProvider>
                </div>

                <Button
                  onClick={async () => {
                    setAdminSettingsSaving(true);
                    try {
                      // TODO: wire to API when backend is ready
                      await new Promise((r) => setTimeout(r, 400));
                      toast.success('Admin settings saved.');
                    } catch {
                      toast.error('Failed to save admin settings.');
                    } finally {
                      setAdminSettingsSaving(false);
                    }
                  }}
                  disabled={adminSettingsSaving}
                >
                  {adminSettingsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
              </TabsContent>
              <TabsContent value="scheduling" className="mt-0">
                {schedulingLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-0 rounded-lg bg-card p-6 border shadow-sm">
                    <h2 className="text-xl font-semibold mb-1">Scheduling</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      In this section you can decide whether you want the spots based on provider availability or not. You can also set up if you want to choose providers manually or the system should pick a provider automatically from available providers and should assign it automatically or it should be based on accept/decline.
                    </p>

                    <div className="border rounded-lg divide-y bg-background/80">
                    <Collapsible defaultOpen className="group">
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-semibold">Availability & Assignment</p>
                          <p className="text-sm text-muted-foreground mt-0.5">Control whether slots depend on provider availability and how providers are chosen</p>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                          <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                          <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0 space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Spots based on provider availability</Label>
                            <p className="text-sm text-muted-foreground">Only show times where at least one provider is free</p>
                          </div>
                          <Switch
                            checked={schedulingOptions.spots_based_on_provider_availability ?? true}
                            onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, spots_based_on_provider_availability: v }))}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Provider assignment</Label>
                          <div className="grid gap-3">
                            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                              <input
                                type="radio"
                                name="provider_assignment_mode"
                                checked={(schedulingOptions.provider_assignment_mode ?? "automatic") === "automatic"}
                                onChange={() => setSchedulingOptions((o) => ({ ...o, provider_assignment_mode: "automatic" }))}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-medium">Automatic</p>
                                <p className="text-sm text-muted-foreground">
                                  System picks or invites providers when date/time is selected. Customer gets confirmation per scheduling type below.
                                </p>
                              </div>
                            </label>
                            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                              <input
                                type="radio"
                                name="provider_assignment_mode"
                                checked={(schedulingOptions.provider_assignment_mode ?? "automatic") === "manual"}
                                onChange={() => setSchedulingOptions((o) => ({ ...o, provider_assignment_mode: "manual" }))}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-medium">Manual</p>
                                <p className="text-sm text-muted-foreground">
                                  All bookings go to unassigned. Admin or providers assign manually or grab jobs.
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                    </Collapsible>

                    <Collapsible className="group">
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-semibold">Provider Assignment (when automatic)</p>
                          <p className="text-sm text-muted-foreground mt-0.5">Choose how automatic assignment works when customers book online</p>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                          <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                          <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0 space-y-6">
                        {(schedulingOptions.provider_assignment_mode ?? "automatic") === "automatic" && (
                        <>
                        <div className="space-y-3">
                          <Label>Scheduling type</Label>
                          <div className="grid gap-3">
                            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                              <input
                                type="radio"
                                name="scheduling_type"
                                checked={schedulingOptions.scheduling_type === "accepted_automatically"}
                                onChange={() => setSchedulingOptions((o) => ({ ...o, scheduling_type: "accepted_automatically" }))}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-medium">Accepted Automatically</p>
                                <p className="text-sm text-muted-foreground">
                                  Bookings are auto-assigned by availability and priority. Customer gets confirmation immediately.
                                </p>
                              </div>
                            </label>
                            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                              <input
                                type="radio"
                                name="scheduling_type"
                                checked={schedulingOptions.scheduling_type === "accept_or_decline"}
                                onChange={() => setSchedulingOptions((o) => ({ ...o, scheduling_type: "accept_or_decline" }))}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-medium">Accept or Decline</p>
                                <p className="text-sm text-muted-foreground">
                                  Invitations go to providers in priority order. Customer only gets confirmation after a provider accepts.
                                </p>
                              </div>
                            </label>
                            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                              <input
                                type="radio"
                                name="scheduling_type"
                                checked={schedulingOptions.scheduling_type === "accepts_same_day_only"}
                                onChange={() => setSchedulingOptions((o) => ({ ...o, scheduling_type: "accepts_same_day_only" }))}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-medium">Accepts Same Day Only</p>
                                <p className="text-sm text-muted-foreground">
                                  Future bookings auto-assign; same-day bookings require provider acceptance.
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>

                        {(schedulingOptions.scheduling_type === "accept_or_decline" ||
                          schedulingOptions.scheduling_type === "accepts_same_day_only") && (
                          <div className="space-y-2">
                            <Label>Provider response timeout (minutes)</Label>
                            <Input
                              type="number"
                              min={5}
                              max={1440}
                              value={schedulingOptions.accept_decline_timeout_minutes}
                              onChange={(e) =>
                                setSchedulingOptions((o) => ({
                                  ...o,
                                  accept_decline_timeout_minutes: Math.max(5, Math.min(1440, parseInt(e.target.value, 10) || 60)),
                                }))
                              }
                            />
                            <p className="text-sm text-muted-foreground">
                              How long each provider has to accept before the next one is invited
                            </p>
                          </div>
                        )}
                        </>
                        )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible className="group">
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-semibold">Unassigned Folder</p>
                          <p className="text-sm text-muted-foreground mt-0.5">Settings for bookings without a provider</p>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                          <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                          <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0 space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Allow providers to see unassigned jobs</Label>
                            <p className="text-sm text-muted-foreground">Providers can grab jobs from the unassigned folder</p>
                          </div>
                          <Switch
                            checked={schedulingOptions.providers_can_see_unassigned}
                            onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, providers_can_see_unassigned: v }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Show all unassigned jobs to providers</Label>
                            <p className="text-sm text-muted-foreground">Override provider filters (locations, industries) for unassigned</p>
                          </div>
                          <Switch
                            checked={schedulingOptions.providers_can_see_all_unassigned}
                            onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, providers_can_see_all_unassigned: v }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="flex items-center gap-2">
                              <Bell className="h-4 w-4" />
                              Notify providers when new unassigned job
                            </Label>
                            <p className="text-sm text-muted-foreground">Send notification when a booking enters the unassigned folder</p>
                          </div>
                          <Switch
                            checked={schedulingOptions.notify_providers_on_unassigned}
                            onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, notify_providers_on_unassigned: v }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Waitlist for customers</Label>
                            <p className="text-sm text-muted-foreground">Let customers request times when no slots are available</p>
                          </div>
                          <Switch
                            checked={schedulingOptions.waitlist_enabled}
                            onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, waitlist_enabled: v }))}
                          />
                        </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible className="group" onOpenChange={(open) => open && (fetchRecentAutoAssignments(), fetchEligibilityPreview())}>
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-semibold">Provider eligibility (auto-assign scores)</p>
                          <p className="text-sm text-muted-foreground mt-0.5">Preview who would be assigned and see recent auto-assignment scores</p>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                          <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                          <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0 space-y-6">
                          <Alert>
                            <AlertDescription>
                              <strong>How providers get a higher score or get chosen first</strong>
                              <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
                                <li><strong>Priority</strong> (set per provider): Go to Admin → Providers → open a provider → set &quot;Auto-assign priority&quot; (0–99). Higher number = chosen first. This is the main order (like BookingKoala).</li>
                                <li><strong>Service match</strong>: +30 points when the booking has a service and the provider offers that service (link services to the provider so they get this).</li>
                                <li><strong>Workload</strong>: +0 to +20 points for lower current workload (from provider capacity). Less busy = more points.</li>
                                <li>Providers with &quot;Accept auto-assignments&quot; turned off are excluded. Ensure they are opted in if they should receive auto-assigns.</li>
                              </ul>
                            </AlertDescription>
                          </Alert>
                          <div>
                            <p className="text-sm font-medium mb-2">Recent auto-assignments</p>
                            {recentAssignmentsLoading ? (
                              <p className="text-sm text-muted-foreground">Loading…</p>
                            ) : recentAssignments.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No recent auto-assignments.</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Assigned</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {recentAssignments.map((a) => (
                                    <TableRow key={a.id}>
                                      <TableCell>{a.providerName}</TableCell>
                                      <TableCell>{a.service}</TableCell>
                                      <TableCell>{a.score}</TableCell>
                                      <TableCell className="text-muted-foreground text-sm">{a.assignedAt ? new Date(a.assignedAt).toLocaleString() : '—'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                          <Separator />
                          <div>
                            <p className="text-sm font-medium mb-2">Preview eligibility (for a date)</p>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <Input
                                type="date"
                                value={previewDate}
                                onChange={(e) => setPreviewDate(e.target.value)}
                                className="w-40"
                              />
                              <Button type="button" variant="secondary" size="sm" onClick={fetchEligibilityPreview} disabled={eligibilityLoading}>
                                {eligibilityLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Preview'}
                              </Button>
                            </div>
                            {eligibilityProviders.length === 0 && !eligibilityLoading ? (
                              <p className="text-sm text-muted-foreground">Click Preview to see provider priority, score, and reasons.</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Eligible</TableHead>
                                    <TableHead>Reasons</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {eligibilityProviders.map((p) => (
                                    <TableRow key={p.id}>
                                      <TableCell>{p.name}</TableCell>
                                      <TableCell>{p.invitation_priority}</TableCell>
                                      <TableCell>{p.score}</TableCell>
                                      <TableCell>{p.eligible ? 'Yes' : 'No'}</TableCell>
                                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={p.reasons.join(', ')}>{p.reasons.join(', ') || '—'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible className="group">
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-semibold">Recurring Bookings</p>
                          <p className="text-sm text-muted-foreground mt-0.5">Options to select how many recurring booking(s) you want to block into the future</p>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                          <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                          <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0 space-y-6">
                        <div className="space-y-3">
                          <Label>Default recurring update behavior</Label>
                          <p className="text-sm text-muted-foreground">When editing a recurring booking, which option to pre-select</p>
                          <div className="grid gap-2">
                            <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                              <input
                                type="radio"
                                name="recurring_update_default"
                                checked={(schedulingOptions.recurring_update_default ?? "all_future") === "all_future"}
                                onChange={() => setSchedulingOptions((o) => ({ ...o, recurring_update_default: "all_future" }))}
                                className="mt-1"
                              />
                              <span className="text-sm">For all future appointments</span>
                            </label>
                            <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                              <input
                                type="radio"
                                name="recurring_update_default"
                                checked={(schedulingOptions.recurring_update_default ?? "all_future") === "this_booking_only"}
                                onChange={() => setSchedulingOptions((o) => ({ ...o, recurring_update_default: "this_booking_only" }))}
                                className="mt-1"
                              />
                              <span className="text-sm">This booking only</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Same provider for recurring (cron)</Label>
                            <p className="text-sm text-muted-foreground">When cron creates the next recurring booking, reuse the same provider</p>
                          </div>
                          <Switch
                            checked={schedulingOptions.same_provider_for_recurring_cron ?? true}
                            onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, same_provider_for_recurring_cron: v }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Enforce spot limits</Label>
                            <p className="text-sm text-muted-foreground">Respect max bookings per day/week from Booking Spots settings</p>
                          </div>
                          <Switch
                            checked={schedulingOptions.spot_limits_enabled ?? false}
                            onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, spot_limits_enabled: v }))}
                          />
                        </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible className="group">
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-semibold">Spots Availability</p>
                          <p className="text-sm text-muted-foreground mt-0.5">Control over how system should check spots availability (holidays, limits)</p>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                          <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                          <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0 space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Skip holidays in recurring</Label>
                            <p className="text-sm text-muted-foreground">For recurring bookings, skip holiday dates and use next available</p>
                          </div>
                          <Switch
                            checked={schedulingOptions.holiday_skip_to_next ?? false}
                            onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, holiday_skip_to_next: v }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Who is blocked from booking on holidays</Label>
                          <div className="grid gap-2">
                            <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                              <input
                                type="radio"
                                name="holiday_blocked_who"
                                checked={(schedulingOptions.holiday_blocked_who ?? "customer") === "customer"}
                                onChange={() => setSchedulingOptions((o) => ({ ...o, holiday_blocked_who: "customer" }))}
                                className="mt-1"
                              />
                              <span className="text-sm">Customer only (admin can still book holidays)</span>
                            </label>
                            <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                              <input
                                type="radio"
                                name="holiday_blocked_who"
                                checked={(schedulingOptions.holiday_blocked_who ?? "customer") === "both"}
                                onChange={() => setSchedulingOptions((o) => ({ ...o, holiday_blocked_who: "both" }))}
                                className="mt-1"
                              />
                              <span className="text-sm">Both admin and customer</span>
                            </label>
                          </div>
                        </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible className="group">
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-semibold">Booking Options</p>
                          <p className="text-sm text-muted-foreground mt-0.5">Manage the options to show on booking forms for customer and admin</p>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                          <Plus className="h-4 w-4 group-data-[state=open]:hidden" />
                          <Minus className="h-4 w-4 hidden group-data-[state=open]:block" />
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0 space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Specific provider for customers</Label>
                            <p className="text-sm text-muted-foreground">Let customers pick a provider on the booking form</p>
                          </div>
                          <Switch
                            checked={schedulingOptions.specific_provider_for_customers ?? false}
                            onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, specific_provider_for_customers: v }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Specific provider for admin/staff</Label>
                            <p className="text-sm text-muted-foreground">Let admin choose a provider when adding bookings</p>
                          </div>
                          <Switch
                            checked={schedulingOptions.specific_provider_for_admin ?? true}
                            onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, specific_provider_for_admin: v }))}
                          />
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <Label>Completion mode</Label>
                          <div className="grid gap-3">
                            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                              <input
                                type="radio"
                                name="booking_completion_mode"
                                checked={schedulingOptions.booking_completion_mode === "manual"}
                                onChange={() => setSchedulingOptions((o) => ({ ...o, booking_completion_mode: "manual" }))}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-medium">Manual</p>
                                <p className="text-sm text-muted-foreground">
                                  Provider or admin must mark the booking as completed (clock out or &quot;Mark as Completed&quot; button).
                                </p>
                              </div>
                            </label>
                            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                              <input
                                type="radio"
                                name="booking_completion_mode"
                                checked={schedulingOptions.booking_completion_mode === "automatic"}
                                onChange={() => setSchedulingOptions((o) => ({ ...o, booking_completion_mode: "automatic" }))}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-medium">Automatic</p>
                                <p className="text-sm text-muted-foreground">
                                  Bookings auto-complete when job length has passed (e.g. 3-hour job at 8am completes at 11:01am). Requires a cron job calling /api/cron/auto-complete-bookings every 5–15 minutes.
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Enable clock in/out</Label>
                            <p className="text-sm text-muted-foreground">Providers can track job time via the provider dashboard</p>
                          </div>
                          <Switch
                            checked={schedulingOptions.clock_in_out_enabled}
                            onCheckedChange={(v) => setSchedulingOptions((o) => ({ ...o, clock_in_out_enabled: v }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max time per provider per booking (minutes)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={1440}
                            placeholder="0 = no limit"
                            value={schedulingOptions.max_minutes_per_provider_per_booking ?? 0}
                            onChange={(e) =>
                              setSchedulingOptions((o) => ({
                                ...o,
                                max_minutes_per_provider_per_booking: Math.max(0, Math.min(1440, parseInt(e.target.value, 10) || 0)),
                              }))
                            }
                          />
                          <p className="text-sm text-muted-foreground">0 means this limit is not used when checking provider availability</p>
                        </div>
                        </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    </div>


                    <Button onClick={handleSaveScheduling} disabled={schedulingSaving} className="mt-6">
                      {schedulingSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save Scheduling Settings
                    </Button>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </TabsContent>
        <TabsContent value="tags" className="pt-6 space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={openAddModal} disabled={!currentBusiness?.id}>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {tagsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tags.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  There are no tags at this time.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Display Order</TableHead>
                      <TableHead className="w-[100px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tags.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell className="font-mono text-muted-foreground">
                          {tag.id}
                        </TableCell>
                        <TableCell>{tag.name}</TableCell>
                        <TableCell>{tag.display_order}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(tag)}
                              title="Edit tag"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTag(tag)}
                              title="Delete tag"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTag ? 'Edit tag' : 'Add new tag'}</DialogTitle>
                <DialogDescription>
                  {editingTag
                    ? 'Update the tag name and display order.'
                    : 'Create a tag to use for customers and providers. Name and display order are required.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="tag-name">Name</Label>
                  <Input
                    id="tag-name"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    placeholder="e.g. VIP, New Customer"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tag-display-order">Display Order</Label>
                  <Input
                    id="tag-display-order"
                    type="number"
                    min={0}
                    value={modalDisplayOrder}
                    onChange={(e) => setModalDisplayOrder(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTag} disabled={saving || !modalName.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : editingTag ? (
                    'Save changes'
                  ) : (
                    'Create tag'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!deleteTag} onOpenChange={(open) => !open && setDeleteTag(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete tag</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{deleteTag?.name}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    confirmDelete();
                  }}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    'Delete'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
        <TabsContent value="undelivered-emails" className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Undelivered emails settings will be implemented here.
          </p>
        </TabsContent>
        <TabsContent value="taxes" className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Taxes settings will be implemented here.
          </p>
        </TabsContent>
        <TabsContent value="email-lists" className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Email lists settings will be implemented here.
          </p>
        </TabsContent>
        <TabsContent value="apps-integrations" className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Apps & Integrations settings will be implemented here.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
