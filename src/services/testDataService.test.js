/**
 * Tests pour testDataService - données de test EDT
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  addTestCoursesForToday,
  generateTestWeek,
  isTestModeEnabled,
  setTestMode,
  isTestWeekEnabled,
  setTestWeekMode,
} from './testDataService';

describe('testDataService', () => {
  beforeEach(() => {
    setTestMode(false);
    setTestWeekMode(false);
  });

  describe('addTestCoursesForToday', () => {
    it('retourne les événements inchangés si aujourd\'hui a déjà des cours', () => {
      const today = new Date();
      const existingEvents = [
        {
          summary: 'Cours existant',
          start: today,
          end: new Date(today.getTime() + 3600000),
          location: '3.1.08',
          description: 'Professeur : M. Dupont',
        },
      ];
      const result = addTestCoursesForToday(existingEvents);
      expect(result).toEqual(existingEvents);
    });

    it('ajoute des cours de test si aujourd\'hui est un jour de semaine sans cours', () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return; // skip si weekend
      }
      const existingEvents = [];
      const result = addTestCoursesForToday(existingEvents);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('summary');
      expect(result[0]).toHaveProperty('start');
      expect(result[0]).toHaveProperty('end');
      expect(result[0]).toHaveProperty('location');
    });

  });

  describe('generateTestWeek', () => {
    it('génère une liste d\'événements non vide', () => {
      const events = generateTestWeek();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });

    it('chaque événement a les propriétés requises', () => {
      const events = generateTestWeek();
      events.forEach((ev) => {
        expect(ev).toHaveProperty('summary');
        expect(ev).toHaveProperty('start');
        expect(ev).toHaveProperty('end');
        expect(ev).toHaveProperty('location');
        expect(ev).toHaveProperty('description');
      });
    });

    it('les événements sont triés par date', () => {
      const events = generateTestWeek();
      for (let i = 1; i < events.length; i++) {
        const prev = new Date(events[i - 1].start).getTime();
        const curr = new Date(events[i].start).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });
  });

});
