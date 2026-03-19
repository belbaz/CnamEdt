// @ts-nocheck
/**
 * Tests pour compactModeUtils - mode de compacité
 */
import { describe, it, expect } from 'vitest';
import { getCompactModeValues } from './compactModeUtils';

describe('compactModeUtils', () => {
  describe('getCompactModeValues', () => {
    it('retourne des valeurs pour compactMode 0', () => {
      const result = getCompactModeValues(0);
      expect(result).toHaveProperty('dayHeightFactor');
      expect(result).toHaveProperty('cardTopPadding');
      expect(result).toHaveProperty('dayHeaderMargin');
      expect(result).toHaveProperty('dayHeaderPadding');
      expect(result).toHaveProperty('eventsContainerPadding');
    });

    it('retourne des valeurs pour compactMode 10', () => {
      const result = getCompactModeValues(10);
      expect(result.dayHeightFactor).toBeGreaterThan(0);
      expect(result.cardTopPadding).toBeGreaterThan(0);
    });

    it('mode compact (0) a des valeurs plus petites que mode normal (10)', () => {
      const compact = getCompactModeValues(0);
      const normal = getCompactModeValues(10);
      expect(compact.dayHeightFactor).toBeLessThan(normal.dayHeightFactor);
      expect(compact.cardTopPadding).toBeLessThan(normal.cardTopPadding);
    });

    it('dayHeightFactor est entre 0.6 et 0.7', () => {
      const result = getCompactModeValues(5);
      expect(result.dayHeightFactor).toBeGreaterThanOrEqual(0.59);
      expect(result.dayHeightFactor).toBeLessThanOrEqual(0.71);
    });
  });
});

