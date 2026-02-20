"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type InvoiceData = {
  invoice: {
    invoice_number: string;
    issue_date: string;
    due_date: string | null;
    total_amount: number;
    amount_paid: number;
    payment_status: string;
    description: string | null;
    billing_address: string | null;
    invoice_bookings?: Array<{
      amount: number;
      bookings?: { service?: string; scheduled_date?: string; date?: string; scheduled_time?: string; time?: string; total_price?: number } | null;
    }>;
    invoice_line_items?: Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
    customer?: { name: string; email: string; phone?: string; address?: string } | null;
    business?: { name: string } | null;
  };
};

export default function InvoiceViewPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || typeof token !== "string") return;
    fetch(`/api/invoice/view?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else {
          setData(res);
        }
      })
      .catch(() => setError("Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  if (error || !data?.invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Invoice not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const inv = data.invoice;
  const isPaid = inv.payment_status === "paid";

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="border-b">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold">Invoice {inv.invoice_number}</h1>
                <p className="text-muted-foreground">{inv.business?.name}</p>
              </div>
              <Badge variant={isPaid ? "default" : "secondary"} className={isPaid ? "bg-green-600" : ""}>
                {isPaid ? "Paid" : "Pending"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Billed to</p>
                <p className="font-medium">{inv.customer?.name}</p>
                <p className="text-sm">{inv.customer?.email}</p>
                {inv.customer?.phone && <p className="text-sm">{inv.customer.phone}</p>}
                {inv.billing_address && <p className="text-sm mt-1">{inv.billing_address}</p>}
              </div>
              <div className="text-right sm:text-left">
                <p className="text-sm text-muted-foreground">Issue date: {inv.issue_date}</p>
                {inv.due_date && <p className="text-sm text-muted-foreground">Due date: {inv.due_date}</p>}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-right p-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.invoice_bookings?.map((ib, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3">
                        {ib.bookings?.service || "Booking"}
                        {ib.bookings?.scheduled_date && ` — ${ib.bookings.scheduled_date || ib.bookings.date}`}
                      </td>
                      <td className="p-3 text-right">${Number(ib.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                  {inv.invoice_line_items?.map((li, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3">
                        {li.description} ({li.quantity} × ${Number(li.unit_price).toFixed(2)})
                      </td>
                      <td className="p-3 text-right">${Number(li.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">${Number(inv.total_amount).toFixed(2)}</p>
                {isPaid && inv.amount_paid > 0 && (
                  <p className="text-sm text-green-600">Amount paid: ${Number(inv.amount_paid).toFixed(2)}</p>
                )}
              </div>
            </div>

            {inv.description && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">{inv.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
