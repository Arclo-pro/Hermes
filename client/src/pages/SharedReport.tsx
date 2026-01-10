import { useState } from "react";
import { useParams, Link } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Eye,
  ExternalLink,
  Search,
  ArrowRight
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ROUTES } from "@shared/routes";
import { format } from "date-fns";

interface Finding {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  impact: string;
  effort: string;
  summary: string;
}

interface ShareData {
  title: string;
  targetUrl: string;
  scoreSummary: {
    overall: number;
    technical: number;
    content: number;
    performance: number;
  };
  findings: Finding[];
  totalFindings: number;
  createdAt: string;
  viewCount: number;
}

interface ShareError {
  error: string;
  requiresPassword?: boolean;
  expired?: boolean;
  revoked?: boolean;
}

const getHealthStatus = (score: number) => {
  if (score >= 80) return { label: "Healthy", color: "text-green-600", bg: "bg-green-100", icon: CheckCircle };
  if (score >= 60) return { label: "Needs Attention", color: "text-amber-600", bg: "bg-amber-100", icon: AlertCircle };
  return { label: "High Risk", color: "text-red-600", bg: "bg-red-100", icon: AlertTriangle };
};

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case "high":
      return { border: "border-red-200", bg: "bg-red-50", badge: "bg-red-100 text-red-700" };
    case "medium":
      return { border: "border-amber-200", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-700" };
    default:
      return { border: "border-blue-200", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700" };
  }
};

