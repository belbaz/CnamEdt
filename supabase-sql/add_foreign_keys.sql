-- Script pour ajouter les clés étrangères dans Supabase
-- Améliore l'intégrité référentielle et permet les jointures automatiques
-- 
-- IMPORTANT : Ce script convertit les colonnes user_id de TEXT vers UUID
-- pour correspondre au type de edt_user.id

-- ============================================
-- 1. Conversion de edt_course_files.user_id : TEXT -> UUID
-- ============================================

DO $$ 
BEGIN
    -- Vérifier si la colonne est déjà de type UUID
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'edt_course_files' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        RAISE NOTICE 'edt_course_files.user_id est déjà de type UUID';
    ELSE
        -- Convertir TEXT vers UUID
        RAISE NOTICE 'Conversion de edt_course_files.user_id de TEXT vers UUID...';
        
        -- Supprimer les index existants sur user_id
        DROP INDEX IF EXISTS idx_edt_course_files_user_id;
        DROP INDEX IF EXISTS idx_edt_course_files_user_course;
        
        -- Convertir la colonne
        ALTER TABLE edt_course_files
        ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
        
        -- Recréer les index
        CREATE INDEX IF NOT EXISTS idx_edt_course_files_user_id ON edt_course_files(user_id);
        CREATE INDEX IF NOT EXISTS idx_edt_course_files_user_course ON edt_course_files(user_id, course_uid);
        
        RAISE NOTICE 'Conversion terminée avec succès';
    END IF;
END $$;

-- ============================================
-- 2. Conversion de edt_agenda.user_id : TEXT -> UUID
-- ============================================

DO $$ 
BEGIN
    -- Vérifier si la colonne est déjà de type UUID
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'edt_agenda' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        RAISE NOTICE 'edt_agenda.user_id est déjà de type UUID';
    ELSE
        -- Convertir TEXT vers UUID
        RAISE NOTICE 'Conversion de edt_agenda.user_id de TEXT vers UUID...';
        
        -- Supprimer les index existants sur user_id
        DROP INDEX IF EXISTS idx_edt_agenda_user_id;
        DROP INDEX IF EXISTS idx_edt_agenda_user_course;
        
        -- Supprimer la contrainte UNIQUE temporairement si elle existe
        ALTER TABLE edt_agenda DROP CONSTRAINT IF EXISTS edt_agenda_user_id_course_uid_key;
        
        -- Convertir la colonne
        ALTER TABLE edt_agenda
        ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
        
        -- Recréer la contrainte UNIQUE
        ALTER TABLE edt_agenda
        ADD CONSTRAINT edt_agenda_user_id_course_uid_key UNIQUE(user_id, course_uid);
        
        -- Recréer les index
        CREATE INDEX IF NOT EXISTS idx_edt_agenda_user_id ON edt_agenda(user_id);
        CREATE INDEX IF NOT EXISTS idx_edt_agenda_user_course ON edt_agenda(user_id, course_uid);
        
        RAISE NOTICE 'Conversion terminée avec succès';
    END IF;
END $$;

-- ============================================
-- 3. Clé étrangère pour edt_course_files.user_id -> edt_user.id
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'fk_edt_course_files_user_id'
    ) THEN
        ALTER TABLE edt_course_files
        ADD CONSTRAINT fk_edt_course_files_user_id
        FOREIGN KEY (user_id) 
        REFERENCES edt_user(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Clé étrangère fk_edt_course_files_user_id créée avec succès';
    ELSE
        RAISE NOTICE 'Clé étrangère fk_edt_course_files_user_id existe déjà';
    END IF;
END $$;

-- ============================================
-- 4. Clé étrangère pour edt_agenda.user_id -> edt_user.id
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'fk_edt_agenda_user_id'
    ) THEN
        ALTER TABLE edt_agenda
        ADD CONSTRAINT fk_edt_agenda_user_id
        FOREIGN KEY (user_id) 
        REFERENCES edt_user(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Clé étrangère fk_edt_agenda_user_id créée avec succès';
    ELSE
        RAISE NOTICE 'Clé étrangère fk_edt_agenda_user_id existe déjà';
    END IF;
END $$;

-- ============================================
-- Commentaires pour la documentation
-- ============================================

COMMENT ON CONSTRAINT fk_edt_course_files_user_id ON edt_course_files IS 
'Clé étrangère vers edt_user.id - Supprime automatiquement les fichiers si l''utilisateur est supprimé';

COMMENT ON CONSTRAINT fk_edt_agenda_user_id ON edt_agenda IS 
'Clé étrangère vers edt_user.id - Supprime automatiquement les notes si l''utilisateur est supprimé';

