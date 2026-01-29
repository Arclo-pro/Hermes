import { useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ROUTES, buildRoute } from "@shared/routes";

interface ScanStatus {
  scanId: string;
  status: "queued" | "running" | "preview_ready" | "completed" | "failed";
  progress?: number;
  message?: string;
}

const STAGE_MESSAGES = [
  "Crawling your site structure...",
  "Checking page speed and Core Web Vitals...",
  "Analyzing keyword rankings...",
  "Scanning competitor landscape...",
  "Evaluating backlink profile...",
  "Compiling your results...",
];

export default function ScanPreview() {
  const params = useParams<{ scanId: string }>();
  const scanId = params.scanId;
  const [, navigate] = useLocation();
  const reportTriggered = useRef(false);

  const statusQuery = useQuery<ScanStatus>({
    queryKey: ["scan-status", scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/${scanId}/status`);
      if (!res.ok) throw new Error("Failed to fetch scan status");
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "queued" || data.status === "running") return 2000;
      return false;
    },
    enabled: !!scanId,
  });

  const isScanning =
    statusQuery.data?.status === "queued" ||
    statusQuery.data?.status === "running";
  const isReady =
    statusQuery.data?.status === "preview_ready" ||
    statusQuery.data?.status === "completed";
  const isFailed = statusQuery.data?.status === "failed";

  // Auto-generate report and navigate to results when scan completes
  useEffect(() => {
    if (!isReady || reportTriggered.current) return;
    reportTriggered.current = true;

    (async () => {
      try {
        const res = await fetch("/api/report/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scanId }),
        });
        const data = await res.json();
        if (data.ok && data.reportId) {
          navigate(buildRoute.freeReport(data.reportId));
        } else {
          // Allow retry on failure
          reportTriggered.current = false;
        }
      } catch {
        reportTriggered.current = false;
      }
    })();
  }, [isReady, scanId, navigate]);

  // Rotate through stage messages while scanning
  const progress = statusQuery.data?.progress || 30;
  const stageIndex = Math.min(
    Math.floor((progress / 100) * STAGE_MESSAGES.length),
    STAGE_MESSAGES.length - 1,
  );

  return (
    <MarketingLayout>
      <div className="min-h-screen bg-gradient-to-b from-muted via-background to-muted/50">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="max-w-3xl mx-auto">

            {/* Scanning / Generating State */}
            {(isScanning || isReady) && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-soft to-purple-soft flex items-center justify-center mx-auto shadow-lg shadow-purple-glow">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    {isReady ? "Generating Your Report" : "Analyzing Your Site"}
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    {isReady
                      ? "Preparing your SEO analysis..."
                      : statusQuery.data?.message || STAGE_MESSAGES[stageIndex]}
                  </p>
                </div>
                <div className="max-w-md mx-auto">
                  <Progress value={isReady ? 95 : progress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {isReady ? 95 : progress}% complete
                  </p>
                </div>
              </div>
            )}

            {/* Failed State */}
            {isFailed && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-semantic-danger-soft flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-semantic-danger" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    Scan Failed
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    {statusQuery.data?.message ||
                      "We couldn't complete the scan. Please try again."}
                  </p>
                </div>
                <Button
                  variant="primaryGradient"
                  onClick={() => navigate(ROUTES.LANDING)}
                  size="lg"
                  data-testid="button-retry"
                >
                  Try Again
                </Button>
              </div>
            )}

          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
