-- Migration pour ajouter le support des labels par paragraphe de note
-- Au lieu d'avoir des labels au niveau de la note entière, chaque paragraphe peut avoir ses propres labels

-- Ajouter une colonne entry_labels de type JSONB pour stocker les labels par index de paragraphe
-- Structure: {"0": ["Contrôle", "Devoir"], "1": ["Lien"], ...}
ALTER TABLE edt_agenda
ADD COLUMN IF NOT EXISTS entry_labels JSONB DEFAULT '{}'::JSONB;

-- Index GIN pour améliorer les performances des requêtes sur entry_labels
CREATE INDEX IF NOT EXISTS idx_edt_agenda_entry_labels ON edt_agenda USING GIN (entry_labels);

-- Commentaire pour la documentation
COMMENT ON COLUMN edt_agenda.entry_labels IS 'Labels associés à chaque paragraphe de note, indexés par la position du paragraphe (ex: {"0": ["Contrôle"], "1": ["Devoir", "Lien"]})';

-- Migration des données existantes : déplacer les labels de la note vers le premier paragraphe (index 0)
-- Si une note a des labels au niveau de la note, on les assigne au premier paragraphe
UPDATE edt_agenda
SET entry_labels = jsonb_build_object('0', COALESCE(labels, '{}'::TEXT[]))
WHERE labels IS NOT NULL 
  AND array_length(labels, 1) > 0
  AND (entry_labels IS NULL OR entry_labels = '{}'::JSONB);

