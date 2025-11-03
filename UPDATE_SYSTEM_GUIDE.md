# Guide du Système de Mise à Jour EDT EICNAM

## Vue d'ensemble

Le système de mise à jour de l'application EDT EICNAM permet de gérer deux canaux de distribution :
- **Production (prod)** : Version stable pour tous les utilisateurs
- **Test** : Version de test/préprod pour les développeurs

Le système supporte la mise à jour automatique OTA (Over-The-Air) pour l'application Android, avec détection et installation automatique des nouvelles versions.

## Architecture du Système

### 1. **Canaux de Distribution**

- **Canal Production** : 
  - APK : `edt_cnam_vX.Y.Z.apk` (ex: `edt_cnam_v2.0.41.apk`)
  - Environnement : `APP_CHANNEL=prod` ou non défini
  - Site web : https://edt-eicnam.vercel.app

- **Canal Test** :
  - APK : `edt_cnam_v_test_X.Y.Z.apk` (ex: `edt_cnam_v_test_2.0.42.apk`)
  - Environnement : `APP_CHANNEL=test`
  - Site web : même URL mais avec configuration test

### 2. **APIs de Mise à Jour**

#### `/api/version`
- Détecte automatiquement la dernière version disponible dans Supabase
- Retourne la version, l'URL de téléchargement et le changelog
- Détecte le canal (test/prod) via `APP_CHANNEL` ou `NEXT_PUBLIC_APP_CHANNEL`

#### `/api/download/apk`
- Proxy pour télécharger l'APK depuis Supabase avec URL signée
- Gère automatiquement les permissions et la sécurité

### 3. **Stockage des APKs**

Les APKs sont stockés dans Supabase Storage :
- Bucket : `Apk Edt Eicnam`
- Structure : `apk/[nom_fichier].apk`
- Un seul APK par canal est conservé (les anciens sont automatiquement supprimés)

### 4. **Processus de Mise à Jour Mobile**

1. **Vérification automatique** au démarrage de l'app
2. **Comparaison de versions** (support X.Y et X.Y.Z)
3. **Notification** si nouvelle version disponible
4. **Téléchargement et installation** automatique via l'interface native Android

## Problèmes Identifiés et Solutions

### Problème Principal : Configuration des Canaux

**Problème** : Le système actuel utilise `APP_CHANNEL` qui n'est pas toujours propagé correctement entre les environnements.

**Solution** :
1. Utiliser `NEXT_PUBLIC_APP_CHANNEL` pour la configuration côté client
2. Définir explicitement le canal dans les scripts de build
3. Séparer clairement les configurations web et mobile

### Problème : Export Static vs Dynamic

**Problème** : Les APIs (`/api/version`, `/api/download/apk`) nécessitent un rendu dynamique mais le build mobile utilise `output: 'export'`.

**Solution** :
1. Pour le site web : Utiliser le mode normal (sans `output: 'export'`)
2. Pour le mobile : Désactiver temporairement les APIs pendant le build
3. L'app mobile utilise directement l'API du site web en production

## Scripts de Déploiement

### 1. **deploy_apk_test.bat** - Build APK Test
```batch
@echo off
setlocal enabledelayedexpansion
set NEXT_PUBLIC_APP_CHANNEL=test
set APP_CHANNEL=test

REM Version optionnelle en paramètre
set VERSION=%~1

REM Build et upload APK test
cd mobile-config
if defined VERSION (
    call build-apk.bat %VERSION% test
) else (
    call build-apk.bat "" test
)
cd ..
```

### 2. **deploy_website_only.bat** - Déployer le Site Web
```batch
@echo off
setlocal enabledelayedexpansion

REM S'assurer que le site est en mode web
copy /Y next.config.web.js next.config.js

REM Commit et push
git add .
git commit -m "Update website"
git push

echo Deploy du site web lance sur Vercel
```

### 3. **deploy_prod_complete.bat** - APK Prod + Site Web
```batch
@echo off
setlocal enabledelayedexpansion
set NEXT_PUBLIC_APP_CHANNEL=prod
set APP_CHANNEL=prod

REM Version optionnelle ou auto-increment
set VERSION=%~1

REM 1. Build APK prod
cd mobile-config
if defined VERSION (
    call build-apk-prod.bat %VERSION%
) else (
    call build-apk-prod.bat
)
cd ..

REM 2. Deploy site web
call deploy_website_only.bat
```

## Configuration Requise

### Variables d'Environnement (.env.local)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://aeftxgwfokzlspojzisx.supabase.co
SUPABASE_SERVICE_ROLE=votre_service_role_key

# Signature APK
KEYSTORE_PASSWORD=votre_mot_de_passe
KEY_ALIAS=edtcnam
```

### Configuration Next.js

#### next.config.web.js (Site Web)
```javascript
const nextConfig = {
  // Pas de output: 'export' pour permettre les API routes
  env: {
    NEXT_PUBLIC_APP_MODE: 'web',
    NEXT_PUBLIC_APP_CHANNEL: process.env.APP_CHANNEL || 'prod'
  }
}
```

#### next.config.mobile.js (Build Mobile)
```javascript
const nextConfig = {
  output: 'export', // Requis pour Capacitor
  env: {
    NEXT_PUBLIC_APP_MODE: 'mobile',
    NEXT_PUBLIC_APP_CHANNEL: process.env.APP_CHANNEL || 'prod'
  }
}
```

## Flux de Travail Recommandé

### Développement
1. Développer et tester localement
2. Créer un APK test : `deploy_apk_test.bat`
3. Tester sur des appareils de test

### Production
1. S'assurer que tout fonctionne en test
2. Créer APK prod + déployer site : `deploy_prod_complete.bat`
3. Les utilisateurs recevront automatiquement la notification de mise à jour

### Mise à Jour du Site Uniquement
- Utiliser `deploy_website_only.bat` pour mettre à jour le site sans toucher à l'APK

## Compatibilité Test ↔ Prod

Le système garantit la compatibilité :
- Les versions test et prod utilisent la même base de code
- La même API (`/api/version`) gère les deux canaux
- Le passage test → prod se fait simplement en changeant `APP_CHANNEL`
- Les utilisateurs sur chaque canal ne voient que les mises à jour de leur canal

## Débogage

### Vérifier la Version Actuelle
- Dans l'app : Menu → À propos
- API : https://edt-eicnam.vercel.app/api/version

### Logs de Mise à Jour
- Console navigateur : Filtrer par `[UpdateChecker]`
- API logs : Filtrer par `[API Version]` ou `[API Download]`

### Problèmes Courants
1. **"Erreur de mise à jour"** : Vérifier la connexion internet et l'accès à Supabase
2. **Version non détectée** : Vérifier que l'APK est bien uploadé dans Supabase
3. **Canal incorrect** : Vérifier `NEXT_PUBLIC_APP_CHANNEL` dans l'environnement

## Maintenance

### Nettoyer les Anciens APKs
Les scripts suppriment automatiquement les anciennes versions lors de l'upload.

### Changer de Canal
1. Modifier `APP_CHANNEL` dans les scripts
2. Rebuild l'APK avec le bon canal
3. Les utilisateurs basculeront automatiquement

### Monitoring
- Vérifier régulièrement Supabase Storage pour l'espace utilisé
- Surveiller les logs Vercel pour les erreurs d'API
