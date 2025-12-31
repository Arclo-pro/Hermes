import { resolveWorkerConfig, WorkerConfig } from "../workerConfigResolver";
import { getWorkerRegistry, WorkerRegistryEntry } from "./workerRegistry";
import { 
  validateHealthResponse, 
  validateSmokeTestResponse, 
  validateCapabilitiesResponse,
  ValidationResult 
} from "./schemas";
import { logger } from "../utils/logger";
import pLimit from "p-limit";

const TIMEOUT_MS = 15000;
const CONCURRENCY_LIMIT = 5;

export type TestStatus = "passed" | "failed" | "skipped" | "warning";

export interface EndpointTestResult {
  endpoint: string;
  url: string;
  status: TestStatus;
  httpStatus?: number;
  responseTimeMs: number;
  validation: ValidationResult;
  rawResponse?: any;
  error?: string;
}

export interface WorkerTestResult {
  serviceSlug: string;
  displayName: string;
  category: string;
  crew?: string;
  overallStatus: TestStatus;
  configValid: boolean;
  configError?: string;
  baseUrl?: string;
  apiKeyPresent: boolean;
  apiKeyFingerprint?: string;
  tests: {
    health?: EndpointTestResult;
    smokeTest?: EndpointTestResult;
    capabilities?: EndpointTestResult;
  };
  testedAt: string;
  totalDurationMs: number;
}

export interface ValidationReport {
  generatedAt: string;
  totalWorkers: number;
  passed: number;
  failed: number;
  skipped: number;
  warning: number;
  workers: WorkerTestResult[];
  summary: {
    byCategory: Record<string, { passed: number; failed: number; skipped: number }>;
    byCrew: Record<string, { passed: number; failed: number; skipped: number }>;
    commonIssues: string[];
  };
}

async function testEndpoint(
  config: WorkerConfig,
  endpointPath: string,
  validator: (data: unknown) => ValidationResult,
  endpointName: string
): Promise<EndpointTestResult> {
  if (!config.valid || !config.base_url) {
    return {
      endpoint: endpointName,
      url: "N/A",
      status: "skipped",
      responseTimeMs: 0,
      validation: { valid: false, errors: ["No valid config"], warnings: [] },
      error: config.error || "Config not valid",
    };
  }
  
  const url = `${config.base_url}${endpointPath}`;
  const startTime = Date.now();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-Id": `validation_${Date.now()}`,
  };
  
  if (config.api_key) {
    headers["x-api-key"] = config.api_key;
    headers["Authorization"] = `Bearer ${config.api_key}`;
  }
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    const responseTimeMs = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        endpoint: endpointName,
        url,
        status: "failed",
        httpStatus: response.status,
        responseTimeMs,
        validation: { valid: false, errors: [`HTTP ${response.status}: ${errorText.substring(0, 200)}`], warnings: [] },
        error: errorText.substring(0, 500),
      };
    }
    
    const data = await response.json();
    const validation = validator(data);
    
    let status: TestStatus = "passed";
    if (!validation.valid) {
      status = "failed";
    } else if (validation.warnings.length > 0) {
      status = "warning";
    }
    
    return {
      endpoint: endpointName,
      url,
      status,
      httpStatus: response.status,
      responseTimeMs,
      validation,
      rawResponse: data,
    };
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    
    if (error.name === "AbortError") {
      return {
        endpoint: endpointName,
        url,
        status: "failed",
        responseTimeMs,
        validation: { valid: false, errors: [`Timeout after ${TIMEOUT_MS}ms`], warnings: [] },
        error: "Request timed out",
      };
    }
    
    return {
      endpoint: endpointName,
      url,
      status: "failed",
      responseTimeMs,
      validation: { valid: false, errors: [error.message], warnings: [] },
      error: error.message,
    };
  }
}

