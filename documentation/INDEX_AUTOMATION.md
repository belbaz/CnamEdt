# 📚 Index - Documentation Automatisation EDT CNAM

Ce fichier centralise toute la documentation du système d'automatisation. Choisissez votre point d'entrée selon votre besoin.

---

## 🚀 Par où commencer ?

### 👤 Je suis nouveau / Je veux démarrer rapidement
→ **[QUICK_START_AUTOMATION.md](QUICK_START_AUTOMATION.md)** ⭐ **COMMENCEZ ICI**
- Guide pas-à-pas (5 minutes)
- Instructions simples
- Checklist de vérification

### 🧑‍💻 Je veux comprendre le système
→ **[AUTOMATION_SUMMARY.md](AUTOMATION_SUMMARY.md)**
- Vue d'ensemble
- Liste des fichiers créés
- Commandes disponibles
- Architecture simplifiée

### 🏗️ Je veux voir l'architecture technique
→ **[ARCHITECTURE_AUTOMATION.md](ARCHITECTURE_AUTOMATION.md)**
- Diagrammes visuels
- Flux de données
- Composants détaillés
- Sécurité et performance

### 🔧 J'ai un problème / Ça ne marche pas
→ **[TROUBLESHOOTING_AUTOMATION.md](TROUBLESHOOTING_AUTOMATION.md)**
- Solutions aux problèmes courants
- Checklist de diagnostic
- Outils de dépannage
- Demande d'aide

### 📖 Je veux tout savoir sur les options d'automatisation
→ **[AUTOMATISATION_GUIDE.md](AUTOMATISATION_GUIDE.md)**
- Toutes les solutions gratuites
- Comparaison détaillée
- Configuration de chaque option
- Avantages/Inconvénients

---

## 📂 Documentation par composant

### 🗄️ Base de données

**[supabase-sql/README.md](../supabase-sql/README.md)**
- Scripts SQL
- Structure des tables
- Configuration RLS
- Vérification

**[supabase-sql/create_test_edt_table.sql](../supabase-sql/create_test_edt_table.sql)**
- Script de création de table
- À exécuter dans Supabase

### 🔄 GitHub Actions

**[.github/README.md](../.github/README.md)**
- Configuration des secrets
- Utilisation du workflow
- Exécution manuelle

**[.github/workflows/update-edt.yml](../.github/workflows/update-edt.yml)**
- Code du workflow
- Configuration cron

### 💻 Code source

**[src/app/api/test-update/route.js](../src/app/api/test-update/route.js)**
- API de test
- Mise à jour timestamp

**[src/app/monitoring/page.jsx](../src/app/monitoring/page.jsx)**
- Interface de monitoring
- Visualisation temps réel

### 🧪 Scripts de test

**[scripts/test-automation.js](../scripts/test-automation.js)**
- Script Node.js
- Test des APIs

**[scripts/test-automation.ps1](../scripts/test-automation.ps1)**
- Script PowerShell (Windows)
- Même fonctionnalité

### ⚙️ Configuration

**[vercel.json](../vercel.json)**
- Configuration Vercel Cron Jobs
- 2 cron jobs définis

---

## 🎯 Par objectif

### ✅ Je veux installer le système
1. [QUICK_START_AUTOMATION.md](QUICK_START_AUTOMATION.md) - Démarrage
2. [supabase-sql/create_test_edt_table.sql](supabase-sql/create_test_edt_table.sql) - SQL
3. [vercel.json](vercel.json) - Déjà créé, juste `git push`

### 📊 Je veux comprendre comment ça marche
1. [AUTOMATION_SUMMARY.md](AUTOMATION_SUMMARY.md) - Vue d'ensemble
2. [ARCHITECTURE_AUTOMATION.md](ARCHITECTURE_AUTOMATION.md) - Détails techniques
3. [src/app/api/test-update/route.js](src/app/api/test-update/route.js) - Code

### 🧪 Je veux tester
1. `npm run test:automation` - Test local
2. [scripts/test-automation.js](scripts/test-automation.js) - Script de test
3. `/monitoring` - Interface web

