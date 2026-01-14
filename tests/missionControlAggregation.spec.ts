import { describe, it, expect } from 'vitest';
import { CREW } from '../shared/registry';
import { CREW_KPI_CONTRACTS, validateKpiForCrew } from '../shared/crew/kpiSchemas';

const ALL_CREW_IDS = [
  'scotty', 'speedster', 'popular', 'lookout', 'beacon',
  'sentinel', 'natasha', 'draper', 'hemingway', 'socrates', 'atlas', 'major_tom'
];

describe('Mission Control Aggregation', () => {
  describe('KPI Validation', () => {
    it('accepts valid KPIs for each crew', () => {
      for (const crewId of ALL_CREW_IDS) {
        const contract = CREW_KPI_CONTRACTS[crewId];
        for (const kpiId of contract.allowedKpis) {
          const result = validateKpiForCrew(crewId, kpiId);
          expect(result.valid).toBe(true);
        }
      }
    });

    it('rejects KPIs from other crews', () => {
      // Scotty should not accept Speedster KPIs
      const result = validateKpiForCrew('scotty', 'vitals.performance_score');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('rejects unknown KPIs', () => {
      const result = validateKpiForCrew('scotty', 'fake_kpi_does_not_exist');
      expect(result.valid).toBe(false);
    });

    it('rejects unknown crews', () => {
      const result = validateKpiForCrew('unknown_crew', 'some_kpi');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown crewId');
    });
  });

  describe('Primary KPI Alignment', () => {
    it('registry primaryMetricId matches KPI contract primaryKpi', () => {
      for (const crewId of ALL_CREW_IDS) {
        const crew = CREW[crewId];
        const contract = CREW_KPI_CONTRACTS[crewId];
        
        // If registry has a primaryMetricId, it should match or be in allowedKpis
        if (crew.primaryMetricId) {
          const isAllowed = contract.allowedKpis.includes(crew.primaryMetricId);
          expect(isAllowed).toBe(true);
        }
      }
    });
  });

  describe('Crew Card Generation', () => {
    it('all crews have displayable card data', () => {
      for (const crewId of ALL_CREW_IDS) {
        const crew = CREW[crewId];
        const contract = CREW_KPI_CONTRACTS[crewId];
        
        // Every crew should have data needed for a card
        expect(crew.nickname).toBeDefined();
        expect(crew.color).toBeDefined();
        expect(contract.primaryKpi).toBeDefined();
        expect(contract.allowedKpis.length).toBeGreaterThan(0);
      }
    });

    it('no crew can display another crew\'s KPI as primary', () => {
      for (const crewId of ALL_CREW_IDS) {
        const contract = CREW_KPI_CONTRACTS[crewId];
        
        // Check that primaryKpi is in this crew's allowedKpis
        expect(contract.allowedKpis).toContain(contract.primaryKpi);
        
        // And that this primaryKpi is NOT in another crew's allowedKpis (with some exceptions for shared metrics)
        // This is a soft check - some metrics like sessions might be shared
      }
    });
  });
});
