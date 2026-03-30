"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import {
  DollarSign,
  Loader2,
  Banknote,
  ChevronDown,
  Eye,
  Ban,
  Link2,
  Plus,
  Search,
  Copy,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter, useSearchParams } from "next/navigation";
import { CreateInvoiceDialog } from "@/components/admin/CreateInvoiceDialog";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";

type CustomerOption = { id: string; name: string; email: string; phone?: string; address?: string };
type ConfirmActionType = "view_booking" | "view_logs" | "add_lead" | "send_add_card" | "revert_pending";

type PendingBooking = {
  id: string;
  service: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  total_price: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  payment_method: string | null;
  payment_status: string | null;
  card_last4?: string | null;
  card_brand?: string | null;
  provider_name: string | null;
  address: string | null;
  apt_no: string | null;
  zip_code: string | null;
  frequency: string | null;
};

function bookingChargeStatusBadge(b: PendingBooking) {
  const ps = String(b.payment_status ?? "").toLowerCase();
  const pm = String(b.payment_method ?? "").toLowerCase();

  if (ps === "paid") {
    return (
      <Badge className="border-transparent bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
        Paid
      </Badge>
    );
  }
  if (ps === "voided") {
    return (
      <Badge variant="secondary" className="border-transparent bg-slate-200 text-slate-800 hover:bg-slate-200">
        Voided
      </Badge>
    );
  }
  if (ps === "declined") {
    return (
      <Badge variant="destructive" className="font-semibold">
        Declined
      </Badge>
    );
  }
  if (ps === "refunded") {
    return (
      <Badge className="border-transparent bg-violet-100 text-violet-900 hover:bg-violet-100">
        Refunded
      </Badge>
    );
  }
  if (ps === "pending") {
    if (pm === "online") {
      return (
        <Badge className="border-transparent bg-amber-100 text-amber-900 hover:bg-amber-100">
          Link sent
        </Badge>
      );
    }
    return (
      <Badge className="border-transparent bg-yellow-50 text-yellow-900 border-yellow-200/80 hover:bg-yellow-50">
        Unpaid
      </Badge>
    );
  }

  const label = ps ? ps.charAt(0).toUpperCase() + ps.slice(1) : "—";
  return (
    <Badge variant="outline" className="font-normal">
      {label}
    </Badge>
  );
}

