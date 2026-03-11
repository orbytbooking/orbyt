'use client';

import { useState, useEffect } from 'react';

/**
 * Renders children only after the component has mounted on the client.
 * Use to avoid hydration mismatches with components that generate different
 * markup on server vs client (e.g. Radix UI aria-controls IDs).
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
