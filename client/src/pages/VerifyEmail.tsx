import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import arcloLogo from "@assets/A_small_logo_1765393189114.png";

export default function VerifyEmail() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. Please request a new one.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed. Please try again.");
        }
      } catch (err) {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <Card className="bg-white border-[#E2E8F0] shadow-[0_8px_24px_rgba(15,23,42,0.06)] rounded-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={arcloLogo} alt="Arclo" className="h-16 w-auto" />
              </div>
              <CardTitle className="text-2xl text-[#0F172A]">
                {status === "loading" && "Verifying..."}
                {status === "success" && "Email Verified!"}
                {status === "error" && "Verification Failed"}
              </CardTitle>
              <CardDescription className="text-[#64748B]">
                {message}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {status === "error" && (
                <p className="text-[#64748B] text-sm">
                  Need a new verification link?{" "}
                  <a href="/resend-verification" className="text-[#22C55E] hover:text-[#16A34A] hover:underline font-medium">
                    Request one here
                  </a>
                </p>
              )}
            </CardContent>
            <CardFooter>
              {status !== "loading" && (
                <Button 
                  className="w-full"
                  onClick={() => navigate("/login")}
                  data-testid="button-go-to-login"
                >
                  {status === "success" ? "Sign In" : "Back to Sign In"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </MarketingLayout>
  );
}
