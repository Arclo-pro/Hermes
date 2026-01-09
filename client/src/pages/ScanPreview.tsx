import { useParams, useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Loader2, AlertTriangle, Zap, AlertCircle, CheckCircle, TrendingDown, Eye, MousePointerClick, Sparkles, Shield, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ROUTES } from "@shared/routes";

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

const getHealthStatus = (score: number) => {
  if (score >= 80) return { label: "Healthy", color: "text-green-600", bg: "bg-green-100", icon: CheckCircle };
  if (score >= 60) return { label: "Needs Attention", color: "text-amber-600", bg: "bg-amber-100", icon: AlertCircle };
  return { label: "High Risk", color: "text-red-600", bg: "bg-red-100", icon: AlertTriangle };
};

const getImpactContext = (title: string, severity: string) => {
  const contexts: Record<string, string> = {
    "Missing Meta Descriptions": "Pages without meta descriptions typically get 15–30% fewer clicks than optimized pages, even when ranking well.",
    "Slow Page Speed": "Every second of load delay can reduce conversions by 7% and significantly hurt mobile rankings.",
    "Missing H1 Tags": "Pages without clear H1 tags confuse search engines about your content's main topic, reducing ranking potential.",
    "Broken Links": "Broken links waste crawl budget and create poor user experiences that increase bounce rates.",
    "Missing Alt Text": "Images without alt text miss accessibility requirements and lose valuable image search traffic.",
    "Thin Content": "Pages with insufficient content struggle to rank and may be flagged as low-quality by Google.",
    "Duplicate Content": "Duplicate content splits ranking signals and can cause search engines to choose the wrong page to show.",
    "Mobile Issues": "Over 60% of searches happen on mobile. Poor mobile experience directly hurts rankings and conversions.",
  };
  
  for (const [key, context] of Object.entries(contexts)) {
    if (title.toLowerCase().includes(key.toLowerCase().split(" ")[0])) {
      return context;
    }
  }
  
  if (severity === "high") {
    return "This issue directly impacts your visibility in search results and likely costs you traffic every day.";
  }
  return "Fixing this will improve your site's overall SEO health and user experience.";
};

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

  const healthStatus = previewQuery.data ? getHealthStatus(previewQuery.data.scoreSummary.overall) : null;
  const StatusIcon = healthStatus?.icon || AlertCircle;

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          {/* Scanning State */}
          {isScanning && (
            <div className="text-center space-y-8">
              <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                  Analyzing Your Site
                </h1>
                <p className="text-xl text-slate-600">
                  {statusQuery.data?.message || "Checking SEO, performance, and content..."}
                </p>
              </div>
              <div className="max-w-md mx-auto">
                <Progress value={statusQuery.data?.progress || 30} className="h-2" />
                <p className="text-sm text-slate-500 mt-2">
                  {statusQuery.data?.progress || 30}% complete
                </p>
              </div>
            </div>
          )}

          {/* Failed State */}
          {isFailed && (
            <div className="text-center space-y-8">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                  Scan Failed
                </h1>
                <p className="text-xl text-slate-600">
                  {statusQuery.data?.message || "We couldn't complete the scan. Please try again."}
                </p>
              </div>
              <Button onClick={() => navigate(ROUTES.LANDING)} size="lg">
                Try Again
              </Button>
            </div>
          )}

          {/* Diagnosis Ready State */}
          {isReady && previewQuery.data && (
            <div className="space-y-12">
              
              {/* SECTION 1: Executive Diagnosis */}
              <div className="text-center space-y-6">
                <div className={`w-20 h-20 rounded-full ${healthStatus?.bg} flex items-center justify-center mx-auto`}>
                  <StatusIcon className={`w-10 h-10 ${healthStatus?.color}`} />
                </div>
                
                <div className="space-y-3">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${healthStatus?.bg} ${healthStatus?.color}`}>
                    <span className="w-2 h-2 rounded-full bg-current" />
                    {healthStatus?.label}
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                    Your website is losing traffic from preventable SEO issues
                  </h1>
                  
                  <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    We scanned <span className="font-medium text-slate-900">{previewQuery.data.targetUrl}</span> and found {previewQuery.data.totalFindings} issues that directly impact your rankings and click-through rates.
                  </p>
                </div>
              </div>

              {/* SECTION 2: Top Issues (Diagnosis Style) */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-900">
                  Priority Issues Found
                </h2>
                
                <div className="space-y-4">
                  {previewQuery.data.findings.slice(0, 3).map((finding) => (
                    <div 
                      key={finding.id} 
                      className={`p-6 rounded-xl border-2 ${
                        finding.severity === "high" 
                          ? "bg-red-50 border-red-200" 
                          : finding.severity === "medium"
                            ? "bg-amber-50 border-amber-200"
                            : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          finding.severity === "high" 
                            ? "bg-red-100" 
                            : finding.severity === "medium"
                              ? "bg-amber-100"
                              : "bg-slate-100"
                        }`}>
                          <Zap className={`w-5 h-5 ${
                            finding.severity === "high" 
                              ? "text-red-600" 
                              : finding.severity === "medium"
                                ? "text-amber-600"
                                : "text-slate-600"
                          }`} />
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-semibold text-slate-900 text-lg">{finding.title}</span>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              finding.severity === "high" 
                                ? "bg-red-100 text-red-700" 
                                : finding.severity === "medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-700"
                            }`}>
                              {finding.impact} Impact
                            </span>
                          </div>
                          
                          <p className="text-slate-700">{finding.summary}</p>
                          
                          <div className="pt-2 border-t border-slate-200/50">
                            <p className="text-sm text-slate-600 italic">
                              <span className="font-medium text-slate-700">Why this matters:</span> {getImpactContext(finding.title, finding.severity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {previewQuery.data.totalFindings > 3 && (
                  <p className="text-center text-slate-600">
                    + {previewQuery.data.totalFindings - 3} more issues identified
                  </p>
                )}
              </div>

              {/* SECTION 3: What This Is Costing You */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
                <h2 className="text-xl font-semibold mb-6">
                  What this likely means for your business
                </h2>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Eye className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Lower Visibility</p>
                      <p className="text-sm text-slate-300">Missing out on high-intent searches</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <MousePointerClick className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Fewer Clicks</p>
                      <p className="text-sm text-slate-300">Lost traffic from existing rankings</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Missed Leads</p>
                      <p className="text-sm text-slate-300">Users bouncing before converting</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: What Arclo Would Do (Prescription) */}
              <div className="bg-white border-2 border-violet-200 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    What Arclo would fix automatically
                  </h2>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">Generate & Deploy Fixes</p>
                      <p className="text-sm text-slate-600">Optimized meta descriptions, titles, and tags</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">Safe Performance Fixes</p>
                      <p className="text-sm text-slate-600">Identify and fix slow pages without breaking things</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <BarChart3 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">Weekly Monitoring</p>
                      <p className="text-sm text-slate-600">Re-scan and track improvements over time</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Primary CTA */}
              <div className="text-center space-y-4 pt-4">
                <Button 
                  size="lg" 
                  className="h-16 px-12 text-lg bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 shadow-lg shadow-violet-500/25"
                  onClick={() => navigate(`${ROUTES.SIGNUP}?scanId=${scanId}`)}
                  data-testid="button-unlock-report"
                >
                  Fix These Issues Automatically
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-sm text-slate-500">
                  Free account · No credit card · Takes ~2 minutes
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MarketingLayout>
  );
}
