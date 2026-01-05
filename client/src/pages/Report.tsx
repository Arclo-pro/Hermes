import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Loader2, CheckCircle2, AlertTriangle, Info, ArrowRight, Rocket, Download, Shield, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MarketingLayout } from "@/components/layout/MarketingLayout";

interface Finding {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  impact: string;
  effort: string;
  summary: string;
  recommendation?: string;
  affectedPages?: number;
}

interface ScoreSummary {
  overall: number;
  technical: number;
  content: number;
  performance: number;
}

interface ReportData {
  findings: Finding[];
  scoreSummary: ScoreSummary;
  totalFindings: number;
  targetUrl: string;
  unlocked: boolean;
}

function ScoreRing({ score, label, size = "lg" }: { score: number; label: string; size?: "sm" | "lg" }) {
  const sizeClasses = size === "lg" ? "w-24 h-24" : "w-16 h-16";
  const textClasses = size === "lg" ? "text-2xl" : "text-lg";
  
  let color = "text-red-500";
  if (score >= 80) color = "text-green-500";
  else if (score >= 60) color = "text-yellow-500";
  else if (score >= 40) color = "text-orange-500";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizeClasses} relative flex items-center justify-center`}>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-700"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${(score / 100) * 251.2} 251.2`}
            className={color}
            strokeLinecap="round"
          />
        </svg>
        <span className={`${textClasses} font-bold ${color}`}>{score}</span>
      </div>
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: "high" | "medium" | "low" }) {
  if (severity === "high") return <AlertTriangle className="w-5 h-5 text-red-500" />;
  if (severity === "medium") return <Info className="w-5 h-5 text-yellow-500" />;
  return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
}

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const severityColors = {
    high: "border-red-500/30 bg-red-500/5",
    medium: "border-yellow-500/30 bg-yellow-500/5",
    low: "border-blue-500/30 bg-blue-500/5",
  };

  return (
    <Card className={`border ${severityColors[finding.severity]}`} data-testid={`finding-card-${index}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <SeverityIcon severity={finding.severity} />
          <div className="flex-1">
            <CardTitle className="text-lg">{finding.title}</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                Impact: {finding.impact}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Effort: {finding.effort}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400 text-sm">{finding.summary}</p>
        {finding.recommendation && (
          <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-300">
              <strong>Recommendation:</strong> {finding.recommendation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Report() {
  const { scanId } = useParams();
  const [, navigate] = useLocation();

  const { data: report, isLoading, error } = useQuery<ReportData>({
    queryKey: ["report", scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/${scanId}/report`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
    enabled: !!scanId,
  });

  if (!isLoading && report && !report.unlocked) {
    navigate(`/signup?scanId=${scanId}`, { replace: true });
    return null;
  }

  const deployMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/scan/${scanId}/deploy`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to deploy fixes");
      return res.json();
    },
    onSuccess: () => {
      navigate("/app");
    },
  });

  if (isLoading) {
    return (
      <MarketingLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
        </div>
      </MarketingLayout>
    );
  }

  if (error || !report) {
    return (
      <MarketingLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <h1 className="text-2xl font-bold">Report Not Found</h1>
          <p className="text-gray-400">This scan may have expired or doesn't exist.</p>
          <Button onClick={() => navigate("/")} data-testid="btn-back-home">
            Start New Scan
          </Button>
        </div>
      </MarketingLayout>
    );
  }

  const { findings, scoreSummary, targetUrl } = report;

  return (
    <MarketingLayout>
      <div className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-4">
              Full Report Unlocked
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="report-title">
              SEO Analysis Report
            </h1>
            <p className="text-gray-400 text-lg" data-testid="report-url">
              {targetUrl}
            </p>
          </div>

          <Card className="mb-8 bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-xl">Health Scores</CardTitle>
              <CardDescription>How your site performs across key SEO dimensions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap justify-center gap-8">
                <ScoreRing score={scoreSummary.overall} label="Overall" size="lg" />
                <ScoreRing score={scoreSummary.technical} label="Technical" size="sm" />
                <ScoreRing score={scoreSummary.content} label="Content" size="sm" />
                <ScoreRing score={scoreSummary.performance} label="Performance" size="sm" />
              </div>
            </CardContent>
          </Card>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Issues Found ({findings.length})</h2>
              <div className="flex gap-2">
                <Badge variant="outline" className="border-red-500/50 text-red-400">
                  {findings.filter(f => f.severity === "high").length} High
                </Badge>
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                  {findings.filter(f => f.severity === "medium").length} Medium
                </Badge>
                <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                  {findings.filter(f => f.severity === "low").length} Low
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              {findings.map((finding, index) => (
                <FindingCard key={finding.id} finding={finding} index={index} />
              ))}
            </div>
          </div>

          <Card className="bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 border-[#D4AF37]/30">
            <CardContent className="py-8">
              <div className="text-center">
                <Rocket className="w-12 h-12 mx-auto mb-4 text-[#D4AF37]" />
                <h3 className="text-2xl font-bold mb-2">Ready to Fix These Issues?</h3>
                <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                  Arclo can automatically prioritize and fix these issues for you. Deploy fixes to your site 
                  with one click and watch your SEO scores improve.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-[#D4AF37] hover:bg-[#B8972F] text-black font-semibold"
                    onClick={() => deployMutation.mutate()}
                    disabled={deployMutation.isPending}
                    data-testid="btn-deploy-fixes"
                  >
                    {deployMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Deploy Fixes Now
                      </>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/app")}
                    data-testid="btn-go-to-dashboard"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Card className="bg-gray-900/30 border-gray-800">
              <CardContent className="pt-6 text-center">
                <Shield className="w-8 h-8 mx-auto mb-3 text-[#D4AF37]" />
                <h4 className="font-semibold mb-1">Safe Deployment</h4>
                <p className="text-sm text-gray-400">All changes are reviewed and reversible</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/30 border-gray-800">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-[#D4AF37]" />
                <h4 className="font-semibold mb-1">Track Progress</h4>
                <p className="text-sm text-gray-400">Monitor improvements over time</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/30 border-gray-800">
              <CardContent className="pt-6 text-center">
                <Download className="w-8 h-8 mx-auto mb-3 text-[#D4AF37]" />
                <h4 className="font-semibold mb-1">Export Reports</h4>
                <p className="text-sm text-gray-400">Share with stakeholders</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
