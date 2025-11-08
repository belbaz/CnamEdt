# 📋 Résumé de l'Automatisation - EDT CNAM

## 🎯 Objectif

Automatiser la mise à jour de l'emploi du temps EDT CNAM toutes les heures, avec une table de test pour vérifier le bon fonctionnement.

---

## ✅ Fichiers créés

### 1. API Routes
- **`src/app/api/test-update/route.js`**
  - API simple qui met à jour le timestamp dans `test_edt`
  - Endpoint : `/api/test-update`
  - Retourne : JSON avec timestamp et status

### 2. Base de données
- **`supabase-sql/create_test_edt_table.sql`**
  - Script SQL pour créer la table `test_edt`
  - Contient 1 ligne avec : `id`, `last_check`, `created_at`
  - À exécuter dans Supabase SQL Editor

### 3. Configuration automatisation
- **`vercel.json`**
  - Configuration Vercel Cron Jobs
  - 2 cron jobs : `/api/fetch-ics` + `/api/test-update`
  - Exécution : toutes les heures (à la minute 0)

- **`.github/workflows/update-edt.yml`**
  - GitHub Actions workflow (backup)
  - Même fonctionnalité que Vercel Cron
  - Nécessite secret : `VERCEL_DOMAIN`

### 4. Scripts de test
- **`scripts/test-automation.js`**
  - Script Node.js pour tester les APIs
  - Usage : `npm run test:automation`
  - Teste les 2 endpoints et affiche les résultats

### 5. Interface de monitoring
- **`src/app/monitoring/page.jsx`**
  - Page web pour visualiser le statut en temps réel
  - URL : `/monitoring`
  - Affiche le dernier timestamp et se rafraîchit automatiquement

### 6. Documentation
- **`AUTOMATISATION_GUIDE.md`**
  - Guide complet avec toutes les solutions d'automatisation
  - Comparaison des différentes options
  - Instructions détaillées

- **`QUICK_START_AUTOMATION.md`**
  - Guide de démarrage rapide (5 minutes)
  - Instructions pas-à-pas simplifiées
  - Checklist de vérification

- **`.github/README.md`**
  - Documentation pour GitHub Actions
  - Configuration des secrets
  - Instructions d'utilisation

---

## 🚀 Comment démarrer

### Étape 1 : Créer la table (2 min)
```sql
-- Dans Supabase SQL Editor
-- Copier-coller le contenu de : supabase-sql/create_test_edt_table.sql
```

### Étape 2 : Tester localement (1 min)
```bash
npm run test:automation
```

### Étape 3 : Déployer sur Vercel (1 min)
```bash
git add .
git commit -m "Add automatic EDT update system"
git push
```

**✅ C'est tout ! L'automatisation est active.**

---

## 🔍 Vérification

### Dans Supabase
```sql
SELECT * FROM test_edt;
-- Le champ last_check doit changer toutes les heures
```

### Dans Vercel Dashboard
1. Ouvrir votre projet
2. Aller dans "Cron Jobs"
3. Vérifier que 2 jobs sont actifs
4. Consulter les logs dans l'onglet "Logs"

### Via l'interface web
Visitez : `https://votre-domaine.vercel.app/monitoring`

---

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│         Vercel Cron Jobs                │
│  (s'exécute toutes les heures)         │
└─────────────┬───────────────────────────┘
              │
              ├─► /api/fetch-ics
              │   └─► Met à jour les cours EDT
              │       depuis le fichier ICS
              │
              └─► /api/test-update
                  └─► Met à jour test_edt.last_check
                      (pour vérifier que ça marche)
```

---

## 🆘 Solutions d'automatisation disponibles

| Solution | Coût | Complexité | Status |
|----------|------|------------|--------|
| **Vercel Cron** | Gratuit | ⭐ Facile | ✅ Configuré |
| **GitHub Actions** | Gratuit | ⭐⭐ Moyen | ✅ Configuré (backup) |
| **UptimeRobot** | Gratuit | ⭐ Facile | ⚪ Option manuelle |
| **Cron-job.org** | Gratuit | ⭐ Facile | ⚪ Option manuelle |
| **Supabase pg_cron** | Gratuit | ⭐⭐⭐ Avancé | ⚪ Non configuré |

---

## 🎉 Avantages

✅ **Simple** : Un seul `git push` pour activer  
✅ **Gratuit** : Toutes les solutions proposées sont gratuites  
✅ **Fiable** : 2 systèmes en parallèle (Vercel + GitHub Actions)  
✅ **Vérifiable** : Table de test + page de monitoring  
✅ **Flexible** : Changez facilement la fréquence dans `vercel.json`  
✅ **Logs** : Vérifiez l'exécution dans Vercel Dashboard  

---

## 📝 Commandes npm ajoutées

```bash
# Tester l'automatisation en local
npm run test:automation

# Tester l'automatisation en production
npm run test:automation:prod
```

---

## 🔗 URLs importantes

- **API de test** : `/api/test-update`
- **API principale** : `/api/fetch-ics`
- **Page de monitoring** : `/monitoring`
- **Vercel Cron Jobs** : Dashboard Vercel → Cron Jobs
- **GitHub Actions** : Repo GitHub → Actions

---

## 📚 Documentation complète

Consultez ces fichiers pour plus de détails :

1. **`QUICK_START_AUTOMATION.md`** - Démarrage rapide
2. **`AUTOMATISATION_GUIDE.md`** - Guide complet
3. **`supabase-sql/create_test_edt_table.sql`** - Script SQL commenté

---

## ✅ Checklist finale

- [ ] Table `test_edt` créée dans Supabase
- [ ] Variables d'environnement configurées (`.env.local`)
- [ ] Test local réussi (`npm run test:automation`)
- [ ] Code déployé sur Vercel (`git push`)
- [ ] Cron jobs visibles dans Vercel Dashboard
- [ ] Attendre 1 heure et vérifier `test_edt.last_check`
- [ ] (Optionnel) Configurer GitHub Actions secret `VERCEL_DOMAIN`
- [ ] (Optionnel) Visiter `/monitoring` pour voir le statut

---

**🎊 Félicitations ! Votre système est maintenant automatisé.**

Les cours seront vérifiés et mis à jour automatiquement toutes les heures, sans aucune intervention manuelle.

