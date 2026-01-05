import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { buildRoute, ROUTES } from "@shared/routes";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const scanId = params.get("scanId");

  const signupMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; scanId?: string }) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Signup failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Account created successfully!");
      if (scanId) {
        navigate(buildRoute.report(scanId));
      } else {
        navigate(ROUTES.HOME);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    signupMutation.mutate({ email, password, scanId: scanId || undefined });
  };

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create Your Free Account</CardTitle>
              <CardDescription>
                {scanId 
                  ? "Unlock your full SEO report and start deploying fixes"
                  : "Get started with automated SEO"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-signup-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="input-signup-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12" 
                  disabled={signupMutation.isPending}
                  data-testid="button-signup-submit"
                >
                  {signupMutation.isPending ? "Creating account..." : (
                    <>
                      Create Free Account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-semantic-success" />
                  <span>Free forever for basic features</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-semantic-success" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-semantic-success" />
                  <span>Cancel anytime</span>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <a href={ROUTES.HOME} className="text-primary hover:underline">
                  Log in
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MarketingLayout>
  );
}
