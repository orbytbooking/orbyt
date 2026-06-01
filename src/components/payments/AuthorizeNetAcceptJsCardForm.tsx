"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  getCardNumberDigits,
  finalizeExpMonthInput,
  sanitizeCardNumberInput,
  sanitizeCvcInput,
  sanitizeExpMonthInput,
  sanitizeExpYearInput,
  validateCardFormInput,
} from "@/lib/payments/cardReference";
import {
  enrichAcceptJsAuthError,
  enrichAcceptJsHttpsError,
  getAcceptJsClientEnvironmentError,
  getAcceptJsLocalhostFixUrl,
  isAcceptJsAuthError,
  isAcceptJsHttpsError,
} from "@/lib/payments/acceptJsClientEnvironment";

export type AuthorizeNetOpaqueData = {
  dataDescriptor: string;
  dataValue: string;
};

type AcceptJsConfig = {
  apiLoginId: string;
  publicClientKey: string;
  acceptJsUrl: string;
  environment: "sandbox" | "production";
};

type AcceptDispatchResponse = {
  messages?: { resultCode?: string; message?: { code?: string; text?: string }[] };
  opaqueData?: AuthorizeNetOpaqueData;
};

declare global {
  interface Window {
    Accept?: {
      dispatchData: (
        secureData: {
          authData: { clientKey: string; apiLoginID: string };
          cardData: { cardNumber: string; month: string; year: string; cardCode: string };
        },
        responseHandler: (response: AcceptDispatchResponse) => void
      ) => void;
    };
  }
}

function loadAcceptJsScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Accept.js requires a browser."));
      return;
    }
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing && window.Accept) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Authorize.Net Accept.js"));
    document.body.appendChild(script);
  });
}

