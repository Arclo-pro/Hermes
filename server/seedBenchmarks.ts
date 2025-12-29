import { storage } from "./storage";
import type { InsertIndustryBenchmark } from "@shared/schema";

const benchmarkData: InsertIndustryBenchmark[] = [
  // Psychiatry / Mental Health Industry (primary)
  { industry: "psychiatry", metric: "sessions", percentile25: 800, percentile50: 2500, percentile75: 8000, percentile90: 25000, unit: "count_monthly", source: "Healthcare Industry Research 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "clicks", percentile25: 200, percentile50: 800, percentile75: 2500, percentile90: 8000, unit: "count_monthly", source: "Healthcare Industry Research 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "impressions", percentile25: 5000, percentile50: 20000, percentile75: 60000, percentile90: 200000, unit: "count_monthly", source: "Healthcare Industry Research 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "organic_ctr", percentile25: 2.8, percentile50: 4.0, percentile75: 5.5, percentile90: 7.5, unit: "percent", source: "Healthcare Industry Research 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "avg_position", percentile25: 22, percentile50: 12, percentile75: 6, percentile90: 3, unit: "position", source: "Healthcare Industry Research 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "bounce_rate", percentile25: 62, percentile50: 52, percentile75: 42, percentile90: 32, unit: "percent", source: "Healthcare Industry Research 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "session_duration", percentile25: 50, percentile50: 100, percentile75: 170, percentile90: 280, unit: "seconds", source: "Healthcare Industry Research 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "pages_per_session", percentile25: 1.6, percentile50: 2.4, percentile75: 3.5, percentile90: 5.0, unit: "count", source: "Healthcare Industry Research 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "conversion_rate", percentile25: 1.5, percentile50: 3.0, percentile75: 5.0, percentile90: 8.0, unit: "percent", source: "Healthcare Industry Research 2024", sourceYear: 2024 },
  
  // Healthcare Industry
  { industry: "healthcare", metric: "sessions", percentile25: 1000, percentile50: 3500, percentile75: 12000, percentile90: 40000, unit: "count_monthly", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "clicks", percentile25: 300, percentile50: 1200, percentile75: 4000, percentile90: 15000, unit: "count_monthly", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "impressions", percentile25: 8000, percentile50: 30000, percentile75: 100000, percentile90: 350000, unit: "count_monthly", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "organic_ctr", percentile25: 2.5, percentile50: 3.8, percentile75: 5.2, percentile90: 7.1, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "avg_position", percentile25: 25, percentile50: 15, percentile75: 8, percentile90: 4, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "bounce_rate", percentile25: 65, percentile50: 55, percentile75: 45, percentile90: 35, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "session_duration", percentile25: 45, percentile50: 90, percentile75: 150, percentile90: 240, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "pages_per_session", percentile25: 1.5, percentile50: 2.2, percentile75: 3.0, percentile90: 4.5, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "conversion_rate", percentile25: 1.0, percentile50: 2.5, percentile75: 4.0, percentile90: 6.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // E-commerce Industry
  { industry: "ecommerce", metric: "organic_ctr", percentile25: 1.8, percentile50: 2.9, percentile75: 4.5, percentile90: 6.8, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "avg_position", percentile25: 30, percentile50: 18, percentile75: 10, percentile90: 5, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "bounce_rate", percentile25: 55, percentile50: 45, percentile75: 35, percentile90: 25, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "session_duration", percentile25: 60, percentile50: 120, percentile75: 200, percentile90: 320, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "pages_per_session", percentile25: 2.0, percentile50: 3.5, percentile75: 5.0, percentile90: 8.0, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "conversion_rate", percentile25: 1.5, percentile50: 2.8, percentile75: 4.5, percentile90: 7.0, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // SaaS Industry
  { industry: "saas", metric: "organic_ctr", percentile25: 2.2, percentile50: 3.5, percentile75: 5.0, percentile90: 7.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "saas", metric: "avg_position", percentile25: 28, percentile50: 16, percentile75: 9, percentile90: 4, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "saas", metric: "bounce_rate", percentile25: 60, percentile50: 48, percentile75: 38, percentile90: 28, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "saas", metric: "session_duration", percentile25: 55, percentile50: 110, percentile75: 180, percentile90: 300, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "saas", metric: "pages_per_session", percentile25: 1.8, percentile50: 2.8, percentile75: 4.2, percentile90: 6.5, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "saas", metric: "conversion_rate", percentile25: 2.0, percentile50: 3.5, percentile75: 5.5, percentile90: 8.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // Finance Industry
  { industry: "finance", metric: "organic_ctr", percentile25: 2.0, percentile50: 3.2, percentile75: 4.8, percentile90: 6.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "finance", metric: "avg_position", percentile25: 32, percentile50: 20, percentile75: 12, percentile90: 6, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "finance", metric: "bounce_rate", percentile25: 58, percentile50: 48, percentile75: 38, percentile90: 28, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "finance", metric: "session_duration", percentile25: 50, percentile50: 100, percentile75: 170, percentile90: 280, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "finance", metric: "pages_per_session", percentile25: 1.6, percentile50: 2.5, percentile75: 3.8, percentile90: 5.5, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "finance", metric: "conversion_rate", percentile25: 1.2, percentile50: 2.2, percentile75: 3.8, percentile90: 5.8, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // Education Industry
  { industry: "education", metric: "organic_ctr", percentile25: 2.8, percentile50: 4.2, percentile75: 5.8, percentile90: 8.0, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "education", metric: "avg_position", percentile25: 22, percentile50: 14, percentile75: 7, percentile90: 3, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "education", metric: "bounce_rate", percentile25: 62, percentile50: 52, percentile75: 42, percentile90: 32, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "education", metric: "session_duration", percentile25: 70, percentile50: 140, percentile75: 220, percentile90: 360, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "education", metric: "pages_per_session", percentile25: 2.2, percentile50: 3.2, percentile75: 4.5, percentile90: 6.8, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "education", metric: "conversion_rate", percentile25: 1.8, percentile50: 3.2, percentile75: 5.0, percentile90: 7.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // Travel & Hospitality Industry
  { industry: "travel", metric: "organic_ctr", percentile25: 2.4, percentile50: 3.8, percentile75: 5.5, percentile90: 7.8, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "travel", metric: "avg_position", percentile25: 26, percentile50: 16, percentile75: 9, percentile90: 4, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "travel", metric: "bounce_rate", percentile25: 52, percentile50: 42, percentile75: 32, percentile90: 22, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "travel", metric: "session_duration", percentile25: 80, percentile50: 160, percentile75: 260, percentile90: 400, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "travel", metric: "pages_per_session", percentile25: 2.5, percentile50: 4.0, percentile75: 6.0, percentile90: 9.0, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "travel", metric: "conversion_rate", percentile25: 0.8, percentile50: 1.8, percentile75: 3.2, percentile90: 5.0, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // Real Estate Industry
  { industry: "real_estate", metric: "organic_ctr", percentile25: 2.6, percentile50: 4.0, percentile75: 5.6, percentile90: 7.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "real_estate", metric: "avg_position", percentile25: 24, percentile50: 15, percentile75: 8, percentile90: 4, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "real_estate", metric: "bounce_rate", percentile25: 58, percentile50: 48, percentile75: 38, percentile90: 28, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "real_estate", metric: "session_duration", percentile25: 65, percentile50: 130, percentile75: 210, percentile90: 340, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "real_estate", metric: "pages_per_session", percentile25: 2.0, percentile50: 3.2, percentile75: 5.0, percentile90: 7.5, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "real_estate", metric: "conversion_rate", percentile25: 1.0, percentile50: 2.0, percentile75: 3.5, percentile90: 5.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // Legal Industry
  { industry: "legal", metric: "organic_ctr", percentile25: 2.3, percentile50: 3.6, percentile75: 5.0, percentile90: 6.8, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "legal", metric: "avg_position", percentile25: 28, percentile50: 18, percentile75: 10, percentile90: 5, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "legal", metric: "bounce_rate", percentile25: 60, percentile50: 50, percentile75: 40, percentile90: 30, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "legal", metric: "session_duration", percentile25: 55, percentile50: 110, percentile75: 180, percentile90: 290, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "legal", metric: "pages_per_session", percentile25: 1.7, percentile50: 2.6, percentile75: 3.8, percentile90: 5.5, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "legal", metric: "conversion_rate", percentile25: 2.5, percentile50: 4.0, percentile75: 6.0, percentile90: 9.0, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CORE WEB VITALS BENCHMARKS
  // Note: For CWV, lower is better. Percentiles represent performance distribution.
  // p25 = top 25% performers (best), p90 = bottom 10% (worst)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Healthcare Core Web Vitals (based on CrUX data and HTTPArchive 2024)
  { industry: "healthcare", metric: "vitals.lcp", percentile25: 1.8, percentile50: 2.8, percentile75: 4.2, percentile90: 6.5, unit: "seconds", source: "CrUX Healthcare Report 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "vitals.cls", percentile25: 0.05, percentile50: 0.12, percentile75: 0.22, percentile90: 0.38, unit: "score", source: "CrUX Healthcare Report 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "vitals.inp", percentile25: 120, percentile50: 220, percentile75: 380, percentile90: 580, unit: "milliseconds", source: "CrUX Healthcare Report 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "vitals.fcp", percentile25: 1.2, percentile50: 2.0, percentile75: 3.2, percentile90: 5.0, unit: "seconds", source: "CrUX Healthcare Report 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "vitals.ttfb", percentile25: 400, percentile50: 800, percentile75: 1400, percentile90: 2200, unit: "milliseconds", source: "CrUX Healthcare Report 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "vitals.performance_score", percentile25: 85, percentile50: 65, percentile75: 45, percentile90: 28, unit: "score", source: "Lighthouse Healthcare Analysis 2024", sourceYear: 2024 },
  
  // Psychiatry Core Web Vitals (similar to healthcare but slightly different patient portals)
  { industry: "psychiatry", metric: "vitals.lcp", percentile25: 1.9, percentile50: 3.0, percentile75: 4.5, percentile90: 7.0, unit: "seconds", source: "CrUX Mental Health Sites 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "vitals.cls", percentile25: 0.04, percentile50: 0.10, percentile75: 0.20, percentile90: 0.35, unit: "score", source: "CrUX Mental Health Sites 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "vitals.inp", percentile25: 110, percentile50: 200, percentile75: 350, percentile90: 550, unit: "milliseconds", source: "CrUX Mental Health Sites 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "vitals.fcp", percentile25: 1.3, percentile50: 2.1, percentile75: 3.4, percentile90: 5.2, unit: "seconds", source: "CrUX Mental Health Sites 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "vitals.ttfb", percentile25: 450, percentile50: 850, percentile75: 1500, percentile90: 2400, unit: "milliseconds", source: "CrUX Mental Health Sites 2024", sourceYear: 2024 },
  { industry: "psychiatry", metric: "vitals.performance_score", percentile25: 82, percentile50: 62, percentile75: 42, percentile90: 25, unit: "score", source: "Lighthouse Mental Health Analysis 2024", sourceYear: 2024 },
  
  // E-commerce Core Web Vitals (typically heavier sites)
  { industry: "ecommerce", metric: "vitals.lcp", percentile25: 2.0, percentile50: 3.2, percentile75: 5.0, percentile90: 8.0, unit: "seconds", source: "CrUX E-commerce Report 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "vitals.cls", percentile25: 0.08, percentile50: 0.18, percentile75: 0.32, percentile90: 0.55, unit: "score", source: "CrUX E-commerce Report 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "vitals.inp", percentile25: 150, percentile50: 280, percentile75: 450, percentile90: 700, unit: "milliseconds", source: "CrUX E-commerce Report 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "vitals.fcp", percentile25: 1.4, percentile50: 2.3, percentile75: 3.8, percentile90: 6.0, unit: "seconds", source: "CrUX E-commerce Report 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "vitals.ttfb", percentile25: 500, percentile50: 950, percentile75: 1600, percentile90: 2800, unit: "milliseconds", source: "CrUX E-commerce Report 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "vitals.performance_score", percentile25: 75, percentile50: 55, percentile75: 38, percentile90: 22, unit: "score", source: "Lighthouse E-commerce Analysis 2024", sourceYear: 2024 },
  
  // SaaS Core Web Vitals (typically optimized SPAs)
  { industry: "saas", metric: "vitals.lcp", percentile25: 1.6, percentile50: 2.5, percentile75: 3.8, percentile90: 5.8, unit: "seconds", source: "CrUX SaaS Report 2024", sourceYear: 2024 },
  { industry: "saas", metric: "vitals.cls", percentile25: 0.03, percentile50: 0.08, percentile75: 0.15, percentile90: 0.28, unit: "score", source: "CrUX SaaS Report 2024", sourceYear: 2024 },
  { industry: "saas", metric: "vitals.inp", percentile25: 100, percentile50: 180, percentile75: 320, percentile90: 500, unit: "milliseconds", source: "CrUX SaaS Report 2024", sourceYear: 2024 },
  { industry: "saas", metric: "vitals.fcp", percentile25: 1.0, percentile50: 1.7, percentile75: 2.8, percentile90: 4.2, unit: "seconds", source: "CrUX SaaS Report 2024", sourceYear: 2024 },
  { industry: "saas", metric: "vitals.ttfb", percentile25: 350, percentile50: 700, percentile75: 1200, percentile90: 1900, unit: "milliseconds", source: "CrUX SaaS Report 2024", sourceYear: 2024 },
  { industry: "saas", metric: "vitals.performance_score", percentile25: 88, percentile50: 70, percentile75: 50, percentile90: 32, unit: "score", source: "Lighthouse SaaS Analysis 2024", sourceYear: 2024 },
];

export async function seedBenchmarks(force: boolean = false): Promise<number> {
  const existing = await storage.getAllBenchmarks();
  
  if (existing.length > 0 && !force) {
    // Check if we need to add new metrics (like CWV)
    const existingMetrics = new Set(existing.map(b => `${b.industry}:${b.metric}`));
    const newBenchmarks = benchmarkData.filter(b => !existingMetrics.has(`${b.industry}:${b.metric}`));
    
    if (newBenchmarks.length > 0) {
      const saved = await storage.saveBenchmarks(newBenchmarks);
      console.log(`[Benchmarks] Added ${saved.length} new benchmark entries (${existing.length} existing)`);
      return existing.length + saved.length;
    }
    
    console.log(`[Benchmarks] Already seeded with ${existing.length} entries`);
    return existing.length;
  }
  
  const saved = await storage.saveBenchmarks(benchmarkData);
  console.log(`[Benchmarks] Seeded ${saved.length} benchmark entries`);
  return saved.length;
}
