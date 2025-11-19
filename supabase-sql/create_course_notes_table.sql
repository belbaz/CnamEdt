-- Table pour stocker les notes/agenda par cours et par utilisateur
-- Chaque utilisateur peut avoir des notes pour chaque cours (identifié par son uid)

CREATE TABLE IF NOT EXISTS edt_agenda (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_uid TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Un utilisateur ne peut avoir qu'une seule note par cours
    UNIQUE(user_id, course_uid)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_edt_agenda_user_id ON edt_agenda(user_id);
CREATE INDEX IF NOT EXISTS idx_edt_agenda_course_uid ON edt_agenda(course_uid);
CREATE INDEX IF NOT EXISTS idx_edt_agenda_user_course ON edt_agenda(user_id, course_uid);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_edt_agenda_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_edt_agenda_updated_at
    BEFORE UPDATE ON edt_agenda
    FOR EACH ROW
    EXECUTE FUNCTION update_edt_agenda_updated_at();

-- Commentaires pour la documentation
COMMENT ON TABLE edt_agenda IS 'Stocke les notes/agenda des utilisateurs pour chaque cours (identifié par course_uid)';
COMMENT ON COLUMN edt_agenda.user_id IS 'ID de l''utilisateur (table edt_user)';
COMMENT ON COLUMN edt_agenda.course_uid IS 'UID unique du cours (hash SHA1 de date|titre|lieu)';
COMMENT ON COLUMN edt_agenda.notes IS 'Contenu des notes/agenda pour ce cours';

