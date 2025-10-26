# 🔧 Correction du système de vérification des mises à jour

## Problème identifié

L'application mobile ne peut pas vérifier les mises à jour car :
1. ❌ L'URL du site Vercel dans le code est incorrecte ou le déploiement n'existe pas
2. ❌ L'API `/api/version` n'était pas configurée pour accepter les requêtes CORS depuis l'app mobile

## Corrections apportées

### 1. Ajout du support CORS dans l'API version ✅

**Fichier:** `src/app/api/version/route.js`

```javascript
// Headers CORS ajoutés
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'GET, OPTIONS',
'Access-Control-Allow-Headers': 'Content-Type, Cache-Control'

// Support des requêtes OPTIONS
export async function OPTIONS() { ... }
```

### 2. Amélioration de la gestion d'erreurs ✅

**Fichier:** `src/components/UpdateChecker.js`

- Ajout de logs détaillés pour diagnostiquer les problèmes
- Messages d'erreur plus explicites pour l'utilisateur
- Affichage du code d'erreur HTTP et des détails

### 3. Documentation de la variable d'environnement ✅

**Fichier:** `env.example`

```env
# URL de votre site déployé (pour la vérification des mises à jour)
NEXT_PUBLIC_SITE_URL=https://edt-eicnam.vercel.app
```

## Action requise : Vérifier l'URL Vercel

### Étape 1 : Trouver votre vraie URL Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Ouvrez votre projet `cnam_edt`
3. Copiez l'URL de production (ex: `https://votre-projet.vercel.app`)

### Étape 2 : Mettre à jour la configuration

**Option A : Modifier le code (par défaut)**

Dans `src/components/UpdateChecker.js` ligne 44 :
```javascript
const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://VOTRE-VRAIE-URL.vercel.app';
```

**Option B : Utiliser une variable d'environnement (recommandé)**

1. Créez/modifiez `.env.local` :
```env
NEXT_PUBLIC_SITE_URL=https://votre-vraie-url.vercel.app
```

2. Dans Vercel Dashboard :
   - Settings → Environment Variables
   - Ajoutez `NEXT_PUBLIC_SITE_URL` = `https://votre-vraie-url.vercel.app`

### Étape 3 : Tester l'API

Depuis un navigateur ou terminal :
```bash
curl https://votre-vraie-url.vercel.app/api/version
```

Réponse attendue :
```json
{
  "version": "1.1.3",
  "url": "https://aeftxgwfokzlspojzisx.supabase.co/storage/v1/object/public/Apk%20Edt%20Eicnam/apk/edt_cnam_v1.1.3.apk",
  "changelog": "Version initiale avec système de mise à jour automatique"
}
```

### Étape 4 : Redéployer

**Pour le site web :**
```bash
git add .
git commit -m "fix: Correction API version avec support CORS"
git push
```
Le site se redéploiera automatiquement sur Vercel.

**Pour l'application mobile :**
```bash
cd mobile-config
.\build-apk.bat
```

## Test sur l'application mobile

Après avoir installé la nouvelle version de l'APK :

1. Ouvrez l'app mobile
2. Allez dans les paramètres (⚙️)
3. Cliquez sur "Rechercher des mises à jour"
4. Vérifiez les logs dans la console :
   - Ouvrez Chrome DevTools
   - Connectez votre téléphone en USB
   - Allez sur `chrome://inspect`
   - Sélectionnez votre app et ouvrez la console

Les logs doivent afficher :
```
[UpdateChecker] Vérification des mises à jour...
[UpdateChecker] URL API: https://votre-url.vercel.app/api/version
[UpdateChecker] Version actuelle: 1.1.3
[UpdateChecker] Réponse HTTP: 200 OK
[UpdateChecker] Réponse API: {version: "1.1.3", url: "...", changelog: "..."}
```

## Dépannage

### Erreur "DEPLOYMENT_NOT_FOUND"
➡️ L'URL Vercel est incorrecte. Vérifiez l'URL sur votre Dashboard Vercel.

### Erreur "Network request failed"
➡️ Vérifiez que l'app a accès à Internet (permissions Android).

### Erreur "CORS policy"
➡️ Cette erreur devrait être corrigée avec les modifications apportées. Si elle persiste, redéployez le site sur Vercel.

### Code HTTP 404
➡️ L'API `/api/version` n'existe pas sur le déploiement. Assurez-vous que le fichier `src/app/api/version/route.js` est bien présent et déployé.

## Variables d'environnement complètes

Pour référence, voici toutes les variables nécessaires :

**Vercel (Dashboard → Settings → Environment Variables):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://aeftxgwfokzlspojzisx.supabase.co
NEXT_PUBLIC_APK_URL=https://aeftxgwfokzlspojzisx.supabase.co/storage/v1/object/public/Apk%20Edt%20Eicnam/apk/edt_cnam_v1.1.3.apk
NEXT_PUBLIC_SITE_URL=https://votre-url.vercel.app
ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics
NEXT_PUBLIC_ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics
```

**Local (`.env.local`):**
Ajoutez en plus :
```env
SUPABASE_SERVICE_ROLE=votre-service-role-key
```

---

✅ Une fois ces corrections appliquées, le système de mise à jour fonctionnera correctement !

