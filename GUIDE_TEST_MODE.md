# Guide du Mode Test - EDT CNAM

## 🧪 Fonctionnalité Ajout de Cours de Test

Le bouton "Ajouter Cours" permet d'ajouter des cours de test **uniquement si aujourd'hui n'a pas de cours**, particulièrement utile pour tester la fonctionnalité du bouton "Aujourd'hui" qui ouvre automatiquement le jour d'aujourd'hui.

## 🚀 Comment utiliser le bouton de test

1. **Ouvrir l'application** dans votre navigateur (http://localhost:3001)
2. **Localiser le bouton "Ajouter Cours"** dans la barre de navigation (à côté du bouton "Défilement auto")
3. **Cliquer sur le bouton** pour ajouter des cours de test pour aujourd'hui
4. Le bouton devient bleu et affiche "Cours Test" quand des cours ont été ajoutés

## 📅 Fonctionnalité "Aujourd'hui" avec cours de test

### Comportement normal
- Cliquer sur le bouton "Aujourd'hui" (📅) navigue vers la semaine actuelle
- Fait défiler vers le jour d'aujourd'hui

### Nouvelle fonctionnalité
- **Ouvre automatiquement le jour d'aujourd'hui** s'il est fermé
- Puis fait défiler vers ce jour

## 🎯 Cours de test générés

Le bouton ajoute automatiquement **UNIQUEMENT si aujourd'hui est vide** :
- **4 cours de 2h chacun** de 9h à 17h
- **Horaires fixes** : 9h-11h, 11h-13h, 13h-15h, 15h-17h
- **Matières variées** : Mathématiques, Informatique, Économie, Gestion de Projet, Communication, Anglais
- **Professeurs fictifs** et salles de cours réalistes
- **Marqués comme cours de test** dans la description

## 🔧 Test de la fonctionnalité

1. **Vérifier qu'aujourd'hui n'a pas de cours** (sinon le bouton ne fera rien)
2. **Cliquer sur "Ajouter Cours"** pour ajouter des cours de test
3. **Fermer le jour d'aujourd'hui** en cliquant sur la flèche du jour
4. **Cliquer sur le bouton "Aujourd'hui" (📅)**
5. **Vérifier que** :
   - Le jour d'aujourd'hui s'ouvre automatiquement
   - L'application fait défiler vers ce jour
   - Les cours de test sont visibles (9h-17h)

## 🎨 Interface

- **Bouton "Ajouter Cours"** : Prêt à ajouter des cours (gris)
- **Bouton "Cours Test"** : Cours de test ajoutés (bleu)
- **Indicateur visuel** : Le bouton change d'apparence selon l'état

## 🔄 Supprimer les cours de test

Cliquer à nouveau sur le bouton "Cours Test" pour recharger les données réelles et supprimer les cours de test.

## 📱 Compatibilité

- Fonctionne sur **desktop** et **mobile**
- Le bouton de mode test n'apparaît que sur desktop (interface simplifiée sur mobile)
- Les données de test sont sauvegardées dans le localStorage

## 🐛 Dépannage

Si le mode test ne fonctionne pas :
1. Vérifier que JavaScript est activé
2. Vider le cache du navigateur
3. Recharger la page
4. Vérifier la console du navigateur pour d'éventuelles erreurs

---

*Cette fonctionnalité est particulièrement utile pour les développeurs et testeurs qui veulent vérifier le comportement de l'application sans dépendre des données réelles de l'emploi du temps.*
