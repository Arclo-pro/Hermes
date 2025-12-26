export type CrewEventLevel = "success" | "warning" | "error" | "info";

export interface CrewEvent {
  id: string;
  timestamp: Date;
  service_id: string;
  action: string;
  summary: string;
  level: CrewEventLevel;
}

const MAX_EVENTS = 100;
let crewEvents: CrewEvent[] = [];

export function addCrewEvent(event: Omit<CrewEvent, "id" | "timestamp">): CrewEvent {
  const newEvent: CrewEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
  };
  
  crewEvents = [newEvent, ...crewEvents].slice(0, MAX_EVENTS);
  
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("crew-event", { detail: newEvent }));
  }
  
  return newEvent;
}

export function getCrewEvents(limit?: number): CrewEvent[] {
  if (limit) {
    return crewEvents.slice(0, limit);
  }
  return [...crewEvents];
}

export function clearCrewEvents(): void {
  crewEvents = [];
}

export function seedDemoEvents(): void {
  const demoEvents: Omit<CrewEvent, "id" | "timestamp">[] = [
    { service_id: "seo_kbase", action: "write", summary: "Updated 3 knowledge articles", level: "success" },
    { service_id: "google_data_connector", action: "fetch", summary: "Fetched 7 days of GA4 data", level: "success" },
    { service_id: "crawl_render", action: "crawl", summary: "Crawled 142 pages", level: "success" },
    { service_id: "serp_intel", action: "scan", summary: "Tracked 25 keywords", level: "success" },
    { service_id: "core_web_vitals", action: "check", summary: "LCP regression detected", level: "warning" },
    { service_id: "content_qa", action: "audit", summary: "Found 2 policy violations", level: "warning" },
    { service_id: "backlink_authority", action: "monitor", summary: "5 new backlinks discovered", level: "success" },
    { service_id: "notifications", action: "send", summary: "Sent daily digest to 3 recipients", level: "success" },
  ];
  
  demoEvents.forEach((evt, i) => {
    setTimeout(() => addCrewEvent(evt), i * 100);
  });
}
