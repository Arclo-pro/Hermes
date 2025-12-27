import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { USER_FACING_AGENTS, getCrewMember, type CrewMember } from "@/config/agents";
import { Check, Zap, Lock, Sparkles, TrendingUp, Shield, Eye, FileText, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShipCanvas } from "@/components/crew/ShipCanvas";

const CREW_ROLES = USER_FACING_AGENTS;

const SET_BONUSES = [
  {
    id: "revenue_attribution",
    title: "Revenue Attribution",
    requirements: ["google_data_connector", "serp_intel", "competitive_snapshot"],
    value: "See which SEO work actually drives traffic and conversions.",
    icon: TrendingUp,
  },
  {
    id: "automated_execution",
    title: "Automated SEO Execution",
    requirements: ["crawl_render", "content_generator"],
    value: "Automatically generate tasks, PRs, and content updates.",
    icon: Zap,
    comingSoon: true,
  },
];

const CAPABILITY_GROUPS = [
  {
    id: "visibility",
    title: "Visibility Intelligence",
    icon: Eye,
    requirements: ["serp_intel", "competitive_snapshot"],
    capabilities: ["Keyword tracking", "Rank change explanations", "Technical SEO scoring accuracy", "Conversion-weighted fixes"],
  },
  {
    id: "technical",
    title: "Technical Intelligence",
    icon: Shield,
    requirements: ["crawl_render", "core_web_vitals"],
    capabilities: ["Crawl diagnostics", "Core Web Vitals tracking", "Index health monitoring"],
  },
  {
    id: "content",
    title: "Content Health",
    icon: FileText,
    requirements: ["content_decay", "content_generator"],
    capabilities: ["Decay detection", "Refresh priorities", "Content strategy"],
  },
  {
    id: "analytics",
    title: "Analytics & Signals",
    icon: Activity,
    requirements: ["google_data_connector", "google_ads_connector"],
    capabilities: ["Traffic trends", "Conversion tracking", "Ad performance"],
  },
];

interface CrewStateResponse {
  siteId: string;
  enabledAgents: string[];
  agentStatus: Record<string, { health: string; needsConfig: boolean; lastRun: string | null }>;
  totalEnabled: number;
}

function ProgressRing({ percent, size = 80, strokeWidth = 8 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-slate-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-amber-400 transition-all duration-500"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{percent}%</span>
      </div>
    </div>
  );
}

function MaturityBadge({ percent }: { percent: number }) {
  let tier = "Bronze";
  let color = "bg-amber-700 text-amber-100";
  
  if (percent >= 80) {
    tier = "Best-in-Class";
    color = "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900";
  } else if (percent >= 60) {
    tier = "Gold";
    color = "bg-amber-500 text-slate-900";
  } else if (percent >= 40) {
    tier = "Silver";
    color = "bg-slate-400 text-slate-900";
  }
  
  return (
    <Badge className={cn("text-xs px-3 py-1", color)}>
      {tier}
    </Badge>
  );
}


