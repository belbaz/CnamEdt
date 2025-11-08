# 🎨 Guide Visuel - Automatisation EDT en 3 étapes

Guide ultra-simplifié avec des visuels pour comprendre et installer l'automatisation en quelques minutes.

---

## 🎯 Objectif

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   AVANT  ❌  Appel manuel de l'API toutes les heures      ║
║                                                            ║
║   APRÈS  ✅  Automatique, toutes les heures, sans rien    ║
║              faire                                         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 📋 Vue d'ensemble en 1 image

```
┌─────────────────────────────────────────────────────────────┐
│                      SYSTÈME COMPLET                        │
└─────────────────────────────────────────────────────────────┘

    ⏰ Toutes les heures (00:00, 01:00, 02:00...)
           │
           ▼
    ┌──────────────┐
    │ Vercel Cron  │  Appelle automatiquement
    └──────┬───────┘
           │
           ├─► /api/fetch-ics ────► Met à jour l'EDT
           │
           └─► /api/test-update ──► Enregistre l'heure
                      │
                      ▼
               ┌──────────────┐
               │  test_edt    │  Table Supabase
               │  last_check  │  (timestamp)
               └──────┬───────┘
                      │
                      ▼
               ┌──────────────┐
               │  /monitoring │  Page web
               │  Affiche ✅  │  (monitoring visuel)
               └──────────────┘
```

---

## 🚀 Installation en 3 étapes

### ✨ ÉTAPE 1 : Créer la table (2 min)

```
┌─────────────────────────────────────────────────────┐
│  1. Ouvrir Supabase                                 │
│     https://supabase.com/dashboard                  │
│                                                     │
│  2. Cliquer sur votre projet                       │
│                                                     │
│  3. Cliquer sur "SQL Editor" (icône 🗃️)           │
│                                                     │
│  4. Copier-coller le contenu de :                  │
│     supabase-sql/create_test_edt_table.sql         │
│                                                     │
│  5. Cliquer sur "Run" (▶️)                          │
└─────────────────────────────────────────────────────┘

Résultat :
   ✅ Table "test_edt" créée
   ✅ 1 ligne insérée (id = 1)
```

**Vérification :**
```sql
SELECT * FROM test_edt;

Résultat attendu :
 id | last_check              | created_at
----+------------------------+------------------------
  1 | 2025-11-08 10:00:00+00 | 2025-11-08 10:00:00+00
```

---

### ✨ ÉTAPE 2 : Tester en local (1 min)

```
┌─────────────────────────────────────────────────────┐
│  Terminal 1 : Démarrer le serveur                  │
└─────────────────────────────────────────────────────┘

$ npm run dev

✔ Ready in 2.5s
○ Local: http://localhost:3000


┌─────────────────────────────────────────────────────┐
│  Terminal 2 : Tester l'automatisation              │
└─────────────────────────────────────────────────────┘

$ npm run test:automation

========================================
  Test d'automatisation EDT CNAM
========================================

🧪 Test: Mise à jour table test_edt
   ✅ Succès (200) - 234ms
   📊 Réponse: {
      "success": true,
      "timestamp": "2025-11-08T14:30:00.000Z",
      "message": "✅ Timestamp mis à jour avec succès"
   }

🧪 Test: Fetch ICS et mise à jour EDT
   ✅ Succès (200) - 1523ms
   📊 Réponse: { events: [...], ... }

========================================
  Résumé des tests
========================================

✅ Test 1: 200 (234ms)
✅ Test 2: 200 (1523ms)

📊 Résultat: 2/2 tests réussis

✅ Tous les tests sont passés avec succès !
```

**✅ Si vous voyez ça, tout fonctionne !**

---

### ✨ ÉTAPE 3 : Déployer (1 min)

```
┌─────────────────────────────────────────────────────┐
│  Déployer sur Vercel                                │
└─────────────────────────────────────────────────────┘

$ git add .
$ git commit -m "Add automatic EDT update system"
$ git push

Counting objects: 15, done.
Writing objects: 100% (15/15), done.
✔ Pushed to GitHub

Vercel détecte automatiquement le push...
⏳ Building...
✔ Deployed to production!

🔗 https://votre-domaine.vercel.app
```

**Vérification dans Vercel Dashboard :**

