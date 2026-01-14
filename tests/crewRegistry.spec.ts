import { describe, it, expect } from 'vitest';
import { CREW, type CrewDefinition } from '../shared/registry';
import { CREW_KPI_CONTRACTS, validateCrewKpiContract } from '../shared/crew/kpiSchemas';

const ALL_CREW_IDS = [
  'scotty', 'speedster', 'popular', 'lookout', 'beacon',
  'sentinel', 'natasha', 'draper', 'hemingway', 'socrates', 'atlas', 'major_tom'
];

describe('Crew Registry', () => {
  describe('Completeness', () => {
    it('includes all 12 crews', () => {
      const registryIds = Object.keys(CREW);
      expect(registryIds).toHaveLength(12);
      for (const crewId of ALL_CREW_IDS) {
        expect(CREW[crewId]).toBeDefined();
      }
    });

    it('every crew has required fields', () => {
      for (const crewId of ALL_CREW_IDS) {
        const crew = CREW[crewId] as CrewDefinition;
        expect(crew.crewId).toBe(crewId);
        expect(crew.nickname).toBeDefined();
        expect(crew.integrationId).toBeDefined();
        expect(crew.dashboardRoute).toBeDefined();
      }
    });

    it('every crew with a worker has proper worker contract', () => {
      for (const crewId of ALL_CREW_IDS) {
        const crew = CREW[crewId] as CrewDefinition;
        if (crew.worker) {
          expect(crew.worker.baseUrlEnvKey).toBeDefined();
          expect(crew.worker.apiKeySecretKey).toBeDefined();
          expect(crew.worker.healthPath).toBeDefined();
          expect(crew.worker.runPath).toBeDefined();
          expect(crew.worker.requiredOutputs).toBeDefined();
          expect(Array.isArray(crew.worker.requiredOutputs)).toBe(true);
        }
      }
    });
  });

  describe('No duplicates', () => {
    it('crewIds are unique', () => {
      const crewIds = Object.keys(CREW);
      const uniqueIds = new Set(crewIds);
      expect(uniqueIds.size).toBe(crewIds.length);
    });

    it('integrationIds are unique', () => {
      const integrationIds = Object.values(CREW).map(c => (c as CrewDefinition).integrationId);
      const uniqueIds = new Set(integrationIds);
      expect(uniqueIds.size).toBe(integrationIds.length);
    });

    it('dashboard routes are unique', () => {
      const routes = Object.values(CREW).map(c => (c as CrewDefinition).dashboardRoute);
      const uniqueRoutes = new Set(routes);
      expect(uniqueRoutes.size).toBe(routes.length);
    });
  });

  describe('Config key naming', () => {
    it('baseUrlEnvKey ends with _BASE_URL', () => {
      for (const crewId of ALL_CREW_IDS) {
        const crew = CREW[crewId] as CrewDefinition;
        if (crew.worker?.baseUrlEnvKey) {
          expect(crew.worker.baseUrlEnvKey).toMatch(/_BASE_URL$/);
        }
      }
    });

    it('apiKeySecretKey ends with _API_KEY', () => {
      for (const crewId of ALL_CREW_IDS) {
        const crew = CREW[crewId] as CrewDefinition;
        if (crew.worker?.apiKeySecretKey) {
          expect(crew.worker.apiKeySecretKey).toMatch(/_API_KEY$/);
        }
      }
    });
  });

  describe('KPI contract integrity', () => {
    it('every crew has a KPI contract', () => {
      for (const crewId of ALL_CREW_IDS) {
        expect(CREW_KPI_CONTRACTS[crewId]).toBeDefined();
      }
    });

    it('primaryKpi is in allowedKpis for every crew', () => {
      for (const crewId of ALL_CREW_IDS) {
        const result = validateCrewKpiContract(crewId);
        expect(result.valid).toBe(true);
        if (!result.valid) {
          console.error(`${crewId}: ${result.errors.join(', ')}`);
        }
      }
    });
  });
});
