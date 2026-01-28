import { storage } from "./storage";
import { 
  ProposalTypes, 
  RiskLevels, 
  ProposalStatuses,
  ProposalActionTypes,
  type InsertChangeProposal,
  type ProposalEvidence,
  type ChangePlan,
  type VerificationPlan,
  type RollbackPlan,
} from "@shared/schema";
import { createHash } from "crypto";
import { randomUUID } from "crypto";
import { logger } from "./utils/logger";

function generateProposalId(type: string): string {
  return `prop_${Date.now()}_${type.slice(0, 10)}_${randomUUID().slice(0, 6)}`;
}

function generateActionId(action: string): string {
  return `act_${Date.now()}_${action}_${randomUUID().slice(0, 6)}`;
}

function generateFingerprint(websiteId: string | null, serviceKey: string | null, type: string, target: string): string {
  const normalized = [websiteId || '', serviceKey || '', type, target].join('|').toLowerCase();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

export interface ProposalInput {
  websiteId?: string | null;
  serviceKey?: string | null;
  type: string;
  riskLevel?: string;
  title: string;
  description?: string;
  rationale?: any;
  evidence?: ProposalEvidence;
  changePlan?: ChangePlan;
  preview?: any;
  verificationPlan?: VerificationPlan;
  rollbackPlan?: RollbackPlan;
  blocking?: boolean;
  tags?: string[];
  targetKey?: string;
}

export async function createOrUpdateProposal(input: ProposalInput): Promise<{ proposalId: string; isNew: boolean }> {
  const fingerprint = generateFingerprint(
    input.websiteId || null,
    input.serviceKey || null,
    input.type,
    input.targetKey || input.title
  );

  const existingProposal = await storage.getChangeProposalByFingerprint(fingerprint);

  if (existingProposal) {
    await storage.updateChangeProposal(existingProposal.proposalId, {
      title: input.title,
      description: input.description,
      rationale: input.rationale,
      evidence: input.evidence,
      changePlan: input.changePlan,
      preview: input.preview,
      verificationPlan: input.verificationPlan,
      rollbackPlan: input.rollbackPlan,
    });
    
    logger.info("ProposalGenerator", `Updated existing proposal: ${existingProposal.proposalId}`);
    return { proposalId: existingProposal.proposalId, isNew: false };
  }

  const proposalId = generateProposalId(input.type);
  const proposal: InsertChangeProposal = {
    proposalId,
    websiteId: input.websiteId || null,
    serviceKey: input.serviceKey || null,
    type: input.type,
    riskLevel: input.riskLevel || RiskLevels.LOW,
    status: ProposalStatuses.OPEN,
    title: input.title,
    description: input.description,
    rationale: input.rationale,
    evidence: input.evidence,
    changePlan: input.changePlan,
    preview: input.preview,
    verificationPlan: input.verificationPlan,
    rollbackPlan: input.rollbackPlan,
    blocking: input.blocking || false,
    fingerprint,
    createdBy: 'system',
    tags: input.tags,
  };

  await storage.createChangeProposal(proposal);
  await storage.createChangeProposalAction({
    actionId: generateActionId('opened'),
    proposalId,
    action: ProposalActionTypes.OPENED,
    actor: 'system',
    reason: 'Auto-generated from diagnostics',
  });

  logger.info("ProposalGenerator", `Created new proposal: ${proposalId}`, { type: input.type, title: input.title });
  return { proposalId, isNew: true };
}

export async function createSecretFormatFixProposal(params: {
  serviceKey: string;
  serviceName: string;
  secretKeyName: string;
  currentFormat: string;
  expectedFormat: string;
  errorMessage?: string;
  testJobId?: string;
}): Promise<{ proposalId: string; isNew: boolean }> {
  const expectedEnvelope = {
    base_url: "https://your-service.vercel.app",
    api_key: "your-api-key"
  };

  return createOrUpdateProposal({
    serviceKey: params.serviceKey,
    type: ProposalTypes.SECRET_FORMAT_FIX,
    riskLevel: RiskLevels.LOW,
    title: `Fix secret format for ${params.serviceName}`,
    description: `The secret "${params.secretKeyName}" needs to be in JSON envelope format with base_url and api_key fields.`,
    rationale: {
      problem: "Secret is not in expected JSON format",
      currentFormat: params.currentFormat,
      expectedFormat: params.expectedFormat,
      errorMessage: params.errorMessage,
    },
    evidence: {
      serviceSlug: params.serviceKey,
      errorMessages: params.errorMessage ? [params.errorMessage] : [],
      testJobId: params.testJobId,
    },
    changePlan: {
      steps: [
        {
          stepNumber: 1,
          description: `Update secret "${params.secretKeyName}" to JSON envelope format`,
          action: "write_secret",
          target: params.secretKeyName,
          value: expectedEnvelope,
        }
      ],
      estimatedDuration: "1 minute",
      requiresConfirmation: false,
    },
    preview: {
      secretKeyName: params.secretKeyName,
      expectedEnvelope,
    },
    verificationPlan: {
      steps: [
        { type: 'connection_test', target: params.serviceKey },
      ],
      timeout: 60,
    },
    rollbackPlan: {
      method: 'manual',
      steps: [`Restore original secret value for "${params.secretKeyName}"`],
    },
    targetKey: params.secretKeyName,
    tags: ['secret', 'config'],
  });
}

export async function createMissingBaseUrlProposal(params: {
  serviceKey: string;
  serviceName: string;
}): Promise<{ proposalId: string; isNew: boolean }> {
  return createOrUpdateProposal({
    serviceKey: params.serviceKey,
    type: ProposalTypes.WEBSITE_SETTING_UPDATE,
    riskLevel: RiskLevels.LOW,
    title: `Configure base URL for ${params.serviceName}`,
    description: `The service "${params.serviceName}" needs a base_url to be configured.`,
    rationale: {
      problem: "No base_url configured for service",
      impact: "Cannot connect to or test the service",
    },
    evidence: {
      serviceSlug: params.serviceKey,
      errorMessages: ["No base_url configured"],
    },
    changePlan: {
      steps: [
        {
          stepNumber: 1,
          description: `Set base_url for ${params.serviceName}`,
          action: "update_setting",
          target: `integration.${params.serviceKey}.baseUrl`,
        }
      ],
      estimatedDuration: "30 seconds",
      requiresConfirmation: false,
    },
    preview: {
      field: "baseUrl",
      currentValue: null,
      suggestedFormat: "https://your-service.vercel.app",
    },
    verificationPlan: {
      steps: [
        { type: 'connection_test', target: params.serviceKey },
      ],
      timeout: 30,
    },
    rollbackPlan: {
      method: 'automatic',
      steps: ["Remove the base_url setting"],
    },
    targetKey: `base_url_${params.serviceKey}`,
    tags: ['config', 'url'],
  });
}

export async function createMissingOutputsProposal(params: {
  serviceKey: string;
  serviceName: string;
  expectedOutputs: string[];
  actualOutputs: string[];
  missingOutputs: string[];
  runId?: string;
}): Promise<{ proposalId: string; isNew: boolean }> {
  return createOrUpdateProposal({
    serviceKey: params.serviceKey,
    type: ProposalTypes.SERVICE_EXPECTED_OUTPUT_FIX,
    riskLevel: RiskLevels.MEDIUM,
    title: `Fix missing outputs for ${params.serviceName}`,
    description: `Service "${params.serviceName}" is not producing ${params.missingOutputs.length} expected output(s): ${params.missingOutputs.join(', ')}`,
    rationale: {
      problem: "Service is not producing expected outputs",
      expectedOutputs: params.expectedOutputs,
      actualOutputs: params.actualOutputs,
      missingOutputs: params.missingOutputs,
    },
    evidence: {
      serviceSlug: params.serviceKey,
      runIds: params.runId ? [params.runId] : [],
    },
    changePlan: {
      steps: [
        {
          stepNumber: 1,
          description: "Review service implementation to ensure all outputs are produced",
          action: "code_review",
          target: params.serviceKey,
        },
        {
          stepNumber: 2,
          description: "Update service to produce missing outputs",
          action: "implement",
          target: params.missingOutputs.join(', '),
        }
      ],
      requiresConfirmation: true,
    },
    preview: {
      expectedOutputs: params.expectedOutputs,
      actualOutputs: params.actualOutputs,
      missingOutputs: params.missingOutputs,
    },
    verificationPlan: {
      steps: [
        { type: 'smoke_test', target: params.serviceKey },
        { type: 'artifact_check', target: params.missingOutputs.join(',') },
      ],
      timeout: 120,
    },
    rollbackPlan: {
      method: 'manual',
      steps: ["Revert code changes if outputs still fail"],
    },
    targetKey: `outputs_${params.serviceKey}`,
    tags: ['outputs', 'implementation'],
  });
}

export async function createRunSmokeTestsProposal(params: {
  serviceKey?: string;
  serviceName?: string;
  reason: string;
}): Promise<{ proposalId: string; isNew: boolean }> {
  return createOrUpdateProposal({
    serviceKey: params.serviceKey,
    type: ProposalTypes.RUN_SMOKE_TESTS,
    riskLevel: RiskLevels.LOW,
    title: params.serviceKey 
      ? `Run smoke test for ${params.serviceName || params.serviceKey}` 
      : "Run smoke tests for all services",
    description: params.reason,
    rationale: {
      trigger: params.reason,
    },
    evidence: {
      serviceSlug: params.serviceKey,
    },
    changePlan: {
      steps: [
        {
          stepNumber: 1,
          description: params.serviceKey 
            ? `Run smoke test for ${params.serviceName}` 
            : "Run smoke tests for all configured services",
          action: "run_smoke_tests",
          target: params.serviceKey || "all",
        }
      ],
      estimatedDuration: "2-5 minutes",
      requiresConfirmation: false,
    },
    verificationPlan: {
      steps: [
        { type: 'smoke_test', target: params.serviceKey || 'all' },
      ],
      timeout: 300,
    },
    rollbackPlan: {
      method: 'manual',
      steps: ["No rollback needed - smoke tests are read-only"],
    },
    targetKey: params.serviceKey ? `smoke_${params.serviceKey}` : "smoke_all",
    tags: ['operational', 'smoke-test'],
  });
}

export async function analyzeTestResultsAndGenerateProposals(testJobId: string): Promise<number> {
  const job = await storage.getTestJobById(testJobId);
  if (!job) {
    logger.warn("ProposalGenerator", `Test job not found: ${testJobId}`);
    return 0;
  }

  const progress = job.progressJson as any;
  if (!progress?.perService) {
    return 0;
  }

  let proposalCount = 0;

  for (const [serviceSlug, serviceProgress] of Object.entries(progress.perService)) {
    const svc = serviceProgress as any;
    
    if (svc.status === 'fail') {
      if (svc.error?.includes('JSON') || svc.error?.includes('secret') || svc.error?.includes('parse')) {
        await createSecretFormatFixProposal({
          serviceKey: serviceSlug,
          serviceName: serviceSlug,
          secretKeyName: `${serviceSlug}_credentials`,
          currentFormat: 'invalid',
          expectedFormat: 'JSON envelope',
          errorMessage: svc.error,
          testJobId,
        });
        proposalCount++;
      } else if (svc.error?.includes('base_url') || svc.error?.includes('No URL')) {
        await createMissingBaseUrlProposal({
          serviceKey: serviceSlug,
          serviceName: serviceSlug,
        });
        proposalCount++;
      }
    }

    if (svc.status === 'partial' && svc.missingOutputs?.length > 0) {
      await createMissingOutputsProposal({
        serviceKey: serviceSlug,
        serviceName: serviceSlug,
        expectedOutputs: svc.expectedOutputs || [],
        actualOutputs: svc.actualOutputs || [],
        missingOutputs: svc.missingOutputs,
      });
      proposalCount++;
    }
  }

  logger.info("ProposalGenerator", `Generated ${proposalCount} proposals from test job ${testJobId}`);
  return proposalCount;
}
