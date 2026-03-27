import type { User } from '@supabase/supabase-js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { TENANT_AUTH_STORAGE_KEY } from '@/lib/auth-storage-keys';
import { SUPER_ADMIN_AUTH_STORAGE_KEY } from '@/lib/supabase-super-admin';

export async function getAuthenticatedUser() {
  try {
    // Create server client that can read cookies
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
        cookieOptions: {
          name: TENANT_AUTH_STORAGE_KEY,
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        },
      }
    );

    // Prefer verified user (Auth server), but fall back to cookie session
    // to avoid intermittent AuthSessionMissingError during dev/hot-reload.
    const userRes = await supabase.auth.getUser();
    if (userRes.data?.user) return userRes.data.user;

    if (userRes.error) {
      const msg = String((userRes.error as unknown as { message?: string })?.message ?? "");
      const name = String((userRes.error as unknown as { name?: string })?.name ?? "");
      // Only fall back for missing-session cases.
      if (!msg.toLowerCase().includes("session missing") && name !== "AuthSessionMissingError") {
        console.error("Auth getUser error:", userRes.error);
        return null;
      }
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return null;
    return session?.user ?? null;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * User from the Super Admin–only auth cookie (separate from tenant/owner session).
 */
export async function getAuthenticatedSuperAdminUser() {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              /* Server Components / read-only contexts may not allow set */
            }
          },
        },
        cookieOptions: {
          name: SUPER_ADMIN_AUTH_STORAGE_KEY,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        },
      }
    );

    const userRes = await supabase.auth.getUser();
    if (userRes.data?.user) return userRes.data.user;

    if (userRes.error) {
      const msg = String((userRes.error as unknown as { message?: string })?.message ?? "");
      const name = String((userRes.error as unknown as { name?: string })?.name ?? "");
      if (!msg.toLowerCase().includes("session missing") && name !== "AuthSessionMissingError") {
        console.error("Auth getUser (super admin) error:", userRes.error);
        return null;
      }
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return null;
    return session?.user ?? null;
  } catch (error) {
    console.error("Error getting authenticated super admin user:", error);
    return null;
  }
}

export function createUnauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function createForbiddenResponse(message: string = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** Create service-role Supabase client for server use (e.g. super-admin checks). */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Returns the authenticated user if they are a super admin; otherwise null. Uses Super Admin cookie only. */
export async function getSuperAdminUser() {
  const user = await getAuthenticatedSuperAdminUser();
  if (!user) return null;
  const admin = createServiceRoleClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return user;
}

/**
 * Super Admin API gate: valid super-admin session + row in super_admins.
 * Distinguishes 401 (no session) vs 403 (logged in but not super admin).
 */
export async function requireSuperAdminGate(): Promise<
  { ok: true; user: User; admin: SupabaseClient } | { ok: false; response: NextResponse }
> {
  const user = await getSuperAdminUser();
  if (!user) {
    const anyAuth = await getAuthenticatedSuperAdminUser() || (await getAuthenticatedUser());
    if (!anyAuth) return { ok: false, response: createUnauthorizedResponse() };
    return { ok: false, response: createForbiddenResponse('Not a super admin') };
  }
  const admin = createServiceRoleClient();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }),
    };
  }
  return { ok: true, user, admin };
}
