# 📱 EDT EICNAM - Emploi du temps

Application web et mobile pour consulter l'emploi du temps EICNAM.

---

## 🛠️ Technologies

- **Frontend** : React 19 + Next.js 16
- **Web** : Vercel (serverless functions)
- **Mobile** : Capacitor 6.0 (APK Android)
- **Styling** : CSS modules + CSS custom properties
- **Storage** : Supabase (hébergement APK + base de données)
- **Automatisation** : Vercel Cron Jobs + GitHub Actions

---

## 🤖 Automatisation (Nouveau !)

Le système d'EDT se met à jour **automatiquement toutes les heures** sans intervention manuelle.

### 🚀 Démarrage rapide (5 min)

1. **Créer la table de test dans Supabase :**
   - Ouvrir Supabase → SQL Editor
   - Copier-coller : `supabase-sql/create_test_edt_table.sql`
   - Exécuter

2. **Tester en local :**
   ```bash
   npm run test:automation
   ```

3. **Déployer :**
   ```bash
   git push
   ```
   
   ✅ C'est tout ! L'automatisation est active.

### 📚 Documentation complète

- **[INDEX_AUTOMATION.md](INDEX_AUTOMATION.md)** - Index de toute la documentation
- **[QUICK_START_AUTOMATION.md](QUICK_START_AUTOMATION.md)** ⭐ Guide rapide
- **[AUTOMATION_SUMMARY.md](AUTOMATION_SUMMARY.md)** - Vue d'ensemble
- **[TROUBLESHOOTING_AUTOMATION.md](TROUBLESHOOTING_AUTOMATION.md)** - Dépannage

### 🔍 Vérification

- **Page monitoring :** `/monitoring`
- **Vérifier la DB :** `SELECT * FROM test_edt;`
- **Logs Vercel :** Dashboard → Cron Jobs

---

## 🌐 Version Web (Vercel)

### Développement
```bash
npm run dev
```
Accessible sur http://localhost:3000

### Déployer le site web

**Script de déploiement simplifié :**
```bash
.\deploy_website.bat
```

Ou avec un message de commit personnalisé :
```bash
.\deploy_website.bat "Fix bug navbar"
```

Le script fera automatiquement :
1. Vérification de la configuration web
2. Vérification des API routes
3. Git add + commit + push vers GitHub
4. Déploiement automatique sur Vercel (via webhook)

**Note :** Vercel déploie automatiquement après chaque push sur GitHub (~1-2 minutes)

---

## 📱 Version Mobile (APK Android)

### Déployer l'APK

**Script de déploiement simplifié :**
```bash
.\deploy_apk.bat
```

Ou avec une version spécifique :
```bash
.\deploy_apk.bat 2.0.60
```

Le script fera automatiquement :
1. **Demande si vous voulez incrémenter** la version (+0.0.1) ou utiliser la version actuelle
2. **Mise à jour automatique** de tous les fichiers avec la version :
   - `package.json`
   - `src/app/api/version/route.js`
   - `src/app/page.js`
   - `android/app/build.gradle`
