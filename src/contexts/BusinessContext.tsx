'use client';
import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import {
  effectiveModuleAllowed,
  type AdminModuleKey,
} from '@/lib/adminModulePermissions';

interface Business {
  id: string;
  name: string;
  address?: string | null;
  category?: string | null;
  plan: string;
  subdomain?: string | null;
  domain?: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  business_email?: string | null;
  business_phone?: string | null;
  city?: string | null;
  zip_code?: string | null;
  website?: string | null;
  description?: string | null;
  logo_url?: string | null;
  role: 'owner' | 'admin' | 'member';
  /** Tenant-only module map from API; null = all modules (owners always full access). */
  module_permissions?: Record<string, boolean> | null;
}

interface BusinessContextType {
  businesses: Business[];
  currentBusiness: Business | null;
  loading: boolean;
  error: string | null;
  switchBusiness: (businessId: string) => void;
  refreshBusinesses: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasModuleAccess: (moduleKey: AdminModuleKey) => boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  /** Prefer profiles.business_id from GET /api/admin/profile (database), else first owned business. */
  const resolveCurrentBusiness = (list: Business[], preferredId: string | null | undefined): Business | null => {
    if (!list.length) return null;
    if (typeof preferredId === 'string' && preferredId.trim()) {
      const match = list.find((b) => b.id === preferredId);
      if (match) return match;
    }
    return list[0];
  };

  const fetchPreferredBusinessIdFromProfile = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/admin/profile', { credentials: 'include' });
      if (!res.ok) return null;
      const j = (await res.json()) as { profile?: { business_id?: string | null } };
      const bid = j.profile?.business_id;
      return typeof bid === 'string' && bid.trim() ? bid : null;
    } catch {
      return null;
    }
  };

  const applyBusinessList = async (allBusinesses: Business[]) => {
    setBusinesses(allBusinesses);
    const preferred = await fetchPreferredBusinessIdFromProfile();
    setCurrentBusiness(resolveCurrentBusiness(allBusinesses, preferred));
  };

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const publicPaths = ['/', '/features', '/auth/', '/pricing', '/contact'];
          const isPublicPath = publicPaths.some(path => currentPath.startsWith(path));

          if (!isPublicPath) {
            router.push('/auth/login');
          }
        }
        return;
      }

      const res = await fetch('/api/admin/my-businesses', { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 401 && typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const publicPaths = ['/', '/features', '/auth/', '/pricing', '/contact'];
          if (!publicPaths.some((path) => currentPath.startsWith(path))) {
            router.push('/auth/login');
          }
        }
        throw new Error(text || `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as { businesses?: Business[]; error?: string };
      if (payload.error) {
        throw new Error(payload.error);
      }
      const list = payload.businesses ?? [];
      const normalized: Business[] = list.map((b) => {
        const row = b as Business & { module_permissions?: Record<string, boolean> | null };
        return {
          ...b,
          plan: b.plan || 'starter',
          created_at: b.created_at || new Date().toISOString(),
          updated_at: b.updated_at || new Date().toISOString(),
          is_active: (b as { is_active?: boolean | null }).is_active === true,
          role: b.role ?? 'owner',
          module_permissions:
            row.role === 'owner' ? null : (row.module_permissions ?? null),
        };
      });
      await applyBusinessList(normalized);
    } catch (error: any) {
      // Improved error logging
      const errorDetails = {
        error,
        message: error?.message || String(error) || 'Unknown error',
        code: error?.code || 'No error code',
        details: error?.details || 'No error details',
        stack: error?.stack || 'No stack trace'
      };
      console.error('Business fetch error:', errorDetails);
      
      // Set user-friendly error message
      const errorMessage = error?.message || String(error) || 'Failed to fetch businesses';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const switchBusiness = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;
    setCurrentBusiness(business);
    void fetch('/api/admin/profile', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId }),
    }).then(async (res) => {
      if (!res.ok) {
        console.warn('Could not persist workspace business to database:', await res.text());
      }
    });
  };

  const hasModuleAccess = useCallback(
    (moduleKey: AdminModuleKey): boolean => {
      if (!currentBusiness) return false;
      const owner = currentBusiness.role === 'owner';
      return effectiveModuleAllowed(
        owner,
        currentBusiness.module_permissions ?? null,
        moduleKey
      );
    },
    [currentBusiness]
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!currentBusiness) return false;
      if (permission === 'view_bookings' || permission === 'create_bookings') {
        return hasModuleAccess('bookings');
      }
      if (permission === 'view_team') {
        return hasModuleAccess('settings');
      }
      return hasModuleAccess('dashboard');
    },
    [currentBusiness, hasModuleAccess]
  );

  useEffect(() => {
    // Only fetch businesses when auth is loaded and user is available
    // Use a flag to prevent refetching on every tab switch
    if (!authLoading && user && !businesses.length) {
      fetchBusinesses();
    } else if (!authLoading && !user) {
      setBusinesses([]);
      setCurrentBusiness(null);
      setLoading(false);
    }
  }, [user, authLoading, businesses.length]);

  /** Block all /admin usage until platform subscription payment activates the business (is_active true). */
  useLayoutEffect(() => {
    if (authLoading || loading) return;
    if (!user || !currentBusiness) return;
    if (currentBusiness.role !== "owner") return;
    // Block unless explicitly active (fixes NULL vs false: both must redirect until paid + webhook).
    if (currentBusiness.is_active === true) return;
    if (typeof window === "undefined") return;
    const path = window.location.pathname || "";
    if (path.startsWith("/auth/onboarding")) return;
    router.replace("/auth/onboarding?payment=pending");
  }, [authLoading, loading, user, currentBusiness, router]);

  const value: BusinessContextType = {
    businesses,
    currentBusiness,
    loading,
    error,
    switchBusiness,
    refreshBusinesses: fetchBusinesses,
    hasPermission,
    hasModuleAccess,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
