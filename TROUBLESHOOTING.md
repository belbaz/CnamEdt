# 🔧 Dépannage - Problèmes courants

## Erreur : "export const dynamic not configured on route /api/fetch-ics"

### Symptôme
```
Error: export const dynamic = "force-static"/export const revalidate not configured 
on route "/api/fetch-ics" with "output: export".
```

### Cause
Le fichier `next.config.js` est encore en mode mobile (avec `output: 'export'`) alors que vous essayez de faire un build web.

### Solution automatique ✅
Le script `build-apk.bat` restaure maintenant automatiquement la configuration web. Si vous obtenez cette erreur, c'est probablement parce que :

1. Vous avez modifié manuellement `next.config.js` en mode mobile
2. Le script a été interrompu avant la restauration

### Solution manuelle

**Option 1 : Copier la config web**
```bash
copy /Y next.config.web.js next.config.js
```

**Option 2 : Restaurer depuis le backup (si existant)**
```bash
copy /Y next.config.web.backup next.config.js
```

**Option 3 : Éditer manuellement `next.config.js`**

Remplacez le contenu par :
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mode web normal - API routes activées
  // Pas de "output: 'export'" pour permettre les API routes serverless
  
  images: {
    unoptimized: false
  },
  
  trailingSlash: false,
  
  env: {
    NEXT_PUBLIC_APP_MODE: 'web'
  }
}

module.exports = nextConfig
```

## Erreur : Dossier `src/app/api` manquant

### Symptôme
L'API route `/api/fetch-ics` est introuvable ou le dossier `src/app/api` n'existe pas.

### Cause
Le script a été interrompu pendant le build mobile et n'a pas restauré le dossier.

### Solution
```bash
# Si le dossier _api_backup existe
cd src\app
rename _api_backup api
cd ..\..
```

## Configuration des fichiers

### Fichiers de configuration Next.js

| Fichier | Usage | Description |
|---------|-------|-------------|
| `next.config.js` | **Actif** | Configuration actuellement utilisée (doit être en mode web par défaut) |
| `next.config.web.js` | Référence | Configuration pour le mode web (sauvegarde) |
| `mobile-config/next.config.mobile.js` | Référence | Configuration pour le mode mobile |

### Workflow du script `build-apk.bat`

```
Début du script
├─ [1] Nettoyage
├─ [2] Sauvegarde next.config.js → next.config.web.backup
│      Copie next.config.mobile.js → next.config.js
│      Renomme api/ → _api_backup/
├─ [3] Build Next.js (mode mobile)
├─ [4] Restaure _api_backup/ → api/
│      Restaure next.config.web.backup → next.config.js ✅
├─ [5] Sync Capacitor
├─ [6] Build APK
└─ [7] Upload Supabase
```

## Vérifier la configuration actuelle

### Commande rapide
```bash
# Windows PowerShell
Get-Content next.config.js | Select-String "output:"
```

**Résultat attendu :**
- ✅ Aucun résultat = Mode web (correct)
- ❌ `output: 'export'` = Mode mobile (problème)

### Si mode mobile détecté
```bash
copy /Y next.config.web.js next.config.js
```

## Prévention

### Toujours utiliser le script
❌ Ne PAS faire :
```bash
npm run build  # Mode mobile si next.config.js n'est pas restauré
```

✅ Faire plutôt :
```bash
cd mobile-config
.\build-apk.bat  # Restaure automatiquement la config web
```

### Après un build APK
La configuration est automatiquement restaurée en mode web, vous pouvez :
```bash
npm run build    # ✅ Fonctionne
npm run dev      # ✅ Fonctionne
```

## Upload Supabase

### Erreur : Variables d'environnement manquantes

**Symptôme :**
```
❌ Variables d'environnement manquantes !
```

**Solution :**
Vérifiez que `.env.local` existe et contient :
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-project-id.supabase.co
SUPABASE_SERVICE_ROLE=votre-service-role-key
```

### Erreur : Bucket not found

**Symptôme :**
```
❌ Erreur lors de la récupération des buckets
```

**Solution :**
Le bucket sera créé automatiquement. Si l'erreur persiste :
1. Vérifiez que `SUPABASE_SERVICE_ROLE` est correcte
2. Vérifiez que votre projet Supabase existe

### Upload échoue mais APK créé

C'est normal ! Le script continue même si l'upload échoue. Vous pouvez :
- Utiliser l'APK local : `android\app\build\outputs\apk\debug\app-debug.apk`
- Uploader manuellement sur Supabase

## Aide supplémentaire

### Fichiers de documentation
- `README.md` - Documentation générale
- `CONFIGURATION.md` - Configuration Supabase
- `mobile-config/GUIDE.md` - Guide build APK

### Réinitialiser complètement

Si rien ne fonctionne :
```bash
# 1. Restaurer la config web
copy /Y next.config.web.js next.config.js

# 2. Vérifier le dossier API
dir src\app\api

# 3. Si manquant, restaurer depuis _api_backup
cd src\app
if exist _api_backup rename _api_backup api
cd ..\..

# 4. Nettoyer les builds
rmdir /s /q out
rmdir /s /q .next

# 5. Rebuild
npm run build
```

