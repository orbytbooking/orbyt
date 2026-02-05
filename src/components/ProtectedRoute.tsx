'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push("/auth/login");
          setIsAuthenticated(false);
          return;
        }

        // Check if user has completed onboarding by looking for their business
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', session.user.id)
          .maybeSingle();

        // Check user role and redirect accordingly
        const userRole = session.user.user_metadata?.role || 'owner';
        
        if (userRole === 'customer') {
          console.log('User is a customer, redirecting to customer dashboard');
          router.push("/customer/dashboard");
          setIsAuthenticated(false);
          return;
        }
        
        // For providers, don't check business ownership - they don't need businesses
        if (userRole === 'provider') {
          console.log('User is a provider, allowing access to provider dashboard');
          setIsAuthenticated(true);
          return;
        }
        
        // For owners/admins, check business ownership
        if (!business) {
          router.push("/auth/onboarding");
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push("/auth/login");
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.push("/auth/login");
        setIsAuthenticated(false);
      } else {
        // Check user role on auth state change
        const userRole = session.user.user_metadata?.role || 'owner';
        
        if (userRole === 'customer') {
          router.push("/customer/dashboard");
          setIsAuthenticated(false);
        } else if (userRole === 'provider') {
          // Providers don't need business validation
          setIsAuthenticated(true);
        } else if (userRole === 'owner' || userRole === 'admin') {
          // Owners/admins need business validation
          const { data: business } = await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', session.user.id)
            .maybeSingle();
          
          if (!business) {
            router.push("/auth/onboarding");
            setIsAuthenticated(false);
          } else {
            setIsAuthenticated(true);
          }
        } else {
          router.push("/provider/dashboard");
          setIsAuthenticated(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
