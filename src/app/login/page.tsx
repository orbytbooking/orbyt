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

type StoredAccount = {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
};

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
  const [hasAccount, setHasAccount] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const getStoredAccount = (): StoredAccount | null => {
    if (typeof window === "undefined") return null;
    const storedAccount = localStorage.getItem("customerAccount");
    if (!storedAccount) return null;
    try {
      return JSON.parse(storedAccount) as StoredAccount;
    } catch {
      localStorage.removeItem("customerAccount");
      return null;
    }
  };

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
    const storedAccount = getStoredAccount();
    const accountExists = Boolean(storedAccount);
    setHasAccount(accountExists);
    if (!accountExists) {
      setIsLogin(false);
    }

    if (
      typeof window !== "undefined" &&
      accountExists &&
      localStorage.getItem("customerAuth") === "true"
    ) {
      router.replace("/customer/dashboard");
    }
  }, [router]);

  // Handle login submission
  async function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    try {
      const storedAccount = getStoredAccount();
      if (!storedAccount) {
        toast({
          title: "No account found",
          description: "Please sign up before trying to sign in.",
          variant: "destructive",
        });
        setIsLogin(false);
        setHasAccount(false);
        return;
      }

      if (
        storedAccount.email !== values.email ||
        storedAccount.password !== values.password
      ) {
        throw new Error("Invalid credentials");
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Login Successful!",
        description: `Welcome back! You've been logged in.`,
      });
      
      localStorage.setItem("customerAuth", "true");
      router.push("/customer/dashboard");
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Handle signup submission
  async function onSignupSubmit(values: z.infer<typeof signupSchema>) {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Account Created!",
        description: `Welcome ${values.name}! Your account has been created successfully.`,
      });
      
      const accountData: StoredAccount = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
        password: values.password,
      };

      localStorage.setItem("customerAccount", JSON.stringify(accountData));
      localStorage.setItem("customerAuth", "false");
      setHasAccount(true);
      setIsLogin(true);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error creating your account. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Handle forgot password submission
  async function onForgotPasswordSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    try {
      // Simulate API call to send reset email
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setResetEmailSent(true);
      
      toast({
        title: "Reset Email Sent!",
        description: `We've sent a password reset link to ${values.email}`,
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
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
                <img src="/images/logo.png" alt="Orbyt Cleaners" className="h-20 w-20" />
              </div>
              <h2 className="text-2xl font-bold gradient-text mb-4">Orbyt Cleaners</h2>
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

                  {!hasAccount && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      Please create an account before signing in.
                    </div>
                  )}

                  <Button 
                    type="submit"
                    className="w-full h-11 text-base group"
                    disabled={!hasAccount || loginForm.formState.isSubmitting}
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
