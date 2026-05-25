"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Copy } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { NotificationTemplateBodyEditor } from "@/components/admin/NotificationTemplateBodyEditor";
import { DEFAULT_MASTER_TEMPLATE_BODY_HTML, TEMPLATE_SHORT_CODES } from "@/lib/notificationMasterTemplate";
import { substituteEmailPlaceholders } from "@/lib/emailTemplatePlaceholders";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMAIL_BODY_TOKEN = "{{email_body}}";
const DEFAULT_MASTER_TEMPLATE_ID = "__default_master_template__";
const NO_MASTER_TEMPLATE_ID = "__no_master_template__";
const CONTENT_PREVIEW_TOKEN = "__content_preview_html__";
const EMPTY_TEMPLATE_HTML = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" data-template-shell="true" style="width:100%;margin:0;padding:0;background-color:#f4f4f5;">
<tr>
<td align="center" style="padding:24px 12px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" data-template-shell="true" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#000;font-size:16px;">
<tbody>
<tr>
<td style="padding:16px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" data-template-block="email-body" style="width:100%;min-height:260px;">
<tr>
<td style="padding:20px;vertical-align:top;text-align:center;">
<p><br></p>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</table>`;
const CONTENT_PREVIEW_SHELL_HTML = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" data-template-shell="true" style="width:100%;margin:0;padding:0;background-color:#f4f4f5;">
<tr>
<td align="center" style="padding:24px 12px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" data-template-shell="true" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#000;font-size:16px;">
<tbody>
<tr>
<td style="padding:16px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" data-template-block="email-body" style="width:100%;min-height:260px;">
<tr>
<td style="padding:20px;vertical-align:top;text-align:center;">
${CONTENT_PREVIEW_TOKEN}
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</table>`;

type MasterTemplateOption = {
  id: string;
  name: string;
  body: string;
  is_default: boolean;
};