async function testWorker(entry: WorkerRegistryEntry): Promise<WorkerTestResult> {
  const startTime = Date.now();
  const testedAt = new Date().toISOString();
  
  const config = await resolveWorkerConfig(entry.serviceSlug);
  
  if (!config.valid) {
    return {
      serviceSlug: entry.serviceSlug,
      displayName: entry.displayName,
      category: entry.category,
      crew: entry.crew,
      overallStatus: "skipped",
      configValid: false,
      configError: config.error || "Config not valid",
      apiKeyPresent: !!config.api_key,
      apiKeyFingerprint: config.api_key_fingerprint || undefined,
      tests: {},
      testedAt,
      totalDurationMs: Date.now() - startTime,
    };
  }
  
  const tests: WorkerTestResult["tests"] = {};
  
  tests.health = await testEndpoint(
    config,
    entry.endpoints.health,
    validateHealthResponse,
    "health"
  );
  
  if (entry.endpoints.smokeTest && entry.endpoints.smokeTest !== entry.endpoints.health) {
    tests.smokeTest = await testEndpoint(
      config,
      entry.endpoints.smokeTest,
      validateSmokeTestResponse,
      "smokeTest"
    );
  }
  
  if (entry.endpoints.capabilities) {
    tests.capabilities = await testEndpoint(
      config,
      entry.endpoints.capabilities,
      validateCapabilitiesResponse,
      "capabilities"
    );
  }
  
  let overallStatus: TestStatus = "passed";
  const testResults = Object.values(tests);
  
  if (testResults.some(t => t.status === "failed")) {
    overallStatus = "failed";
  } else if (testResults.some(t => t.status === "warning")) {
    overallStatus = "warning";
  } else if (testResults.every(t => t.status === "skipped")) {
    overallStatus = "skipped";
  }
  
  return {
    serviceSlug: entry.serviceSlug,
    displayName: entry.displayName,
    category: entry.category,
    crew: entry.crew,
    overallStatus,
    configValid: true,
    baseUrl: config.base_url || undefined,
    apiKeyPresent: !!config.api_key,
    apiKeyFingerprint: config.api_key_fingerprint || undefined,
    tests,
    testedAt,
    totalDurationMs: Date.now() - startTime,
  };
}

export async function runValidation(
  options: {
    workers?: string[];
    category?: string;
    crew?: string;
    parallel?: boolean;
  } = {}
): Promise<ValidationReport> {
  const generatedAt = new Date().toISOString();
  let registry = getWorkerRegistry();
  
  if (options.workers && options.workers.length > 0) {
    registry = registry.filter(w => options.workers!.includes(w.serviceSlug));
  }
  if (options.category) {
    registry = registry.filter(w => w.category === options.category);
  }
  if (options.crew) {
    registry = registry.filter(w => w.crew === options.crew);
  }
  
  logger.info("WorkerValidation", `Running validation for ${registry.length} workers`, {
    filters: { workers: options.workers, category: options.category, crew: options.crew },
  });
  
  let results: WorkerTestResult[];
  
  if (options.parallel !== false) {
    const limit = pLimit(CONCURRENCY_LIMIT);
    results = await Promise.all(registry.map(entry => limit(() => testWorker(entry))));
  } else {
    results = [];
    for (const entry of registry) {
      results.push(await testWorker(entry));
    }
  }
  
  const passed = results.filter(r => r.overallStatus === "passed").length;
  const failed = results.filter(r => r.overallStatus === "failed").length;
  const skipped = results.filter(r => r.overallStatus === "skipped").length;
  const warning = results.filter(r => r.overallStatus === "warning").length;
  
  const byCategory: Record<string, { passed: number; failed: number; skipped: number }> = {};
  const byCrew: Record<string, { passed: number; failed: number; skipped: number }> = {};
  
  for (const result of results) {
    if (!byCategory[result.category]) {
      byCategory[result.category] = { passed: 0, failed: 0, skipped: 0 };
    }
    if (result.overallStatus === "passed" || result.overallStatus === "warning") {
      byCategory[result.category].passed++;
    } else if (result.overallStatus === "failed") {
      byCategory[result.category].failed++;
    } else {
      byCategory[result.category].skipped++;
    }
    
    if (result.crew) {
      if (!byCrew[result.crew]) {
        byCrew[result.crew] = { passed: 0, failed: 0, skipped: 0 };
      }
      if (result.overallStatus === "passed" || result.overallStatus === "warning") {
        byCrew[result.crew].passed++;
      } else if (result.overallStatus === "failed") {
        byCrew[result.crew].failed++;
      } else {
        byCrew[result.crew].skipped++;
      }
    }
  }
  
  const commonIssues: string[] = [];
  const configErrors = results.filter(r => !r.configValid);
  if (configErrors.length > 0) {
    commonIssues.push(`${configErrors.length} workers have config errors`);
  }
  
  const timeouts = results.filter(r => 
    Object.values(r.tests).some(t => t.error?.includes("timeout") || t.error?.includes("Timeout"))
  );
  if (timeouts.length > 0) {
    commonIssues.push(`${timeouts.length} workers timed out`);
  }
  
  const authErrors = results.filter(r =>
    Object.values(r.tests).some(t => t.httpStatus === 401 || t.httpStatus === 403)
  );
  if (authErrors.length > 0) {
    commonIssues.push(`${authErrors.length} workers have authentication errors`);
  }
  
  return {
    generatedAt,
    totalWorkers: results.length,
    passed,
    failed,
    skipped,
    warning,
    workers: results,
    summary: {
      byCategory,
      byCrew,
      commonIssues,
    },
  };
}