### 🔧 Je veux configurer une solution spécifique
1. **Vercel Cron** → [AUTOMATISATION_GUIDE.md](AUTOMATISATION_GUIDE.md) § Option 1
2. **GitHub Actions** → [.github/README.md](.github/README.md)
3. **UptimeRobot** → [AUTOMATISATION_GUIDE.md](AUTOMATISATION_GUIDE.md) § Option 4

### 🚨 J'ai un problème
1. [TROUBLESHOOTING_AUTOMATION.md](TROUBLESHOOTING_AUTOMATION.md) - Dépannage
2. [QUICK_START_AUTOMATION.md](QUICK_START_AUTOMATION.md) § Dépannage rapide
3. Logs Vercel Dashboard

---

## 📋 Fichiers par type

### 📘 Documentation (lecture)
| Fichier | Description | Niveau |
|---------|-------------|--------|
| **QUICK_START_AUTOMATION.md** | Guide rapide | ⭐ Débutant |
| **AUTOMATION_SUMMARY.md** | Résumé complet | ⭐⭐ Intermédiaire |
| **AUTOMATISATION_GUIDE.md** | Guide détaillé | ⭐⭐⭐ Avancé |
| **ARCHITECTURE_AUTOMATION.md** | Architecture | ⭐⭐⭐ Avancé |
| **TROUBLESHOOTING_AUTOMATION.md** | Dépannage | ⭐⭐ Intermédiaire |
| **NOUVEAUX_FICHIERS.md** | Inventaire | ⭐ Débutant |
| **INDEX_AUTOMATION.md** | Ce fichier | ⭐ Débutant |

### 💻 Code (exécution)
| Fichier | Type | Usage |
|---------|------|-------|
| **src/app/api/test-update/route.js** | API Route | Automatique |
| **src/app/monitoring/page.jsx** | Page React | `/monitoring` |
| **scripts/test-automation.js** | Script Node | `npm run test:automation` |
| **scripts/test-automation.ps1** | Script PS | `.\scripts\test-automation.ps1` |

### ⚙️ Configuration (setup)
| Fichier | But | Action requise |
|---------|-----|----------------|
| **vercel.json** | Cron Vercel | ✅ Auto-détecté |
| **.github/workflows/update-edt.yml** | GitHub Actions | ⚠️ Secret requis |
| **supabase-sql/create_test_edt_table.sql** | Table DB | 🔴 Exécuter manuellement |

### 📖 READMEs (guides spécifiques)
| Fichier | Sujet |
|---------|-------|
| **supabase-sql/README.md** | Scripts SQL |
| **.github/README.md** | GitHub Actions |

---

## 🔍 Recherche rapide

### Mots-clés → Documentation

| Vous cherchez... | Allez voir... |
|------------------|---------------|
| **Installation** | [QUICK_START_AUTOMATION.md](QUICK_START_AUTOMATION.md) |
| **Erreur** | [TROUBLESHOOTING_AUTOMATION.md](TROUBLESHOOTING_AUTOMATION.md) |
| **Vercel Cron** | [AUTOMATISATION_GUIDE.md](AUTOMATISATION_GUIDE.md) § Option 1 |
| **GitHub Actions** | [.github/README.md](.github/README.md) |
| **SQL** | [supabase-sql/README.md](supabase-sql/README.md) |
| **Test local** | `npm run test:automation` |
| **Monitoring** | `/monitoring` ou [src/app/monitoring/page.jsx](src/app/monitoring/page.jsx) |
| **Architecture** | [ARCHITECTURE_AUTOMATION.md](ARCHITECTURE_AUTOMATION.md) |
| **Comparaison solutions** | [AUTOMATISATION_GUIDE.md](AUTOMATISATION_GUIDE.md) § Solutions |
| **Liste fichiers** | [NOUVEAUX_FICHIERS.md](NOUVEAUX_FICHIERS.md) |
| **API test** | [src/app/api/test-update/route.js](src/app/api/test-update/route.js) |
| **Variables env** | [TROUBLESHOOTING_AUTOMATION.md](TROUBLESHOOTING_AUTOMATION.md) § Variables |

