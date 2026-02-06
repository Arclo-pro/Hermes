import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
import { Footer } from "@/components/layout/Footer";

const PAGE_BG = {
  background: `radial-gradient(1200px circle at 10% 0%, rgba(139, 92, 246, 0.06), transparent 40%),
               radial-gradient(1200px circle at 90% 10%, rgba(236, 72, 153, 0.04), transparent 40%),
               #FFFFFF`,
};

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
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified</span>
              {google.status.lastVerifiedAt && (
                <span className="text-gray-500">
                  · Last checked {new Date(google.status.lastVerifiedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ) : google.status.integrationStatus === "error" ? (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Verification failed</span>
              {google.status.lastErrorMessage && (
                <span className="text-gray-500 truncate max-w-xs">
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
        <p className="text-xs text-gray-500 pl-1">
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
      <Card className="bg-white border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
                <p className="text-sm text-gray-500">
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
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : teamData?.team && teamData.team.length > 0 ? (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {teamData.team.map((member) => (
                <div key={member.id} className="flex items-center gap-4 p-4" data-testid={`team-member-${member.id}`}>
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                    <span className="text-purple-600 font-medium">
                      {(member.displayName || member.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{member.displayName || member.email}</span>
                      {member.isOwner && (
                        <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">Owner</Badge>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{member.email}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Joined {formatDate(member.joinedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">Just you so far</h3>
              <p className="text-gray-500 mb-4">Invite team members to collaborate</p>
            </div>
          )}
        </CardContent>
      </Card>

      {invitesData?.invitations && invitesData.invitations.length > 0 && (
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-600" />
              Pending Invitations
            </h3>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {invitesData.invitations.map((invite) => (
                <div key={invite.id} className="flex items-center gap-4 p-4" data-testid={`pending-invite-${invite.id}`}>
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{invite.email}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      Expires {formatDate(invite.expiresAt)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeMutation.mutate(invite.id)}
                    disabled={revokeMutation.isPending}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    data-testid={`button-revoke-invite-${invite.id}`}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-2xl mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Invite Team Member</h3>
            <p className="text-sm text-gray-500 mb-4">
              Invited users will have full access to all your websites.
              They must create a new account to accept the invitation.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  data-testid="input-invite-email"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowInviteModal(false)} className="border-gray-300 text-gray-700 hover:bg-gray-100">
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
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full p-6" style={PAGE_BG}>
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">Settings</h1>
              <p className="text-gray-500">Manage integrations, team, and automation preferences</p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="bg-gray-100 border border-gray-200">
                <TabsTrigger
                  value="integrations"
                  className="flex items-center gap-2 text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                  data-testid="tab-integrations"
                >
                  <BarChart3 className="w-4 h-4" />
                  Integrations
                </TabsTrigger>
                <TabsTrigger
                  value="team"
                  className="flex items-center gap-2 text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                  data-testid="tab-team"
                >
                  <Users className="w-4 h-4" />
                  Team
                </TabsTrigger>
                <TabsTrigger
                  value="autopilot"
                  className="flex items-center gap-2 text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                  data-testid="tab-autopilot"
                >
                  <Zap className="w-4 h-4" />
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
                <Card className="bg-white border-gray-200">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <Zap className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Autopilot Settings</h2>
                        <p className="text-sm text-gray-500">Control how Arclo makes changes to your site automatically.</p>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          autopilotMode === 'full'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setAutopilotMode('full')}
                        data-testid="card-autopilot-full"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${autopilotMode === 'full' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                            <Zap className={`w-5 h-5 ${autopilotMode === 'full' ? 'text-purple-600' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">Full Autopilot</h3>
                              {autopilotMode === 'full' && (
                                <Badge className="bg-purple-600 text-white text-xs">Active</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Arclo makes all changes automatically. You'll see everything in your activity log.
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            autopilotMode === 'full' ? 'border-purple-500' : 'border-gray-300'
                          }`}>
                            {autopilotMode === 'full' && (
                              <div className="w-3 h-3 rounded-full bg-purple-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          autopilotMode === 'approve-major'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setAutopilotMode('approve-major')}
                        data-testid="card-autopilot-approve-major"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${autopilotMode === 'approve-major' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                            <Shield className={`w-5 h-5 ${autopilotMode === 'approve-major' ? 'text-purple-600' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">Approve Major Changes</h3>
                              {autopilotMode === 'approve-major' && (
                                <Badge className="bg-purple-600 text-white text-xs">Active</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Minor fixes are automatic. New pages and major content edits require your approval.
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            autopilotMode === 'approve-major' ? 'border-purple-500' : 'border-gray-300'
                          }`}>
                            {autopilotMode === 'approve-major' && (
                              <div className="w-3 h-3 rounded-full bg-purple-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          autopilotMode === 'manual'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setAutopilotMode('manual')}
                        data-testid="card-autopilot-manual"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${autopilotMode === 'manual' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                            <Hand className={`w-5 h-5 ${autopilotMode === 'manual' ? 'text-purple-600' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">Manual Mode</h3>
                              {autopilotMode === 'manual' && (
                                <Badge className="bg-purple-600 text-white text-xs">Active</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              All changes require your approval before going live.
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            autopilotMode === 'manual' ? 'border-purple-500' : 'border-gray-300'
                          }`}>
                            {autopilotMode === 'manual' && (
                              <div className="w-3 h-3 rounded-full bg-purple-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
