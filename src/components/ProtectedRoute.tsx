'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const router = useRouter();
  const { user, loading, isAdmin, isCustomer } = useAuth();

  useEffect(() => {
    // If still loading, do nothing
    if (loading) return;

    // If no user, redirect to login
    if (!user) {
      console.log('No user found, redirecting to login');
      router.push("/auth/login");
      return;
    }

    // Check user role and redirect accordingly
    if (isCustomer) {
      console.log('User is a customer, redirecting to customer dashboard');
      router.push("/customer/dashboard");
      return;
    }
    
    if (!isAdmin) {
      console.log('User is not an admin, redirecting to provider dashboard');
      router.push("/provider/dashboard");
      return;
    }

    console.log('Admin user authenticated successfully');
  }, [user, loading, isAdmin, isCustomer, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Only render children if authenticated and is admin
  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
