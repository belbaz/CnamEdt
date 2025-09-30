# Architecture du projet - EDT EICNAM

## 📁 Structure des fichiers

```
src/
├── app/
│   ├── page.js                 # Composant principal (refactorisé)
│   ├── page.module.css         # Styles du container principal
│   ├── global.css              # Variables CSS et styles de base
│   ├── layout.js               # Layout Next.js
│   └── api/
│       └── fetch-ics/
│           └── route.js        # API pour récupérer l'emploi du temps
│
├── components/
│   ├── PageHeader.js           # En-tête avec toggle dark mode
│   ├── PageHeader.css
│   ├── LoadingSpinner.js       # Spinner de chargement
│   ├── LoadingSpinner.css
│   ├── DayBlock.js             # Bloc d'une journée complète
│   ├── DayBlock.css
│   └── Timeline/               # Composants de la timeline
│       ├── TimelineWrapper.js      # Wrapper principal de la timeline
│       ├── TimelineWrapper.css
│       ├── TimeMarkers.js          # Marqueurs horaires (8h, 9h, etc.)
│       ├── TimeMarkers.css
│       ├── CurrentTimeIndicator.js # Indicateur de l'heure actuelle
│       ├── CurrentTimeIndicator.css
│       ├── TimePassedOverlay.js    # Overlay pour le temps écoulé
│       ├── TimePassedOverlay.css
│       ├── EventsList.js           # Liste des événements
│       ├── EventsList.css
│       ├── EventCard.js            # Carte d'événement individuel
│       └── EventCard.css
│
└── utils/
    ├── dateUtils.js            # Fonctions de gestion des dates
    ├── eventUtils.js           # Fonctions de gestion des événements
    └── timelineUtils.js        # Fonctions de calcul pour la timeline
```

## 🧩 Composants

### Composants principaux

#### **PageHeader**
- Affiche le titre de l'application
- Bouton de toggle pour le mode sombre/clair
- Props : `darkMode`, `onToggleDarkMode`

#### **LoadingSpinner**
- Spinner de chargement animé
- Aucune props

#### **DayBlock**
- Représente une journée complète avec sa timeline
- Props : `day`, `events`, `subjectColors`
- Gère les calculs de plage horaire et génère les marqueurs

### Composants Timeline

#### **TimelineWrapper**
- Container principal de la timeline
- Coordonne tous les sous-composants (marqueurs, overlay, événements)
- Props : `timeMarkers`, `startMinutes`, `endMinutes`, `totalMinutes`, `currentPos`, `events`, `subjectColors`

#### **TimeMarkers**
- Affiche les marqueurs horaires (8h, 8h30, 9h, etc.)
- Adapte le positionnement (horizontal/vertical) selon la taille d'écran
- Props : `markers`, `startMinutes`, `endMinutes`, `totalMinutes`

#### **CurrentTimeIndicator**
- Ligne et point rouge indiquant l'heure actuelle
- Visible uniquement si c'est aujourd'hui
- Props : `currentPos`

#### **TimePassedOverlay**
- Overlay semi-transparent sur le temps écoulé
- Props : `currentPos`

#### **EventsList**
- Container de la liste des événements
- Gère le positionnement des cartes d'événements
- Props : `events`, `startMinutes`, `endMinutes`, `totalMinutes`, `subjectColors`

#### **EventCard**
- Carte individuelle pour un événement (cours)
- Affiche : horaire, matière, professeur, salle
- Props : `event`, `stylePos`, `subjectColors`

## 🛠️ Utilitaires

### **dateUtils.js**
- `getMonday(date)` - Obtient le lundi d'une date
- `getCurrentWeek()` - Obtient le lundi de la semaine actuelle
- `isToday(dayDate)` - Vérifie si une date est aujourd'hui
- `extractAvailableWeeks(data)` - Extrait les semaines disponibles

### **eventUtils.js**
- `createSubjectColorMapping(data)` - Crée le mapping des couleurs par matière
- `getEventTitle(ev)` - Extrait matière, prof, description d'un événement
- `getColorIndexForSubject(matiere, subjectColors)` - Retourne l'index de couleur
- `groupEventsByDay(events)` - Groupe les événements par jour

### **timelineUtils.js**
- `getDayTimeRange(dayEvents)` - Calcule la plage horaire d'une journée
- `generateTimeMarkers(startMinutes, endMinutes)` - Génère les marqueurs horaires
- `getCurrentTimePosition(dayDate, startMinutes, endMinutes)` - Position de l'heure actuelle
- `getEventPosition(startTime, endTime, dayStart, dayEnd)` - Position horizontale (desktop)
- `getEventPositionVertical(startTime, endTime, dayStart, dayEnd)` - Position verticale (mobile)

## 📱 Responsive Design

Le projet utilise une approche mobile-first avec des breakpoints :

- **Desktop** : Timeline horizontale, événements côte à côte
- **Tablet** (< 1024px) : Adaptations mineures
- **Mobile** (< 768px) : Ajustements de taille
- **Small Mobile** (< 650px) : Timeline verticale, événements empilés

## 🎨 Système de couleurs

5 couleurs de thème pour les matières :
1. Bleu (`#4299e1`)
2. Vert (`#48bb78`)
3. Orange (`#ed8936`)
4. Violet (`#9f7aea`)
5. Rouge (`#f56565`)

Les couleurs sont assignées automatiquement aux matières par ordre alphabétique.

## 🌙 Mode sombre

Géré via la classe `.dark-mode` sur `document.documentElement`
Persisté dans `localStorage`

## 💾 Gestion des données

- Fetch initial depuis l'API `/api/fetch-ics`
- Cache dans `localStorage` (clés : `events`, `subjectColors`, `darkMode`)
- Fallback sur le cache en cas d'erreur réseau
