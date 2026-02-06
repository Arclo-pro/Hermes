import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSiteContext } from "@/hooks/useSiteContext";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Loader2, Plus } from "lucide-react";
import { colors, pageStyles, gradients } from "@/lib/design-system";

export default function SelectSite() {
  const { authenticated, loading, selectWebsite, activeWebsiteId } = useAuth();
  const { sites, isLoading: sitesLoading } = useSiteContext();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !authenticated) {
      navigate("/login");
    }
  }, [loading, authenticated, navigate]);

  useEffect(() => {
    if (activeWebsiteId) {
      navigate("/app/overview");
    }
  }, [activeWebsiteId, navigate]);

  const handleSelectSite = async (siteId: string) => {
    const success = await selectWebsite(siteId);
    if (success) {
      navigate("/app/overview");
    }
  };

  if (loading || sitesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={pageStyles.background}>
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.brand.purple }} />
          <p style={{ color: colors.text.muted }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={pageStyles.background}>
      <GlassCard variant="marketing" tint="purple" className="w-full max-w-lg">
        <GlassCardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: gradients.brand }}>
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <GlassCardTitle className="text-2xl font-bold" style={{ color: colors.text.primary }}>Select a Website</GlassCardTitle>
          <p className="text-sm mt-1" style={{ color: colors.text.muted }}>
            Choose which website you want to manage
          </p>
        </GlassCardHeader>
        <GlassCardContent className="space-y-3">
          {sites && sites.length > 0 ? (
            sites.map((site) => (
              <Button
                key={site.siteId}
                variant="outline"
                className="w-full justify-between h-auto py-4 hover:bg-slate-50"
                style={{ borderColor: colors.border.default }}
                onClick={() => handleSelectSite(site.siteId)}
                data-testid={`button-select-site-${site.siteId}`}
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5" style={{ color: colors.brand.purple }} />
                  <div className="text-left">
                    <p className="font-medium" style={{ color: colors.text.primary }}>{site.displayName}</p>
                    <p className="text-sm" style={{ color: colors.text.muted }}>{site.baseUrl}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5" style={{ color: colors.text.muted }} />
              </Button>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="mb-4" style={{ color: colors.text.muted }}>No websites configured yet.</p>
              <Button
                onClick={() => navigate("/app/sites/new")}
                style={{ backgroundColor: colors.brand.purple }}
                data-testid="button-add-first-site"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Website
              </Button>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}
