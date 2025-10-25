# 📱 EDT EICNAM - Emploi du temps

Application web et mobile pour consulter l'emploi du temps EICNAM.

---

## 🛠️ Technologies

- **Frontend** : React 18.3 + Next.js 15.4
- **Web** : Vercel (serverless functions)
- **Mobile** : Capacitor 6.0 (APK Android)
- **Styling** : CSS modules + CSS custom properties
- **Backend** : Supabase (à venir - v2.0)
- **Notifications** : Firebase FCM (à venir - v2.0)

---

## 🌐 Version Web (Vercel)

### Développement
```bash
npm run dev
```
Accessible sur http://localhost:3000

### Déploiement
Push sur GitHub → Vercel déploie automatiquement

---

## 📱 Version Mobile (APK Android)

### Créer l'APK
```bash
cd mobile-config
.\build-apk.bat
```

**APK généré dans :** `android\app\build\outputs\apk\debug\app-debug.apk`

### Installer sur téléphone

**Via USB :**
```bash
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

**Via fichier :**
Copier l'APK sur le téléphone et l'installer directement

### Prérequis
- Android Studio installé
- JDK 17+ installé

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

### Version actuelle (v1.1)
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

### Version future (v2.0) - Optionnel
- 🔄 Notifications push automatiques
- 🔄 Supabase backend
- 🔄 Edge Functions (vérification toutes les heures)
- 🔄 Multi-utilisateurs
- 🔄 URL ICS personnalisable
- 🔄 Historique des changements

---

## 🔑 Variables d'environnement

`.env.local` (optionnel) :
```bash
# URL du fichier ICS EICNAM
ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics

# Pour mobile (facultatif, hardcodé dans icsService.js)
NEXT_PUBLIC_ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics
```

**Note** : Le fichier `.env.local` n'est plus obligatoire. L'API utilise une URL par défaut si non configurée.

---

## 🔄 Workflow

### Développement web
```bash
npm run dev              # Lancer le serveur dev
# Modifier le code
npm run build            # Build production
```

### Build APK mobile
```bash
cd mobile-config
.\build-apk.bat          # Crée l'APK
# Installer sur téléphone
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

- **ORGANISATION.md** - Structure du projet
- **REFACTORING_MOBILE.md** - Détails du refactoring mobile
- **mobile-config/README.md** - Doc build APK
- **mobile-config/*.md** - Guides détaillés

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

# APK
cd mobile-config && .\build-apk.bat   # Build complet APK
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

**Détails** : Voir `BUILD_MODES.md`

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

**Version actuelle : v1.1**

## 📝 Changelog

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