import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { getAdminLoginRedirectAfterAuth } from "@/lib/adminLoginRedirect";

type ToastFn = (props: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

/** Run shared post-auth routing for business owner / admin login (password or OAuth). */
export async function applyAdminLoginRedirect(user: User, toast: ToastFn): Promise<void> {
  const result = await getAdminLoginRedirectAfterAuth(user);

  if (result.action === "redirect_with_toast" && result.signOutBeforeRedirect) {
    await supabase.auth.signOut();
  }

  const toastPayload =
    result.action === "redirect_with_toast"
      ? result.toast
      : result.action === "redirect"
        ? result.toast
        : undefined;

  if (toastPayload) {
    toast({
      title: toastPayload.title,
      description: toastPayload.description,
      variant: "variant" in toastPayload ? toastPayload.variant : undefined,
    });
  }

  if (result.action === "redirect" || result.action === "redirect_with_toast") {
    window.location.href = result.href;
  }
}
