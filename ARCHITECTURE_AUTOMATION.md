# 🏗️ Architecture du Système d'Automatisation

Ce document explique visuellement comment fonctionne le système d'automatisation EDT CNAM.

---

## 📊 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                     SYSTÈME D'AUTOMATISATION                     │
│                         EDT CNAM                                 │
└─────────────────────────────────────────────────────────────────┘

                              ⏰ Toutes les heures
                                      │
                ┌─────────────────────┼─────────────────────┐
                │                     │                     │
                ▼                     ▼                     ▼
        ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
        │  Vercel Cron  │    │    GitHub     │    │  UptimeRobot  │
        │     Jobs      │    │    Actions    │    │  (optionnel)  │
        └───────┬───────┘    └───────┬───────┘    └───────┬───────┘
                │                    │                    │
                │                    │                    │
                └────────────────────┼────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │    Application Next.js          │
                    │    (Déployée sur Vercel)        │
                    └────────────┬────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌──────────────────────┐  ┌──────────────────────┐
        │  /api/fetch-ics      │  │  /api/test-update    │
        │                      │  │                      │
        │  - Télécharge ICS    │  │  - Met à jour        │
        │  - Parse les cours   │  │    test_edt          │
        │  - Détecte changem.  │  │  - Enregistre        │
        │  - Met à jour DB     │  │    timestamp         │
        └──────────┬───────────┘  └──────────┬───────────┘
                   │                         │
                   └────────────┬────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │   Supabase Database  │
                    │                      │
                    │  Tables:             │
                    │  - events            │
                    │  - ics_history       │
                    │  - test_edt ⭐       │
                    └──────────┬───────────┘
                               │
                               │ Lecture
                               ▼
                    ┌──────────────────────┐
                    │   /monitoring        │
                    │                      │
                    │  Page web pour       │
                    │  visualiser l'état   │
                    └──────────────────────┘
```

---

## 🔄 Flux de données

### 1️⃣ Déclenchement automatique

```
⏰ Heure pile (ex: 14:00:00)
     │
     ├─► Vercel Cron Job se réveille
     └─► GitHub Actions se réveille (backup)
```

### 2️⃣ Appel des APIs

```
Vercel Cron Job
     │
     ├─► GET /api/fetch-ics
     │        │
     │        ├─► Télécharge ICS depuis galao.cnam.fr
     │        ├─► Calcule le hash SHA256
     │        ├─► Compare avec le dernier hash
     │        │
     │        ├─► Si différent:
     │        │   ├─► Parse les événements
     │        │   ├─► Détecte les ajouts/modifications
     │        │   └─► Sauvegarde dans 'events' table
     │        │
     │        └─► Si identique:
     │            └─► Retourne le cache (pas de parsing)
     │
     └─► GET /api/test-update
              │
              └─► UPDATE test_edt SET last_check = NOW()
```

### 3️⃣ Sauvegarde en base

```
Supabase Database
     │
     ├─► Table: events
     │   └─► Cours mis à jour
     │
     ├─► Table: ics_history
     │   └─► Hash + timestamp
     │
     └─► Table: test_edt ⭐
         └─► Timestamp de vérification
```

### 4️⃣ Visualisation

```
Utilisateur visite /monitoring
     │
     ├─► Page React se charge
     ├─► Appel GET /api/test-update
     ├─► Affiche le dernier timestamp
     └─► Rafraîchit toutes les 30s
```

---

## 🎯 Composants clés

### 🟢 Sources de déclenchement

| Composant | Fréquence | Fiabilité | Coût |
|-----------|-----------|-----------|------|
| **Vercel Cron** | Toutes les heures | ⭐⭐⭐⭐⭐ | Gratuit |
| **GitHub Actions** | Toutes les heures | ⭐⭐⭐⭐ | Gratuit |
| **UptimeRobot** | Configurable | ⭐⭐⭐ | Gratuit |

### 🔵 APIs

#### `/api/fetch-ics`
```
Input:  Aucun
Output: { events: [...], diff: {...}, meta: {...} }
Action: Met à jour les cours EDT
```

#### `/api/test-update`
```
Input:  Aucun
Output: { success: true, timestamp: "...", action: "updated" }
Action: Met à jour test_edt.last_check
```

### 🟣 Base de données

```sql
-- Table de test
test_edt (
    id          INTEGER PRIMARY KEY,     -- Toujours 1
    last_check  TIMESTAMPTZ NOT NULL,    -- Mis à jour automatiquement
    created_at  TIMESTAMPTZ NOT NULL     -- Date de création
)
```

### 🟡 Monitoring

```
/monitoring
    │
    ├─► Affiche last_check
    ├─► Calcule "il y a X heures"
    ├─► Status visuel (✅/❌)
    └─► Auto-refresh (30s)
