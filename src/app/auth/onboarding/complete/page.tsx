"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function CompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Confirming payment…");

  useEffect(() => {
    const sid = searchParams.get("stripe_session_id");
    const pendingId = searchParams.get("pending_id");
    const provider = searchParams.get("provider")?.toLowerCase() ?? "";

    if (!sid && !(pendingId && provider === "authorize_net")) {
      setError("Missing checkout confirmation. Return to onboarding or open the link from your payment provider.");
      return;
    }

    let cancelled = false;

    (async () => {
      let lastServerMessage = "";
      for (let attempt = 0; attempt < 15; attempt++) {
        if (cancelled) return;
        setStatus("Activating your account…");
        const res = await fetch("/api/auth/finalize-pending-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            pendingId && provider === "authorize_net"
              ? { pendingOwnerId: pendingId, provider: "authorize_net" }
              : { stripeSessionId: sid }
          ),
        });
        const j = (await res.json().catch(() => ({}))) as {
          access_token?: string;
          refresh_token?: string;
          error?: string;
          details?: string;
          /** When false, stop retrying (DB/auth errors won’t fix themselves). */
          retryable?: boolean;
        };
        if (res.ok && j.access_token && j.refresh_token) {
          await supabase.auth.setSession({
            access_token: j.access_token,
            refresh_token: j.refresh_token,
          });
          router.replace("/admin/dashboard?welcome=1&platform_sub=success");
          return;
        }
        lastServerMessage = [j.error, j.details].filter(Boolean).join(": ");
        // Don’t spam the API: setup_failed / explicit retryable:false won’t recover on repeat.
        const fatal =
          j.retryable === false ||
          j.error === "setup_failed" ||
          (res.status === 500 && j.details?.includes("Database error"));
        if (fatal) {
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      setError(
        lastServerMessage
          ? `${lastServerMessage}. You can also try signing in with the email and password you used at signup.`
          : "Could not finish sign-in automatically. Try signing in with the email and password you used at signup."
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : (
          <>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-700">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function OnboardingCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      }
    >
      <CompleteInner />
    </Suspense>
  );
}