export default function BookingChargesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prechargeScrollTarget = useRef<string | null>(null);
  const lastPrechargeHandled = useRef<string | null>(null);
  const { currentBusiness } = useBusiness();
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [refundConfirmId, setRefundConfirmId] = useState<string | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{ booking: PendingBooking; type: ConfirmActionType } | null>(null);
  const [tipModalBooking, setTipModalBooking] = useState<PendingBooking | null>(null);
  const [tipAmount, setTipAmount] = useState("");
  const [tipMethod, setTipMethod] = useState<"existing_card" | "new_card" | "cash_check">("new_card");
  const [tipExcludeNotification, setTipExcludeNotification] = useState(false);
  const [tipClientSecret, setTipClientSecret] = useState<string | null>(null);
  const [tipPaymentIntentId, setTipPaymentIntentId] = useState<string | null>(null);
  const [tipStripePromise, setTipStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [tipIntentLoading, setTipIntentLoading] = useState(false);
  const [tipCardComplete, setTipCardComplete] = useState(false);
  const [tipStripeInstance, setTipStripeInstance] = useState<Stripe | null>(null);
  const [tipElementsInstance, setTipElementsInstance] = useState<StripeElements | null>(null);
  const [tipIntentAmountCents, setTipIntentAmountCents] = useState<number | null>(null);
  const [additionalModalBooking, setAdditionalModalBooking] = useState<PendingBooking | null>(null);
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");
  const [additionalMethod, setAdditionalMethod] = useState<"existing_card" | "new_card">("new_card");
  const [additionalExcludeNotification, setAdditionalExcludeNotification] = useState(false);
  const [additionalClientSecret, setAdditionalClientSecret] = useState<string | null>(null);
  const [additionalPaymentIntentId, setAdditionalPaymentIntentId] = useState<string | null>(null);
  const [additionalStripePromise, setAdditionalStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [additionalIntentLoading, setAdditionalIntentLoading] = useState(false);
  const [additionalCardComplete, setAdditionalCardComplete] = useState(false);
  const [additionalStripeInstance, setAdditionalStripeInstance] = useState<Stripe | null>(null);
  const [additionalElementsInstance, setAdditionalElementsInstance] = useState<StripeElements | null>(null);
  const [additionalIntentAmountCents, setAdditionalIntentAmountCents] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState("pending");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [search, setSearch] = useState("");
  const [frequency, setFrequency] = useState<string>("all");
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [batchActing, setBatchActing] = useState(false);
  const [paymentLinkModal, setPaymentLinkModal] = useState<{
    url: string;
    emailedTo?: string;
  } | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId: currentBusiness.id, tab });
      if (dateFrom) params.set("dateFrom", dateFrom.toISOString().split("T")[0]);
      if (dateTo) params.set("dateTo", dateTo.toISOString().split("T")[0]);
      if (search.trim()) params.set("search", search.trim());
      if (frequency && frequency !== "all") params.set("frequency", frequency);
      const res = await fetch(`/api/admin/booking-charges?${params}`, {
        headers: { "x-business-id": currentBusiness.id },
      });
      const data = await res.json();
      setBookings(data.bookings ?? []);
      setSelectedIds(new Set());
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, tab, dateFrom, dateTo, search, frequency]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Deep link: /admin/booking-charges?precharge=<bookingId> — show All charges, filter by id, scroll to row
  useEffect(() => {
    const id = searchParams.get("precharge")?.trim();
    if (!id || !currentBusiness?.id) return;
    if (lastPrechargeHandled.current === id) return;
    lastPrechargeHandled.current = id;
    prechargeScrollTarget.current = id;
    setTab("all");
    setSearch(id);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("precharge");
    const q = params.toString();
    router.replace(`/admin/booking-charges${q ? `?${q}` : ""}`, { scroll: false });
  }, [searchParams, currentBusiness?.id, router]);

  useEffect(() => {
    const id = prechargeScrollTarget.current;
    if (!id || loading) return;
    const row = bookings.find((b) => String(b.id) === String(id));
    if (!row) {
      toast.error(
        "No matching charge for this booking. Only completed jobs appear in booking charges."
      );
      prechargeScrollTarget.current = null;
      return;
    }
    const t = window.setTimeout(() => {
      const el = document.querySelector(`[data-booking-charge-row="${id}"]`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      prechargeScrollTarget.current = null;
    }, 100);
    return () => window.clearTimeout(t);
  }, [loading, bookings]);

  useEffect(() => {
    if (!addChargeOpen || !currentBusiness?.id) return;
    fetch(`/api/customers?business_id=${currentBusiness.id}`)
      .then((r) => r.json())
      .then((data) => setCustomers(data.data ?? []))
      .catch(() => setCustomers([]));
  }, [addChargeOpen, currentBusiness?.id]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === bookings.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(bookings.map((b) => b.id)));
  };

  const postCharge = async (
    bookingId: string,
    method: "cash" | "online" | "void" | "refund" | "revert_pending" | "tip" | "additional_charge",
    onlineOpts?: {
      sendEmail?: boolean;
      tipAmount?: number;
      additionalAmount?: number;
      tipCollectionMethod?: "existing_card" | "new_card" | "cash_check";
      excludeNotification?: boolean;
      paymentIntentId?: string;
      note?: string;
    }
  ) => {
    setActing(bookingId);
    try {
      const payload: {
        method: string;
        sendEmail?: boolean;
        tipAmount?: number;
        additionalAmount?: number;
        tipCollectionMethod?: "existing_card" | "new_card" | "cash_check";
        excludeNotification?: boolean;
        paymentIntentId?: string;
        note?: string;
      } = { method };
      if (method === "online") {
        payload.sendEmail = onlineOpts?.sendEmail !== false;
      }
      if (method === "tip") {
        payload.tipAmount = Number(onlineOpts?.tipAmount ?? 0);
        payload.tipCollectionMethod = onlineOpts?.tipCollectionMethod ?? "new_card";
        payload.excludeNotification = onlineOpts?.excludeNotification === true;
        if (onlineOpts?.paymentIntentId) payload.paymentIntentId = onlineOpts.paymentIntentId;
      }
      if (method === "additional_charge") {
        payload.additionalAmount = Number(onlineOpts?.additionalAmount ?? 0);
        payload.excludeNotification = onlineOpts?.excludeNotification === true;
        if (onlineOpts?.paymentIntentId) payload.paymentIntentId = onlineOpts.paymentIntentId;
        if (onlineOpts?.note) payload.note = onlineOpts.note;
      }
      const res = await fetch(`/api/admin/booking-charges/${bookingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": currentBusiness!.id,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (method === "online") {
        if (typeof data.checkoutUrl === "string" && data.checkoutUrl) {
          setPaymentLinkModal({
            url: data.checkoutUrl,
            emailedTo: typeof data.emailedTo === "string" ? data.emailedTo : undefined,
          });
        }
        toast.success(
          data.message ||
            (onlineOpts?.sendEmail === false
              ? "Payment link ready."
              : "Payment link sent by email.")
        );
        await fetchBookings();
      } else if (method === "tip") {
        if (typeof data.checkoutUrl === "string" && data.checkoutUrl) {
          setPaymentLinkModal({
            url: data.checkoutUrl,
            emailedTo: typeof data.emailedTo === "string" ? data.emailedTo : undefined,
          });
        }
        toast.success(data.message || "Tip updated");
        await fetchBookings();
      } else if (method === "additional_charge") {
        toast.success(data.message || "Additional charge updated");
        await fetchBookings();
      } else if (method === "refund" || method === "revert_pending") {
        toast.success(data.message || "Refunded");
        await fetchBookings();
      } else {
        toast.success(data.message || "Done");
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(null);
    }
  };

  const handleBatchCharge = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("Select at least one booking");
      return;
    }
    setBatchActing(true);
    let done = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/admin/booking-charges/${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-business-id": currentBusiness!.id,
          },
          body: JSON.stringify({ method: "online", sendEmail: true }),
        });
        const data = await res.json();
        if (res.ok) done++;
      } catch {
        /* ignore per-item */
      }
    }
    setBatchActing(false);
    setSelectedIds(new Set());
    fetchBookings();
    toast.success(
      done > 0
        ? `Payment link emailed for ${done} of ${ids.length} booking(s).`
        : "No payment links were emailed. Check customer emails and Resend configuration."
    );
  };

  const formatDate = (d?: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "2-digit", day: "2-digit", year: "numeric" }) : "";
  const formatShortDate = (d?: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "";
  const formatTime = (t?: string | null) =>
    t ? (String(t).includes(":") ? String(t).slice(0, 5) : String(t)) : "";
  const formatPrice = (p: number) => `$${Number(p || 0).toFixed(2)}`;
  const locationStr = (b: PendingBooking) => {
    const parts = [b.apt_no, b.address, b.zip_code].filter(Boolean);
    return parts.join(", ") || "—";
  };

  const pendingBookings = tab === "pending" ? bookings : bookings.filter((b) => b.payment_status === "pending");
  const canChargeSelected = pendingBookings.length > 0 && selectedIds.size > 0;
  const confirmTitleMap: Record<ConfirmActionType, string> = {
    view_booking: "View booking",
    view_logs: "View logs",
    add_lead: "Add to leads funnel",
    send_add_card: 'Send "add card" link',
    revert_pending: "Revert to pending",
  };
  const runConfirmedAction = async () => {
    if (!actionConfirm) return;
    const { booking, type } = actionConfirm;
    setActionConfirm(null);
    if (type === "view_booking") {
      router.push(`/admin/bookings?id=${booking.id}`);
      return;
    }
    if (type === "view_logs") {
      router.push(`/admin/logs?bookingId=${encodeURIComponent(booking.id)}`);
      return;
    }
    if (type === "add_lead") {
      router.push(`/admin/leads?bookingId=${encodeURIComponent(booking.id)}`);
      return;
    }
    if (type === "send_add_card") {
      await postCharge(booking.id, "online");
      return;
    }
    if (type === "revert_pending") {
      await postCharge(booking.id, "revert_pending");
    }
  };

  const createTipIntent = async (bookingId: string, amount: number) => {
    if (!currentBusiness?.id) throw new Error("Business is not selected");
    const res = await fetch(`/api/admin/booking-charges/${bookingId}/tip-intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-business-id": currentBusiness.id,
      },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to initialize Stripe tip payment");

    const publishableKey = String(data.publishableKey ?? "").trim();
    if (!publishableKey) throw new Error("Stripe publishable key is missing");
    const connectAccount = typeof data.stripeConnectAccountId === "string" ? data.stripeConnectAccountId : null;
    const stripeLoader = loadStripe(
      publishableKey,
      connectAccount ? { stripeAccount: connectAccount } : undefined
    );
    setTipStripePromise(stripeLoader);
    setTipClientSecret(data.clientSecret);
    setTipPaymentIntentId(data.paymentIntentId);
    setTipIntentAmountCents(Math.round(amount * 100));
    return {
      clientSecret: String(data.clientSecret),
      paymentIntentId: String(data.paymentIntentId),
    };
  };

  const createAdditionalIntent = async (bookingId: string, amount: number) => {
    if (!currentBusiness?.id) throw new Error("Business is not selected");
    const res = await fetch(`/api/admin/booking-charges/${bookingId}/additional-intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-business-id": currentBusiness.id,
      },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to initialize Stripe additional payment");

    const publishableKey = String(data.publishableKey ?? "").trim();
    if (!publishableKey) throw new Error("Stripe publishable key is missing");
    const connectAccount = typeof data.stripeConnectAccountId === "string" ? data.stripeConnectAccountId : null;
    const stripeLoader = loadStripe(
      publishableKey,
      connectAccount ? { stripeAccount: connectAccount } : undefined
    );
    setAdditionalStripePromise(stripeLoader);
    setAdditionalClientSecret(data.clientSecret);
    setAdditionalPaymentIntentId(data.paymentIntentId);
    setAdditionalIntentAmountCents(Math.round(amount * 100));
    return {
      clientSecret: String(data.clientSecret),
      paymentIntentId: String(data.paymentIntentId),
    };
  };

  useEffect(() => {
    const row = tipModalBooking;
    if (!row) return;
    if (tipMethod === "cash_check") return;

    const amt = Number(tipAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setTipClientSecret(null);
      setTipPaymentIntentId(null);
      setTipIntentAmountCents(null);
      return;
    }

    const cents = Math.round(amt * 100);
    if (cents < 50) return;
    if (tipClientSecret && tipPaymentIntentId && tipIntentAmountCents === cents && tipStripePromise) return;

    const t = setTimeout(() => {
      setTipIntentLoading(true);
      createTipIntent(row.id, amt)
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Failed to load Stripe");
        })
        .finally(() => setTipIntentLoading(false));
    }, 450);

    return () => clearTimeout(t);
  }, [
    tipModalBooking,
    tipAmount,
    tipMethod,
    tipClientSecret,
    tipPaymentIntentId,
    tipIntentAmountCents,
    tipStripePromise,
  ]);

  useEffect(() => {
    const row = additionalModalBooking;
    if (!row) return;
    const amt = Number(additionalAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setAdditionalClientSecret(null);
      setAdditionalPaymentIntentId(null);
      setAdditionalIntentAmountCents(null);
      return;
    }

    const cents = Math.round(amt * 100);
    if (cents < 50) return;
    if (
      additionalClientSecret &&
      additionalPaymentIntentId &&
      additionalIntentAmountCents === cents &&
      additionalStripePromise
    ) {
      return;
    }

    const t = setTimeout(() => {
      setAdditionalIntentLoading(true);
      createAdditionalIntent(row.id, amt)
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Failed to load Stripe");
        })
        .finally(() => setAdditionalIntentLoading(false));
    }, 450);

    return () => clearTimeout(t);
  }, [
    additionalModalBooking,
    additionalAmount,
    additionalClientSecret,
    additionalPaymentIntentId,
    additionalIntentAmountCents,
    additionalStripePromise,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground mt-1">Booking Charges</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center gap-2 border-b">
          <TabsList className="h-10 p-0 bg-transparent border-0">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="declined">Declined</TabsTrigger>
            <TabsTrigger value="all">All charges</TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="sm" disabled>
            Card hold(s)/Decline
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/booking-charges/invoices")}>
            Invoices
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2 border-b pb-2">
          <Button variant="ghost" size="sm" className="text-cyan-700">
            Bookings
          </Button>
          <Button variant="ghost" size="sm" disabled>
            Separate
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/booking-charges/invoices")}>
            Invoices
          </Button>
        </div>

        <TabsContent value="pending" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                All completed jobs are placed here ready to be charged. If you want to charge someone&apos;s credit
                card you can do so by clicking the Charge button. If you wish to void the payment you can do so by
                clicking the void option. That option will charge the job $0 automatically. It is good for jobs that
                were done but are not being charged anything. If you were paid by cash or check you can click the
                cash/check option and the customer will not be charged even if their card is on file.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="One-time">One-time</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <DatePicker date={dateFrom} onSelect={setDateFrom} className="w-[180px]" />
                  <DatePicker date={dateTo} onSelect={setDateTo} className="w-[180px]" />
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, phone, id or address"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 w-[280px]"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={!canChargeSelected || batchActing}
                    onClick={handleBatchCharge}
                  >
                    {batchActing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <DollarSign className="h-4 w-4 mr-2" />
                    )}
                    Charge selected
                  </Button>
                  <Button variant="outline" onClick={() => setAddChargeOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add charge
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="declined" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="One-time">One-time</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <DatePicker date={dateFrom} onSelect={setDateFrom} className="w-[180px]" />
                <DatePicker date={dateTo} onSelect={setDateTo} className="w-[180px]" />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone, id or address"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-[280px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-2xl font-semibold">All charges</h3>
                <Button variant="outline" onClick={() => setAddChargeOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add charge
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                You can view all charges in this section and also refund each charge from this section.
              </p>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="One-time">One-time</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <DatePicker date={dateFrom} onSelect={setDateFrom} className="w-[180px]" />
                <DatePicker date={dateTo} onSelect={setDateTo} className="w-[180px]" />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone, id or address"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-[280px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {tab === "pending"
                ? "No pending charges."
                : tab === "declined"
                  ? "No declined charges."
                  : "No charges found."}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {tab === "pending" &&
                "Completed bookings with payment pending will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                {tab === "pending" && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === bookings.length && bookings.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Charged date</TableHead>
                <TableHead>Service date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Booking details</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-[260px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id} data-booking-charge-row={b.id}>
                  {tab === "pending" && (
                    <TableCell>
                      {b.payment_status === "pending" && (
                        <Checkbox
                          checked={selectedIds.has(b.id)}
                          onCheckedChange={() => toggleSelect(b.id)}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{formatShortDate(b.scheduled_date)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">{formatDate(b.scheduled_date)}</p>
                      <p className="text-muted-foreground">{formatTime(b.scheduled_time)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{b.customer_name || "—"}</p>
                      {b.customer_email && (
                        <p className="text-sm text-muted-foreground">{b.customer_email}</p>
                      )}
                      {b.customer_phone && (
                        <p className="text-sm text-muted-foreground">{b.customer_phone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Booking id - {String(b.id).slice(0, 8)}...</p>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Button variant="link" className="h-auto p-0 text-cyan-600">
                            View more
                          </Button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-72">
                          <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Booking id:</span> {String(b.id).slice(0, 8)}...</p>
                            <p><span className="text-muted-foreground">Phone:</span> {b.customer_phone || "—"}</p>
                            <p><span className="text-muted-foreground">Provider:</span> {b.provider_name || "—"}</p>
                            <p><span className="text-muted-foreground">Service:</span> {b.service || "—"}</p>
                            <p><span className="text-muted-foreground">Frequency:</span> {b.frequency || "—"}</p>
                            <p><span className="text-muted-foreground">Location:</span> {locationStr(b)}</p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatPrice(b.total_price)}</p>
                      <div className="flex flex-wrap items-center gap-1">
                        {b.payment_method === "online" ? (
                          <>
                            <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                              CC
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {b.card_last4 ? `(XXXX-${String(b.card_last4).toUpperCase()})` : ""}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Cash/Check</span>
                        )}
                        {bookingChargeStatusBadge(b)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={!!acting}>
                          {acting === b.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              Actions <ChevronDown className="h-4 w-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setActionConfirm({ booking: b, type: "view_booking" })}>
                          <Eye className="h-4 w-4 mr-2" />
                          View booking
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setAdditionalAmount("");
                            setAdditionalNote("");
                            setAdditionalMethod("new_card");
                            setAdditionalExcludeNotification(false);
                            setAdditionalClientSecret(null);
                            setAdditionalPaymentIntentId(null);
                            setAdditionalStripePromise(null);
                            setAdditionalCardComplete(false);
                            setAdditionalStripeInstance(null);
                            setAdditionalElementsInstance(null);
                            setAdditionalIntentAmountCents(null);
                            setAdditionalModalBooking(b);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Additional charge
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setTipAmount("");
                            setTipMethod("new_card");
                            setTipExcludeNotification(false);
                            setTipClientSecret(null);
                            setTipPaymentIntentId(null);
                            setTipStripePromise(null);
                            setTipCardComplete(false);
                            setTipStripeInstance(null);
                            setTipElementsInstance(null);
                            setTipModalBooking(b);
                          }}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Give tip
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setActionConfirm({ booking: b, type: "view_logs" })}>
                          <Eye className="h-4 w-4 mr-2" />
                          View logs
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setActionConfirm({ booking: b, type: "add_lead" })}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add to leads funnel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setActionConfirm({ booking: b, type: "send_add_card" })}>
                          <Link2 className="h-4 w-4 mr-2" />
                          Send "add card" link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={b.payment_status !== "paid"}
                          onClick={() => setRefundConfirmId(b.id)}
                          className="text-cyan-700"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Refund charge
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={b.payment_status === "pending"}
                          onClick={() => setActionConfirm({ booking: b, type: "revert_pending" })}
                        >
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Revert to pending
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!paymentLinkModal} onOpenChange={(open) => !open && setPaymentLinkModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment link</DialogTitle>
            <DialogDescription>
              Share this URL with your customer to pay. Each time you generate a link, a new checkout session is
              created; older links may stop working.
              {paymentLinkModal?.emailedTo ? (
                <>
                  {" "}
                  A copy was also emailed to <span className="font-medium text-foreground">{paymentLinkModal.emailedTo}</span>.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input readOnly value={paymentLinkModal?.url ?? ""} className="font-mono text-xs" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPaymentLinkModal(null)}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!paymentLinkModal?.url) return;
                try {
                  await navigator.clipboard.writeText(paymentLinkModal.url);
                  toast.success("Link copied to clipboard");
                } catch {
                  toast.error("Could not copy — select the link and copy manually");
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!refundConfirmId} onOpenChange={(open) => !open && setRefundConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refund charge</DialogTitle>
            <DialogDescription>
              This will refund the booking payment (Stripe refunds are processed automatically when possible).
              For cash/check or Authorize.net, this records the status as refunded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRefundConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const id = refundConfirmId;
                if (!id) return;
                setRefundConfirmId(null);
                await postCharge(id, "refund");
              }}
            >
              Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionConfirm} onOpenChange={(open) => !open && setActionConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{actionConfirm ? confirmTitleMap[actionConfirm.type] : "Confirm action"}</DialogTitle>
            <DialogDescription>
              {actionConfirm
                ? `Are you sure you want to ${confirmTitleMap[actionConfirm.type].toLowerCase()}?`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionConfirm(null)}>Cancel</Button>
            <Button onClick={runConfirmedAction}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tipModalBooking} onOpenChange={(open) => !open && setTipModalBooking(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tip</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Tip amount</Label>
              <div className="flex items-center rounded-md border">
                <div className="px-4 text-lg text-muted-foreground">$</div>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  placeholder="0"
                  className="border-0 shadow-none focus-visible:ring-0"
                />
              </div>
              {(!Number.isFinite(Number(tipAmount)) || Number(tipAmount) <= 0) && tipAmount !== "" && (
                <p className="text-sm text-red-500">Please enter a valid amount.</p>
              )}
            </div>

            <RadioGroup
              value={tipMethod}
              onValueChange={(v) => setTipMethod(v as "existing_card" | "new_card" | "cash_check")}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing_card" id="tip-existing-card" />
                <Label htmlFor="tip-existing-card" className="font-normal">Existing credit card</Label>
                <RadioGroupItem value="new_card" id="tip-new-card" className="ml-4" />
                <Label htmlFor="tip-new-card" className="font-normal">New credit card</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash_check" id="tip-cash-check" />
                <Label htmlFor="tip-cash-check" className="font-normal">Cash/check</Label>
              </div>
            </RadioGroup>

            {tipMethod !== "cash_check" && (
              <div className="space-y-2">
                <Label>Add new card</Label>
                <div className="flex flex-col gap-2">
                  <div className="rounded-md border px-3 py-3">
                    {tipStripePromise ? (
                      <Elements stripe={tipStripePromise}>
                        <InlineTipCardElement
                          onCompleteChange={setTipCardComplete}
                          onReady={(stripe, elements) => {
                            setTipStripeInstance(stripe);
                            setTipElementsInstance(elements);
                          }}
                        />
                      </Elements>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {tipIntentLoading ? "Loading Stripe…" : "Enter a valid amount to load card form."}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded border px-2 py-1">VISA</span>
                  <span className="rounded border px-2 py-1">Mastercard</span>
                  <span className="rounded border px-2 py-1">Discover</span>
                  <span className="rounded border px-2 py-1">AmEx</span>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={tipExcludeNotification}
                onCheckedChange={(v) => setTipExcludeNotification(Boolean(v))}
                id="tip-exclude-notify"
              />
              <Label htmlFor="tip-exclude-notify" className="font-normal">Exclude notification from being sent</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTipModalBooking(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                const row = tipModalBooking;
                const amount = Number(tipAmount);
                if (!row) return;
                if (!Number.isFinite(amount) || amount <= 0) {
                  toast.error("Enter a valid tip amount");
                  return;
                }
                if (tipMethod !== "cash_check") {
                  try {
                    const intent = { clientSecret: tipClientSecret, paymentIntentId: tipPaymentIntentId };
                    if (!intent.clientSecret || !intent.paymentIntentId) {
                      toast.error("Stripe is still loading. Enter amount and wait a moment.");
                      return;
                    }

                    const stripe = tipStripeInstance ?? (await tipStripePromise);
                    const elements = tipElementsInstance;
                    if (!stripe || !elements) {
                      toast.error("Stripe is loading. Try again in a second.");
                      return;
                    }
                    const card = elements.getElement(CardElement);
                    if (!card) {
                      toast.error("Card form is not ready");
                      return;
                    }
                    if (!tipCardComplete) {
                      toast.error("Complete card details first");
                      return;
                    }
                    const confirm = await stripe.confirmCardPayment(intent.clientSecret, {
                      payment_method: {
                        card,
                        billing_details: {
                          name: row.customer_name ?? undefined,
                          email: row.customer_email ?? undefined,
                        },
                      },
                    });
                    if (confirm.error) {
                      toast.error(confirm.error.message || "Stripe payment failed");
                      return;
                    }
                    if (confirm.paymentIntent?.status !== "succeeded") {
                      toast.error(`Payment did not complete (${confirm.paymentIntent?.status ?? "unknown"})`);
                      return;
                    }
                    setTipModalBooking(null);
                    await postCharge(row.id, "tip", {
                      tipAmount: amount,
                      tipCollectionMethod: tipMethod,
                      excludeNotification: tipExcludeNotification,
                      paymentIntentId: confirm.paymentIntent.id,
                    });
                    return;
                  } catch (e) {
                    setTipIntentLoading(false);
                    toast.error(e instanceof Error ? e.message : "Failed to initialize Stripe tip payment");
                    return;
                  } finally {
                    setTipIntentLoading(false);
                  }
                }
                setTipModalBooking(null);
                if (tipMethod === "cash_check") {
                  await postCharge(row.id, "tip", {
                    tipAmount: amount,
                    tipCollectionMethod: tipMethod,
                    excludeNotification: tipExcludeNotification,
                  });
                  return;
                }
              }}
              disabled={tipIntentLoading}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!additionalModalBooking} onOpenChange={(open) => !open && setAdditionalModalBooking(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Additional charge</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="flex items-center rounded-md border">
                <div className="px-4 text-lg text-muted-foreground">$</div>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={additionalAmount}
                  onChange={(e) => setAdditionalAmount(e.target.value)}
                  placeholder="0"
                  className="border-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input
                value={additionalNote}
                onChange={(e) => setAdditionalNote(e.target.value)}
                placeholder="Reason for additional charge"
              />
            </div>

            <RadioGroup
              value={additionalMethod}
              onValueChange={(v) => setAdditionalMethod(v as "existing_card" | "new_card")}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing_card" id="additional-existing-card" />
                <Label htmlFor="additional-existing-card" className="font-normal">Existing credit card</Label>
                <RadioGroupItem value="new_card" id="additional-new-card" className="ml-4" />
                <Label htmlFor="additional-new-card" className="font-normal">New credit card</Label>
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <Label>Add card</Label>
              <div className="rounded-md border px-3 py-3">
                {additionalStripePromise ? (
                  <Elements stripe={additionalStripePromise}>
                    <InlineTipCardElement
                      onCompleteChange={setAdditionalCardComplete}
                      onReady={(stripe, elements) => {
                        setAdditionalStripeInstance(stripe);
                        setAdditionalElementsInstance(elements);
                      }}
                    />
                  </Elements>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {additionalIntentLoading ? "Loading Stripe…" : "Enter a valid amount to load card form."}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={additionalExcludeNotification}
                onCheckedChange={(v) => setAdditionalExcludeNotification(Boolean(v))}
                id="additional-exclude-notify"
              />
              <Label htmlFor="additional-exclude-notify" className="font-normal">
                Exclude notification from being sent
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdditionalModalBooking(null)}>Cancel</Button>
            <Button
              disabled={additionalIntentLoading}
              onClick={async () => {
                const row = additionalModalBooking;
                const amount = Number(additionalAmount);
                if (!row) return;
                if (!Number.isFinite(amount) || amount <= 0) {
                  toast.error("Enter a valid additional charge amount");
                  return;
                }
                const intent = {
                  clientSecret: additionalClientSecret,
                  paymentIntentId: additionalPaymentIntentId,
                };
                if (!intent.clientSecret || !intent.paymentIntentId) {
                  toast.error("Stripe is still loading. Enter amount and wait a moment.");
                  return;
                }
                const stripe = additionalStripeInstance ?? (additionalStripePromise ? await additionalStripePromise : null);
                const elements = additionalElementsInstance;
                if (!stripe || !elements) {
                  toast.error("Stripe is loading. Try again in a second.");
                  return;
                }
                const card = elements.getElement(CardElement);
                if (!card) {
                  toast.error("Card form is not ready");
                  return;
                }
                if (!additionalCardComplete) {
                  toast.error("Complete card details first");
                  return;
                }
                setAdditionalIntentLoading(true);
                try {
                  const confirm = await stripe.confirmCardPayment(intent.clientSecret, {
                    payment_method: {
                      card,
                      billing_details: {
                        name: row.customer_name ?? undefined,
                        email: row.customer_email ?? undefined,
                      },
                    },
                  });
                  if (confirm.error) {
                    toast.error(confirm.error.message || "Stripe payment failed");
                    return;
                  }
                  if (confirm.paymentIntent?.status !== "succeeded") {
                    toast.error(`Payment did not complete (${confirm.paymentIntent?.status ?? "unknown"})`);
                    return;
                  }
                  setAdditionalModalBooking(null);
                  await postCharge(row.id, "additional_charge", {
                    additionalAmount: amount,
                    excludeNotification: additionalExcludeNotification,
                    paymentIntentId: confirm.paymentIntent.id,
                    note: additionalNote.trim() || undefined,
                  });
                } finally {
                  setAdditionalIntentLoading(false);
                }
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddChargeDialog
        open={addChargeOpen}
        onOpenChange={(v) => {
          setAddChargeOpen(v);
          if (!v) {
            setSelectedCustomer(null);
            setShowInvoiceDialog(false);
          }
        }}
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
        onCreateInvoice={() => setShowInvoiceDialog(true)}
        onInvoiceCreated={() => {}}
        businessId={currentBusiness?.id ?? null}
      />
      {selectedCustomer && (
        <CreateInvoiceDialog
          open={showInvoiceDialog}
          onOpenChange={setShowInvoiceDialog}
          onCreated={() => {
            setShowInvoiceDialog(false);
            setAddChargeOpen(false);
            setSelectedCustomer(null);
            fetchBookings();
          }}
          customer={{
            id: selectedCustomer.id,
            name: selectedCustomer.name,
            email: selectedCustomer.email,
            phone: selectedCustomer.phone,
            address: selectedCustomer.address,
          }}
          businessId={currentBusiness?.id ?? null}
        />
      )}
    </div>
  );
}

function AddChargeDialog({
  open,
  onOpenChange,
  customers,
  selectedCustomer,
  onSelectCustomer,
  onCreateInvoice,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customers: CustomerOption[];
  selectedCustomer: CustomerOption | null;
  onSelectCustomer: (c: CustomerOption | null) => void;
  onCreateInvoice: () => void;
  onInvoiceCreated: () => void;
  businessId: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add charge</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Select a customer to create an invoice.
        </p>
        <Select
          value={selectedCustomer?.id ?? ""}
          onValueChange={(id) =>
            onSelectCustomer(customers.find((c) => c.id === id) ?? null)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selectedCustomer}
            onClick={() => {
              if (selectedCustomer) onCreateInvoice();
            }}
          >
            Create invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InlineTipCardElement({
  onCompleteChange,
  onReady,
}: {
  onCompleteChange: (complete: boolean) => void;
  onReady: (stripe: Stripe | null, elements: StripeElements | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    onReady(stripe, elements);
  }, [stripe, elements, onReady]);

  return (
    <CardElement
      options={{
        hidePostalCode: true,
        style: {
          base: {
            fontSize: "16px",
            color: "#111827",
            "::placeholder": { color: "#9CA3AF" },
          },
        },
      }}
      onChange={(e) => onCompleteChange(!!e.complete)}
    />
  );
}
