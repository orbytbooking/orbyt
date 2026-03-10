"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";

export function BillingAuthorizeNet() {
  const { currentBusiness } = useBusiness();
  const [apiKey, setApiKey] = useState("");
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [saving, setSaving] = useState(false);

  const businessId = currentBusiness?.id ?? null;

  // Check if already configured (we never expose the stored key)
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/payment-settings?business=${encodeURIComponent(businessId)}`, {
          credentials: "include",
        });
        if (cancelled || !res.ok) return;
        const data = await res.json();
        setHasExistingConfig(!!data.authorizeNetApiLoginId);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const handleSave = async () => {
    if (!businessId) {
      toast.error("No business selected");
      return;
    }
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error("API key is required");
      return;
    }
    // Accept "API_LOGIN_ID:TRANSACTION_KEY" (Authorize.net needs both)
    const colonIndex = trimmed.indexOf(":");
    const apiLoginId = colonIndex >= 0 ? trimmed.slice(0, colonIndex).trim() : trimmed;
    const transactionKey = colonIndex >= 0 ? trimmed.slice(colonIndex + 1).trim() : "";
    if (colonIndex >= 0 && !transactionKey) {
      toast.error("Enter API key as: API Login ID : Transaction Key");
      return;
    }
    if (colonIndex < 0) {
      toast.error("Enter your API key in the format: API Login ID : Transaction Key (from Authorize.net)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payment-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": businessId,
        },
        body: JSON.stringify({
          paymentProvider: "authorize_net",
          authorizeNetApiLoginId: apiLoginId,
          authorizeNetTransactionKey: transactionKey,
        }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Authorize.net API key saved");
        setApiKey("");
        setHasExistingConfig(true);
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Authorize.net</CardTitle>
        <CardDescription>
          Enter your Authorize.net API key. Get API Login ID and Transaction Key from Merchant Dashboard → Account → API Credentials & Keys, then enter as: <strong>API Login ID : Transaction Key</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="authnet-api-key">API Key</Label>
          <Input
            id="authnet-api-key"
            type="password"
            placeholder="API Login ID : Transaction Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Format: your API Login ID, then a colon, then your Transaction Key. Stored securely.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !apiKey.trim()}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save API key"
          )}
        </Button>
        {hasExistingConfig && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Authorize.net is configured. Enter a new API key above to update.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
