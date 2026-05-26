import type { User } from "@supabase/supabase-js";

export type AdminLoginRedirectResult =
  | { action: "redirect"; href: string; toast?: { title: string; description: string } }
  | {
      action: "redirect_with_toast";
      href: string;
      toast: { title: string; description: string; variant?: "default" | "destructive" };
      signOutBeforeRedirect?: boolean;
    };

/**
 * After password or OAuth sign-in, decide where a business owner / admin should go.
 * Providers are sent to the provider portal instead of the CRM.
 */
export async function getAdminLoginRedirectAfterAuth(
  user: User,
): Promise<AdminLoginRedirectResult> {
  const userRole = user.user_metadata?.role || "owner";

  if (userRole === "provider") {
    return {
      action: "redirect_with_toast",
      href: "/provider/login",
      toast: {
        title: "Use Provider Portal",
        description: "Please sign in using the Provider Login page.",
        variant: "destructive",
      },
      signOutBeforeRedirect: true,
    };
  }

  const { supabase } = await import("@/lib/supabaseClient");
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, is_active")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business && userRole === "owner") {
    return {
      action: "redirect_with_toast",
      href: "/auth/onboarding",
      toast: {
        title: "Welcome!",
        description: "Please complete your business setup to continue.",
      },
    };
  }

  if (business && userRole === "owner" && business.is_active !== true) {
    return {
      action: "redirect_with_toast",
      href: "/auth/onboarding?payment=pending",
      toast: {
        title: "Payment Required",
        description: "Complete your Stripe subscription checkout to activate your account.",
        variant: "destructive",
      },
    };
  }

  if (businessError) {
    console.warn("Business query warning:", businessError);
  }

  if (business?.id) {
    await fetch("/api/admin/profile", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: business.id }),
    });
  }

  const redirectPath = userRole === "provider" ? "/provider/dashboard" : "/admin/dashboard";
  const name = user.user_metadata?.full_name as string | undefined;

  return {
    action: "redirect",
    href: redirectPath,
    toast: {
      title: "Login Successful!",
      description: `Welcome back${name ? ", " + name : ""}!`,
    },
  };
}
