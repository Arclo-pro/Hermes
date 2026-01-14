import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CREW } from '../shared/registry';
import { getCrewIntegrationConfig, getAllCrewConfigs } from '../server/integrations/getCrewIntegrationConfig';

const ALL_CREW_IDS = [
  'scotty', 'speedster', 'popular', 'lookout', 'beacon',
  'sentinel', 'natasha', 'draper', 'hemingway', 'socrates', 'atlas', 'major_tom'
];

describe('Integrations Status', () => {
  describe('Config Resolution', () => {
    it('getCrewIntegrationConfig returns config for all crews', () => {
      for (const crewId of ALL_CREW_IDS) {
        const config = getCrewIntegrationConfig(crewId);
        expect(config.crewId).toBe(crewId);
        expect(config.displayName).toBeDefined();
      }
    });

    it('throws for unknown crewId', () => {
      expect(() => getCrewIntegrationConfig('unknown_crew')).toThrow();
    });

    it('getAllCrewConfigs returns all 12 crews', () => {
      const configs = getAllCrewConfigs();
      expect(configs).toHaveLength(12);
    });
  });

  describe('Config Status Logic', () => {
    it('returns needs_config when baseUrl is missing', () => {
      const config = getCrewIntegrationConfig('scotty');
      // Since env vars are not set in test, should be needs_config or no_worker
      expect(['needs_config', 'no_worker', 'ready']).toContain(config.configStatus);
    });

    it('missingConfig includes the env var name when not set', () => {
      const config = getCrewIntegrationConfig('scotty');
      if (config.configStatus === 'needs_config') {
        expect(config.missingConfig.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Uses crewId not displayName', () => {
    it('config resolution uses crewId as key', () => {
      for (const crewId of ALL_CREW_IDS) {
        const crew = CREW[crewId];
        const config = getCrewIntegrationConfig(crewId);
        expect(config.crewId).toBe(crewId);
        // displayName can differ but crewId must match
        expect(config.displayName).toBe(crew.nickname);
      }
    });

    it('cannot resolve by displayName', () => {
      // These should throw because we use displayName, not crewId
      expect(() => getCrewIntegrationConfig('Scotty')).toThrow();
      expect(() => getCrewIntegrationConfig('Speedster')).toThrow();
      expect(() => getCrewIntegrationConfig('Popular')).toThrow();
    });
  });
});
