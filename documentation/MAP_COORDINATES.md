# 🗺️ Gestion des Coordonnées des Salles sur la Carte

## 📍 Vue d'ensemble

Le composant `MapViewer` affiche un plan interactif du campus CNAM avec un cercle rouge qui entoure automatiquement la salle d'un cours.

### Comment ça fonctionne ?

1. **Extraction du numéro de bâtiment** : Depuis la location du cours (ex: "31.1.67pc"), on extrait le numéro principal (ici "31")
2. **Recherche des coordonnées** : On cherche ce numéro dans le mapping `BUILDING_COORDINATES`
3. **Affichage sur la carte** : Un cercle rouge apparaît aux coordonnées trouvées

---

## 🔍 Mode Debug

Un **mode debug** est disponible pour visualiser toutes les salles configurées :

1. Ouvrir un cours avec une location
2. Cliquer sur "🗺️ Voir dans la map"
3. Cliquer sur le bouton **🔍** en haut à gauche
4. Toutes les salles s'affichent avec des petits cercles rouges et leurs numéros

**Utilité** : Vérifier visuellement que les coordonnées sont correctes !

---

## 📂 Fichiers concernés

- **Code principal** : `src/components/MapViewer/MapViewer.js`
- **Styles** : `src/components/MapViewer/MapViewer.css`
- **Plan SVG** : `public/plan.svg`

---

## 🎯 Méthode recommandée : Utiliser le Room Mapper

### ✅ Outil automatique pour mapper les salles

Un outil d'administration **Room Mapper** est disponible pour identifier et enregistrer automatiquement les positions des salles sur le plan SVG.

#### Accès au Room Mapper

1. **En mode développement**, cliquez sur le bouton **🗺️** dans la navbar (à côté du bouton History)
2. Ou accédez directement à `/admin/room-mapper`

#### Fonctionnalités

- **Détection automatique** : Parse le SVG et détecte tous les numéros de salles (balises `<text>` avec `<tspan>`)
- **Affichage visuel** : Cercles rouges autour de chaque numéro détecté avec overlay interactif
- **Validation** : Permet d'activer/désactiver chaque salle détectée
- **Génération de code** : Génère automatiquement le code `BUILDING_COORDINATES` prêt à copier
- **Export JSON** : Export des positions en JSON pour backup

#### Comment l'utiliser

1. **Ouvrir** `/admin/room-mapper` en mode dev
2. L'outil **scanne automatiquement** le fichier `public/plan.svg`
3. **Visualiser** les salles détectées avec des cercles rouges
4. **Cliquer** sur une salle pour voir ses détails (position, ID, etc.)
5. **Désactiver** les fausses détections avec le bouton ✗
6. **Copier** le code généré avec le bouton "📋 Copier le code"
7. **Coller** le code dans `src/components/MapViewer/MapViewer.js`

**Avantages** :
- ✅ Détection automatique des numéros de salles
- ✅ Interface visuelle intuitive
- ✅ Pas d'erreur de saisie manuelle
- ✅ Génération de code instantanée
- ✅ Export JSON pour backup

---

## 📝 Méthode alternative : Utiliser `data-room`

Si le SVG contient déjà des attributs `data-room`, le Room Mapper peut les utiliser :

### Structure recommandée dans le SVG

Dans `public/plan.svg`, entourer les éléments qui forment un numéro de salle avec un groupe :

```xml
<!-- AVANT (sans data-room) -->
<use xlink:href="#k" fill="#fff" transform="matrix(8.8 0 0 -8.8 345.517 606.119)"/>
<use xlink:href="#p" fill="#fff" transform="matrix(8.8 0 0 -8.8 349.433 606.216)"/>

<!-- APRÈS (avec data-room) -->
<g data-room="10">
  <use xlink:href="#k" fill="#fff" transform="matrix(8.8 0 0 -8.8 345.517 606.119)"/>
  <use xlink:href="#p" fill="#fff" transform="matrix(8.8 0 0 -8.8 349.433 606.216)"/>
</g>
```

**L'attribut `data-room="10"` indique que ce groupe forme le numéro de salle "10".**

---

## 📝 Méthode manuelle (si data-room non disponible)

### Extraction depuis le SVG

Si le numéro de salle apparaît déjà sur le plan SVG (`public/plan.svg`), vous pouvez extraire ses coordonnées :

#### Étape 1 : Trouver les coordonnées dans le SVG

```bash
# Ouvrir public/plan.svg dans un éditeur de texte
# Chercher le numéro de la salle (ex: "32")
# Vous verrez une ligne comme :
# <use xlink:href="#..." transform="matrix(8.8 0 0 -8.8 242.14 249.234)"/>
#                                                    ^^^^^  ^^^^^^^
#                                                      X       Y
```

Les coordonnées sont les **5e et 6e paramètres** de la matrice `transform`.

#### Étape 2 : Ajouter au mapping

Dans `src/components/MapViewer/MapViewer.js`, ajoutez une ligne dans `BUILDING_COORDINATES` :

