'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/contexts/BusinessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';

export default function NewCouponPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    startDate: '',
    endDate: '',
    usageLimit: '',
    minOrder: '',
    active: true,
    facebookCoupon: false,
    allowGiftCards: false,
    allowReferrals: false,
  });
  const [formEnabledByIndustry, setFormEnabledByIndustry] = useState<Record<string, boolean>>({});
  const [selectedLocationsByIndustry, setSelectedLocationsByIndustry] = useState<Record<string, string[]>>({});
  const [locationOptionsCountByIndustry, setLocationOptionsCountByIndustry] = useState<Record<string, number>>({});
  const [selectedServicesByIndustry, setSelectedServicesByIndustry] = useState<Record<string, string[]>>({});
  const [serviceCategoryOptions, setServiceCategoryOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [discountUnit, setDiscountUnit] = useState<'amount' | 'percent'>('amount');
  const [providerDiscountEnabled, setProviderDiscountEnabled] = useState(false);
  const [industries, setIndustries] = useState<string[]>(['Home Cleaning']);
  const [activeIndustry, setActiveIndustry] = useState<string>('');
  const [industryEnabled, setIndustryEnabled] = useState<Record<string, boolean>>({});
  const [industryIdByName, setIndustryIdByName] = useState<Record<string, string>>({});
  const [limitations, setLimitations] = useState({
    applicableDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as string[],
    singleUsePerUser: false,
    orderMaximum: '',
    minMaxApplyWhenManuallyAdjusted: true,
    customerScope: 'all' as 'all' | 'new' | 'existing',
    applyOneTime: true,
    applyRecurring: true,
    recurringDiscountScope: 'all' as 'all' | 'first' | 'next',
    recurringNextCount: '2',
    frequencyDiscountWithCoupons: true,
    couponPriorityOverFrequencyCancellation: false,
    requirePrepayForRecurring: false,
    useSpecificDate: false,
    specificDates: [] as string[],
  });
  const toggleDay = (day: string, checked: boolean) => {
    setLimitations((prev) => {
      const next = checked
        ? Array.from(new Set([...prev.applicableDays, day]))
        : prev.applicableDays.filter((d) => d !== day);
      return { ...prev, applicableDays: next };
    });
  };

  useEffect(() => {
    const fetchIndustries = async () => {
      if (!currentBusiness?.id) return;
      try {
        const response = await fetch(`/api/industries?business_id=${encodeURIComponent(currentBusiness.id)}`);
        const result = await response.json();
        if (!response.ok) return;
        const rows = (result.industries || []);
        const names = rows
          .map((industry: any) => String(industry?.name || '').trim())
          .filter((name: string) => name.length > 0);
        const nextMap: Record<string, string> = {};
        rows.forEach((industry: any) => {
          const name = String(industry?.name || '').trim();
          const id = String(industry?.id || '').trim();
          if (name && id) nextMap[name] = id;
        });
        setIndustryIdByName(nextMap);
        if (names.length > 0) {
          setIndustries(Array.from(new Set(names)));
        }
      } catch {
        // fail silently and keep fallback industry
      }
    };
    fetchIndustries();
  }, [currentBusiness?.id]);

  useEffect(() => {
    // initialize activeIndustry once industries are known
    if (!activeIndustry && industries.length > 0) {
      setActiveIndustry(industries[0]);
    }

    // ensure every industry has an enabled flag (default true)
    setIndustryEnabled((prev) => {
      const next = { ...prev };
      industries.forEach((ind) => {
        if (!(ind in next)) next[ind] = true;
      });
      return next;
    });

    setFormEnabledByIndustry((prev) => {
      const next = { ...prev };
      industries.forEach((ind) => {
        if (!(ind in next)) next[ind] = true;
      });
      return next;
    });
  }, [industries, activeIndustry]);

  useEffect(() => {
    const fetchServiceCategories = async () => {
      if (!currentBusiness?.id || !activeIndustry) return;
      try {
        const activeIndustryId = industryIdByName[activeIndustry];
        const url = activeIndustryId
          ? `/api/service-categories?industryId=${encodeURIComponent(activeIndustryId)}&businessId=${encodeURIComponent(currentBusiness.id)}`
          : `/api/service-categories?businessId=${encodeURIComponent(currentBusiness.id)}`;
        const response = await fetch(url);
        const result = await response.json();
        if (!response.ok) return;
        const names = (result.serviceCategories || [])
          .filter((category: any) => category?.is_active !== false)
          .map((category: any) => String(category?.name || '').trim())
          .filter((name: string) => name.length > 0);
        const uniqueNames = Array.from(new Set(names));
        setServiceCategoryOptions(uniqueNames);
        setSelectedServicesByIndustry((prev) => ({
          ...prev,
          [activeIndustry]: prev[activeIndustry]?.length ? prev[activeIndustry] : uniqueNames,
        }));
      } catch {
        // fail silently and keep empty categories list
      }
    };
    fetchServiceCategories();
  }, [currentBusiness?.id, activeIndustry, industryIdByName]);

  useEffect(() => {
    const fetchLocations = async () => {
      if (!currentBusiness?.id || !activeIndustry) return;
      try {
        const activeIndustryId = industryIdByName[activeIndustry];
        const url = activeIndustryId
          ? `/api/industry-locations?business_id=${encodeURIComponent(currentBusiness.id)}&industry_id=${encodeURIComponent(activeIndustryId)}`
          : `/api/locations?business_id=${encodeURIComponent(currentBusiness.id)}`;
        const response = await fetch(url);
        const result = await response.json();
        if (!response.ok) return;
        const rows = Array.isArray(result.locations) ? result.locations : [];
        const names = rows
          .map((location: any) => String(location?.name || location?.state || location?.city || '').trim())
          .filter((name: string) => name.length > 0);
        const uniqueNames = Array.from(new Set(names));
        setLocationOptions(uniqueNames);
        setLocationOptionsCountByIndustry((prev) => ({ ...prev, [activeIndustry]: uniqueNames.length }));
        setSelectedLocationsByIndustry((prev) => ({
          ...prev,
          [activeIndustry]: prev[activeIndustry]?.length ? prev[activeIndustry] : uniqueNames,
        }));
      } catch {
        // fail silently and keep empty locations list
      }
    };
    fetchLocations();
  }, [currentBusiness?.id, activeIndustry, industryIdByName]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness?.id) {
      toast({ title: 'Error', description: 'No business selected', variant: 'destructive' });
      return;
    }
    try {
      const discount_type = discountUnit === 'percent' ? 'percentage' : 'fixed';
      const discount_value = parseFloat(form.discountValue);
      if (!Number.isFinite(discount_value)) {
        toast({ title: 'Error', description: 'Discount amount is required', variant: 'destructive' });
        return;
      }

      const response = await fetch('/api/marketing/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          business_id: currentBusiness.id,
          code: form.code,
          description: form.description,
          discount_type,
          discount_value,
          start_date: form.startDate || null,
          end_date: form.endDate || null,
          usage_limit: form.usageLimit ? parseInt(form.usageLimit) : null,
          min_order: form.minOrder ? parseFloat(form.minOrder) : null,
          active: form.active,
          facebook_coupon: form.facebookCoupon,
          allow_gift_cards: form.allowGiftCards,
          allow_referrals: form.allowReferrals,
          coupon_config: {
            industries,
            activeIndustry,
            industryEnabled,
            formEnabledByIndustry,
            selectedLocationsByIndustry,
            locationOptionsCountByIndustry,
            selectedServicesByIndustry,
            limitations,
          },
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast({ title: 'Error', description: result.error || 'Failed to create coupon', variant: 'destructive' });
        return;
      }
      toast({ title: 'Coupon saved', description: `Code ${form.code || '(no code)'} created.` });
      router.push('/admin/marketing');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save coupon', variant: 'destructive' });
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2">
          <button
            type="button"
            aria-label="Back to Marketing"
            onClick={() => router.push('/admin/marketing')}
            className="mt-0.5 p-1 rounded hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-semibold">Add new coupon</h2>
            <p className="text-muted-foreground text-sm">You can add in a coupon here.</p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Ex: special-20" value={form.name} onChange={onChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Coupon code</Label>
              <Input id="code" name="code" placeholder="Ex: HJSX20" value={form.code} onChange={onChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Optional" value={form.description} onChange={onChange} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox id="active" checked={form.active} onCheckedChange={(v) => setForm((s) => ({ ...s, active: !!v }))} />
                <Label htmlFor="active" className="font-normal">Make this coupon active</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="facebookCoupon" checked={form.facebookCoupon} onCheckedChange={(v) => setForm((s) => ({ ...s, facebookCoupon: !!v }))} />
                <Label htmlFor="facebookCoupon" className="font-normal">Facebook coupon</Label>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Coupon can be applied with</div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Checkbox id="giftcards" checked={form.allowGiftCards} onCheckedChange={(v) => setForm((s) => ({ ...s, allowGiftCards: !!v }))} />
                    <Label htmlFor="giftcards" className="font-normal">Gift cards</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="referrals" checked={form.allowReferrals} onCheckedChange={(v) => setForm((s) => ({ ...s, allowReferrals: !!v }))} />
                    <Label htmlFor="referrals" className="font-normal">Referrals</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-md border bg-white p-4">
              <Tabs value={activeIndustry} onValueChange={(v) => setActiveIndustry(v)}>
                <TabsList className="bg-transparent p-0 h-auto">
                  {industries.map((ind) => (
                    <TabsTrigger
                      key={ind}
                      value={ind}
                      className="rounded-none bg-transparent px-0 mr-6 text-sm text-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent relative after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100"
                    >
                      {ind}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {industries.map((ind) => (
                  <TabsContent key={ind} value={ind} className="mt-4">
                    <div className="rounded-md border bg-white p-4">
                      <div className="flex flex-col items-start gap-2 mb-4">
                        <Switch
                          checked={industryEnabled[ind]}
                          onCheckedChange={(v) => setIndustryEnabled((prev) => ({ ...prev, [ind]: !!v }))}
                        />
                        <span className={`px-2 py-0.5 rounded-full text-xs ${industryEnabled[ind] ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {industryEnabled[ind] ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium">Form 1</div>
                        <div className="flex flex-col items-end gap-2">
                          <Switch
                            checked={!!formEnabledByIndustry[ind]}
                            onCheckedChange={(v) => setFormEnabledByIndustry((prev) => ({ ...prev, [ind]: !!v }))}
                          />
                          <span className={`px-2 py-0.5 rounded-full text-xs ${formEnabledByIndustry[ind] ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {formEnabledByIndustry[ind] ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>

                      <div className={`space-y-4 ${(industryEnabled[ind] && formEnabledByIndustry[ind]) ? '' : 'opacity-50 pointer-events-none'}`} aria-disabled={!(industryEnabled[ind] && formEnabledByIndustry[ind])}>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Select locations</div>
                          <div className="flex flex-col gap-2">
                            {locationOptions.map((loc) => (
                              <label key={loc} className="inline-flex items-center gap-3">
                                <Checkbox
                                  checked={(selectedLocationsByIndustry[ind] || []).includes(loc)}
                                  onCheckedChange={(v) => setSelectedLocationsByIndustry((prev) => {
                                    const existing = prev[ind] || [];
                                    return {
                                      ...prev,
                                      [ind]: v ? Array.from(new Set([...existing, loc])) : existing.filter((x) => x !== loc),
                                    };
                                  })}
                                />
                                <span className="text-sm">{loc}</span>
                              </label>
                            ))}
                            {locationOptions.length === 0 && (
                              <span className="text-sm text-muted-foreground">No locations found for this industry.</span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Select services</div>
                          <div className="flex flex-wrap gap-3">
                            {serviceCategoryOptions.map((srv) => (
                              <label key={srv} className="inline-flex items-center gap-2">
                                <Checkbox
                                  checked={(selectedServicesByIndustry[ind] || []).includes(srv)}
                                  onCheckedChange={(v) => setSelectedServicesByIndustry((prev) => {
                                    const existing = prev[ind] || [];
                                    return {
                                      ...prev,
                                      [ind]: v ? Array.from(new Set([...existing, srv])) : existing.filter((x) => x !== srv),
                                    };
                                  })}
                                />
                                <span className="text-sm">{srv}</span>
                              </label>
                            ))}
                            {serviceCategoryOptions.length === 0 && (
                              <span className="text-sm text-muted-foreground">No service categories found.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Tabs defaultValue="discount">
            <TabsList className="bg-transparent">
              <TabsTrigger value="discount" className="data-[state=active]:bg-transparent data-[state=active]:text-primary relative after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:bg-primary data-[state=active]:after:opacity-100">Discount</TabsTrigger>
              <TabsTrigger value="limitations" className="data-[state=active]:bg-transparent data-[state=active]:text-primary relative after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:bg-primary data-[state=active]:after:opacity-100">Limitations</TabsTrigger>
              <TabsTrigger value="advanced" className="data-[state=active]:bg-transparent data-[state=active]:text-primary relative after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:bg-primary data-[state=active]:after:opacity-100">Advanced settings</TabsTrigger>
            </TabsList>
            <TabsContent value="discount">
              <div className="rounded-md border bg-white p-4 space-y-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Discount for customers</div>
                  <div className="flex items-center gap-3 max-w-md">
                    <Input
                      placeholder="Amount"
                      type="number"
                      min={0}
                      className="flex-1"
                      name="discountValue"
                      value={form.discountValue}
                      onChange={onChange}
                    />
                    <Select value={discountUnit} onValueChange={(v) => setDiscountUnit(v as 'amount' | 'percent')}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">$</SelectItem>
                        <SelectItem value="percent">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Discount for service providers</div>
                    <div className="flex flex-col items-end gap-2">
                      <Switch checked={providerDiscountEnabled} onCheckedChange={(v) => setProviderDiscountEnabled(!!v)} />
                      <span className={`px-2 py-0.5 rounded-full text-xs ${providerDiscountEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {providerDiscountEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  {/* Future provider discount fields can go here; will be disabled when toggle is off */}
                  <div className={`${providerDiscountEnabled ? '' : 'opacity-50 pointer-events-none'}`} aria-disabled={!providerDiscountEnabled} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="limitations">
              <div className="rounded-md border bg-white p-4 space-y-4">
                <div className="space-y-2 md:flex md:items-start md:gap-4 md:space-y-0">
                  <div className="space-y-1.5 md:flex-1">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start date</Label>
                        <Input id="startDate" name="startDate" type="date" value={form.startDate} onChange={onChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End date</Label>
                        <Input id="endDate" name="endDate" type="date" value={form.endDate} onChange={onChange} />
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <Checkbox checked={limitations.useSpecificDate} onCheckedChange={(v) => setLimitations((prev) => ({ ...prev, useSpecificDate: !!v }))} />
                      <span>Use on specific date</span>
                    </label>
                    {limitations.useSpecificDate && (
                      <div className="space-y-2">
                        {limitations.specificDates.map((date, index) => (
                          <div key={`${date}-${index}`} className="flex items-center gap-2 md:max-w-md">
                            <Input type="date" value={date} onChange={(e) => setLimitations((prev) => ({ ...prev, specificDates: prev.specificDates.map((d, i) => i === index ? e.target.value : d) }))} />
                            <Button type="button" variant="outline" size="sm" onClick={() => setLimitations((prev) => ({ ...prev, specificDates: prev.specificDates.filter((_, i) => i !== index) }))}>Remove</Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => setLimitations((prev) => ({ ...prev, specificDates: [...prev.specificDates, form.startDate || ''] }))}>Add date</Button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="usageLimit">Max usage</Label>
                          <Input id="usageLimit" name="usageLimit" type="number" min={0} value={form.usageLimit} onChange={onChange} />
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
                          <Checkbox
                            checked={limitations.singleUsePerUser}
                            onCheckedChange={(v) => setLimitations((prev) => ({ ...prev, singleUsePerUser: !!v }))}
                          />
                          <span>Single use per users</span>
                        </label>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="minOrder">Is there an order minimum?</Label>
                          <Input id="minOrder" name="minOrder" type="number" min={0} value={form.minOrder} onChange={onChange} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="orderMaximum">Is there an order maximum?</Label>
                          <Input
                            id="orderMaximum"
                            type="number"
                            min={0}
                            value={limitations.orderMaximum}
                            onChange={(e) => setLimitations((prev) => ({ ...prev, orderMaximum: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm font-medium">Should minimum/maximum still apply if booking is manually adjusted?</div>
                          <div className="flex items-center gap-4 text-sm">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="radio"
                                checked={limitations.minMaxApplyWhenManuallyAdjusted}
                                onChange={() => setLimitations((prev) => ({ ...prev, minMaxApplyWhenManuallyAdjusted: true }))}
                              />
                              <span>Yes</span>
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="radio"
                                checked={!limitations.minMaxApplyWhenManuallyAdjusted}
                                onChange={() => setLimitations((prev) => ({ ...prev, minMaxApplyWhenManuallyAdjusted: false }))}
                              />
                              <span>No</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Apply to customers</div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <label className="inline-flex items-center gap-2"><input type="radio" checked={limitations.customerScope === 'all'} onChange={() => setLimitations((prev) => ({ ...prev, customerScope: 'all' }))} />All</label>
                            <label className="inline-flex items-center gap-2"><input type="radio" checked={limitations.customerScope === 'new'} onChange={() => setLimitations((prev) => ({ ...prev, customerScope: 'new' }))} />New customers only</label>
                            <label className="inline-flex items-center gap-2"><input type="radio" checked={limitations.customerScope === 'existing'} onChange={() => setLimitations((prev) => ({ ...prev, customerScope: 'existing' }))} />Existing customers only</label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Apply to booking types</div>
                          <div className="flex items-center gap-4 text-sm">
                            <label className="inline-flex items-center gap-2"><Checkbox checked={limitations.applyOneTime} onCheckedChange={(v) => setLimitations((prev) => ({ ...prev, applyOneTime: !!v }))} /><span>One time</span></label>
                            <label className="inline-flex items-center gap-2"><Checkbox checked={limitations.applyRecurring} onCheckedChange={(v) => setLimitations((prev) => ({ ...prev, applyRecurring: !!v }))} /><span>Recurring</span></label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Recurring discount scope</div>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <label className="inline-flex items-center gap-2"><input type="radio" checked={limitations.recurringDiscountScope === 'all'} onChange={() => setLimitations((prev) => ({ ...prev, recurringDiscountScope: 'all' }))} />All recurring</label>
                            <label className="inline-flex items-center gap-2"><input type="radio" checked={limitations.recurringDiscountScope === 'first'} onChange={() => setLimitations((prev) => ({ ...prev, recurringDiscountScope: 'first' }))} />First booking only</label>
                            <label className="inline-flex items-center gap-2"><input type="radio" checked={limitations.recurringDiscountScope === 'next'} onChange={() => setLimitations((prev) => ({ ...prev, recurringDiscountScope: 'next' }))} />Next</label>
                            <Select value={limitations.recurringNextCount} onValueChange={(value) => setLimitations((prev) => ({ ...prev, recurringNextCount: value }))}>
                              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                              <SelectContent>{['1', '2', '3', '4', '5'].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                            </Select>
                            <span>bookings</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Will frequency discount also apply with coupon?</div>
                          <div className="flex items-center gap-4 text-sm">
                            <label className="inline-flex items-center gap-2"><input type="radio" checked={limitations.frequencyDiscountWithCoupons} onChange={() => setLimitations((prev) => ({ ...prev, frequencyDiscountWithCoupons: true }))} />Yes</label>
                            <label className="inline-flex items-center gap-2"><input type="radio" checked={!limitations.frequencyDiscountWithCoupons} onChange={() => setLimitations((prev) => ({ ...prev, frequencyDiscountWithCoupons: false }))} />No</label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Coupon settings priority over frequency cancellation settings?</div>
                          <div className="flex items-center gap-4 text-sm">
                            <label className="inline-flex items-center gap-2"><input type="radio" checked={limitations.couponPriorityOverFrequencyCancellation} onChange={() => setLimitations((prev) => ({ ...prev, couponPriorityOverFrequencyCancellation: true }))} />Yes</label>
                            <label className="inline-flex items-center gap-2"><input type="radio" checked={!limitations.couponPriorityOverFrequencyCancellation} onChange={() => setLimitations((prev) => ({ ...prev, couponPriorityOverFrequencyCancellation: false }))} />No</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 md:w-56 md:shrink-0">
                    <div className="text-sm font-medium">Applicable on following days</div>
                    <div className="flex flex-col gap-2">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                        <label key={day} className="inline-flex items-center gap-2 text-sm">
                          <Checkbox checked={limitations.applicableDays.includes(day)} onCheckedChange={(v) => toggleDay(day, !!v)} />
                          <span>{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </TabsContent>
            <TabsContent value="advanced">
              <div className="rounded-md border bg-white p-4 text-sm text-muted-foreground">Advanced settings go here.</div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/marketing">Cancel</Link>
          </Button>
          <Button type="submit">Add Coupon</Button>
        </div>
      </form>
    </div>
  );
}
