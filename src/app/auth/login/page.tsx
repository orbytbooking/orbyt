"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// Login schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please confirm your email first. Check your inbox for the confirmation link.');
        } else {
          throw error;
        }
      }

      if (data.user) {
        // Get user role from metadata
        const userRole = data.user.user_metadata?.role || 'owner';
        
        // Check if user is a customer - this login page is NOT for customers
        if (userRole === 'customer') {
          // Sign out the user since they're a customer trying to use admin login
          await supabase.auth.signOut();
          throw new Error('This login page is for business accounts only. Please use the customer login page.');
        }
        
        // Check if user has completed onboarding by looking for their business
        // For providers, they don't need a business to access their dashboard
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id, name, is_active')
          .eq('owner_id', data.user.id)
          .maybeSingle();

        // If no business exists for providers, that's okay - they can still access their dashboard
        // Only redirect to onboarding if user is an owner (admin) without a business
        if (!business && userRole === 'owner') {
          console.log('No business found for owner, redirecting to onboarding');
          toast({
            title: "Welcome!",
            description: "Please complete your business setup to continue.",
          });
          setTimeout(() => {
            router.push("/auth/onboarding");
          }, 500);
          return;
        }

        // For providers, always allow access to their dashboard
        if (businessError) {
          console.warn('Business query warning:', businessError);
        }

        toast({
          title: "Login Successful!",
          description: `Welcome back${data.user.user_metadata?.full_name ? ', ' + data.user.user_metadata.full_name : ''}!`,
        });

        // Clear any existing business context to prevent cross-role contamination
        localStorage.removeItem('currentBusinessId');
        
        // Set business context only if available and user is owner/admin
        if (business?.id && (userRole === 'owner' || userRole === 'admin')) {
          localStorage.setItem('currentBusinessId', business.id);
        }

        // Redirect based on user role - don't use stored business context for providers
        const redirectPath = userRole === 'provider' ? '/provider/dashboard' : '/admin/dashboard';
        setTimeout(() => {
          router.push(redirectPath);
        }, 500);
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src="/images/orbit.png" alt="Orbit Booking" className="h-20 w-20" />
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#0C2B4E' }}>Orbyt Booking</h1>
            <p className="text-muted-foreground text-sm">Sign in to your account</p>
          </div>

          {/* Login Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input 
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 h-11"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input 
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="pl-10 pr-10 h-11"
                          {...field} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" />
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <Link href="/auth/resend" className="text-sm text-primary hover:underline">
                  Resend confirmation
                </Link>
              </div>

              <Button 
                type="submit"
                className="w-full h-11 text-base"
                style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="space-y-4 pt-2">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  type="button" 
                  className="w-full h-11 text-base border-primary/50 hover:border-primary"
                  onClick={() => router.push('/auth/signup')}
                >
                  Create an account
                </Button>
                
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/auth/signup" className="text-primary hover:underline font-medium">
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </Form>
        </div>

        {/* Back to Website */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link 
            href="/"
            className="text-primary hover:underline font-medium"
          >
            ← Back to Website
          </Link>
        </p>
      </div>
    </div>
  );
}
