import { Button } from "@/components/ui/button";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Globe, Plus, Settings, Trash2, ExternalLink, Activity, RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { colors, pageStyles, badgeStyles, gradients } from "@/lib/design-system";

interface Site {
  id: number;
  siteId: string;
  displayName: string;
  baseUrl: string;
  category: string | null;
  techStack: string | null;
  status: string;
  healthScore: number | null;
  lastDiagnosisAt: string | null;
  createdAt: string;
  active: boolean;
}

export default function Sites() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: sites, isLoading } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await fetch('/api/sites');
      if (!res.ok) throw new Error('Failed to fetch sites');
      return res.json();
    },
  });

  const deleteSite = useMutation({
    mutationFn: async (siteId: string) => {
      const res = await fetch(`/api/sites/${siteId}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete site');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Site archived", description: "The site has been archived successfully." });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const baseClass = "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold";
    switch (status) {
      case 'active':
        return (
          <span className={baseClass} style={{ color: badgeStyles.green.color, background: badgeStyles.green.bg }}>
            <CheckCircle className="w-3 h-3 mr-1" />Active
          </span>
        );
      case 'paused':
        return (
          <span className={baseClass} style={{ color: badgeStyles.amber.color, background: badgeStyles.amber.bg }}>
            <Clock className="w-3 h-3 mr-1" />Paused
          </span>
        );
      case 'onboarding':
        return (
          <span className={baseClass} style={{ color: badgeStyles.blue.color, background: badgeStyles.blue.bg }}>
            <Activity className="w-3 h-3 mr-1" />Onboarding
          </span>
        );
      default:
        return (
          <span className={baseClass} style={{ color: colors.text.muted, background: colors.background.muted }}>
            {status}
          </span>
        );
    }
  };

  const getHealthColorStyle = (score: number | null): React.CSSProperties => {
    if (score === null) return { backgroundColor: colors.text.muted };
    if (score >= 80) return { backgroundColor: colors.semantic.success };
    if (score >= 60) return { backgroundColor: colors.semantic.warning };
    if (score >= 40) return { backgroundColor: colors.brand.amber };
    return { backgroundColor: colors.semantic.danger };
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen p-6" style={pageStyles.background}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold" style={{ color: colors.text.primary, letterSpacing: "-0.03em" }} data-testid="page-title">
              <span style={gradients.brandText}>Sites Registry</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.text.muted }}>Manage your monitored websites and their configurations</p>
          </div>
          <Link href={ROUTES.SITE_NEW}>
            <Button data-testid="button-add-site">
              <Plus className="w-4 h-4 mr-2" />
              Add Site
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard variant="marketing" tint="purple">
            <GlassCardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colors.brand.purple}15` }}>
                  <Globe className="w-6 h-6" style={{ color: colors.brand.purple }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: colors.text.primary }} data-testid="text-total-sites">{sites?.length || 0}</p>
                  <p className="text-sm" style={{ color: colors.text.muted }}>Total Sites</p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="marketing" tint="green">
            <GlassCardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colors.semantic.success}15` }}>
                  <CheckCircle className="w-6 h-6" style={{ color: colors.semantic.success }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: colors.text.primary }} data-testid="text-active-sites">{sites?.filter(s => s.status === 'active').length || 0}</p>
                  <p className="text-sm" style={{ color: colors.text.muted }}>Active</p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="marketing" tint="amber">
            <GlassCardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colors.brand.amber}15` }}>
                  <AlertTriangle className="w-6 h-6" style={{ color: colors.brand.amber }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: colors.text.primary }} data-testid="text-needs-attention">{sites?.filter(s => s.healthScore !== null && s.healthScore < 60).length || 0}</p>
                  <p className="text-sm" style={{ color: colors.text.muted }}>Needs Attention</p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>

        <GlassCard variant="marketing">
          <GlassCardHeader>
            <GlassCardTitle style={{ color: colors.text.primary }}>All Sites</GlassCardTitle>
            <p className="text-sm" style={{ color: colors.text.muted }}>Click on a site to view details and run diagnostics</p>
          </GlassCardHeader>
          <GlassCardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin" style={{ color: colors.text.muted }} />
              </div>
            ) : sites && sites.length > 0 ? (
              <div className="space-y-3">
                {sites.map((site) => (
                  <div
                    key={site.siteId}
                    className="flex items-center gap-4 p-4 rounded-lg transition-colors hover:bg-slate-50"
                    style={{ border: `1px solid ${colors.border.default}` }}
                    data-testid={`card-site-${site.siteId}`}
                  >
                    <div className="w-3 h-3 rounded-full" style={getHealthColorStyle(site.healthScore)} title={`Health: ${site.healthScore ?? 'N/A'}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate" style={{ color: colors.text.primary }} data-testid={`text-site-name-${site.siteId}`}>{site.displayName}</h3>
                        {getStatusBadge(site.status)}
                        {site.category && (
                          <span
                            className="px-2 py-0.5 rounded-md text-xs font-medium"
                            style={{ color: colors.text.muted, border: `1px solid ${colors.border.default}` }}
                          >
                            {site.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm mt-1" style={{ color: colors.text.muted }}>
                        <a
                          href={site.baseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:opacity-70"
                          style={{ color: colors.text.secondary }}
                          data-testid={`link-site-url-${site.siteId}`}
                        >
                          {site.baseUrl.replace(/^https?:\/\//, '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {site.techStack && <span className="text-xs">• {site.techStack}</span>}
                      </div>
                    </div>

                    <div className="text-right text-sm hidden md:block">
                      <p style={{ color: colors.text.muted }}>Last diagnosis</p>
                      <p className="font-medium" style={{ color: colors.text.primary }}>{formatDate(site.lastDiagnosisAt)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/sites/${site.siteId}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-site-${site.siteId}`}>
                          <Settings className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-red-50"
                        style={{ color: colors.semantic.danger }}
                        onClick={() => {
                          if (confirm('Are you sure you want to archive this site?')) {
                            deleteSite.mutate(site.siteId);
                          }
                        }}
                        data-testid={`button-delete-site-${site.siteId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Globe className="w-12 h-12 mx-auto mb-4" style={{ color: colors.text.muted }} />
                <h3 className="font-medium mb-2" style={{ color: colors.text.primary }}>No sites configured yet</h3>
                <p className="mb-4" style={{ color: colors.text.muted }}>Add your first site to start monitoring</p>
                <Link href={ROUTES.SITE_NEW}>
                  <Button data-testid="button-add-first-site">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Site
                  </Button>
                </Link>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  );
}
