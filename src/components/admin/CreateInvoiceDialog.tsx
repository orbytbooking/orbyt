"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, User } from "lucide-react";

type Customer = { id: string; name: string; email: string; phone?: string; address?: string };
type Booking = { id: string; service?: string; scheduled_date?: string; date?: string; scheduled_time?: string; time?: string; total_price?: number };

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  onCreated,
  customer,
  businessId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  customer: Customer | null;
  businessId: string | null;
}) {
  const { toast } = useToast();
  const [invoiceType, setInvoiceType] = useState<"custom" | "booking">("booking");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [lineItems, setLineItems] = useState<Array<{ description: string; quantity: number; unit_price: number }>>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setBillingAddress(customer?.address ?? "");
  }, [customer?.address]);

  useEffect(() => {
    if (!open || !customer?.id || !businessId) return;
    setLoadingBookings(true);
    fetch(`/api/admin/customer-bookings?customer_id=${customer.id}`)
      .then((r) => r.json())
      .then((data) => {
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      })
      .catch(() => setBookings([]))
      .finally(() => setLoadingBookings(false));
  }, [open, customer?.id, businessId]);

  const customerId = customer?.id;
  const selectedBookings = bookings.filter((b) => selectedBookingIds.includes(b.id));
  const customTotal = lineItems.reduce((s, li) => s + (li.quantity || 0) * (li.unit_price || 0), 0);
  const bookingTotal = selectedBookings.reduce((s, b) => s + (b.total_price ?? 0), 0);
  const totalAmount = invoiceType === "booking" ? bookingTotal : customTotal;

  const addLineItem = () => setLineItems((p) => [...p, { description: "", quantity: 1, unit_price: 0 }]);
  const removeLineItem = (i: number) => setLineItems((p) => p.filter((_, idx) => idx !== i));
  const updateLineItem = (i: number, f: Partial<(typeof lineItems)[0]>) =>
    setLineItems((p) => p.map((li, idx) => (idx === i ? { ...li, ...f } : li)));

  const toggleBooking = (bid: string) => {
    setSelectedBookingIds((p) => (p.includes(bid) ? p.filter((x) => x !== bid) : [...p, bid]));
  };

  const reset = () => {
    setInvoiceType("booking");
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setDescription("");
    setNotes("");
    setBillingAddress(customer?.address ?? "");
    setLineItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setSelectedBookingIds([]);
  };

  const handleSubmit = async () => {
    if (!customerId || !businessId) return;
    if (!issueDate) {
      toast({ title: "Required", description: "Issue date is required.", variant: "destructive" });
      return;
    }
    if (invoiceType === "custom" && lineItems.every((li) => !li.description.trim())) {
      toast({ title: "Required", description: "Add at least one line item.", variant: "destructive" });
      return;
    }
    if (invoiceType === "booking" && selectedBookingIds.length === 0) {
      toast({ title: "Required", description: "Select at least one booking.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        customer_id: customerId,
        invoice_type: invoiceType,
        issue_date: issueDate,
        due_date: dueDate || null,
        total_amount: totalAmount,
        description: description || null,
        notes: notes || null,
        billing_address: billingAddress || null,
      };
      if (invoiceType === "custom") {
        body.line_items = lineItems
          .filter((li) => (li.description || "").trim())
          .map((li) => ({
            description: li.description.trim(),
            quantity: Number(li.quantity) || 1,
            unit_price: Number(li.unit_price) || 0,
          }));
      } else {
        body.booking_ids = selectedBookingIds;
      }

      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");

      toast({ title: "Invoice created", description: `${data.invoice?.invoice_number ?? "Invoice"} has been created.` });
      reset();
      onCreated();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription>Create an invoice for this customer. Select from bookings or add custom line items.</DialogDescription>
        </DialogHeader>

        {/* Customer block */}
        {customer && (
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20">
                <User className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground">{customer.email}</p>
                {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
                {customer.address && <p className="text-sm text-muted-foreground">{customer.address}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Address */}
        <div>
          <Label>Billing address</Label>
          <Input
            placeholder="Address for invoice"
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
          />
        </div>

        <Tabs value={invoiceType} onValueChange={(v) => setInvoiceType(v as "custom" | "booking")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="booking">From booking(s)</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="booking" className="mt-4 space-y-4">
            <div>
              <Label>Select booking(s)</Label>
              <p className="text-xs text-muted-foreground mb-2">Up to 30 bookings per invoice.</p>
              {loadingBookings ? (
                <div className="text-sm text-muted-foreground py-4">Loading bookings...</div>
              ) : bookings.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No bookings found for this customer.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                  {bookings.map((b) => (
                    <label key={b.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={selectedBookingIds.includes(b.id)}
                        onChange={() => toggleBooking(b.id)}
                        className="rounded"
                      />
                      <span className="flex-1 truncate">
                        {b.service || "Booking"} — {b.scheduled_date || b.date} — ${Number(b.total_price ?? 0).toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-sm font-medium mt-2">Total: ${bookingTotal.toFixed(2)}</p>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {lineItems.map((li, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Description"
                      className="flex-1"
                      value={li.description}
                      onChange={(e) => updateLineItem(i, { description: e.target.value })}
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      className="w-20"
                      value={li.quantity || ""}
                      onChange={(e) => updateLineItem(i, { quantity: Number(e.target.value) || 1 })}
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Price"
                      className="w-24"
                      value={li.unit_price || ""}
                      onChange={(e) => updateLineItem(i, { unit_price: Number(e.target.value) || 0 })}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium mt-2">Total: ${customTotal.toFixed(2)}</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Issue date *</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Description (optional)</Label>
          <Input placeholder="Invoice description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <Input placeholder="Internal notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || totalAmount < 0}
            style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
          >
            {submitting ? "Creating..." : "Create invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
