"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Search,
  UserCircle2,
  Link as LinkIcon,
  PauseCircle,
  Eye,
  Calendar,
  PlayCircle,
} from "lucide-react";

type ProviderPayment = {
  id: string;
  name: string;
  email: string;
  pendingAmount: number;
  pendingCount: number;
  paidAmount: number;
  paidCount: number;
  payoutPaused: boolean;
};

type ProviderPaymentLog = {
  id: string;
  providerId: string;
  providerName: string;
  earningsCount: number;
  totalAmount: number;
  payoutDate: string;
  payoutMethod: string;
  payoutStatus: string;
  createdAt: string;
};

type ProviderPayoutJob = {
  id: string;
  bookingId: string;
  date: string;
  service: string;
  customerName: string;
  bookingStatus: string;
  payoutStatus: string;
  amount: number;
  createdAt: string;
};

export default function ProviderPaymentsPage() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const [providers, setProviders] = useState<ProviderPayment[]>([]);
  const [logs, setLogs] = useState<ProviderPaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [jobsProviderName, setJobsProviderName] = useState<string>("");
  const [jobsDialogOpen, setJobsDialogOpen] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobs, setJobs] = useState<ProviderPayoutJob[]>([]);

  const fetchProviders = async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/provider-payments?businessId=${currentBusiness.id}`, {
        headers: { "x-business-id": currentBusiness.id },
      });
      const data = await res.json();
      setProviders(data.providers ?? []);
      setLogs(data.logs ?? []);
    } catch {
      setProviders([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [currentBusiness?.id]);

  const handlePay = async (providerId: string) => {
    setPaying(providerId);
    try {
      const res = await fetch(`/api/admin/provider-payments/${providerId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": currentBusiness!.id,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(data.message || "Marked as paid");
      fetchProviders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPaying(null);
    }
  };

  const filteredProviders = providers.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  const toggleProviderSelection = (providerId: string) => {
    setSelectedProviderIds((prev) =>
      prev.includes(providerId) ? prev.filter((id) => id !== providerId) : [...prev, providerId]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredProviders.map((p) => p.id);
    const allSelected = visibleIds.every((id) => selectedProviderIds.includes(id));
    if (allSelected) {
      setSelectedProviderIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedProviderIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const totalDueSelectedRange = filteredProviders.reduce((sum, p) => sum + p.pendingAmount, 0);
  const selectedDue = filteredProviders
    .filter((p) => selectedProviderIds.includes(p.id))
    .reduce((sum, p) => sum + p.pendingAmount, 0);

  const handleBulkPaySelected = async () => {
    const payable = filteredProviders.filter(
      (p) => selectedProviderIds.includes(p.id) && p.pendingCount > 0 && !p.payoutPaused
    );
    if (payable.length === 0) {
      toast.error("No selected providers with pending payouts.");
      return;
    }

    for (const p of payable) {
      // Sequential by design to avoid overloading API and keep toasts predictable.
      await handlePay(p.id);
    }
  };

  const handlePauseToggle = async (providerId: string, paused: boolean) => {
    if (!currentBusiness?.id) return;
    try {
      const res = await fetch(`/api/admin/provider-payments/${providerId}/pause`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": currentBusiness.id,
        },
        body: JSON.stringify({ paused }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update pause state");
      toast.success(data.message || (paused ? "Provider payouts paused." : "Provider payouts resumed."));
      fetchProviders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleOpenJobs = async (providerId: string, providerName: string) => {
    if (!currentBusiness?.id) return;
    setJobsProviderName(providerName);
    setJobsDialogOpen(true);
    setJobsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const res = await fetch(`/api/admin/provider-payments/${providerId}/jobs?${params.toString()}`, {
        headers: { "x-business-id": currentBusiness.id },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch jobs");
      setJobs(data.jobs ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to fetch jobs");
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Provider Payments</h1>
        <p className="text-muted-foreground mt-1 dark:text-white">
          Send payouts to providers. Mark pending earnings as paid after you process payment.
        </p>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="logs">Payment Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-1 relative">
                <Calendar className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  className="pl-9"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="lg:col-span-1">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="lg:col-span-1 relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <Card className="bg-muted/20">
              <CardContent className="p-5">
                <h2 className="text-3xl font-semibold mb-2">Payments</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  All payments for the selected date range are calculated and displayed here.
                  You can alter the amount or add notes to the total, as well as pause payment
                  for later. If your provider has a Stripe account, you can connect it in their
                  profile and then use the pay button to transmit their payment automatically.
                </p>
              </CardContent>
            </Card>
          </div>

          {providers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No providers found.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleBulkPaySelected}
                    disabled={!!paying || selectedProviderIds.length === 0}
                  >
                    Make Payment For Selected
                  </Button>
                  <div className="text-sm sm:text-base">
                    Total amount due for selected date range:{" "}
                    <span className="font-bold text-xl align-middle">${totalDueSelectedRange.toFixed(2)}</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-3 w-[36px]">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={
                              filteredProviders.length > 0 &&
                              filteredProviders.every((p) => selectedProviderIds.includes(p.id))
                            }
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th className="text-left p-3 font-semibold">Name/Email</th>
                        <th className="text-left p-3 font-semibold">Amount due for selected date range</th>
                        <th className="text-left p-3 font-semibold">Amount owed up to current date</th>
                        <th className="text-right p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProviders.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="p-3 align-top">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={selectedProviderIds.includes(p.id)}
                              onChange={() => toggleProviderSelection(p.id)}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-start gap-3">
                              <UserCircle2 className="h-10 w-10 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="font-semibold">{p.name}</p>
                                <p className="text-muted-foreground">{p.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 align-top">
                            <div className="font-semibold text-rose-600">${p.pendingAmount.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">{p.pendingCount} pending jobs</div>
                          </td>
                          <td className="p-3 align-top">
                            <div className="font-semibold">${(p.pendingAmount + p.paidAmount).toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">{p.paidCount} paid jobs</div>
                          </td>
                          <td className="p-3 align-top text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="font-medium">
                                  Options <ChevronDown className="ml-1.5 h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/admin/providers/${p.id}`)}
                                >
                                  <LinkIcon className="mr-2 h-4 w-4" />
                                  Connect Payment Method
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handlePauseToggle(p.id, !p.payoutPaused)}
                                >
                                  {p.payoutPaused ? (
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                  ) : (
                                    <PauseCircle className="mr-2 h-4 w-4" />
                                  )}
                                  {p.payoutPaused ? "Resume" : "Pause"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={!!paying || p.pendingCount <= 0 || p.payoutPaused}
                                  onClick={() => handlePay(p.id)}
                                >
                                  {paying === p.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Banknote className="mr-2 h-4 w-4" />
                                  )}
                                  Check/Cash
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenJobs(p.id, p.name)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Job Listing
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-5 py-3 border-t text-sm text-muted-foreground">
                  Selected providers: <span className="font-medium text-foreground">{selectedProviderIds.length}</span>
                  {" · "}Selected payout total: <span className="font-medium text-foreground">${selectedDue.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Payment Logs</h2>
                <p className="text-sm text-muted-foreground">Recent provider payout history and audit trail.</p>
              </div>

              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment logs yet.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-md border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{log.providerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()} · {log.earningsCount} jobs · payout date {log.payoutDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">${log.totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.payoutMethod} · {log.payoutStatus}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={jobsDialogOpen} onOpenChange={setJobsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Job Listing - {jobsProviderName || "Provider"}</DialogTitle>
            <DialogDescription>
              Earnings jobs for current filter range{startDate || endDate ? ` (${startDate || "start"} to ${endDate || "end"})` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto border rounded-md">
            {jobsLoading ? (
              <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No jobs found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Service</th>
                    <th className="text-left p-3">Booking</th>
                    <th className="text-left p-3">Payout</th>
                    <th className="text-right p-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-t">
                      <td className="p-3">{job.date}</td>
                      <td className="p-3">{job.customerName}</td>
                      <td className="p-3">{job.service}</td>
                      <td className="p-3 capitalize">{job.bookingStatus}</td>
                      <td className="p-3 capitalize">{job.payoutStatus}</td>
                      <td className="p-3 text-right font-medium">${job.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
