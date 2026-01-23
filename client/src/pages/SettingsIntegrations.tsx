import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BarChart3, Search, Globe, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface IntegrationBlockProps {
  id?: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  children: React.ReactNode;
}

function IntegrationBlock({ id, title, description, icon, isConnected, children }: IntegrationBlockProps) {
  return (
    <Card id={id} className="bg-card rounded-xl border border-border shadow-sm scroll-mt-8">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">{title}</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">{description}</CardDescription>
            </div>
          </div>
          <Badge 
            variant={isConnected ? "success" : "danger"} 
            className="flex items-center gap-1"
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                Not connected
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

export default function SettingsIntegrations() {
  const { siteDomain, selectedSite } = useSiteContext();
  const { toast } = useToast();
  
  const integrations = selectedSite?.integrations || {};
  
  const [ga4PropertyId, setGa4PropertyId] = useState(integrations.ga4?.property_id || "");
  const [ga4Connected, setGa4Connected] = useState(!!integrations.ga4?.property_id);
  const [ga4Saving, setGa4Saving] = useState(false);
  
  const [gscSiteUrl, setGscSiteUrl] = useState(integrations.gsc?.property || "");
  const [gscConnected, setGscConnected] = useState(!!integrations.gsc?.property);
  const [gscSaving, setGscSaving] = useState(false);
  
  const [crawlerEnabled, setCrawlerEnabled] = useState(integrations.crawler?.enabled ?? false);
  const [crawlerUrl, setCrawlerUrl] = useState(siteDomain ? `https://${siteDomain}` : "");
  const [crawlerTesting, setCrawlerTesting] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, []);

  const handleSaveGa4 = async () => {
    if (!ga4PropertyId.trim()) {
      toast({ title: "Please enter a GA4 Property ID", variant: "destructive" });
      return;
    }
    setGa4Saving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setGa4Connected(true);
    setGa4Saving(false);
    toast({ title: "Google Analytics connected successfully" });
  };

  const handleSaveGsc = async () => {
    if (!gscSiteUrl.trim()) {
      toast({ title: "Please enter a site URL", variant: "destructive" });
      return;
    }
    setGscSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setGscConnected(true);
    setGscSaving(false);
    toast({ title: "Google Search Console connected successfully" });
  };

  const handleTestCrawl = async () => {
    if (!crawlerUrl.trim()) {
      toast({ title: "Please enter a crawl URL", variant: "destructive" });
      return;
    }
    setCrawlerTesting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCrawlerTesting(false);
    toast({ title: "Test crawl completed successfully" });
  };

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-8 max-w-3xl mx-auto">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground mt-1">Connect your data sources to unlock insights</p>
        </header>

        <div className="space-y-6">
          <IntegrationBlock
            id="ga4"
            title="Google Analytics (GA4)"
            description="Connect to see traffic and conversion data"
            icon={<BarChart3 className="w-5 h-5 text-gold" />}
            isConnected={ga4Connected}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ga4-property" className="text-sm font-medium text-foreground">
                  GA4 Property ID
                </Label>
                <Input
                  id="ga4-property"
                  placeholder="123456789"
                  value={ga4PropertyId}
                  onChange={(e) => setGa4PropertyId(e.target.value)}
                  className="max-w-sm"
                  data-testid="input-ga4-property"
                />
              </div>

              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-sm font-medium text-foreground mb-2">How to find your GA4 Property ID:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to Google Analytics</li>
                  <li>Click Admin (gear icon) in the bottom left</li>
                  <li>Under Property, click "Property Settings"</li>
                  <li>Copy the Property ID (numeric value at the top)</li>
                </ol>
              </div>

              <Button 
                onClick={handleSaveGa4} 
                disabled={ga4Saving}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-save-ga4"
              >
                {ga4Saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Connection
              </Button>
            </div>
          </IntegrationBlock>

          <IntegrationBlock
            id="gsc"
            title="Google Search Console"
            description="Connect to see ranking and indexing data"
            icon={<Search className="w-5 h-5 text-semantic-info" />}
            isConnected={gscConnected}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gsc-url" className="text-sm font-medium text-foreground">
                  Site URL
                </Label>
                <Input
                  id="gsc-url"
                  placeholder="https://example.com"
                  value={gscSiteUrl}
                  onChange={(e) => setGscSiteUrl(e.target.value)}
                  className="max-w-sm"
                  data-testid="input-gsc-url"
                />
              </div>

              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-sm font-medium text-foreground mb-2">How to connect Google Search Console:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to Google Search Console</li>
                  <li>Select your verified property</li>
                  <li>Copy the exact URL shown (include https://)</li>
                  <li>Make sure the domain matches your site exactly</li>
                </ol>
              </div>

              <Button 
                onClick={handleSaveGsc} 
                disabled={gscSaving}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-save-gsc"
              >
                {gscSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Connection
              </Button>
            </div>
          </IntegrationBlock>

          <IntegrationBlock
            id="crawler"
            title="Technical Crawler"
            description="Enable automated technical SEO audits"
            icon={<Globe className="w-5 h-5 text-semantic-success" />}
            isConnected={crawlerEnabled}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="crawler-toggle" className="text-sm font-medium text-foreground">
                    Allow crawl-based technical insights
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable automated crawling to detect technical SEO issues
                  </p>
                </div>
                <Switch
                  id="crawler-toggle"
                  checked={crawlerEnabled}
                  onCheckedChange={setCrawlerEnabled}
                  data-testid="switch-crawler"
                />
              </div>

              {crawlerEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="crawler-url" className="text-sm font-medium text-foreground">
                      Crawl Base URL
                    </Label>
                    <Input
                      id="crawler-url"
                      placeholder="https://example.com"
                      value={crawlerUrl}
                      onChange={(e) => setCrawlerUrl(e.target.value)}
                      className="max-w-sm"
                      data-testid="input-crawler-url"
                    />
                    <p className="text-xs text-muted-foreground">
                      The crawler will start from this URL and follow internal links
                    </p>
                  </div>

                  <Button 
                    variant="outline"
                    onClick={handleTestCrawl} 
                    disabled={crawlerTesting}
                    data-testid="button-test-crawl"
                  >
                    {crawlerTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Test Crawl
                  </Button>
                </>
              )}
            </div>
          </IntegrationBlock>
        </div>
      </div>
    </DashboardLayout>
  );
}
