'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

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
}

interface BusinessContextType {
  businesses: Business[];
  currentBusiness: Business | null;
  loading: boolean;
  error: string | null;
  switchBusiness: (businessId: string) => void;
  refreshBusinesses: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use centralized auth instead of making separate auth call
      if (!user) {
        // Don't redirect if on public pages or auth pages
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

      // Get businesses where user is owner (simplified for current schema)
      const { data: ownerBusinesses, error: ownerError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }); // Add ordering to prevent caching

      // For now, only handle owner businesses (team functionality can be added later)
      if (ownerError) {
        console.error('Owner businesses error:', ownerError);
        // If the error is about missing table or column, handle gracefully
        if (ownerError.message.includes('relation') || ownerError.message.includes('does not exist')) {
          console.log('Businesses table not found, user may not have completed onboarding');
          setBusinesses([]);
          setLoading(false);
          return;
        }
        // Handle missing is_active column specifically
        if (ownerError.message.includes('column') && ownerError.message.includes('is_active')) {
          console.log('is_active column missing, try running the migration script');
          // Try without is_active column
          const { data: fallbackBusinesses, error: fallbackError } = await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', user.id);
          
          if (fallbackError) {
            throw fallbackError;
          }
          
          const allBusinesses: Business[] = (fallbackBusinesses || []).map(b => ({ 
            id: b.id,
            name: b.name,
            address: b.address,
            category: b.category,
            plan: b.plan || 'starter',
            subdomain: b.subdomain,
            domain: b.domain,
            created_at: b.created_at || new Date().toISOString(),
            updated_at: b.updated_at || new Date().toISOString(),
            is_active: b.is_active !== undefined ? b.is_active : true,
            business_email: b.business_email,
            business_phone: b.business_phone,
            city: b.city,
            zip_code: b.zip_code,
            website: b.website,
            description: b.description,
            role: 'owner' as const
          }));
          
          setBusinesses(allBusinesses);
          
          // Set current business (first one)
          const businessToSet = allBusinesses[0];
          
          if (businessToSet) {
            setCurrentBusiness(businessToSet);
          }
          
          setLoading(false);
          return;
        }
        throw ownerError;
      }

      // Format businesses
      const allBusinesses: Business[] = (ownerBusinesses || []).map(b => {
        // Direct assignment to preserve all data
        const mapped: Business = {
          ...b,
          role: 'owner' as const,
          plan: b.plan || 'starter',
          created_at: b.created_at || new Date().toISOString(),
          updated_at: b.updated_at || new Date().toISOString(),
          is_active: b.is_active !== undefined ? b.is_active : true,
        };
        return mapped;
      });

      setBusinesses(allBusinesses);

      // Set current business (first one)
        const businessToSet = allBusinesses[0];
        
        if (businessToSet) {
          setCurrentBusiness(businessToSet);
        }

    } catch (error: any) {
      console.error('Business fetch error:', error);
      setError(error.message || 'Failed to fetch businesses');
    } finally {
      setLoading(false);
    }
  };

  const switchBusiness = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setCurrentBusiness(business);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentBusiness) return false;
    
    // Owners have all permissions
    if (currentBusiness.role === 'owner') return true;
    
    // For now, only owners exist. Add admin/member logic later when team features are implemented
    return false;
  };

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

  const value: BusinessContextType = {
    businesses,
    currentBusiness,
    loading,
    error,
    switchBusiness,
    refreshBusinesses: fetchBusinesses,
    hasPermission
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