export default function NewNotificationTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(DEFAULT_MASTER_TEMPLATE_BODY_HTML);
  const [masterTemplates, setMasterTemplates] = useState<MasterTemplateOption[]>([]);
  const [masterTemplatesLoading, setMasterTemplatesLoading] = useState(false);
  const [selectedMasterTemplateId, setSelectedMasterTemplateId] = useState<string>(DEFAULT_MASTER_TEMPLATE_ID);
  const [shortCodesDialogOpen, setShortCodesDialogOpen] = useState(false);
  const [copiedShortCode, setCopiedShortCode] = useState<string | null>(null);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [previewWithMasterTemplate, setPreviewWithMasterTemplate] = useState(true);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentBusiness?.id) return;
    let cancelled = false;
    setMasterTemplatesLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/admin/notification-templates", {
          credentials: "include",
          headers: { "x-business-id": currentBusiness.id },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load master templates");
        if (cancelled) return;
        const rows = (data.templates || []) as MasterTemplateOption[];
        const eligible = rows.filter((tpl) => tpl.id && tpl.name && tpl.body?.trim());
        setMasterTemplates(eligible);
        const defaultTpl = eligible.find((tpl) => tpl.is_default);
        if (defaultTpl) {
          setSelectedMasterTemplateId(defaultTpl.id);
        }
      } catch (e) {
        if (cancelled) return;
        toast({
          title: "Could not load master templates",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setMasterTemplatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentBusiness?.id, toast]);

  useEffect(() => {
    if (!previewWithMasterTemplate) return;
    if (selectedMasterTemplateId === NO_MASTER_TEMPLATE_ID) {
      setBody(EMPTY_TEMPLATE_HTML);
      return;
    }
    if (selectedMasterTemplateId === DEFAULT_MASTER_TEMPLATE_ID) {
      setBody(DEFAULT_MASTER_TEMPLATE_BODY_HTML);
      return;
    }
    const selected = masterTemplates.find((tpl) => tpl.id === selectedMasterTemplateId);
    if (selected?.body?.trim()) {
      setBody(selected.body);
    }
  }, [masterTemplates, previewWithMasterTemplate, selectedMasterTemplateId]);

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
    if (!cleanName) return;
    if (!currentBusiness?.id) {
      toast({
        title: "Business context not ready",
        description: "Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }
    const templateBodyForDelivery = getBodyForDelivery();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/notification-templates", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-business-id": currentBusiness.id },
        body: JSON.stringify({
          name: cleanName,
          subject,
          body: templateBodyForDelivery,
          enabled: true,
          is_default: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save template");
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

  const copyShortCode = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedShortCode(token);
      window.setTimeout(() => {
        setCopiedShortCode((current) => (current === token ? null : current));
      }, 1500);
    } catch (error) {
      console.error("Failed to copy short code", error);
    }
  };

  const sendTestEmail = async () => {
    if (!currentBusiness?.id) return;
    const recipient = testEmailTo.trim();
    if (!recipient) {
      toast({
        title: "Recipient email required",
        description: "Please enter an email address to send the test email.",
        variant: "destructive",
      });
      return;
    }
    const templateBodyForDelivery = getBodyForDelivery();
    setSendingTestEmail(true);
    try {
      const res = await fetch("/api/admin/notification-templates/send-test-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-business-id": currentBusiness.id },
        body: JSON.stringify({
          subject,
          body: templateBodyForDelivery,
          to: recipient,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send test email");
      toast({
        title: "Test email sent",
        description: `Sent to ${data.to || recipient}.`,
      });
      setTestEmailDialogOpen(false);
    } catch (e) {
      toast({
        title: "Could not send test email",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const getPreviewHtml = (fullTemplateHtml: string) => {
    if (previewWithMasterTemplate) return fullTemplateHtml;
    if (typeof document === "undefined") return fullTemplateHtml;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = fullTemplateHtml;
    const bodyBlock = wrapper.querySelector("[data-template-block='email-body']");
    if (bodyBlock instanceof HTMLElement && bodyBlock.innerHTML.trim()) {
      return CONTENT_PREVIEW_SHELL_HTML.replace(CONTENT_PREVIEW_TOKEN, bodyBlock.innerHTML);
    }
    return CONTENT_PREVIEW_SHELL_HTML.replace(CONTENT_PREVIEW_TOKEN, "<p><br></p>");
  };

  const getSelectedMasterTemplateHtml = () => {
    if (selectedMasterTemplateId === NO_MASTER_TEMPLATE_ID) return "";
    if (selectedMasterTemplateId === DEFAULT_MASTER_TEMPLATE_ID) return DEFAULT_MASTER_TEMPLATE_BODY_HTML;
    return masterTemplates.find((tpl) => tpl.id === selectedMasterTemplateId)?.body || DEFAULT_MASTER_TEMPLATE_BODY_HTML;
  };

  const extractEmailBodyContent = (fullTemplateHtml: string) => {
    if (typeof document === "undefined") return fullTemplateHtml;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = fullTemplateHtml;
    const bodyBlock = wrapper.querySelector("[data-template-block='email-body']");
    if (bodyBlock instanceof HTMLElement) {
      return bodyBlock.innerHTML || "";
    }
    return fullTemplateHtml;
  };

  const getBodyForDelivery = () => {
    if (selectedMasterTemplateId === NO_MASTER_TEMPLATE_ID) return body;
    const selectedMaster = getSelectedMasterTemplateHtml();
    if (!selectedMaster) return body;
    const contentOnlyRaw = extractEmailBodyContent(body || "");
    let contentOnly = contentOnlyRaw;
    if (typeof document !== "undefined") {
      const masterWrap = document.createElement("div");
      masterWrap.innerHTML = selectedMaster;
      const masterBodyBlock = masterWrap.querySelector("[data-template-block='email-body']");
      if (masterBodyBlock instanceof HTMLElement) {
        const masterInner = masterBodyBlock.innerHTML || "";
        const masterInnerWithoutToken = masterInner.replace(EMAIL_BODY_TOKEN, "").trim();
        contentOnly = contentOnly.replace(new RegExp(EMAIL_BODY_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "");
        if (masterInnerWithoutToken) {
          contentOnly = contentOnly.replace(masterInnerWithoutToken, "");
        }
      }
    }
    contentOnly = contentOnly.trim();
    if (selectedMaster.includes(EMAIL_BODY_TOKEN)) {
      return selectedMaster.replace(EMAIL_BODY_TOKEN, contentOnly || "<p><br></p>");
    }
    return `${selectedMaster}\n${contentOnly}`;
  };

  useEffect(() => {
    if (previewWithMasterTemplate) {
      if (selectedMasterTemplateId === NO_MASTER_TEMPLATE_ID) {
        setBody(EMPTY_TEMPLATE_HTML);
        return;
      }
      if (selectedMasterTemplateId === DEFAULT_MASTER_TEMPLATE_ID) {
        setBody(DEFAULT_MASTER_TEMPLATE_BODY_HTML);
        return;
      }
      const selected = masterTemplates.find((tpl) => tpl.id === selectedMasterTemplateId);
      setBody(selected?.body?.trim() ? selected.body : DEFAULT_MASTER_TEMPLATE_BODY_HTML);
      return;
    }
    setBody(EMPTY_TEMPLATE_HTML);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewWithMasterTemplate]);

  return (
    <div className="w-full min-w-0 max-w-none space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/settings/notifications?tab=notification-template">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to notification settings
          </Link>
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Add notification template</CardTitle>
          <CardDescription>
            Build your HTML email layout. Short codes like {`{{business_name}}`} are replaced when emails are sent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="new-tpl-name">Template name</Label>
            <Input
              id="new-tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template For Customer Emails"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-tpl-subject">Email subject</Label>
            <Input
              id="new-tpl-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Thanks for choosing {{business_name}}"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="master-template">Master template</Label>
            <Select value={selectedMasterTemplateId} onValueChange={setSelectedMasterTemplateId}>
              <SelectTrigger id="master-template">
                <SelectValue placeholder="Select a master template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_MASTER_TEMPLATE_ID}>System default master template</SelectItem>
                {masterTemplates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                    {tpl.is_default ? " (default)" : ""}
                  </SelectItem>
                ))}
                <SelectItem value={NO_MASTER_TEMPLATE_ID}>No master template (custom HTML only)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {masterTemplatesLoading
                ? "Loading master templates..."
                : "Choose a master template to load it into the editor, then customize it."}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="new-tpl-body">Template</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setShortCodesDialogOpen(true)}>
                View short codes
              </Button>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Checkbox
                id="preview-with-master-template-new"
                checked={previewWithMasterTemplate}
                onCheckedChange={(checked) => setPreviewWithMasterTemplate(checked === true)}
              />
              <Label htmlFor="preview-with-master-template-new" className="text-sm font-normal cursor-pointer">
                Preview with master template
              </Label>
            </div>
            <div className="rounded-lg border overflow-x-auto bg-[#f4f4f5] p-4 sm:p-6 shadow-sm">
              <div
                className="mx-auto w-full"
                style={{ maxWidth: 640 }}
                dangerouslySetInnerHTML={{
                  __html: substituteEmailPlaceholders(getPreviewHtml(body || ""), getTemplatePreviewSampleVars(), {
                    escapeValues: true,
                    htmlUnescapedKeys: ["email_body"],
                  }),
                }}
              />
            </div>
            <NotificationTemplateBodyEditor value={body} onChange={setBody} />
            <p className="text-xs text-muted-foreground">
              You can fully edit this template HTML. Keep {`{{email_body}}`} if you want message content slot support.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/settings/notifications?tab=notification-template">Cancel</Link>
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTestEmailDialogOpen(true)}
                disabled={!currentBusiness?.id || !body.trim()}
              >
                {sendingTestEmail ? "Sending test…" : "Send test email"}
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => void save()}
                disabled={!name.trim() || saving}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={shortCodesDialogOpen} onOpenChange={setShortCodesDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Template short codes</DialogTitle>
            <DialogDescription>Click copy to insert a shortcode into your template.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] overflow-y-auto rounded-md border divide-y">
            {TEMPLATE_SHORT_CODES.map((shortCode) => (
              <div key={shortCode.token} className="flex items-start justify-between gap-4 p-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs">{shortCode.token}</p>
                  <p className="text-sm text-muted-foreground mt-1">{shortCode.description}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => void copyShortCode(shortCode.token)}
                >
                  {copiedShortCode === shortCode.token ? (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send test email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-red-100 bg-red-50 p-3 text-red-500 text-sm">
              Note: This test email uses sample data. Real customers receive accurate booking details in live emails.
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-email-to-new">Where should the test be sent?</Label>
              <Input
                id="test-email-to-new"
                type="email"
                placeholder="Ex: example@xyz.com"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setTestEmailDialogOpen(false)} disabled={sendingTestEmail}>
              Cancel
            </Button>
            <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={() => void sendTestEmail()} disabled={sendingTestEmail}>
              {sendingTestEmail ? "Sending..." : "Send email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
