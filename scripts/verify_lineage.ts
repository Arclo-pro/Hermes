#!/usr/bin/env tsx
/**
 * Lineage Verification Script
 * 
 * Validates the Canonical Crew Identity System is intact.
 * Run with: npm run verify (or npx tsx scripts/verify_lineage.ts)
 */

import { CREW, type CrewDefinition } from '../shared/registry';
import { CREW_KPI_CONTRACTS, validateCrewKpiContract, validateKpiForCrew } from '../shared/crew/kpiSchemas';
import { getCrewIntegrationConfig } from '../server/integrations/getCrewIntegrationConfig';

const ALL_CREW_IDS = [
  'scotty', 'speedster', 'popular', 'lookout', 'beacon',
  'sentinel', 'natasha', 'draper', 'hemingway', 'socrates', 'atlas', 'major_tom'
] as const;

interface VerificationResult {
  crewId: string;
  checks: {
    name: string;
    passed: boolean;
    message?: string;
  }[];
}

function verifyCrewLineage(crewId: string): VerificationResult {
  const checks: VerificationResult['checks'] = [];

  // 1. Registry presence
  const crew = CREW[crewId] as CrewDefinition | undefined;
  checks.push({
    name: 'registry_present',
    passed: !!crew,
    message: crew ? undefined : `Crew '${crewId}' not found in registry`,
  });

  if (!crew) {
    return { crewId, checks };
  }

  // 2. Required fields
  checks.push({
    name: 'has_nickname',
    passed: !!crew.nickname,
    message: crew.nickname ? undefined : 'Missing nickname',
  });

  checks.push({
    name: 'has_integration_id',
    passed: !!crew.integrationId,
    message: crew.integrationId ? undefined : 'Missing integrationId',
  });

  checks.push({
    name: 'has_dashboard_route',
    passed: !!crew.dashboardRoute,
    message: crew.dashboardRoute ? undefined : 'Missing dashboardRoute',
  });

  // 3. Worker contract (if applicable)
  if (crew.worker) {
    checks.push({
      name: 'worker_base_url_key',
      passed: crew.worker.baseUrlEnvKey?.endsWith('_BASE_URL') ?? false,
      message: crew.worker.baseUrlEnvKey?.endsWith('_BASE_URL') ? undefined : 'baseUrlEnvKey should end with _BASE_URL',
    });

    checks.push({
      name: 'worker_api_key',
      passed: crew.worker.apiKeySecretKey?.endsWith('_API_KEY') ?? false,
      message: crew.worker.apiKeySecretKey?.endsWith('_API_KEY') ? undefined : 'apiKeySecretKey should end with _API_KEY',
    });

    checks.push({
      name: 'worker_outputs_defined',
      passed: Array.isArray(crew.worker.requiredOutputs) && crew.worker.requiredOutputs.length > 0,
      message: Array.isArray(crew.worker.requiredOutputs) && crew.worker.requiredOutputs.length > 0 ? undefined : 'requiredOutputs should be non-empty array',
    });
  }

  // 4. KPI contract
  const kpiContract = CREW_KPI_CONTRACTS[crewId];
  checks.push({
    name: 'kpi_contract_present',
    passed: !!kpiContract,
    message: kpiContract ? undefined : `No KPI contract defined for crew '${crewId}'`,
  });

  if (kpiContract) {
    const contractValidation = validateCrewKpiContract(crewId);
    checks.push({
      name: 'kpi_contract_valid',
      passed: contractValidation.valid,
      message: contractValidation.valid ? undefined : contractValidation.errors.join('; '),
    });

    // Check primaryMetricId is in allowedKpis
    if (crew.primaryMetricId) {
      const kpiValidation = validateKpiForCrew(crewId, crew.primaryMetricId);
      checks.push({
        name: 'primary_metric_in_contract',
        passed: kpiValidation.valid,
        message: kpiValidation.valid ? undefined : kpiValidation.error,
      });
    }
  }

  // 5. Integration config resolution
  try {
    const config = getCrewIntegrationConfig(crewId);
    checks.push({
      name: 'config_resolver_works',
      passed: config.crewId === crewId,
      message: config.crewId === crewId ? undefined : 'Config resolver returned wrong crewId',
    });
  } catch (err) {
    checks.push({
      name: 'config_resolver_works',
      passed: false,
      message: `Config resolver threw: ${(err as Error).message}`,
    });
  }

  return { crewId, checks };
}

function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         CANONICAL CREW IDENTITY LINEAGE VERIFICATION         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: VerificationResult[] = ALL_CREW_IDS.map(verifyCrewLineage);
  
  let totalChecks = 0;
  let passedChecks = 0;
  let failedCrews: string[] = [];

  for (const result of results) {
    const passed = result.checks.filter(c => c.passed).length;
    const total = result.checks.length;
    totalChecks += total;
    passedChecks += passed;
    
    const allPassed = passed === total;
    const icon = allPassed ? '✅' : '❌';
    
    console.log(`${icon} ${result.crewId.padEnd(12)} ${passed}/${total} checks passed`);
    
    if (!allPassed) {
      failedCrews.push(result.crewId);
      for (const check of result.checks.filter(c => !c.passed)) {
        console.log(`   └─ ❌ ${check.name}: ${check.message}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(64));
  console.log(`\nSUMMARY: ${passedChecks}/${totalChecks} checks passed across ${results.length} crews`);
  
  if (failedCrews.length > 0) {
    console.log(`\n❌ FAILED CREWS: ${failedCrews.join(', ')}`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL LINEAGE CHECKS PASSED');
    process.exit(0);
  }
}

main();
