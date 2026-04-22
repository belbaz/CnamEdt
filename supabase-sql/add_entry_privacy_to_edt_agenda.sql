-- Visibilité par paragraphe : public (défaut) ou personal (réservé au compte auteur)
ALTER TABLE edt_agenda
ADD COLUMN IF NOT EXISTS entry_privacy JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN edt_agenda.entry_privacy IS
  'Clés d''index (string "0","1",...) : "personal" pour une entrée privée, absent = public.';
