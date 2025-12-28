import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Shield, 
  RefreshCw, 
  AlertTriangle,
  Key,
  Database,
  Globe,
  Search,
  BarChart3
} from "lucide-react";
import { useSiteContext } from "@/hooks/useSiteContext";
import { toast } from "sonner";

const INTEGRATION_TYPES = [
  { key: "ga4", label: "Google Analytics 4", icon: BarChart3, description: "Website traffic and engagement data" },
  { key: "gsc", label: "Search Console", icon: Search, description: "Search performance and indexing status" },
  { key: "google_ads", label: "Google Ads", icon: Globe, description: "Paid advertising campaigns" },
  { key: "serp", label: "SERP Tracking", icon: Search, description: "Keyword ranking monitoring" },
  { key: "clarity", label: "Microsoft Clarity", icon: BarChart3, description: "User behavior and heatmaps" },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const { currentSite } = useSiteContext();

  const { data: authStatus } = useQuery({
    queryKey: ['authStatus'],
    queryFn: async () => {
      const res = await fetch('/api/auth/status');
      return res.json();
    },
  });

  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: async () => {
      const res = await fetch('/api/status');
      return res.json();
    },
  });

  const { data: vaultStatus, isLoading: vaultLoading } = useQuery({
    queryKey: ['vaultStatus'],
    queryFn: async () => {
      const res = await fetch('/api/vault/status');
      return res.json();
    },
  });

  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ['siteIntegrations', currentSite?.siteId],
    queryFn: async () => {
      if (!currentSite?.siteId) return [];
      const res = await fetch(`/api/sites/${currentSite.siteId}/integrations`);
      return res.json();
    },
    enabled: !!currentSite?.siteId,
  });

  const testVaultMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/vault/test', { method: 'POST' });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vaultStatus'] });
      if (data.success) {
        toast.success("Vault connection successful");
      } else {
        toast.error("Vault connection failed");
      }
    },
  });

  const testIntegrationMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await fetch(`/api/sites/${currentSite?.siteId}/integrations/${type}/test`, { 
        method: 'POST' 
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['siteIntegrations'] });
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
  });

  const handleConnect = async () => {
    const res = await fetch('/api/auth/url');
    const { url } = await res.json();
    window.location.href = url;
  };

  const getIntegrationStatus = (type: string) => {
    const integration = integrations?.find((i: any) => i.integrationType === type);
    return integration?.status || 'not_configured';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-semantic-success"><CheckCircle className="w-3 h-3 mr-1" /> Connected</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">Not Configured</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground">Configure data sources, vault, and integrations</p>
        </div>

        {/* Vault Configuration Section */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Vault & Credentials</h2>
                <p className="text-sm text-muted-foreground">Secure credential management via Bitwarden</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => testVaultMutation.mutate()}
              disabled={testVaultMutation.isPending}
              data-testid="button-test-vault"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${testVaultMutation.isPending ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Bitwarden Vault</span>
              </div>
              {vaultLoading ? (
                <Badge variant="secondary">Checking...</Badge>
              ) : vaultStatus?.health?.bitwarden?.connected ? (
                <Badge variant="default" className="bg-semantic-success">
                  <CheckCircle className="w-3 h-3 mr-1" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Not Configured
                </Badge>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {vaultStatus?.health?.bitwarden?.error || 
                 (vaultStatus?.health?.bitwarden?.connected ? "Vault is connected and healthy" : "Add BITWARDEN_ACCESS_TOKEN to enable")}
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Environment Variables</span>
              </div>
              {vaultStatus?.health?.env?.connected ? (
                <Badge variant="default" className="bg-semantic-success">
                  <CheckCircle className="w-3 h-3 mr-1" /> Active
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" /> Error
                </Badge>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Fallback credentials from environment
              </p>
            </div>
          </div>
        </div>

        {/* Google Authentication Section */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-4">Google Authentication</h2>
            <div className="flex items-center gap-4">
              {authStatus?.authenticated ? (
                <>
                  <Badge variant="default" className="bg-semantic-success">
                    <CheckCircle className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Token expires: {status?.tokenExpiry ? new Date(status.tokenExpiry).toLocaleString() : 'Unknown'}
                  </span>
                </>
              ) : (
                <>
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" /> Not Connected
                  </Badge>
                  <Button onClick={handleConnect} size="sm" data-testid="button-connect">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect Google Account
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Site Integrations Section */}
        {currentSite && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Site Integrations</h2>
              <p className="text-sm text-muted-foreground">
                Configure data sources for {currentSite.displayName}
              </p>
            </div>

            <div className="grid gap-3">
              {INTEGRATION_TYPES.map((integration) => {
                const status = getIntegrationStatus(integration.key);
                const Icon = integration.icon;
                
                return (
                  <div 
                    key={integration.key}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    data-testid={`integration-${integration.key}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-background rounded-lg">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-medium">{integration.label}</span>
                        <p className="text-xs text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testIntegrationMutation.mutate(integration.key)}
                        disabled={testIntegrationMutation.isPending}
                        data-testid={`button-test-${integration.key}`}
                      >
                        <RefreshCw className={`w-4 h-4 ${testIntegrationMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Sources Status */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Data Sources</h2>
          <div className="grid gap-4">
            {status?.sources && Object.entries(status.sources).map(([key, value]: [string, any]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div>
                  <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                  <p className="text-xs text-muted-foreground">
                    Records: {value.recordCount || 0}
                  </p>
                </div>
                {value.lastError ? (
                  <Badge variant="destructive">Error</Badge>
                ) : value.recordCount > 0 ? (
                  <Badge variant="default" className="bg-semantic-success">Active</Badge>
                ) : (
                  <Badge variant="secondary">No Data</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
