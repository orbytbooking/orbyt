"use client";

import { getSupabaseProviderClient } from "@/lib/supabaseProviderClient";

/**
 * Business admin: same flow as super-admin "Log in as tenant" — POST impersonate API,
 * set session (provider uses a dedicated Supabase client/storage), full navigation.
 */
export type AdminProviderImpersonateResult =
  | { ok: true }
  | { ok: false; error: string };

export async function adminImpersonateProvider(providerId: string): Promise<AdminProviderImpersonateResult> {
  const res = await fetch(`/api/admin/providers/${providerId}/impersonate`, {
    method: "POST",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    access_token?: string;
    refresh_token?: string;
    message?: string;
  };

  if (!res.ok) {
    return { ok: false, error: data.error || res.statusText || "Request failed" };
  }

  if (!data.access_token || !data.refresh_token) {
    return { ok: false, error: "No session returned from server." };
  }

  const { error } = await getSupabaseProviderClient().auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  window.location.href = "/provider/dashboard";
  return { ok: true };
}
