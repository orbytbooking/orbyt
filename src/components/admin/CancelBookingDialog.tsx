'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type CancelReason = {
  id: string;
  label: string;
};

type CancelOptions = {
  settings: {
    reasonsSetup: 'yes' | 'no';
    reasonOptional: 'yes' | 'no';
    commentBox: 'yes' | 'no';
  };
  reasons: CancelReason[];
};

type CancelBookingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string | null;
  businessId: string | null | undefined;
  bookingLabel?: string;
  onCancelled?: () => void | Promise<void>;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
};

export function CancelBookingDialog({
  open,
  onOpenChange,
  bookingId,
  businessId,
  bookingLabel,
  onCancelled,
  onError,
  onSuccess,
}: CancelBookingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState<CancelOptions | null>(null);
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [comment, setComment] = useState('');

  const loadOptions = useCallback(async () => {
    if (!bookingId || !businessId) return;
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sign in required');

      const res = await fetch(
        `/api/admin/bookings/${encodeURIComponent(bookingId)}/cancel-options`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-business-id': businessId,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load cancellation options');
      setOptions(data);
      setSelectedReasonId('');
      setComment('');
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Failed to load cancellation options');
      setOptions(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId, businessId, onError]);

  useEffect(() => {
    if (open && bookingId && businessId) {
      void loadOptions();
    }
    if (!open) {
      setOptions(null);
      setSelectedReasonId('');
      setComment('');
    }
  }, [open, bookingId, businessId, loadOptions]);

  const showReasonPicker =
    options?.settings.reasonsSetup === 'yes' && (options?.reasons.length ?? 0) > 0;
  const reasonRequired = showReasonPicker && options?.settings.reasonOptional !== 'yes';
  const showCommentBox = options?.settings.commentBox !== 'no';

  const handleConfirmCancel = async () => {
    if (!bookingId || !businessId) return;
    if (reasonRequired && !selectedReasonId) {
      onError?.('Please select a cancellation reason');
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sign in required');

      const res = await fetch(`/api/admin/bookings/${encodeURIComponent(bookingId)}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-business-id': businessId,
        },
        body: JSON.stringify({
          cancellationReasonId: selectedReasonId || undefined,
          cancellationComment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel booking');

      onOpenChange(false);
      onSuccess?.('Booking cancelled');
      await onCancelled?.();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Failed to cancel booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel booking</DialogTitle>
          <DialogDescription>
            {bookingLabel
              ? `Are you sure you want to cancel ${bookingLabel}?`
              : 'Are you sure you want to cancel this booking?'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 py-1">
            {showReasonPicker && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  Why is this booking being cancelled?
                  {!reasonRequired && (
                    <span className="font-normal text-muted-foreground"> (optional)</span>
                  )}
                </Label>
                <RadioGroup value={selectedReasonId} onValueChange={setSelectedReasonId}>
                  {options!.reasons.map((reason) => (
                    <label
                      key={reason.id}
                      className="flex items-start gap-3 cursor-pointer rounded-md border p-3 hover:bg-muted/40"
                    >
                      <RadioGroupItem value={reason.id} id={`cancel-reason-${reason.id}`} className="mt-0.5" />
                      <span className="text-sm leading-snug">{reason.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {showCommentBox && (
              <div className="space-y-2">
                <Label htmlFor="cancel-booking-comment" className="text-sm font-semibold">
                  Comment
                  <span className="font-normal text-muted-foreground"> (optional)</span>
                </Label>
                <Textarea
                  id="cancel-booking-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add any additional details…"
                  rows={3}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Keep booking
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirmCancel()}
            disabled={loading || submitting || !bookingId}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirm cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
