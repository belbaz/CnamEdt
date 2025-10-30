# 🔒 Analyse de sécurité - EDT EICNAM

## ✅ Oui, le fichier `.env.local` n'est JAMAIS dans l'APK

### Comment ça fonctionne

1. **Fichier `.env.local`** :
   - ✅ Existe uniquement **localement** sur votre machine
   - ✅ **Jamais** inclus dans le build Next.js
   - ✅ **Jamais** dans le dossier `out/` qui est copié dans l'APK
   - ✅ **Jamais** dans le repository Git (via `.gitignore`)

2. **Next.js et les variables d'environnement** :
   - Seules les variables `NEXT_PUBLIC_*` sont accessibles côté **client** (dans le code JavaScript)
   - Les variables **sans** `NEXT_PUBLIC_` sont **uniquement** côté serveur
   - Le build Next.js les remplace au moment de la compilation

### Variables dans l'APK (NEXT_PUBLIC_*)

Ces variables sont **visibles** dans l'APK car elles sont dans le code JavaScript :

```javascript
// ✅ Ces variables sont dans l'APK (mais c'est OK, elles sont déjà publiques)
NEXT_PUBLIC_ICS_URL          // URL publique du fichier ICS
NEXT_PUBLIC_SUPABASE_URL     // URL publique de Supabase  
NEXT_PUBLIC_APK_URL          // URL publique de l'APK
NEXT_PUBLIC_SITE_URL         // URL du site web
```

**Pourquoi c'est sécurisé ?** Parce que ce sont toutes des **URLs publiques** accessibles à tout le monde de toute façon :
- L'URL ICS est publique : `https://galao.cnam.fr/partage/...`
- L'URL Supabase est publique (le bucket est public)
- L'URL du site est publique

### Variables SECRÈTES (jamais dans l'APK)

Ces variables **ne sont jamais** dans l'APK :

```javascript
// 🔒 JAMAIS dans l'APK - Seulement côté serveur Vercel
SUPABASE_SERVICE_ROLE        // Clé secrète Supabase (serveur uniquement)
ICS_URL                      // Utilisée par /api/fetch-ics (serveur uniquement)
KEYSTORE_PASSWORD            // Mot de passe pour signer l'APK (local uniquement)
```

## 🏗️ Architecture de sécurité

### Web (Vercel) - ✅ SÉCURISÉ

```
Navigateur → /api/fetch-ics (Next.js API route)
                ↓
           Utilise ICS_URL (variable secrète côté serveur)
                ↓
           Parse le fichier ICS
                ↓
           Retourne JSON au navigateur
```

**Sécurité** :
- ✅ L'URL ICS réelle (`ICS_URL`) n'est jamais exposée au client
- ✅ Le parsing se fait côté serveur
- ✅ Les données sont déjà publiques (agenda CNAM)

### Mobile (APK) - ✅ SÉCURISÉ

```
APK → CapacitorHttp.get(NEXT_PUBLIC_ICS_URL)
              ↓
       Télécharge directement depuis galao.cnam.fr
              ↓
       Parse côté client (JavaScript)
```

**Sécurité** :
- ✅ L'URL utilisée est `NEXT_PUBLIC_ICS_URL` (déjà publique)
- ✅ Pas de backend, donc pas de secret à protéger
- ✅ L'URL ICS du CNAM est accessible à tout le monde de toute façon

## ⚠️ Point d'attention actuel

Dans `src/services/icsService.js`, l'URL ICS est **codée en dur** :

```javascript
const ICS_URL = 'https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics';
```

**Impact** : L'URL est visible dans l'APK, mais c'est une URL **publique** de toute façon.

**Recommandation** : Utiliser `NEXT_PUBLIC_ICS_URL` pour plus de flexibilité (voir amélioration ci-dessous).

## 🔧 Amélioration recommandée

Pour améliorer la flexibilité (sans impact sécurité) :

### Modifier `src/services/icsService.js`

```javascript
// Utiliser la variable d'environnement si disponible, sinon fallback
const ICS_URL = process.env.NEXT_PUBLIC_ICS_URL || 
    'https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics';
```

**Avantage** : Permet de changer l'URL sans recompiler, mais comme c'est une URL publique, aucun impact sécurité.

## 📊 Résumé sécurité

| Élément | Visible dans l'APK ? | Sécurité |
|---------|---------------------|----------|
| `.env.local` | ❌ NON | ✅ Parfait |
| `SUPABASE_SERVICE_ROLE` | ❌ NON | ✅ Parfait (serveur uniquement) |
| `ICS_URL` (serveur) | ❌ NON | ✅ Parfait (serveur uniquement) |
| `NEXT_PUBLIC_ICS_URL` | ✅ OUI (mais URL publique) | ✅ OK (déjà publique) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ OUI (mais URL publique) | ✅ OK (déjà publique) |
| `KEYSTORE_PASSWORD` | ❌ NON | ✅ Parfait (local uniquement) |

## ✅ Conclusion

**Votre application est sécurisée** :

1. ✅ Les secrets (`SUPABASE_SERVICE_ROLE`, `KEYSTORE_PASSWORD`) ne sont **jamais** dans l'APK
2. ✅ Le fichier `.env.local` n'est **jamais** dans l'APK
3. ✅ Le backend API (`/api/fetch-ics`) utilise des variables secrètes côté serveur
4. ✅ Les variables exposées (`NEXT_PUBLIC_*`) sont toutes des URLs **déjà publiques**
5. ✅ L'URL ICS du CNAM est publique de toute façon (accessible à tous)

**Aucun secret n'est exposé dans l'APK.** 🎉

