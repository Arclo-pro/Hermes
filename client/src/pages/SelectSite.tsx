import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSiteContext } from "@/hooks/useSiteContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Loader2, Plus } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-surface-2 to-background px-4">
      <Card className="w-full max-w-lg bg-card border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-progress flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Select a Website</CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose which website you want to manage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sites && sites.length > 0 ? (
            sites.map((site) => (
              <Button
                key={site.siteId}
                variant="outline"
                className="w-full justify-between bg-secondary border-border text-foreground hover:bg-muted h-auto py-4"
                onClick={() => handleSelectSite(site.siteId)}
                data-testid={`button-select-site-${site.siteId}`}
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5 text-gold" />
                  <div className="text-left">
                    <p className="font-medium">{site.displayName}</p>
                    <p className="text-sm text-muted-foreground">{site.baseUrl}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No websites configured yet.</p>
              <Button 
                onClick={() => navigate("/app/sites/new")}
                className="bg-gold hover:bg-gold/90"
                data-testid="button-add-first-site"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Website
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
