-- Requêtes pour consulter les notes archivées
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Voir toutes les notes archivées récemment
SELECT 
    id,
    original_id,
    user_id,
    course_uid,
    new_course_uid,
    archive_reason,
    SUBSTRING(notes, 1, 200) as notes_preview,
    archived_at,
    metadata
FROM edt_agenda_archive
ORDER BY archived_at DESC
LIMIT 50;

-- 2. Compter les notes archivées par raison
SELECT 
    archive_reason,
    COUNT(*) as count,
    MIN(archived_at) as first_archive,
    MAX(archived_at) as last_archive
FROM edt_agenda_archive
GROUP BY archive_reason
ORDER BY count DESC;

-- 3. Voir les notes archivées pour un utilisateur spécifique
-- Remplacez 'USER_ID' par l'ID de l'utilisateur
SELECT 
    id,
    original_id,
    course_uid,
    new_course_uid,
    archive_reason,
    notes,
    labels,
    entry_labels,
    archived_at,
    metadata
FROM edt_agenda_archive
WHERE user_id = 'USER_ID'
ORDER BY archived_at DESC;

-- 4. Voir les notes archivées pour un course_uid spécifique (ancien ou nouveau)
-- Remplacez 'COURSE_UID' par le course_uid
SELECT 
    id,
    original_id,
    user_id,
    course_uid,
    new_course_uid,
    archive_reason,
    notes,
    labels,
    entry_labels,
    archived_at,
    metadata
FROM edt_agenda_archive
WHERE course_uid = 'COURSE_UID' OR new_course_uid = 'COURSE_UID'
ORDER BY archived_at DESC;

-- 5. Récupérer une note archivée complète (pour restauration)
-- Remplacez ARCHIVE_ID par l'ID de la note archivée
SELECT 
    *
FROM edt_agenda_archive
WHERE id = ARCHIVE_ID;

-- 6. Voir les notes fusionnées (archive_reason = 'merged')
SELECT 
    a.id,
    a.original_id,
    a.user_id,
    a.course_uid as old_course_uid,
    a.new_course_uid,
    a.notes as archived_notes,
    a.labels as archived_labels,
    a.entry_labels as archived_entry_labels,
    a.archived_at,
    a.metadata,
    -- Voir la note actuelle (fusionnée)
    n.id as current_note_id,
    n.course_uid as current_course_uid,
    SUBSTRING(n.notes, 1, 200) as current_notes_preview
FROM edt_agenda_archive a
LEFT JOIN edt_agenda n ON n.user_id = a.user_id AND n.course_uid = a.new_course_uid
WHERE a.archive_reason = 'merged'
ORDER BY a.archived_at DESC
LIMIT 50;














