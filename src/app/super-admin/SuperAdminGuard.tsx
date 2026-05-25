'use client';

import { useEffect, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const LOGIN_PATH = '/super-admin/login';

export function SuperAdminGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!pathname?.startsWith('/super-admin')) {
      setAllowed(true);
      setChecking(false);
      return;
    }
    if (pathname === LOGIN_PATH || pathname === LOGIN_PATH + '/') {
      setAllowed(true);
      setChecking(false);
      return;
    }

    let mounted = true;
    fetch('/api/super-admin/me', { credentials: 'include' })
      .then((res) => {
        if (!mounted) return;
        if (res.ok) setAllowed(true);
        else router.replace(LOGIN_PATH);
      })
      .catch(() => {
        if (mounted) router.replace(LOGIN_PATH);
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });
    return () => { mounted = false; };
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!allowed) return null;
  return <>{children}</>;
}
