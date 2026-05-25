'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, ShieldCheck, ShieldX } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { supabaseSuperAdmin } from '@/lib/supabase-super-admin';
import { getSupabaseProviderClient } from '@/lib/supabaseProviderClient';
import { getSupabaseCustomerClient } from '@/lib/supabaseCustomerClient';
import { TENANT_AUTH_STORAGE_KEY } from '@/lib/auth-storage-keys';
import { SUPER_ADMIN_AUTH_STORAGE_KEY } from '@/lib/supabase-super-admin';

type SessionRow = {
  id: string;
  label: string;
  storage: string;
  session: Session | null;
  error?: string | null;
};

function mask(value: string | null | undefined): string {
  if (!value) return '—';
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function SessionCard({ row }: { row: SessionRow }) {
  const user = row.session?.user ?? null;
  const role = String(user?.user_metadata?.role ?? '—');
  const expiresAt = row.session?.expires_at
    ? new Date(row.session.expires_at * 1000).toLocaleString()
    : '—';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{row.label}</h2>
          <p className="text-xs text-gray-500 mt-1">Storage key: <code>{row.storage}</code></p>
        </div>
        {row.session ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
            <ShieldX className="h-3.5 w-3.5" />
            Not signed in
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
        <div>
          <p className="text-gray-500">Email</p>
          <p className="font-medium text-gray-900 break-all">{user?.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-gray-500">Role</p>
          <p className="font-medium text-gray-900">{role}</p>
        </div>
        <div>
          <p className="text-gray-500">User ID</p>
          <p className="font-medium text-gray-900 break-all">{mask(user?.id)}</p>
        </div>
        <div>
          <p className="text-gray-500">Expires</p>
          <p className="font-medium text-gray-900">{expiresAt}</p>
        </div>
      </div>

      {row.error ? (
        <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md p-2">
          {row.error}
        </div>
      ) : null}
    </div>
  );
}

export default function SuperAdminSessionDiagnosticsPage() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const next: SessionRow[] = [];

    try {
      const [{ data: tenant }, { data: provider }, { data: customer }, { data: sa }] = await Promise.all([
        supabase.auth.getSession(),
        getSupabaseProviderClient().auth.getSession(),
        getSupabaseCustomerClient().auth.getSession(),
        supabaseSuperAdmin.auth.getSession(),
      ]);

      next.push(
        {
          id: 'tenant',
          label: 'Owner/Admin (Tenant app)',
          storage: TENANT_AUTH_STORAGE_KEY,
          session: tenant.session ?? null,
        },
        {
          id: 'provider',
          label: 'Provider portal',
          storage: 'sb-<project>-auth-token-provider',
          session: provider.session ?? null,
        },
        {
          id: 'customer',
          label: 'Customer portal',
          storage: 'sb-<project>-auth-token-customer',
          session: customer.session ?? null,
        },
        {
          id: 'super-admin',
          label: 'Super Admin portal',
          storage: SUPER_ADMIN_AUTH_STORAGE_KEY,
          session: sa.session ?? null,
        }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to read sessions.';
      next.push({
        id: 'error',
        label: 'Session check error',
        storage: '—',
        session: null,
        error: msg,
      });
    } finally {
      setRows(next);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCount = useMemo(
    () => rows.filter((r) => r.session != null).length,
    [rows]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/super-admin/dashboard" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="text-lg font-semibold text-gray-900">Session diagnostics</h1>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 text-sm text-gray-600">
          Active sessions in this browser: <span className="font-semibold text-gray-900">{activeCount}</span>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-5">
            {rows.map((row) => (
              <SessionCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

