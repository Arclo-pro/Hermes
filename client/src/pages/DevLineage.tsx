import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CREW, SERVICES, METRIC_KEYS, SERVICE_TO_CREW } from "../../../shared/registry";

type MetricsResponse = {
  siteId: string;
  collectedAt: string;
  metrics: Record<string, number | null>;
  coverage: {
    total: number;
    present: number;
    missing: string[];
    stale: string[];
  };
  sources: Record<string, string>;
};

export default function DevLineage() {
  const { data, isLoading, error, refetch } = useQuery<MetricsResponse>({
    queryKey: ["/api/metrics/latest"],
    refetchOnWindowFocus: false,
  });

  const crewMembers = Object.entries(CREW);
  const services = Object.entries(SERVICES);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Crew → Services → Metrics Lineage</h1>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-8">
            <p className="text-red-300">Error loading metrics: {String(error)}</p>
          </div>
        )}

        {data && (
          <div className="mb-8 grid grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-emerald-400">{data.coverage.present}</div>
                <div className="text-sm text-slate-400">Metrics Present</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-400">{data.coverage.missing.length}</div>
                <div className="text-sm text-slate-400">Metrics Missing</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-400">{data.coverage.stale.length}</div>
                <div className="text-sm text-slate-400">Stale (&gt;24h)</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-sky-400">{data.coverage.total}</div>
                <div className="text-sm text-slate-400">Total Canonical</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-8">
          {crewMembers.map(([crewId, crew]) => (
            <Card key={crewId} className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: crew.color + '30', border: `2px solid ${crew.color}` }}
                  >
                    {crew.avatar}
                  </div>
                  <div>
                    <span className="text-xl">{crew.name}</span>
                    <span className="text-sm text-slate-400 ml-2">({crewId})</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    style={{ borderColor: crew.color, color: crew.color }}
                  >
                    {crew.role}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {crew.services.map((serviceId) => {
                    const service = SERVICES[serviceId];
                    if (!service) return null;
                    
                    const sourceTimestamp = data?.sources[serviceId];
                    const isStale = sourceTimestamp && 
                      (Date.now() - new Date(sourceTimestamp).getTime()) > 24 * 60 * 60 * 1000;
                    
                    return (
                      <div key={serviceId} className="border border-slate-700 rounded-lg p-4 ml-12">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{service.name}</span>
                            <span className="text-xs text-slate-500">{serviceId}</span>
                          </div>
                          {sourceTimestamp ? (
                            <Badge 
                              variant="outline" 
                              className={isStale ? 'border-yellow-500 text-yellow-500' : 'border-emerald-500 text-emerald-500'}
                            >
                              {isStale ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                              {new Date(sourceTimestamp).toLocaleString()}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-500 text-slate-500">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              No data
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {service.metricsProduced.map((metricKey) => {
                            const value = data?.metrics[metricKey];
                            const hasValue = value !== undefined && value !== null;
                            const isThisStale = data?.coverage.stale.includes(metricKey);
                            const isMissing = data?.coverage.missing.includes(metricKey);
                            
                            return (
                              <div 
                                key={metricKey}
                                className={`p-2 rounded text-sm ${
                                  hasValue 
                                    ? isThisStale 
                                      ? 'bg-yellow-900/30 border border-yellow-700' 
                                      : 'bg-emerald-900/30 border border-emerald-700'
                                    : 'bg-slate-800/50 border border-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  {hasValue ? (
                                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3 text-slate-500" />
                                  )}
                                  <code className="text-xs text-slate-300">{metricKey}</code>
                                </div>
                                <div className={`text-right font-mono ${hasValue ? 'text-white' : 'text-slate-500'}`}>
                                  {hasValue ? (
                                    typeof value === 'number' 
                                      ? value.toLocaleString(undefined, { maximumFractionDigits: 3 })
                                      : String(value)
                                  ) : '—'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-xs text-slate-500">
          <p>Registry source: shared/registry.ts</p>
          <p>Metrics API: /api/metrics/latest</p>
          {data && <p>Site ID: {data.siteId} | Collected: {data.collectedAt}</p>}
        </div>
      </div>
    </div>
  );
}
