import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Simple multi-tenancy helper functions
export class MultiTenantHelper {
  private static currentBusinessId: string | null = null;

  // Set the current business context
  static setBusinessContext(businessId: string) {
    this.currentBusinessId = businessId;
  }

  // Get current business context
  static getBusinessContext(): string | null {
    return this.currentBusinessId;
  }

  // Clear business context
  static clearBusinessContext() {
    this.currentBusinessId = null;
  }

  // Add business filter to a query
  static addBusinessFilter(query: any, businessId?: string) {
    const bizId = businessId || this.currentBusinessId;
    if (!bizId) return query;
    
    return query.eq('business_id', bizId);
  }

  // Add business filter to bookings query
  static filterBookings(query: any, businessId?: string) {
    const bizId = businessId || this.currentBusinessId;
    if (!bizId) return query;
    
    return query.eq('business_id', bizId);
  }

  // Add business filter to profiles query
  static filterProfiles(query: any, businessId?: string) {
    const bizId = businessId || this.currentBusinessId;
    if (!bizId) return query;
    
    return query.eq('business_id', bizId);
  }

  // Add business filter to leads query
  static filterLeads(query: any, businessId?: string) {
    const bizId = businessId || this.currentBusinessId;
    if (!bizId) return query;
    
    return query.eq('business_id', bizId);
  }

  // Add business filter to staff query
  static filterStaff(query: any, businessId?: string) {
    const bizId = businessId || this.currentBusinessId;
    if (!bizId) return query;
    
    return query.eq('business_id', bizId);
  }

  // Filter businesses by ownership only (MVP setup)
  static filterBusinesses(query: any, userId: string) {
    return query.eq('owner_id', userId);
  }

  // Auto-add business_id to insert data
  static addBusinessId(data: any, businessId?: string) {
    const bizId = businessId || this.currentBusinessId;
    if (!bizId) return data;
    
    return {
      ...data,
      business_id: bizId
    };
  }
}

// Enhanced Supabase queries with multi-tenancy
export function createTenantQuery(supabase: SupabaseClient, businessId: string) {
  MultiTenantHelper.setBusinessContext(businessId);
  
  return {
    // Bookings with business filtering
    bookings: {
      select: (columns?: string) => 
        MultiTenantHelper.filterBookings(supabase.from('bookings').select(columns)),
      insert: (data: any) => 
        MultiTenantHelper.filterBookings(supabase.from('bookings').insert(
          MultiTenantHelper.addBusinessId(data, businessId)
        )),
      update: (data: any) => 
        MultiTenantHelper.filterBookings(supabase.from('bookings').update(data)),
      delete: () => 
        MultiTenantHelper.filterBookings(supabase.from('bookings').delete()),
    },

    // Profiles with business filtering
    profiles: {
      select: (columns?: string) => 
        MultiTenantHelper.filterProfiles(supabase.from('profiles').select(columns)),
      insert: (data: any) => 
        MultiTenantHelper.filterProfiles(supabase.from('profiles').insert(
          MultiTenantHelper.addBusinessId(data, businessId)
        )),
      update: (data: any) => 
        MultiTenantHelper.filterProfiles(supabase.from('profiles').update(data)),
      delete: () => 
        MultiTenantHelper.filterProfiles(supabase.from('profiles').delete()),
    },

    // Leads with business filtering
    leads: {
      select: (columns?: string) => 
        MultiTenantHelper.filterLeads(supabase.from('leads').select(columns)),
      insert: (data: any) => 
        MultiTenantHelper.filterLeads(supabase.from('leads').insert(
          MultiTenantHelper.addBusinessId(data, businessId)
        )),
      update: (data: any) => 
        MultiTenantHelper.filterLeads(supabase.from('leads').update(data)),
      delete: () => 
        MultiTenantHelper.filterLeads(supabase.from('leads').delete()),
    },

    // Staff with business filtering
    staff: {
      select: (columns?: string) => 
        MultiTenantHelper.filterStaff(supabase.from('staff').select(columns)),
      insert: (data: any) => 
        MultiTenantHelper.filterStaff(supabase.from('staff').insert(
          MultiTenantHelper.addBusinessId(data, businessId)
        )),
      update: (data: any) => 
        MultiTenantHelper.filterStaff(supabase.from('staff').update(data)),
      delete: () => 
        MultiTenantHelper.filterStaff(supabase.from('staff').delete()),
    },

    // Businesses filtered by user access
    businesses: {
      select: (columns?: string, userId?: string) => {
        const query = supabase.from('businesses').select(columns);
        return userId ? MultiTenantHelper.filterBusinesses(query, userId) : query;
      },
      insert: (data: any) => supabase.from('businesses').insert(data),
      update: (data: any) => supabase.from('businesses').update(data),
      delete: () => supabase.from('businesses').delete(),
    },

    // Direct access to supabase for other operations
    supabase
  };
}

// Hook for using tenant queries in React components
export function useTenantQueries(businessId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return createTenantQuery(supabase, businessId);
}
