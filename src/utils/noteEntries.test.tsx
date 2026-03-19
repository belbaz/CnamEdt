// @ts-nocheck
/**
 * Tests pour noteEntries - gestion des notes de cours
 */
import { describe, it, expect } from 'vitest';
import {
  sanitizeNoteEntries,
  parseStoredNoteValue,
  HIDDEN_LABEL_PLACEHOLDER,
  buildPersistableNotesAndLabels,
  buildNotePreview,
  areNoteEntriesEqual,
  normalizeIncomingNotes,
} from './noteEntries';

describe('noteEntries', () => {
  describe('sanitizeNoteEntries', () => {
    it('retourne un tableau vide pour une entrée non-tableau', () => {
      expect(sanitizeNoteEntries(null)).toEqual([]);
      expect(sanitizeNoteEntries(undefined)).toEqual([]);
    });

    it('supprime les entrées vides', () => {
      expect(sanitizeNoteEntries(['', '  ', 'note'])).toEqual(['note']);
    });

    it('conserve le HIDDEN_LABEL_PLACEHOLDER', () => {
      const result = sanitizeNoteEntries([HIDDEN_LABEL_PLACEHOLDER, 'texte']);
      expect(result).toContain(HIDDEN_LABEL_PLACEHOLDER);
      expect(result).toContain('texte');
    });

    it('normalise les retours chariot (supprime \\r)', () => {
      const result = sanitizeNoteEntries(['note\r\navec\rretour']);
      expect(result[0]).not.toContain('\r');
    });
  });

  describe('parseStoredNoteValue', () => {
    it('retourne [] pour null/undefined', () => {
      expect(parseStoredNoteValue(null)).toEqual([]);
      expect(parseStoredNoteValue(undefined)).toEqual([]);
    });

    it('parse un tableau JSON stringifié', () => {
      const json = '["note1", "note2"]';
      expect(parseStoredNoteValue(json)).toEqual(['note1', 'note2']);
    });

    it('retourne [texte] pour une chaîne simple non-JSON', () => {
      expect(parseStoredNoteValue('ma note')).toEqual(['ma note']);
    });

    it('gère un tableau direct', () => {
      expect(parseStoredNoteValue(['a', 'b'])).toEqual(['a', 'b']);
    });
  });

  describe('buildPersistableNotesAndLabels', () => {
    it('supprime les entrées sans texte ni label', () => {
      const { entries, labels } = buildPersistableNotesAndLabels(['', 'note'], {});
      expect(entries).toEqual(['note']);
    });

    it('utilise le placeholder pour une entrée avec labels mais sans texte', () => {
      const { entries, labels } = buildPersistableNotesAndLabels([''], { '0': ['Distanciel'] });
      expect(entries).toContain(HIDDEN_LABEL_PLACEHOLDER);
      expect(Object.keys(labels).length).toBeGreaterThan(0);
      expect(Object.values(labels).flat()).toContain('Distanciel');
    });
  });

  describe('buildNotePreview', () => {
    it('retourne une chaîne vide pour un tableau vide', () => {
      expect(buildNotePreview([])).toBe('');
    });

    it('concatène les notes avec maxEntries', () => {
      const preview = buildNotePreview(['a', 'b', 'c'], 2);
      expect(preview).toContain('a');
      expect(preview).toContain('b');
      expect(preview).toContain('+1 autre');
    });
  });

  describe('areNoteEntriesEqual', () => {
    it('retourne true pour des tableaux identiques', () => {
      expect(areNoteEntriesEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    });

    it('retourne false pour des tableaux de longueur différente', () => {
      expect(areNoteEntriesEqual(['a'], ['a', 'b'])).toBe(false);
    });

    it('retourne false pour des contenus différents', () => {
      expect(areNoteEntriesEqual(['a'], ['b'])).toBe(false);
    });
  });

  describe('normalizeIncomingNotes', () => {
    it('normalise un tableau', () => {
      expect(normalizeIncomingNotes(['note'])).toEqual(['note']);
    });

    it('normalise une chaîne JSON', () => {
      expect(normalizeIncomingNotes('["x"]')).toEqual(['x']);
    });
  });
});

