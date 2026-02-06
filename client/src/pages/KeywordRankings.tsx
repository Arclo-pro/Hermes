import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";
import { Search, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, Target, Filter, Trophy, Crown, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useSerpKeywords, useSerpSnapshot, useSerpRefreshUsage, triggerSerpRefresh, type SerpKeywordEntry, type KeywordIntent } from "@/hooks/useOpsDashboard";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function getDirectionIcon(direction: SerpKeywordEntry["direction"]) {
  switch (direction) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    case 'new':
      return <Sparkles className="h-4 w-4 text-blue-600" />;
    case 'stable':
    default:
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
}

function getPositionBadge(position: number | null) {
  const base = "h-6 inline-flex items-center";
  if (position === null) {
    return <Badge className={`${base} bg-destructive text-white`}>N/R</Badge>;
  }
  if (position === 1) {
    return (
      <Badge className={`${base} bg-gold text-white gap-1`}>
        <Crown className="h-3 w-3" />
        {position}
      </Badge>
    );
  }
  if (position <= 3) {
    return (
      <Badge className={`${base} bg-blue-500 text-white gap-1`}>
        <Trophy className="h-3 w-3" />
        {position}
      </Badge>
    );
  }
  if (position <= 10) {
    return <Badge className={`${base} bg-emerald-500 text-white`}>{position}</Badge>;
  }
  if (position <= 20) {
    return <Badge className={`${base} bg-amber-500 text-white`}>{position}</Badge>;
  }
  if (position <= 50) {
    return <Badge className={`${base} bg-muted text-foreground`}>{position}</Badge>;
  }
  return <Badge className={`${base} bg-destructive/10 text-destructive`}>{position}</Badge>;
}

function formatChange(value: number | null): string {
  if (value === null) return '-';
  if (value > 0) return `+${value}`;
  return String(value);
}

function getChangeColor(value: number | null): string {
  if (value === null) return 'text-gray-500';
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-500';
}

const INTENT_LABELS: Record<NonNullable<KeywordIntent>, string> = {
  local: "Local",
  informational: "Info",
  transactional: "Txn",
  navigational: "Nav",
  commercial: "Comm",
};

