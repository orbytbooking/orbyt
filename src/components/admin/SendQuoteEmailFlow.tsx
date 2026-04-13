"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import {
  buildQuoteEmailHtml,
  buildQuoteEmailPayloadFromBooking,
  defaultQuoteEmailSubject,
} from "@/lib/quoteEmailTemplate";
import { cn } from "@/lib/utils";

export type SendQuoteBooking = {
  id: string;
  customer_name?: string;
  customer_email?: string;
  /** Saved on the booking (e.g. add-booking, Change expiration, or last send). */
  draft_quote_expires_on?: string | null;
};

function initialExpiresDateFromBooking(booking: SendQuoteBooking | null): Date {
  if (!booking) return addDays(new Date(), 31);
  const raw = booking.draft_quote_expires_on;
  if (raw == null || raw === "") return addDays(new Date(), 31);
  const s = String(raw).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return addDays(new Date(), 31);
  const d = parseISO(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return addDays(new Date(), 31);
  return startOfDay(d);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: SendQuoteBooking | null;
  businessId: string;
  businessName: string;
  businessEmail?: string | null;
  businessWebsite?: string | null;
  industryName?: string | null;
};

export function SendQuoteEmailFlow({
  open,
  onOpenChange,
  booking,
  businessId,
  businessName,
  businessEmail,
  businessWebsite,
  industryName,
}: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<"configure" | "preview">("configure");
  const [to, setTo] = useState("");
  const [expiresDate, setExpiresDate] = useState<Date>(() => addDays(new Date(), 31));
  const [expiresOpen, setExpiresOpen] = useState(false);
  const [sendReminder, setSendReminder] = useState(false);
  // Keep empty until the user checks + selects a number (so it's not "auto 01").
  const [reminderDays, setReminderDays] = useState("");
  const [includeOffer, setIncludeOffer] = useState(false);
  const [offerType, setOfferType] = useState<"fixed" | "percentage">("percentage");
  const [offerValue, setOfferValue] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("configure");
      return;
    }
    if (booking) {
      setTo(String(booking.customer_email ?? "").trim());
      setExpiresDate(initialExpiresDateFromBooking(booking));
      setSendReminder(false);
      setReminderDays("");
      setIncludeOffer(false);
      setOfferType("percentage");
      setOfferValue("");
      setSubject(defaultQuoteEmailSubject(businessName || "Our business"));
    }
  }, [open, booking?.id, booking?.draft_quote_expires_on, businessName, booking]);

  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const previewPayload = useMemo(() => {
    if (!booking || !businessId) return null;
    const days = Math.max(0, differenceInCalendarDays(startOfDay(expiresDate), startOfDay(new Date())));
    const expiresOnDisplay = `${format(expiresDate, "MM/dd/yyyy")} at 11:59 PM`;
    const rd = reminderDays ? parseInt(reminderDays, 10) : NaN;
    const offerN = offerValue ? parseFloat(offerValue) : NaN;
    return buildQuoteEmailPayloadFromBooking(booking as Record<string, unknown>, {
      businessName: businessName || "Our business",
      contactEmail: (businessEmail || "").trim() || "office@example.com",
      websiteUrl: businessWebsite,
      industryName,
      appOrigin,
      businessId,
      extras: {
        expiresOnDisplay,
        daysUntilExpiry: days,
        sendReminderAfterDays: sendReminder && Number.isFinite(rd) && rd > 0 ? rd : null,
        includeOffer,
        offerType,
        offerValue: includeOffer && Number.isFinite(offerN) && offerN > 0 ? offerN : null,
      },
    });
  }, [
    booking,
    businessId,
    businessName,
    businessEmail,
    businessWebsite,
    industryName,
    appOrigin,
    expiresDate,
    sendReminder,
    reminderDays,
    includeOffer,
    offerType,
    offerValue,
  ]);

  const previewHtml = useMemo(
    () => (previewPayload ? buildQuoteEmailHtml(previewPayload) : ""),
    [previewPayload]
  );

  const expiresHelperText = useMemo(() => {
    const days = Math.max(0, differenceInCalendarDays(startOfDay(expiresDate), startOfDay(new Date())));
    return `at 11:59 PM ( ${days} day(s) )`;
  }, [expiresDate]);

  const handleSavePreview = () => {
    const email = to.trim();
    if (!email) {
      toast({ title: "Recipient required", description: "Enter an email in To.", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid email", description: "Check the To address.", variant: "destructive" });
      return;
    }
    if (sendReminder && !reminderDays) {
      toast({
        title: "Reminder day required",
        description: "Select how many day(s) after to send the reminder.",
        variant: "destructive",
      });
      return;
    }
    if (includeOffer) {
      const n = offerValue ? parseFloat(offerValue) : NaN;
      if (!Number.isFinite(n) || n <= 0) {
        toast({ title: "Offer amount required", description: "Enter a valid offer amount.", variant: "destructive" });
        return;
      }
    }
    setStep("preview");
  };

  const handleSend = async () => {
    if (!booking?.id || !businessId) return;
    const email = to.trim();
    if (!email) {
      toast({ title: "Recipient required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({ title: "Not signed in", variant: "destructive" });
        setSending(false);
        return;
      }
      if (sendReminder && !reminderDays) {
        toast({
          title: "Reminder day required",
          description: "Select how many day(s) after to send the reminder.",
          variant: "destructive",
        });
        setSending(false);
        return;
      }
      const rd = reminderDays ? parseInt(reminderDays, 10) : NaN;
      const offerN = offerValue ? parseFloat(offerValue) : NaN;
      if (includeOffer && (!Number.isFinite(offerN) || offerN <= 0)) {
        toast({ title: "Offer amount required", description: "Enter a valid offer amount.", variant: "destructive" });
        setSending(false);
        return;
      }
      const res = await fetch("/api/admin/bookings/send-quote-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-business-id": businessId,
        },
        body: JSON.stringify({
          bookingId: booking.id,
          to: email,
          subject: subject.trim() || defaultQuoteEmailSubject(businessName || "Our business"),
          expiresOn: format(expiresDate, "yyyy-MM-dd"),
          sendReminder,
          sendReminderAfterDays: sendReminder && Number.isFinite(rd) ? rd : null,
          includeOffer,
          offerType,
          offerValue: includeOffer && Number.isFinite(offerN) ? offerN : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Send failed",
          description: typeof data.error === "string" ? data.error : "Could not send email.",
          variant: "destructive",
        });
        setSending(false);
        return;
      }
      toast({ title: "Quote sent", description: `Email sent to ${email}.` });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Network error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-lg [&>button]:text-red-600 [&>button]:hover:text-red-700 [&>button]:opacity-100",
          step === "preview" && "sm:max-w-3xl max-h-[92vh] flex flex-col"
        )}
      >
        {step === "configure" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-left text-slate-900 dark:text-slate-100">Send quote</DialogTitle>
            </DialogHeader>
            <div className="rounded-lg border border-border bg-muted/50 dark:bg-muted/30 p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quote-to">To</Label>
                <Input
                  id="quote-to"
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="customer@email.com"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Expires on</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Popover open={expiresOpen} onOpenChange={setExpiresOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal bg-background min-w-[200px]",
                          !expiresDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                        {expiresDate ? format(expiresDate, "MM/dd/yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={expiresDate}
                        onSelect={(d) => {
                          if (d) {
                            setExpiresDate(d);
                            setExpiresOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-sm text-muted-foreground">{expiresHelperText}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="quote-reminder"
                    checked={sendReminder}
                    onCheckedChange={(v) => setSendReminder(v === true)}
                  />
                  <Label htmlFor="quote-reminder" className="text-sm font-normal cursor-pointer">
                    Send reminder after
                  </Label>
                </div>
                <Select value={reminderDays} onValueChange={setReminderDays} disabled={!sendReminder}>
                  <SelectTrigger className="w-[72px] h-9 bg-background">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => {
                      const n = i + 1;
                      const pad = String(n).padStart(2, "0");
                      return (
                        <SelectItem key={n} value={pad}>
                          {pad}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">Day(s).</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="quote-offer"
                    checked={includeOffer}
                    onCheckedChange={(v) => setIncludeOffer(v === true)}
                  />
                  <Label htmlFor="quote-offer" className="text-sm font-normal cursor-pointer">
                    Offer
                  </Label>
                </div>

                {includeOffer && (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        $
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={offerValue}
                        onChange={(e) => setOfferValue(e.target.value)}
                        placeholder="Amount"
                        className="pl-7 w-[160px] bg-background"
                      />
                    </div>

                    <Select value={offerType} onValueChange={(v) => setOfferType(v as "fixed" | "percentage")}>
                      <SelectTrigger className="w-[90px] h-9 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">$</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" onClick={handleSavePreview} className="bg-blue-600 hover:bg-blue-700 text-white">
                Save &amp; Preview
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-left">Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 min-h-0 flex-1 flex flex-col overflow-hidden">
              <div className="space-y-2 shrink-0">
                <Label htmlFor="quote-subject">Subject</Label>
                <Input
                  id="quote-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2 min-h-0 flex-1 flex flex-col">
                <Label>Message</Label>
                <div className="border rounded-md bg-white dark:bg-slate-950 overflow-hidden flex-1 min-h-[280px] max-h-[min(55vh,520px)]">
                  <iframe
                    title="Quote email preview"
                    srcDoc={previewHtml}
                    className="w-full h-full min-h-[280px] border-0 bg-white"
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => setStep("configure")}>
                Edit
              </Button>
              <Button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {sending ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
