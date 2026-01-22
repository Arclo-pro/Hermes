import { useParams, useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, Loader2, AlertTriangle, 
  CheckCircle2, AlertCircle, XCircle,
  FileText, Layout, Gauge, Search
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ROUTES } from "@shared/routes";

interface ScanStatus {
  scanId: string;
  status: "queued" | "running" | "preview_ready" | "completed" | "failed";
  progress?: number;
  message?: string;
}

interface TechnicalSignal {
  label: string;
  status: "ok" | "attention" | "critical";
  detail?: string;
}

interface ScanPreviewData {
  targetUrl: string;
  siteName?: string;
  domain?: string;
  generatedAt?: string;
  technical?: {
    pagesCrawled: number;
    indexable: number;
    blocked: number;
    missingTitles: number;
    duplicateTitles: number;
    missingH1s: number;
    errorPages: number;
  };
  content?: {
    thinPages: number;
    unclearTopicPages: number;
  };
  performance?: {
    score: number | null;
    status: "ok" | "attention" | "critical";
  };
  scoreSummary?: {
    overall: number;
    technical: number;
    content: number;
    performance: number;
  };
  totalFindings?: number;
}

function getStatusIcon(status: "ok" | "attention" | "critical") {
  switch (status) {
    case "ok":
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case "attention":
      return <AlertCircle className="w-5 h-5 text-amber-500" />;
    case "critical":
      return <XCircle className="w-5 h-5 text-red-500" />;
  }
}

function getStatusLabel(status: "ok" | "attention" | "critical") {
  switch (status) {
    case "ok":
      return { text: "Looks OK", className: "bg-emerald-100 text-emerald-700" };
    case "attention":
      return { text: "Needs Attention", className: "bg-amber-100 text-amber-700" };
    case "critical":
      return { text: "Critical", className: "bg-red-100 text-red-700" };
  }
}

function getTechnicalSignals(technical?: ScanPreviewData["technical"]): TechnicalSignal[] {
  if (!technical) {
    return [
      { label: "Pages Crawled", status: "attention", detail: "Scan pending" },
      { label: "Indexable Pages", status: "attention", detail: "Scan pending" },
      { label: "Title Tags", status: "attention", detail: "Scan pending" },
      { label: "H1 Headings", status: "attention", detail: "Scan pending" },
      { label: "Error Pages", status: "attention", detail: "Scan pending" },
    ];
  }

  const signals: TechnicalSignal[] = [];
  
  signals.push({
    label: "Pages Crawled",
    status: technical.pagesCrawled > 0 ? "ok" : "attention",
    detail: `${technical.pagesCrawled} pages analyzed`
  });

  const blockedRatio = technical.blocked / Math.max(technical.pagesCrawled, 1);
  signals.push({
    label: "Indexable Pages",
    status: blockedRatio > 0.3 ? "critical" : blockedRatio > 0.1 ? "attention" : "ok",
    detail: `${technical.indexable} indexable, ${technical.blocked} blocked`
  });

  const titleIssues = technical.missingTitles + technical.duplicateTitles;
  signals.push({
    label: "Title Tags",
    status: titleIssues > 5 ? "critical" : titleIssues > 0 ? "attention" : "ok",
    detail: titleIssues > 0 ? `${technical.missingTitles} missing, ${technical.duplicateTitles} duplicates` : "All pages have unique titles"
  });

  signals.push({
    label: "H1 Headings",
    status: technical.missingH1s > 5 ? "critical" : technical.missingH1s > 0 ? "attention" : "ok",
    detail: technical.missingH1s > 0 ? `${technical.missingH1s} pages missing H1` : "All pages have H1 headings"
  });

  signals.push({
    label: "Error Pages",
    status: technical.errorPages > 3 ? "critical" : technical.errorPages > 0 ? "attention" : "ok",
    detail: technical.errorPages > 0 ? `${technical.errorPages} error pages found` : "No error pages detected"
  });

  return signals;
}

function getContentSignals(content?: ScanPreviewData["content"]): TechnicalSignal[] {
  if (!content) {
    return [
      { label: "Thin Content", status: "attention", detail: "Scan pending" },
      { label: "Topic Clarity", status: "attention", detail: "Scan pending" },
    ];
  }

  return [
    {
      label: "Thin Content",
      status: content.thinPages > 5 ? "critical" : content.thinPages > 0 ? "attention" : "ok",
      detail: content.thinPages > 0 ? `${content.thinPages} pages below word threshold` : "All pages have sufficient content"
    },
    {
      label: "Topic Clarity",
      status: content.unclearTopicPages > 3 ? "critical" : content.unclearTopicPages > 0 ? "attention" : "ok",
      detail: content.unclearTopicPages > 0 ? `${content.unclearTopicPages} pages lack clear topic` : "All pages have clear topics"
    }
  ];
}

