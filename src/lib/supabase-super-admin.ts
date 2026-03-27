import { createBrowserClient } from "@supabase/ssr";

/**
 * Storage key for Super Admin auth cookies — distinct from the default Supabase client so
 * platform staff can stay signed in as Super Admin while the main `supabase` client holds
 * the tenant/owner/provider/customer session in the same browser.
 */
export const SUPER_ADMIN_AUTH_STORAGE_KEY = "sb-orbyt-super-admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** Browser client for Super Admin login only. Uses separate cookies from the main app. */
export const supabaseSuperAdmin = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  isSingleton: false,
  cookieOptions: {
    name: SUPER_ADMIN_AUTH_STORAGE_KEY,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
});
