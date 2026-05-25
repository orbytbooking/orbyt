'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FiCheckCircle, FiAlertCircle, FiLoader, FiRefreshCw } from 'react-icons/fi';

function EmailConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const confirmEmail = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        setStatus('error');
        setMessage('Invalid confirmation link. Please try signing up again.');
        return;
      }

      try {
        // First try to set the session
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          // Check if it's an expired token error
          if (error.message.includes('expired') || error.message.includes('invalid')) {
            setStatus('expired');
            setMessage('Your confirmation link has expired. Please request a new one.');
            return;
          }
          throw error;
        }

        if (data.session) {
          setStatus('success');
          setMessage('Email confirmed! Redirecting to complete your business setup...');
          
          // Redirect to onboarding after a short delay
          setTimeout(() => {
            router.push('/auth/onboarding');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Failed to confirm email. Please try again.');
        }
      } catch (error: any) {
        console.error('Email confirmation error:', error);
        
        // Handle specific error cases
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          setStatus('expired');
          setMessage('Your confirmation link has expired. Please request a new one.');
        } else {
          setStatus('error');
          setMessage('Something went wrong. Please try signing up again.');
        }
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  const handleResendConfirmation = async () => {
    if (!email) {
      setMessage('Please enter your email address.');
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        }
      });

      if (error) throw error;

      setMessage('New confirmation email sent! Please check your inbox.');
      setStatus('loading');
    } catch (error: any) {
      console.error('Resend error:', error);
      setMessage(error.message || 'Failed to resend confirmation email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirming your email...</h2>
              <p className="text-gray-600">Please wait while we verify your account.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <FiCheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Confirmed!</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="animate-pulse">
                <p className="text-sm text-blue-600">Redirecting to onboarding...</p>
              </div>
            </>
          )}

          {status === 'expired' && (
            <>
              <div className="flex justify-center mb-6">
                <FiAlertCircle className="w-16 h-16 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Link Expired</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              
              <div className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                
                <button
                  onClick={handleResendConfirmation}
                  disabled={resending || !email}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {resending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <FiRefreshCw className="w-4 h-4" />
                      <span>Resend Confirmation Email</span>
                    </>
                  )}
                </button>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
                  >
                    Go to Login
                  </button>
                  <button
                    onClick={() => router.push('/auth/signup')}
                    className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
                  >
                    Sign Up Again
                  </button>
                </div>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-6">
                <FiAlertCircle className="w-16 h-16 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirmation Failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/auth/signup')}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Try Signing Up Again
                </button>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
                >
                  Go to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmailConfirmation() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <EmailConfirmationContent />
    </Suspense>
  );
}
