"use client";

import { useEffect, useState, useCallback } from "react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { CreateInvoiceDialog } from "@/components/admin/CreateInvoiceDialog";

type CustomerOption = { id: string; name: string; email: string; phone?: string; address?: string };

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
  provider_name: string | null;
  address: string | null;
  apt_no: string | null;
  zip_code: string | null;
  frequency: string | null;
};

export default function BookingChargesPage() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
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

  const postCharge = async (bookingId: string, method: "cash" | "online" | "void") => {
    setActing(bookingId);
    try {
      const res = await fetch(`/api/admin/booking-charges/${bookingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": currentBusiness!.id,
        },
        body: JSON.stringify({ method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (method === "online" && data.checkoutUrl) {
        await navigator.clipboard.writeText(data.checkoutUrl);
        toast.success("Payment link copied to clipboard. Send it to the customer.");
        window.open(data.checkoutUrl, "_blank", "noopener");
      } else {
        toast.success(data.message || "Done");
      }
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
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
          body: JSON.stringify({ method: "online" }),
        });
        const data = await res.json();
        if (res.ok && data.checkoutUrl) {
          done++;
          if (done === 1) {
            await navigator.clipboard.writeText(data.checkoutUrl);
            window.open(data.checkoutUrl, "_blank", "noopener");
          }
        }
      } catch {
        /* ignore per-item */
      }
    }
    setBatchActing(false);
    setSelectedIds(new Set());
    fetchBookings();
    toast.success(
      done > 0
        ? `Payment link for first booking copied. ${done}/${ids.length} processed.`
        : "Failed to generate payment links."
    );
  };

  const formatDate = (d?: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "2-digit", day: "2-digit", year: "numeric" }) : "";
  const formatTime = (t?: string | null) =>
    t ? (String(t).includes(":") ? String(t).slice(0, 5) : String(t)) : "";
  const formatPrice = (p: number) => `$${Number(p || 0).toFixed(2)}`;
  const locationStr = (b: PendingBooking) => {
    const parts = [b.apt_no, b.address, b.zip_code].filter(Boolean);
    return parts.join(", ") || "—";
  };

  const pendingBookings = tab === "pending" ? bookings : bookings.filter((b) => b.payment_status === "pending");
  const canChargeSelected = pendingBookings.length > 0 && selectedIds.size > 0;

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
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/customers")}>
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
                <TableHead>Service date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Booking details</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
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
                    {formatDate(b.scheduled_date)} {formatTime(b.scheduled_time)}
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
                    <span className="text-sm">Booking id - {String(b.id).slice(0, 8)}...</span>
                    <Button
                      variant="link"
                      className="h-auto p-0 ml-1 text-cyan-600"
                      onClick={() => router.push(`/admin/bookings?id=${b.id}`)}
                    >
                      View more
                    </Button>
                  </TableCell>
                  <TableCell>{b.provider_name || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={locationStr(b)}>
                    {locationStr(b)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatPrice(b.total_price)}</p>
                      {b.payment_method === "online" && (
                        <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                          CC
                        </span>
                      )}
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
                              Charge <ChevronDown className="h-4 w-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/bookings?id=${b.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View booking
                        </DropdownMenuItem>
                        {b.payment_status === "pending" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => postCharge(b.id, "void")}
                              className="text-amber-600"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Void payment
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => postCharge(b.id, "online")}>
                              <Link2 className="h-4 w-4 mr-2" />
                              Send payment link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => postCharge(b.id, "cash")}>
                              <Banknote className="h-4 w-4 mr-2" />
                              Mark cash/check
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

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
