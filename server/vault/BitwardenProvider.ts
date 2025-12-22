import { VaultProvider, VaultHealthStatus, VaultSecretMeta } from "./VaultProvider";
import { logger } from "../utils/logger";

const SECRET_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedSecret {
  value: string;
  expiresAt: number;
}

export type BitwardenStatusReason = 
  | "CONNECTED"
  | "MISSING_TOKEN"
  | "MISSING_PROJECT_ID"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PROJECT_NOT_FOUND"
  | "ZERO_SECRETS"
  | "API_ERROR"
  | "NETWORK_ERROR";

export interface BitwardenStatus {
  connected: boolean;
  reason: BitwardenStatusReason;
  httpStatus?: number;
  projectId: string | null;
  secretsFound: number;
  lastError: string | null;
  secretKeys?: string[];
}

export class BitwardenProvider implements VaultProvider {
  private accessToken: string;
  private projectId: string;
  private baseUrl: string;
  private secretCache: Map<string, CachedSecret> = new Map();

  constructor() {
    this.accessToken = process.env.BWS_ACCESS_TOKEN || process.env.BITWARDEN_ACCESS_TOKEN || '';
    this.projectId = process.env.BWS_PROJECT_ID || '';
    this.baseUrl = process.env.BWS_BASE_URL || process.env.BITWARDEN_API_URL || 'https://api.bitwarden.com';
  }

  isConfigured(): boolean {
    return !!this.accessToken;
  }

  hasProjectId(): boolean {
    return !!this.projectId;
  }

  getProjectId(): string | null {
    return this.projectId || null;
  }

  async getDetailedStatus(): Promise<BitwardenStatus> {
    // Check token
    if (!this.accessToken) {
      return {
        connected: false,
        reason: "MISSING_TOKEN",
        projectId: null,
        secretsFound: 0,
        lastError: "BWS_ACCESS_TOKEN not set in environment",
      };
    }

    // Check project ID
    if (!this.projectId) {
      return {
        connected: false,
        reason: "MISSING_PROJECT_ID",
        projectId: null,
        secretsFound: 0,
        lastError: "BWS_PROJECT_ID not set in environment. Add it to Replit Secrets.",
      };
    }

    try {
      // Try to list secrets - this validates both token and project access
      const url = `${this.baseUrl}/secrets?projectId=${this.projectId}`;
      logger.info("Vault", `Checking Bitwarden status: ${url.replace(this.projectId, '***')}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.warn("Vault", `Bitwarden API error: ${response.status}`, { error: errorText });

        if (response.status === 401) {
          return {
            connected: false,
            reason: "UNAUTHORIZED",
            httpStatus: 401,
            projectId: this.projectId,
            secretsFound: 0,
            lastError: "Token invalid or expired. Rotate BWS_ACCESS_TOKEN.",
          };
        }

        if (response.status === 403) {
          return {
            connected: false,
            reason: "FORBIDDEN",
            httpStatus: 403,
            projectId: this.projectId,
            secretsFound: 0,
            lastError: "Machine account doesn't have access to this project.",
          };
        }

        if (response.status === 404) {
          return {
            connected: false,
            reason: "PROJECT_NOT_FOUND",
            httpStatus: 404,
            projectId: this.projectId,
            secretsFound: 0,
            lastError: "Project ID is wrong or project doesn't exist.",
          };
        }

        return {
          connected: false,
          reason: "API_ERROR",
          httpStatus: response.status,
          projectId: this.projectId,
          secretsFound: 0,
          lastError: `Bitwarden API returned ${response.status}: ${errorText.slice(0, 100)}`,
        };
      }

      const data = await response.json();
      // Handle various Bitwarden response formats: { data: { items: [...] } }, { data: [...] }, { secrets: [...] }, or [...]
      let secretsList: any[] = [];
      if (data?.data?.items && Array.isArray(data.data.items)) {
        secretsList = data.data.items;
      } else if (data?.data && Array.isArray(data.data)) {
        secretsList = data.data;
      } else if (data?.secrets && Array.isArray(data.secrets)) {
        secretsList = data.secrets;
      } else if (Array.isArray(data)) {
        secretsList = data;
      }
      
      const secretKeys = secretsList.map((s: any) => s.key || s.name || 'Unknown');
      logger.info("Vault", `Parsed ${secretsList.length} secrets from Bitwarden response`);

      if (secretsList.length === 0) {
        return {
          connected: true,
          reason: "ZERO_SECRETS",
          httpStatus: 200,
          projectId: this.projectId,
          secretsFound: 0,
          lastError: "Connected, but no secrets found in this project.",
          secretKeys: [],
        };
      }

      return {
        connected: true,
        reason: "CONNECTED",
        httpStatus: 200,
        projectId: this.projectId,
        secretsFound: secretsList.length,
        lastError: null,
        secretKeys,
      };
    } catch (error: any) {
      logger.error("Vault", "Bitwarden network error", { error: error.message });
      return {
        connected: false,
        reason: "NETWORK_ERROR",
        projectId: this.projectId,
        secretsFound: 0,
        lastError: `Network error: ${error.message}`,
      };
    }
  }

  async getSecret(secretId: string): Promise<string | null> {
    if (!this.accessToken) {
      logger.warn('Vault', 'Bitwarden access token not configured');
      return null;
    }

    const cached = this.secretCache.get(secretId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const response = await fetch(`${this.baseUrl}/secrets/${secretId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          logger.warn('Vault', `Secret not found: ${secretId}`);
          return null;
        }
        throw new Error(`Bitwarden API error: ${response.status}`);
      }

      const data = await response.json();
      const value = data.value || data.secret || '';

      this.secretCache.set(secretId, {
        value,
        expiresAt: Date.now() + SECRET_CACHE_TTL_MS,
      });

      logger.info('Vault', `Retrieved secret: ${this.maskId(secretId)}`);
      return value;
    } catch (error: any) {
      logger.error('Vault', `Failed to retrieve secret: ${this.maskId(secretId)}`, { 
        error: error.message 
      });
      return null;
    }
  }

