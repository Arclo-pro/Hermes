import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, CheckCircle2, Loader2, AlertTriangle, Zap, Lock, Search, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ROUTES, buildRoute } from "@shared/routes";

interface Finding {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  impact: string;
  effort: string;
  summary: string;
}

interface ScanStatus {
  scanId: string;
  status: "queued" | "running" | "preview_ready" | "completed" | "failed";
  progress?: number;
  message?: string;
}

interface ScanPreview {
  findings: Finding[];
  scoreSummary: {
    overall: number;
    technical: number;
    content: number;
    performance: number;
  };
  totalFindings: number;
  targetUrl: string;
}

export default function ScanPreview() {
  const params = useParams<{ scanId: string }>();
  const scanId = params.scanId;
  const [, navigate] = useLocation();

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

  const previewQuery = useQuery<ScanPreview>({
    queryKey: ["scan-preview", scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/${scanId}/preview`);
      if (!res.ok) throw new Error("Failed to fetch preview");
      return res.json();
    },
    enabled: statusQuery.data?.status === "preview_ready" || statusQuery.data?.status === "completed",
  });

  const isScanning = statusQuery.data?.status === "queued" || statusQuery.data?.status === "running";
  const isReady = statusQuery.data?.status === "preview_ready" || statusQuery.data?.status === "completed";
  const isFailed = statusQuery.data?.status === "failed";

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "high":
        return {
          bg: "bg-semantic-danger-soft/30",
          border: "border-semantic-danger/20",
          iconBg: "bg-semantic-danger/20",
          iconColor: "text-semantic-danger",
          badge: "bg-semantic-danger/20 text-semantic-danger",
        };
      case "medium":
        return {
          bg: "bg-semantic-warning-soft/30",
          border: "border-semantic-warning/20",
          iconBg: "bg-semantic-warning/20",
          iconColor: "text-semantic-warning",
          badge: "bg-semantic-warning/20 text-semantic-warning",
        };
      default:
        return {
          bg: "bg-muted/50",
          border: "border-border",
          iconBg: "bg-muted",
          iconColor: "text-muted-foreground",
          badge: "bg-muted text-muted-foreground",
        };
    }
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case "high": return Zap;
      case "medium": return Wrench;
      default: return Search;
    }
  };

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Scanning State */}
          {isScanning && (
            <div className="text-center space-y-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  Analyzing Your Site
                </h1>
                <p className="text-xl text-muted-foreground">
                  {statusQuery.data?.message || "Checking SEO, performance, and content..."}
                </p>
              </div>
              <div className="max-w-md mx-auto">
                <Progress value={statusQuery.data?.progress || 30} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  {statusQuery.data?.progress || 30}% complete
                </p>
              </div>
            </div>
          )}

          {/* Failed State */}
          {isFailed && (
            <div className="text-center space-y-8">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  Scan Failed
                </h1>
                <p className="text-xl text-muted-foreground">
                  {statusQuery.data?.message || "We couldn't complete the scan. Please try again."}
                </p>
              </div>
              <Button onClick={() => navigate(ROUTES.LANDING)} size="lg">
                Try Again
              </Button>
            </div>
          )}

          {/* Preview Ready State */}
          {isReady && previewQuery.data && (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-semantic-success/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-semantic-success" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  Scan Complete
                </h1>
                <p className="text-lg text-muted-foreground">
                  We found {previewQuery.data.totalFindings} issues on <span className="font-medium text-foreground">{previewQuery.data.targetUrl}</span>
                </p>
              </div>

              {/* Score Summary */}
              <Card className="bg-card border-border">
                <div className="bg-muted/50 px-6 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">SEO Health Score</h2>
                    <span className="text-2xl font-bold text-foreground">{previewQuery.data.scoreSummary.overall}/100</span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-foreground">{previewQuery.data.scoreSummary.technical}</p>
                      <p className="text-sm text-muted-foreground">Technical</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{previewQuery.data.scoreSummary.content}</p>
                      <p className="text-sm text-muted-foreground">Content</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{previewQuery.data.scoreSummary.performance}</p>
                      <p className="text-sm text-muted-foreground">Performance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview Findings */}
              <Card className="bg-card border-border">
                <div className="bg-muted/50 px-6 py-4 border-b border-border">
                  <h2 className="font-semibold text-foreground">Top Issues Found</h2>
                </div>
                <CardContent className="p-6 space-y-4">
                  {previewQuery.data.findings.map((finding) => {
                    const styles = getSeverityStyles(finding.severity);
                    const Icon = getIcon(finding.severity);
                    return (
                      <div 
                        key={finding.id} 
                        className={`flex items-start gap-4 p-4 rounded-lg border ${styles.bg} ${styles.border}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${styles.iconBg}`}>
                          <Icon className={`w-5 h-5 ${styles.iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">{finding.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${styles.badge}`}>
                              {finding.impact} Impact
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{finding.summary}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Locked Section */}
                  <div className="relative mt-6">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-10 flex items-end justify-center pb-8">
                      <div className="text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                          <Lock className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">+ {previewQuery.data.totalFindings - previewQuery.data.findings.length} more findings</p>
                          <p className="text-sm text-muted-foreground">Create a free account to see all issues</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 opacity-30 blur-sm">
                      <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50 border-border">
                        <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-full" />
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50 border-border">
                        <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-2/3" />
                          <div className="h-3 bg-muted rounded w-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              <div className="text-center space-y-4">
                <Button 
                  size="lg" 
                  className="h-14 px-10 text-lg"
                  onClick={() => navigate(`${ROUTES.SIGNUP}?scanId=${scanId}`)}
                  data-testid="button-unlock-report"
                >
                  Create Free Account to See Full Report
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-sm text-muted-foreground">
                  Free forever. No credit card required.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MarketingLayout>
  );
}
