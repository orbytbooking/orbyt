'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as const;

export default function DailyDiscountsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    days: new Set<string>(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']),
    appliesTo: 'all',
    services: '',
    categories: '',
    active: true,
  });

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const toggleDay = (day: string, checked: boolean) => {
    setForm((s) => {
      const next = new Set(s.days);
      if (checked) next.add(day); else next.delete(day);
      return { ...s, days: next };
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Daily discount saved', description: `${form.name || 'Untitled'} configured.` });
    // TODO: integrate API
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Daily Discounts</h2>
        <p className="text-muted-foreground text-sm">Configure and schedule daily discounts.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Happy Hour" value={form.name} onChange={onChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discountType">Discount Type</Label>
            <Select value={form.discountType} onValueChange={(v) => setForm((s) => ({ ...s, discountType: v }))}>
              <SelectTrigger id="discountType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discountValue">Discount Value</Label>
            <Input id="discountValue" name="discountValue" type="number" min="0" step="0.01" placeholder="e.g. 15" value={form.discountValue} onChange={onChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appliesTo">Applies To</Label>
            <Select value={form.appliesTo} onValueChange={(v) => setForm((s) => ({ ...s, appliesTo: v }))}>
              <SelectTrigger id="appliesTo">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All services</SelectItem>
                <SelectItem value="categories">Specific categories</SelectItem>
                <SelectItem value="services">Specific services</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" name="startDate" type="date" value={form.startDate} onChange={onChange} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" name="endDate" type="date" value={form.endDate} onChange={onChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Daily Start Time</Label>
            <Input id="startTime" name="startTime" type="time" value={form.startTime} onChange={onChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">Daily End Time</Label>
            <Input id="endTime" name="endTime" type="time" value={form.endTime} onChange={onChange} />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Days of Week</Label>
          <div className="grid grid-cols-7 gap-3">
            {DAYS.map((d) => (
              <label key={d} className="inline-flex items-center gap-2 text-sm">
                <Checkbox checked={form.days.has(d)} onCheckedChange={(c) => toggleDay(d, Boolean(c))} />
                <span>{d}</span>
              </label>
            ))}
          </div>
        </div>

        {form.appliesTo === 'categories' && (
          <div className="space-y-2">
            <Label htmlFor="categories">Categories (comma-separated)</Label>
            <Input id="categories" name="categories" placeholder="e.g. Cleaning, Repairs" value={form.categories} onChange={onChange} />
          </div>
        )}
        {form.appliesTo === 'services' && (
          <div className="space-y-2">
            <Label htmlFor="services">Services (comma-separated)</Label>
            <Input id="services" name="services" placeholder="e.g. Deep Clean, AC Repair" value={form.services} onChange={onChange} />
          </div>
        )}

        <div className="flex items-center justify-between rounded-md border p-4">
          <div>
            <Label htmlFor="active">Active</Label>
            <p className="text-xs text-muted-foreground">Toggle to enable or disable this schedule.</p>
          </div>
          <Switch id="active" checked={form.active} onCheckedChange={(v) => setForm((s) => ({ ...s, active: v }))} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" placeholder="Optional notes" value={form.description} onChange={onChange} />
        </div>

        <div className="flex gap-3">
          <Button type="submit">Save Daily Discount</Button>
          <Button type="button" variant="outline" onClick={() => setForm({ name: '', description: '', discountType: 'percentage', discountValue: '', startDate: '', endDate: '', startTime: '', endTime: '', days: new Set(DAYS), appliesTo: 'all', services: '', categories: '', active: true })}>Reset</Button>
        </div>
      </form>
    </div>
  );
}
