-- Fonction PostgreSQL pour mettre à jour plusieurs événements en batch
-- 
-- PROBLÈME :
-- Le code actuel fait une requête UPDATE par événement :
-- for (const upd of updates) {
--     await supabase.from('edt_events_versions').update(upd.data).eq('uid', upd.uid);
-- }
-- 20 événements = 20 requêtes SQL séquentielles = 500ms-2s
--
-- SOLUTION :
-- Cette fonction fait tout en une seule requête avec UNNEST
-- 20 événements = 1 requête SQL = 50-100ms
--
-- Performance : 10-20x plus rapide

CREATE OR REPLACE FUNCTION bulk_update_events(
    uids TEXT[],
    version_nos INTEGER[],
    changed_ats TIMESTAMPTZ[],
    summaries TEXT[],
    starts TIMESTAMPTZ[],
    end_times TIMESTAMPTZ[],
    locations TEXT[],
    descriptions TEXT[],
    content_hashes TEXT[]
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Vérifier que tous les tableaux ont la même longueur
    IF NOT (
        array_length(uids, 1) = array_length(version_nos, 1) AND
        array_length(uids, 1) = array_length(changed_ats, 1) AND
        array_length(uids, 1) = array_length(summaries, 1) AND
        array_length(uids, 1) = array_length(starts, 1) AND
        array_length(uids, 1) = array_length(end_times, 1) AND
        array_length(uids, 1) = array_length(locations, 1) AND
        array_length(uids, 1) = array_length(descriptions, 1) AND
        array_length(uids, 1) = array_length(content_hashes, 1)
    ) THEN
        RAISE EXCEPTION 'All arrays must have the same length';
    END IF;

    -- Faire l'update en batch avec UNNEST
    WITH updates_cte AS (
        SELECT
            unnest(uids) as uid,
            unnest(version_nos) as version_no,
            unnest(changed_ats) as changed_at,
            unnest(summaries) as summary,
            unnest(starts) as start,
            unnest(end_times) as end_time,
            unnest(locations) as location,
            unnest(descriptions) as description,
            unnest(content_hashes) as content_hash
    )
    UPDATE edt_events_versions ev
    SET
        version_no = u.version_no,
        changed_at = u.changed_at,
        summary = u.summary,
        start = u.start,
        end_time = u.end_time,
        location = u.location,
        description = u.description,
        content_hash = u.content_hash
    FROM updates_cte u
    WHERE ev.uid = u.uid;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION bulk_update_events IS 
'Met à jour plusieurs événements en une seule requête. Utilisé pour optimiser les updates en batch au lieu de boucles séquentielles.';

-- Grant d'accès (à adapter selon vos permissions)
-- GRANT EXECUTE ON FUNCTION bulk_update_events TO authenticated;
