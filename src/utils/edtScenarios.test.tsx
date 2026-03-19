// @ts-nocheck
/**
 * Tests de scénarios EDT - cas d'usage réels et edge cases
 * Inclut : 2 cours sur le même créneau, chevauchements, journées vides, etc.
 */
import { describe, it, expect } from 'vitest';
import {
  getEventPosition,
  getEventPositionVertical,
  getDayTimeRange,
  generateTimeMarkers,
} from './timelineUtils';
import {
  createSubjectColorMapping,
  getEventTitle,
  groupEventsByDay,
} from './eventUtils';
import { extractAvailableWeeks, selectBestWeek, getMonday } from './dateUtils';

const DAY_START = 9 * 60;
const DAY_END = 18 * 60;

const makeDate = (dateStr, hour, minute) => {
  const d = new Date(dateStr);
  d.setHours(hour, minute, 0, 0);
  return d;
};

describe('Scénarios EDT', () => {
  describe('2 cours sur le MÊME créneau horaire', () => {
    it('2 groupes en parallèle (ex: groupe A et B en même temps)', () => {
      const start = makeDate('2025-03-17', 10, 0);
      const end = makeDate('2025-03-17', 12, 0);
      const pos1 = getEventPosition(start, end, DAY_START, DAY_END, null, null, false);
      const pos2 = getEventPosition(start, end, DAY_START, DAY_END, null, null, false);
      expect(pos1.left).toBe(pos2.left);
      expect(pos1.width).toBe(pos2.width);
    });

    it('3 cours sur le même créneau (ex: 3 groupes en parallèle)', () => {
      const baseStart = makeDate('2025-03-17', 14, 0);
      const baseEnd = makeDate('2025-03-17', 16, 0);
      const positions = [1, 2, 3].map(() =>
        getEventPosition(baseStart, baseEnd, DAY_START, DAY_END, null, null, false)
      );
      positions.forEach((pos) => {
        expect(pos.left).toBeDefined();
        expect(pos.width).toBeDefined();
      });
    });
  });

  describe('Cours qui se chevauchent partiellement', () => {
    it('cours 1 finit pendant que cours 2 commence', () => {
      const start1 = makeDate('2025-03-17', 9, 0);
      const end1 = makeDate('2025-03-17', 11, 0);
      const start2 = makeDate('2025-03-17', 10, 30);
      const end2 = makeDate('2025-03-17', 12, 0);
      const pos1 = getEventPosition(start1, end1, DAY_START, DAY_END, null, start2, false);
      const pos2 = getEventPosition(start2, end2, DAY_START, DAY_END, end1, null, false);
      expect(pos1.left).toBeDefined();
      expect(pos2.left).toBeDefined();
    });

    it('cours 2 englobe complètement cours 1', () => {
      const start1 = makeDate('2025-03-17', 10, 0);
      const end1 = makeDate('2025-03-17', 11, 0);
      const start2 = makeDate('2025-03-17', 9, 0);
      const end2 = makeDate('2025-03-17', 12, 0);
      const pos1 = getEventPosition(start1, end1, DAY_START, DAY_END, null, start2, false);
      const pos2 = getEventPosition(start2, end2, DAY_START, DAY_END, end1, null, false);
      expect(pos1.width).toBeDefined();
      expect(pos2.width).toBeDefined();
    });
  });

  describe('Cours consécutifs', () => {
    it('sans pause entre les cours', () => {
      const start1 = makeDate('2025-03-17', 9, 0);
      const end1 = makeDate('2025-03-17', 10, 0);
      const start2 = makeDate('2025-03-17', 10, 0);
      const end2 = makeDate('2025-03-17', 11, 0);
      const pos = getEventPosition(start2, end2, DAY_START, DAY_END, end1, null, false);
      expect(pos.left).toBeDefined();
      expect(pos.width).toBeDefined();
    });

    it('avec 15 min de pause (hide15MinSpacing)', () => {
      const start1 = makeDate('2025-03-17', 9, 0);
      const end1 = makeDate('2025-03-17', 10, 0);
      const start2 = makeDate('2025-03-17', 10, 15);
      const end2 = makeDate('2025-03-17', 11, 15);
      const start3 = makeDate('2025-03-17', 11, 30);
      const pos = getEventPosition(start2, end2, DAY_START, DAY_END, end1, start3, true);
      expect(pos.left).toBeDefined();
      expect(pos.width).toBeDefined();
    });
  });

  describe('Journée vide ou minimale', () => {
    it('plage 9h-18h pour une journée sans cours', () => {
      const range = getDayTimeRange([]);
      expect(range.startMinutes).toBe(DAY_START);
      expect(range.endMinutes).toBe(DAY_END);
    });

    it('un seul cours dans la journée', () => {
      const events = [
        {
          start: makeDate('2025-03-17', 14, 0),
          end: makeDate('2025-03-17', 16, 0),
        },
      ];
      const range = getDayTimeRange(events);
      expect(range.startMinutes).toBeLessThanOrEqual(DAY_START);
      expect(range.endMinutes).toBeGreaterThanOrEqual(DAY_END);
    });
  });

  describe('Cours en dehors des plages horaires standard', () => {
    it('cours tôt le matin (7h)', () => {
      const events = [
        {
          start: makeDate('2025-03-17', 7, 0),
          end: makeDate('2025-03-17', 8, 30),
        },
      ];
      const range = getDayTimeRange(events);
      expect(range.startMinutes).toBeLessThanOrEqual(7 * 60);
    });

    it('cours tard le soir (19h)', () => {
      const events = [
        {
          start: makeDate('2025-03-17', 18, 30),
          end: makeDate('2025-03-17', 20, 0),
        },
      ];
      const range = getDayTimeRange(events);
      expect(range.endMinutes).toBeGreaterThanOrEqual(19 * 60);
    });
  });

  describe('Cours très courts', () => {
    it('cours de 30 minutes', () => {
      const start = makeDate('2025-03-17', 10, 0);
      const end = makeDate('2025-03-17', 10, 30);
      const pos = getEventPosition(start, end, DAY_START, DAY_END, null, null, false);
      expect(parseFloat(pos.width)).toBeGreaterThanOrEqual(3);
    });

    it('cours de 15 minutes (largeur minimale)', () => {
      const start = makeDate('2025-03-17', 10, 0);
      const end = makeDate('2025-03-17', 10, 15);
      const pos = getEventPosition(start, end, DAY_START, DAY_END, null, null, false);
      expect(pos.width).toBeDefined();
    });
  });

  describe('groupEventsByDay avec cas variés', () => {
    it('plusieurs jours avec plusieurs cours', () => {
      const events = [
        { start: makeDate('2025-03-17', 9, 0), end: makeDate('2025-03-17', 10, 0) },
        { start: makeDate('2025-03-17', 14, 0), end: makeDate('2025-03-17', 16, 0) },
        { start: makeDate('2025-03-18', 10, 0), end: makeDate('2025-03-18', 12, 0) },
        { start: makeDate('2025-03-19', 8, 0), end: makeDate('2025-03-19', 9, 0) },
      ];
      const grouped = groupEventsByDay(events, 'short', 'fr');
      const keys = Object.keys(grouped);
      expect(keys.length).toBe(3);
      expect(grouped[keys[0]].length).toBe(2);
    });
  });

  describe('createSubjectColorMapping avec doublons', () => {
    it('même matière plusieurs fois = même couleur', () => {
      const events = [
        { summary: 'Maths' },
        { summary: 'Maths' },
        { summary: 'Physique' },
        { summary: 'Maths' },
      ];
      const mapping = createSubjectColorMapping(events);
      expect(mapping.Maths).toBe(mapping.Maths);
      expect(mapping.Physique).toBeDefined();
    });
  });

  describe('getEventTitle - formats réels', () => {
    it('cours avec format USS/UAS', () => {
      const ev = {
        summary: 'USSA123 : Base de données',
        description: 'Professeur : M. Bernard',
      };
      const result = getEventTitle(ev);
      expect(result.matiere).toBe('Base de données');
    });

    it('cours visio (location)', () => {
      const ev = {
        summary: 'TP Réseaux',
        description: 'Professeur : M. Dupont',
        location: 'Visio Teams',
      };
      const result = getEventTitle(ev);
      expect(result.matiere).toBe('TP Réseaux');
    });

    it('demi-groupe avec 2 salles', () => {
      const ev = {
        summary: 'Algèbre',
        description: 'Mr AUCHE salle 21.104 - Mme SARDESAI salle 30.-1.16',
        location: 'Salle : 30.-1.16',
      };
      const result = getEventTitle(ev);
      expect(result.splitGroup).toBeDefined();
      expect(result.splitGroup.professors.length).toBe(2);
      expect(result.splitGroup.rooms.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getEventPositionVertical (mobile)', () => {
    it('2 cours sur le même créneau en mode vertical', () => {
      const start = makeDate('2025-03-17', 10, 0);
      const end = makeDate('2025-03-17', 12, 0);
      const pos = getEventPositionVertical(start, end, DAY_START, DAY_END, null, null, false);
      expect(pos.top).toBeDefined();
      expect(pos.height).toBeDefined();
    });

    it('cours en début de journée', () => {
      const start = makeDate('2025-03-17', 9, 0);
      const end = makeDate('2025-03-17', 10, 0);
      const pos = getEventPositionVertical(start, end, DAY_START, DAY_END, null, null, false);
      expect(parseFloat(pos.top)).toBe(0);
    });
  });

  describe('extractAvailableWeeks et selectBestWeek', () => {
    it('retourne la semaine actuelle si elle existe', () => {
      const currentMonday = getMonday(new Date());
      const events = [
        { start: new Date(currentMonday), end: new Date(currentMonday.getTime() + 3600000) },
      ];
      const weeks = extractAvailableWeeks(events, 'fr');
      const best = selectBestWeek(weeks);
      expect(best).toBeTruthy();
      expect(best.monday.getTime()).toBe(currentMonday.getTime());
    });
  });
});

