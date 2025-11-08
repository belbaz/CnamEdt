-- ========================================
-- Table de test pour l'automatisation
-- ========================================
-- Cette table permet de vérifier que l'automatisation fonctionne correctement
-- en enregistrant le timestamp de chaque vérification automatique.

-- Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS test_edt;

-- Créer la table test_edt
CREATE TABLE test_edt (
    id INTEGER PRIMARY KEY,
    last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insérer une ligne initiale
INSERT INTO test_edt (id, last_check, created_at)
VALUES (1, NOW(), NOW());

-- Ajouter un commentaire sur la table
COMMENT ON TABLE test_edt IS 'Table de test pour vérifier l''automatisation des mises à jour EDT';
COMMENT ON COLUMN test_edt.id IS 'ID unique (toujours 1)';
COMMENT ON COLUMN test_edt.last_check IS 'Timestamp de la dernière vérification automatique';
COMMENT ON COLUMN test_edt.created_at IS 'Timestamp de création de la ligne';

-- Activer Row Level Security (optionnel, mais bonne pratique)
ALTER TABLE test_edt ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique (optionnel)
CREATE POLICY "Allow public read access on test_edt" ON test_edt
    FOR SELECT
    USING (true);

-- Note: Pour les mises à jour, le service role key est utilisé côté serveur
-- donc pas besoin de politique UPDATE publique

