"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, Mail, AlertCircle } from "lucide-react";

function StaffInviteContent() {
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
  const [invitationData, setInvitationData] = useState<{
    id: string;
    business_id: string;
    first_name: string;
    last_name: string;
    role: string;
    business?: { name: string };
  } | null>(null);
  const [step, setStep] = useState<"validate" | "setup" | "success">("validate");

  useEffect(() => {
    const urlToken = searchParams.get("token");
    const urlEmail = searchParams.get("email");
    if (urlToken && urlEmail) {
      setToken(urlToken);
      const decoded = decodeURIComponent(urlEmail);
      setEmail(decoded);
      validateInvitation(urlToken, decoded);
    } else {
      setInvitationValid(false);
    }
  }, [searchParams]);

  const validateInvitation = async (invitationToken: string, invitationEmail: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/staff-invitations/validate?token=${encodeURIComponent(invitationToken)}&email=${encodeURIComponent(invitationEmail)}`
      );
      const data = await response.json();
      if (!response.ok || !data.valid || !data.invitation) {
        setInvitationValid(false);
        return;
      }
      setInvitationData(data.invitation);
      setInvitationValid(true);
    } catch {
      setInvitationValid(false);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[a-z]/.test(p)) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return s;
  };

  const strengthColor = (s: number) => {
    if (s <= 2) return "text-red-500";
    if (s <= 3) return "text-yellow-500";
    return "text-green-500";
  };

  const strengthText = (s: number) => {
    if (s <= 2) return "Weak";
    if (s <= 3) return "Medium";
    return "Strong";
  };

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please use the same password in both fields.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (!invitationData) return;

    setLoading(true);
    try {
      const response = await fetch("/api/staff-invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId: invitationData.id,
          password,
          email,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.details || "Failed to accept invitation");
      }
      setStep("success");
      toast({
        title: "You're all set",
        description: "Sign in with your email and the password you just created.",
      });
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      toast({ title: "Setup failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading && invitationValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Validating invitation…</p>
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
            <CardTitle className="text-red-700">Invalid invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">This link is invalid, expired, or already used.</p>
            <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
              Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to sign in…</p>
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
          <CardTitle className="text-cyan-800">Join your team</CardTitle>
          <p className="text-sm text-gray-600">{invitationData?.business?.name}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-900 space-y-1">
            <p>
              <strong>Name:</strong> {invitationData?.first_name} {invitationData?.last_name}
            </p>
            <p>
              <strong>Email:</strong> {email}
            </p>
            <p>
              <strong>Role:</strong> {invitationData?.role}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {password ? (
              <p className={`text-sm ${strengthColor(getPasswordStrength(password))}`}>
                Strength: {strengthText(getPasswordStrength(password))}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            {loading ? "Creating account…" : "Create account & join"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StaffInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
        </div>
      }
    >
      <StaffInviteContent />
    </Suspense>
  );
}
