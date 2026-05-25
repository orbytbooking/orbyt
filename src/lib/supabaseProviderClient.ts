/**
 * Separate Supabase client for the Provider Portal.
 * Uses a different auth storage key so provider login does not overwrite
 * the admin/CRM session. You can be logged in as admin in one tab and
 * as provider in another tab in the same browser.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Storage key must be different from the default client so sessions don't overwrite each other.
const PROVIDER_STORAGE_KEY = 'orbyt-provider-auth-token';

function getProviderStorageKey(): string {
  if (typeof window === 'undefined') return PROVIDER_STORAGE_KEY;
  // Include project ref in key so it's unique per Supabase project
  try {
    const ref = new URL(supabaseUrl).hostname.split('.')[0];
    return `sb-${ref}-auth-token-provider`;
  } catch {
    return PROVIDER_STORAGE_KEY;
  }
}

let providerClient: SupabaseClient | null = null;

/**
 * Supabase client for provider portal only.
 * Use this in all provider pages/layout so provider auth is stored separately from admin.
 * Only creates a client in the browser (when window is defined) so admin and provider
 * sessions can coexist in different tabs.
 */
export function getSupabaseProviderClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // SSR: return a dummy that will never be used for auth (provider auth runs in browser only)
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, storageKey: 'orbyt-provider-ssr', autoRefreshToken: false },
    });
  }
  if (providerClient) return providerClient;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key is missing.');
  }

  const storageKey = getProviderStorageKey();

  providerClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey,
      storage: window.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return providerClient;
}

/**
 * Use in provider pages/layout. Call this to get the provider Supabase client.
 * In the browser this uses a separate storage key so admin and provider sessions coexist.
 */