export default function KeywordRankings() {
  const { siteId } = useSiteContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [trendFilter, setTrendFilter] = useState<string>('all');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const keywords = useSerpKeywords(siteId);
  const snapshot = useSerpSnapshot(siteId);
  const refreshUsage = useSerpRefreshUsage(siteId);

  const isLoading = keywords.isLoading || snapshot.isLoading;

  const handleRefresh = useCallback(async () => {
    if (!siteId || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const result = await triggerSerpRefresh(siteId);

      if (result.upgradeRequired) {
        toast({
          title: "Refresh limit reached",
          description: `You've used all ${result.limit} monthly refreshes. Upgrade to get more.`,
          variant: "destructive",
        });
      } else if (result.success) {
        toast({
          title: "Refresh started",
          description: result.message,
        });
        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({ queryKey: ["/api/ops-dashboard", siteId] });
        await queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "serp-refresh"] });
      } else {
        toast({
          title: "Refresh failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger refresh",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [siteId, isRefreshing, queryClient, toast]);

  const allKeywords = keywords.data?.keywords || [];

  const filteredKeywords = allKeywords.filter(kw => {
    if (searchTerm && !kw.keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (trendFilter !== 'all' && kw.direction !== trendFilter) {
      return false;
    }
    if (positionFilter === 'top10' && (kw.currentPosition === null || kw.currentPosition > 10)) {
      return false;
    }
    if (positionFilter === 'top20' && (kw.currentPosition === null || kw.currentPosition > 20)) {
      return false;
    }
    if (positionFilter === 'notranking' && kw.currentPosition !== null) {
      return false;
    }
    return true;
  });

  // Compute summary stats from snapshot data
  const snapshotData = snapshot.data;
  const totalKeywords = snapshotData?.totalTracked ?? allKeywords.length;
  const ranking = snapshotData?.rankingCounts.top100 ?? 0;
  const numberOne = snapshotData?.rankingCounts.position1 ?? 0;
  const inTop3 = snapshotData?.rankingCounts.top3 ?? 0;
  const inTop10 = snapshotData?.rankingCounts.top10 ?? 0;
  const improving = snapshotData?.weekOverWeek.improved ?? 0;
  const declining = snapshotData?.weekOverWeek.declined ?? 0;

  // Calculate average position from keyword data
  const rankedKeywords = allKeywords.filter(k => k.currentPosition !== null);
  const avgPosition = rankedKeywords.length > 0
    ? (rankedKeywords.reduce((sum, k) => sum + (k.currentPosition ?? 0), 0) / rankedKeywords.length).toFixed(1)
    : '-';

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="stat-total-keywords">
                {totalKeywords}
              </div>
              <div className="text-sm text-gray-500">Total Keywords</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-ranking">
                {ranking}
              </div>
              <div className="text-sm text-gray-500">Total Ranking</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gold/10 to-gold/5 border-gold-border">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-gold flex items-center gap-1" data-testid="stat-top-1">
                <Crown className="h-5 w-5" />
                {numberOne}
              </div>
              <div className="text-sm text-gray-500">Top 1</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-muted-foreground/10 to-muted-foreground/5 border-border">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-gray-500 flex items-center gap-1" data-testid="stat-top-3">
                <Trophy className="h-4 w-4" />
                {inTop3}
              </div>
              <div className="text-sm text-gray-500">Top 3</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gold/10 to-gold/5 border-gold-border">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-gold flex items-center gap-1" data-testid="stat-top-10">
                <Trophy className="h-4 w-4" />
                {inTop10}
              </div>
              <div className="text-sm text-gray-500">Top 10</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="stat-avg-position">
                {avgPosition}
              </div>
              <div className="text-sm text-gray-500">Avg Position</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600 flex items-center gap-1" data-testid="stat-improving">
                <ArrowUp className="h-4 w-4" />
                {improving}
              </div>
              <div className="text-sm text-gray-500">Improving</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600 flex items-center gap-1" data-testid="stat-declining">
                <ArrowDown className="h-4 w-4" />
                {declining}
              </div>
              <div className="text-sm text-gray-500">Declining</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Keyword Rankings
                </CardTitle>
                <CardDescription>
                  {snapshotData?.lastChecked
                    ? `Last checked: ${new Date(snapshotData.lastChecked).toLocaleDateString()}`
                    : 'Tracking keyword positions across search engines'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {refreshUsage.data && (
                  <span className="text-sm text-gray-500">
                    {refreshUsage.data.remaining}/{refreshUsage.data.limit} refreshes left
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing || (refreshUsage.data?.remaining === 0)}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-keywords"
                  />
                </div>
              </div>
              <Select value={trendFilter} onValueChange={setTrendFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-trend-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Trend" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trends</SelectItem>
                  <SelectItem value="up">Improving</SelectItem>
                  <SelectItem value="down">Declining</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                </SelectContent>
              </Select>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-position-filter">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="top10">Top 10</SelectItem>
                  <SelectItem value="top20">Top 20</SelectItem>
                  <SelectItem value="notranking">Not Ranking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading keywords...
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-center w-[100px]">Position</TableHead>
                      <TableHead className="text-center w-[80px]">7d Change</TableHead>
                      <TableHead className="text-center w-[80px]">30d Change</TableHead>
                      <TableHead className="text-center w-[80px]">90d Change</TableHead>
                      <TableHead className="text-center w-[60px]">Trend</TableHead>
                      <TableHead className="text-center w-[80px]">Volume</TableHead>
                      <TableHead className="w-[80px]">Intent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKeywords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          {allKeywords.length === 0
                            ? 'No keywords tracked yet. Keywords will appear once Arclo analyzes your site.'
                            : 'No keywords match your filters.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredKeywords.map((kw, idx) => (
                        <TableRow key={kw.id} data-testid={`row-keyword-${kw.id}`}>
                          <TableCell className="text-gray-500">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{kw.keyword}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            {getPositionBadge(kw.currentPosition)}
                          </TableCell>
                          <TableCell className={`text-center font-mono text-sm ${getChangeColor(kw.change7d)}`}>
                            {formatChange(kw.change7d)}
                          </TableCell>
                          <TableCell className={`text-center font-mono text-sm ${getChangeColor(kw.change30d)}`}>
                            {formatChange(kw.change30d)}
                          </TableCell>
                          <TableCell className={`text-center font-mono text-sm ${getChangeColor(kw.change90d)}`}>
                            {formatChange(kw.change90d)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getDirectionIcon(kw.direction)}
                          </TableCell>
                          <TableCell className="text-center text-sm text-gray-500">
                            {kw.volume?.toLocaleString() ?? '-'}
                          </TableCell>
                          <TableCell>
                            {kw.intent && (
                              <Badge variant="outline" className="text-xs">
                                {INTENT_LABELS[kw.intent] ?? kw.intent}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredKeywords.length} of {allKeywords.length} keywords
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
