import { useQuery } from "@tanstack/react-query";
import type { Change, DeployWindow, WebsiteCadenceSettings } from "@shared/schema";

interface UseChangesOptions {
  limit?: number;
  status?: 'proposed' | 'queued' | 'applied' | 'rolled_back' | 'skipped';
}

interface UseDeployWindowsOptions {
  status?: 'scheduled' | 'executed' | 'rolled_back' | 'canceled';
}

export function useChanges(websiteId: string | undefined, options: UseChangesOptions = {}) {
  const { limit = 20, status } = options;
  
  return useQuery<Change[]>({
    queryKey: ['governance', 'changes', websiteId, { limit, status }],
    queryFn: async () => {
      if (!websiteId) return [];
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (status) params.set('status', status);
      
      const res = await fetch(`/api/websites/${websiteId}/changes?${params}`);
      if (!res.ok) throw new Error('Failed to fetch changes');
      return res.json();
    },
    enabled: !!websiteId,
    staleTime: 30000,
  });
}

export function useDeployWindows(websiteId: string | undefined, options: UseDeployWindowsOptions = {}) {
  const { status } = options;
  
  return useQuery<DeployWindow[]>({
    queryKey: ['governance', 'deploy-windows', websiteId, { status }],
    queryFn: async () => {
      if (!websiteId) return [];
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      
      const res = await fetch(`/api/websites/${websiteId}/deploy-windows?${params}`);
      if (!res.ok) throw new Error('Failed to fetch deploy windows');
      return res.json();
    },
    enabled: !!websiteId,
    staleTime: 30000,
  });
}

export function useCadenceSettings(websiteId: string | undefined) {
  return useQuery<WebsiteCadenceSettings>({
    queryKey: ['governance', 'cadence-settings', websiteId],
    queryFn: async () => {
      if (!websiteId) return null;
      const res = await fetch(`/api/websites/${websiteId}/cadence-settings`);
      if (!res.ok) throw new Error('Failed to fetch cadence settings');
      return res.json();
    },
    enabled: !!websiteId,
    staleTime: 60000,
  });
}
