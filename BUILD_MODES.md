# 🔧 Guide des Modes de Build - Web vs Mobile

## 🎯 Problème Résolu

**Contexte** : Next.js ne peut pas avoir d'API routes (`/api/fetch-ics`) en mode `output: 'export'` (export statique pour mobile).

**Solution** : Configuration conditionnelle basée sur une variable d'environnement `BUILD_MODE`.

---

## 📦 Deux Modes de Build

### 1. **Build Web** (Vercel - Serverless)

```bash
npm run build
```

**Configuration** :
- `BUILD_MODE` non défini (ou = `web`)
- `output: 'export'` **désactivé**
- API routes **activées** ✅
- Deploy sur Vercel avec serverless functions

**Résultat** :
```
Route (app)
├ ○ /                     (page statique)
└ ƒ /api/fetch-ics        (serverless function) ✅
```

---

### 2. **Build Mobile** (APK Android)

```bash
cd mobile-config
.\build-apk.bat
```

**Configuration** :
- `BUILD_MODE=mobile` défini dans le script
- `output: 'export'` **activé**
- API routes **supprimées** (déplacées temporairement)
- Export statique pour Capacitor

**Résultat** :
```
out/
├── index.html
├── _next/
└── ... (pas d'API routes)
```

---

## 🔧 Configuration Technique

### **next.config.js** (Racine)

```javascript
// Détecter si on build pour mobile ou web
const isMobileBuild = process.env.BUILD_MODE === 'mobile';

const nextConfig = {
  // Mobile : export statique (pas d'API routes)
  // Web : mode normal (avec API routes serverless)
  ...(isMobileBuild ? { output: 'export' } : {}),
  
  images: {
    unoptimized: true
  },
  
  trailingSlash: true,
  
  env: {
    NEXT_PUBLIC_APP_MODE: isMobileBuild ? 'mobile' : 'web'
  }
}
```

**Logique** :
- `BUILD_MODE=mobile` → Active `output: 'export'`
- Pas de `BUILD_MODE` → Mode normal (avec API)

---

### **build-apk.bat** (Script Mobile)

```batch
echo [2/6] Preparation pour mobile...
REM Definir la variable d'environnement
set BUILD_MODE=mobile

REM Deplacer le dossier API (incompatible avec export statique)
if exist src\app\api (
    move src\app\api .api_temp
)

echo [3/6] Build Next.js (export statique)...
call npm run build

echo [4/6] Restauration...
REM Restaurer le dossier API
if exist .api_temp (
    move .api_temp src\app\api
)
```

---

## 🧪 Tests de Validation

### Test 1 : Build Web ✅

```bash
npm run build
```

**Vérifier** :
```
Route (app)
└ ƒ /api/fetch-ics    ← Doit être "ƒ" (Dynamic)
```

✅ **Succès** si l'API route est listée comme "Dynamic"

---

### Test 2 : Build Mobile ✅

```bash
cd mobile-config
.\build-apk.bat
```

**Vérifier** :
1. Build réussit sans erreur ✅
2. Dossier `out/` créé ✅
3. APK généré dans `android\app\build\outputs\apk\debug\` ✅
4. API route **absente** de `out/` ✅

---

## 📊 Comparaison

| Aspect | Web (Vercel) | Mobile (APK) |
|--------|--------------|--------------|
| **Commande** | `npm run build` | `.\build-apk.bat` |
| **BUILD_MODE** | Non défini | `mobile` |
| **output** | Normal | `export` |
| **API routes** | ✅ Oui | ❌ Non (déplacées) |
| **Fetch ICS** | Via `/api/fetch-ics` | Direct (CapacitorHttp) |
| **Parse ICS** | Serveur (node-ical) | Client (regex) |
| **Deploy** | Vercel | APK Android |

---

## 🔄 Workflow Complet

### Développement Local (Web)

```bash
npm run dev
```

- Mode web par défaut
- API route disponible : `http://localhost:3000/api/fetch-ics`
- Hot reload activé

---

### Build Production Web (Vercel)

```bash
npm run build
npm start
```

- `BUILD_MODE` non défini
- API route serverless
- Optimisé pour production

---

### Build APK Mobile

```bash
cd mobile-config
.\build-apk.bat
```

**Étapes automatiques** :
1. Nettoyage (`out/`, `android/app/build/`)
2. `set BUILD_MODE=mobile`
3. Déplacement de `src/app/api/` → `.api_temp/`
4. `npm run build` (export statique)
5. Restauration de `.api_temp/` → `src/app/api/`
6. `npx cap sync android`
7. `gradlew assembleDebug`
8. APK généré ✅

---

## ⚠️ Important

### Ne PAS faire

❌ `npm run build` avec un `next.config.js` qui a `output: 'export'` en dur
→ Erreur : "export const dynamic not configured on route /api/fetch-ics"

❌ Oublier de restaurer l'API après le build mobile
→ Le dossier `src/app/api/` serait manquant

---

### À faire

✅ Toujours utiliser `.\build-apk.bat` pour le mobile (ne jamais build manuellement)

✅ Vérifier que `BUILD_MODE` n'est pas défini en développement web

✅ Le script `build-apk.bat` gère tout automatiquement

---

## 🐛 Dépannage

### Erreur : "export const dynamic not configured"

**Cause** : `BUILD_MODE=mobile` défini alors qu'on build pour le web

**Solution** :
```bash
# Windows PowerShell
$env:BUILD_MODE = $null
npm run build
```

---

### Erreur : "Cannot find module src/app/api"

**Cause** : Le dossier API n'a pas été restauré après un build mobile échoué

**Solution** :
```bash
# Restaurer manuellement
if exist .api_temp (
    move .api_temp src\app\api
)
```

---

## 📝 Variables d'Environnement

### BUILD_MODE

| Valeur | Usage | Effet |
|--------|-------|-------|
| `mobile` | Build APK | Active `output: 'export'` |
| Non défini | Build Web | Mode normal (API routes) |
| `web` | Build Web | Mode normal (API routes) |

### NEXT_PUBLIC_APP_MODE

| Valeur | Contexte | Usage |
|--------|----------|-------|
| `mobile` | Build APK | Détection côté client |
| `web` | Build Web | Détection côté client |

---

## ✅ Résumé

1. **Un seul `next.config.js`** avec logique conditionnelle ✅
2. **`BUILD_MODE=mobile`** pour l'APK ✅
3. **Pas de `BUILD_MODE`** pour le web ✅
4. **Le script `build-apk.bat` gère tout** ✅

**Les deux builds fonctionnent maintenant ! 🎉**

---

**Date** : 25 octobre 2024  
**Version** : v1.1  
**Status** : ✅ Fonctionnel

