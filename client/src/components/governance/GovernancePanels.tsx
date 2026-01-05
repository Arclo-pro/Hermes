import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Play,
  Shield
} from "lucide-react";
import { useChanges, useDeployWindows, useCadenceSettings } from "@/hooks/useGovernance";
import { useSiteContext } from "@/hooks/useSiteContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import type { Change, DeployWindow } from "@shared/schema";

type ChangeStatus = 'proposed' | 'queued' | 'applied' | 'rolled_back' | 'skipped';

function getStatusBadgeVariant(status: ChangeStatus) {
  switch (status) {
    case 'applied':
      return 'success';
    case 'queued':
      return 'info';
    case 'proposed':
      return 'warning';
    case 'skipped':
      return 'danger';
    case 'rolled_back':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function StatusIcon({ status }: { status: ChangeStatus }) {
  switch (status) {
    case 'applied':
      return <CheckCircle2 className="w-3.5 h-3.5 text-semantic-success" />;
    case 'queued':
      return <Clock className="w-3.5 h-3.5 text-semantic-info" />;
    case 'proposed':
      return <Loader2 className="w-3.5 h-3.5 text-semantic-warning" />;
    case 'skipped':
      return <AlertTriangle className="w-3.5 h-3.5 text-semantic-danger" />;
    case 'rolled_back':
      return <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />;
    default:
      return null;
  }
}

function ChangeItem({ change, expanded = false }: { change: Change; expanded?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const status = change.status as ChangeStatus;
  
  return (
    <div 
      className="p-3 rounded-lg bg-card/50 border border-border/50 hover:border-border transition-colors"
      data-testid={`change-item-${change.changeId}`}
    >
      <div 
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid={`change-toggle-${change.changeId}`}
      >
        <StatusIcon status={status} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{change.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={getStatusBadgeVariant(status)} className="text-xs capitalize">
              {status.replace('_', ' ')}
            </Badge>
            <span className="text-xs text-muted-foreground">{change.agentId}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(change.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform",
          isExpanded && "rotate-180"
        )} />
      </div>
      
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border/50 text-xs space-y-1.5">
          {change.reason && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Reason:</span> {change.reason}
            </p>
          )}
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Type:</span> {change.changeType} / {change.scope}
          </p>
          {change.riskLevel && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Risk:</span> {change.riskLevel}
            </p>
          )}
          {change.skipReason && (
            <p className="text-semantic-danger">
              <span className="font-medium">Skip Reason:</span> {change.skipReason}
            </p>
          )}
          {change.cadenceBlockReason && (
            <p className="text-semantic-warning">
              <span className="font-medium">Cadence Block:</span> {change.cadenceBlockReason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function RecentChangesPanel() {
  const { selectedSite } = useSiteContext();
  const websiteId = selectedSite?.siteId;
  
  const { data: changes = [], isLoading } = useChanges(websiteId, { limit: 10 });
  
  const recentChanges = changes.filter(
    c => c.status === 'applied' || c.status === 'queued'
  );
  
  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border rounded-xl" data-testid="recent-changes-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border rounded-xl" data-testid="recent-changes-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Changes
          </CardTitle>
          {recentChanges.length > 0 && (
            <Badge variant="neutral" className="text-xs">{recentChanges.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recentChanges.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent changes applied or queued.
          </p>
        ) : (
          <div className="space-y-2">
            {recentChanges.map((change) => (
              <ChangeItem key={change.changeId} change={change} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function UpcomingDeployWindow() {
  const { selectedSite } = useSiteContext();
  const websiteId = selectedSite?.siteId;
  
  const { data: windows = [], isLoading } = useDeployWindows(websiteId, { status: 'scheduled' });
  const { data: allChanges = [] } = useChanges(websiteId, { status: 'queued', limit: 50 });
  
  const nextWindow = windows.length > 0 ? windows[0] : null;
  
  const queuedChanges = nextWindow
    ? allChanges.filter(c => c.deployWindowId === nextWindow.deployWindowId)
    : [];
  
  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border rounded-xl" data-testid="upcoming-deploy-window">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Next Deploy Window
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!nextWindow) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border rounded-xl" data-testid="upcoming-deploy-window">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Next Deploy Window
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No deploy window scheduled.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border rounded-xl" data-testid="upcoming-deploy-window">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Next Deploy Window
          </CardTitle>
          <Badge variant="info" className="text-xs">
            {format(new Date(nextWindow.scheduledFor), 'MMM d, h:mm a')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextWindow.theme && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{nextWindow.theme}</span>
          </div>
        )}
        
        {queuedChanges.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              {queuedChanges.length} change{queuedChanges.length !== 1 ? 's' : ''} queued
            </p>
            {queuedChanges.slice(0, 3).map((change) => (
              <div 
                key={change.changeId}
                className="text-sm text-muted-foreground flex items-center gap-2"
              >
                <ChevronRight className="w-3 h-3" />
                <span className="truncate">{change.description}</span>
              </div>
            ))}
            {queuedChanges.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{queuedChanges.length - 3} more
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No changes queued for this window.</p>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          disabled
          data-testid="button-execute-deploy"
        >
          <Play className="w-3.5 h-3.5 mr-1.5" />
          Execute (Manual Trigger)
        </Button>
      </CardContent>
    </Card>
  );
}

export function SkippedChangesPanel() {
  const { selectedSite } = useSiteContext();
  const websiteId = selectedSite?.siteId;
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: changes = [], isLoading } = useChanges(websiteId, { status: 'skipped', limit: 20 });
  
  if (isLoading) {
    return null;
  }
  
  if (changes.length === 0) {
    return null;
  }
  
  const showCollapsible = changes.length > 5;
  const visibleChanges = showCollapsible && !isOpen ? changes.slice(0, 5) : changes;
  
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-semantic-danger-border/50 rounded-xl" data-testid="skipped-changes-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-semantic-danger">
            <AlertTriangle className="w-4 h-4" />
            Skipped Changes
          </CardTitle>
          <Badge variant="danger" className="text-xs">{changes.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="space-y-2">
            {visibleChanges.map((change) => (
              <div 
                key={change.changeId}
                className="p-3 rounded-lg bg-semantic-danger-soft/30 border border-semantic-danger-border/30"
                data-testid={`skipped-change-${change.changeId}`}
              >
                <p className="text-sm font-medium text-foreground">{change.description}</p>
                {change.cadenceBlockReason && (
                  <p className="text-xs text-semantic-danger mt-1">
                    {change.cadenceBlockReason}
                  </p>
                )}
                {change.skipReason && !change.cadenceBlockReason && (
                  <p className="text-xs text-semantic-danger mt-1">
                    {change.skipReason}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {change.agentId} • {formatDistanceToNow(new Date(change.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
          
          {showCollapsible && (
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-2 text-xs"
                data-testid="button-toggle-skipped"
              >
                {isOpen ? 'Show Less' : `Show ${changes.length - 5} More`}
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 ml-1 transition-transform",
                  isOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
          )}
          <CollapsibleContent />
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function StabilizationStatus() {
  const { selectedSite } = useSiteContext();
  const websiteId = selectedSite?.siteId;
  
  const { data: settings, isLoading } = useCadenceSettings(websiteId);
  
  if (isLoading) {
    return null;
  }
  
  if (!settings?.stabilizationModeUntil) {
    return null;
  }
  
  const stabilizationDate = new Date(settings.stabilizationModeUntil);
  const isActive = stabilizationDate > new Date();
  
  if (!isActive) {
    return null;
  }
  
  return (
    <Card 
      className="bg-semantic-warning-soft border-semantic-warning-border rounded-xl" 
      data-testid="stabilization-status"
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-semantic-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-semantic-warning">
              Stabilization Mode Active
            </p>
            <p className="text-sm text-foreground mt-0.5">
              Until {format(stabilizationDate, 'MMMM d, yyyy h:mm a')}
              {settings.stabilizationReason && `: ${settings.stabilizationReason}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              New changes will be held until stabilization period ends.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function GovernancePanels() {
  return (
    <div className="space-y-4" data-testid="governance-panels">
      <h2 className="text-lg font-semibold text-foreground">Change Governance</h2>
      
      <StabilizationStatus />
      
      <div className="grid gap-4 md:grid-cols-2">
        <RecentChangesPanel />
        <UpcomingDeployWindow />
      </div>
      
      <SkippedChangesPanel />
    </div>
  );
}
