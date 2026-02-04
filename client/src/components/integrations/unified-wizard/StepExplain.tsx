/**
 * Step 1: Explain - Shows benefits of connecting GA4 + GSC
 */
import {
  BarChart3,
  Search,
  TrendingUp,
  Target,
  Zap,
  FileSearch,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface StepExplainProps {
  isConnecting: boolean;
  error: string | null;
  onConnect: () => void;
  onRetry: () => void;
}

export function StepExplain({ isConnecting, error, onConnect, onRetry }: StepExplainProps) {
  // Connecting state
  if (isConnecting) {
    return (
      <div className="space-y-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Connecting to Google...</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            A Google sign-in window has opened. Complete the authorization there, then return here.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          Read-only access. No data modification.
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-semantic-danger/10 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7 text-semantic-danger" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Connection Failed</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{error}</p>
        </div>
        <Button variant="primary" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Try Again
        </Button>
      </div>
    );
  }

  // Default: explain + connect
  return (
    <div className="space-y-5">
      {/* Header with combined icons */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-[#7c3aed]" />
          </div>
          <span className="text-2xl text-muted-foreground">+</span>
          <div className="w-12 h-12 rounded-xl bg-[#ec4899]/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-[#ec4899]" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Connect Google Analytics & Search Console</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Link both services in one step to unlock complete visibility.
        </p>
      </div>

      {/* Benefits grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* GA4 benefits */}
        <Card className="bg-muted/30 border-border">
          <CardContent className="py-3 px-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-[#7c3aed]" />
              <span className="text-xs font-semibold text-foreground">Analytics</span>
            </div>
            <ul className="space-y-1.5">
              {[
                { icon: TrendingUp, text: "Traffic trends" },
                { icon: Target, text: "Top pages" },
                { icon: Zap, text: "Conversions" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="w-3 h-3 text-[#7c3aed] shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* GSC benefits */}
        <Card className="bg-muted/30 border-border">
          <CardContent className="py-3 px-3">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-[#ec4899]" />
              <span className="text-xs font-semibold text-foreground">Search Console</span>
            </div>
            <ul className="space-y-1.5">
              {[
                { icon: FileSearch, text: "Search queries" },
                { icon: TrendingUp, text: "Impressions" },
                { icon: Target, text: "Crawl status" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="w-3 h-3 text-[#ec4899] shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Security note */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5" />
        Read-only access. We never modify your data.
      </div>

      {/* Connect button */}
      <Button variant="primary" fullWidth onClick={onConnect}>
        Continue with Google
        <ArrowRight className="w-4 h-4 ml-1.5" />
      </Button>
    </div>
  );
}