3. Build de l'APK release signé
4. Renommage : `edt_cnam_v2.0.60.apk`
5. Upload vers Supabase Storage (supprime l'ancien APK de même version si existe)
6. Remplacement systématique dans Supabase (même version = remplacée)

**APK généré dans :** `android\app\build\outputs\apk\release\edt_cnam_vX.X.X.apk`
**APK en ligne :** `https://supabase.../apk/edt_cnam_vX.X.X.apk`

### 🎯 Gestion des versions

- **Format unique** : `edt_cnam_vX.Y.Z.apk` (ex: `edt_cnam_v2.0.60.apk`)
- **Incrémentation optionnelle** : Le script demande si vous voulez incrémenter (+0.0.1)
- **Version spécifique** : Passer la version en paramètre pour forcer une version
- **Synchronisation** : Tous les fichiers mis à jour automatiquement
- **Remplacement Supabase** : L'APK de même version est toujours remplacé

### Système de mise à jour automatique

L'application mobile vérifie automatiquement au démarrage si une nouvelle version est disponible :
- ✅ Compare la version locale avec l'API `/api/version`
- ✅ Affiche une popup si mise à jour disponible
- ✅ Télécharge directement depuis Supabase
- ✅ **Aucun fichier `.env` dans l'APK** - tout passe par l'API web

### Configuration Supabase

Créez un fichier `.env.local` à la racine avec :
```env
# URL du projet Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-project-id.supabase.co
SUPABASE_SERVICE_ROLE=votre-service-role-key

# URL publique de l'APK (pour la popup de téléchargement)
NEXT_PUBLIC_APK_URL=https://votre-project-id.supabase.co/storage/v1/object/public/Apk%20Edt%20Eicnam/apk/app-debug.apk

# URL du fichier ICS EICNAM
ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics
NEXT_PUBLIC_ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics
```

**Note :** La `SUPABASE_SERVICE_ROLE` est nécessaire pour uploader l'APK automatiquement. Trouvez-la dans : Supabase Dashboard → Project Settings → API → service_role key

### Installer sur téléphone

**Via URL directe :**
L'APK est uploadé sur Supabase et accessible via l'URL configurée dans `.env.local`

**Via USB :**
```bash
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### Prérequis
- Android Studio installé
- JDK 17+ installé
- Compte Supabase (gratuit)
- Bucket Supabase `Apk Edt Eicnam` créé et configuré en public

---

## 📁 Structure du projet

```
cnam_edt/
├── src/
│   ├── app/                  # Pages Next.js
│   │   ├── page.js           # Page principale (170 lignes)
│   │   ├── api/fetch-ics/    # API serverless (web uniquement)
│   │   └── global.css        # Variables CSS globales
│   │
│   ├── components/           # Composants React
│   │   ├── PageHeader.js     # Header + toggle dark mode
│   │   ├── LoadingSpinner.js # Spinner de chargement
│   │   ├── WeekPicker.js     # Sélecteur de semaine
│   │   ├── DayBlock.js       # Bloc journée
│   │   └── Timeline/         # Composants timeline
│   │       ├── TimelineWrapper.js
│   │       ├── TimeMarkers.js
│   │       ├── EventsList.js
│   │       ├── EventCard.js
│   │       ├── CurrentTimeIndicator.js
│   │       └── TimePassedOverlay.js
│   │
│   ├── utils/                # Fonctions utilitaires
│   │   ├── dateUtils.js      # Gestion dates/semaines
│   │   ├── eventUtils.js     # Traitement événements
│   │   └── timelineUtils.js  # Calculs timeline
│   │
│   ├── hooks/                # Hooks React custom
│   │   └── useCapacitor.js   # Hook Capacitor (mobile)
│   │
│   └── services/             # Services métier
│       └── icsService.js     # Fetch/parse ICS
│
├── mobile-config/            # Configuration mobile
│   ├── build-apk.bat         # Script build APK
│   ├── capacitor.config.ts   # Config Capacitor
│   ├── next.config.mobile.js # Config Next.js mobile
│   └── *.md                  # Documentation
│
├── android/                  # Projet Android (généré)
├── out/                      # Build statique (généré)
├── public/                   # Assets statiques
├── .env.local                # Variables d'environnement
└── package.json              # Dépendances
```

---

## ⚙️ Comment ça marche

### Architecture Web (Vercel)
```
User → Vercel → Next.js App
                    ↓
            API /fetch-ics (serverless)
                    ↓
            Fetch ICS depuis CNAM
                    ↓
            Parse avec node-ical
                    ↓
            Return JSON → Frontend
```

### Architecture Mobile (APK)
```
User → App Android (Capacitor)
            ↓
       page.js détecte mobile
            ↓
       Charge cache localStorage (instant) ⚡
            ↓
       Fetch ICS en arrière-plan (CapacitorHttp)
            ↓
       Parse côté client (parseICSContent)
            ↓
       Update cache
            ↓
       Update UI
```

**Différence clé :** 
- **Web** : Passe par API serverless (parse côté serveur)
- **Mobile** : Fetch direct + parse côté client (pas d'API)

### Sélection Intelligente de Semaine 🎯

L'application choisit automatiquement la semaine à afficher selon cette logique :

```
1. Semaine actuelle (si elle contient des cours) ✅
   ↓
2. Prochaine semaine future avec cours ✅
   ↓
3. Première semaine disponible (fallback)
```

**Exemple** : Si on est le 19 octobre et que cette semaine n'a pas de cours, l'app affiche automatiquement la prochaine semaine avec cours (même si c'est en février).

**Bouton "Aujourd'hui" 📅** : Utilise la même logique intelligente. Si la semaine actuelle n'a pas de cours, il vous amène directement à la prochaine semaine avec cours.

---

## 🎨 Features

### Version actuelle (v1.3.0)
- ✅ Timeline responsive (horizontal desktop, vertical mobile)
- ✅ Sélecteur de semaine (navigation ← →)
- ✅ **Sélection intelligente de semaine** (affiche la prochaine semaine avec cours)
- ✅ Mode sombre/clair
- ✅ Bouton actualiser
- ✅ Indicateur temps actuel (ligne rouge)
- ✅ Overlay temps écoulé
- ✅ Couleurs par matière (5 couleurs auto-assignées)
- ✅ Cache localStorage (chargement rapide)
- ✅ Splash screen natif (mobile)
- ✅ Mode test 🧪 (ajout de cours fictifs)
- ✅ Jours dépliables/repliables
- ✅ Scroll automatique vers aujourd'hui
- ✅ Pull-to-refresh (mobile)
- ✅ 📲 **Popup de téléchargement APK** (Android web uniquement)
- ✅ 🔄 **Vérification automatique des mises à jour** (app native)
- ✅ 🎯 **Système de versioning** (APK avec numéro de version)

### Version future (v2.0) - Optionnel
- 🔄 Notifications push automatiques
- 🔄 Supabase backend
- 🔄 Edge Functions (vérification toutes les heures)
- 🔄 Multi-utilisateurs
- 🔄 URL ICS personnalisable
- 🔄 Historique des changements

---

## 🔑 Variables d'environnement

Voir la section "Configuration Supabase" ci-dessus pour le fichier `.env.local` complet.

---

## 🔄 Workflow

### Développement web
```bash
npm run dev              # Lancer le serveur dev
# Modifier le code
npm run build            # Build production
```

### Déployer l'APK
```bash
.\deploy_apk.bat          # Crée l'APK et l'uploade sur Supabase
```

### Déployer le site web
```bash
.\deploy_website.bat      # Push Git et déploiement Vercel
```

### Modifier l'URL ICS (mobile)
Éditer `src/services/icsService.js` ligne 6 :
```javascript
const ICS_URL = 'TON_URL_ICI';
```

---

## 📦 Dépendances principales

```json
{
  "dependencies": {
    "react": "18.3.1",
    "next": "15.4.7",
    "node-ical": "^0.21.0",
    "@supabase/supabase-js": "^2.45.3",
    "@capacitor/core": "^6.0.0",
    "@capacitor/android": "^6.0.0",
    "@capacitor/splash-screen": "^6.0.0",
    "@capacitor/push-notifications": "^6.0.0"
  }
}
```

---

## 🚀 Quick Start

### Premier lancement
```bash
# 1. Installer les dépendances
npm install

# 2. Créer .env.local avec ton URL ICS
# Voir section "Variables d'environnement"

# 3. Lancer le dev
npm run dev
```

### Créer l'APK
```bash
# Installer Android Studio + JDK 17
# Puis :
cd mobile-config
.\build-apk.bat
```

---

## 📊 Performance

| Métrique | Web | Mobile v1 | Mobile v2 (optimisée) |
|----------|-----|-----------|----------------------|
| Premier chargement | ~2s | ~3s | ~3s |
| Chargements suivants | ~2s | ~3s | **~0.5s** ⚡ |
| Taille APK | - | ~20 MB | ~20 MB |
| Offline | ❌ | Cache partiel | Cache partiel |

---

## 📚 Documentation

- **CONFIGURATION.md** - Configuration Supabase et variables d'environnement
- **mobile-config/GUIDE.md** - Guide complet pour créer l'APK
- **env.example** - Template des variables d'environnement

---

## 🎯 Commandes utiles

```bash
# Web
npm run dev                  # Développement
npm run build                # Build production
npm start                    # Serveur production

# Mobile
npm run build:mobile         # Build + sync (sans APK)
npm run mobile:android       # Ouvrir Android Studio
npm run mobile:sync          # Sync vers Android

# Déploiement
.\deploy_apk.bat          # Build et upload APK
.\deploy_website.bat      # Déploiement site web
```

---

## 🌟 Fonctionnement du cache mobile

```
Lancement 1 :
├─ Splash screen (2s)
├─ Fetch ICS depuis CNAM
├─ Parse + affichage
└─ Sauvegarde dans localStorage

Lancement 2+ :
├─ Splash screen (0.3s)
├─ Affichage IMMÉDIAT du cache ⚡
├─ Fetch ICS en arrière-plan
└─ Update silencieux si changements
```

---

## 🔧 Configuration

### Modes de Build (Web vs Mobile)

Le projet utilise une configuration conditionnelle basée sur `BUILD_MODE` :

| Mode | Commande | Configuration |
|------|----------|---------------|
| **Web** | `npm run build` | Mode normal (avec API routes) |
| **Mobile** | `.\build-apk.bat` | Export statique (`BUILD_MODE=mobile`) |

### Changer l'URL ICS
Éditer `src/services/icsService.js` :
```javascript
const ICS_URL = 'TON_URL_ICI';
```

### Changer les couleurs du splash
Éditer `capacitor.config.ts` :
```typescript
backgroundColor: "#4299e1"  // Couleur de fond
spinnerColor: "#ffffff"     // Couleur du spinner
```

---

## 📝 Auteur

Projet personnel - EICNAM

---

**Version actuelle : v1.4.0**

## 📝 Changelog

### v1.4.0 (26 octobre 2024)
- 🤖 **Gestion automatique des versions** : Version centralisée dans `package.json`
- ⬆️ **Auto-incrémentation** : +0.0.1 automatique à chaque build
- 🔄 **Synchronisation automatique** : Mise à jour de tous les fichiers automatiquement
- 🎯 **Plus de modification manuelle** : Le script gère tout !
- ✅ **Bouton "Vérifier les mises à jour"** dans les paramètres de l'app

### v1.3.0 (26 octobre 2024)
- 🎯 **Système de versioning** : APK nommé `edt_cnam_vX.X.X.apk` avec version incrémentale
- 🔄 **Vérification automatique des mises à jour** : L'app vérifie au démarrage si nouvelle version disponible
- 🌐 **API /api/version** : Endpoint pour récupérer la dernière version disponible
- 📱 **UpdateChecker** : Popup de mise à jour dans l'app native
- 🗑️ **Nettoyage automatique** : Suppression des anciennes versions sur Supabase
- 🔒 **Sécurité** : Aucun fichier `.env` dans l'APK - tout passe par l'API web

### v1.2.1 (26 octobre 2024)
- 🔧 **Fix upload Supabase** : Correction de la configuration (bucket `Apk Edt Eicnam`, dossier `apk/`, variable `SUPABASE_SERVICE_ROLE`)
- 🗑️ **Suppression automatique** : L'ancien APK est supprimé avant l'upload du nouveau
- 📚 **Documentation mise à jour** : Toutes les références corrigées dans README, CONFIGURATION.md, et guides

### v1.2 (26 octobre 2024)
- 📤 **Upload automatique vers Supabase** : L'APK est automatiquement uploadé sur Supabase après chaque build
- 🔧 **Fix restauration configuration** : Le script restaure automatiquement `next.config.js` en mode web après le build APK
- ⚙️ **Configuration Supabase** : Guide complet pour configurer l'upload automatique

### v1.1 (25 octobre 2024)
- ✨ **Sélection intelligente de semaine** : Affiche automatiquement la prochaine semaine avec cours si la semaine actuelle est vide
- 🔧 **Fix "Failed to fetch"** : URL par défaut intégrée, plus besoin de `.env.local` obligatoire
- 🎯 **Meilleure gestion d'erreur** : Messages plus clairs, timeout de 10s, anti-cache
- 📝 **Logs détaillés** : Console logs pour faciliter le debugging
- 🏗️ **Configuration conditionnelle** : Build web et mobile séparés avec `BUILD_MODE`

### v1.0 (Octobre 2024)
- 🎉 Version initiale
- ✅ Timeline responsive
- ✅ Mode sombre/clair
- ✅ Cache localStorage
- ✅ Application mobile (APK)