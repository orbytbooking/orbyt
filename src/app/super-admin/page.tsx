'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SuperAdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new enhanced dashboard
    router.push('/super-admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600 font-medium">Redirecting to enhanced dashboard...</p>
      </div>
    </div>
  );
}
