'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
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
  const [serviceEnabled, setServiceEnabled] = useState(true);
  const [formEnabled, setFormEnabled] = useState(true);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['Illinois']);
  const [selectedServices, setSelectedServices] = useState<string[]>(['Deep Clean', 'Basic Cleaning', 'Move In/Out Clean', 'Construction Clean Up', 'Hourly Deep Clean', 'Hourly Basic Clean']);
  const [discountUnit, setDiscountUnit] = useState<'amount' | 'percent'>('amount');
  const [providerDiscountEnabled, setProviderDiscountEnabled] = useState(false);
  const [industries, setIndustries] = useState<string[]>(['Home Cleaning']);
  const [activeIndustry, setActiveIndustry] = useState<string>('');
  const [industryEnabled, setIndustryEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('industries') || 'null');
      if (Array.isArray(stored) && stored.length > 0) {
        setIndustries(stored);
      }
    } catch {
      // ignore malformed localStorage, keep default
    }
  }, []);

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
  }, [industries, activeIndustry]);

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
      const discount_type = form.discountType;
      const discount_value = parseFloat(form.discountValue);
      const { data, error } = await supabase
        .from('marketing_coupons')
        .insert({
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
        });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
            <div className="rounded-md border p-4">
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
                    <div className="rounded-md border p-4">
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
                          <Switch checked={formEnabled} onCheckedChange={(v) => setFormEnabled(!!v)} />
                          <span className={`px-2 py-0.5 rounded-full text-xs ${formEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {formEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>

                      <div className={`space-y-4 ${(industryEnabled[ind] && formEnabled) ? '' : 'opacity-50 pointer-events-none'}`} aria-disabled={!(industryEnabled[ind] && formEnabled)}>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Select locations</div>
                          <div className="flex flex-col gap-2">
                            {['Illinois'].map((loc) => (
                              <label key={loc} className="inline-flex items-center gap-3">
                                <Checkbox
                                  checked={selectedLocations.includes(loc)}
                                  onCheckedChange={(v) => setSelectedLocations((prev) => v ? Array.from(new Set([...prev, loc])) : prev.filter(x => x !== loc))}
                                />
                                <span className="text-sm">{loc}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Select services</div>
                          <div className="flex flex-wrap gap-3">
                            {['Deep Clean', 'Basic Cleaning', 'Move In/Out Clean', 'Construction Clean Up', 'Hourly Deep Clean', 'Hourly Basic Clean'].map((srv) => (
                              <label key={srv} className="inline-flex items-center gap-2">
                                <Checkbox
                                  checked={selectedServices.includes(srv)}
                                  onCheckedChange={(v) => setSelectedServices((prev) => v ? Array.from(new Set([...prev, srv])) : prev.filter(x => x !== srv))}
                                />
                                <span className="text-sm">{srv}</span>
                              </label>
                            ))}
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
              <div className="rounded-md border p-4 space-y-6">
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
              <div className="rounded-md border p-4 text-sm text-muted-foreground">Add limitation rules here.</div>
            </TabsContent>
            <TabsContent value="advanced">
              <div className="rounded-md border p-4 text-sm text-muted-foreground">Advanced settings go here.</div>
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
