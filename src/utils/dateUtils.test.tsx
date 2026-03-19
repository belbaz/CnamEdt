// @ts-nocheck
/**
 * Tests pour dateUtils - gestion des dates et semaines
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getLocale,
  getMonday,
  getCurrentWeek,
  isToday,
  extractAvailableWeeks,
  selectBestWeek,
  getSchoolYearRange,
  getSchoolYearLabel,
} from './dateUtils';

describe('dateUtils', () => {
  describe('getLocale', () => {
    it('retourne fr-FR pour fr', () => {
      expect(getLocale('fr')).toBe('fr-FR');
    });
    it('retourne en-US pour en', () => {
      expect(getLocale('en')).toBe('en-US');
    });
  });

  describe('getMonday', () => {
    it('retourne le lundi pour un lundi', () => {
      const monday = new Date('2025-03-17');
      const result = getMonday(monday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(17);
    });

    it('retourne le lundi de la semaine pour un mercredi', () => {
      const wednesday = new Date('2025-03-19');
      const result = getMonday(wednesday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(17);
    });

    it('retourne le lundi précédent pour un dimanche', () => {
      const sunday = new Date('2025-03-16');
      const result = getMonday(sunday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(10);
    });
  });

  describe('isToday', () => {
    it('retourne true pour aujourd\'hui', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('retourne false pour hier', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('extractAvailableWeeks', () => {
    it('extrait les semaines à partir des événements', () => {
      const events = [
        { start: new Date('2025-03-17T09:00:00') },
        { start: new Date('2025-03-18T10:00:00') },
        { start: new Date('2025-03-24T14:00:00') },
      ];
      const weeks = extractAvailableWeeks(events, 'fr');
      expect(weeks.length).toBe(2);
      expect(weeks[0].monday.getDate()).toBe(17);
      expect(weeks[1].monday.getDate()).toBe(24);
    });

    it('retourne un tableau vide pour une liste vide', () => {
      expect(extractAvailableWeeks([], 'fr')).toEqual([]);
    });
  });

  describe('selectBestWeek', () => {
    it('retourne null pour un tableau vide', () => {
      expect(selectBestWeek([])).toBeNull();
    });

    it('retourne la semaine actuelle si elle existe', () => {
      const currentWeek = getCurrentWeek();
      const weeks = [
        { monday: new Date(currentWeek), sunday: new Date(), label: 'Semaine 1' },
      ];
      const result = selectBestWeek(weeks);
      expect(result).toBeTruthy();
      expect(result.monday.getTime()).toBe(currentWeek.getTime());
    });
  });

  describe('getSchoolYearRange', () => {
    it('retourne sept-août pour une date en septembre', () => {
      const ref = new Date('2025-09-15');
      const { start, end } = getSchoolYearRange(ref);
      expect(start.getFullYear()).toBe(2025);
      expect(start.getMonth()).toBe(8); // septembre
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(7); // août
    });

    it('retourne l\'année précédente pour une date en janvier', () => {
      const ref = new Date('2025-01-15');
      const { start, end } = getSchoolYearRange(ref);
      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(8);
      expect(end.getFullYear()).toBe(2025);
      expect(end.getMonth()).toBe(7);
    });
  });

  describe('getSchoolYearLabel', () => {
    it('retourne 2024-2025 pour janvier 2025', () => {
      const ref = new Date('2025-01-15');
      expect(getSchoolYearLabel(ref)).toBe('2024-2025');
    });

    it('retourne 2025-2026 pour septembre 2025', () => {
      const ref = new Date('2025-09-15');
      expect(getSchoolYearLabel(ref)).toBe('2025-2026');
    });
  });
});

