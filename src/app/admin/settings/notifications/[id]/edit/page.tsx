"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotificationTemplateBodyEditor } from "@/components/admin/NotificationTemplateBodyEditor";
import { DEFAULT_MASTER_TEMPLATE_BODY_HTML } from "@/lib/notificationMasterTemplate";
import { substituteEmailPlaceholders } from "@/lib/emailTemplatePlaceholders";
import { useToast } from "@/components/ui/use-toast";

export default function EditNotificationTemplatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const templateId = typeof params.id === "string" ? params.id : "";
  const { currentBusiness, loading: businessLoading } = useBusiness();
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(DEFAULT_MASTER_TEMPLATE_BODY_HTML);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!templateId || !currentBusiness?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/notification-templates/${templateId}`, {
          credentials: "include",
          headers: { "x-business-id": currentBusiness.id },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Failed to load template");
        }
        const t = data.template as { name?: string; subject?: string; body?: string };
        if (cancelled) return;
        setName(t.name ?? "");
        setSubject(t.subject ?? "");
        setBody(t.body?.trim() ? t.body : DEFAULT_MASTER_TEMPLATE_BODY_HTML);
        setLoadState("ready");
      } catch (e) {
        if (!cancelled) {
          setLoadState("error");
          toast({
            title: "Could not load template",
            description: e instanceof Error ? e.message : "Unknown error",
            variant: "destructive",
          });
          router.replace("/admin/settings/notifications?tab=notification-template");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [templateId, currentBusiness?.id, router, toast]);

  const getTemplatePreviewSampleVars = (): Record<string, string> => {
    const biz = currentBusiness;
    const envBase = (process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.com").replace(/\/$/, "");
    const website = (biz?.website ?? "").trim();
    const siteUrl =
      website && /^https?:\/\//i.test(website) ? website.replace(/\/$/, "") : envBase;
    return {
      email_body: "",
      customer_name: "Jane Customer",
      business_name: biz?.name || "Your Business",
      business_logo_url: biz?.logo_url || `${envBase}/images/logo.png`,
      support_email: biz?.business_email || "support@yourbusiness.com",
      support_phone: biz?.business_phone || "+1 (555) 000-0000",
      store_currency: "USD",
      service: "Deep Tissue Massage",
      date: "Tuesday, April 14, 2026",
      time: "14:30",
      address: "123 Main St, Springfield",
      booking_ref: "BK-123456",
      total_price: "99.00",
      total_price_formatted: "$99.00",
      invoice_number: "INV-1001",
      total_amount: "149.50",
      total_amount_formatted: "$149.50",
      due_date: "May 1, 2026",
      issue_date: "April 1, 2026",
      description: "Thank you for your business.",
      line_summary: "Service: $99.00",
      view_url: `${envBase}/invoice/sample-token`,
      site_url: siteUrl,
    };
  };

  const save = async () => {
    const cleanName = name.trim();
    if (!cleanName || !templateId || !currentBusiness?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/notification-templates/${templateId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-business-id": currentBusiness.id },
        body: JSON.stringify({
          name: cleanName,
          subject,
          body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update template");
      router.push("/admin/settings/notifications?tab=notification-template");
    } catch (e) {
      toast({
        title: "Could not save template",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelHref = "/admin/settings/notifications?tab=notification-template";

  if (businessLoading || loadState === "loading" || loadState === "error") {
    return (
      <div className="w-full min-w-0 max-w-none space-y-6">
        <p className="text-sm text-muted-foreground">
          {loadState === "error" ? "Redirecting…" : "Loading template…"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-none space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={cancelHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to notification settings
          </Link>
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Edit notification template</CardTitle>
          <CardDescription>
            Build your HTML email layout. Short codes like {`{{business_name}}`} are replaced when emails are sent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="edit-tpl-name">Template name</Label>
            <Input
              id="edit-tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template For Customer Emails"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tpl-subject">Email subject</Label>
            <Input
              id="edit-tpl-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Thanks for choosing {{business_name}}"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tpl-body">Template</Label>
            <NotificationTemplateBodyEditor value={body} onChange={setBody} />
            <p className="text-xs text-muted-foreground">
              Short codes such as {`{{business_name}}`}, {`{{support_email}}`}, and {`{{email_body}}`} work in this
              HTML. Click any link in the template (including the round social icons) to open a dialog and set the URL.
              You can also use the link tool in the toolbar after selecting text.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 w-fit"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href={cancelHref}>Cancel</Link>
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => void save()}
                disabled={!name.trim() || saving}
              >
                {saving ? "Saving…" : "Update"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col overflow-hidden gap-0 p-0">
          <div className="px-6 pt-6 pb-2">
            <DialogHeader>
              <DialogTitle>Template preview</DialogTitle>
              <DialogDescription>
                Short codes are filled with sample data from your business where available. Sent emails use live values.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-4">
            <div className="rounded-md border bg-muted/50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Subject: </span>
              <span className="font-medium text-foreground">
                {substituteEmailPlaceholders(subject.trim() || "(No subject)", getTemplatePreviewSampleVars())}
              </span>
            </div>
            <div
              className="rounded-lg border overflow-x-auto bg-[#f4f4f5] p-4 sm:p-6 shadow-sm"
              style={{ maxWidth: "100%" }}
            >
              <div
                className="mx-auto w-full"
                style={{ maxWidth: 640 }}
                dangerouslySetInnerHTML={{
                  __html: substituteEmailPlaceholders(body || "", getTemplatePreviewSampleVars(), {
                    escapeValues: true,
                    htmlUnescapedKeys: ["email_body"],
                  }),
                }}
              />
            </div>
          </div>
          <div className="border-t px-6 py-4 flex justify-end bg-muted/20">
            <Button type="button" variant="secondary" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
