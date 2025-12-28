-- ============================================
-- AJOUT DES COLONNES USER_ID ET USER_EMAIL
-- ============================================
-- Ajoute les colonnes pour enregistrer l'utilisateur connecté dans les analytics
-- Permet de lier les sessions analytics aux utilisateurs authentifiés

-- Ajouter la colonne user_id (UUID, référence vers edt_user.id)
ALTER TABLE edt_analytics 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES edt_user(id) ON DELETE SET NULL;

-- Ajouter la colonne user_email (TEXT, email de l'utilisateur)
ALTER TABLE edt_analytics 
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- ============================================
-- INDEX POUR LES PERFORMANCES
-- ============================================

-- Index pour user_id (pour les requêtes de filtrage par utilisateur)
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON edt_analytics(user_id);

-- Index pour user_email (pour les requêtes de recherche par email)
CREATE INDEX IF NOT EXISTS idx_analytics_user_email ON edt_analytics(user_email);

-- Index composite pour les requêtes fréquentes (user_id + created_at)
CREATE INDEX IF NOT EXISTS idx_analytics_user_created ON edt_analytics(user_id, created_at DESC);

-- Index composite pour les requêtes fréquentes (user_email + created_at)
CREATE INDEX IF NOT EXISTS idx_analytics_email_created ON edt_analytics(user_email, created_at DESC);

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON COLUMN edt_analytics.user_id IS 'ID de l''utilisateur connecté (UUID, référence vers edt_user.id). NULL si visiteur anonyme.';
COMMENT ON COLUMN edt_analytics.user_email IS 'Email de l''utilisateur connecté. NULL si visiteur anonyme.';

-- ============================================
-- NOTES
-- ============================================
-- Les colonnes user_id et user_email sont NULL pour les visiteurs anonymes
-- Elles sont remplies automatiquement par l'API /api/analytics si l'utilisateur est connecté
-- La colonne user_id a une contrainte de clé étrangère vers edt_user(id) avec ON DELETE SET NULL
-- pour que si un utilisateur est supprimé, ses analytics restent mais sans référence utilisateur

