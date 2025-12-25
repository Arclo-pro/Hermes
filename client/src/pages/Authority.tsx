import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ExternalLink, 
  RefreshCw,
  Target,
  BarChart3,
  Globe,
  Link2,
  FileText,
  Zap,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteContext } from "@/hooks/useSiteContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IndustryBenchmark {
  metric: string;
  label: string;
  description: string;
  yourValue: number;
  industryAvg: number;
  industryTop10: number;
  unit: string;
  higherIsBetter: boolean;
  category: 'authority' | 'performance' | 'content' | 'technical';
}

interface AuthorityScore {
  overall: number;
  domainAuthority: number;
  pageAuthority: number;
  trustFlow: number;
  citationFlow: number;
  backlinks: number;
  referringDomains: number;
  organicKeywords: number;
  organicTraffic: number;
}

const INDUSTRY_CATEGORIES = [
  { value: 'healthcare', label: 'Healthcare & Medical' },
  { value: 'ecommerce', label: 'E-commerce & Retail' },
  { value: 'saas', label: 'SaaS & Technology' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'education', label: 'Education' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'travel', label: 'Travel & Hospitality' },
];

const MOCK_BENCHMARKS: IndustryBenchmark[] = [
  {
    metric: 'domain_authority',
    label: 'Domain Authority',
    description: 'Overall authority score of your domain (0-100)',
    yourValue: 42,
    industryAvg: 35,
    industryTop10: 65,
    unit: '',
    higherIsBetter: true,
    category: 'authority',
  },
  {
    metric: 'backlinks',
    label: 'Total Backlinks',
    description: 'Number of external links pointing to your site',
    yourValue: 2847,
    industryAvg: 1500,
    industryTop10: 15000,
    unit: '',
    higherIsBetter: true,
    category: 'authority',
  },
  {
    metric: 'referring_domains',
    label: 'Referring Domains',
    description: 'Unique domains linking to your site',
    yourValue: 156,
    industryAvg: 120,
    industryTop10: 850,
    unit: '',
    higherIsBetter: true,
    category: 'authority',
  },
  {
    metric: 'organic_keywords',
    label: 'Organic Keywords',
    description: 'Keywords your site ranks for in search',
    yourValue: 1250,
    industryAvg: 800,
    industryTop10: 5000,
    unit: '',
    higherIsBetter: true,
    category: 'performance',
  },
  {
    metric: 'organic_traffic',
    label: 'Monthly Organic Traffic',
    description: 'Estimated monthly visitors from search',
    yourValue: 8500,
    industryAvg: 5000,
    industryTop10: 50000,
    unit: '',
    higherIsBetter: true,
    category: 'performance',
  },
  {
    metric: 'avg_position',
    label: 'Average Position',
    description: 'Average ranking position across all keywords',
    yourValue: 18.5,
    industryAvg: 25,
    industryTop10: 8,
    unit: '',
    higherIsBetter: false,
    category: 'performance',
  },
  {
    metric: 'page_speed',
    label: 'Page Speed Score',
    description: 'Core Web Vitals performance score',
    yourValue: 72,
    industryAvg: 55,
    industryTop10: 90,
    unit: '',
    higherIsBetter: true,
    category: 'technical',
  },
  {
    metric: 'mobile_score',
    label: 'Mobile Usability',
    description: 'Mobile-friendliness score',
    yourValue: 85,
    industryAvg: 70,
    industryTop10: 95,
    unit: '%',
    higherIsBetter: true,
    category: 'technical',
  },
  {
    metric: 'indexed_pages',
    label: 'Indexed Pages',
    description: 'Pages indexed by search engines',
    yourValue: 245,
    industryAvg: 150,
    industryTop10: 1000,
    unit: '',
    higherIsBetter: true,
    category: 'content',
  },
  {
    metric: 'content_freshness',
    label: 'Content Freshness',
    description: 'Percentage of content updated in last 90 days',
    yourValue: 35,
    industryAvg: 25,
    industryTop10: 60,
    unit: '%',
    higherIsBetter: true,
    category: 'content',
  },
];

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(num % 1 === 0 ? 0 : 1);
}

function getComparisonStatus(benchmark: IndustryBenchmark): 'above' | 'below' | 'average' {
  const { yourValue, industryAvg, higherIsBetter } = benchmark;
  const diff = ((yourValue - industryAvg) / industryAvg) * 100;
  
  if (higherIsBetter) {
    if (diff > 10) return 'above';
    if (diff < -10) return 'below';
    return 'average';
  } else {
    if (diff < -10) return 'above';
    if (diff > 10) return 'below';
    return 'average';
  }
}

function getPercentileVsTop10(benchmark: IndustryBenchmark): number {
  const { yourValue, industryAvg, industryTop10, higherIsBetter } = benchmark;
  
  if (higherIsBetter) {
    if (yourValue >= industryTop10) return 100;
    if (yourValue <= industryAvg) return Math.max(0, (yourValue / industryAvg) * 50);
    return 50 + ((yourValue - industryAvg) / (industryTop10 - industryAvg)) * 50;
  } else {
    if (yourValue <= industryTop10) return 100;
    if (yourValue >= industryAvg) return Math.max(0, (industryAvg / yourValue) * 50);
    return 50 + ((industryAvg - yourValue) / (industryAvg - industryTop10)) * 50;
  }
}

