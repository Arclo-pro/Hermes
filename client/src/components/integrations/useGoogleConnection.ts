import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GA4Account {
  accountId: string;
  displayName: string;
}

export interface GA4Property {
  propertyId: string;
  displayName: string;
  accountId?: string;
}

export interface GA4Stream {
  streamId: string;
  streamName: string;
  measurementId: string | null;
}

export interface GSCProperty {
  siteUrl: string;
  permissionLevel: string;
}

export interface GoogleConnectionStatus {
  connected: boolean;
  googleEmail?: string;
  connectedAt?: string;
  integrationStatus: "disconnected" | "connected" | "error";
  lastVerifiedAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  ga4: { propertyId: string; streamId?: string } | null;
  gsc: { siteUrl: string } | null;
  ads: { customerId: string; loginCustomerId?: string } | null;
}

export interface GoogleAccounts {
  accounts: GA4Account[];
  error?: string | null;
}

export interface GoogleProperties {
  ga4: GA4Property[];
  gsc: GSCProperty[];
}

export interface VerifyResult {
  ok: boolean;
  sampleMetrics?: {
    sessions: number;
    users: number;
    landingPages: Array<{ page: string; sessions: number; users: number }>;
    dateRange: { start: string; end: string };
  };
  error?: string;
  errorCode?: string;
  troubleshooting?: string[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGoogleConnection(siteId: string | null) {
  const queryClient = useQueryClient();
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Status query ──────────────────────────────────────────────────────
  const {
    data: status,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useQuery<GoogleConnectionStatus>({
    queryKey: ["google-connection-status", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/google/status`);
      if (!res.ok) throw new Error("Failed to fetch Google status");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to fetch status");
      return data as GoogleConnectionStatus;
    },
    enabled: !!siteId,
    staleTime: 30_000,
  });

  // ── Accounts query (manual trigger) ──────────────────────────────────
  const {
    data: accounts,
    isLoading: isLoadingAccounts,
    refetch: fetchAccounts,
  } = useQuery<GA4Account[]>({
    queryKey: ["google-accounts", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/google/accounts`);
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to fetch accounts");
      // Surface API-level errors (e.g. Admin API not enabled) even when ok:true
      if (data.error) {
        setAccountsError(data.error);
      } else {
        setAccountsError(null);
      }
      return data.accounts || [];
    },
    enabled: false, // Only fetch on demand
  });

  // ── Properties query (manual trigger, can filter by account) ──────────
  const {
    data: properties,
    isLoading: isLoadingProperties,
    refetch: refetchProperties,
  } = useQuery<GoogleProperties>({
    queryKey: ["google-properties", siteId, selectedAccountId],
    queryFn: async () => {
      const url = selectedAccountId
        ? `/api/sites/${siteId}/google/properties?accountId=${selectedAccountId}`
        : `/api/sites/${siteId}/google/properties`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch properties");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to fetch properties");
      return { ga4: data.ga4 || [], gsc: data.gsc || [] };
    },
    enabled: false, // Only fetch on demand
  });

  // Fetch properties for a specific account
  const fetchPropertiesForAccount = useCallback(async (accountId: string) => {
    setSelectedAccountId(accountId);
    // Small delay to allow the query key to update
    await new Promise(resolve => setTimeout(resolve, 10));
    return refetchProperties();
  }, [refetchProperties]);

  // Fetch all properties (no account filter)
  const fetchProperties = useCallback(async () => {
    setSelectedAccountId(null);
    await new Promise(resolve => setTimeout(resolve, 10));
    return refetchProperties();
  }, [refetchProperties]);

  // ── Streams query (manual trigger, depends on property selection) ─────
  const {
    data: streams,
    isLoading: isLoadingStreams,
    refetch: refetchStreams,
  } = useQuery<GA4Stream[]>({
    queryKey: ["google-streams", siteId, selectedPropertyId],
    queryFn: async () => {
      if (!selectedPropertyId) return [];
      const res = await fetch(`/api/sites/${siteId}/google/streams?propertyId=${selectedPropertyId}`);
      if (!res.ok) throw new Error("Failed to fetch streams");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to fetch streams");
      return data.streams || [];
    },
    enabled: false, // Only fetch on demand
  });

  // Fetch streams when a property is selected
  const fetchStreams = useCallback(async (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    // Small delay to allow the query key to update
    await new Promise(resolve => setTimeout(resolve, 10));
    return refetchStreams();
  }, [refetchStreams]);

  // ── Save properties mutation ──────────────────────────────────────────
  const savePropertiesMutation = useMutation({
    mutationFn: async (selection: { ga4PropertyId?: string; ga4StreamId?: string; gscSiteUrl?: string }) => {
      const res = await fetch(`/api/sites/${siteId}/google/properties`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
      });
      if (!res.ok) throw new Error("Failed to save properties");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to save");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-connection-status", siteId] });
    },
  });

  // ── Verify GA4 connection mutation ────────────────────────────────────
  const verifyMutation = useMutation({
    mutationFn: async (): Promise<VerifyResult> => {
      const res = await fetch(`/api/sites/${siteId}/google/ga4/verify`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to verify GA4 connection");
      const data = await res.json();
      return data as VerifyResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-connection-status", siteId] });
      // Also invalidate dashboard metrics so they refresh
      queryClient.invalidateQueries({ queryKey: ["/api/ops-dashboard", siteId, "metrics"] });
    },
  });

  // ── Disconnect mutation ───────────────────────────────────────────────
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/google/disconnect`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-connection-status", siteId] });
      queryClient.invalidateQueries({ queryKey: ["google-properties", siteId] });
      queryClient.invalidateQueries({ queryKey: ["google-streams", siteId] });
      queryClient.invalidateQueries({ queryKey: ["/api/ops-dashboard", siteId, "metrics"] });
    },
  });

  // ── OAuth popup flow ──────────────────────────────────────────────────
  const startOAuth = useCallback(async (): Promise<boolean> => {
    if (!siteId) throw new Error("No site selected");

    setIsConnecting(true);

    try {
      // Get the auth URL from the backend
      const res = await fetch(`/api/sites/${siteId}/google/connect`, { method: "POST" });
      const data = await res.json();

      // Handle OAuth not configured error specifically
      if (!res.ok || !data.ok) {
        if (res.status === 503 || data.error?.includes("not configured")) {
          throw new Error("OAUTH_NOT_CONFIGURED");
        }
        throw new Error(data.error || "Failed to start OAuth");
      }

      if (!data.authUrl) throw new Error(data.error || "No auth URL returned");

      // Open popup
      const popup = window.open(
        data.authUrl,
        "google-oauth",
        "popup,width=600,height=700,left=200,top=100"
      );
      popupRef.current = popup;

      // Poll for connection status
      return new Promise<boolean>((resolve) => {
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes at 2s intervals

        pollRef.current = setInterval(async () => {
          attempts++;

          // Check if popup was closed by user
          if (popup && popup.closed) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setIsConnecting(false);

            // One final check — maybe they completed auth before closing
            try {
              const statusRes = await fetch(`/api/sites/${siteId}/google/status`);
              const statusData = await statusRes.json();
              if (statusData.connected) {
                queryClient.invalidateQueries({ queryKey: ["google-connection-status", siteId] });
                resolve(true);
                return;
              }
            } catch { /* ignore */ }
            resolve(false);
            return;
          }

          // Timeout
          if (attempts >= maxAttempts) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            if (popup && !popup.closed) popup.close();
            setIsConnecting(false);
            resolve(false);
            return;
          }

          // Poll status
          try {
            const statusRes = await fetch(`/api/sites/${siteId}/google/status`);
            const statusData = await statusRes.json();
            if (statusData.connected) {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              if (popup && !popup.closed) popup.close();
              setIsConnecting(false);
              queryClient.invalidateQueries({ queryKey: ["google-connection-status", siteId] });
              resolve(true);
            }
          } catch {
            // Ignore polling errors, will retry
          }
        }, 2000);
      });
    } catch (error) {
      setIsConnecting(false);
      throw error;
    }
  }, [siteId, queryClient]);

  return {
    // Status
    status: status ?? null,
    isLoadingStatus,
    refetchStatus,

    // OAuth
    startOAuth,
    isConnecting,

    // Accounts
    accounts: accounts ?? null,
    isLoadingAccounts,
    fetchAccounts,
    accountsError,

    // Properties
    properties: properties ?? null,
    isLoadingProperties,
    fetchProperties,
    fetchPropertiesForAccount,

    // Streams
    streams: streams ?? null,
    isLoadingStreams,
    fetchStreams,

    // Save
    saveProperties: savePropertiesMutation.mutateAsync,
    isSaving: savePropertiesMutation.isPending,

    // Verify
    verifyConnection: verifyMutation.mutateAsync,
    isVerifying: verifyMutation.isPending,
    verifyResult: verifyMutation.data ?? null,

    // Disconnect
    disconnect: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
  };
}
