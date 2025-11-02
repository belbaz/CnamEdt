# Génération des icônes Android

Les icônes Android sont maintenant basées sur le design de votre favicon.

## Méthode automatique (recommandée)

Pour générer automatiquement tous les fichiers PNG nécessaires :

1. Installer la dépendance :
```bash
npm install sharp --save-dev
```

2. Générer les icônes :
```bash
node scripts/generate-android-icons.js
```

Cela créera automatiquement tous les fichiers PNG dans les dossiers `mipmap-*`.

## Méthode manuelle

Si vous préférez le faire manuellement :

1. Ouvrir `public/favicon.svg` dans un éditeur d'images (Inkscape, Figma, etc.)
2. Exporter en PNG aux tailles suivantes :
   - **mdpi**: 48x48 → `android/app/src/main/res/mipmap-mdpi/`
   - **hdpi**: 72x72 → `android/app/src/main/res/mipmap-hdpi/`
   - **xhdpi**: 96x96 → `android/app/src/main/res/mipmap-xhdpi/`
   - **xxhdpi**: 144x144 → `android/app/src/main/res/mipmap-xxhdpi/`
   - **xxxhdpi**: 192x192 → `android/app/src/main/res/mipmap-xxxhdpi/`

3. Créer les fichiers suivants dans chaque dossier :
   - `ic_launcher.png`
   - `ic_launcher_round.png` (même image)
   - `ic_launcher_foreground.png` (même image)

## Vérification

Les fichiers XML pour les icônes adaptatives ont déjà été mis à jour dans :
- `android/app/src/main/res/drawable/ic_launcher_background.xml`
- `android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml`
- `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`

Après avoir généré les PNG, reconstruisez l'APK pour voir les nouvelles icônes.

