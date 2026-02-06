// Shared authentication utilities for provider modules
import { supabase } from './supabaseClient';

export interface ProviderSession {
  session: any;
  accessToken: string;
  user: any;
}

/**
 * Get authenticated provider session with proper error handling
 */
export async function getProviderSession(): Promise<ProviderSession> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    throw new Error(`Session error: ${error.message}`);
  }
  
  if (!session) {
    throw new Error('No active session found. Please log in again.');
  }
  
  if (!session.access_token) {
    throw new Error('No access token available. Please log in again.');
  }
  
  return {
    session,
    accessToken: session.access_token,
    user: session.user
  };
}

/**
 * Create authenticated headers for API calls
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { accessToken } = await getProviderSession();
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Make authenticated API call with proper error handling
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });
  
  return response;
}

/**
 * Check if user is a provider
 */
export function isProvider(user: any): boolean {
  const userRole = user?.user_metadata?.role || 'owner';
  return userRole === 'provider';
}

/**
 * Handle provider authentication errors consistently
 */
export function handleAuthError(error: any, toast: any) {
  console.error('Provider authentication error:', error);
  
  let errorMessage = 'Authentication failed';
  let errorDescription = 'Please log in again';
  
  if (error.message?.includes('No active session')) {
    errorDescription = 'Your session has expired. Please log in again.';
  } else if (error.message?.includes('No access token')) {
    errorDescription = 'Authentication token missing. Please log in again.';
  } else if (error.message?.includes('401')) {
    errorDescription = 'Access denied. Please check your permissions.';
  }
  
  toast({
    title: errorMessage,
    description: errorDescription,
    variant: "destructive"
  });
}
