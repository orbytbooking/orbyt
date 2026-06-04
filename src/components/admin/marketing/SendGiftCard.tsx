'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/contexts/BusinessContext';
import { Gift, Image as ImageIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';

type GiftCardTemplate = {
  id: string;
  name: string;
  description?: string;
  amount: number;
  active: boolean;
  expires_in_months: number;
};

const MIN_AMOUNT_DEFAULT = 150;

export function SendGiftCard() {
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const [templates, setTemplates] = useState<GiftCardTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    giftCardId: '',
    senderFirstName: '',
    senderLastName: '',
    senderEmail: '',
    recipientName: '',
    recipientEmail: '',
    message: '',
    sendOption: 'now' as 'now' | 'later',
    scheduleDate: '',
    scheduleTime: '',
    excludeMinimumValidation: false,
  });

  useEffect(() => {
    if (!currentBusiness?.id) {
      setLoadingTemplates(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingTemplates(true);
      try {
        const res = await fetch(
          `/api/marketing/gift-cards?business_id=${currentBusiness.id}&active=true`,
        );
        const json = await res.json();
        if (!cancelled && res.ok && Array.isArray(json.data)) {
          setTemplates(json.data);
          if (json.data.length === 1) {
            setFormData((prev) => ({ ...prev, giftCardId: json.data[0].id }));
          }
        }
      } catch (e) {
        console.error('Failed to load gift card templates', e);
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentBusiness?.id]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === formData.giftCardId) ?? null,
    [templates, formData.giftCardId],
  );

  const displayAmount = selectedTemplate?.amount ?? 0;

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      giftCardId: templates.length === 1 ? templates[0].id : '',
      senderFirstName: '',
      senderLastName: '',
      senderEmail: '',
      recipientName: '',
      recipientEmail: '',
      message: '',
      sendOption: 'now',
      scheduleDate: '',
      scheduleTime: '',
      excludeMinimumValidation: false,
    });
    setSelectedImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentBusiness?.id) {
      toast({ title: 'Business required', description: 'Select a business first.', variant: 'destructive' });
      return;
    }

    if (!formData.giftCardId || !selectedTemplate) {
      toast({
        title: 'Gift card type required',
        description: 'Choose a gift card template. Create one under Gift Card Templates if needed.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.excludeMinimumValidation && displayAmount < MIN_AMOUNT_DEFAULT) {
      toast({
        title: 'Validation Error',
        description: `This gift card is below the $${MIN_AMOUNT_DEFAULT.toFixed(2)} minimum. Enable "Exclude minimum" or pick another template.`,
        variant: 'destructive',
      });
      return;
    }

    if (!formData.senderFirstName.trim() || !formData.senderLastName.trim() || !formData.senderEmail.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all sender information.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.recipientName.trim() || !formData.recipientEmail.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in recipient name and email.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.sendOption === 'later') {
      toast({
        title: 'Scheduled send not available yet',
        description: 'Gift cards are sent immediately. Choose "Send Now" for now.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const purchaserName = `${formData.senderFirstName.trim()} ${formData.senderLastName.trim()}`.trim();
      const res = await fetch('/api/marketing/gift-cards/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: currentBusiness.id,
          gift_card_id: formData.giftCardId,
          quantity: 1,
          purchaser_email: formData.senderEmail.trim(),
          purchaser_name: purchaserName,
          recipient_email: formData.recipientEmail.trim(),
          recipient_name: formData.recipientName.trim(),
          message: formData.message.trim() || undefined,
          send_email: true,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof result.error === 'string' ? result.error : result.details || 'Failed to send gift card',
        );
      }

      const instance = result.data?.[0];
      const code = instance?.unique_code ?? '';
      const emailSent = result.email_results?.[0]?.sent;

      toast({
        title: 'Gift Card Sent!',
        description: code
          ? `Code ${code} created for ${formData.recipientName}.${emailSent ? ' Email delivered.' : emailSent === false ? ' Email could not be sent (check Resend config).' : ''}`
          : `Gift card sent to ${formData.recipientName}.`,
      });

      resetForm();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to send gift card',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Send Gift Card</h2>
        <p className="text-muted-foreground">
          Issue a gift card and email the code to your customer.
        </p>
      </div>

      {loadingTemplates ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading gift card types…
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No active gift card templates. Create one in the{' '}
              <Link href="/admin/marketing" className="text-primary underline">
                Gift Card Templates
              </Link>{' '}
              tab first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Gift Card Details</CardTitle>
              <CardDescription>Choose a template and recipient details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="gift-card-type">Gift Card Type</Label>
                  <Select
                    value={formData.giftCardId}
                    onValueChange={(value) => handleInputChange('giftCardId', value)}
                  >
                    <SelectTrigger id="gift-card-type">
                      <SelectValue placeholder="Select gift card" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} — ${Number(t.amount).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Gift Card Image (preview only)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      {selectedImage ? (
                        <img src={selectedImage} alt="Preview" className="max-h-20 mx-auto rounded" />
                      ) : (
                        <div className="space-y-2">
                          <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
                          <p className="text-sm text-gray-600">Optional preview image</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Sender Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="senderFirstName">First Name</Label>
                      <Input
                        id="senderFirstName"
                        value={formData.senderFirstName}
                        onChange={(e) => handleInputChange('senderFirstName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senderLastName">Last Name</Label>
                      <Input
                        id="senderLastName"
                        value={formData.senderLastName}
                        onChange={(e) => handleInputChange('senderLastName', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderEmail">Email</Label>
                    <Input
                      id="senderEmail"
                      type="email"
                      value={formData.senderEmail}
                      onChange={(e) => handleInputChange('senderEmail', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Recipient Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">Name</Label>
                    <Input
                      id="recipientName"
                      value={formData.recipientName}
                      onChange={(e) => handleInputChange('recipientName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientEmail">Email</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      value={formData.recipientEmail}
                      onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="exclude-minimum"
                    checked={formData.excludeMinimumValidation}
                    onCheckedChange={(checked) => handleInputChange('excludeMinimumValidation', checked)}
                  />
                  <Label htmlFor="exclude-minimum" className="text-sm">
                    Allow templates under ${MIN_AMOUNT_DEFAULT.toFixed(2)}
                  </Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Gift className="h-4 w-4 mr-2" />
                    )}
                    {submitting ? 'Sending…' : 'Send Gift Card'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gift Card Preview</CardTitle>
              <CardDescription>What the recipient will receive.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-2">Congratulations!</h3>
                <p className="text-white/80 mb-4">You&apos;ve received a special gift</p>
                <div className="text-4xl font-bold mb-2">
                  ${displayAmount > 0 ? displayAmount.toFixed(2) : '0.00'}
                </div>
                {selectedTemplate && (
                  <p className="text-sm text-white/90">{selectedTemplate.name}</p>
                )}
                <div className="mt-6 pt-4 border-t border-white/20 text-sm flex justify-between">
                  <span>To: {formData.recipientName || '—'}</span>
                  <span>
                    From:{' '}
                    {formData.senderFirstName || formData.senderLastName
                      ? `${formData.senderFirstName} ${formData.senderLastName}`.trim()
                      : '—'}
                  </span>
                </div>
              </div>
              {formData.message && (
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <p className="text-sm text-gray-600">{formData.message}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-4">
                A unique code will be emailed to {formData.recipientEmail || 'the recipient'} when you send.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
