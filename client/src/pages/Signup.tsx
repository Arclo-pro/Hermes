import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, AlertCircle, Loader2, UserPlus, CheckCircle, Mail, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordRequirements, isPasswordValid } from "@/components/ui/PasswordRequirements";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { buildRoute, ROUTES } from "@shared/routes";
import arcloLogo from "@assets/A_small_logo_1765393189114.png";

interface InviteData {
  success: boolean;
  invitation?: {
    email: string;
    invitedBy: string;
    expiresAt: string;
  };
  error?: string;
}

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [existingAccount, setExistingAccount] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invitedSuccess, setInvitedSuccess] = useState(false);
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const scanId = params.get("scanId");
  const inviteToken = params.get("invite");

  // Fetch invite details if token present
  const { data: inviteData, isLoading: inviteLoading } = useQuery<InviteData>({
    queryKey: ['inviteValidation', inviteToken],
    queryFn: async () => {
      if (!inviteToken) return { success: false };
      const res = await fetch(`/api/account/invite/${inviteToken}`);
      return res.json();
    },
    enabled: !!inviteToken,
  });

  // Pre-fill email if from invitation
  useEffect(() => {
    if (inviteData?.success && inviteData.invitation?.email) {
      setEmail(inviteData.invitation.email);
    }
  }, [inviteData]);

  const signupMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; displayName?: string; scanId?: string; websiteUrl?: string; inviteToken?: string }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Signup failed");
      }
      return result;
    },
    onSuccess: (data) => {
      if (data.existingAccount) {
        setError(null);
        setExistingAccount(true);
      } else if (data.invited) {
        // Invited users can sign in immediately
        setInvitedSuccess(true);
      } else {
        setSuccess(true);
      }
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExistingAccount(false);

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!isPasswordValid(password)) {
      setError("Password does not meet all requirements");
      return;
    }

    signupMutation.mutate({
      email,
      password,
      displayName: displayName.trim() || undefined,
      scanId: scanId || undefined,
      inviteToken: inviteToken || undefined,
    });
  };

  // Success state for invited users (can sign in immediately)
  if (invitedSuccess) {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-md mx-auto">
            <Card className="bg-white border border-[#CBD5E1] shadow-[0_8px_24px_rgba(15,23,42,0.08)] rounded-2xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <img src={arcloLogo} alt="Arclo" className="h-16 w-auto" />
                </div>
                <CardTitle className="text-2xl text-[#020617]">Welcome to the team!</CardTitle>
                <CardDescription className="text-[#64748B]">
                  Your account has been created successfully
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-[#15803D]">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">You're now part of the team</span>
                </div>
                <p className="text-[#64748B] text-sm">
                  You have full access to all websites and features. Sign in to get started.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="primaryGradient"
                  className="w-full h-12"
                  onClick={() => navigate("/login")}
                  data-testid="button-sign-in-after-invite"
                >
                  Sign In Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  // Success state for regular signups (need to verify email)
  if (success) {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-md mx-auto">
            <Card className="bg-white border border-[#CBD5E1] shadow-[0_8px_24px_rgba(15,23,42,0.08)] rounded-2xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <img src={arcloLogo} alt="Arclo" className="h-16 w-auto" />
                </div>
                <CardTitle className="text-2xl text-[#020617]">Check your email</CardTitle>
                <CardDescription className="text-[#64748B]">
                  We sent a verification link to <span className="text-[#15803D] font-medium">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <p className="text-[#64748B] text-sm">
                  Click the link in the email to verify your account. The link expires in 24 hours.
                </p>
                <p className="text-[#64748B] text-xs">
                  Didn't receive the email? Check your spam folder or{" "}
                  <a href="/resend-verification" className="text-[#15803D] hover:text-[#166534] hover:underline font-medium">
                    request a new link
                  </a>
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate("/login")}
                  data-testid="button-back-to-login"
                >
                  Back to Sign In
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <Card className="bg-white border border-[#CBD5E1] shadow-[0_8px_24px_rgba(15,23,42,0.08)] rounded-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={arcloLogo} alt="Arclo" className="h-16 w-auto" />
              </div>
              <CardTitle className="text-2xl text-[#020617]">
                {inviteData?.success ? "Join the Team" : "Create Your Free Account"}
              </CardTitle>
              <CardDescription className="text-[#64748B]">
                {inviteData?.success
                  ? `${inviteData.invitation?.invitedBy} invited you to join their Arclo account`
                  : scanId
                  ? "Unlock your full SEO report and start deploying fixes"
                  : "Get started with automated SEO"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Invitation context */}
                {inviteData?.success && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Users className="w-5 h-5" />
                      <span className="font-medium">Team Invitation</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You'll have full access to all websites and SEO tools in{" "}
                      <strong>{inviteData.invitation?.invitedBy}'s</strong> account.
                    </p>
                  </div>
                )}

                {/* Invalid/expired invite warning */}
                {inviteToken && !inviteLoading && !inviteData?.success && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {inviteData?.error || "This invitation is invalid or has expired. Please request a new one."}
                    </AlertDescription>
                  </Alert>
                )}

                {existingAccount && (
                  <Alert className="border-[#15803D]/30 bg-[#15803D]/10">
                    <CheckCircle className="h-4 w-4 text-[#15803D]" />
                    <AlertDescription className="text-[#15803D]">
                      An account with this email already exists.{" "}
                      <a href={`/login?email=${encodeURIComponent(email)}`} className="font-medium underline hover:opacity-80">
                        Sign in instead
                      </a>
                    </AlertDescription>
                  </Alert>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-[#334155]">Name (optional)</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={signupMutation.isPending}
                    data-testid="input-signup-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#334155]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={signupMutation.isPending || (inviteData?.success ?? false)}
                    className={inviteData?.success ? "bg-muted" : ""}
                    data-testid="input-signup-email"
                  />
                  {inviteData?.success && (
                    <p className="text-xs text-muted-foreground">
                      This email is linked to the team invitation
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#334155]">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={signupMutation.isPending}
                    data-testid="input-signup-password"
                  />
                  <PasswordRequirements password={password} className="mt-2" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[#334155]">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={signupMutation.isPending}
                    data-testid="input-signup-confirm-password"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="primaryGradient"
                  className="w-full h-12" 
                  disabled={signupMutation.isPending}
                  data-testid="button-signup-submit"
                >
                  {signupMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Free Account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Free forever for basic features</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Cancel anytime</span>
                </div>
              </div>

              <p className="text-center text-sm text-[#64748B] mt-6">
                Already have an account?{" "}
                <a href="/login" className="text-[#15803D] hover:text-[#166534] hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MarketingLayout>
  );
}
