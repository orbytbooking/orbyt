"use client";

import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, Tag, MailX, Plus, Minus, Loader2, Pencil, Trash2, Info } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
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
import { toast } from 'sonner';

interface AdminTag {
  id: string;
  name: string;
  display_order: number;
}

export default function GeneralSettingsPage() {
  const { currentBusiness } = useBusiness();
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="store-options" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span>Store options</span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span>Tags</span>
          </TabsTrigger>
          <TabsTrigger value="undelivered-emails" className="flex items-center gap-2">
            <MailX className="h-4 w-4" />
            <span>Undelivered emails</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="store-options" className="pt-6 space-y-0">
          <Tabs defaultValue="general" className="w-full">
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
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Address Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Here you can find settings for your addresses which will be displayed for bookings and if you would like to show your location name in addition to the customer&apos;s address.
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Calendar Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Configure your calendar display, availability view, business hours, and how appointments appear for you and your customers.
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Rescheduling Fees</h4>
                    <p className="text-sm text-muted-foreground">
                      Set fees or policies when customers reschedule their appointments. Define amounts and when they apply (e.g. within 24 hours).
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Cancellation</h4>
                    <p className="text-sm text-muted-foreground">
                      Manage cancellation rules, deadlines, refund policies, and any cancellation fees for your bookings.
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Quote</h4>
                    <p className="text-sm text-muted-foreground">
                      Configure how quotes are created, sent, and accepted. Set expiry times and quote-specific terms for your services.
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Price & Time Adjustment</h4>
                    <p className="text-sm text-muted-foreground">
                      Adjust default prices and duration for services, add surcharges, or set time-based pricing (peak hours, etc.).
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Payment</h4>
                    <p className="text-sm text-muted-foreground">
                      Set up payment methods, gateways, and when payment is collected (at booking, after service, or deposit).
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Put Credit Card on Hold</h4>
                    <p className="text-sm text-muted-foreground">
                      Configure authorization holds on customer credit cards for no-shows or cancellations. Set hold amounts and release rules.
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Invoices Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Customize invoice templates, numbering, due dates, and when invoices are sent (e.g. after booking or after service).
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Time Zone Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Set your business time zone and how appointment times are shown to customers in different regions.
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Chat Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Enable or configure in-app chat, notifications, and automated messages for customer and staff communication.
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Multispot Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Manage multiple spots or locations. Set availability, capacity, and rules per spot for your bookings.
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Access Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Control who can access your booking system: staff roles, customer portal access, and visibility of services or locations.
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="customer" className="mt-0">
                <p className="text-sm text-muted-foreground">
                  Customer settings – Currently under development.
                </p>
              </TabsContent>
              <TabsContent value="provider" className="mt-0">
                <p className="text-sm text-muted-foreground">
                  Provider settings – Currently under development.
                </p>
              </TabsContent>
              <TabsContent value="admin" className="mt-0">
                <p className="text-sm text-muted-foreground">
                  Admin settings – Currently under development.
                </p>
              </TabsContent>
              <TabsContent value="scheduling" className="mt-0">
                <p className="text-sm text-muted-foreground">
                  Scheduling settings – Currently under development.
                </p>
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
      </Tabs>
    </div>
  );
}
