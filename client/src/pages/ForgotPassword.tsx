import { useState } from "react";
import { useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { AlertCircle, Loader2, KeyRound, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import arcloLogo from "@assets/A_small_logo_1765393189114.png";
import { colors } from "@/lib/design-system";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send reset email");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-md mx-auto">
            <GlassCard variant="marketing"className="bg-white border border-[#CBD5E1] shadow-[0_8px_24px_rgba(15,23,42,0.08)] rounded-2xl">
              <GlassCardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <img src={arcloLogo} alt="Arclo" className="h-16 w-auto" />
                </div>
                <GlassCardTitle className="text-2xl text-[#020617]">Check your email</GlassCardTitle>
                <p className="text-sm" style={{ color: colors.text.muted }}>
                  If an account exists with this email, you will receive a password reset link.
                </p>
              </GlassCardHeader>
              <GlassCardContent className="text-center">
                <p className="text-[#64748B] text-sm">
                  The link expires in 1 hour. Check your spam folder if you don't see it.
                </p>
              </GlassCardContent>
              <div className="p-6 pt-0">
                <Button 
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate("/login")}
                  data-testid="button-back-to-login"
                >
                  Back to Sign In
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <GlassCard variant="marketing"className="bg-white border border-[#CBD5E1] shadow-[0_8px_24px_rgba(15,23,42,0.08)] rounded-2xl">
            <GlassCardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={arcloLogo} alt="Arclo" className="h-16 w-auto" />
              </div>
              <GlassCardTitle className="text-2xl text-[#020617]">Forgot your password?</GlassCardTitle>
              <p className="text-sm" style={{ color: colors.text.muted }}>
                Enter your email to receive a password reset link
              </p>
            </GlassCardHeader>
            <GlassCardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#334155]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    data-testid="input-forgot-email"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="primaryGradient"
                  className="w-full" 
                  disabled={loading}
                  data-testid="button-forgot-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-[#64748B] mt-6">
                Remember your password?{" "}
                <a href="/login" className="text-[#15803D] hover:text-[#166534] hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    </MarketingLayout>
  );
}