---

## 🎓 Parcours d'apprentissage

### 🟢 Niveau Débutant (30 min)
1. Lire [QUICK_START_AUTOMATION.md](QUICK_START_AUTOMATION.md)
2. Exécuter le script SQL
3. Tester : `npm run test:automation`
4. Déployer : `git push`
5. Visiter `/monitoring`

### 🟡 Niveau Intermédiaire (1h)
1. Lire [AUTOMATION_SUMMARY.md](AUTOMATION_SUMMARY.md)
2. Comprendre les 2 APIs (fetch-ics + test-update)
3. Explorer les logs Vercel
4. Configurer GitHub Actions (optionnel)
5. Lire [TROUBLESHOOTING_AUTOMATION.md](TROUBLESHOOTING_AUTOMATION.md)

### 🔴 Niveau Avancé (2h+)
1. Lire [ARCHITECTURE_AUTOMATION.md](ARCHITECTURE_AUTOMATION.md)
2. Analyser le code des APIs
3. Comprendre le système de hash ICS
4. Explorer les tables Supabase (events, ics_history)
5. Tester toutes les solutions d'automatisation
6. Personnaliser la fréquence des crons

---

## 📊 Statistiques du projet

| Métrique | Valeur |
|----------|--------|
| **Fichiers créés** | 15 |
| **Lignes de documentation** | ~3000+ |
| **Lignes de code** | ~1000+ |
| **APIs créées** | 1 (test-update) |
| **Pages créées** | 1 (monitoring) |
| **Scripts** | 2 (JS + PS1) |
| **Solutions d'automatisation** | 5 options |
| **Temps d'installation** | 5 minutes |

---

## ✅ Checklist finale

Utilisez cette checklist pour valider votre installation :

```
Phase 1 : Setup
[ ] Lire QUICK_START_AUTOMATION.md
[ ] Créer table test_edt dans Supabase
[ ] Vérifier .env.local (local)
[ ] Vérifier variables env Vercel (prod)

Phase 2 : Test
[ ] npm run test:automation → 2/2 réussis
[ ] Visiter /monitoring → affichage OK
[ ] SELECT * FROM test_edt; → 1 ligne présente

Phase 3 : Déploiement
[ ] vercel.json présent à la racine
[ ] git push vers GitHub
[ ] Vercel Dashboard → Cron Jobs visibles
[ ] (Optionnel) GitHub Actions secret configuré

Phase 4 : Vérification
[ ] Attendre 1 heure
[ ] Vérifier test_edt.last_check a changé
[ ] Consulter logs Vercel (pas d'erreur)
[ ] /monitoring affiche nouveau timestamp

✅ Installation réussie !
```

---

## 🎉 Félicitations !

Si vous avez suivi le parcours complet, vous avez maintenant :

✅ Un système d'automatisation fonctionnel  
✅ Une compréhension complète de l'architecture  
✅ Les outils pour diagnostiquer les problèmes  
✅ Plusieurs options de backup  
✅ Une interface de monitoring  

**Votre EDT CNAM se met à jour automatiquement toutes les heures !** 🚀

---

## 📞 Besoin d'aide ?

1. **Problème technique** → [TROUBLESHOOTING_AUTOMATION.md](TROUBLESHOOTING_AUTOMATION.md)
2. **Comprendre un concept** → [ARCHITECTURE_AUTOMATION.md](ARCHITECTURE_AUTOMATION.md)
3. **Configurer une option** → [AUTOMATISATION_GUIDE.md](AUTOMATISATION_GUIDE.md)

---

## 🔗 Liens rapides

| Page | URL (production) |
|------|------------------|
| **Monitoring** | `https://votre-domaine.vercel.app/monitoring` |
| **API Test** | `https://votre-domaine.vercel.app/api/test-update` |
| **API EDT** | `https://votre-domaine.vercel.app/api/fetch-ics` |
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Supabase Dashboard** | https://supabase.com/dashboard |

---

**Créé le :** 8 novembre 2025  
**Version :** 1.0  
**Auteur :** Assistant IA  
**Licence :** Inclus dans le projet EDT CNAM

