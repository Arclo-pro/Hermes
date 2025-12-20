export interface PageMeta {
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  h1?: string;
  ogTitle?: string;
  ogDescription?: string;
}

export interface IndexingSignals {
  url: string;
  isIndexed: boolean;
  robotsBlocked: boolean;
  noindex: boolean;
  canonical?: string;
  lastCrawled?: Date;
}

export interface WebsiteCapabilities {
  canReadMeta: boolean;
  canWriteMeta: boolean;
  canEditContent: boolean;
  canTriggerRecrawl: boolean;
  canCreatePR: boolean;
}

export interface WebsiteConnector {
  siteId: string;
  baseUrl: string;
  
  getCapabilities(): WebsiteCapabilities;
  
  fetchPageMeta(url: string): Promise<PageMeta>;
  fetchIndexingSignals(url: string): Promise<IndexingSignals>;
  
  updatePageMeta?(url: string, meta: Partial<PageMeta>): Promise<{ success: boolean; error?: string }>;
  triggerRecrawl?(urls: string[]): Promise<{ success: boolean; error?: string }>;
  createPR?(changes: { file: string; content: string }[]): Promise<{ success: boolean; prUrl?: string; error?: string }>;
}

export class GenericWebsiteConnector implements WebsiteConnector {
  constructor(
    public siteId: string,
    public baseUrl: string
  ) {}

  getCapabilities(): WebsiteCapabilities {
    return {
      canReadMeta: true,
      canWriteMeta: false,
      canEditContent: false,
      canTriggerRecrawl: false,
      canCreatePR: false,
    };
  }

  async fetchPageMeta(url: string): Promise<PageMeta> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SEO-Doctor-Bot/1.0',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) 
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
      const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
      const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i);
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

      return {
        url,
        title: titleMatch?.[1]?.trim() || '',
        description: descMatch?.[1]?.trim() || '',
        canonical: canonicalMatch?.[1]?.trim(),
        robots: robotsMatch?.[1]?.trim(),
        h1: h1Match?.[1]?.trim(),
        ogTitle: ogTitleMatch?.[1]?.trim(),
        ogDescription: ogDescMatch?.[1]?.trim(),
      };
    } catch (error: any) {
      return {
        url,
        title: '',
        description: '',
      };
    }
  }

  async fetchIndexingSignals(url: string): Promise<IndexingSignals> {
    const meta = await this.fetchPageMeta(url);
    const robotsContent = meta.robots?.toLowerCase() || '';
    
    return {
      url,
      isIndexed: !robotsContent.includes('noindex'),
      robotsBlocked: false,
      noindex: robotsContent.includes('noindex'),
      canonical: meta.canonical,
    };
  }
}

const connectorRegistry = new Map<string, WebsiteConnector>();

export function getConnector(siteId: string, baseUrl: string): WebsiteConnector {
  if (!connectorRegistry.has(siteId)) {
    connectorRegistry.set(siteId, new GenericWebsiteConnector(siteId, baseUrl));
  }
  return connectorRegistry.get(siteId)!;
}