```javascript
const BUILDING_COORDINATES = {
    // ... autres salles ...
    "32": { x: 244, y: 249 },  // Coordonnées extraites du SVG
};
```

#### Exemple complet

Prenons la salle **32** :

1. **Recherche dans plan.svg** :
```xml
<use xlink:href="#a" fill="#0163a6" transform="matrix(8.8 0 0 -8.8 242.14 249.234)"/>
```

2. **Extraction** : x = 242 (arrondi à 244), y = 249

3. **Ajout dans MapViewer.js** :
```javascript
"32": { x: 244, y: 249 },
```

---

### Estimation visuelle

Si le numéro n'apparaît pas directement dans le SVG :

1. **Ouvrir** `public/plan.svg` dans un éditeur SVG (Inkscape, Illustrator, etc.)
2. **Activer** l'affichage des coordonnées de la souris
3. **Cliquer** sur l'emplacement approximatif de la salle
4. **Noter** les coordonnées X et Y
5. **Ajouter** au mapping dans `MapViewer.js`

**Astuce** : Le viewBox du SVG est `0 0 591.922 841.37`, donc :
- X va de 0 à ~592
- Y va de 0 à ~841

---

## 📊 Structure actuelle du mapping

Voici les salles actuellement configurées :

### Salles (2 chiffres ou moins)
- **10** à **17** : Salles zone gauche
- **21**, **27** : Salles zone centrale

### Bâtiments (30-40)
- **30** : Coin bas gauche
- **31** : Zone Scolarité
- **32** à **40** : Divers bâtiments du campus

---

## 🔧 Tester une salle

### En développement local

1. **Lancer** l'application : `npm run dev`
2. **Cliquer** sur un cours qui a une location (ex: "31.1.67pc")
3. **Cliquer** sur le bouton "🗺️ Voir dans la map"
4. **Vérifier** que le cercle rouge apparaît au bon endroit

### Si le cercle n'apparaît pas

- **Vérifiez** que le numéro de bâtiment est bien dans `BUILDING_COORDINATES`
- **Vérifiez** que l'extraction fonctionne (console du navigateur)
- **Ajustez** les coordonnées si elles ne sont pas précises

---

## 🎨 Personnalisation

### Changer la taille du cercle

Dans `MapViewer.js`, ligne avec `<circle>` :

```javascript
<circle
    cx={buildingCoords.x}
    cy={buildingCoords.y}
    r="30"  // ← Changer ici (rayon en pixels SVG)
    className="map-room-marker"
    strokeWidth="5"  // ← Épaisseur du contour
/>
```

### Changer la couleur

Dans `MapViewer.css` :

```css
.map-room-marker {
    fill: rgba(239, 68, 68, 0.2); /* Remplissage rouge transparent */
    stroke: #ef4444; /* Contour rouge vif */
    filter: drop-shadow(0 2px 8px rgba(239, 68, 68, 0.5));
}
```

---

## 📝 Format des locations supportées

Le composant peut extraire le numéro de bâtiment depuis ces formats :

- `31.1.67` → Bâtiment **31**
- `31-1-67` → Bâtiment **31**
- `Salle : 31.1.67pc` → Bâtiment **31**
- `31.1.67pc` → Bâtiment **31**

---

## ⚠️ Limitations

1. **Numéros de salles uniquement** : Le système n'extrait que des numéros (pas de lettres)
2. **Premier numéro** : Seul le premier groupe de chiffres est utilisé
3. **Mapping manuel** : Les coordonnées doivent être ajoutées manuellement
4. **Plan statique** : Le fichier SVG doit être mis à jour manuellement si le campus change

---

## 🚀 Fonctionnalités actuelles

- ✅ **Mode Debug** : Visualisation de toutes les salles avec bouton 🔍
- ✅ **Room Mapper** : Interface admin pour identifier et mapper automatiquement les salles
- ✅ Détection automatique des numéros de salles dans le SVG
- ✅ Génération automatique du code BUILDING_COORDINATES
- ✅ Export JSON des positions
- ✅ Cercles rouges avec numéros pour identifier les salles
- ✅ 21+ salles configurées (10-17, 21, 27, 30-40, etc.)
- ✅ Support de l'attribut `data-room` dans le SVG

## 💡 Améliorations futures possibles

- [ ] Support des salles avec lettres (ex: "31A")
- [ ] Zoom automatique sur la salle
- [ ] Itinéraire entre deux salles
- [ ] Plan interactif (pan/zoom)
- [ ] Édition manuelle des coordonnées dans le Room Mapper

---

## 📚 Voir aussi

- **Code principal** : `src/components/MapViewer/MapViewer.js`
- **Styles** : `src/components/MapViewer/MapViewer.css`
- **Plan SVG** : `public/plan.svg`
- **Room Mapper** : `src/app/admin/room-mapper/page.js`
- **Styles Room Mapper** : `src/app/admin/room-mapper/room-mapper.css`

---

**Dernière mise à jour** : 11 novembre 2025