function formatDate(isoString?: string): string {
  if (!isoString) return new Date().toLocaleString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  return new Date(isoString).toLocaleString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
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

  const previewQuery = useQuery<ScanPreviewData>({
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

  const handleFullScanClick = () => {
    navigate(`${ROUTES.SIGNUP}?scanId=${scanId}`);
  };

  if (!previewQuery.data && isReady) {
    return (
      <MarketingLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      </MarketingLayout>
    );
  }

  const preview = previewQuery.data;
  const technicalSignals = getTechnicalSignals(preview?.technical);
  const contentSignals = getContentSignals(preview?.content);
  const performanceStatus = preview?.performance?.status || "attention";

  return (
    <MarketingLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="max-w-3xl mx-auto">
            
            {/* Scanning State */}
            {isScanning && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/10">
                  <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                    Analyzing Your Site
                  </h1>
                  <p className="text-xl text-slate-600">
                    {statusQuery.data?.message || "Checking structure, content, and performance..."}
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
                <Button variant="primaryGradient" onClick={() => navigate(ROUTES.LANDING)} size="lg" data-testid="button-retry">
                  Try Again
                </Button>
              </div>
            )}

            {/* ===== PREVIEW SCAN READY - Per Spec ===== */}
            {isReady && preview && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
                
                {/* Report Header */}
                <div className="border-b border-slate-200 p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                        A
                      </div>
                      <span className="text-xl font-semibold text-slate-900">arclo</span>
                    </div>
                    <Badge className="bg-violet-100 text-violet-700 border-0 px-3 py-1">
                      Preview Scan
                    </Badge>
                  </div>
                  
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2" data-testid="text-title">
                    Site Health Preview
                  </h1>
                  <p className="text-sm text-slate-500">
                    {preview.domain || preview.targetUrl} · {formatDate(preview.generatedAt)}
                  </p>
                </div>

                {/* Technical Signals Section */}
                <div className="border-b border-slate-200 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Technical Signals</h2>
                      <p className="text-sm text-slate-500">Structural SEO health indicators</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3" data-testid="section-technical">
                    {technicalSignals.map((signal, idx) => {
                      const statusLabel = getStatusLabel(signal.status);
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
                          data-testid={`signal-technical-${idx}`}
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(signal.status)}
                            <div>
                              <span className="font-medium text-slate-800">{signal.label}</span>
                              {signal.detail && (
                                <p className="text-sm text-slate-500">{signal.detail}</p>
                              )}
                            </div>
                          </div>
                          <Badge className={`${statusLabel.className} border-0`} data-testid={`status-technical-${idx}`}>
                            {statusLabel.text}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Content Structure Section */}
                <div className="border-b border-slate-200 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Layout className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Content Structure</h2>
                      <p className="text-sm text-slate-500">Page quality and topic clarity</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3" data-testid="section-content">
                    {contentSignals.map((signal, idx) => {
                      const statusLabel = getStatusLabel(signal.status);
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
                          data-testid={`signal-content-${idx}`}
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(signal.status)}
                            <div>
                              <span className="font-medium text-slate-800">{signal.label}</span>
                              {signal.detail && (
                                <p className="text-sm text-slate-500">{signal.detail}</p>
                              )}
                            </div>
                          </div>
                          <Badge className={`${statusLabel.className} border-0`} data-testid={`status-content-${idx}`}>
                            {statusLabel.text}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Performance Section */}
                <div className="border-b border-slate-200 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Gauge className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Performance</h2>
                      <p className="text-sm text-slate-500">Page speed and loading metrics</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3" data-testid="section-performance">
                    {(() => {
                      const statusLabel = getStatusLabel(performanceStatus);
                      return (
                        <div 
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
                          data-testid="signal-performance"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(performanceStatus)}
                            <div>
                              <span className="font-medium text-slate-800">PageSpeed Insights</span>
                              <p className="text-sm text-slate-500">
                                {performanceStatus === "ok" ? "Fast loading times" : 
                                 performanceStatus === "attention" ? "Some optimization needed" :
                                 "Performance issues detected"}
                              </p>
                            </div>
                          </div>
                          <Badge className={`${statusLabel.className} border-0`} data-testid="status-performance">
                            {statusLabel.text}
                          </Badge>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* What's Next - Gated Content Teaser */}
                <div className="border-b border-slate-200 p-6 md:p-8 bg-slate-50/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Search className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Full Scan Unlocks</h2>
                      <p className="text-sm text-slate-500">Available when you create an account</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 opacity-60">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-400 text-sm">🔒</span>
                      </div>
                      <span className="text-slate-500">Competitor Discovery</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 opacity-60">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-400 text-sm">🔒</span>
                      </div>
                      <span className="text-slate-500">Keyword Opportunities</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 opacity-60">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-400 text-sm">🔒</span>
                      </div>
                      <span className="text-slate-500">Ranking Positions</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 opacity-60">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-400 text-sm">🔒</span>
                      </div>
                      <span className="text-slate-500">Content Gap Analysis</span>
                    </div>
                  </div>
                </div>

                {/* CTA Section */}
                <div className="p-6 md:p-8 bg-gradient-to-r from-violet-50 to-pink-50">
                  <div className="text-center space-y-4">
                    <p className="text-sm text-slate-600 max-w-md mx-auto">
                      Create a free account to unlock real search data, keyword rankings, and prioritized recommendations.
                    </p>
                    <Button 
                      variant="primaryGradient"
                      size="lg" 
                      className="h-12 px-8"
                      onClick={handleFullScanClick}
                      data-testid="button-full-scan"
                    >
                      See competitors, keywords, and what to fix first → Run Full Scan
                    </Button>
                    <p className="text-xs text-slate-400">
                      Free account required · No credit card needed
                    </p>
                  </div>
                </div>

              </div>
            )}
            
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
