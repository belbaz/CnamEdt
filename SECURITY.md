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

---

## 🛡️ Prévention des avertissements de sécurité Android

### Pourquoi Android affiche "Application potentiellement dangereuse" ?

Android Play Protect analyse les APKs et peut afficher un avertissement pour plusieurs raisons :

1. **APK non signé par le Play Store** - ✅ Normal pour une distribution directe
2. **Signature non reconnue** - ✅ Votre clé personnelle n'est pas connue de Google
3. **Permissions suspectes** - ⚠️ À vérifier
4. **Code suspect détecté** - ⚠️ À vérifier
5. **URL non vérifiée dans l'APK** - ⚠️ Peut être amélioré

### ✅ Solutions pour réduire les avertissements

#### 1. Utiliser une signature cohérente

Votre APK est déjà signé avec une clé release. **C'est bien !** ✅

Pour que Android reconnaisse votre app :
- ✅ Utilisez **toujours la même clé** pour signer les mises à jour
- ✅ Conservez `edt-cnam-release-key.keystore` en sécurité
- ✅ Ne changez **jamais** cette clé (sinon les utilisateurs devront désinstaller/réinstaller)

#### 2. Vérifier les permissions (AndroidManifest.xml)

Permissions actuelles : ✅ PARFAIT
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

**Analyse** :
- ✅ Seule permission : INTERNET (nécessaire pour une app web)
- ✅ Pas de permissions suspectes (localisation, contacts, stockage, etc.)
- ✅ Pas de permissions dangereuses

#### 3. Ajouter des métadonnées de sécurité

Ajoutez ces éléments dans `AndroidManifest.xml` pour améliorer la confiance :

```xml
<!-- Métadonnées de sécurité -->
<application
    ...
    android:usesCleartextTraffic="false"
    android:networkSecurityConfig="@xml/network_security_config">
```

**À faire** :
1. Créer `android/app/src/main/res/xml/network_security_config.xml`
2. Configurer les domaines autorisés

#### 4. Configuration réseau sécurisée

Créez le fichier de configuration réseau pour spécifier les domaines autorisés.

#### 5. Activer ProGuard/R8 (obfuscation)

Dans `build.gradle`, changer :
```gradle
minifyEnabled false  // ⚠️ Actuellement désactivé
```

En :
```gradle
minifyEnabled true   // ✅ Recommandé
shrinkResources true // ✅ Réduit la taille de l'APK
```

**Avantages** :
- Obfusque le code (rend plus difficile la rétro-ingénierie)
- Réduit la taille de l'APK
- Améliore les performances
- Réduit les faux positifs des antivirus

### 🔒 Amélioration : Configuration réseau sécurisée

Android peut détecter que votre app fait des requêtes vers des URLs externes. Pour rassurer le système :

1. **Déclarer explicitement les domaines autorisés**
2. **Forcer HTTPS uniquement**
3. **Désactiver le cleartext traffic**

### 📱 Comment tester sans avertissement

#### Option 1 : Google Play Console (Recommandé)

1. Créer un compte Google Play Developer (25$ unique)
2. Uploader l'APK en **Internal Testing**
3. Les utilisateurs testeurs n'auront **aucun avertissement**
4. Google Play Protect reconnaîtra l'app

**Avantages** :
- ✅ Aucun avertissement pour les testeurs
- ✅ Distribution facilitée
- ✅ Mises à jour automatiques
- ✅ Statistiques d'utilisation

#### Option 2 : Signature App Signing

Si vous publiez sur le Play Store plus tard, Google peut re-signer votre app avec une clé vérifiée.

#### Option 3 : Information des utilisateurs

Si vous restez en distribution directe, créez une page d'instructions :

```markdown
⚠️ Lors de l'installation, Android affichera un avertissement.
C'est NORMAL car l'app n'est pas sur le Play Store.

✅ L'application est sécurisée et open-source.
✅ Le code est disponible sur GitHub.
✅ Aucune donnée personnelle n'est collectée.

Pour installer :
1. Téléchargez l'APK
2. Android affichera "Application potentiellement dangereuse"
3. Cliquez sur "Plus d'infos" → "Installer quand même"
4. L'app fonctionne normalement après installation
```

### 🔍 Analyse de sécurité de votre APK

Votre configuration actuelle :

| Élément | État | Recommandation |
|---------|------|----------------|
| Signature APK | ✅ Signée (release) | Parfait |
| Permissions | ✅ Minimum (INTERNET uniquement) | Parfait |
| Obfuscation (ProGuard) | ⚠️ Désactivée | Activer recommandé |
| Network Security Config | ❌ Absent | À ajouter |
| HTTPS uniquement | ⚠️ Non forcé | À configurer |
| Backup autorisé | ✅ Oui (allowBackup) | OK pour cette app |

### 🎯 Actions recommandées par priorité

#### Priorité HAUTE (réduire les avertissements)

1. ✅ **Garder la même clé de signature** - Déjà fait
2. ⚠️ **Ajouter Network Security Config** - À faire
3. ⚠️ **Activer minifyEnabled** - À faire

#### Priorité MOYENNE (améliorer la sécurité)

4. ⚠️ **Forcer HTTPS uniquement** - À faire
5. ⚠️ **Ajouter des métadonnées de confiance** - À faire

#### Priorité BASSE (distribution)

6. 💡 **Publier en Internal Testing sur Play Store** - Optionnel mais recommandé
7. 💡 **Créer une page d'instructions utilisateur** - Utile

### 📊 Verdict final

**Votre application EST sécurisée** mais Android ne peut pas le savoir car :
1. Elle n'est pas sur le Play Store
2. Votre signature n'est pas reconnue par Google
3. C'est une distribution "hors Play Store"

**C'est un avertissement NORMAL** pour toute app distribuée en dehors du Play Store.

Pour **éliminer complètement** l'avertissement, la seule solution est :
- 📱 Publier sur Google Play Store (même en Internal Testing)
- OU informer les utilisateurs que c'est normal