```
1. Ouvrir https://vercel.com/dashboard
2. Cliquer sur votre projet
3. Onglet "Cron Jobs"

Vous devriez voir :

┌─────────────────────────────────────────────────────┐
│  Cron Jobs                                          │
│                                                     │
│  ✅ /api/fetch-ics         Every hour (0 * * * *)  │
│  ✅ /api/test-update       Every hour (0 * * * *)  │
│                                                     │
│  Last run: 8 Nov 2025, 14:00:00                   │
│  Next run: 8 Nov 2025, 15:00:00                   │
└─────────────────────────────────────────────────────┘
```

---

## ✅ C'est terminé !

```
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🎉 FÉLICITATIONS !                               ║
║                                                    ║
║   Votre système est maintenant automatisé         ║
║                                                    ║
║   • Mise à jour toutes les heures ✅               ║
║   • Pas d'intervention manuelle ✅                 ║
║   • Vérification automatique ✅                    ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

---

## 🔍 Comment vérifier que ça marche ?

### Option 1 : Page web (recommandé)

```
1. Ouvrir votre navigateur
2. Aller sur : https://votre-domaine.vercel.app/monitoring

Vous verrez :

┌─────────────────────────────────────────────────┐
│  🤖 Monitoring Automatisation                   │
│                                                 │
│  ┌────────────────────────────────────────┐    │
│  │             ✅                          │    │
│  │  Timestamp mis à jour avec succès      │    │
│  └────────────────────────────────────────┘    │
│                                                 │
│  📅 Dernière vérification                      │
│  Vendredi 8 novembre 2025 à 14:00:00          │
│  Il y a 0 minute                               │
│                                                 │
│  ⚙️ Action effectuée                           │
│  Mise à jour                                   │
│  Table: test_edt                               │
│                                                 │
│  [🔄 Rafraîchir]  [🏠 Retour à l'accueil]      │
└─────────────────────────────────────────────────┘
```

### Option 2 : Supabase (technique)

```sql
-- Dans Supabase SQL Editor
SELECT 
    id,
    last_check,
    NOW() - last_check as time_since_last_check
FROM test_edt;

Résultat attendu :
 id | last_check              | time_since_last_check
----+------------------------+----------------------
  1 | 2025-11-08 14:00:00+00 | 00:05:23
              ↑
         Doit être récent (< 1h30)
```

### Option 3 : Logs Vercel

```
1. Vercel Dashboard → Votre projet → Logs
2. Rechercher "test-update" ou "fetch-ics"

Logs attendus :

14:00:00  GET /api/test-update 200 234ms
14:00:01  [API test-update] Timestamp mis à jour avec succès
14:00:05  GET /api/fetch-ics 200 1523ms
14:00:06  [API fetch-ics] ICS downloaded, length: 123456
```

---

## 🕐 Timeline typique

```
Heure   Action
──────────────────────────────────────────────────
13:59   Système en attente...

14:00   ⏰ Vercel Cron se réveille
        ├─► Appelle /api/test-update
        │   └─► UPDATE test_edt SET last_check = NOW()
        │       ✅ Fait en 200ms
        │
        └─► Appelle /api/fetch-ics
            ├─► Télécharge ICS depuis galao.cnam.fr
            ├─► Calcule le hash SHA256
            ├─► Compare avec le dernier hash
            │
            ├─► Si différent:
            │   ├─► Parse les événements
            │   └─► Sauvegarde dans la DB
            │
            └─► Si identique:
                └─► Retourne le cache
                    ✅ Fait en 1.5s

14:01   Système en attente...

15:00   🔄 Recommence (et ainsi de suite)
```

---

## 🎓 Comprendre les composants

### 1. `vercel.json` (Configuration)

```json
{
  "crons": [
    {
      "path": "/api/fetch-ics",      ← URL à appeler
      "schedule": "0 * * * *"         ← Quand (toutes les heures)
    }
  ]
}
```

**Format du schedule :**
```
 ┌─── Minute (0-59)
 │  ┌─── Heure (0-23)
 │  │  ┌─── Jour du mois (1-31)
 │  │  │  ┌─── Mois (1-12)
 │  │  │  │  ┌─── Jour de la semaine (0-6, 0=Dimanche)
 │  │  │  │  │
 0  *  *  *  *   = Toutes les heures à la minute 0
*/30 * * * *     = Toutes les 30 minutes
 0  9-17 * * *   = Toutes les heures entre 9h et 17h
```

### 2. `test_edt` (Table)

```
┌────────────────────────────────────────┐
│            Table: test_edt             │
├────┬───────────────────────────────────┤
│ id │ Toujours 1 (une seule ligne)     │
├────┼───────────────────────────────────┤
│ lc │ Timestamp de la dernière vérif   │
│    │ Mis à jour automatiquement       │
├────┼───────────────────────────────────┤
│ ca │ Date de création de la ligne     │
│    │ Ne change jamais                 │
└────┴───────────────────────────────────┘

Symboles : lc = last_check, ca = created_at
```

### 3. `/api/test-update` (API)

```
INPUT:  (rien)
        │
        ▼
    ┌───────────────┐
    │  API Route    │
    │  test-update  │
    └───────┬───────┘
            │
            ├─► Connexion Supabase
            │   (via service role key)
            │
            ├─► UPDATE test_edt
            │   SET last_check = NOW()
            │   WHERE id = 1
            │
            └─► Retourne JSON
                │
                ▼
OUTPUT: {
          "success": true,
          "timestamp": "2025-11-08T14:00:00Z",
          "action": "updated"
        }
```

### 4. `/monitoring` (Page web)

```
    Utilisateur visite /monitoring
              │
              ▼
    ┌─────────────────────┐
    │  Page React         │
    │  (auto-refresh 30s) │
    └─────────┬───────────┘
              │
              ├─► Appelle /api/test-update
              │   └─► Récupère timestamp
              │
              ├─► Formate en français
              │   "Vendredi 8 novembre..."
              │
              ├─► Calcule "Il y a X heures"
              │
              └─► Affiche ✅ ou ❌
```

---

## 🆘 Dépannage rapide

### ❌ "Table test_edt does not exist"
```
Solution : Retournez à l'ÉTAPE 1
           Exécutez le script SQL dans Supabase
```

### ❌ Test local échoue
```
Solution : Vérifiez que npm run dev est en cours
           Vérifiez le fichier .env.local
```

### ❌ Cron jobs n'apparaissent pas
```
Solution : Vérifiez que vercel.json est à la racine
           Faites git push
           Attendez 2 minutes
```

### ❌ Timestamp ne change pas
```
Solution : Attendez 1 heure complète (14:00, 15:00...)
           Les crons s'exécutent à l'heure pile
           Vérifiez les logs Vercel
```

---

## 📚 Pour aller plus loin

```
┌────────────────────────────────────────────────────┐
│  Documentation complète disponible :              │
│                                                    │
│  📖 INDEX_AUTOMATION.md                           │
│     └─► Index de toute la documentation           │
│                                                    │
│  🚀 QUICK_START_AUTOMATION.md                     │
│     └─► Guide détaillé (même principe)            │
│                                                    │
│  📋 AUTOMATION_SUMMARY.md                         │
│     └─► Vue d'ensemble technique                  │
│                                                    │
│  🏗️ ARCHITECTURE_AUTOMATION.md                   │
│     └─► Diagrammes et architecture                │
│                                                    │
│  🔧 TROUBLESHOOTING_AUTOMATION.md                 │
│     └─► Dépannage détaillé                        │
│                                                    │
│  📝 RESUME_FINAL.md                               │
│     └─► Récapitulatif complet                     │
└────────────────────────────────────────────────────┘
```

---

## ✨ Récapitulatif visuel

```
┌─────────────────────────────────────────────────────┐
│                 VOTRE SYSTÈME                       │
└─────────────────────────────────────────────────────┘

✅ API de test            /api/test-update
✅ Table de test          test_edt (Supabase)
✅ Automatisation         Vercel Cron (toutes les heures)
✅ Page de monitoring     /monitoring
✅ Scripts de test        npm run test:automation
✅ Documentation          8 fichiers MD
✅ Backup                 GitHub Actions (optionnel)

┌─────────────────────────────────────────────────────┐
│                   RÉSULTAT                          │
└─────────────────────────────────────────────────────┘

❌ AVANT : Mise à jour manuelle
✅ APRÈS : Mise à jour automatique toutes les heures

🎉 Félicitations ! Votre système est opérationnel.
```

---

**Créé le :** 8 novembre 2025  
**Temps de lecture :** 5 minutes  
**Temps d'installation :** 5 minutes  
**Niveau :** Débutant friendly 🟢

