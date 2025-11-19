-- Ajouter une colonne JSONB pour stocker l'historique des modifications
-- Cette colonne stockera un tableau d'objets avec les informations sur qui a créé/modifié la note

ALTER TABLE edt_agenda 
ADD COLUMN IF NOT EXISTS modification_history JSONB DEFAULT '[]'::jsonb;

-- Index GIN pour améliorer les performances des requêtes sur le JSONB
CREATE INDEX IF NOT EXISTS idx_edt_agenda_modification_history 
ON edt_agenda USING GIN (modification_history);

-- Commentaire pour la documentation
COMMENT ON COLUMN edt_agenda.modification_history IS 'Historique des modifications : tableau JSON avec {user_id, user_name, action: "created"|"modified", timestamp}';

-- Migration des données existantes : créer l'historique initial pour les notes existantes
-- On utilise created_at comme première entrée et updated_at si différent
UPDATE edt_agenda
SET modification_history = jsonb_build_array(
    jsonb_build_object(
        'user_id', user_id,
        'action', 'created',
        'timestamp', created_at
    )
)
WHERE modification_history = '[]'::jsonb OR modification_history IS NULL;

-- Si updated_at est différent de created_at, ajouter une entrée de modification
UPDATE edt_agenda
SET modification_history = modification_history || jsonb_build_array(
    jsonb_build_object(
        'user_id', user_id,
        'action', 'modified',
        'timestamp', updated_at
    )
)
WHERE updated_at != created_at 
  AND (modification_history = '[]'::jsonb OR jsonb_array_length(modification_history) = 1);