function StatusCard({ 
  enabledCount, 
  totalRoles, 
  enabledAgents = []
}: { 
  enabledCount: number;
  totalRoles: number;
  enabledAgents: string[];
}) {
  const [activeTab, setActiveTab] = useState<"progress" | "nextup">("progress");
  const percent = Math.round((enabledCount / totalRoles) * 100);
  
  const agents = enabledAgents || [];
  const missingForRevenue = SET_BONUSES[0].requirements.filter(r => !agents.includes(r));
  const missingForExecution = SET_BONUSES[1].requirements.filter(r => !agents.includes(r));
  
  return (
    <Card className="bg-slate-900/80 border-slate-700 text-white" data-testid="status-card">
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab("progress")}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors",
            activeTab === "progress" 
              ? "text-amber-400 border-b-2 border-amber-400" 
              : "text-slate-400 hover:text-slate-300"
          )}
          data-testid="tab-progress"
        >
          Progress
        </button>
        <button
          onClick={() => setActiveTab("nextup")}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors",
            activeTab === "nextup" 
              ? "text-amber-400 border-b-2 border-amber-400" 
              : "text-slate-400 hover:text-slate-300"
          )}
          data-testid="tab-nextup"
        >
          Next Up
        </button>
      </div>
      
      <CardContent className="p-5">
        {activeTab === "progress" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <ProgressRing percent={percent} />
              <div>
                <MaturityBadge percent={percent} />
                <p className="text-sm text-slate-400 mt-1">Operational</p>
                <p className="text-lg font-semibold">{enabledCount} / {totalRoles} Roles staffed</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {percent >= 80 ? "Best-in-class coverage achieved!" :
               percent >= 60 ? "Ahead of 65% of similar sites" :
               percent >= 40 ? "Ahead of 45% of similar sites" :
               "Getting started — enable more crew members"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Lowest friction wins</p>
            
            {missingForRevenue.length > 0 && missingForRevenue.length <= 2 && (
              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                <p className="text-sm font-medium text-amber-300 mb-1">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Unlock Revenue Attribution
                </p>
                <p className="text-xs text-slate-400">
                  Missing: {missingForRevenue.map(id => getCrewMember(id).nickname).join(" + ")}
                </p>
              </div>
            )}
            
            {missingForExecution.length > 0 && missingForExecution.length <= 2 && (
              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                <p className="text-sm font-medium text-sky-300 mb-1">
                  <Zap className="w-4 h-4 inline mr-1" />
                  Unlock Automated Execution
                </p>
                <p className="text-xs text-slate-400">
                  Missing: {missingForExecution.map(id => getCrewMember(id).nickname).join(" + ")}
                </p>
              </div>
            )}
            
            {missingForRevenue.length > 2 && missingForExecution.length > 2 && (
              <p className="text-sm text-slate-400">
                Enable crew members to unlock set bonuses and capabilities.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoleDrawer({ 
  agentId, 
  open, 
  onOpenChange,
  isEnabled,
  isSelected,
  onSelect,
  onEnable,
  onDisable
}: { 
  agentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEnabled: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onEnable: () => void;
  onDisable: () => void;
}) {
  if (!agentId) return null;
  
  const crew = getCrewMember(agentId);
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-slate-900 border-slate-700 text-white w-[400px]">
        <SheetHeader className="pb-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            {crew.avatar ? (
              <img src={crew.avatar} alt={crew.nickname} className="w-16 h-16 object-contain" />
            ) : (
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: crew.color }}
              >
                {crew.nickname.slice(0, 2)}
              </div>
            )}
            <div>
              <SheetTitle className="text-white text-xl" style={{ color: crew.color }}>
                {crew.nickname}
              </SheetTitle>
              <SheetDescription className="text-slate-400">
                {crew.role}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
          <div>
            <p className="text-sm text-slate-300">{crew.blurb}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isEnabled ? "default" : "outline"} className={isEnabled ? "bg-green-600" : "border-slate-600 text-slate-400"}>
              {isEnabled ? "Enabled" : isSelected ? "Selected (Preview)" : "Not Enabled"}
            </Badge>
          </div>
          
          {crew.tooltipInfo && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">What this unlocks:</p>
              <ul className="space-y-2">
                {crew.tooltipInfo.outputs.map((output, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {output}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {crew.capabilities && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Capabilities:</p>
              <div className="flex flex-wrap gap-2">
                {crew.capabilities.map((cap, i) => (
                  <Badge key={i} variant="outline" className="border-slate-600 text-slate-300">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="absolute bottom-6 left-6 right-6 space-y-3">
          {!isEnabled && (
            <Button 
              variant="outline" 
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
              onClick={onSelect}
              data-testid="button-select-preview"
            >
              {isSelected ? "Deselect Preview" : "Select (Preview)"}
            </Button>
          )}
          <Button 
            className={cn(
              "w-full font-semibold",
              isEnabled 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "bg-amber-500 hover:bg-amber-600 text-slate-900"
            )}
            onClick={isEnabled ? onDisable : onEnable}
            data-testid={isEnabled ? "button-disable" : "button-enable"}
          >
            {isEnabled ? "Disable" : "Enable"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CapabilityCard({ 
  group, 
  enabledAgents 
}: { 
  group: typeof CAPABILITY_GROUPS[0];
  enabledAgents: string[];
}) {
  const enabledCount = group.requirements.filter(r => enabledAgents.includes(r)).length;
  const status = enabledCount === group.requirements.length ? "active" : enabledCount > 0 ? "partial" : "locked";
  const Icon = group.icon;
  
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      status === "active" ? "bg-slate-800/80 border-amber-500/50" :
      status === "partial" ? "bg-slate-800/50 border-slate-600" :
      "bg-slate-900/50 border-slate-700 opacity-60"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          status === "active" ? "bg-amber-500/20 text-amber-400" :
          status === "partial" ? "bg-slate-700 text-slate-400" :
          "bg-slate-800 text-slate-500"
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-semibold text-white text-sm">{group.title}</h4>
          <Badge variant="outline" className={cn(
            "text-[10px] mt-1",
            status === "active" ? "border-green-500 text-green-400" :
            status === "partial" ? "border-amber-500 text-amber-400" :
            "border-slate-600 text-slate-500"
          )}>
            {status === "active" ? "Active" : status === "partial" ? "Partial" : "Locked"}
          </Badge>
        </div>
      </div>
      <ul className="space-y-1.5">
        {group.capabilities.map((cap, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
            <Check className={cn(
              "w-3 h-3",
              status === "active" ? "text-green-400" :
              status === "partial" ? "text-amber-400" :
              "text-slate-600"
            )} />
            {cap}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SetBonusCard({ 
  bonus, 
  enabledAgents,
  onRequirementClick
}: { 
  bonus: typeof SET_BONUSES[0];
  enabledAgents: string[];
  onRequirementClick: (agentId: string) => void;
}) {
  const enabledCount = bonus.requirements.filter(r => enabledAgents.includes(r)).length;
  const status = enabledCount === bonus.requirements.length ? "active" : enabledCount > 0 ? "partial" : "locked";
  const Icon = bonus.icon;
  
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      bonus.comingSoon ? "bg-slate-900/30 border-slate-800 opacity-50" :
      status === "active" ? "bg-gradient-to-br from-amber-900/30 to-slate-900 border-amber-500/50" :
      status === "partial" ? "bg-slate-800/50 border-slate-600" :
      "bg-slate-900/50 border-slate-700"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          bonus.comingSoon ? "bg-slate-800 text-slate-600" :
          status === "active" ? "bg-amber-500/20 text-amber-400" :
          "bg-slate-800 text-slate-500"
        )}>
          {bonus.comingSoon ? <Lock className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white text-sm">{bonus.title}</h4>
          {bonus.comingSoon ? (
            <Badge variant="outline" className="text-[10px] mt-1 border-slate-700 text-slate-500">
              Coming Soon
            </Badge>
          ) : (
            <p className="text-xs text-slate-400">Progress: {enabledCount} / {bonus.requirements.length}</p>
          )}
        </div>
      </div>
      
      {!bonus.comingSoon && (
        <div className="space-y-2 mb-3">
          {bonus.requirements.map((reqId) => {
            const reqCrew = getCrewMember(reqId);
            const isEnabled = enabledAgents.includes(reqId);
            return (
              <button
                key={reqId}
                onClick={() => !isEnabled && onRequirementClick(reqId)}
                className={cn(
                  "flex items-center gap-2 text-xs w-full text-left",
                  isEnabled ? "text-slate-300" : "text-slate-500 hover:text-slate-300 cursor-pointer"
                )}
                disabled={isEnabled}
                data-testid={`bonus-requirement-${reqId}`}
              >
                {isEnabled ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <div className="w-3 h-3 rounded-sm border border-slate-600" />
                )}
                {reqCrew.nickname}
              </button>
            );
          })}
        </div>
      )}
      
      <p className="text-xs text-slate-400 italic">{bonus.value}</p>
    </div>
  );
}

export default function MyCrew() {
  const queryClient = useQueryClient();
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [drawerAgentId, setDrawerAgentId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: crewState } = useQuery<CrewStateResponse>({
    queryKey: ["/api/crew/state"],
    queryFn: async () => {
      const res = await fetch("/api/crew/state?siteId=default");
      if (!res.ok) throw new Error("Failed to fetch crew state");
      return res.json();
    },
  });

  const enableMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await fetch("/api/crew/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, siteId: "default" }),
      });
      if (!res.ok) throw new Error("Failed to enable agent");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crew/state"] });
      setDrawerOpen(false);
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await fetch("/api/crew/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, siteId: "default" }),
      });
      if (!res.ok) throw new Error("Failed to disable agent");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crew/state"] });
      setDrawerOpen(false);
    },
  });

  const enabledAgents = crewState?.enabledAgents || [];
  const totalRoles = CREW_ROLES.length;

  const handleSlotClick = (agentId: string) => {
    setDrawerAgentId(agentId);
    setDrawerOpen(true);
  };

  const handleSelect = () => {
    if (!drawerAgentId) return;
    setSelectedAgents(prev => 
      prev.includes(drawerAgentId) 
        ? prev.filter(id => id !== drawerAgentId)
        : [...prev, drawerAgentId]
    );
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 -m-6 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">My Crew</h1>
          <p className="text-slate-400">Staff AI specialists to unlock deeper insights.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr] mb-10">
          <StatusCard 
            enabledCount={enabledAgents.length}
            totalRoles={totalRoles}
            enabledAgents={enabledAgents}
          />
          
          <ShipCanvas 
            enabledAgents={enabledAgents}
            selectedAgents={selectedAgents}
            onSlotClick={handleSlotClick}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <CardTitle className="text-white text-lg">Active Capabilities</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {CAPABILITY_GROUPS.map(group => (
                <CapabilityCard key={group.id} group={group} enabledAgents={enabledAgents} />
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <CardTitle className="text-white text-lg">Set Bonuses</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {SET_BONUSES.map(bonus => (
                <SetBonusCard 
                  key={bonus.id} 
                  bonus={bonus} 
                  enabledAgents={enabledAgents}
                  onRequirementClick={handleSlotClick}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <RoleDrawer
          agentId={drawerAgentId}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          isEnabled={drawerAgentId ? enabledAgents.includes(drawerAgentId) : false}
          isSelected={drawerAgentId ? selectedAgents.includes(drawerAgentId) : false}
          onSelect={handleSelect}
          onEnable={() => drawerAgentId && enableMutation.mutate(drawerAgentId)}
          onDisable={() => drawerAgentId && disableMutation.mutate(drawerAgentId)}
        />
      </div>
    </DashboardLayout>
  );
}
