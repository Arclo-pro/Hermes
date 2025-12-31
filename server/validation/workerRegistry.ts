import { ServiceSecretMapping, getWorkerServices } from "@shared/serviceSecretMap";

export interface WorkerRegistryEntry {
  serviceSlug: string;
  displayName: string;
  category: "google" | "analysis" | "content" | "infrastructure" | "execution";
  endpoints: {
    health: string;
    smokeTest: string;
    capabilities?: string;
    run?: string;
  };
  requiresAuth: boolean;
  expectedCapabilities?: string[];
  crew?: "Dev" | "SEO" | "Ads" | "Content";
}

function mapToCrewAssignment(mapping: ServiceSecretMapping): "Dev" | "SEO" | "Ads" | "Content" | undefined {
  switch (mapping.category) {
    case "infrastructure":
    case "execution":
      return "Dev";
    case "analysis":
      return "SEO";
    case "content":
      return "Content";
    case "google":
      return mapping.serviceSlug.includes("ads") ? "Ads" : "SEO";
    default:
      return undefined;
  }
}

export function getWorkerRegistry(): WorkerRegistryEntry[] {
  const workers = getWorkerServices();
  
  return workers.map((mapping): WorkerRegistryEntry => {
    const endpoints = mapping.workerEndpoints || {};
    
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      category: mapping.category,
      endpoints: {
        health: endpoints.health || "/health",
        smokeTest: endpoints.smokeTest || endpoints.health || "/health",
        capabilities: endpoints.capabilities,
        run: endpoints.run,
      },
      requiresAuth: true,
      crew: mapToCrewAssignment(mapping),
    };
  });
}

export function getWorkerBySlug(slug: string): WorkerRegistryEntry | undefined {
  return getWorkerRegistry().find(w => w.serviceSlug === slug);
}

export function getWorkerSlugs(): string[] {
  return getWorkerRegistry().map(w => w.serviceSlug);
}

export function getWorkersByCategory(category: string): WorkerRegistryEntry[] {
  return getWorkerRegistry().filter(w => w.category === category);
}

export function getWorkersByCrew(crew: string): WorkerRegistryEntry[] {
  return getWorkerRegistry().filter(w => w.crew === crew);
}
