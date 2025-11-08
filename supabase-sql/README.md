# 📊 Scripts SQL Supabase

Ce dossier contient les scripts SQL à exécuter dans Supabase pour configurer la base de données.

---

## 📁 Scripts disponibles

### `create_test_edt_table.sql`

**Description :**  
Crée la table `test_edt` pour tester le système d'automatisation.

**Usage :**
1. Ouvrir **Supabase Dashboard** → votre projet
2. Aller dans **SQL Editor**
3. Copier-coller le contenu du fichier
4. Cliquer sur **Run** (Exécuter)

**Structure de la table :**
```sql
test_edt (
    id INTEGER PRIMARY KEY,           -- Toujours 1
    last_check TIMESTAMPTZ NOT NULL,  -- Timestamp de la dernière vérification
    created_at TIMESTAMPTZ NOT NULL   -- Date de création
)
```

**Objectif :**  
Cette table enregistre le timestamp de chaque exécution automatique de `/api/test-update`, permettant de vérifier que l'automatisation fonctionne correctement.

---

## 🔍 Vérification

Après avoir exécuté le script, vérifiez que la table existe :

```sql
SELECT * FROM test_edt;
```

**Résultat attendu :**
```
id | last_check              | created_at
---+------------------------+------------------------
 1 | 2025-11-08 10:00:00+00 | 2025-11-08 10:00:00+00
```

---

## 🔄 Mise à jour automatique

Une fois l'automatisation activée (via Vercel Cron ou GitHub Actions), le champ `last_check` sera mis à jour automatiquement toutes les heures.

Pour vérifier en temps réel :
- Visitez `/monitoring` dans votre application
- Ou exécutez : `SELECT last_check FROM test_edt WHERE id = 1;`

---

## 🗑️ Supprimer la table

Si vous souhaitez supprimer la table de test :

```sql
DROP TABLE IF EXISTS test_edt;
```

**Note :** Cela cassera l'API `/api/test-update` et la page `/monitoring`.

---

## 🔒 Sécurité

La table utilise **Row Level Security (RLS)** :
- ✅ Lecture publique autorisée (pour la page `/monitoring`)
- ⛔ Écriture uniquement via service role (API côté serveur)

Cela signifie que seul votre backend peut modifier les données, mais n'importe qui peut les lire.

Si vous voulez rendre la lecture privée également :

```sql
-- Supprimer la politique de lecture publique
DROP POLICY "Allow public read access on test_edt" ON test_edt;

-- Créer une nouvelle politique (exemple : lecture authentifiée uniquement)
CREATE POLICY "Allow authenticated read access on test_edt" ON test_edt
    FOR SELECT
    USING (auth.role() = 'authenticated');
```

---

## 📚 Plus d'informations

Consultez les fichiers suivants pour comprendre le système complet :
- `QUICK_START_AUTOMATION.md` - Guide de démarrage rapide
- `AUTOMATISATION_GUIDE.md` - Guide complet
- `AUTOMATION_SUMMARY.md` - Résumé du système

