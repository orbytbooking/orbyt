'use client'

import { usePathname } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/layouts/AdminLayout";
import { Providers } from "@/app/providers";
import { LogoProvider } from "@/contexts/LogoContext";
import { BusinessProvider } from "@/contexts/BusinessContext";

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/auth/login';
  const isWebsiteBuilder = pathname === '/admin/website-builder';

  // Don't protect the login page
  if (isLoginPage) {
    return <Providers>{children}</Providers>;
  }

  // Website builder should be full page without AdminLayout
  if (isWebsiteBuilder) {
    return (
      <Providers>
        <BusinessProvider>
          <ProtectedRoute>
            {children}
          </ProtectedRoute>
        </BusinessProvider>
      </Providers>
    );
  }

  return (
    <Providers>
      <BusinessProvider>
        <LogoProvider>
          <ProtectedRoute>
            <AdminLayout>
              {children}
            </AdminLayout>
          </ProtectedRoute>
        </LogoProvider>
      </BusinessProvider>
    </Providers>
  );
}
