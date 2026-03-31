# 📱 EDT EICNAM - Emploi du temps

Application web et mobile pour consulter l'emploi du temps EICNAM en temps réel.

---

## 🎯 Fonctionnalités

### 📅 Emploi du temps
- Affichage de l'emploi du temps par semaine
- Vue timeline avec indicateur de temps actuel
- Filtrage par matière et type de cours
- Mode compact pour vue d'ensemble

### 🤖 Automatisation
- **Mise à jour automatique** toutes les heures via GitHub Actions
- Détection des changements de cours
- Historique des modifications
- Page de monitoring en temps réel

### 📱 Multi-plateforme
- **Web :** Application responsive (Vercel)
- **Offline :** Fonctionne sans connexion (PWA)
- **PWA :** Installable sur mobile/desktop

### ⚙️ Fonctionnalités avancées
- Notifications push (web)
- Mode sombre/clair
- Export des cours
- 📄 **Upload de fichiers** pour les cours (Vercel Blob Storage)

---

## 🛠️ Technologies

- **Frontend :** React 19 + Next.js 16 (App Router)
- **Backend :** Next.js API Routes (serverless)
- **Base de données :** Supabase (PostgreSQL)
- **Automatisation :** GitHub Actions
- **Déploiement :** Vercel

---

## 📚 Documentation

**Toute la documentation se trouve dans le dossier [`documentation/`](documentation/)**

### 📖 Guides principaux

- **[documentation/QUICK_START_AUTOMATION.md](documentation/QUICK_START_AUTOMATION.md)** - Installation automatisation (5 min)
- **[documentation/DEPLOY_GUIDE.md](documentation/DEPLOY_GUIDE.md)** - Déploiement web et mobile
- **[documentation/INDEX_AUTOMATION.md](documentation/INDEX_AUTOMATION.md)** - Index complet de la documentation
- **[documentation/README.md](documentation/README.md)** - Index du dossier documentation

### 🔗 Accès rapide

| Documentation | Lien |
|---------------|------|
| **Automatisation** | [QUICK_START_AUTOMATION.md](documentation/QUICK_START_AUTOMATION.md) |
| **Dépannage** | [TROUBLESHOOTING_AUTOMATION.md](documentation/TROUBLESHOOTING_AUTOMATION.md) |
| **Architecture** | [ARCHITECTURE_AUTOMATION.md](documentation/ARCHITECTURE_AUTOMATION.md) |
| **Déploiement** | [DEPLOY_GUIDE.md](documentation/DEPLOY_GUIDE.md) |

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

## 📁 Structure du projet

```
cnam_edt/
├── src/
│   ├── app/                  # Pages Next.js
│   │   ├── page.tsx          # Page principale
│   │   ├── api/fetch-ics/    # API serverless
│   │   └── global.css        # Variables CSS globales
│   │
│   ├── components/           # Composants React
│   │   ├── PageHeader.tsx    # Header + toggle dark mode
│   │   ├── LoadingSpinner.tsx # Spinner de chargement
│   │   ├── WeekPicker.tsx    # Sélecteur de semaine
│   │   ├── DayBlock.tsx      # Bloc journée
│   │   └── Timeline/         # Composants timeline
│   │       ├── TimelineWrapper.tsx
│   │       ├── TimeMarkers.tsx
│   │       ├── EventsList.tsx
│   │       ├── EventCard.tsx
│   │       ├── CurrentTimeIndicator.tsx
│   │       └── TimePassedOverlay.tsx
│   │
│   ├── utils/                # Fonctions utilitaires
│   │   ├── dateUtils.tsx     # Gestion dates/semaines
│   │   ├── eventUtils.tsx    # Traitement événements
│   │   └── timelineUtils.tsx # Calculs timeline
│   │
│   ├── hooks/                # Hooks React custom
│   │   └── usePWA.ts         # Hook PWA
│   │
│   └── services/             # Services métier
│       └── icsService.tsx    # Fetch/parse ICS
│
├── public/                   # Assets statiques
├── scripts/                  # Scripts de build
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
- ✅ 📲 **Installation PWA** (Progressive Web App)

---

## 🔑 Variables d'environnement

---

## 🔄 Workflow

### Développement web
```bash
npm run dev              # Lancer le serveur dev
# Modifier le code
npm run build            # Build production
```

### Déployer le site web
```bash
.\deploy_website.bat      # Push Git et déploiement Vercel
```

---

## 📦 Dépendances principales

```json
{
  "dependencies": {
    "react": "19.2.1",
    "next": "16.0.10",
    "node-ical": "^0.21.0",
    "@supabase/supabase-js": "^2.45.3"
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

---

## 📊 Performance

| Métrique | Web | PWA |
|----------|-----|-----|
| Premier chargement | ~2s | ~3s |
| Chargements suivants | ~2s | **~0.5s** ⚡ |
| Offline | Cache API | Cache complet |

---

## 📚 Documentation

- **CONFIGURATION.md** - Configuration Supabase et variables d'environnement
- **documentation/README.md** - Index du dossier documentation
- **env.example** - Template des variables d'environnement

---

## 🎯 Commandes utiles

```bash
# Web
npm run dev                  # Développement
npm run build                # Build production
npm start                    # Serveur production

# Déploiement
.\deploy_website.bat         # Déploiement site web
```

---

## 🔧 Configuration

### Changer l'URL ICS
Modifier la variable d'environnement dans `.env.local` :
```env
ICS_URL=TON_URL_ICI
NEXT_PUBLIC_ICS_URL=TON_URL_ICI
```

---

## 📝 Auteur

Projet personnel - EICNAM

---

**Version actuelle : v2.1.96**

## 📝 Changelog

### v2.1.96 (31 mars 2026)
- 🧹 **Nettoyage projet** : Suppression de tout le code Android/APK
- 🌐 **Focus Web/PWA** : Application web uniquement avec support PWA
- 📱 **Installation PWA améliorée** : Installation progressive sur mobile et desktop