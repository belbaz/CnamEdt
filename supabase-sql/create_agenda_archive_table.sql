-- Table d'archive pour sauvegarder les notes supprimées ou fusionnées
-- Permet de récupérer les données en cas de problème

CREATE TABLE IF NOT EXISTS edt_agenda_archive (
    id BIGSERIAL PRIMARY KEY,
    original_id BIGINT, -- ID de la note originale dans edt_agenda (avant suppression)
    user_id TEXT NOT NULL,
    course_uid TEXT NOT NULL, -- Ancien course_uid (avant migration)
    notes TEXT NOT NULL,
    labels JSONB DEFAULT '[]'::jsonb,
    entry_labels JSONB DEFAULT '{}'::jsonb,
    modification_history JSONB DEFAULT '[]'::jsonb,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archive_reason TEXT, -- 'merged', 'deleted', 'orphan_migration', etc.
    new_course_uid TEXT, -- Nouveau course_uid si migration
    metadata JSONB DEFAULT '{}'::jsonb -- Informations supplémentaires (ex: raison de l'archivage)
);

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_edt_agenda_archive_user_id ON edt_agenda_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_edt_agenda_archive_course_uid ON edt_agenda_archive(course_uid);
CREATE INDEX IF NOT EXISTS idx_edt_agenda_archive_original_id ON edt_agenda_archive(original_id);
CREATE INDEX IF NOT EXISTS idx_edt_agenda_archive_archived_at ON edt_agenda_archive(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_edt_agenda_archive_reason ON edt_agenda_archive(archive_reason);

-- Commentaires pour la documentation
COMMENT ON TABLE edt_agenda_archive IS 'Archive des notes supprimées ou fusionnées pour permettre la récupération des données';
COMMENT ON COLUMN edt_agenda_archive.original_id IS 'ID de la note originale dans edt_agenda (avant suppression)';
COMMENT ON COLUMN edt_agenda_archive.archive_reason IS 'Raison de l''archivage : merged, deleted, orphan_migration, etc.';
COMMENT ON COLUMN edt_agenda_archive.new_course_uid IS 'Nouveau course_uid si la note a été migrée/fusionnée';


























