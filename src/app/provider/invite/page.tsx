"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

function ProviderInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invitationValid, setInvitationValid] = useState<boolean | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [step, setStep] = useState<"validate" | "setup" | "success">("validate");

  useEffect(() => {
    const urlToken = searchParams.get("token");
    const urlEmail = searchParams.get("email");
    
    if (urlToken && urlEmail) {
      setToken(urlToken);
      setEmail(decodeURIComponent(urlEmail));
      validateInvitation(urlToken, decodeURIComponent(urlEmail));
    } else {
      setInvitationValid(false);
    }
  }, [searchParams]);

  const validateInvitation = async (invitationToken: string, invitationEmail: string) => {
    try {
      setLoading(true);
      
      // Use API endpoint to validate invitation (bypasses RLS)
      const response = await fetch(`/api/invitations/validate?token=${encodeURIComponent(invitationToken)}&email=${encodeURIComponent(invitationEmail)}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('Invitation validation error:', data.error);
        setInvitationValid(false);
        return;
      }

      if (!data.valid || !data.invitation) {
        console.error('No invitation found');
        setInvitationValid(false);
        return;
      }

      setInvitationData(data.invitation);
      setInvitationValid(true);
      
    } catch (error) {
      console.error('Validation error:', error);
      setInvitationValid(false);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    return strength;
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength <= 2) return "text-red-500";
    if (strength <= 3) return "text-yellow-500";
    return "text-green-500";
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength <= 2) return "Weak";
    if (strength <= 3) return "Medium";
    return "Strong";
  };

  const handleSubmit = async () => {
    // Validate passwords
    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Call API to accept invitation
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitationData.id,
          password,
          firstName: invitationData.first_name,
          lastName: invitationData.last_name,
          email,
          phone: invitationData.phone,
          address: invitationData.address,
          businessId: invitationData.business_id,
          providerType: invitationData.provider_type
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept invitation');
      }

      setStep("success");
      
      toast({
        title: "Account Created Successfully!",
        description: "Your provider account has been set up. You can now log in to the provider portal.",
      });

      // Redirect to provider login after a short delay
      setTimeout(() => {
        router.push('/provider/login');
      }, 2000);

    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "An error occurred while setting up your account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && invitationValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  if (invitationValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-red-100 w-fit">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-700">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              This invitation link is invalid, has expired, or has already been used.
            </p>
            <p className="text-sm text-gray-500">
              Please contact the business administrator for a new invitation.
            </p>
            <Button
              onClick={() => router.push("/")}
              className="w-full"
              variant="outline"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    // Redirect to provider login immediately
    useEffect(() => {
      router.push('/provider/login');
    }, []);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-cyan-100 w-fit">
            <Mail className="h-8 w-8 text-cyan-600" />
          </div>
          <CardTitle className="text-cyan-700">Set Up Your Provider Account</CardTitle>
          <p className="text-sm text-gray-600">
            Welcome to {invitationData?.business?.name}!
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-800">Invitation Details:</p>
            <p className="text-sm text-blue-700">Name: {invitationData?.first_name} {invitationData?.last_name}</p>
            <p className="text-sm text-blue-700">Email: {email}</p>
            <p className="text-sm text-blue-700">Type: {invitationData?.provider_type}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Create Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
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
              {password && (
                <div className="flex items-center gap-2 text-sm">
                  <span>Password strength:</span>
                  <span className={getPasswordStrengthColor(getPasswordStrength(password))}>
                    {getPasswordStrengthText(getPasswordStrength(password))}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
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
              onClick={handleSubmit}
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </>
              ) : (
                "Create My Account"
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full"
            >
              Cancel
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProviderInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ProviderInviteContent />
    </Suspense>
  );
}