export function AuthorizeNetAcceptJsCardForm({
  configUrl,
  submitLabel = "Add Card",
  onSubmitOpaqueData,
  onCancel,
}: {
  configUrl: string;
  submitLabel?: string;
  onSubmitOpaqueData: (opaqueData: AuthorizeNetOpaqueData) => Promise<void>;
  onCancel?: () => void;
}) {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [config, setConfig] = useState<AcceptJsConfig | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cardCode, setCardCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    cardNumber: false,
    expMonth: false,
    expYear: false,
    cardCode: false,
  });

  const cardDigits = useMemo(() => getCardNumberDigits(cardNumber), [cardNumber]);

  const validation = useMemo(
    () => validateCardFormInput({ cardNumber, expMonth, expYear, cardCode }),
    [cardNumber, expMonth, expYear, cardCode]
  );

  const environmentError = useMemo(() => getAcceptJsClientEnvironmentError(), []);
  const localhostFixUrl = useMemo(() => getAcceptJsLocalhostFixUrl(), []);

  useEffect(() => {
    let cancelled = false;
    setLoadingConfig(true);
    setConfigError(null);
    (async () => {
      try {
        const res = await fetch(configUrl, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setConfigError(data?.error || `Could not load Authorize.Net config (${res.status})`);
          return;
        }
        const next: AcceptJsConfig = {
          apiLoginId: String(data.apiLoginId || ""),
          publicClientKey: String(data.publicClientKey || ""),
          acceptJsUrl: String(data.acceptJsUrl || ""),
          environment: data.environment === "production" ? "production" : "sandbox",
        };
        if (!next.apiLoginId || !next.publicClientKey || !next.acceptJsUrl) {
          setConfigError("Authorize.Net Accept.js is not fully configured.");
          return;
        }
        await loadAcceptJsScript(next.acceptJsUrl);
        if (cancelled) return;
        setConfig(next);
      } catch (e) {
        if (!cancelled) {
          setConfigError(e instanceof Error ? e.message : "Failed to load Accept.js");
        }
      } finally {
        if (!cancelled) setLoadingConfig(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configUrl]);

  const handleSubmit = async () => {
    setTouched({
      cardNumber: true,
      expMonth: true,
      expYear: true,
      cardCode: true,
    });

    if (environmentError) {
      setError(environmentError);
      return;
    }

    if (!config || !window.Accept) {
      setError("Authorize.Net Accept.js is not ready.");
      return;
    }

    if (!validation.valid) {
      setError(
        validation.cardNumberError ||
          validation.expMonthError ||
          validation.expYearError ||
          validation.cvcError ||
          "Enter valid card details."
      );
      return;
    }

    setSaving(true);
    setError(null);

    const month = finalizeExpMonthInput(expMonth);
    const yearRaw = sanitizeExpYearInput(expYear);
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;

    await new Promise<void>((resolve) => {
      window.Accept!.dispatchData(
        {
          authData: {
            clientKey: config.publicClientKey,
            apiLoginID: config.apiLoginId,
          },
          cardData: {
            cardNumber: cardDigits,
            month,
            year,
            cardCode: sanitizeCvcInput(cardCode, cardDigits),
          },
        },
        async (response) => {
          try {
            if (response.messages?.resultCode === "Error") {
              const raw =
                response.messages.message?.map((m) => m.text).filter(Boolean).join("; ") ||
                "Could not tokenize card.";
              setError(
                isAcceptJsHttpsError(raw)
                  ? enrichAcceptJsHttpsError(raw)
                  : isAcceptJsAuthError(raw)
                    ? enrichAcceptJsAuthError(raw, config.environment)
                    : raw
              );
              return;
            }
            const opaqueData = response.opaqueData;
            if (!opaqueData?.dataDescriptor || !opaqueData?.dataValue) {
              setError("Authorize.Net did not return a payment token.");
              return;
            }
            await onSubmitOpaqueData(opaqueData);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save card.");
          } finally {
            setSaving(false);
            resolve();
          }
        }
      );
    });
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading secure card form…
      </div>
    );
  }

  if (configError) {
    return <p className="text-sm text-destructive">{configError}</p>;
  }

  return (
    <div className="space-y-4">
      {config ? (
        <p className="text-xs text-muted-foreground">
          Authorize.Net mode:{" "}
          <span className="font-medium">
            {config.environment === "production" ? "Production (live)" : "Sandbox (test)"}
          </span>
        </p>
      ) : null}
      {environmentError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-sm text-amber-900">{environmentError}</p>
          {localhostFixUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-300 bg-white"
              onClick={() => {
                window.location.href = localhostFixUrl;
              }}
            >
              Open on localhost
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="anet-card-number">Card number</Label>
        <Input
          id="anet-card-number"
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChange={(e) => setCardNumber(sanitizeCardNumberInput(e.target.value))}
          onBlur={() => setTouched((prev) => ({ ...prev, cardNumber: true }))}
          inputMode="numeric"
          autoComplete="cc-number"
          maxLength={19}
          aria-invalid={touched.cardNumber && !!validation.cardNumberError}
        />
        {touched.cardNumber && validation.cardNumberError ? (
          <p className="text-xs text-destructive">{validation.cardNumberError}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="anet-exp-month">Exp. month</Label>
          <Input
            id="anet-exp-month"
            placeholder="MM"
            value={expMonth}
            onChange={(e) => setExpMonth(sanitizeExpMonthInput(e.target.value))}
            onBlur={() => {
              setExpMonth((prev) => finalizeExpMonthInput(prev));
              setTouched((prev) => ({ ...prev, expMonth: true }));
            }}
            inputMode="numeric"
            autoComplete="cc-exp-month"
            maxLength={2}
            aria-invalid={touched.expMonth && !!validation.expMonthError}
          />
          {touched.expMonth && validation.expMonthError ? (
            <p className="text-xs text-destructive">{validation.expMonthError}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="anet-exp-year">Exp. year</Label>
          <Input
            id="anet-exp-year"
            placeholder="YYYY"
            value={expYear}
            onChange={(e) => setExpYear(sanitizeExpYearInput(e.target.value))}
            onBlur={() => setTouched((prev) => ({ ...prev, expYear: true }))}
            inputMode="numeric"
            autoComplete="cc-exp-year"
            maxLength={4}
            aria-invalid={touched.expYear && !!validation.expYearError}
          />
          {touched.expYear && validation.expYearError ? (
            <p className="text-xs text-destructive">{validation.expYearError}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="anet-cvc">CVC</Label>
          <Input
            id="anet-cvc"
            placeholder={cardDigits.startsWith("34") || cardDigits.startsWith("37") ? "4 digits" : "3 digits"}
            value={cardCode}
            onChange={(e) => setCardCode(sanitizeCvcInput(e.target.value, cardDigits))}
            onBlur={() => setTouched((prev) => ({ ...prev, cardCode: true }))}
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={cardDigits.startsWith("34") || cardDigits.startsWith("37") ? 4 : 3}
            aria-invalid={touched.cardCode && !!validation.cvcError}
          />
          {touched.cardCode && validation.cvcError ? (
            <p className="text-xs text-destructive">{validation.cvcError}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <img src="/card-logos/visa.svg" alt="Visa" className="h-6 w-auto rounded-sm" loading="lazy" />
        <img src="/card-logos/mastercard.svg" alt="Mastercard" className="h-6 w-auto rounded-sm" loading="lazy" />
        <img src="/card-logos/discover.svg" alt="Discover" className="h-6 w-auto rounded-sm" loading="lazy" />
        <img src="/card-logos/amex.svg" alt="American Express" className="h-6 w-auto rounded-sm" loading="lazy" />
        <div className="h-6 px-2 rounded border bg-lime-50 text-lime-700 text-[10px] font-semibold inline-flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secured by Authorize.Net
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Card details are tokenized by Authorize.Net Accept.js and vaulted in your merchant CIM profile.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-3 justify-end">
        {onCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
        <Button
          onClick={handleSubmit}
          disabled={saving || !validation.valid || !!environmentError}
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
