'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function GiftCardsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    code: '',
    amount: '',
    currency: 'USD',
    recipientName: '',
    recipientEmail: '',
    message: '',
    expirationDate: '',
    active: true,
  });

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Gift card saved', description: `Code ${form.code || '(auto)'} issued for ${form.recipientName || 'recipient'}.` });
    // TODO: integrate API
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Gift Cards</h2>
        <p className="text-muted-foreground text-sm">Issue and track gift cards.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" placeholder="Optional, auto-generate if empty" value={form.code} onChange={onChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" min="0" step="0.01" placeholder="50.00" value={form.amount} onChange={onChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setForm((s) => ({ ...s, currency: v }))}>
              <SelectTrigger id="currency">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expirationDate">Expiration Date</Label>
            <Input id="expirationDate" name="expirationDate" type="date" value={form.expirationDate} onChange={onChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientName">Recipient Name</Label>
            <Input id="recipientName" name="recipientName" placeholder="Jane Doe" value={form.recipientName} onChange={onChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientEmail">Recipient Email</Label>
            <Input id="recipientEmail" name="recipientEmail" type="email" placeholder="jane@example.com" value={form.recipientEmail} onChange={onChange} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea id="message" name="message" placeholder="Optional greeting" value={form.message} onChange={onChange} />
        </div>

        <div className="flex items-center justify-between rounded-md border p-4">
          <div>
            <Label htmlFor="active">Active</Label>
            <p className="text-xs text-muted-foreground">Toggle to enable or disable this gift card.</p>
          </div>
          <Switch id="active" checked={form.active} onCheckedChange={(v) => setForm((s) => ({ ...s, active: v }))} />
        </div>

        <div className="flex gap-3">
          <Button type="submit">Save Gift Card</Button>
          <Button type="button" variant="outline" onClick={() => setForm({ code: '', amount: '', currency: 'USD', recipientName: '', recipientEmail: '', message: '', expirationDate: '', active: true })}>Reset</Button>
        </div>
      </form>
    </div>
  );
}
