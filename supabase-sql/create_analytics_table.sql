-- ============================================
-- TABLE EDT_ANALYTICS - Création complète
-- ============================================
-- Table pour stocker les métriques analytics du site
-- Permet de tracker les visiteurs, leurs appareils, et leur comportement
-- Version complète avec toutes les colonnes nécessaires

CREATE TABLE IF NOT EXISTS edt_analytics (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    device_name TEXT,
    device_type TEXT, -- 'mobile', 'tablet', 'desktop', 'unknown'
    os_name TEXT,
    os_version TEXT,
    browser_name TEXT,
    browser_version TEXT,
    browser_language TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    viewport_width INTEGER,
    viewport_height INTEGER,
    site_version TEXT, -- Version du site chargée (depuis package.json)
    time_on_page INTEGER, -- Temps de la dernière visite en secondes
    total_time_on_page INTEGER DEFAULT 0, -- Temps total cumulé sur toutes les visites en secondes
    avg_time_on_page NUMERIC(10, 2) DEFAULT 0, -- Temps moyen par visite (total_time_on_page / visit_count)
    page_url TEXT,
    referrer TEXT,
    first_visit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_visit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    visit_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEX POUR LES PERFORMANCES
-- ============================================

-- Index de base
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON edt_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_ip_address ON edt_analytics(ip_address);
CREATE INDEX IF NOT EXISTS idx_analytics_device_type ON edt_analytics(device_type);
CREATE INDEX IF NOT EXISTS idx_analytics_os_name ON edt_analytics(os_name);
CREATE INDEX IF NOT EXISTS idx_analytics_site_version ON edt_analytics(site_version);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON edt_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_last_visit_at ON edt_analytics(last_visit_at);

-- Index pour le tri
CREATE INDEX IF NOT EXISTS idx_analytics_created_at_desc ON edt_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_last_visit_at_desc ON edt_analytics(last_visit_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_visit_count ON edt_analytics(visit_count DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_total_time ON edt_analytics(total_time_on_page DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_avg_time ON edt_analytics(avg_time_on_page DESC);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_analytics_session_created ON edt_analytics(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_device_os ON edt_analytics(device_type, os_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_device ON edt_analytics(created_at DESC, device_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_os ON edt_analytics(created_at DESC, os_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_browser ON edt_analytics(created_at DESC, browser_name);

-- ============================================
-- TRIGGER POUR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_analytics_updated_at
    BEFORE UPDATE ON edt_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE edt_analytics IS 'Stocke les métriques analytics des visiteurs du site';
COMMENT ON COLUMN edt_analytics.session_id IS 'ID unique de session (cookie analytics_session_id)';
COMMENT ON COLUMN edt_analytics.ip_address IS 'Adresse IP du visiteur';
COMMENT ON COLUMN edt_analytics.device_type IS 'Type d''appareil: mobile, tablet, desktop, unknown';
COMMENT ON COLUMN edt_analytics.site_version IS 'Version du site chargée (depuis package.json)';
COMMENT ON COLUMN edt_analytics.time_on_page IS 'Temps de la dernière visite en secondes';
COMMENT ON COLUMN edt_analytics.total_time_on_page IS 'Temps total cumulé sur toutes les visites en secondes';
COMMENT ON COLUMN edt_analytics.avg_time_on_page IS 'Temps moyen par visite (total_time_on_page / visit_count)';
COMMENT ON COLUMN edt_analytics.visit_count IS 'Nombre de visites pour cette session';

-- ============================================
-- OPTIMISATION
-- ============================================

-- Analyser la table pour optimiser les requêtes
ANALYZE edt_analytics;

-- ============================================
-- NOTES
-- ============================================
-- Note: L'adresse MAC n'est pas accessible depuis un navigateur web pour des raisons de sécurité/privacy
-- Elle ne peut être récupérée que dans des applications natives avec permissions spéciales
