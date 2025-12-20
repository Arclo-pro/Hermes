import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, TrendingDown, Calendar, Clock, Globe, Activity, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
}

interface Drop {
  date: string;
  source: string;
  metric: string;
  dropPercent: string;
  value: number;
  avg7d: number;
  zScore: number;
}

interface RootCause {
  title: string;
  confidence: 'high' | 'medium' | 'low';
  description?: string;
}

function parseReport(markdown: string) {
  const healthChecks: HealthCheck[] = [];
  const drops: Drop[] = [];
  const rootCauses: RootCause[] = [];
  let period = '';
  let domain = '';
  let totalDrops = 0;

  const lines = markdown.split('\n');
  let inHealthTable = false;
  let inDropsTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('**Period:**')) {
      period = line.replace('**Period:**', '').trim();
    }
    if (line.startsWith('**Domain:**')) {
      domain = line.replace('**Domain:**', '').trim();
    }

    if (line.includes('| Check | Status |')) {
      inHealthTable = true;
      continue;
    }
    if (inHealthTable && line.startsWith('|') && !line.includes('---')) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2 && parts[0] !== 'Check') {
        const name = parts[0];
        const statusText = parts[1];
        let status: 'healthy' | 'warning' | 'error' = 'healthy';
        if (statusText.includes('✅') || statusText.toLowerCase().includes('healthy') || statusText.toLowerCase().includes('none')) {
          status = 'healthy';
        } else if (statusText.includes('⚠') || statusText.toLowerCase().includes('warning')) {
          status = 'warning';
        } else if (statusText.includes('❌') || statusText.toLowerCase().includes('error')) {
          status = 'error';
        }
        if (!name.includes('Total Drops')) {
          healthChecks.push({ name, status });
        }
      }
    }
    if (inHealthTable && !line.startsWith('|')) {
      inHealthTable = false;
    }

    if (line.includes('Total Drops Detected')) {
      const match = line.match(/(\d+)/);
      if (match) totalDrops = parseInt(match[1]);
    }

    if (line.includes('| Date | Source | Metric |')) {
      inDropsTable = true;
      continue;
    }
    if (inDropsTable && line.startsWith('|') && !line.includes('---')) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 6 && parts[0] !== 'Date') {
        drops.push({
          date: parts[0],
          source: parts[1],
          metric: parts[2],
          dropPercent: parts[3],
          value: parseInt(parts[4]) || 0,
          avg7d: parseInt(parts[5]) || 0,
          zScore: parseFloat(parts[6]) || 0,
        });
      }
    }
    if (inDropsTable && !line.startsWith('|')) {
      inDropsTable = false;
    }

    if (line.startsWith('### 🟡') || line.startsWith('### 🟠') || line.startsWith('### 🔴') || line.startsWith('### 🟢')) {
      const titleMatch = line.match(/###\s*[🟡🟠🔴🟢]\s*\d+\.\s*(.+)/);
      if (titleMatch) {
        let confidence: 'high' | 'medium' | 'low' = 'medium';
        if (line.includes('🔴')) confidence = 'high';
        else if (line.includes('🟠')) confidence = 'medium';
        else if (line.includes('🟡')) confidence = 'low';
        rootCauses.push({ title: titleMatch[1], confidence });
      }
    }
  }

  return { healthChecks, drops, rootCauses, period, domain, totalDrops };
}

function StatusIcon({ status }: { status: 'healthy' | 'warning' | 'error' }) {
  if (status === 'healthy') return <CheckCircle className="w-5 h-5 text-green-500" />;
  if (status === 'warning') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  return <XCircle className="w-5 h-5 text-red-500" />;
}

export default function Analysis() {
  const { data: report, isLoading } = useQuery({
    queryKey: ['report'],
    queryFn: async () => {
      const res = await fetch('/api/report/latest');
      if (!res.ok) return null;
      return res.json();
    },
  });

  const parsed = report?.markdownReport ? parseReport(report.markdownReport) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Analysis</h1>
            <p className="text-muted-foreground">Latest diagnostic report and insights</p>
          </div>
          {report && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{new Date(report.createdAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !report ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No reports yet. Run diagnostics from the dashboard to generate a report.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <CardTitle>Report: {report.date}</CardTitle>
                  </div>
                  {parsed?.domain && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <span>{parsed.domain}</span>
                    </div>
                  )}
                </div>
                {parsed?.period && (
                  <CardDescription>Analysis period: {parsed.period}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm">{report.summary}</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    Health Check
                  </CardTitle>
                  <CardDescription>System status at time of analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {parsed?.healthChecks && parsed.healthChecks.length > 0 ? (
                    <div className="space-y-3">
                      {parsed.healthChecks.map((check, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="font-medium">{check.name}</span>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={check.status} />
                            <span className={cn(
                              "text-sm font-medium",
                              check.status === 'healthy' && "text-green-600",
                              check.status === 'warning' && "text-yellow-600",
                              check.status === 'error' && "text-red-600",
                            )}>
                              {check.status === 'healthy' ? 'Healthy' : check.status === 'warning' ? 'Warning' : 'Error'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No health checks available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    Detected Drops
                    {parsed && parsed.totalDrops > 0 && (
                      <Badge variant="destructive" className="ml-2">{parsed.totalDrops}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Significant traffic or metric declines</CardDescription>
                </CardHeader>
                <CardContent>
                  {parsed?.drops && parsed.drops.length > 0 ? (
                    <div className="space-y-3">
                      {parsed.drops.map((drop, i) => (
                        <div key={i} className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{drop.source}</Badge>
                              <span className="font-medium text-sm">{drop.metric}</span>
                            </div>
                            <span className="text-red-600 font-bold">{drop.dropPercent}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{drop.date}</span>
                            <span>Value: {drop.value.toLocaleString()}</span>
                            <span>7d Avg: {drop.avg7d.toLocaleString()}</span>
                            <span>Z-Score: {drop.zScore.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-700 dark:text-green-400">No significant drops detected</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {parsed?.rootCauses && parsed.rootCauses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Root Cause Analysis</CardTitle>
                  <CardDescription>Potential explanations for detected issues</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {parsed.rootCauses.map((cause, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
                          cause.confidence === 'high' && "bg-red-500",
                          cause.confidence === 'medium' && "bg-yellow-500",
                          cause.confidence === 'low' && "bg-gray-400",
                        )}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{cause.title}</span>
                            <Badge className={cn(
                              "text-xs",
                              cause.confidence === 'high' && "bg-red-100 text-red-700",
                              cause.confidence === 'medium' && "bg-yellow-100 text-yellow-700",
                              cause.confidence === 'low' && "bg-gray-100 text-gray-700",
                            )}>
                              {cause.confidence} confidence
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Full Report</CardTitle>
                <CardDescription>Complete diagnostic output</CardDescription>
              </CardHeader>
              <CardContent>
                <details className="group">
                  <summary className="cursor-pointer text-sm text-primary hover:underline">
                    Click to view raw report
                  </summary>
                  <pre className="mt-4 whitespace-pre-wrap text-xs bg-muted p-4 rounded-md overflow-auto max-h-[400px] font-mono">
                    {report.markdownReport}
                  </pre>
                </details>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
