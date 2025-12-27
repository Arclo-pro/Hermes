import { useState, useEffect } from "react";
import { getCrewEvents, type CrewEvent } from "@/lib/crewEvents";
import { getCrewMember } from "@/config/agents";
import { CrewBadge } from "./CrewBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CrewFeedProps {
  limit?: number;
  compact?: boolean;
  className?: string;
}

const LEVEL_STYLES: Record<string, string> = {
  success: "border-l-green-500",
  warning: "border-l-yellow-500",
  error: "border-l-red-500",
  info: "border-l-blue-500",
};

export function CrewFeed({ limit = 10, compact = false, className }: CrewFeedProps) {
  const [events, setEvents] = useState<CrewEvent[]>([]);

  useEffect(() => {
    setEvents(getCrewEvents(limit));
    
    const handleNewEvent = () => {
      setEvents(getCrewEvents(limit));
    };
    
    window.addEventListener("crew-event", handleNewEvent);
    return () => window.removeEventListener("crew-event", handleNewEvent);
  }, [limit]);

  if (events.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Crew Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn("space-y-2", className)} data-testid="crew-feed-compact">
        {events.map((event) => {
          const crew = getCrewMember(event.service_id);
          return (
            <div
              key={event.id}
              className={cn(
                "flex items-center gap-2 py-1 px-2 rounded border-l-2",
                LEVEL_STYLES[event.level] || "border-l-gray-300"
              )}
            >
              <CrewBadge serviceId={event.service_id} size="sm" />
              <span className="text-sm font-medium" style={{ color: crew.color }}>
                {crew.nickname}
              </span>
              <span className="text-sm text-muted-foreground truncate flex-1">
                {event.summary}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(event.timestamp, { addSuffix: true })}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card className={className} data-testid="crew-feed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Crew Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {events.map((event) => {
              const crew = getCrewMember(event.service_id);
              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-start gap-3 p-2 rounded-lg border-l-4 bg-muted/30",
                    LEVEL_STYLES[event.level] || "border-l-gray-300"
                  )}
                >
                  <CrewBadge serviceId={event.service_id} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm" style={{ color: crew.color }}>
                        {crew.nickname}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {crew.role}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-0.5">{event.summary}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
