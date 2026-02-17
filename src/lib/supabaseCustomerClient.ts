/**
 * Separate Supabase client for the Customer Portal / customer auth.
 * Uses a different auth storage key so customer login does not overwrite
 * the admin/CRM session. You can be logged in as admin in one tab and
 * as customer in another tab in the same browser.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const CUSTOMER_STORAGE_KEY = 'orbyt-customer-auth-token';

function getCustomerStorageKey(): string {
  if (typeof window === 'undefined') return CUSTOMER_STORAGE_KEY;
  try {
    const ref = new URL(supabaseUrl).hostname.split('.')[0];
    return `sb-${ref}-auth-token-customer`;
  } catch {
    return CUSTOMER_STORAGE_KEY;
  }
}

let customerClient: SupabaseClient | null = null;

/**
 * Supabase client for customer portal / customer auth only.
 * Use this in customer pages, useCustomerAccount, and customer-auth so customer
 * auth is stored separately from admin. Admin and customer sessions can then
 * coexist in different tabs.
 */
export function getSupabaseCustomerClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, storageKey: 'orbyt-customer-ssr', autoRefreshToken: false },
    });
  }
  if (customerClient) return customerClient;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key is missing.');
  }

  const storageKey = getCustomerStorageKey();

  customerClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey,
      storage: window.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return customerClient;
}
