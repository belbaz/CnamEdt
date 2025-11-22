-- Ajouter une colonne JSONB pour stocker les labels/tags des cours
-- Les labels prédéfinis sont : Contrôle, Devoir, Lien, Information
-- Les utilisateurs peuvent aussi créer leurs propres labels personnalisés

ALTER TABLE edt_agenda 
ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '[]'::jsonb;

-- Index GIN pour améliorer les performances des requêtes sur les labels
CREATE INDEX IF NOT EXISTS idx_edt_agenda_labels 
ON edt_agenda USING GIN (labels);

-- Commentaire pour la documentation
COMMENT ON COLUMN edt_agenda.labels IS 'Tableau JSON des labels associés à cette note. Exemple: ["Contrôle", "Devoir", "Lien personnalisé"]';

