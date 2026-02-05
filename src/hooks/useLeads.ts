import { useState, useEffect } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabaseClient';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost' | string;

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
  tags: string[];
  status: LeadStatus;
  business_id: string;
  updated_at: string;
};

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentBusiness } = useBusiness();

  const fetchLeads = async () => {
    if (!currentBusiness?.id) {
      setError('No business selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('No authentication token available');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/leads', {
        headers: {
          'x-business-id': currentBusiness.id,
          'authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch leads (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success) {
        setLeads(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch leads');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createLead = async (leadData: Partial<Lead>) => {
    if (!currentBusiness?.id) {
      throw new Error('No business selected');
    }

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      console.log('Creating lead with data:', leadData);
      console.log('Business ID:', currentBusiness.id);
      console.log('Session token exists:', !!session.access_token);
      console.log('Environment check:', {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      });

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': currentBusiness.id,
          'authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(leadData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          console.log('Failed to parse error JSON, using text');
          errorData = { error: errorText || 'Unknown error' };
        }
        
        console.error('Create lead failed:', errorData);
        throw new Error(errorData.error || `Failed to create lead (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success) {
        setLeads(prev => [result.data, ...prev]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create lead');
      }
    } catch (err) {
      console.error('Create lead error:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your connection.');
      }
      throw new Error(err instanceof Error ? err.message : 'Failed to create lead');
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    if (!currentBusiness?.id) {
      throw new Error('No business selected');
    }

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/leads', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': currentBusiness.id,
          'authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        throw new Error('Failed to update lead');
      }

      const result = await response.json();
      
      if (result.success) {
        setLeads(prev => prev.map(lead => 
          lead.id === id ? { ...lead, ...result.data } : lead
        ));
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update lead');
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update lead');
    }
  };

  const deleteLead = async (id: string) => {
    if (!currentBusiness?.id) {
      throw new Error('No business selected');
    }

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/leads', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': currentBusiness.id,
          'authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }

      const result = await response.json();
      
      if (result.success) {
        setLeads(prev => prev.filter(lead => lead.id !== id));
        return true;
      } else {
        throw new Error(result.error || 'Failed to delete lead');
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete lead');
    }
  };

  const updateLeadField = async (leadId: string, field: string, value: any) => {
    return await updateLead(leadId, { [field]: value });
  };

  const addTag = async (leadId: string, tag: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const updatedTags = [...(lead.tags || []), tag];
    return await updateLead(leadId, { tags: updatedTags });
  };

  const updateTag = async (leadId: string, tagIndex: number, newValue: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const updatedTags = [...lead.tags];
    updatedTags[tagIndex] = newValue;
    return await updateLead(leadId, { tags: updatedTags });
  };

  const removeTag = async (leadId: string, tagIndex: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const updatedTags = [...lead.tags];
    updatedTags.splice(tagIndex, 1);
    return await updateLead(leadId, { tags: updatedTags });
  };

  useEffect(() => {
    fetchLeads();
  }, [currentBusiness?.id]);

  return {
    leads,
    loading,
    error,
    refetch: fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    updateLeadField,
    addTag,
    updateTag,
    removeTag,
  };
};

export type { Lead, LeadStatus };
