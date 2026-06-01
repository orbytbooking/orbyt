"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";

type AuthorizeNetEnvironment = "sandbox" | "production";

export function BillingAuthorizeNet() {
  const { currentBusiness } = useBusiness();
  const [apiLoginId, setApiLoginId] = useState("");
  const [transactionKey, setTransactionKey] = useState("");
  const [publicClientKey, setPublicClientKey] = useState("");
  const [environment, setEnvironment] = useState<AuthorizeNetEnvironment>("production");
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [hasPublicClientKey, setHasPublicClientKey] = useState(false);
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
        setHasPublicClientKey(!!data.authorizeNetPublicClientKeyConfigured);
        const resolved = data.authorizeNetEnvironmentResolved === "production" ? "production" : "sandbox";
        const stored = data.authorizeNetEnvironment === "production" || data.authorizeNetEnvironment === "sandbox"
          ? data.authorizeNetEnvironment
          : null;
        setEnvironment(stored ?? resolved);
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
    const loginId = apiLoginId.trim();
    const txKey = transactionKey.trim();
    const clientKey = publicClientKey.trim();

    if (!loginId || !txKey || !clientKey) {
      toast.error("API Login ID, Transaction Key, and Public Client Key are required");
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
          authorizeNetApiLoginId: loginId,
          authorizeNetTransactionKey: txKey,
          authorizeNetPublicClientKey: clientKey,
          authorizeNetEnvironment: environment,
        }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Authorize.net credentials saved");
        setApiLoginId("");
        setTransactionKey("");
        setPublicClientKey("");
        setHasExistingConfig(true);
        setHasPublicClientKey(!!clientKey || hasPublicClientKey);
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
          Enter your Authorize.net API credentials. Get API Login ID, Transaction Key, and Public Client Key from your
          Merchant Dashboard → Account → API Credentials &amp; Keys.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>Environment</Label>
          <RadioGroup
            value={environment}
            onValueChange={(v) => setEnvironment(v as AuthorizeNetEnvironment)}
            className="grid gap-2"
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem value="production" id="authnet-env-production" className="mt-1" />
              <Label htmlFor="authnet-env-production" className="font-normal leading-snug cursor-pointer">
                Production (live) — real charges; use live API Login ID, Transaction Key, and Public Client Key
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="sandbox" id="authnet-env-sandbox" className="mt-1" />
              <Label htmlFor="authnet-env-sandbox" className="font-normal leading-snug cursor-pointer">
                Sandbox (test) — Authorize.Net test credentials only
              </Label>
            </div>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="authnet-api-login-id">API Login ID</Label>
          <Input
            id="authnet-api-login-id"
            type="password"
            placeholder="Enter API Login ID"
            value={apiLoginId}
            onChange={(e) => setApiLoginId(e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="authnet-transaction-key">Transaction key</Label>
          <Input
            id="authnet-transaction-key"
            type="password"
            placeholder="Enter Transaction Key"
            value={transactionKey}
            onChange={(e) => setTransactionKey(e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="authnet-public-client-key">Public Client Key</Label>
          <Input
            id="authnet-public-client-key"
            type="password"
            placeholder="Enter Public Client Key"
            value={publicClientKey}
            onChange={(e) => setPublicClientKey(e.target.value)}
            className="font-mono"
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !apiLoginId.trim() || !transactionKey.trim() || !publicClientKey.trim()}
        >
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
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Authorize.net is configured. Enter new credentials above to update.</span>
            </div>
            {hasPublicClientKey ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Public Client Key saved (Accept.js card vaulting enabled).</span>
              </div>
            ) : (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
                Add your Public Client Key above to enable secure add-card with Accept.js.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
