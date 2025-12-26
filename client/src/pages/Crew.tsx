import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CrewCard } from "@/components/crew/CrewCard";
import { CrewFeed } from "@/components/crew/CrewFeed";
import { CREW_MANIFEST, getCrewMember } from "@/config/crewManifest";
import { seedDemoEvents, getCrewEvents } from "@/lib/crewEvents";
import { useQuery } from "@tanstack/react-query";
import { Download, Users, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface SiteSummaryService {
  slug: string;
  displayName: string;
  category: string;
  runState: string;
  configState: string;
  buildState: string;
  lastRun: {
    finishedAt: string;
  } | null;
}

function mapRunStateToStatus(runState: string): "healthy" | "degraded" | "down" | "disabled" | "unknown" {
  switch (runState) {
    case "success":
      return "healthy";
    case "partial":
      return "degraded";
    case "failed":
      return "down";
    case "never_ran":
      return "unknown";
    default:
      return "unknown";
  }
}

export default function CrewPage() {
  const [hasSeedEvents, setHasSeedEvents] = useState(false);

  const { data: summaryData } = useQuery<{ services: SiteSummaryService[] }>({
    queryKey: ["/api/sites/site_empathy_health_clinic/integrations/summary"],
  });

  useEffect(() => {
    if (!hasSeedEvents && getCrewEvents().length === 0) {
      seedDemoEvents();
      setHasSeedEvents(true);
    }
  }, [hasSeedEvents]);

  const services = summaryData?.services || [];
  const allServiceIds = new Set([
    ...Object.keys(CREW_MANIFEST),
    ...services.map((s) => s.slug),
  ]);

  const crewMembers = Array.from(allServiceIds).map((serviceId) => {
    const service = services.find((s) => s.slug === serviceId);
    const crew = getCrewMember(serviceId);
    return {
      serviceId,
      crew,
      status: service ? mapRunStateToStatus(service.runState) : "unknown",
      lastCheckIn: service?.lastRun?.finishedAt
        ? new Date(service.lastRun.finishedAt).toLocaleString()
        : null,
      category: service?.category || "infrastructure",
    };
  });

  const categories = ["data", "analysis", "execution", "infrastructure"];
  const groupedMembers = categories.reduce((acc, cat) => {
    acc[cat] = crewMembers.filter((m) => m.category === cat);
    return acc;
  }, {} as Record<string, typeof crewMembers>);

  const handleExportJson = () => {
    const data = JSON.stringify(CREW_MANIFEST, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crew-manifest.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="crew-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Crew Manifest
            </h1>
            <p className="text-muted-foreground mt-1">
              Meet the explorers that power Hermes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportJson} data-testid="export-crew-json">
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {categories.map((category) => {
              const members = groupedMembers[category] || [];
              if (members.length === 0) return null;
              
              const categoryLabels: Record<string, string> = {
                data: "Data Sources",
                analysis: "Analysis Workers",
                execution: "Execution Workers",
                infrastructure: "Infrastructure",
              };

              return (
                <div key={category}>
                  <h2 className="text-lg font-semibold mb-3 capitalize">
                    {categoryLabels[category] || category}
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {members.map((member) => (
                      <CrewCard
                        key={member.serviceId}
                        serviceId={member.serviceId}
                        status={member.status}
                        lastCheckIn={member.lastCheckIn}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Crew Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Members</span>
                    <Badge variant="secondary">{crewMembers.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Healthy</span>
                    <Badge className="bg-green-100 text-green-700">
                      {crewMembers.filter((m) => m.status === "healthy").length}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Degraded</span>
                    <Badge className="bg-yellow-100 text-yellow-700">
                      {crewMembers.filter((m) => m.status === "degraded").length}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Down</span>
                    <Badge className="bg-red-100 text-red-700">
                      {crewMembers.filter((m) => m.status === "down").length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <CrewFeed limit={15} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
