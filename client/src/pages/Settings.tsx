import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
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
  Send,
  Loader2,
  X,
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
import { colors, pageStyles, modalStyles, buttonStyles } from "@/lib/design-system";

const PAGE_BG = pageStyles.background;

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

  const resendMutation = useMutation({
    mutationFn: async (inviteId: number) => {
      const res = await fetch('/api/account/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend invitation');
      return data;
    },
    onSuccess: () => {
      toast.success("Invitation resent!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="marketing" tint="purple">
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(124, 58, 237, 0.1)" }}
              >
                <Users className="w-5 h-5" style={{ color: "#7c3aed" }} />
              </div>
              <div>
                <GlassCardTitle>Team Members</GlassCardTitle>
                <p className="text-sm" style={{ color: colors.text.muted }}>
                  Everyone on your team has full access to all websites
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className={buttonStyles.primary.base}
              style={buttonStyles.primary.purple}
              data-testid="button-invite-user"
            >
              <UserPlus className="w-4 h-4" />
              Invite User
            </button>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {teamLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.text.disabled }} />
            </div>
          ) : teamData?.team && teamData.team.length > 0 ? (
            <div className="space-y-2">
              {teamData.team.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
                  data-testid={`team-member-${member.id}`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(124, 58, 237, 0.1)" }}
                  >
                    <span className="font-medium" style={{ color: "#7c3aed" }}>
                      {(member.displayName || member.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: colors.text.primary }}>
                        {member.displayName || member.email}
                      </span>
                      {member.isOwner && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                          style={{ color: "#7c3aed", background: "rgba(124, 58, 237, 0.08)" }}
                        >
                          Owner
                        </span>
                      )}
                    </div>
                    <span className="text-sm" style={{ color: colors.text.muted }}>
                      {member.email}
                    </span>
                  </div>
                  <span className="text-sm" style={{ color: colors.text.muted }}>
                    Joined {formatDate(member.joinedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4" style={{ color: colors.text.placeholder }} />
              <h3 className="font-medium mb-2" style={{ color: colors.text.primary }}>Just you so far</h3>
              <p style={{ color: colors.text.muted }}>Invite team members to collaborate</p>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {invitesData?.invitations && invitesData.invitations.length > 0 && (
        <GlassCard variant="marketing" tint="amber">
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" style={{ color: "#f59e0b" }} />
              Pending Invitations
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="space-y-2">
              {invitesData.invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
                  data-testid={`pending-invite-${invite.id}`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(245, 158, 11, 0.1)" }}
                  >
                    <Mail className="w-4 h-4" style={{ color: "#f59e0b" }} />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium" style={{ color: colors.text.primary }}>
                      {invite.email}
                    </span>
                    <span className="text-sm ml-2" style={{ color: colors.text.muted }}>
                      Expires {formatDate(invite.expiresAt)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resendMutation.mutate(invite.id)}
                      disabled={resendMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-purple-50 disabled:opacity-50"
                      style={{ color: "#7c3aed", border: "1px solid rgba(124, 58, 237, 0.2)" }}
                      data-testid={`button-resend-invite-${invite.id}`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {resendMutation.isPending ? 'Sending...' : 'Resend'}
                    </button>
                    <button
                      onClick={() => revokeMutation.mutate(invite.id)}
                      disabled={revokeMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-gray-100 disabled:opacity-50"
                      style={{ color: colors.text.muted, border: "1px solid rgba(15, 23, 42, 0.12)" }}
                      data-testid={`button-revoke-invite-${invite.id}`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {showInviteModal && (
        <div
          className={modalStyles.overlay.className}
          style={modalStyles.overlay.style}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className={modalStyles.container.className}
            style={modalStyles.container.style}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={modalStyles.header.className}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(124, 58, 237, 0.1)" }}
                >
                  <UserPlus className="w-5 h-5" style={{ color: "#7c3aed" }} />
                </div>
                <div>
                  <h3 className={modalStyles.title.className} style={modalStyles.title.style}>
                    Invite Team Member
                  </h3>
                  <p className={modalStyles.description.className} style={modalStyles.description.style}>
                    Full access to all websites
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 rounded-lg transition-colors hover:bg-slate-100"
              >
                <X className="w-4 h-4" style={{ color: colors.text.muted }} />
              </button>
            </div>

            <div
              className="p-4 rounded-xl mb-4"
              style={{ background: "rgba(15, 23, 42, 0.02)", border: "1px solid rgba(15, 23, 42, 0.06)" }}
            >
              <p className="text-sm" style={{ color: colors.text.secondary }}>
                Invited users will have full access to all your websites.
                They must create a new account to accept the invitation.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  style={{ color: colors.text.primary }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.12)",
                    color: colors.text.primary,
                  }}
                  data-testid="input-invite-email"
                />
              </div>
              <div className={modalStyles.footer.className}>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className={`flex-1 ${buttonStyles.secondary.base}`}
                  style={buttonStyles.secondary.default}
                >
                  Cancel
                </button>
                <button
                  onClick={() => inviteMutation.mutate(inviteEmail)}
                  disabled={inviteMutation.isPending || !inviteEmail}
                  className={`flex-1 ${buttonStyles.primary.base}`}
                  style={buttonStyles.primary.purple}
                  data-testid="button-send-invite"
                >
                  {inviteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Invitation
                </button>
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
        <div className={pageStyles.container} style={PAGE_BG}>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Page Header - Dashboard style */}
            <div className="mb-8">
              <h1
                className="text-4xl font-bold mb-2"
                style={{ color: colors.text.primary, letterSpacing: "-0.03em" }}
                data-testid="text-page-title"
              >
                Sett<span
                  style={{
                    backgroundImage: "linear-gradient(90deg, #7c3aed, #ec4899, #f59e0b)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >ings</span>
              </h1>
              <p style={{ color: colors.text.secondary }}>
                Manage integrations, team, and automation preferences
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <div
                className="inline-flex rounded-xl p-1"
                style={{ background: "rgba(15, 23, 42, 0.04)", border: "1px solid rgba(15, 23, 42, 0.06)" }}
              >
                <button
                  onClick={() => handleTabChange("integrations")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "integrations" ? "" : "hover:bg-white/50"
                  }`}
                  style={
                    activeTab === "integrations"
                      ? { background: "#FFFFFF", color: colors.text.primary, boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" }
                      : { color: colors.text.muted }
                  }
                  data-testid="tab-integrations"
                >
                  <BarChart3 className="w-4 h-4" />
                  Integrations
                </button>
                <button
                  onClick={() => handleTabChange("team")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "team" ? "" : "hover:bg-white/50"
                  }`}
                  style={
                    activeTab === "team"
                      ? { background: "#FFFFFF", color: colors.text.primary, boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" }
                      : { color: colors.text.muted }
                  }
                  data-testid="tab-team"
                >
                  <Users className="w-4 h-4" />
                  Team
                </button>
                <button
                  onClick={() => handleTabChange("autopilot")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "autopilot" ? "" : "hover:bg-white/50"
                  }`}
                  style={
                    activeTab === "autopilot"
                      ? { background: "#FFFFFF", color: colors.text.primary, boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" }
                      : { color: colors.text.muted }
                  }
                  data-testid="tab-autopilot"
                >
                  <Zap className="w-4 h-4" />
                  Autopilot
                </button>
              </div>

              {/* Keep TabsList hidden for accessibility but use custom buttons for visual */}
              <TabsList className="hidden">
                <TabsTrigger value="integrations">Integrations</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="autopilot">Autopilot</TabsTrigger>
              </TabsList>

              <TabsContent value="integrations" className="space-y-6">
                <IntegrationsTab />
              </TabsContent>

              <TabsContent value="team">
                <TeamSection />
              </TabsContent>

              <TabsContent value="autopilot" className="space-y-6">
                <GlassCard variant="marketing" tint="amber">
                  <GlassCardHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(245, 158, 11, 0.1)" }}
                      >
                        <Zap className="w-5 h-5" style={{ color: "#f59e0b" }} />
                      </div>
                      <div>
                        <GlassCardTitle>Autopilot Settings</GlassCardTitle>
                        <p className="text-sm" style={{ color: colors.text.muted }}>
                          Control how Arclo makes changes to your site automatically.
                        </p>
                      </div>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <div className="space-y-3">
                      {/* Full Autopilot Option */}
                      <div
                        className="p-4 rounded-xl cursor-pointer transition-all"
                        style={{
                          background: autopilotMode === 'full'
                            ? "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(124,58,237,0.02))"
                            : "#FFFFFF",
                          border: autopilotMode === 'full'
                            ? "2px solid rgba(124, 58, 237, 0.3)"
                            : "1px solid rgba(15, 23, 42, 0.06)",
                        }}
                        onClick={() => setAutopilotMode('full')}
                        data-testid="card-autopilot-full"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              background: autopilotMode === 'full' ? "rgba(124, 58, 237, 0.12)" : "rgba(15, 23, 42, 0.04)",
                            }}
                          >
                            <Zap
                              className="w-5 h-5"
                              style={{ color: autopilotMode === 'full' ? "#7c3aed" : colors.text.muted }}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold" style={{ color: colors.text.primary }}>
                                Full Autopilot
                              </h3>
                              {autopilotMode === 'full' && (
                                <span
                                  className="px-2 py-0.5 rounded-md text-xs font-semibold"
                                  style={{ background: "#7c3aed", color: "#FFFFFF" }}
                                >
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-1" style={{ color: colors.text.muted }}>
                              Arclo makes all changes automatically. You'll see everything in your activity log.
                            </p>
                          </div>
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{ borderColor: autopilotMode === 'full' ? "#7c3aed" : "rgba(15, 23, 42, 0.15)" }}
                          >
                            {autopilotMode === 'full' && (
                              <div className="w-3 h-3 rounded-full" style={{ background: "#7c3aed" }} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Approve Major Option */}
                      <div
                        className="p-4 rounded-xl cursor-pointer transition-all"
                        style={{
                          background: autopilotMode === 'approve-major'
                            ? "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(124,58,237,0.02))"
                            : "#FFFFFF",
                          border: autopilotMode === 'approve-major'
                            ? "2px solid rgba(124, 58, 237, 0.3)"
                            : "1px solid rgba(15, 23, 42, 0.06)",
                        }}
                        onClick={() => setAutopilotMode('approve-major')}
                        data-testid="card-autopilot-approve-major"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              background: autopilotMode === 'approve-major' ? "rgba(124, 58, 237, 0.12)" : "rgba(15, 23, 42, 0.04)",
                            }}
                          >
                            <Shield
                              className="w-5 h-5"
                              style={{ color: autopilotMode === 'approve-major' ? "#7c3aed" : colors.text.muted }}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold" style={{ color: colors.text.primary }}>
                                Approve Major Changes
                              </h3>
                              {autopilotMode === 'approve-major' && (
                                <span
                                  className="px-2 py-0.5 rounded-md text-xs font-semibold"
                                  style={{ background: "#7c3aed", color: "#FFFFFF" }}
                                >
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-1" style={{ color: colors.text.muted }}>
                              Minor fixes are automatic. New pages and major content edits require your approval.
                            </p>
                          </div>
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{ borderColor: autopilotMode === 'approve-major' ? "#7c3aed" : "rgba(15, 23, 42, 0.15)" }}
                          >
                            {autopilotMode === 'approve-major' && (
                              <div className="w-3 h-3 rounded-full" style={{ background: "#7c3aed" }} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Manual Mode Option */}
                      <div
                        className="p-4 rounded-xl cursor-pointer transition-all"
                        style={{
                          background: autopilotMode === 'manual'
                            ? "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(124,58,237,0.02))"
                            : "#FFFFFF",
                          border: autopilotMode === 'manual'
                            ? "2px solid rgba(124, 58, 237, 0.3)"
                            : "1px solid rgba(15, 23, 42, 0.06)",
                        }}
                        onClick={() => setAutopilotMode('manual')}
                        data-testid="card-autopilot-manual"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              background: autopilotMode === 'manual' ? "rgba(124, 58, 237, 0.12)" : "rgba(15, 23, 42, 0.04)",
                            }}
                          >
                            <Hand
                              className="w-5 h-5"
                              style={{ color: autopilotMode === 'manual' ? "#7c3aed" : colors.text.muted }}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold" style={{ color: colors.text.primary }}>
                                Manual Mode
                              </h3>
                              {autopilotMode === 'manual' && (
                                <span
                                  className="px-2 py-0.5 rounded-md text-xs font-semibold"
                                  style={{ background: "#7c3aed", color: "#FFFFFF" }}
                                >
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-1" style={{ color: colors.text.muted }}>
                              All changes require your approval before going live.
                            </p>
                          </div>
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{ borderColor: autopilotMode === 'manual' ? "#7c3aed" : "rgba(15, 23, 42, 0.15)" }}
                          >
                            {autopilotMode === 'manual' && (
                              <div className="w-3 h-3 rounded-full" style={{ background: "#7c3aed" }} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
