'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, Shield, AlertCircle, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('superAdminToken');
    if (token) {
      router.push('/super-admin/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Mock authentication with enhanced feedback
    setTimeout(() => {
      if (email === 'admin@orbytcrm.com' && password === 'admin123') {
        setIsSuccess(true);
        setTimeout(() => {
          localStorage.setItem('superAdminToken', 'mock-super-admin-token');
          localStorage.setItem('superAdminUser', JSON.stringify({
            id: 'admin-1',
            name: 'Super Admin',
            email: 'admin@orbytcrm.com',
            role: 'super_admin'
          }));
          router.push('/super-admin/dashboard');
        }, 1000);
      } else {
        setError('Invalid credentials. Use admin@orbytcrm.com / admin123 for demo');
        setIsLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-pink-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>
      
      <div className="relative w-full max-w-md z-10">
        {/* Logo and Brand */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-6 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
            Super Admin Portal
          </h1>
          <p className="text-slate-300 text-sm flex items-center justify-center">
            <Sparkles className="w-4 h-4 mr-1" />
            Orbyt Booking Platform Management
            <Sparkles className="w-4 h-4 ml-1" />
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl animate-slide-up">
          {isSuccess ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4 animate-bounce">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Login Successful!</h3>
              <p className="text-slate-300">Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              )}

              {/* Email Field */}
              <div className={`space-y-2 transition-all duration-300 ${focusedField === 'email' ? 'transform scale-105' : ''}`}>
                <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                    focusedField === 'email' ? 'text-purple-400' : 'text-slate-400'
                  }`} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField('')}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    placeholder="admin@orbytcrm.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className={`space-y-2 transition-all duration-300 ${focusedField === 'password' ? 'transform scale-105' : ''}`}>
                <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                  Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                    focusedField === 'password' ? 'text-purple-400' : 'text-slate-400'
                  }`} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField('')}
                    className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors duration-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 bg-white/5 border-white/10 rounded text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                  />
                  <span className="ml-2 text-sm text-slate-300">Remember me</span>
                </label>
                <Link href="#" className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-300">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Authenticating...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    Sign In to Super Admin
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </div>
                )}
              </button>
            </form>
          )}

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl">
            <p className="text-xs text-blue-300 font-medium mb-1 flex items-center">
              <Sparkles className="w-3 h-3 mr-1" />
              Demo Credentials:
            </p>
            <p className="text-xs text-blue-200">Email: admin@orbytcrm.com</p>
            <p className="text-xs text-blue-200">Password: admin123</p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center animate-fade-in animation-delay-1000">
          <p className="text-slate-400 text-sm">
            <Link href="/auth/login" className="text-purple-400 hover:text-purple-300 transition-colors duration-300">
              Business Admin Login
            </Link>
            {' • '}
            <Link href="/" className="text-purple-400 hover:text-purple-300 transition-colors duration-300">
              Back to Site
            </Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
        .animate-slide-up { animation: slide-up 0.8s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}
