import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback } from "react";
import { Search, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, Target, Filter, Trophy, Crown, Loader2, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { colors, pageStyles, badgeStyles, gradients } from "@/lib/design-system";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useSerpKeywords, useSerpSnapshot, useSerpRefreshUsage, triggerSerpRefresh, type SerpKeywordEntry, type KeywordIntent } from "@/hooks/useOpsDashboard";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function getDirectionIcon(direction: SerpKeywordEntry["direction"]) {
  switch (direction) {
    case 'up':
      return <TrendingUp className="h-4 w-4" style={{ color: colors.semantic.success }} />;
    case 'down':
      return <TrendingDown className="h-4 w-4" style={{ color: colors.semantic.danger }} />;
    case 'new':
      return <Sparkles className="h-4 w-4" style={{ color: colors.brand.blue }} />;
    case 'stable':
    default:
      return <Minus className="h-4 w-4" style={{ color: colors.text.muted }} />;
  }
}

function getPositionBadge(position: number | null) {
  const base = "h-6 px-2 py-0.5 rounded-md text-xs font-semibold inline-flex items-center";
  if (position === null) {
    return <span className={base} style={{ background: badgeStyles.red.bg, color: badgeStyles.red.color }}>N/R</span>;
  }
  if (position === 1) {
    return (
      <span className={`${base} gap-1`} style={{ background: badgeStyles.amber.bg, color: badgeStyles.amber.color }}>
        <Crown className="h-3 w-3" />
        {position}
      </span>
    );
  }
  if (position <= 3) {
    return (
      <span className={`${base} gap-1`} style={{ background: badgeStyles.blue.bg, color: badgeStyles.blue.color }}>
        <Trophy className="h-3 w-3" />
        {position}
      </span>
    );
  }
  if (position <= 10) {
    return <span className={base} style={{ background: badgeStyles.green.bg, color: badgeStyles.green.color }}>{position}</span>;
  }
  if (position <= 20) {
    return <span className={base} style={{ background: badgeStyles.amber.bg, color: badgeStyles.amber.color }}>{position}</span>;
  }
  if (position <= 50) {
    return <span className={base} style={{ background: badgeStyles.gray.bg, color: badgeStyles.gray.color }}>{position}</span>;
  }
  return <span className={base} style={{ background: badgeStyles.red.bg, color: badgeStyles.red.color }}>{position}</span>;
}

function formatChange(value: number | null): string {
  if (value === null) return '-';
  if (value > 0) return `+${value}`;
  return String(value);
}

function getChangeColorStyle(value: number | null): React.CSSProperties {
  if (value === null) return { color: colors.text.muted };
  if (value > 0) return { color: colors.semantic.success };
  if (value < 0) return { color: colors.semantic.danger };
  return { color: colors.text.muted };
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
  const isError = keywords.isError || snapshot.isError;
  const handleRetryData = useCallback(() => {
    keywords.refetch();
    snapshot.refetch();
  }, [keywords, snapshot]);

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
    <div className="min-h-screen p-6" style={pageStyles.background}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: colors.text.primary, letterSpacing: "-0.03em" }}>
            <span style={gradients.brandText}>Keyword Rankings</span>
          </h1>
          <p style={{ color: colors.text.secondary }}>Track your search visibility across all keywords</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <GlassCard variant="marketing">
            <GlassCardContent className="pt-4">
              <div className="text-2xl font-bold" style={{ color: colors.text.primary }} data-testid="stat-total-keywords">
                {totalKeywords}
              </div>
              <div className="text-sm" style={{ color: colors.text.muted }}>Total Keywords</div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="marketing">
            <GlassCardContent className="pt-4">
              <div className="text-2xl font-bold" style={{ color: colors.brand.blue }} data-testid="stat-ranking">
                {ranking}
              </div>
              <div className="text-sm" style={{ color: colors.text.muted }}>Total Ranking</div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="marketing" tint="amber">
            <GlassCardContent className="pt-4">
              <div className="text-2xl font-bold flex items-center gap-1" style={{ color: colors.brand.amber }} data-testid="stat-top-1">
                <Crown className="h-5 w-5" />
                {numberOne}
              </div>
              <div className="text-sm" style={{ color: colors.text.muted }}>Top 1</div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="marketing">
            <GlassCardContent className="pt-4">
              <div className="text-2xl font-bold flex items-center gap-1" style={{ color: colors.text.muted }} data-testid="stat-top-3">
                <Trophy className="h-4 w-4" />
                {inTop3}
              </div>
              <div className="text-sm" style={{ color: colors.text.muted }}>Top 3</div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="marketing" tint="amber">
            <GlassCardContent className="pt-4">
              <div className="text-2xl font-bold flex items-center gap-1" style={{ color: colors.brand.amber }} data-testid="stat-top-10">
                <Trophy className="h-4 w-4" />
                {inTop10}
              </div>
              <div className="text-sm" style={{ color: colors.text.muted }}>Top 10</div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="marketing">
            <GlassCardContent className="pt-4">
              <div className="text-2xl font-bold" style={{ color: colors.text.primary }} data-testid="stat-avg-position">
                {avgPosition}
              </div>
              <div className="text-sm" style={{ color: colors.text.muted }}>Avg Position</div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="marketing" tint="green">
            <GlassCardContent className="pt-4">
              <div className="text-2xl font-bold flex items-center gap-1" style={{ color: colors.semantic.success }} data-testid="stat-improving">
                <ArrowUp className="h-4 w-4" />
                {improving}
              </div>
              <div className="text-sm" style={{ color: colors.text.muted }}>Improving</div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="marketing" tint="red">
            <GlassCardContent className="pt-4">
              <div className="text-2xl font-bold flex items-center gap-1" style={{ color: colors.semantic.danger }} data-testid="stat-declining">
                <ArrowDown className="h-4 w-4" />
                {declining}
              </div>
              <div className="text-sm" style={{ color: colors.text.muted }}>Declining</div>
            </GlassCardContent>
          </GlassCard>
        </div>

        <GlassCard variant="marketing" tint="purple">
          <GlassCardHeader>
            <div className="flex items-center justify-between">
              <div>
                <GlassCardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" style={{ color: colors.brand.purple }} />
                  <span style={{ color: colors.text.primary }}>Keyword Rankings</span>
                </GlassCardTitle>
                <GlassCardDescription>
                  {snapshotData?.lastChecked
                    ? `Last checked: ${new Date(snapshotData.lastChecked).toLocaleDateString()}`
                    : 'Tracking keyword positions across search engines'}
                </GlassCardDescription>
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
          </GlassCardHeader>
          <GlassCardContent>
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

            {isError ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 gap-3">
                <AlertCircle className="h-8 w-8" style={{ color: colors.semantic.danger }} />
                <p>Unable to load keyword rankings</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryData}
                  disabled={keywords.isRefetching || snapshot.isRefetching}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${(keywords.isRefetching || snapshot.isRefetching) ? 'animate-spin' : ''}`} />
                  Retry
                </Button>
              </div>
            ) : isLoading ? (
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
                          <TableCell className="text-center font-mono text-sm" style={getChangeColorStyle(kw.change7d)}>
                            {formatChange(kw.change7d)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm" style={getChangeColorStyle(kw.change30d)}>
                            {formatChange(kw.change30d)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm" style={getChangeColorStyle(kw.change90d)}>
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

            <div className="mt-4 text-sm" style={{ color: colors.text.muted }}>
              Showing {filteredKeywords.length} of {allKeywords.length} keywords
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  );
}