  async getSecrets(secretIds: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    for (const id of secretIds) {
      const value = await this.getSecret(id);
      if (value) {
        results.set(id, value);
      }
    }
    
    return results;
  }

  async healthCheck(): Promise<VaultHealthStatus> {
    const status = await this.getDetailedStatus();
    
    return {
      connected: status.connected,
      provider: 'bitwarden',
      lastCheck: new Date(),
      error: status.lastError || undefined,
      // Extended info
      reason: status.reason,
      projectId: status.projectId,
      secretsFound: status.secretsFound,
    } as VaultHealthStatus;
  }

  async listSecrets(): Promise<VaultSecretMeta[]> {
    if (!this.accessToken) {
      return [];
    }

    try {
      // Build URL with project filter if available
      let url = `${this.baseUrl}/secrets`;
      if (this.projectId) {
        url += `?projectId=${this.projectId}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        logger.warn('Vault', `Failed to list secrets: ${response.status}`);
        return [];
      }

      const data = await response.json();
      // Handle various Bitwarden response formats
      let secretsList: any[] = [];
      if (data?.data?.items && Array.isArray(data.data.items)) {
        secretsList = data.data.items;
      } else if (data?.data && Array.isArray(data.data)) {
        secretsList = data.data;
      } else if (data?.secrets && Array.isArray(data.secrets)) {
        secretsList = data.secrets;
      } else if (Array.isArray(data)) {
        secretsList = data;
      }

      return secretsList.map((s: any) => ({
        id: s.id,
        key: s.key || s.name || 'Unknown',
        maskedValue: this.maskValue(s.value),
        createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
      }));
    } catch (error: any) {
      logger.error('Vault', 'Failed to list secrets', { error: error.message });
      return [];
    }
  }

  private maskId(id: string): string {
    if (id.length <= 8) return '****';
    return `...${id.slice(-4)}`;
  }

  private maskValue(value?: string): string {
    if (!value || value.length < 4) return '****';
    return `****${value.slice(-4)}`;
  }

  clearCache(): void {
    this.secretCache.clear();
  }
}

export const bitwardenProvider = new BitwardenProvider();
