'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { applyAdminLoginRedirect } from '@/lib/applyAdminLoginRedirect';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

/**
 * Auth callback for magic link / OAuth redirects.
 * - OAuth (PKCE): `?code=` → exchangeCodeForSession → admin login routing
 * - Magic link: access_token + refresh_token in query or hash → setSession → ?next=
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      const oauthError = searchParams.get('error_description') || searchParams.get('error');
      if (oauthError) {
        setStatus('error');
        setMessage(oauthError);
        return;
      }

      const code = searchParams.get('code');
      const next = searchParams.get('next') || '/admin';

      try {
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          const user = data.session?.user;
          if (!user) {
            setStatus('error');
            setMessage('Could not sign you in.');
            return;
          }

          setStatus('success');
          await applyAdminLoginRedirect(user, toast);
          return;
        }

        let accessToken: string | null = searchParams.get('access_token');
        let refreshToken: string | null = searchParams.get('refresh_token');

        if ((!accessToken || !refreshToken) && typeof window !== 'undefined' && window.location.hash) {
          const hash = window.location.hash.slice(1);
          const params = new URLSearchParams(hash);
          accessToken = accessToken || params.get('access_token');
          refreshToken = refreshToken || params.get('refresh_token');
        }

        if (!accessToken || !refreshToken) {
          setStatus('error');
          setMessage('Invalid or expired link. Please try again.');
          return;
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) throw error;

        if (data.session) {
          setStatus('success');
          router.replace(next);
        } else {
          setStatus('error');
          setMessage('Could not sign you in.');
        }
      } catch (err: unknown) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Something went wrong.');
      }
    };

    void run();
  }, [router, searchParams, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Signing you in...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-red-600 mb-4">{message}</p>
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Go to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