function getRecommendedFix(worker: WorkerTestResult): { rootCause: string; fix: string } | null {
  if (worker.configError) {
    if (worker.configError.includes("Secret not found")) {
      return {
        rootCause: "Bitwarden secret not configured",
        fix: `Add the required secret to Bitwarden Secrets Manager, or configure fallback env vars for ${worker.serviceSlug}`
      };
    }
    if (worker.configError.includes("base_url")) {
      return {
        rootCause: "Worker base URL not configured",
        fix: "Set the base_url in Bitwarden secret JSON, or set the fallback env var (see serviceSecretMap.ts)"
      };
    }
    return {
      rootCause: "Configuration error",
      fix: "Check Bitwarden secrets and env vars for this service"
    };
  }
  
  for (const test of Object.values(worker.tests)) {
    if (!test) continue;
    
    if (test.httpStatus === 401 || test.httpStatus === 403) {
      return {
        rootCause: "Authentication failure - API key rejected",
        fix: "Verify the api_key in Bitwarden matches what the worker expects. Compare fingerprints."
      };
    }
    if (test.httpStatus === 404) {
      return {
        rootCause: "Endpoint not found",
        fix: "Verify the worker is deployed and the endpoint path is correct in workerEndpoints config"
      };
    }
    if (test.httpStatus && test.httpStatus >= 500) {
      return {
        rootCause: "Worker internal error",
        fix: "Check worker logs for errors. The worker may be misconfigured or experiencing issues."
      };
    }
    if (test.error?.includes("timeout") || test.error?.includes("Timeout")) {
      return {
        rootCause: "Worker timeout - slow or unresponsive",
        fix: "Check if worker is running and healthy. May need to increase timeout or investigate worker performance."
      };
    }
    if (test.error?.includes("ECONNREFUSED") || test.error?.includes("ENOTFOUND")) {
      return {
        rootCause: "Cannot connect to worker",
        fix: "Verify base_url is correct and worker is deployed/accessible from Hermes network"
      };
    }
  }
  
  return null;
}

