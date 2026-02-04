import { QueryClient, QueryFunction, keepPreviousData } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      placeholderData: keepPreviousData,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function prefetchQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  staleTime?: number
) {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: staleTime ?? 60 * 1000,
  });
}

export function prefetchCrewStatus(siteId: string, crewId: string) {
  const url = `/api/sites/${encodeURIComponent(siteId)}/crew-status/${encodeURIComponent(crewId)}?timeWindowDays=7`;
  return prefetchQuery(
    ["/api/sites", siteId, "crew-status", crewId, { timeWindowDays: 7 }],
    async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    }
  );
}

export function prefetchMissionsDashboard(siteId?: string) {
  const url = siteId
    ? `/api/missions/dashboard?siteId=${encodeURIComponent(siteId)}`
    : "/api/missions/dashboard";
  const queryKey = siteId
    ? ["/api/missions/dashboard", { siteId }]
    : ["/api/missions/dashboard"];
  return prefetchQuery(queryKey, async () => {
    const res = await apiRequest("GET", url);
    return res.json();
  });
}

export function prefetchDashboardStats() {
  return prefetchQuery(["/api/dashboard/stats"], async () => {
    const res = await apiRequest("GET", "/api/dashboard/stats");
    return res.json();
  });
}

export function prefetchBenchmarks() {
  return prefetchQuery(["/api/benchmarks/compare"], async () => {
    const res = await apiRequest("GET", "/api/benchmarks/compare");
    return res.json();
  });
}

// Leads prefetching with longer stale time for analytics
export function prefetchLeads(siteId: string) {
  const url = `/api/leads?siteId=${encodeURIComponent(siteId)}&limit=50`;
  return prefetchQuery(
    ["leads", siteId, {}],
    async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
    5 * 60 * 1000 // 5 min stale time
  );
}

export function prefetchLeadStats(siteId: string) {
  const url = `/api/leads/stats?siteId=${encodeURIComponent(siteId)}`;
  return prefetchQuery(
    ["leads-stats", siteId],
    async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
    5 * 60 * 1000 // 5 min stale time
  );
}

export function prefetchLeadAnalytics(siteId: string) {
  const url = `/api/leads/analytics?siteId=${encodeURIComponent(siteId)}&months=12`;
  return prefetchQuery(
    ["leads-analytics", siteId],
    async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
    10 * 60 * 1000 // 10 min stale time for analytics
  );
}
