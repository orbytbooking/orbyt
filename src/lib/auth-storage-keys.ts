/**
 * Auth storage keys used to isolate sessions by app persona.
 * Keeping keys in one place ensures browser + server clients read/write
 * the same cookie names.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

function deriveProjectRef(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const ref = host.split('.')[0]?.trim();
    return ref || null;
  } catch {
    return null;
  }
}

const projectRef = deriveProjectRef(supabaseUrl);

/** Owner/Admin tenant app session key (separate from provider/customer/super-admin). */
export const TENANT_AUTH_STORAGE_KEY = projectRef
  ? `sb-${projectRef}-auth-token-owner`
  : 'sb-orbyt-tenant-auth';

