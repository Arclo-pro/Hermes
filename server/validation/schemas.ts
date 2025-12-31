import { z } from "zod";

export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string().optional(),
  version: z.string().optional(),
  uptime: z.number().optional(),
  uptime_seconds: z.number().optional(),
  message: z.string().optional(),
  status: z.string().optional(),
  expected_key_fingerprint: z.string().optional(),
}).passthrough();

export const SmokeTestResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string().optional(),
  version: z.string().optional(),
  schema_version: z.string().optional(),
  request_id: z.string().optional(),
  message: z.string().optional(),
  data: z.any().optional(),
}).passthrough();

export const CapabilitiesResponseSchema = z.object({
  ok: z.boolean().optional(),
  capabilities: z.array(z.string()).optional(),
  inputs: z.record(z.any()).optional(),
  outputs: z.record(z.any()).optional(),
  endpoints: z.array(z.string()).optional(),
  supported_operations: z.array(z.string()).optional(),
}).passthrough();

export const GoldStandardResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string(),
  version: z.string(),
  schema_version: z.string(),
  request_id: z.string().optional(),
  data: z.any().optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type SmokeTestResponse = z.infer<typeof SmokeTestResponseSchema>;
export type CapabilitiesResponse = z.infer<typeof CapabilitiesResponseSchema>;
export type GoldStandardResponse = z.infer<typeof GoldStandardResponseSchema>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
}

export function validateHealthResponse(data: unknown): ValidationResult {
  const result = HealthResponseSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
      warnings: [],
    };
  }
  
  const warnings: string[] = [];
  if (!result.data.ok) {
    warnings.push("Health check returned ok=false");
  }
  if (!result.data.service) {
    warnings.push("Missing 'service' field (Gold Standard recommends including it)");
  }
  if (!result.data.version) {
    warnings.push("Missing 'version' field (Gold Standard recommends including it)");
  }
  
  return {
    valid: true,
    errors: [],
    warnings,
    data: result.data,
  };
}

export function validateSmokeTestResponse(data: unknown): ValidationResult {
  const result = SmokeTestResponseSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
      warnings: [],
    };
  }
  
  const warnings: string[] = [];
  if (!result.data.ok) {
    warnings.push("Smoke test returned ok=false");
  }
  
  const goldStandardResult = GoldStandardResponseSchema.safeParse(data);
  if (!goldStandardResult.success) {
    warnings.push("Response does not fully conform to Gold Standard Worker Blueprint");
  }
  
  return {
    valid: true,
    errors: [],
    warnings,
    data: result.data,
  };
}

export function validateCapabilitiesResponse(data: unknown): ValidationResult {
  const result = CapabilitiesResponseSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
      warnings: [],
    };
  }
  
  const warnings: string[] = [];
  if (!result.data.capabilities && !result.data.endpoints && !result.data.supported_operations) {
    warnings.push("No capabilities, endpoints, or supported_operations found");
  }
  
  return {
    valid: true,
    errors: [],
    warnings,
    data: result.data,
  };
}
