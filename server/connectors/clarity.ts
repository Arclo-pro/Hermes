import { logger } from "../utils/logger";

export interface ClaritySession {
  sessionId: string;
  recordingUrl: string;
  duration: number;
  pagesViewed: number;
  timestamp: string;
}

export interface ClarityHeatmap {
  pageUrl: string;
  clicks: number;
  scrollDepth: number;
  heatmapUrl: string;
}

export interface ClarityInsights {
  deadClicks: number;
  rageClicks: number;
  excessiveScrolling: number;
  quickbacks: number;
}

export class ClarityConnector {
  private projectId: string;
  private apiKey: string;

  constructor() {
    this.projectId = process.env.CLARITY_PROJECT_ID || '';
    this.apiKey = process.env.CLARITY_API_KEY || '';
    if (!this.projectId && !this.apiKey) {
      logger.warn('Clarity', 'CLARITY_PROJECT_ID or CLARITY_API_KEY not set');
    }
  }

  isConfigured(): boolean {
    return !!(this.projectId || this.apiKey);
  }

  async getTopSessions(limit: number = 10): Promise<ClaritySession[]> {
    if (!this.projectId) {
      logger.warn('Clarity', 'Clarity integration not configured');
      return [];
    }

    logger.info('Clarity', 'Clarity API access requires manual setup');
    return [];
  }

  async getHeatmaps(pageUrl?: string): Promise<ClarityHeatmap[]> {
    if (!this.projectId) {
      return [];
    }

    logger.info('Clarity', 'Heatmap data requires Clarity dashboard access');
    return [];
  }

  async getInsights(): Promise<ClarityInsights | null> {
    if (!this.projectId) {
      return null;
    }

    logger.info('Clarity', 'Insights require Clarity dashboard access');
    return null;
  }

  getClarityDashboardUrl(): string {
    if (!this.projectId) {
      return 'https://clarity.microsoft.com/';
    }
    return `https://clarity.microsoft.com/projects/${this.projectId}/dashboard`;
  }

  getRecordingsUrl(): string {
    if (!this.projectId) {
      return 'https://clarity.microsoft.com/';
    }
    return `https://clarity.microsoft.com/projects/${this.projectId}/recordings`;
  }

  getHeatmapsUrl(): string {
    if (!this.projectId) {
      return 'https://clarity.microsoft.com/';
    }
    return `https://clarity.microsoft.com/projects/${this.projectId}/heatmaps`;
  }

  generateEvidenceLinks(): { label: string; url: string }[] {
    return [
      { label: 'Clarity Dashboard', url: this.getClarityDashboardUrl() },
      { label: 'Session Recordings', url: this.getRecordingsUrl() },
      { label: 'Heatmaps', url: this.getHeatmapsUrl() },
    ];
  }
}

export const clarityConnector = new ClarityConnector();
