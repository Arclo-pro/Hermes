import { logger } from "../utils/logger";
import { withRetry } from "../utils/retry";

export interface SerpResult {
  position: number;
  title: string;
  link: string;
  snippet?: string;
  displayedLink?: string;
}

export interface SerpResponse {
  query: string;
  location?: string;
  organicResults: SerpResult[];
  localPackResults?: any[];
  featuredSnippet?: any;
  relatedSearches?: string[];
  totalResults?: number;
}

export class SerpConnector {
  private apiKey: string;
  private baseUrl = 'https://serpapi.com/search.json';

  constructor() {
    this.apiKey = process.env.SERP_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('SERP', 'SERP_API_KEY not set');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async searchGoogle(query: string, options: {
    location?: string;
    device?: 'desktop' | 'mobile';
    num?: number;
  } = {}): Promise<SerpResponse> {
    if (!this.apiKey) {
      throw new Error('SERP_API_KEY environment variable is required');
    }

    const { location = 'Orlando, Florida', device = 'desktop', num = 20 } = options;

    logger.info('SERP', `Searching for: "${query}" in ${location}`);

    return withRetry(
      async () => {
        const params = new URLSearchParams({
          api_key: this.apiKey,
          engine: 'google',
          q: query,
          location,
          device,
          num: num.toString(),
        });

        const response = await fetch(`${this.baseUrl}?${params}`);
        
        if (!response.ok) {
          throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const organicResults: SerpResult[] = (data.organic_results || []).map((r: any, idx: number) => ({
          position: r.position || idx + 1,
          title: r.title || '',
          link: r.link || '',
          snippet: r.snippet || undefined,
          displayedLink: r.displayed_link || undefined,
        }));

        return {
          query,
          location,
          organicResults,
          localPackResults: data.local_results?.places || [],
          featuredSnippet: data.answer_box || data.featured_snippet || undefined,
          relatedSearches: data.related_searches?.map((r: any) => r.query) || [],
          totalResults: data.search_information?.total_results,
        };
      },
      { maxAttempts: 2, delayMs: 1000 },
      `SERP search: ${query}`
    );
  }

  async trackKeywords(keywords: string[], domain: string): Promise<{
    keyword: string;
    position: number | null;
    url: string | null;
    inTop10: boolean;
    inTop20: boolean;
  }[]> {
    if (!this.apiKey) {
      throw new Error('SERP_API_KEY environment variable is required');
    }

    logger.info('SERP', `Tracking ${keywords.length} keywords for ${domain}`);

    const results = [];

    for (const keyword of keywords) {
      try {
        const searchResult = await this.searchGoogle(keyword);
        
        const domainMatch = searchResult.organicResults.find(r => 
          r.link.includes(domain)
        );

        results.push({
          keyword,
          position: domainMatch?.position || null,
          url: domainMatch?.link || null,
          inTop10: domainMatch ? domainMatch.position <= 10 : false,
          inTop20: domainMatch ? domainMatch.position <= 20 : false,
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        logger.error('SERP', `Failed to track keyword: ${keyword}`, { error: error.message });
        results.push({
          keyword,
          position: null,
          url: null,
          inTop10: false,
          inTop20: false,
        });
      }
    }

    const tracked = results.filter(r => r.position !== null);
    logger.info('SERP', `Tracked ${tracked.length}/${keywords.length} keywords`, {
      inTop10: tracked.filter(r => r.inTop10).length,
      inTop20: tracked.filter(r => r.inTop20).length,
    });

    return results;
  }

  async getCompetitorAnalysis(query: string, domain: string): Promise<{
    ourPosition: number | null;
    competitors: { domain: string; position: number; title: string }[];
  }> {
    const searchResult = await this.searchGoogle(query);
    
    const ourResult = searchResult.organicResults.find(r => r.link.includes(domain));
    
    const competitors = searchResult.organicResults
      .filter(r => !r.link.includes(domain))
      .slice(0, 10)
      .map(r => ({
        domain: new URL(r.link).hostname,
        position: r.position,
        title: r.title,
      }));

    return {
      ourPosition: ourResult?.position || null,
      competitors,
    };
  }
}

export const serpConnector = new SerpConnector();
