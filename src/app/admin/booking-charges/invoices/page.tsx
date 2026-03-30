"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useBusiness } from "@/contexts/BusinessContext";
import { Loader2, Plus, Search } from "lucide-react";
import { CreateInvoiceDialog } from "@/components/admin/CreateInvoiceDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_type: "custom" | "booking";
  status: "active" | "draft" | "overdue" | string;
  payment_status: "pending" | "partial" | "paid" | "refunded" | string;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  amount_paid: number;
  customers?: { id: string; name?: string | null; email?: string | null; phone?: string | null } | null;
  invoice_bookings?: Array<{
    booking_id: string;
    bookings?: {
      payment_method?: string | null;
      card_brand?: string | null;
      card_last4?: string | null;
    } | null;
  }>;
};

type CustomerOption = { id: string; name: string; email: string; phone?: string; address?: string };

export default function BookingChargesInvoicesPage() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [stateTab, setStateTab] = useState<"active" | "draft" | "overdue" | "all">("all");
  const [invoiceType, setInvoiceType] = useState<string>("all");
  const [paymentStatus, setPaymentStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [chooseCustomerOpen, setChooseCustomerOpen] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (stateTab !== "all") params.set("status", stateTab);
      if (invoiceType !== "all") params.set("invoice_type", invoiceType);
      if (paymentStatus !== "all") params.set("payment_status", paymentStatus);
      if (dateFrom) params.set("date_from", dateFrom.toISOString().slice(0, 10));
      if (dateTo) params.set("date_to", dateTo.toISOString().slice(0, 10));
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/invoices?${params.toString()}`, {
        headers: { "x-business-id": currentBusiness.id },
      });
      const data = await res.json();
      setRows(Array.isArray(data.invoices) ? data.invoices : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, stateTab, invoiceType, paymentStatus, dateFrom, dateTo, search]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if ((!showCreateInvoice && !chooseCustomerOpen) || !currentBusiness?.id) return;
    fetch(`/api/customers?business_id=${currentBusiness.id}`)
      .then((r) => r.json())
      .then((data) => setCustomers(data.data ?? []))
      .catch(() => setCustomers([]));
  }, [showCreateInvoice, chooseCustomerOpen, currentBusiness?.id]);

  const stats = useMemo(() => {
    const paid = rows.filter((r) => r.payment_status === "paid").reduce((s, r) => s + Number(r.amount_paid || r.total_amount || 0), 0);
    const partial = rows.filter((r) => r.payment_status === "partial").reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const outstandingRows = rows.filter((r) => r.payment_status === "pending" || r.payment_status === "partial");
    const outstandingTotal = outstandingRows.reduce(
      (s, r) => s + Math.max(0, Number(r.total_amount || 0) - Number(r.amount_paid || 0)),
      0
    );
    const avgOutstanding = outstandingRows.length ? outstandingTotal / outstandingRows.length : 0;
    return { paid, partial, avgOutstanding };
  }, [rows]);

  const cardBrands = useMemo(() => {
    const set = new Set<string>();
    for (const inv of rows) {
      const b = inv.invoice_bookings?.[0]?.bookings;
      const brand = String(b?.card_brand ?? "").trim();
      if (brand) set.add(brand.toUpperCase());
    }
    if (set.size === 0) {
      return ["VISA", "MASTERCARD", "DISCOVER", "AMEX"];
    }
    return Array.from(set);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">All invoices</p>
        </div>
        <Button onClick={() => setChooseCustomerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create an invoice
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b pb-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/booking-charges")}>
          Pending
        </Button>
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/booking-charges?tab=declined")}>
          Declined
        </Button>
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/booking-charges?tab=all")}>
          All charges
        </Button>
        <Button variant="ghost" size="sm" disabled>
          Card hold(s)/Declined
        </Button>
        <Button variant="ghost" size="sm" className="text-cyan-700">
          Invoices
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={invoiceType} onValueChange={setInvoiceType}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Type: All</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="booking">Booking</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Pay status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Pay status: All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <DatePicker date={dateFrom} onSelect={setDateFrom} className="w-[180px]" />
            <DatePicker date={dateTo} onSelect={setDateTo} className="w-[180px]" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 w-[280px]"
                placeholder="Enter invoice #, email, name or phone number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(["active", "draft", "overdue", "all"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={stateTab === s ? "default" : "outline"}
                onClick={() => setStateTab(s)}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border rounded-md p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total amount paid</p>
              <p className="text-2xl font-semibold">${stats.paid.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Partial amount paid</p>
              <p className="text-2xl font-semibold">${stats.partial.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average outstanding amount</p>
              <p className="text-2xl font-semibold">${stats.avgOutstanding.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-full bg-muted/70 px-3 py-2">
            {cardBrands.map((b) => (
              <span key={b} className="rounded border bg-background px-2 py-0.5 text-xs font-semibold">
                {b}
              </span>
            ))}
            <span className="text-sm text-muted-foreground">
              Empower your payments! Streamline collections faster with Stripe invoicing.
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto px-1"
              onClick={() => router.push("/admin/settings/account/billing")}
            >
              Click here
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
            </div>
          ) : rows.length === 0 ? (
            <div className="border border-dashed rounded-md py-10 text-center text-muted-foreground">
              There are no invoices found.
            </div>
          ) : (
            <div className="border rounded-md overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Invoice</th>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-left">Issue date</th>
                    <th className="px-3 py-2 text-left">Due date</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-left">Pay status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.invoice_number}</td>
                      <td className="px-3 py-2">{r.customers?.name || r.customers?.email || "—"}</td>
                      <td className="px-3 py-2">{r.issue_date || "—"}</td>
                      <td className="px-3 py-2">{r.due_date || "—"}</td>
                      <td className="px-3 py-2 text-right">${Number(r.total_amount || 0).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span>{r.payment_status}</span>
                          {r.invoice_bookings?.[0]?.bookings?.payment_method === "online" &&
                            r.invoice_bookings?.[0]?.bookings?.card_last4 && (
                              <Badge variant="outline" className="text-xs">
                                {`${String(r.invoice_bookings?.[0]?.bookings?.card_brand || "CARD").toUpperCase()} (XXXX-${String(
                                  r.invoice_bookings?.[0]?.bookings?.card_last4 || ""
                                ).toUpperCase()})`}
                              </Badge>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCustomer && (
        <CreateInvoiceDialog
          open={showCreateInvoice}
          onOpenChange={setShowCreateInvoice}
          onCreated={() => {
            setShowCreateInvoice(false);
            setSelectedCustomer(null);
            fetchInvoices();
          }}
          customer={selectedCustomer}
          businessId={currentBusiness?.id ?? null}
        />
      )}

      <Dialog
        open={chooseCustomerOpen}
        onOpenChange={(open) => {
          setChooseCustomerOpen(open);
          if (!open && !selectedCustomer) setShowCreateInvoice(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select customer</DialogTitle>
          </DialogHeader>
          <Select
            value={selectedCustomer?.id ?? ""}
            onValueChange={(id) => setSelectedCustomer(customers.find((c) => c.id === id) ?? null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose customer for invoice" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setChooseCustomerOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedCustomer}
              onClick={() => {
                setChooseCustomerOpen(false);
                setShowCreateInvoice(true);
              }}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

