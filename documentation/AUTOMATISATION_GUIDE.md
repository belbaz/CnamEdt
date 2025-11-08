# 🤖 Guide d'Automatisation EDT CNAM

Ce guide explique comment mettre en place une automatisation gratuite pour mettre à jour automatiquement l'emploi du temps toutes les heures.

## 📋 Table des matières
- [Table de test](#table-de-test)
- [Solutions d'automatisation gratuites](#solutions-dautomatisation-gratuites)
- [Configuration recommandée](#configuration-recommandée)
- [Vérification du fonctionnement](#vérification-du-fonctionnement)

---

## 🧪 Table de test

### Création de la table

Exécutez le script SQL dans Supabase :
```sql
-- Dans Supabase Dashboard > SQL Editor
-- Copiez le contenu de : supabase-sql/create_test_edt_table.sql
```

### Route API de test

Une nouvelle route API a été créée : `/api/test-update`

**Fonctionnement :**
- Met à jour le champ `last_check` dans la table `test_edt`
- Enregistre l'heure exacte de chaque vérification
- Retourne un JSON avec le timestamp

**Exemple de réponse :**
```json
{
  "success": true,
  "action": "updated",
  "timestamp": "2025-11-08T14:30:00.000Z",
  "message": "✅ Timestamp mis à jour avec succès"
}
```

### Vérification manuelle

```bash
# Test local
curl http://localhost:3000/api/test-update

# Test en production
curl https://votre-domaine.vercel.app/api/test-update
```

---

## 🔄 Solutions d'automatisation gratuites

### Option 1 : **Vercel Cron Jobs** (Recommandé ⭐)

**Avantages :**
- ✅ Intégré directement à Vercel
- ✅ Gratuit (10 cron jobs sur le plan Hobby)
- ✅ Configuration simple
- ✅ Logs intégrés
- ✅ Pas de configuration externe

**Configuration :**

1. Créez le fichier `vercel.json` à la racine du projet :

```json
{
  "crons": [
    {
      "path": "/api/fetch-ics",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/test-update",
      "schedule": "0 * * * *"
    }
  ]
}
```

2. Déployez sur Vercel :
```bash
git add vercel.json
git commit -m "Add Vercel cron jobs for automatic updates"
git push
```

3. Vérifiez dans Vercel Dashboard :
   - Allez dans votre projet
   - Section "Cron Jobs"
   - Vérifiez que les 2 jobs sont actifs

**Format des schedules (Cron syntax) :**
- `0 * * * *` = Toutes les heures (à la minute 0)
- `*/30 * * * *` = Toutes les 30 minutes
- `0 */2 * * *` = Toutes les 2 heures
- `0 9-17 * * *` = Toutes les heures entre 9h et 17h

---

### Option 2 : **GitHub Actions**

**Avantages :**
- ✅ Gratuit (2000 minutes/mois)
- ✅ Intégré à votre repo
- ✅ Logs détaillés
- ✅ Flexible

**Configuration :**

Créez `.github/workflows/update-edt.yml` :

```yaml
name: Update EDT

on:
  schedule:
    # Toutes les heures
    - cron: '0 * * * *'
  workflow_dispatch: # Permet de lancer manuellement

jobs:
  update:
    runs-on: ubuntu-latest
    
    steps:
      - name: Call API to update EDT
        run: |
          echo "Calling fetch-ics API..."
          curl -f https://votre-domaine.vercel.app/api/fetch-ics
          
          echo "Calling test-update API..."
          curl -f https://votre-domaine.vercel.app/api/test-update
```

**Note :** GitHub Actions peut être désactivé après 60 jours d'inactivité du repo.

---

### Option 3 : **Supabase Edge Functions** (avec pg_cron)

**Avantages :**
- ✅ Intégré à Supabase
- ✅ Directement dans votre DB
- ✅ Pas besoin de service externe

**Configuration :**

1. Dans Supabase Dashboard > SQL Editor :

```sql
-- Installer l'extension pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Créer une fonction qui appelle votre API
CREATE OR REPLACE FUNCTION call_update_api()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Note: Supabase ne permet pas directement les appels HTTP depuis pg_cron
  -- Il faut utiliser une Edge Function à la place
  PERFORM pg_sleep(0);
END;
$$;

-- Programmer l'exécution toutes les heures
SELECT cron.schedule(
  'update-edt-hourly',
  '0 * * * *',
  'SELECT call_update_api()'
);
```

**Note :** Cette option nécessite une Edge Function Supabase supplémentaire.

---

### Option 4 : **UptimeRobot** (Service externe)

**Avantages :**
- ✅ Gratuit (50 monitors)
- ✅ Très simple
- ✅ Monitoring inclus
- ✅ Alertes email

**Configuration :**

1. Créez un compte sur [uptimerobot.com](https://uptimerobot.com)
2. Ajoutez 2 monitors :
   - **Monitor 1 :** URL = `https://votre-domaine.vercel.app/api/fetch-ics`
   - **Monitor 2 :** URL = `https://votre-domaine.vercel.app/api/test-update`
   - Type : HTTP(s)
   - Monitoring Interval : 60 minutes

**Limitation :** Intervalle minimum de 5 minutes (plan gratuit).

---

### Option 5 : **Cron-job.org**

**Avantages :**
- ✅ Gratuit
- ✅ Simple
- ✅ Logs disponibles

**Configuration :**

1. Allez sur [cron-job.org](https://cron-job.org)
2. Créez 2 cron jobs :
   - URL : `https://votre-domaine.vercel.app/api/fetch-ics`
   - Schedule : Every 60 minutes
   - URL : `https://votre-domaine.vercel.app/api/test-update`
   - Schedule : Every 60 minutes

---

## ✅ Configuration recommandée

Pour votre cas d'usage (Vercel + GitHub + Supabase), je recommande :

### **Solution Hybride : Vercel Cron Jobs + GitHub Actions Backup**

1. **Principal :** Vercel Cron Jobs (automatique, intégré)
2. **Backup :** GitHub Actions (au cas où Vercel échoue)

Cette combinaison offre :
- ✅ Fiabilité maximale
- ✅ Logs dans 2 endroits
- ✅ Redondance gratuite
- ✅ Pas de service externe

---

## 🧪 Vérification du fonctionnement

### 1. Vérifier la table de test dans Supabase

```sql
-- Dans Supabase SQL Editor
SELECT * FROM test_edt;
```

**Résultat attendu :**
```
id | last_check              | created_at
---+------------------------+------------------------
 1 | 2025-11-08 15:00:00+00 | 2025-11-08 10:00:00+00
```

Le champ `last_check` doit être mis à jour toutes les heures.

### 2. Vérifier les logs

**Vercel :**
- Dashboard > Votre projet > Logs
- Recherchez "api/test-update" ou "api/fetch-ics"

**GitHub Actions :**
- Votre repo > Actions
- Vérifiez les exécutions du workflow "Update EDT"

### 3. Créer une page de monitoring (optionnel)

Créez une page simple pour voir le statut :

```jsx
// src/app/monitoring/page.jsx
export default async function MonitoringPage() {
  const supabase = createServerClient(/* ... */);
  const { data } = await supabase
    .from('test_edt')
    .select('*')
    .single();

  return (
    <div>
      <h1>Monitoring Automatisation</h1>
      <p>Dernière mise à jour : {data.last_check}</p>
    </div>
  );
}
```

---

## 🎯 Récapitulatif

| Solution | Coût | Difficulté | Recommandation |
|----------|------|------------|----------------|
| **Vercel Cron** | Gratuit | ⭐ Facile | ✅ Recommandé |
| **GitHub Actions** | Gratuit | ⭐⭐ Moyen | ✅ Backup |
| **Supabase pg_cron** | Gratuit | ⭐⭐⭐ Avancé | ⚠️ Complexe |
| **UptimeRobot** | Gratuit | ⭐ Facile | ✅ Alternative |
| **Cron-job.org** | Gratuit | ⭐ Facile | ✅ Alternative |

---

## 🚀 Prochaines étapes

1. ✅ Exécuter le script SQL pour créer la table `test_edt`
2. ✅ Tester manuellement `/api/test-update`
3. ✅ Choisir une solution d'automatisation (Vercel Cron recommandé)
4. ✅ Configurer la solution choisie
5. ✅ Attendre 1-2 heures et vérifier la table
6. ✅ Optionnel : Ajouter les autres solutions en backup

---

## 📞 Support

Si la table ne se met pas à jour :
1. Vérifiez les logs Vercel/GitHub Actions
2. Testez manuellement l'URL en production
3. Vérifiez les variables d'environnement Supabase
4. Vérifiez que la table existe bien dans Supabase

