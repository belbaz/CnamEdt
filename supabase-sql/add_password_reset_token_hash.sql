-- Ajouter une colonne pour stocker le hash du token de réinitialisation de mot de passe
-- Cette colonne permet de s'assurer qu'un lien de réinitialisation ne peut être utilisé qu'une seule fois

ALTER TABLE edt_user 
ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT;

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_edt_user_password_reset_token_hash 
ON edt_user(password_reset_token_hash) 
WHERE password_reset_token_hash IS NOT NULL;

-- Commentaire pour la documentation
COMMENT ON COLUMN edt_user.password_reset_token_hash IS 'Hash bcrypt du token de réinitialisation de mot de passe. Null si aucun token actif ou si le token a été utilisé.';

