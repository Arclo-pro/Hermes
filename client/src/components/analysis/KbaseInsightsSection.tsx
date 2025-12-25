import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Lightbulb, Clock, ExternalLink, Check, X, Filter, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Finding {
  findingId: string;
  title: string;
  description?: string;
  severity: string;
  category: string;
  sourceIntegration?: string;
  runId?: string;
  status: string;
  recommendedActions?: string[];
  createdAt: string;
}

interface KbaseResponse {
  findings: Finding[];
  count: number;
  lastRunAt?: string;
  lastRunId?: string;
  lastRunStatus?: string;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
  info: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  fixed: "bg-emerald-100 text-emerald-800",
  ignored: "bg-gray-100 text-gray-600",
};

export function KbaseInsightsSection() {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");

  const { data, isLoading, refetch } = useQuery<KbaseResponse>({
    queryKey: ["kbaseFindings", severityFilter],
    queryFn: async () => {
      const res = await fetch("/api/findings/kbase?limit=50");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ findingId, status }: { findingId: string; status: string }) => {
      const res = await fetch(`/api/findings/${findingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kbaseFindings"] });
      queryClient.invalidateQueries({ queryKey: ["findingsSummary"] });
      toast.success("Finding status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const filteredFindings = data?.findings?.filter(f => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    return true;
  }) || [];

  const lastRunTime = data?.lastRunAt ? formatDistanceToNow(new Date(data.lastRunAt), { addSuffix: true }) : null;

  return (
    <Card data-testid="card-kbase-insights">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-lg">Knowledge Base Insights</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} data-testid="button-refresh-kbase-insights">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <CardDescription className="flex items-center gap-4">
          <span>SEO recommendations and best practices from the knowledge base</span>
          {lastRunTime && (
            <span className="flex items-center gap-1 text-xs">
              <Clock className="w-3 h-3" />
              Last run {lastRunTime}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32" data-testid="select-severity-filter">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="ignored">Ignored</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filteredFindings.length} of {data?.count || 0} insights
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading insights...
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {data?.count === 0 ? "No Knowledge Base insights yet. Run the SEO KBase integration to get recommendations." : "No insights match your filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFindings.map((finding) => (
              <div
                key={finding.findingId}
                className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                data-testid={`kbase-finding-${finding.findingId}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={severityColors[finding.severity] || severityColors.info}>
                        {finding.severity}
                      </Badge>
                      <Badge className={statusColors[finding.status] || statusColors.open}>
                        {finding.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Source: SEO_KBASE
                      </span>
                    </div>
                    <h4 className="font-medium">{finding.title}</h4>
                    {finding.description && (
                      <p className="text-sm text-muted-foreground mt-1">{finding.description}</p>
                    )}
                    {finding.recommendedActions && finding.recommendedActions.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Actions:</p>
                        <ul className="text-sm space-y-1">
                          {finding.recommendedActions.slice(0, 3).map((action, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {finding.runId && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        Run: {finding.runId}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {finding.status === "open" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ findingId: finding.findingId, status: "accepted" })}
                          title="Accept"
                          data-testid={`button-accept-${finding.findingId}`}
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ findingId: finding.findingId, status: "ignored" })}
                          title="Ignore"
                          data-testid={`button-ignore-${finding.findingId}`}
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </Button>
                      </>
                    )}
                    {finding.status === "accepted" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ findingId: finding.findingId, status: "fixed" })}
                        title="Mark as Fixed"
                        data-testid={`button-fix-${finding.findingId}`}
                      >
                        <Check className="w-4 h-4 text-emerald-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