```

---

## 🔐 Sécurité

```
┌─────────────────────────────────────────┐
│          Couche de sécurité             │
└─────────────────────────────────────────┘

Public (Internet)
     │
     ├─► GET /api/fetch-ics ✅ Public
     ├─► GET /api/test-update ✅ Public
     └─► GET /monitoring ✅ Public
            │
            ▼
     Next.js Server
            │
            ├─► Utilise SUPABASE_SERVICE_ROLE 🔒
            └─► Écrit dans la DB
                   │
                   ▼
            Supabase Database
                   │
                   ├─► RLS activé sur test_edt
                   ├─► Lecture publique ✅
                   └─► Écriture service role uniquement 🔒
```

**Points de sécurité :**
- ✅ Les variables sensibles sont dans `.env.local` (non commité)
- ✅ Service role utilisé côté serveur uniquement
- ✅ RLS activé sur les tables
- ✅ Pas d'authentification nécessaire (read-only)

---

## ⚡ Performance

### Optimisations

```
1. Cache intelligent
   └─► Si hash ICS identique → retour cache (pas de parsing)

2. Parsing conditionnel
   └─► Parse seulement si ICS a changé

3. Batch operations
   └─► Toutes les opérations DB en une transaction

4. Index
   └─► Index sur timestamp, ics_hash
```

### Temps d'exécution typique

| Opération | Temps moyen | Notes |
|-----------|-------------|-------|
| `/api/test-update` | ~200ms | Simple UPDATE |
| `/api/fetch-ics` (cache) | ~500ms | Retour depuis DB |
| `/api/fetch-ics` (parse) | ~2-5s | Télécharge + parse ICS |

---

## 🔧 Configuration

### Fichiers de configuration

```
vercel.json
└─► Définit les cron jobs Vercel

.github/workflows/update-edt.yml
└─► Définit le workflow GitHub Actions

.env.local (non commité)
└─► Variables d'environnement sensibles
```

### Variables d'environnement requises

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGc...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# ICS
ICS_URL=https://galao.cnam.fr/.../agenda.ics
NEXT_PUBLIC_ICS_URL=https://galao.cnam.fr/.../agenda.ics
```

---

## 📈 Monitoring & Logs

### Où voir les logs ?

```
┌─────────────────────────────────────────┐
│             Sources de logs             │
└─────────────────────────────────────────┘

1. Vercel Dashboard
   └─► Logs → Filter by "/api/fetch-ics" ou "/api/test-update"

2. GitHub Actions
   └─► Actions → Workflow "Update EDT Automatique"

3. Supabase
   └─► SQL Editor → SELECT * FROM test_edt;

4. Page /monitoring
   └─► Interface visuelle en temps réel
```

### Que surveiller ?

| Métrique | Valeur attendue | Action si anomalie |
|----------|-----------------|-------------------|
| `test_edt.last_check` | Mis à jour toutes les heures | Vérifier logs Vercel |
| Temps d'exécution | < 5s | Vérifier connexion ICS |
| Erreurs HTTP | 0 erreur | Vérifier variables env |

---

## 🚨 Gestion des erreurs

```
Erreur détectée
     │
     ├─► Logged dans Vercel
     ├─► Logged dans GitHub Actions
     └─► Visible dans /monitoring
            │
            └─► Types d'erreurs:
                ├─► 500: Erreur serveur (config, DB)
                ├─► 404: Route non trouvée
                ├─► Timeout: Téléchargement ICS échoué
                └─► DB Error: Problème Supabase
```

**Stratégie de retry :**
- Vercel Cron : Réessayera à la prochaine heure
- GitHub Actions : Peut être relancé manuellement
- Pas de retry automatique immédiat (évite surcharge)

---

## 🎓 Points d'apprentissage

Ce système démontre plusieurs concepts :

1. **Cron Jobs serverless** (Vercel)
2. **CI/CD automatisé** (GitHub Actions)
3. **API REST** (Next.js API Routes)
4. **Base de données cloud** (Supabase)
5. **Hash-based caching** (SHA256)
6. **Monitoring en temps réel** (React + polling)
7. **Row Level Security** (RLS Supabase)
8. **Parsing ICS** (node-ical)

---

## 📚 Ressources

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [GitHub Actions](https://docs.github.com/actions)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

**Architecture créée le :** 8 novembre 2025  
**Version :** 1.0  
**Statut :** ✅ Production ready

