"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, User, Lock, ArrowLeft } from "lucide-react";
import { getSupabaseProviderClient } from "@/lib/supabaseProviderClient";

export default function ProviderLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Sign in with Supabase Auth
      const { data, error } = await getSupabaseProviderClient().auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        toast({
          title: "Login Failed",
          description: error.message || "Invalid email or password.",
          variant: "destructive",
        });
        return;
      }

      // Check if user is a provider
      const user = data.user;
      if (!user) {
        toast({
          title: "Login Failed",
          description: "Authentication failed.",
          variant: "destructive",
        });
        return;
      }

      // Get user metadata to check role
      const userRole = user.user_metadata?.role;
      if (userRole !== 'provider') {
        toast({
          title: "Access Denied",
          description: "This login is for providers only. Please use the correct login page.",
          variant: "destructive",
        });
        // Sign out the user
        await getSupabaseProviderClient().auth.signOut();
        return;
      }

      // Get provider details
      const { data: providerData, error: providerError } = await getSupabaseProviderClient()
        .from('service_providers')
        .select(`
          *,
          businesses(name)
        `)
        .eq('user_id', user.id)
        .single();

      if (providerError) {
        console.error('Provider data error:', providerError);
        toast({
          title: "Login Failed",
          description: "Could not retrieve provider information.",
          variant: "destructive",
        });
        return;
      }

      // Check provider status
      if (providerData.status !== 'active') {
        toast({
          title: "Account Inactive",
          description: `Your provider account is currently ${providerData.status}. Please contact your administrator.`,
          variant: "destructive",
        });
        await getSupabaseProviderClient().auth.signOut();
        return;
      }

      toast({
        title: "Login Successful",
        description: `Welcome back, ${providerData.first_name}!`,
      });

      // Redirect to provider dashboard
      router.push("/provider/dashboard");
      
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-cyan-100 w-fit">
            <User className="h-8 w-8 text-cyan-600" />
          </div>
          <CardTitle className="text-cyan-700">Provider Login</CardTitle>
          <p className="text-sm text-gray-600">
            Sign in to your provider portal
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Don't have an account yet?
              </p>
              <p className="text-xs text-gray-500">
                You need an invitation to create a provider account.
              </p>
              <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                Business owner or admin?{' '}
                <button
                  type="button"
                  onClick={() => router.push("/auth/login")}
                  className="text-cyan-600 hover:underline font-medium"
                >
                  Sign in to your business account
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
