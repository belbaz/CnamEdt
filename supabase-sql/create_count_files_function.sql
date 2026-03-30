-- Fonction PostgreSQL pour compter les fichiers par cours de manière optimisée
-- Cette fonction remplace la méthode inefficace de récupérer toutes les lignes
-- et de compter côté application.
-- 
-- Performance : Au lieu de transférer potentiellement des milliers de lignes,
-- cette fonction ne retourne que le nombre de cours avec leurs compteurs.
-- Par exemple, pour 22 cours avec 100 fichiers chacun :
--   - Ancienne méthode : 2200 lignes transférées
--   - Nouvelle méthode : 22 lignes transférées (99% de réduction !)

CREATE OR REPLACE FUNCTION count_files_by_courses(course_uid_list TEXT[])
RETURNS TABLE(course_uid TEXT, count BIGINT)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        course_uid,
        COUNT(*) as count
    FROM edt_course_files
    WHERE course_uid = ANY(course_uid_list)
    GROUP BY course_uid
$$;

-- Ajouter un commentaire pour la documentation
COMMENT ON FUNCTION count_files_by_courses(TEXT[]) IS 
'Compte efficacement le nombre de fichiers par cours. Retourne une table avec course_uid et count. Optimisé pour le batch counting.';

-- Grant d'accès si nécessaire (à adapter selon vos permissions)
-- GRANT EXECUTE ON FUNCTION count_files_by_courses(TEXT[]) TO authenticated;
-- GRANT EXECUTE ON FUNCTION count_files_by_courses(TEXT[]) TO anon;
