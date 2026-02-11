"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail, Lock, User, ArrowRight, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabaseClient";


// Login form schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Signup form schema
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  address: z.string().min(5, "Please enter a valid address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Forgot password schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { toast } = useToast();
  const router = useRouter();


  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Signup form
  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Forgot password form
  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });


  // Reset forms when switching between login and signup
  useEffect(() => {
    loginForm.reset();
    signupForm.reset();
  }, [isLogin]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .single();
        
        if (customer) {
          router.replace("/customer/dashboard");
        }
      }
    };
    checkAuth();
  }, [router]);

  // Handle login submission
  async function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please confirm your email first. Check your inbox for the confirmation link.');
        } else {
          throw error;
        }
      }

      if (data.user) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name')
          .eq('auth_user_id', data.user.id)
          .single();

        if (!customer) {
          throw new Error('Customer account not found. Please sign up first.');
        }

        toast({
          title: "Login Successful!",
          description: `Welcome back${customer.name ? ', ' + customer.name : ''}!`,
        });
        
        setTimeout(() => {
          router.push("/customer/dashboard");
        }, 500);
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Handle signup submission
  async function onSignupSubmit(values: z.infer<typeof signupSchema>) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.name,
            phone: values.phone,
            address: values.address,
            role: 'customer'
          },
          emailRedirectTo: undefined
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Get the current business - for customer signup, we need to associate with a business
        // This could be determined by subdomain, selected business, or default business
        const { data: businessData } = await supabase
          .from('businesses')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (businessData) {
          // Create customer record associated with the business
          const { error: customerError } = await supabase
            .from('customers')
            .insert({
              auth_user_id: authData.user.id,
              business_id: businessData.id,
              name: values.name,
              email: values.email,
              phone: values.phone,
              address: values.address,
              created_at: new Date().toISOString()
            });

          if (customerError) {
            console.error('Customer creation error:', customerError);
            // Don't throw error here as auth user was created successfully
            // Log it for debugging purposes
          }
        }

        toast({
          title: "Account Created!",
          description: `Welcome ${values.name}! You can now sign in to your account.`,
        });
        
        setIsLogin(true);
      }
      
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Error",
        description: error.message || "There was an error creating your account. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Handle forgot password submission
  async function onForgotPasswordSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
      
      setResetEmailSent(true);
      
      toast({
        title: "Reset Email Sent!",
        description: `We've sent a password reset link to ${values.email}`,
      });
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Handle closing forgot password dialog
  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setResetEmailSent(false);
    forgotPasswordForm.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-md mx-auto">
          {/* Auth Card */}
          <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
            {/* Logo and Company Name */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <img src="/images/logo.png" alt="Cleaning Service" className="h-20 w-20" />
              </div>
              <h2 className="text-2xl font-bold gradient-text mb-4">Cleaning Service</h2>
              <p className="text-muted-foreground text-sm">
                {isLogin 
                  ? "Sign in to access your account and bookings" 
                  : "Join us to book professional cleaning services"}
              </p>
            </div>

            {/* Login Form */}
            {isLogin ? (
              <Form {...loginForm} key="login">
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                            <Input 
                              type="email"
                              placeholder="you@example.com"
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
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                            <Input 
                              type="password"
                              placeholder="••••••••"
                              className="pl-10 h-11"
                              {...field} 
                            />
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
                    <button 
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full h-11 text-base group"
                    disabled={loginForm.formState.isSubmitting}
                  >
                    {loginForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              // Signup Form
              <Form {...signupForm} key="signup">
                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-5">
                  <FormField
                    control={signupForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                            <Input 
                              placeholder="John Doe"
                              className="pl-10 h-11"
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                            <Input 
                              type="email"
                              placeholder="you@example.com"
                              className="pl-10 h-11"
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                            <Input 
                              type="tel"
                              placeholder="(123) 456-7890"
                              className="pl-10 h-11"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                field.onChange(value);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                            <Input 
                              placeholder="123 Main St, Chicago, IL"
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
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                            <Input 
                              type="password"
                              placeholder="••••••••"
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
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                            <Input 
                              type="password"
                              placeholder="••••••••"
                              className="pl-10 h-11"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="text-sm text-muted-foreground">
                    By signing up, you agree to our{' '}
                    <Link href="/terms-and-conditions" className="text-primary hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full h-11 text-base group"
                    disabled={signupForm.formState.isSubmitting}
                  >
                    {signupForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            )}

          </div>

          {/* Forgot Password Dialog */}
          <Dialog open={showForgotPassword} onOpenChange={handleCloseForgotPassword}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {resetEmailSent ? "Check Your Email" : "Reset Password"}
                </DialogTitle>
                <DialogDescription>
                  {resetEmailSent 
                    ? "We've sent you a password reset link. Please check your email and follow the instructions."
                    : "Enter your email address and we'll send you a link to reset your password."}
                </DialogDescription>
              </DialogHeader>

              {resetEmailSent ? (
                <div className="space-y-6 py-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Didn't receive the email? Check your spam folder or
                    </p>
                    <button
                      onClick={() => {
                        setResetEmailSent(false);
                        forgotPasswordForm.reset();
                      }}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      try another email address
                    </button>
                  </div>
                  <Button
                    onClick={handleCloseForgotPassword}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <Form {...forgotPasswordForm}>
                  <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4 py-4">
                    <FormField
                      control={forgotPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                              <Input
                                type="email"
                                placeholder="you@example.com"
                                className="pl-10 h-11"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseForgotPassword}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={forgotPasswordForm.formState.isSubmitting}
                        className="flex-1"
                      >
                        {forgotPasswordForm.formState.isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send Reset Link"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>

          {/* Footer Text */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
