import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { BenchmarkComparison } from "@/components/dashboard/BenchmarkComparison";

interface BenchmarkMetric {
  id: string;
  label: string;
  yourValue: number;
  industryAvg: number;
  topPerformers: number;
  unit: string;
  higherIsBetter: boolean;
}

const benchmarkData: BenchmarkMetric[] = [
  {
    id: "conversion-rate",
    label: "Conversion Rate",
    yourValue: 3.2,
    industryAvg: 2.8,
    topPerformers: 5.2,
    unit: "%",
    higherIsBetter: true,
  },
  {
    id: "bounce-rate",
    label: "Bounce Rate",
    yourValue: 42,
    industryAvg: 45,
    topPerformers: 32,
    unit: "%",
    higherIsBetter: false,
  },
  {
    id: "avg-session-duration",
    label: "Avg Session Duration",
    yourValue: 2.5,
    industryAvg: 2.1,
    topPerformers: 3.8,
    unit: "min",
    higherIsBetter: true,
  },
  {
    id: "pages-per-session",
    label: "Pages Per Session",
    yourValue: 3.2,
    industryAvg: 2.8,
    topPerformers: 4.5,
    unit: "",
    higherIsBetter: true,
  },
  {
    id: "organic-ctr",
    label: "Organic CTR",
    yourValue: 4.8,
    industryAvg: 3.5,
    topPerformers: 7.2,
    unit: "%",
    higherIsBetter: true,
  },
  {
    id: "page-speed",
    label: "Page Load Time",
    yourValue: 2.8,
    industryAvg: 3.2,
    topPerformers: 1.5,
    unit: "s",
    higherIsBetter: false,
  },
];

function getPerformanceStatus(metric: BenchmarkMetric): "good" | "average" | "poor" {
  const { yourValue, industryAvg, topPerformers, higherIsBetter } = metric;
  if (higherIsBetter) {
    if (yourValue >= topPerformers * 0.8) return "good";
    if (yourValue >= industryAvg) return "average";
    return "poor";
  } else {
    if (yourValue <= topPerformers * 1.2) return "good";
    if (yourValue <= industryAvg) return "average";
    return "poor";
  }
}

function BenchmarkCard({ metric }: { metric: BenchmarkMetric }) {
  const status = getPerformanceStatus(metric);
  const statusColors = {
    good: { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700" },
    average: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" },
    poor: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" },
  };
  const colors = statusColors[status];

  const vsIndustry = metric.higherIsBetter
    ? ((metric.yourValue - metric.industryAvg) / metric.industryAvg) * 100
    : ((metric.industryAvg - metric.yourValue) / metric.industryAvg) * 100;

  const TrendIcon = vsIndustry > 5 ? TrendingUp : vsIndustry < -5 ? TrendingDown : Minus;

  return (
    <Card className={cn("transition-all", colors.bg, colors.border)} data-testid={`benchmark-${metric.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-slate-700">{metric.label}</p>
            <Badge className={cn("text-xs mt-1", colors.badge)}>
              {status === "good" ? "Above Average" : status === "average" ? "On Par" : "Below Average"}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Your Site</span>
            <span className="text-xl font-bold">
              {metric.yourValue}
              {metric.unit}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Industry Avg</span>
            <span className="text-sm font-medium text-muted-foreground">
              {metric.industryAvg}
              {metric.unit}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Top Performers</span>
            <span className="text-sm font-medium text-muted-foreground">
              {metric.topPerformers}
              {metric.unit}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <span className={cn("text-sm flex items-center gap-1", vsIndustry > 0 ? "text-green-600" : "text-red-500")}>
            <TrendIcon className="w-4 h-4" />
            {Math.abs(vsIndustry).toFixed(0)}% vs industry
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Benchmarks() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Industry Benchmarks</h1>
            <p className="text-muted-foreground">Compare your performance against psychiatry clinic averages</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" data-testid="btn-back-dashboard">
              Back to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              About These Benchmarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              These benchmarks are based on aggregated data from psychiatry and mental health clinic websites.
              "Top Performers" represents the 90th percentile, while "Industry Avg" is the median.
              Use these as guidelines to understand where your site stands and identify improvement opportunities.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benchmarkData.map((metric) => (
            <BenchmarkCard key={metric.id} metric={metric} />
          ))}
        </div>

        <BenchmarkComparison />
      </div>
    </DashboardLayout>
  );
}
