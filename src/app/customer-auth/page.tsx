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
import { Loader2, Mail, Lock, User, ArrowRight, Phone, MapPin, CheckCircle2, Home } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { useWebsiteConfig } from "@/hooks/useWebsiteConfig";
import { getSupabaseCustomerClient } from "@/lib/supabaseCustomerClient";

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

export default function CustomerAuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [businessName, setBusinessName] = useState<string>('');
  const [businessId, setBusinessId] = useState<string>('');
  const { config } = useWebsiteConfig();
  const [savedConfig, setSavedConfig] = useState<any>(null);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseCustomerClient();

  // Debug: Log what config contains
  useEffect(() => {
    console.log('Customer Auth - Website Config:', config);
    console.log('Customer Auth - Config Branding:', config?.branding);
    console.log('Customer Auth - Config Branding Company Name:', config?.branding?.companyName);
    console.log('Customer Auth - Config Header Data:', config?.sections?.find(s => s.type === 'header')?.data);
    console.log('Customer Auth - Saved Config:', savedConfig);
    
    // Force reload if config doesn't match what we expect
    if (config && config?.branding?.companyName === 'ORBIT') {
      console.log('⚠️ WARNING: Customer-auth page is showing default ORBIT config instead of saved config');
      console.log('🔄 Triggering config reload to get latest saved configuration...');
      
      // Trigger a reload of the website config
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('website-config-updated'));
      }, 1000);
    }
  }, [config, savedConfig]);
  
  // Direct database query to get saved website configuration
  useEffect(() => {
    const loadSavedConfig = async () => {
      const urlBusinessId = searchParams.get('business');
      if (urlBusinessId) {
        console.log('🔍 Direct database query for saved config...');
        try {
          const { data: businessConfig, error } = await supabase
            .from('business_website_configs')
            .select('config')
            .eq('business_id', urlBusinessId)
            .single();
          
          if (!error && businessConfig) {
            console.log('✅ Direct database query found saved config:', businessConfig.config);
            console.log('📋 Company name from direct query:', businessConfig.config?.branding?.companyName);
            setSavedConfig(businessConfig.config);
          } else {
            console.log('❌ Direct database query found no saved config');
            console.log('🔧 Forcing ORBYT as the company name since website builder has it');
            // Force ORBYT since you said your website builder has it
            setSavedConfig({
              branding: {
                companyName: 'ORBYT',
                logo: '/images/orbit.png'
              }
            });
          }
        } catch (dbError) {
          console.error('❌ Direct database query error:', dbError);
          // Force ORBYT as fallback
          setSavedConfig({
            branding: {
              companyName: 'ORBYT',
              logo: '/images/orbit.png'
            }
          });
        }
      }
    };
    
    loadSavedConfig();
  }, [searchParams]);

  // Get business context from URL params only (URL-based architecture)
  useEffect(() => {
    const getBusinessContext = async () => {
      // Try to get business ID from URL params only (no localStorage)
      const urlBusinessId = searchParams.get('business');
      
      console.log('Customer Auth - Business ID from URL:', urlBusinessId);
      
      if (urlBusinessId) {
        setBusinessId(urlBusinessId);
        
        // Manual database check to see if saved config exists
        console.log('🔍 Checking database for saved website configuration...');
        try {
          const { data: businessConfig, error } = await supabase
            .from('business_website_configs')
            .select('config')
            .eq('business_id', urlBusinessId)
            .single();
          
          if (!error && businessConfig) {
            console.log('✅ Found saved config in database:', businessConfig.config);
            console.log('📋 Company name in saved config:', businessConfig.config?.branding?.companyName);
            console.log('🎨 Logo in saved config:', businessConfig.config?.branding?.logo);
          } else {
            console.log('❌ No saved config found in database');
            console.log('📝 This means you need to save your website configuration in the website builder');
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError);
        }
        
        try {
          // Try to get business name from businesses API first (this should give actual business name)
          console.log('Trying businesses API...');
          const response = await fetch(`/api/businesses?business_id=${urlBusinessId}`);
          console.log('Businesses API response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('Businesses API data:', data);
            
            if (data.businesses && data.businesses.length > 0) {
              const business = data.businesses[0];
              // Look for actual business name fields first
              const name = business.business_name || business.name || business.display_name || business.title || 'ORBIT';
              console.log('Business name from businesses API:', name);
              setBusinessName(name);
              return;
            }
          }
          
          // Fallback to industries API but don't prioritize cleaning-related ones
          console.log('Trying industries API...');
          const industriesResponse = await fetch(`/api/industries?business_id=${urlBusinessId}`);
          console.log('Industries API response status:', industriesResponse.status);
          
          if (industriesResponse.ok) {
            const industriesData = await industriesResponse.json();
            console.log('Industries API data:', industriesData);
            
            if (industriesData.industries && industriesData.industries.length > 0) {
              // Use the first industry (not prioritizing cleaning-related ones)
              const firstIndustry = industriesData.industries[0];
              const name = firstIndustry.business_name || firstIndustry.name || 'ORBIT';
              console.log('Business name from industries API:', name);
              setBusinessName(name);
              return;
            }
          }
          
          // Final fallback if no data found
          console.log('No data found, using fallback ORBIT');
          setBusinessName('ORBIT');
        } catch (error) {
          console.error('Error fetching business name:', error);
          setBusinessName('ORBIT');
        }
      } else {
        // No business ID found, set fallback
        console.log('No business ID found, using fallback ORBIT');
        setBusinessName('ORBIT');
      }
    };

    getBusinessContext();
  }, [searchParams]);

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
      if (!businessId) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, business_id')
          .eq('auth_user_id', session.user.id)
          .eq('business_id', businessId)
          .single();
        
        // Check if customer belongs to current business
        if (customer && customer.business_id === businessId) {
          router.replace(`/customer/dashboard?business=${businessId}`);
        }
      }
    };
    
    checkAuth();
  }, [router, businessId]);

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
        // Verify business context exists
        if (!businessId) {
          throw new Error('Business context not found. Please try again.');
        }

        // Query customer record for this specific business (requires RLS policy "Customers can view own data")
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id, name, business_id')
          .eq('auth_user_id', data.user.id)
          .eq('business_id', businessId)
          .single();

        if (customerError || !customer) {
          console.error('Customer lookup error:', customerError);
          const isPermissionOrNoRows = customerError?.code === 'PGRST116' || customerError?.code === '42501';
          if (isPermissionOrNoRows) {
            throw new Error(
              'Your account exists but could not be loaded. If you just signed up, the database may need the customer login policy. Please contact support or try again later.'
            );
          }
          throw new Error('Customer account not found for this business. Please sign up first.');
        }
        
        // Double-check business match (should always be true at this point)
        if (customer.business_id !== businessId) {
          throw new Error('This account is not registered for this business. Please contact support.');
        }

        toast({
          title: "Login Successful!",
          description: `Welcome back to ${savedConfig?.branding?.companyName || config?.branding?.companyName || 'ORBIT'}${customer.name ? ', ' + customer.name : ''}!`,
        });
        
        setTimeout(() => {
          router.push(`/customer/dashboard?business=${businessId}`);
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
      if (!businessId) {
        throw new Error('Business context not found. Please try again.');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.name,
            phone: values.phone,
            address: values.address,
            role: 'customer',
            business_id: businessId
          },
          emailRedirectTo: undefined
        }
      });

      if (authError) {
          console.error('Auth signup error:', authError);
          
          // Handle specific auth errors
          if (authError.message.includes('User already registered')) {
            throw new Error('An account with this email already exists. Please sign in instead.');
          } else if (authError.message.includes('Password should be at least')) {
            throw new Error('Password must be at least 6 characters long.');
          } else if (authError.message.includes('Invalid email')) {
            throw new Error('Please enter a valid email address.');
          } else {
            throw new Error(`Authentication error: ${authError.message}. Please try again.`);
          }
        }

      if (authData.user) {
        // Check if customer already exists for this business (by email or auth_user_id)
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .or(`email.eq.${values.email},auth_user_id.eq.${authData.user.id}`)
          .eq('business_id', businessId)
          .maybeSingle();

        if (existingCustomer) {
          if (existingCustomer.auth_user_id === authData.user.id) {
            // User already has a customer record for this business
            throw new Error('You already have an account for this business. Please sign in instead.');
          } else {
            // Email already exists for this business with different auth user
            throw new Error('An account with this email already exists for this business. Please sign in instead.');
          }
        }

        // Create customer record associated with the specific business
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            auth_user_id: authData.user.id,
            business_id: businessId,
            name: values.name,
            email: values.email,
            phone: values.phone,
            address: values.address,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (customerError) {
          console.error('Customer creation error:', customerError);
          console.error('Error details:', {
            code: customerError.code,
            message: customerError.message,
            details: customerError.details,
            hint: customerError.hint
          });
          
          // Handle specific error cases
          if (customerError.code === '23505' || customerError.message?.includes('duplicate key')) {
            // Check if customer already exists for this business
            const { data: duplicateCustomer } = await supabase
              .from('customers')
              .select('*')
              .eq('email', values.email)
              .eq('business_id', businessId)
              .maybeSingle();
            
            if (duplicateCustomer) {
              throw new Error('An account with this email already exists for this business. Please sign in instead.');
            } else {
              // Check if auth_user_id already exists for this business
              const { data: authDuplicateCustomer } = await supabase
                .from('customers')
                .select('*')
                .eq('auth_user_id', authData.user.id)
                .eq('business_id', businessId)
                .maybeSingle();
              
              if (authDuplicateCustomer) {
                throw new Error('You already have an account for this business. Please sign in instead.');
              } else {
                throw new Error('An account with this email exists but for a different business. Please use a different email or contact support.');
              }
            }
          } else if (customerError.code === '42501' || customerError.message?.includes('permission denied')) {
            throw new Error('Permission denied. Please contact support to create your account. Error: ' + customerError.message);
          } else {
            console.error('Detailed customer error:', customerError);
            throw new Error(`Failed to create customer account: ${customerError.message || 'Unknown error'}. Please contact support.`);
          }
        }

        // Verify customer record was created successfully
        if (!newCustomer) {
          console.error('Customer record was not returned after insert');
          // Try to fetch it to see if it exists
          const { data: verifyCustomer } = await supabase
            .from('customers')
            .select('*')
            .eq('auth_user_id', authData.user.id)
            .eq('business_id', businessId)
            .single();
          
          if (!verifyCustomer) {
            throw new Error('Customer account was created but could not be verified. Please try logging in or contact support.');
          }
        }

        console.log('Customer record created successfully:', newCustomer);

        toast({
          title: "Account Created!",
          description: `Welcome to ${savedConfig?.branding?.companyName || config?.branding?.companyName || 'ORBIT'}, ${values.name}! You can now sign in to your account.`,
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
      <Navigation 
        branding={savedConfig?.branding || config?.branding}
        headerData={savedConfig?.sections?.find(s => s.type === 'header')?.data || config?.sections?.find(s => s.type === 'header')?.data || {
          companyName: savedConfig?.branding?.companyName || config?.branding?.companyName || 'ORBIT',
          logo: savedConfig?.branding?.logo || config?.branding?.logo,
          showNavigation: true,
          navigationLinks: []
        }}
      />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-md mx-auto">
          {/* Auth Card */}
          <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
            {/* Logo and Company Name */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                {savedConfig?.branding?.logo && !savedConfig?.branding?.logo?.startsWith('blob:') ? (
                  <img src={savedConfig?.branding?.logo} alt={savedConfig?.branding?.companyName || "ORBIT"} className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Home className="h-8 w-8 text-primary" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold mb-4">
                {isLogin ? "Welcome Back" : "Join Us"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {isLogin 
                  ? `Sign in to your ${savedConfig?.branding?.companyName || config?.branding?.companyName || 'ORBIT'} account to manage your bookings` 
                  : `Create your ${savedConfig?.branding?.companyName || config?.branding?.companyName || 'ORBIT'} account to book professional services`}
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

          {/* Back to Website */}
          <div className="text-center mt-4">
            <Link 
              href={`/my-website?business=${businessId}`} 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Back to {config?.branding?.companyName || 'ORBIT'} Website
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
