# 🗺️ Room Mapper - Outil d'Administration

## Vue d'ensemble

Le **Room Mapper** est un outil d'administration pour identifier et enregistrer automatiquement les positions des numéros de salles sur le plan SVG du campus CNAM.

## Accès

- **Mode dev** : Cliquer sur le bouton 🗺️ dans la navbar
- **URL directe** : `/admin/room-mapper`

## Fonctionnalités

### 1. Détection automatique
- Parse le fichier `public/plan.svg`
- Détecte tous les numéros de salles (balises `<text>` avec `<tspan>`)
- Extrait automatiquement les coordonnées (x, y)

### 2. Visualisation interactive
- Affiche le plan SVG avec overlay
- Cercles rouges autour de chaque numéro détecté
- Numéros affichés en rouge par-dessus

### 3. Édition des positions
- Bouton ✏️ pour chaque salle dans la liste
- Mode édition interactif avec curseur en croix
- Clic sur le plan pour repositionner la salle
- Animation visuelle de la salle en cours d'édition

### 4. Validation
- Liste des salles détectées dans le panneau latéral
- Bouton ✓/✗ pour activer/désactiver chaque salle
- Sélection d'une salle pour voir ses détails

### 5. Génération de code
- Génère automatiquement le code `BUILDING_COORDINATES`
- Bouton "📋 Copier le code" pour copier dans le presse-papier
- Bouton "💾 Exporter JSON" pour backup

## Utilisation

1. **Ouvrir** `/admin/room-mapper` en mode dev
2. L'outil scanne automatiquement `public/plan.svg`
3. **Visualiser** les salles détectées avec des cercles rouges
4. **Cliquer** sur une salle pour voir ses détails
5. **Modifier** la position d'une salle :
   - Cliquer sur le bouton ✏️ à côté de la salle
   - Cliquer sur le plan à l'endroit désiré
   - La position est mise à jour instantanément
6. **Désactiver** les fausses détections avec ✗
7. **Copier** le code généré
8. **Coller** dans `src/components/MapViewer/MapViewer.js`

## Structure du code généré

```javascript
const BUILDING_COORDINATES = {
    "9": { x: 157, y: 581 },
    "10": { x: 422, y: 570 },
    "11": { x: 152, y: 462 },
    "12": { x: 372, y: 555 },
    // ...
};
```

## Fichiers

- **Page** : `src/app/admin/room-mapper/page.js`
- **Styles** : `src/app/admin/room-mapper/room-mapper.css`
- **Documentation** : `documentation/MAP_COORDINATES.md`

## Technologies

- **React 19** : Composant client
- **DOMParser** : Parse le SVG
- **SVG Overlay** : Affichage des cercles et numéros
- **CSS Modules** : Styles isolés

## Notes

- Détecte uniquement les numéros à 1 ou 2 chiffres
- Les coordonnées sont arrondies à l'entier le plus proche
- Les doublons (même numéro de salle) sont automatiquement fusionnés
- Mode édition avec curseur en croix pour repositionner facilement
- Le plan SVG est automatiquement redimensionné pour éviter les espaces blancs
- L'attribut `data-room` dans le SVG n'est pas encore supporté (amélioration future)

