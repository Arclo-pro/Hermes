import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { AlertCircle, Loader2, LogIn, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import arcloLogo from "@assets/A_small_logo_1765393189114.png";
import { colors, gradients } from "@/lib/design-system";

export default function Login() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const messageFromUrl = params.get("message");
  const emailFromUrl = params.get("email");
  
  const [email, setEmail] = useState(emailFromUrl || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(messageFromUrl);
  const [showResendLink, setShowResendLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, authenticated } = useAuth();
  const [, navigate] = useLocation();
  
  useEffect(() => {
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [emailFromUrl]);

  // Redirect if already authenticated
  if (authenticated) {
    navigate("/app/overview");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowResendLink(false);
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate("/app/overview");
    } else {
      setError(result.error || "Login failed");
      if (result.error?.includes("verify your email")) {
        setShowResendLink(true);
      }
      setLoading(false);
    }
  };

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <GlassCard variant="marketing">
            <GlassCardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <img src={arcloLogo} alt="Arclo" className="h-16 w-auto" />
              </div>
              <GlassCardTitle className="text-2xl font-bold" style={{ color: colors.text.primary }}>Welcome to Arclo</GlassCardTitle>
              <p className="text-sm" style={{ color: colors.text.muted }}>
                Sign in to access your SEO dashboard
              </p>
            </GlassCardHeader>
            <form onSubmit={handleSubmit}>
              <GlassCardContent className="space-y-4">
                {infoMessage && (
                  <Alert style={{ borderColor: `${colors.semantic.success}30`, background: `${colors.semantic.success}10` }}>
                    <CheckCircle className="h-4 w-4" style={{ color: colors.semantic.success }} />
                    <AlertDescription style={{ color: colors.semantic.success }}>
                      {infoMessage}
                    </AlertDescription>
                  </Alert>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {error}
                      {showResendLink && (
                        <>
                          {" "}
                          <a href={`/resend-verification?email=${encodeURIComponent(email)}`} className="underline hover:opacity-80">
                            Resend verification email
                          </a>
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" style={{ color: colors.text.secondary }}>Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" style={{ color: colors.text.secondary }}>Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    data-testid="input-password"
                  />
                </div>
              </GlassCardContent>

              <div className="flex flex-col space-y-4 p-6 pt-0">
                <Button
                  type="submit"
                  className="w-full rounded-xl"
                  disabled={loading}
                  data-testid="button-login"
                  style={gradients.brandText}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign in
                    </>
                  )}
                </Button>

                <div className="space-y-2 text-center">
                  <p className="text-sm" style={{ color: colors.text.muted }}>
                    Need an account?{" "}
                    <a href="/signup" className="font-medium hover:underline" style={{ color: colors.brand.purple }}>
                      Create one
                    </a>
                  </p>
                  <p className="text-sm" style={{ color: colors.text.muted }}>
                    <a href="/forgot-password" className="hover:underline" style={{ color: colors.text.muted }}>
                      Forgot your password?
                    </a>
                  </p>
                </div>
              </div>
            </form>
          </GlassCard>
        </div>
      </div>
    </MarketingLayout>
  );
}