export function generateMarkdownReport(report: ValidationReport): string {
  const lines: string[] = [];
  
  lines.push("# Worker Validation Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Status | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Passed | ${report.passed} |`);
  lines.push(`| Failed | ${report.failed} |`);
  lines.push(`| Skipped | ${report.skipped} |`);
  lines.push(`| Warning | ${report.warning} |`);
  lines.push(`| **Total** | **${report.totalWorkers}** |`);
  lines.push("");
  
  if (report.summary.commonIssues.length > 0) {
    lines.push("### Common Issues");
    lines.push("");
    for (const issue of report.summary.commonIssues) {
      lines.push(`- ${issue}`);
    }
    lines.push("");
  }
  
  lines.push("## By Category");
  lines.push("");
  lines.push(`| Category | Passed | Failed | Skipped |`);
  lines.push(`|----------|--------|--------|---------|`);
  for (const [category, stats] of Object.entries(report.summary.byCategory)) {
    lines.push(`| ${category} | ${stats.passed} | ${stats.failed} | ${stats.skipped} |`);
  }
  lines.push("");
  
  lines.push("## By Crew");
  lines.push("");
  lines.push(`| Crew | Passed | Failed | Skipped |`);
  lines.push(`|------|--------|--------|---------|`);
  for (const [crew, stats] of Object.entries(report.summary.byCrew)) {
    lines.push(`| ${crew} | ${stats.passed} | ${stats.failed} | ${stats.skipped} |`);
  }
  lines.push("");
  
  lines.push("## Worker Details");
  lines.push("");
  
  const statusEmoji = (status: TestStatus) => {
    switch (status) {
      case "passed": return "✅";
      case "failed": return "❌";
      case "skipped": return "⏭️";
      case "warning": return "⚠️";
    }
  };
  
  for (const worker of report.workers) {
    lines.push(`### ${statusEmoji(worker.overallStatus)} ${worker.displayName}`);
    lines.push("");
    lines.push(`- **Slug**: \`${worker.serviceSlug}\``);
    lines.push(`- **Category**: ${worker.category}`);
    if (worker.crew) {
      lines.push(`- **Crew**: ${worker.crew}`);
    }
    lines.push(`- **Config Valid**: ${worker.configValid ? "Yes" : "No"}`);
    if (worker.baseUrl) {
      lines.push(`- **Base URL**: \`${worker.baseUrl}\``);
    }
    lines.push(`- **API Key**: ${worker.apiKeyPresent ? "Present" : "Missing"}`);
    if (worker.apiKeyFingerprint) {
      lines.push(`- **Key Fingerprint**: \`${worker.apiKeyFingerprint}\``);
    }
    lines.push(`- **Duration**: ${worker.totalDurationMs}ms`);
    lines.push("");
    
    if (worker.configError) {
      lines.push(`> **Config Error**: ${worker.configError}`);
      lines.push("");
    }
    
    const recommendation = getRecommendedFix(worker);
    if (recommendation && worker.overallStatus !== "passed") {
      lines.push("**Diagnosis:**");
      lines.push(`- **Root Cause**: ${recommendation.rootCause}`);
      lines.push(`- **Recommended Fix**: ${recommendation.fix}`);
      lines.push("");
    }
    
    if (Object.keys(worker.tests).length > 0) {
      lines.push("| Endpoint | Status | HTTP | Time | Errors | Warnings |");
      lines.push("|----------|--------|------|------|--------|----------|");
      for (const [name, test] of Object.entries(worker.tests)) {
        if (!test) continue;
        lines.push(
          `| ${name} | ${statusEmoji(test.status)} ${test.status} | ${test.httpStatus || "N/A"} | ${test.responseTimeMs}ms | ${test.validation.errors.length} | ${test.validation.warnings.length} |`
        );
      }
      lines.push("");
      
      for (const [name, test] of Object.entries(worker.tests)) {
        if (!test) continue;
        if (test.validation.errors.length > 0 || test.validation.warnings.length > 0) {
          lines.push(`**${name} issues:**`);
          for (const error of test.validation.errors) {
            lines.push(`- ❌ ${error}`);
          }
          for (const warning of test.validation.warnings) {
            lines.push(`- ⚠️ ${warning}`);
          }
          lines.push("");
        }
      }
    }
    
    lines.push("---");
    lines.push("");
  }
  
  return lines.join("\n");
}