function BenchmarkCard({ benchmark }: { benchmark: IndustryBenchmark }) {
  const status = getComparisonStatus(benchmark);
  const percentile = getPercentileVsTop10(benchmark);
  const diff = ((benchmark.yourValue - benchmark.industryAvg) / benchmark.industryAvg) * 100;
  const adjustedDiff = benchmark.higherIsBetter ? diff : -diff;

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`card-benchmark-${benchmark.metric}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{benchmark.label}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">{benchmark.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              status === 'above' && "bg-green-50 text-green-700 border-green-200",
              status === 'below' && "bg-red-50 text-red-700 border-red-200",
              status === 'average' && "bg-yellow-50 text-yellow-700 border-yellow-200"
            )}
          >
            {status === 'above' && <TrendingUp className="w-3 h-3 mr-1" />}
            {status === 'below' && <TrendingDown className="w-3 h-3 mr-1" />}
            {status === 'average' && <Minus className="w-3 h-3 mr-1" />}
            {adjustedDiff > 0 ? '+' : ''}{adjustedDiff.toFixed(0)}%
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold">
              {formatNumber(benchmark.yourValue)}{benchmark.unit}
            </span>
            <span className="text-xs text-muted-foreground mb-1">Your Score</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>vs Industry</span>
              <span>Top 10%: {formatNumber(benchmark.industryTop10)}{benchmark.unit}</span>
            </div>
            <div className="relative">
              <Progress value={percentile} className="h-2" />
              <div 
                className="absolute top-0 h-2 w-0.5 bg-muted-foreground/50"
                style={{ left: '50%' }}
                title="Industry Average"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Avg: {formatNumber(benchmark.industryAvg)}{benchmark.unit}</span>
              <span className="font-medium">{percentile.toFixed(0)}th percentile</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverallScoreCard({ benchmarks }: { benchmarks: IndustryBenchmark[] }) {
  const aboveCount = benchmarks.filter(b => getComparisonStatus(b) === 'above').length;
  const belowCount = benchmarks.filter(b => getComparisonStatus(b) === 'below').length;
  const avgPercentile = benchmarks.reduce((acc, b) => acc + getPercentileVsTop10(b), 0) / benchmarks.length;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Overall Authority Score
        </CardTitle>
        <CardDescription>
          How your site compares to industry benchmarks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{avgPercentile.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">Percentile</div>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-semibold text-green-600">{aboveCount}</div>
              <div className="text-xs text-muted-foreground">Above Avg</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-yellow-600">{benchmarks.length - aboveCount - belowCount}</div>
              <div className="text-xs text-muted-foreground">On Par</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-red-600">{belowCount}</div>
              <div className="text-xs text-muted-foreground">Below Avg</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Authority() {
  const { currentSite } = useSiteContext();
  const [selectedIndustry, setSelectedIndustry] = useState('healthcare');
  const [activeTab, setActiveTab] = useState('all');

  const { data: benchmarks, isLoading, refetch } = useQuery({
    queryKey: ['authority-benchmarks', currentSite?.siteId, selectedIndustry],
    queryFn: async () => {
      // In a real implementation, this would fetch from the API
      // For now, return mock data with slight variations based on industry
      return MOCK_BENCHMARKS.map(b => ({
        ...b,
        industryAvg: b.industryAvg * (0.9 + Math.random() * 0.2),
        industryTop10: b.industryTop10 * (0.9 + Math.random() * 0.2),
      }));
    },
  });

  const filteredBenchmarks = benchmarks?.filter(b => 
    activeTab === 'all' || b.category === activeTab
  ) || [];

  const categoryIcons = {
    authority: <Award className="w-4 h-4" />,
    performance: <BarChart3 className="w-4 h-4" />,
    content: <FileText className="w-4 h-4" />,
    technical: <Zap className="w-4 h-4" />,
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6" data-testid="page-authority">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Web Authority Score</h1>
            <p className="text-muted-foreground">
              Track your site's authority and compare to industry benchmarks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-[200px]" data-testid="select-industry">
                <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select Industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetch()}
              data-testid="button-refresh-benchmarks"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {benchmarks && <OverallScoreCard benchmarks={benchmarks} />}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              All Metrics
            </TabsTrigger>
            <TabsTrigger value="authority" data-testid="tab-authority">
              {categoryIcons.authority}
              <span className="ml-1">Authority</span>
            </TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">
              {categoryIcons.performance}
              <span className="ml-1">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="content" data-testid="tab-content">
              {categoryIcons.content}
              <span className="ml-1">Content</span>
            </TabsTrigger>
            <TabsTrigger value="technical" data-testid="tab-technical">
              {categoryIcons.technical}
              <span className="ml-1">Technical</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-32 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBenchmarks.map(benchmark => (
                  <BenchmarkCard key={benchmark.metric} benchmark={benchmark} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Improvement Opportunities
            </CardTitle>
            <CardDescription>
              Focus on these metrics to close the gap with top performers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {benchmarks
                ?.filter(b => getComparisonStatus(b) === 'below')
                .slice(0, 3)
                .map(benchmark => {
                  const gap = benchmark.higherIsBetter 
                    ? benchmark.industryTop10 - benchmark.yourValue
                    : benchmark.yourValue - benchmark.industryTop10;
                  
                  return (
                    <div 
                      key={benchmark.metric}
                      className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800"
                    >
                      <div>
                        <p className="font-medium text-sm">{benchmark.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Gap to top 10%: {formatNumber(Math.abs(gap))}{benchmark.unit}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs">
                        View Tips
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  );
                })}
              {(!benchmarks || benchmarks.filter(b => getComparisonStatus(b) === 'below').length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Great job! You're performing above or at industry average across all metrics.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
