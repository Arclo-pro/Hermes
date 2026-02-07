/**
 * EvidenceSection - Tables with page/source impact for the breakdown page
 */

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { MetricEvidence, MetricKey } from "../../../../../shared/types/metricExplanation";

interface EvidenceSectionProps {
  evidence: MetricEvidence;
  metricKey: MetricKey;
}

export function EvidenceSection({ evidence, metricKey }: EvidenceSectionProps) {
  const hasPageData = evidence.topPagesByImpact && evidence.topPagesByImpact.length > 0;
  const hasSourceData = evidence.topSourcesByImpact && evidence.topSourcesByImpact.length > 0;

  if (!hasPageData && !hasSourceData) {
    return (
      <GlassCard variant="marketing">
        <GlassCardHeader className="pb-3">
          <GlassCardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Evidence
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <p className="text-sm" style={{ color: "#64748B" }}>
            Not enough dimensional data available to show detailed evidence.
          </p>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="marketing">
      <GlassCardHeader className="pb-3">
        <GlassCardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-5 h-5" style={{ color: "#7c3aed" }} />
          Evidence
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="space-y-6">
        {/* Top Pages by Impact */}
        {hasPageData && (
          <div>
            <h4 className="text-sm font-medium mb-3" style={{ color: "#0F172A" }}>
              Top Pages by Impact
            </h4>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Page</TableHead>
                    <TableHead className="text-right">Before</TableHead>
                    <TableHead className="text-right">After</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evidence.topPagesByImpact.slice(0, 8).map((page, index) => {
                    const isPositive = page.delta > 0;
                    return (
                      <TableRow key={`${page.url}-${index}`}>
                        <TableCell className="font-medium truncate max-w-[200px]" title={page.url}>
                          {page.url}
                        </TableCell>
                        <TableCell className="text-right text-sm" style={{ color: "#64748B" }}>
                          {page.metricBefore.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm" style={{ color: "#64748B" }}>
                          {page.metricAfter.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className="inline-flex items-center gap-1 text-sm font-medium"
                            style={{ color: isPositive ? "#22c55e" : "#ef4444" }}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {isPositive ? "+" : ""}{page.delta.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className="text-sm font-medium"
                            style={{ color: isPositive ? "#22c55e" : "#ef4444" }}
                          >
                            {page.contribution > 0 ? "+" : ""}{page.contribution.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Top Sources by Impact */}
        {hasSourceData && (
          <div>
            <h4 className="text-sm font-medium mb-3" style={{ color: "#0F172A" }}>
              Top Channels by Impact
            </h4>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evidence.topSourcesByImpact!.map((source, index) => {
                    const isPositive = source.delta > 0;
                    return (
                      <TableRow key={`${source.source}-${index}`}>
                        <TableCell className="font-medium">{source.source}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className="inline-flex items-center gap-1 text-sm font-medium"
                            style={{ color: isPositive ? "#22c55e" : "#ef4444" }}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {isPositive ? "+" : ""}{source.delta.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className="text-sm font-medium"
                            style={{ color: isPositive ? "#22c55e" : "#ef4444" }}
                          >
                            {source.contribution > 0 ? "+" : ""}{source.contribution.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
