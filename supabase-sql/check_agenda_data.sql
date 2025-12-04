-- Requêtes pour diagnostiquer la table edt_agenda
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Compter le nombre total de notes actuellement dans la table
SELECT COUNT(*) as total_notes FROM edt_agenda;

-- 2. Voir toutes les notes avec leurs métadonnées
SELECT 
    id,
    user_id,
    course_uid,
    LENGTH(notes) as notes_length,
    created_at,
    updated_at,
    labels,
    entry_labels,
    modification_history
FROM edt_agenda
ORDER BY updated_at DESC
LIMIT 100;

-- 3. Compter les notes par utilisateur
SELECT 
    user_id,
    COUNT(*) as note_count,
    MIN(created_at) as first_note,
    MAX(updated_at) as last_update
FROM edt_agenda
GROUP BY user_id
ORDER BY note_count DESC;

-- 4. Voir les notes les plus récemment modifiées
SELECT 
    id,
    user_id,
    course_uid,
    SUBSTRING(notes, 1, 100) as notes_preview,
    created_at,
    updated_at
FROM edt_agenda
ORDER BY updated_at DESC
LIMIT 20;

-- 5. Vérifier s'il y a des notes avec des course_uid qui n'existent plus dans events
SELECT 
    a.id,
    a.user_id,
    a.course_uid,
    a.created_at,
    a.updated_at
FROM edt_agenda a
LEFT JOIN events e ON e.uid = a.course_uid
WHERE e.uid IS NULL
ORDER BY a.updated_at DESC;

-- 6. Voir l'historique des modifications (si modification_history est rempli)
SELECT 
    id,
    user_id,
    course_uid,
    modification_history,
    created_at,
    updated_at
FROM edt_agenda
WHERE modification_history IS NOT NULL 
  AND jsonb_array_length(modification_history) > 0
ORDER BY updated_at DESC
LIMIT 50;








