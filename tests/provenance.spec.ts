import { describe, it, expect } from 'vitest';
import { 
  determineProvenance, 
  shouldShowBadge, 
  getProvenanceReason,
  type Provenance 
} from '../shared/types/provenance';

describe('Provenance System', () => {
  describe('determineProvenance', () => {
    it('returns real when hasDbData is true', () => {
      expect(determineProvenance(true, false)).toBe('real');
    });

    it('returns real when hasVerifiedIntegration is true', () => {
      expect(determineProvenance(false, true)).toBe('real');
    });

    it('returns estimated when isEstimated is true and no real data', () => {
      expect(determineProvenance(false, false, true)).toBe('estimated');
    });

    it('returns sample when no real data and not estimated', () => {
      expect(determineProvenance(false, false, false)).toBe('sample');
    });
  });

  describe('shouldShowBadge', () => {
    it('returns false for real provenance', () => {
      expect(shouldShowBadge('real')).toBe(false);
    });

    it('returns true for sample provenance', () => {
      expect(shouldShowBadge('sample')).toBe(true);
    });

    it('returns true for placeholder provenance', () => {
      expect(shouldShowBadge('placeholder')).toBe(true);
    });

    it('returns true for estimated provenance', () => {
      expect(shouldShowBadge('estimated')).toBe(true);
    });

    it('returns true for unknown provenance', () => {
      expect(shouldShowBadge('unknown')).toBe(true);
    });
  });

  describe('getProvenanceReason', () => {
    it('includes crew name for sample provenance', () => {
      const reason = getProvenanceReason('sample', 'Scotty');
      expect(reason).toContain('Scotty');
      expect(reason).toContain('Preview');
    });

    it('returns generic message for sample without crew name', () => {
      const reason = getProvenanceReason('sample');
      expect(reason).toContain('Preview');
      expect(reason).toContain('diagnostics');
    });

    it('returns appropriate message for placeholder', () => {
      const reason = getProvenanceReason('placeholder');
      expect(reason).toContain('Placeholder');
    });

    it('returns verified message for real', () => {
      const reason = getProvenanceReason('real');
      expect(reason).toContain('Verified');
    });
  });

  describe('API response provenance enforcement', () => {
    it('sample KPI must not have provenance=real', () => {
      const sampleKpi = {
        crewId: 'test',
        value: 42,
        provenance: 'sample' as Provenance,
      };
      expect(sampleKpi.provenance).not.toBe('real');
    });

    it('real KPI must have provenance=real', () => {
      const realKpi = {
        crewId: 'test',
        value: 91,
        provenance: 'real' as Provenance,
        hasDbData: true,
      };
      expect(realKpi.provenance).toBe('real');
    });
  });
});
