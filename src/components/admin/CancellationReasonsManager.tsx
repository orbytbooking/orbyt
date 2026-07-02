'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, Info, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { withTenantBusiness } from '@/lib/adminTenantFetch';

export type CancellationReason = {
  id: string;
  label: string;
  display_order: number;
  is_active: boolean;
  applies_one_time: boolean;
  applies_recurring: boolean;
  applicable_cancel_all_recurring: boolean;
  applicable_cancel_single: boolean;
  applicable_exclude_cancellation_fee: boolean;
  applicable_exclude_after_first_fee: boolean;
};

const defaultReasonForm = {
  label: '',
  oneTime: true,
  recurring: true,
  cancelAllRecurring: false,
  cancelSingle: false,
  excludeCancellationFee: false,
  excludeAfterFirstFee: false,
};

type CancellationReasonsManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string | null | undefined;
};

export function CancellationReasonsManager({
  open,
  onOpenChange,
  businessId,
}: CancellationReasonsManagerProps) {
  const [reasons, setReasons] = useState<CancellationReason[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<CancellationReason | null>(null);
  const [deleteReason, setDeleteReason] = useState<CancellationReason | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(defaultReasonForm);
  const [formSaving, setFormSaving] = useState(false);

  const fetchReasons = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/cancellation-reasons?businessId=${encodeURIComponent(businessId)}`,
        { headers: withTenantBusiness(businessId) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load cancellation reasons');
      setReasons(data.reasons || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load cancellation reasons');
      setReasons([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (open && businessId) {
      fetchReasons();
    }
  }, [open, businessId, fetchReasons]);

  const openAddForm = () => {
    setEditingReason(null);
    setForm(defaultReasonForm);
    setEditOpen(true);
  };

  const openEditForm = (reason: CancellationReason) => {
    setEditingReason(reason);
    setForm({
      label: reason.label,
      oneTime: reason.applies_one_time,
      recurring: reason.applies_recurring,
      cancelAllRecurring: reason.applicable_cancel_all_recurring,
      cancelSingle: reason.applicable_cancel_single,
      excludeCancellationFee: reason.applicable_exclude_cancellation_fee,
      excludeAfterFirstFee: reason.applicable_exclude_after_first_fee,
    });
    setEditOpen(true);
  };

  const buildReasonPayload = () => ({
    label: form.label.trim(),
    applies_one_time: form.oneTime,
    applies_recurring: form.recurring,
    applicable_cancel_all_recurring: form.cancelAllRecurring,
    applicable_cancel_single: form.cancelSingle,
    applicable_exclude_cancellation_fee: form.excludeCancellationFee,
    applicable_exclude_after_first_fee: form.excludeAfterFirstFee,
  });

  const handleSaveForm = async () => {
    const label = form.label.trim();
    if (!label || !businessId) {
      toast.error('Reason title is required');
      return;
    }
    if (!form.oneTime && !form.recurring) {
      toast.error('Select at least one frequency option');
      return;
    }
    setFormSaving(true);
    try {
      const payload = { businessId, ...buildReasonPayload() };
      if (editingReason) {
        const res = await fetch(`/api/admin/cancellation-reasons/${encodeURIComponent(editingReason.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...withTenantBusiness(businessId) },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update reason');
      } else {
        const res = await fetch('/api/admin/cancellation-reasons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...withTenantBusiness(businessId) },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create reason');
      }
      setEditOpen(false);
      await fetchReasons();
      toast.success(editingReason ? 'Reason updated' : 'Reason added');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save reason');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReason || !businessId) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/cancellation-reasons/${encodeURIComponent(deleteReason.id)}?businessId=${encodeURIComponent(businessId)}`,
        { method: 'DELETE', headers: withTenantBusiness(businessId) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete reason');
      setDeleteReason(null);
      await fetchReasons();
      toast.success('Reason deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete reason');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = (id: string, isActive: boolean) => {
    setReasons((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: isActive } : r)));
  };

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/cancellation-reasons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...withTenantBusiness(businessId) },
        body: JSON.stringify({
          businessId,
          reasons: reasons.map((r) => ({
            id: r.id,
            label: r.label,
            is_active: r.is_active,
            applies_one_time: r.applies_one_time,
            applies_recurring: r.applies_recurring,
            applicable_cancel_all_recurring: r.applicable_cancel_all_recurring,
            applicable_cancel_single: r.applicable_cancel_single,
            applicable_exclude_cancellation_fee: r.applicable_exclude_cancellation_fee,
            applicable_exclude_after_first_fee: r.applicable_exclude_after_first_fee,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save reasons');
      setReasons(data.reasons || []);
      toast.success('Cancellation reasons saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save reasons');
    } finally {
      setSaving(false);
    }
  };

  const moveReason = (id: string, direction: -1 | 1) => {
    setReasons((prev) => {
      const index = prev.findIndex((r) => r.id === id);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  };

  const handleUpdatePriority = async () => {
    if (!businessId || reasons.length === 0) return;
    setSavingOrder(true);
    try {
      const res = await fetch('/api/admin/cancellation-reasons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...withTenantBusiness(businessId) },
        body: JSON.stringify({
          businessId,
          orderedIds: reasons.map((r) => r.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update priority');
      setReasons(data.reasons || []);
      toast.success('Priority updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update priority');
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Manage reasons
              <Info className="h-4 w-4 text-muted-foreground" />
            </DialogTitle>
            <DialogDescription>
              Add and manage cancellation reasons shown when a booking is cancelled.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-[280px] border rounded-md">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reasons.length === 0 ? (
              <p className="text-center text-muted-foreground py-16 text-sm">
                No cancellation reasons yet. Click Add New to create one.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-24">Tags</TableHead>
                    <TableHead className="w-28 text-right">Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reasons.map((reason) => (
                    <TableRow key={reason.id}>
                      <TableCell>
                        <Checkbox
                          checked={reason.is_active}
                          onCheckedChange={(c) => toggleActive(reason.id, !!c)}
                          aria-label={`Active: ${reason.label}`}
                        />
                      </TableCell>
                      <TableCell>{reason.label}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {reason.applies_recurring && (
                            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                              REC
                            </span>
                          )}
                          {reason.applies_one_time && (
                            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                              OT
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                              Options <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditForm(reason)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => moveReason(reason.id, -1)}>
                              Move Up
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => moveReason(reason.id, 1)}>
                              Move Down
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteReason(reason)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter className="flex-row justify-start gap-2 sm:justify-start">
            <Button onClick={openAddForm} disabled={!businessId}>
              Add New
            </Button>
            <Button variant="secondary" onClick={handleSave} disabled={saving || loading || !businessId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
            <Button
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={handleUpdatePriority}
              disabled={savingOrder || loading || reasons.length === 0 || !businessId}
            >
              {savingOrder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Priority
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="bg-sky-100 px-6 py-4 text-left space-y-0">
            <DialogTitle className="text-sky-900 text-lg font-semibold">
              {editingReason ? 'Edit reason' : 'Add reason'}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason-title" className="text-sm font-medium">
                Reason title
              </Label>
              <Input
                id="cancel-reason-title"
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Enter reason title"
                className="border-sky-300 focus-visible:ring-sky-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Frequency</Label>
              <div className="flex flex-wrap gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.oneTime}
                    onCheckedChange={(c) => setForm((prev) => ({ ...prev, oneTime: !!c }))}
                  />
                  <span className="text-sm">One Time</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.recurring}
                    onCheckedChange={(c) => setForm((prev) => ({ ...prev, recurring: !!c }))}
                  />
                  <span className="text-sm">Recurring</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Applicable on</Label>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.cancelAllRecurring}
                    onCheckedChange={(c) => setForm((prev) => ({ ...prev, cancelAllRecurring: !!c }))}
                  />
                  <span className="text-sm">Cancel all recurring appointments</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.cancelSingle}
                    onCheckedChange={(c) => setForm((prev) => ({ ...prev, cancelSingle: !!c }))}
                  />
                  <span className="text-sm">Cancel single appointment</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.excludeCancellationFee}
                    onCheckedChange={(c) => setForm((prev) => ({ ...prev, excludeCancellationFee: !!c }))}
                  />
                  <span className="text-sm">Exclude cancellation fee</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.excludeAfterFirstFee}
                    onCheckedChange={(c) => setForm((prev) => ({ ...prev, excludeAfterFirstFee: !!c }))}
                  />
                  <span className="text-sm">Exclude cancellation after 1st appointment fee</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-0 flex-row gap-3 sm:justify-between">
            <Button
              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white"
              onClick={handleSaveForm}
              disabled={formSaving || !form.label.trim()}
            >
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => setEditOpen(false)}
              disabled={formSaving}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteReason} onOpenChange={(o) => !o && setDeleteReason(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cancellation reason?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &quot;{deleteReason?.label}&quot; from your cancellation reasons list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