export default function SharedReport() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [password, setPassword] = useState("");
  const [enteredPassword, setEnteredPassword] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const shareQuery = useQuery<ShareData, ShareError>({
    queryKey: ["shared-report", token, enteredPassword],
    queryFn: async () => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (enteredPassword) {
        headers["X-Share-Password"] = enteredPassword;
      }
      const res = await fetch(`/api/share/${token}`, { headers });
      if (!res.ok) {
        const errorData = await res.json();
        throw errorData;
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: async (pwd: string) => {
      const res = await fetch(`/api/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Invalid password");
      }
      return res.json();
    },
    onSuccess: () => {
      setPasswordError(null);
      setEnteredPassword(password);
    },
    onError: (error: Error) => {
      setPasswordError(error.message);
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      verifyPasswordMutation.mutate(password);
    }
  };

  const isLoading = shareQuery.isLoading;
  const error = shareQuery.error as ShareError | undefined;
  const requiresPassword = error?.requiresPassword;
  const isExpiredOrRevoked = error?.expired || error?.revoked;
  const data = shareQuery.data;

  const healthStatus = data ? getHealthStatus(data.scoreSummary.overall) : null;
  const StatusIcon = healthStatus?.icon || AlertCircle;

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          {isLoading && (
            <div className="text-center space-y-8" data-testid="loading-state">
              <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                  Loading Report
                </h1>
                <p className="text-xl text-slate-600">
                  Fetching shared analysis...
                </p>
              </div>
            </div>
          )}

          {requiresPassword && !enteredPassword && (
            <div className="text-center space-y-8" data-testid="password-prompt">
              <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center mx-auto">
                <Lock className="w-10 h-10 text-violet-600" />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                  Password Protected
                </h1>
                <p className="text-xl text-slate-600">
                  This report requires a password to view
                </p>
              </div>
              <form onSubmit={handlePasswordSubmit} className="max-w-sm mx-auto space-y-4">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-center"
                  data-testid="input-password"
                />
                {passwordError && (
                  <p className="text-sm text-red-600" data-testid="text-password-error">{passwordError}</p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!password.trim() || verifyPasswordMutation.isPending}
                  data-testid="button-submit-password"
                >
                  {verifyPasswordMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  View Report
                </Button>
              </form>
            </div>
          )}

          {isExpiredOrRevoked && (
            <div className="text-center space-y-8" data-testid="expired-state">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-slate-400" />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                  {error?.expired ? "Link Expired" : "Link No Longer Available"}
                </h1>
                <p className="text-xl text-slate-600">
                  {error?.expired 
                    ? "This shared report link has expired and is no longer accessible."
                    : "This shared report has been revoked by the owner."}
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-slate-600">
                  Want to analyze your own website?
                </p>
                <Link href={ROUTES.SCAN}>
                  <Button 
                    size="lg" 
                    className="gap-2 text-white font-medium"
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)"
                    }}
                    data-testid="button-analyze-own"
                  >
                    <Search className="h-4 w-4" />
                    Run Free Analysis
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {error && !requiresPassword && !isExpiredOrRevoked && (
            <div className="text-center space-y-8" data-testid="error-state">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                  Report Not Found
                </h1>
                <p className="text-xl text-slate-600">
                  {error.error || "We couldn't find this report. It may have been removed or the link is incorrect."}
                </p>
              </div>
              <Link href={ROUTES.SCAN}>
                <Button size="lg" data-testid="button-try-again">
                  Analyze Your Website
                </Button>
              </Link>
            </div>
          )}

          {data && (
            <div className="space-y-12" data-testid="report-content">
              <div className="text-center space-y-6">
                <div className={`w-20 h-20 rounded-full ${healthStatus?.bg} flex items-center justify-center mx-auto`}>
                  <StatusIcon className={`w-10 h-10 ${healthStatus?.color}`} />
                </div>
                
                <div className="space-y-3">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${healthStatus?.bg} ${healthStatus?.color}`}>
                    <span className="w-2 h-2 rounded-full bg-current" />
                    {healthStatus?.label}
                  </div>
                  
                  {data.title && (
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900" data-testid="text-report-title">
                      {data.title}
                    </h1>
                  )}
                  
                  <div className="flex items-center justify-center gap-2 text-slate-600">
                    <ExternalLink className="w-4 h-4" />
                    <a 
                      href={data.targetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-violet-600 hover:underline"
                      data-testid="link-target-url"
                    >
                      {data.targetUrl}
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span data-testid="text-created-date">
                      {format(new Date(data.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span data-testid="text-view-count">
                      {data.viewCount} {data.viewCount === 1 ? "view" : "views"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ScoreCard label="Overall" score={data.scoreSummary.overall} />
                <ScoreCard label="Technical" score={data.scoreSummary.technical} />
                <ScoreCard label="Content" score={data.scoreSummary.content} />
                <ScoreCard label="Performance" score={data.scoreSummary.performance} />
              </div>

              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-900">
                  Issues Found ({data.totalFindings})
                </h2>
                
                <div className="space-y-4">
                  {data.findings.map((finding) => {
                    const styles = getSeverityStyles(finding.severity);
                    return (
                      <div 
                        key={finding.id} 
                        className={`p-6 rounded-xl border-2 ${styles.border} ${styles.bg}`}
                        data-testid={`finding-${finding.id}`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h3 className="font-semibold text-slate-900">{finding.title}</h3>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles.badge}`}>
                            {finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm mb-4">{finding.summary}</p>
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span>Impact: <strong className="text-slate-700">{finding.impact}</strong></span>
                          <span>Effort: <strong className="text-slate-700">{finding.effort}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  Want to analyze your own website?
                </h2>
                <p className="text-slate-600 max-w-md mx-auto">
                  Get a comprehensive SEO analysis with actionable recommendations to improve your search rankings.
                </p>
                <Link href={ROUTES.SCAN}>
                  <Button 
                    size="lg" 
                    className="gap-2 text-white font-medium mt-4"
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)"
                    }}
                    data-testid="button-cta-analyze"
                  >
                    <Search className="h-4 w-4" />
                    Run Free Analysis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </MarketingLayout>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-600";
    if (s >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getProgressColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm" data-testid={`score-${label.toLowerCase()}`}>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</p>
      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getProgressColor(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
