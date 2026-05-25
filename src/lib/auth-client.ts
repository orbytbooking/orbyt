import { supabase } from '@/lib/supabaseClient';

export async function getAuthToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }
    
    // Return the session access token
    return session.access_token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export async function createAuthenticatedFetch(url: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };
  
  return fetch(url, {
    ...options,
    headers,
  });
}
