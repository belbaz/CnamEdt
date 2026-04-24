// @ts-nocheck
/**
 * Tests pour eventUtils - gestion des événements EDT
 */
import { describe, it, expect } from 'vitest';
import {
  createSubjectColorMapping,
  getEventTitle,
  groupEventsByDay,
  getColorIndexForSubject,
} from './eventUtils';

describe('eventUtils', () => {
  describe('createSubjectColorMapping', () => {
    it('crée un mapping vide pour une liste vide', () => {
      expect(createSubjectColorMapping([])).toEqual({});
    });

    it('assigne des couleurs aux matières uniques', () => {
      const events = [
        { summary: 'Mathématiques' },
        { summary: 'Informatique' },
      ];
      const mapping = createSubjectColorMapping(events);
      expect(mapping).toHaveProperty('Mathématiques');
      expect(mapping).toHaveProperty('Informatique');
      expect(typeof mapping.Mathématiques).toBe('number');
      expect(typeof mapping.Informatique).toBe('number');
    });

    it('ignore le préfixe USS/UAS dans le summary', () => {
      const events = [
        { summary: 'USSA123 : Algèbre' },
        { summary: 'UAS456 : Base de données' },
      ];
      const mapping = createSubjectColorMapping(events);
      expect(mapping).toHaveProperty('Algèbre');
      expect(mapping).toHaveProperty('Base de données');
    });

    it('ignore les entrées vides ou ":"', () => {
      const events = [
        { summary: '  ' },
        { summary: ':' },
        { summary: 'Maths' },
      ];
      const mapping = createSubjectColorMapping(events);
      expect(Object.keys(mapping)).toEqual(['Maths']);
    });

    it('réutilise la même couleur pour une même matière', () => {
      const events = [
        { summary: 'Maths' },
        { summary: 'Maths' },
        { summary: 'Physique' },
      ];
      const mapping = createSubjectColorMapping(events);
      expect(mapping.Maths).toBe(mapping.Maths);
    });
  });

  describe('getEventTitle', () => {
    it('extrait matière et prof depuis un cours normal', () => {
      const ev = {
        summary: 'Algèbre linéaire',
        description: 'Professeur : - M. Dupont',
        location: 'Salle : 3.1.08',
      };
      const result = getEventTitle(ev);
      expect(result.matiere).toBe('Algèbre linéaire');
      expect(result.prof).toMatch(/Dupont/);
    });

    it('parse les demi-groupes (2 profs avec salles)', () => {
      const ev = {
        summary: 'TP Réseaux',
        description: 'Mr AUCHE salle 21.104 - Professeur : - Madame Kirti SARDESAI',
        location: 'Salle : 30.-1.16',
      };
      const result = getEventTitle(ev);
      expect(result.splitGroup).toBeDefined();
      expect(result.splitGroup.professors).toContain('AUCHE');
      expect(result.splitGroup.professors).toContain('Kirti SARDESAI');
      expect(result.prof).toContain(' / ');
    });

    it('utilise le fallback prof si description vide', () => {
      const ev = {
        summary: 'Cours',
        description: '',
        prof: 'M. Martin',
      };
      const result = getEventTitle(ev);
      expect(result.prof).toBe('M. Martin');
    });

    it('ignore le préfixe USS/UAS dans le summary', () => {
      const ev = {
        summary: 'USS123 : Base de données',
        description: 'Professeur : M. Bernard',
      };
      const result = getEventTitle(ev);
      expect(result.matiere).toBe('Base de données');
    });

    // --- Nouveaux cas ---

    it('demi-groupe format "salle avant prof" (sans mot "salle")', () => {
      const ev = {
        summary: 'TP',
        description:
          'Cours/Exercices Dirigés - 30.-1.16 Mme SARDESAI - 30.-1.27 Mr AUCHE - Professeur : - Madame Kirti SARDESAI',
        location: 'Salle : 30.-1.16',
      };
      const result = getEventTitle(ev);
      expect(result.splitGroup).toBeDefined();
      expect(result.splitGroup.professors).toEqual(
        expect.arrayContaining(['SARDESAI', 'AUCHE'])
      );
      expect(result.splitGroup.rooms).toEqual(
        expect.arrayContaining(['30.-1.16', '30.-1.27'])
      );
    });

    it('prof avec prénom + nom (Monsieur Cédric DU MOUZA)', () => {
      const ev = {
        summary: 'Algorithmique',
        description:
          'Cours/Exercices Dirigés - Professeur : - Monsieur Cédric DU MOUZA',
      };
      const result = getEventTitle(ev);
      expect(result.prof).toBe('Cédric DU MOUZA');
    });

    it('prof vide "?" dans label → fallback sur le nom dans la description', () => {
      const ev = {
        summary: 'Cours',
        description: 'Cours/Exercices Dirigés - Mr CEDRIC FONTAINE - Professeur : - ?',
      };
      const result = getEventTitle(ev);
      expect(result.prof).toBe('CEDRIC FONTAINE');
    });

    it('prof sur ligne suivante (ICS multiligne)', () => {
      const ev = {
        summary: 'Cours',
        description: 'Cours/Exercices Dirigés\nProfesseur :\n- Madame Kirti SARDESAI',
      };
      const result = getEventTitle(ev);
      expect(result.prof).toBe('Kirti SARDESAI');
    });

    it('label "Professeur : - ?" sans autre info → prof vide', () => {
      const ev = {
        summary: 'Cours',
        description: 'Cours/Exercices Dirigés - Professeur : - ?',
      };
      const result = getEventTitle(ev);
      expect(result.prof).toBe('');
    });

    it('demi-groupe mixte : 1 prof+salle + prof dans label + 2e salle via location', () => {
      const ev = {
        summary: 'TP',
        description: 'Mr AUCHE salle 21.104 - Professeur : - Madame Kirti SARDESAI',
        location: 'Salle : 30.-1.16',
      };
      const result = getEventTitle(ev);
      expect(result.splitGroup).toBeDefined();
      expect(result.splitGroup.professors).toEqual(['AUCHE', 'Kirti SARDESAI']);
      expect(result.splitGroup.rooms).toEqual(['21.104', '30.-1.16']);
    });

    it('prof sans titre (JEAN AUCHE) dans un demi-groupe', () => {
      const ev = {
        summary: 'TP',
        description: 'JEAN AUCHE salle 21.104 - Professeur : - Madame Kirti SARDESAI',
        location: 'Salle : 30.-1.16',
      };
      const result = getEventTitle(ev);
      expect(result.splitGroup).toBeDefined();
      expect(result.splitGroup.professors).toEqual(
        expect.arrayContaining(['JEAN AUCHE', 'Kirti SARDESAI'])
      );
    });

    it('trois profs sur le même créneau (format salle avant prof)', () => {
      const ev = {
        summary: 'TP',
        description:
          'Cours/Exercices Dirigés - 30.-1.16 Mme SARDESAI - 30.-1.27 Mr AUCHE - 21.104 M. DUPONT',
      };
      const result = getEventTitle(ev);
      expect(result.splitGroup).toBeDefined();
      expect(result.splitGroup.professors.length).toBe(3);
      expect(result.splitGroup.rooms.length).toBe(3);
    });

    it('description vide → prof vide', () => {
      const ev = { summary: 'Cours', description: '' };
      const result = getEventTitle(ev);
      expect(result.prof).toBe('');
      expect(result.splitGroup).toBeUndefined();
    });

    it('évite de reconnaître "Cours/Exercices Dirigés" comme un prof', () => {
      const ev = {
        summary: 'Cours',
        description: 'Cours/Exercices Dirigés - Professeur : - M. DUPONT',
      };
      const result = getEventTitle(ev);
      expect(result.prof).toBe('DUPONT');
    });
  });

  describe('getColorIndexForSubject', () => {
    it('retourne 0 pour une matière inconnue', () => {
      expect(getColorIndexForSubject('Inconnue', {})).toBe(0);
    });

    it('retourne l\'index pour une matière connue', () => {
      const subjectColors = { Maths: 3, Physique: 7 };
      expect(getColorIndexForSubject('Maths', subjectColors)).toBe(3);
    });
  });

  describe('groupEventsByDay', () => {
    it('groupe les événements par jour', () => {
      const events = [
        { start: new Date('2025-03-17T09:00:00') },
        { start: new Date('2025-03-17T14:00:00') },
        { start: new Date('2025-03-18T10:00:00') },
      ];
      const grouped = groupEventsByDay(events, 'short', 'fr');
      const keys = Object.keys(grouped);
      expect(keys.length).toBe(2);
      expect(grouped[keys[0]].length).toBe(2);
      expect(grouped[keys[1]].length).toBe(1);
    });

    it('retourne un objet vide pour une liste vide', () => {
      expect(groupEventsByDay([], 'short', 'fr')).toEqual({});
    });
  });
});

