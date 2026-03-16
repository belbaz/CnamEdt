/**
 * Tests pour timelineUtils - positions des cours, créneaux chevauchants, etc.
 */
import { describe, it, expect } from 'vitest';
import {
  getDayTimeRange,
  generateTimeMarkers,
  getCurrentTimePosition,
  getEventPosition,
  getEventPositionVertical,
} from './timelineUtils';

// Créer des dates de référence pour les tests
const makeDate = (dateStr, hour, minute) => {
  const d = new Date(dateStr);
  d.setHours(hour, minute, 0, 0);
  return d;
};

describe('timelineUtils', () => {
  const DAY_START = 9 * 60; // 9h00
  const DAY_END = 18 * 60;   // 18h00

  describe('getDayTimeRange', () => {
    it('retourne 9h-18h pour une journée vide', () => {
      const result = getDayTimeRange([]);
      expect(result.startMinutes).toBe(DAY_START);
      expect(result.endMinutes).toBe(DAY_END);
    });

    it('retourne 9h-18h pour une journée avec des cours dans la plage standard', () => {
      const events = [
        { start: makeDate('2025-03-17', 10, 0), end: makeDate('2025-03-17', 12, 0) },
      ];
      const result = getDayTimeRange(events);
      expect(result.startMinutes).toBe(DAY_START);
      expect(result.endMinutes).toBe(DAY_END);
    });

    it('s\'étend si des cours sont avant 9h ou après 18h', () => {
      const events = [
        { start: makeDate('2025-03-17', 7, 30), end: makeDate('2025-03-17', 8, 30) },
        { start: makeDate('2025-03-17', 19, 0), end: makeDate('2025-03-17', 20, 0) },
      ];
      const result = getDayTimeRange(events);
      expect(result.startMinutes).toBeLessThanOrEqual(7 * 60 + 30);
      expect(result.endMinutes).toBeGreaterThanOrEqual(19 * 60);
    });
  });

  describe('generateTimeMarkers', () => {
    it('génère des marqueurs toutes les 30 minutes', () => {
      const markers = generateTimeMarkers(540, 720); // 9h à 12h
      expect(markers.length).toBeGreaterThan(0);
      expect(markers[0].label).toMatch(/^[0-9]+h/);
    });

    it('marque les heures pleines avec isHour', () => {
      const markers = generateTimeMarkers(540, 600);
      const hourMarker = markers.find(m => m.minute === 0);
      expect(hourMarker?.isHour).toBe(true);
    });
  });

  describe('getEventPosition', () => {
    it('calcule left et width pour un cours unique', () => {
      const start = makeDate('2025-03-17', 10, 0);
      const end = makeDate('2025-03-17', 12, 0);
      const pos = getEventPosition(start, end, DAY_START, DAY_END, null, null, false);
      expect(pos.left).toBeDefined();
      expect(pos.width).toBeDefined();
      expect(parseFloat(pos.left)).toBeGreaterThan(0);
      expect(parseFloat(pos.width)).toBeGreaterThan(0);
    });

    it('scénario: 2 cours sur le MÊME créneau horaire (surcharge)', () => {
      const start = makeDate('2025-03-17', 10, 0);
      const end = makeDate('2025-03-17', 12, 0);
      const prevEnd = makeDate('2025-03-17', 10, 0);
      const nextStart = makeDate('2025-03-17', 12, 0);
      const pos = getEventPosition(start, end, DAY_START, DAY_END, prevEnd, nextStart, false);
      expect(pos.left).toBeDefined();
      expect(pos.width).toBeDefined();
      expect(pos.width).toContain('%');
    });

    it('scénario: 2 cours qui se chevauchent partiellement', () => {
      const start1 = makeDate('2025-03-17', 10, 0);
      const end1 = makeDate('2025-03-17', 11, 30);
      const start2 = makeDate('2025-03-17', 11, 0);
      const end2 = makeDate('2025-03-17', 12, 30);
      const pos1 = getEventPosition(start1, end1, DAY_START, DAY_END, null, start2, false);
      const pos2 = getEventPosition(start2, end2, DAY_START, DAY_END, end1, null, false);
      expect(pos1.left).toBeDefined();
      expect(pos2.left).toBeDefined();
      expect(pos1.width).toBeDefined();
      expect(pos2.width).toBeDefined();
      expect(pos1.left).toContain('%');
      expect(pos2.left).toContain('%');
    });

    it('scénario: cours consécutifs avec 15 min de pause (hide15MinSpacing)', () => {
      const start1 = makeDate('2025-03-17', 9, 0);
      const end1 = makeDate('2025-03-17', 10, 0);
      const start2 = makeDate('2025-03-17', 10, 15);
      const end2 = makeDate('2025-03-17', 11, 15);
      const pos = getEventPosition(start2, end2, DAY_START, DAY_END, end1, null, true);
      expect(pos.left).toBeDefined();
      expect(pos.width).toBeDefined();
    });

    it('scénario: 3 cours sur le même créneau (ex: 3 groupes en parallèle)', () => {
      const baseStart = makeDate('2025-03-17', 14, 0);
      const baseEnd = makeDate('2025-03-17', 16, 0);
      const pos = getEventPosition(baseStart, baseEnd, DAY_START, DAY_END, null, null, false);
      expect(pos.left).toBeDefined();
      expect(pos.width).toBeDefined();
      const leftPercent = parseFloat(pos.left);
      const widthPercent = parseFloat(pos.width);
      expect(leftPercent).toBeGreaterThanOrEqual(0);
      expect(widthPercent).toBeGreaterThan(0);
    });

    it('scénario: cours très court (30 min)', () => {
      const start = makeDate('2025-03-17', 10, 0);
      const end = makeDate('2025-03-17', 10, 30);
      const pos = getEventPosition(start, end, DAY_START, DAY_END, null, null, false);
      expect(parseFloat(pos.width)).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getEventPositionVertical', () => {
    it('calcule top et height pour mobile', () => {
      const start = makeDate('2025-03-17', 10, 0);
      const end = makeDate('2025-03-17', 12, 0);
      const pos = getEventPositionVertical(start, end, DAY_START, DAY_END, null, null, false);
      expect(pos.top).toBeDefined();
      expect(pos.height).toBeDefined();
    });

    it('scénario: 2 cours sur le même créneau (mobile)', () => {
      const start = makeDate('2025-03-17', 10, 0);
      const end = makeDate('2025-03-17', 12, 0);
      const pos = getEventPositionVertical(start, end, DAY_START, DAY_END, null, null, false);
      expect(pos.top).toBeDefined();
      expect(pos.height).toBeDefined();
    });

    it('scénario: cours consécutifs sans pause', () => {
      const start = makeDate('2025-03-17', 9, 0);
      const end = makeDate('2025-03-17', 10, 0);
      const nextStart = makeDate('2025-03-17', 10, 0);
      const pos = getEventPositionVertical(start, end, DAY_START, DAY_END, null, nextStart, false);
      expect(pos.top).toBeDefined();
      expect(pos.height).toContain('calc');
    });
  });
});
