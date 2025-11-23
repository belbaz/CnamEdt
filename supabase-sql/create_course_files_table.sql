-- Table pour stocker les métadonnées des fichiers uploadés pour les cours
-- Les fichiers eux-mêmes sont stockés sur Vercel Blob Storage (gratuit jusqu'à 1 GB)
-- Cette table stocke uniquement les métadonnées (nom, taille, URL, etc.)

CREATE TABLE IF NOT EXISTS edt_course_files (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_uid TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    blob_url TEXT NOT NULL, -- URL du fichier sur Vercel Blob Storage
    blob_path TEXT NOT NULL, -- Chemin du fichier sur Vercel Blob Storage
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_edt_course_files_user_id ON edt_course_files(user_id);
CREATE INDEX IF NOT EXISTS idx_edt_course_files_course_uid ON edt_course_files(course_uid);
CREATE INDEX IF NOT EXISTS idx_edt_course_files_user_course ON edt_course_files(user_id, course_uid);
CREATE INDEX IF NOT EXISTS idx_edt_course_files_uploaded_at ON edt_course_files(uploaded_at DESC);

-- Commentaires pour la documentation
COMMENT ON TABLE edt_course_files IS 'Stocke les métadonnées des fichiers uploadés pour les cours. Les fichiers sont stockés sur Vercel Blob Storage.';
COMMENT ON COLUMN edt_course_files.user_id IS 'ID de l''utilisateur (table edt_user)';
COMMENT ON COLUMN edt_course_files.course_uid IS 'UID unique du cours (hash SHA1 de date|titre|lieu)';
COMMENT ON COLUMN edt_course_files.file_name IS 'Nom original du fichier';
COMMENT ON COLUMN edt_course_files.file_size IS 'Taille du fichier en octets';
COMMENT ON COLUMN edt_course_files.file_type IS 'Type MIME du fichier (ex: image/png, application/pdf)';
COMMENT ON COLUMN edt_course_files.blob_url IS 'URL publique du fichier sur Vercel Blob Storage';
COMMENT ON COLUMN edt_course_files.blob_path IS 'Chemin du fichier sur Vercel Blob Storage';

