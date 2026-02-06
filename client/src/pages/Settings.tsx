import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  XCircle,
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Search,
  BarChart3,
  Zap,
  Hand,
  Users,
  UserPlus,
  Mail,
} from "lucide-react";
import { useSiteContext } from "@/hooks/useSiteContext";
import { toast } from "sonner";
import { useSearch, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { buildRoute } from "@shared/routes";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { UnifiedGoogleWizard } from "@/components/integrations/UnifiedGoogleWizard";
import { useGoogleConnection } from "@/components/integrations/useGoogleConnection";

function formatDate(date: string | null) {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ---------------------------------------------------------------------------
// Integrations Tab
// ---------------------------------------------------------------------------

function IntegrationsTab() {
  const { siteDomain, selectedSite } = useSiteContext();
  const numericSiteId = selectedSite?.id ? String(selectedSite.id) : null;
  const google = useGoogleConnection(numericSiteId);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<"full" | "ga4-only" | "gsc-only">("full");

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google from this site? This will remove GA4 and Search Console connections.")) return;
    try {
      await google.disconnect();
      toast.success("Google disconnected");
    } catch {
      toast.error("Failed to disconnect Google");
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Google Analytics */}
      <IntegrationCard
        title="Google Analytics (GA4)"
        description="See which pages bring real visitors and which ones convert"
        icon={BarChart3}
        isConnected={!!google.status?.ga4}
        isLoading={google.isLoadingStatus}
        connectedDetail={
          google.status?.ga4?.propertyId
            ? `Property: ${google.status.ga4.propertyId}${google.status.ga4.streamId ? ` · Stream: ${google.status.ga4.streamId}` : ""}`
            : undefined
        }
        onConfigure={() => { setWizardMode("ga4-only"); setWizardOpen(true); }}
        onDisconnect={google.status?.connected ? handleDisconnect : undefined}
      />
      {google.status?.ga4 && google.status.integrationStatus && (
        <div className="pl-1 -mt-2">
          {google.status.integrationStatus === "connected" ? (
            <div className="flex items-center gap-1.5 text-xs text-semantic-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified</span>
              {google.status.lastVerifiedAt && (
                <span className="text-muted-foreground">
                  · Last checked {new Date(google.status.lastVerifiedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ) : google.status.integrationStatus === "error" ? (
            <div className="flex items-center gap-1.5 text-xs text-semantic-danger">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Verification failed</span>
              {google.status.lastErrorMessage && (
                <span className="text-muted-foreground truncate max-w-xs">
                  · {google.status.lastErrorMessage}
                </span>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Google Search Console */}
      <IntegrationCard
        title="Google Search Console"
        description="See impressions, clicks, CTR, and real Google positions"
        icon={Search}
        isConnected={!!google.status?.gsc}
        isLoading={google.isLoadingStatus}
        connectedDetail={google.status?.gsc?.siteUrl || undefined}
        onConfigure={() => { setWizardMode("gsc-only"); setWizardOpen(true); }}
        onDisconnect={google.status?.connected ? handleDisconnect : undefined}
      />

      {/* Connected account info */}
      {google.status?.connected && google.status.googleEmail && (
        <p className="text-xs text-muted-foreground pl-1">
          Connected as {google.status.googleEmail}
          {google.status.connectedAt && (
            <> · {new Date(google.status.connectedAt).toLocaleDateString()}</>
          )}
        </p>
      )}

      {/* Unified Google wizard */}
      {numericSiteId && (
        <UnifiedGoogleWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          siteId={numericSiteId}
          siteDomain={siteDomain || undefined}
          mode={wizardMode}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team Tab
// ---------------------------------------------------------------------------

interface TeamMember {
  id: number;
  email: string;
  displayName: string | null;
  isOwner: boolean;
  joinedAt: string;
  lastLoginAt: string | null;
}

interface PendingInvite {
  id: number;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

function TeamSection() {
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: teamData, isLoading: teamLoading } = useQuery<{ success: boolean; team: TeamMember[] }>({
    queryKey: ['accountTeam'],
    queryFn: async () => {
      const res = await fetch('/api/account/team');
      if (!res.ok) throw new Error('Failed to fetch team');
      return res.json();
    },
  });

  const { data: invitesData } = useQuery<{ success: boolean; invitations: PendingInvite[] }>({
    queryKey: ['accountInvites'],
    queryFn: async () => {
      const res = await fetch('/api/account/invites');
      if (!res.ok) throw new Error('Failed to fetch invitations');
      return res.json();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch('/api/account/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');
      return data;
    },
    onSuccess: () => {
      toast.success("Invitation sent!");
      setShowInviteModal(false);
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ['accountInvites'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (inviteId: number) => {
      const res = await fetch(`/api/account/invites/${inviteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to revoke invitation');
      return res.json();
    },
    onSuccess: () => {
      toast.success("Invitation revoked");
      queryClient.invalidateQueries({ queryKey: ['accountInvites'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Team Members</h2>
              <p className="text-sm text-muted-foreground">
                Everyone on your team has full access to all websites
              </p>
            </div>
          </div>
          <Button onClick={() => setShowInviteModal(true)} data-testid="button-invite-user">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>

        {teamLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : teamData?.team && teamData.team.length > 0 ? (
          <div className="divide-y border rounded-lg">
            {teamData.team.map((member) => (
              <div key={member.id} className="flex items-center gap-4 p-4" data-testid={`team-member-${member.id}`}>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium">
                    {(member.displayName || member.email)[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.displayName || member.email}</span>
                    {member.isOwner && (
                      <Badge variant="outline">Owner</Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{member.email}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Joined {formatDate(member.joinedAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border rounded-lg bg-muted/30">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Just you so far</h3>
            <p className="text-muted-foreground mb-4">Invite team members to collaborate</p>
          </div>
        )}
      </div>

      {invitesData?.invitations && invitesData.invitations.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Pending Invitations
          </h3>
          <div className="divide-y border rounded-lg">
            {invitesData.invitations.map((invite) => (
              <div key={invite.id} className="flex items-center gap-4 p-4" data-testid={`pending-invite-${invite.id}`}>
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <span className="font-medium">{invite.email}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    Expires {formatDate(invite.expiresAt)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revokeMutation.mutate(invite.id)}
                  disabled={revokeMutation.isPending}
                  data-testid={`button-revoke-invite-${invite.id}`}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl mx-4">
            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Invite Team Member</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Invited users will have full access to all your websites.
              They must create a new account to accept the invitation.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="input-invite-email"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => inviteMutation.mutate(inviteEmail)}
                  disabled={inviteMutation.isPending || !inviteEmail}
                  data-testid="button-send-invite"
                >
                  {inviteMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  Send Invitation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Settings Page
// ---------------------------------------------------------------------------

export default function Settings() {
  const searchString = useSearch();
  const [, navigate] = useLocation();

  const params = new URLSearchParams(searchString);
  const tabFromUrl = params.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'integrations');
  const [autopilotMode, setAutopilotMode] = useState<'full' | 'approve-major' | 'manual'>('full');

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(buildRoute.settingsTab(value));
  };

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground">Manage integrations, team, and automation preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="integrations" data-testid="tab-integrations">
              <BarChart3 className="w-4 h-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-team">
              <Users className="w-4 h-4 mr-2" />
              Team
            </TabsTrigger>
            <TabsTrigger value="autopilot" data-testid="tab-autopilot">
              <Zap className="w-4 h-4 mr-2" />
              Autopilot
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-6">
            <IntegrationsTab />
          </TabsContent>

          <TabsContent value="team">
            <TeamSection />
          </TabsContent>

          <TabsContent value="autopilot" className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Autopilot Settings</h2>
                  <p className="text-sm text-muted-foreground">Control how Arclo makes changes to your site automatically.</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    autopilotMode === 'full'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setAutopilotMode('full')}
                  data-testid="card-autopilot-full"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${autopilotMode === 'full' ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Zap className={`w-5 h-5 ${autopilotMode === 'full' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">Full Autopilot</h3>
                        {autopilotMode === 'full' && (
                          <Badge className="bg-primary text-primary-foreground text-xs">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Arclo makes all changes automatically. You'll see everything in your activity log.
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      autopilotMode === 'full' ? 'border-primary' : 'border-muted-foreground/50'
                    }`}>
                      {autopilotMode === 'full' && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    autopilotMode === 'approve-major'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setAutopilotMode('approve-major')}
                  data-testid="card-autopilot-approve-major"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${autopilotMode === 'approve-major' ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Shield className={`w-5 h-5 ${autopilotMode === 'approve-major' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">Approve Major Changes</h3>
                        {autopilotMode === 'approve-major' && (
                          <Badge className="bg-primary text-primary-foreground text-xs">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Minor fixes are automatic. New pages and major content edits require your approval.
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      autopilotMode === 'approve-major' ? 'border-primary' : 'border-muted-foreground/50'
                    }`}>
                      {autopilotMode === 'approve-major' && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    autopilotMode === 'manual'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setAutopilotMode('manual')}
                  data-testid="card-autopilot-manual"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${autopilotMode === 'manual' ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Hand className={`w-5 h-5 ${autopilotMode === 'manual' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">Manual Mode</h3>
                        {autopilotMode === 'manual' && (
                          <Badge className="bg-primary text-primary-foreground text-xs">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        All changes require your approval before going live.
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      autopilotMode === 'manual' ? 'border-primary' : 'border-muted-foreground/50'
                    }`}>
                      {autopilotMode === 'manual' && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
