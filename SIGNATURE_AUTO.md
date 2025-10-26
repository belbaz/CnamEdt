# 🔐 Signature automatique APK - Configuration terminée !

## ✅ Ce qui a été fait

Le script `deploy.bat` signe maintenant **automatiquement** l'APK pour réduire l'avertissement Google Play Protect !

### Fonctionnalités :

1. ✅ **Détection automatique** - Vérifie si la clé de signature existe
2. ✅ **Création automatique** - Crée la clé si elle n'existe pas
3. ✅ **Configuration automatique** - Configure `build.gradle` automatiquement
4. ✅ **Build signé** - Compile en mode Release avec signature
5. ✅ **Upload Supabase** - Upload l'APK signé sur Supabase

---

## 🚀 Comment l'utiliser

### 1. Ajoutez le mot de passe dans `.env.local`

```env
KEYSTORE_PASSWORD=YOURPASSWRD
```

**Choisissez un mot de passe et gardez-le toujours !**

*(Minimum 6 caractères)*

### 2. Déployez comme d'habitude

```bash
.\deploy.bat
```

**La première fois**, le script va :
- Créer automatiquement la clé de signature
- Configurer `android/app/build.gradle`
- Créer `android/keystore.properties`
- Compiler l'APK en mode Release (signé)

**Les fois suivantes**, il utilisera directement la clé existante.

---

## 📊 Avant vs Après

### Avant (Debug)

```
⚠️⚠️⚠️ Google Play Protect
Cette application est inconnue et peut être DANGEREUSE
[Bloquer l'installation] [Plus d'informations]
```

### Après (Release signé)

```
⚠️ Google Play Protect
Cette application n'est pas reconnue
[Plus d'informations] [Installer quand même]
```

**Résultat :**
- ✅ Message moins alarmant
- ✅ Installation plus facile
- ✅ APK professionnel
- ✅ Mises à jour fluides

---

## 🔍 Comment vérifier que ça fonctionne

### 1. Vérifier la signature de l'APK

```bash
keytool -printcert -jarfile android\app\build\outputs\apk\release\edt_cnam_v1.1.6.apk
```

Vous devriez voir :
```
Owner: CN=EDT EICNAM, OU=EICNAM, O=EICNAM, L=Paris, ST=Ile-de-France, C=FR
Issuer: CN=EDT EICNAM, OU=EICNAM, O=EICNAM, L=Paris, ST=Ile-de-France, C=FR
```

### 2. Vérifier le chemin de l'APK

Après `.\deploy.bat`, vous devriez voir :
```
APK signe: android\app\build\outputs\apk\release\edt_cnam_v1.1.6.apk
```

Notez le chemin : `release` au lieu de `debug` ✅

### 3. Tester sur Android

Installez l'APK sur votre téléphone :
- Le message Google sera moins alarmant
- L'installation sera plus fluide

---

## 📁 Fichiers créés automatiquement

Lors du premier `.\deploy.bat` :

```
Racine/
├── edt-cnam-release-key.keystore  ← Clé de signature (NE PAS PARTAGER !)
└── android/
    ├── keystore.properties        ← Config signature (NE PAS PARTAGER !)
    └── app/
        └── build.gradle           ← Modifié automatiquement
```

**⚠️ Ces fichiers sont automatiquement ignorés par Git**

---

## ⚠️ Important - Sécurité

### À faire :
- ✅ Sauvegarder `edt-cnam-release-key.keystore` en lieu sûr
- ✅ Noter votre `KEYSTORE_PASSWORD` (dans `.env.local`)
- ✅ Garder toujours le même mot de passe
- ✅ Utiliser la même clé pour toutes les versions

### À NE PAS faire :
- ❌ Ne partagez jamais la clé `.keystore`
- ❌ Ne partagez jamais le mot de passe
- ❌ Ne committez jamais ces fichiers dans Git
- ❌ Ne supprimez jamais la clé (sinon impossible de faire des mises à jour !)

---

## 🔄 Workflow de déploiement

```bash
# 1. Vérifiez que KEYSTORE_PASSWORD est dans .env.local

# 2. Déployez
.\deploy.bat

# 3. Le script fait automatiquement :
#    [0/8] Vérification signature APK...
#    - Détecte si la clé existe
#    - La crée si nécessaire
#    - Configure build.gradle
#
#    [1/8] à [5/8] ... (build Next.js, etc.)
#
#    [6/8] Build APK (signé)...
#    - Compile en mode Release
#    - APK signé automatiquement
#
#    [7/8] Upload Supabase...
#    - Upload l'APK signé
#
#    [8/8] Git commit et push...
#    - Déploie sur Vercel

# 4. Résultat : APK signé disponible !
```

---

## 🎯 Différences techniques

| Aspect | Avant (Debug) | Après (Release signé) |
|--------|---------------|----------------------|
| **Commande** | `assembleDebug` | `assembleRelease` |
| **Chemin** | `apk/debug/` | `apk/release/` |
| **Signature** | Clé debug auto | Votre clé officielle |
| **Avertissement** | ⚠️⚠️⚠️ Très alarmant | ⚠️ Moins alarmant |
| **Mises à jour** | Difficiles | Fluides |
| **Professionnel** | ❌ Non | ✅ Oui |

---

## ❓ FAQ

### L'avertissement Google disparaît complètement ?

**Non.** L'avertissement sera toujours là tant que l'app n'est pas sur le Play Store. Mais il sera **beaucoup moins alarmant** :
- Avant : "DANGEREUSE" + bouton rouge
- Après : "non reconnue" + installation possible

### Je dois faire quelque chose de spécial ?

**Non !** Juste ajouter `KEYSTORE_PASSWORD` dans `.env.local` et utiliser `.\deploy.bat` comme d'habitude.

### Que se passe-t-il si je perds la clé ?

⚠️ **Problème majeur** : Impossible de publier des mises à jour ! Les utilisateurs devront désinstaller et réinstaller l'app.

**Solution** : Sauvegardez `edt-cnam-release-key.keystore` en lieu sûr (cloud sécurisé, etc.)

### Je peux utiliser l'ancien script build-apk.bat ?

**Oui**, mais il compilera en mode Debug (non signé). Utilisez plutôt `deploy.bat` qui signe automatiquement.

---

## 🎉 Résumé

**Une seule action requise :**

1. Ajoutez dans `.env.local` :
   ```env
   KEYSTORE_PASSWORD=VotreMotDePasseSecurise123
   ```

2. Utilisez :
   ```bash
   .\deploy.bat
   ```

**Tout le reste est automatique !** 🚀

---

**L'avertissement Google sera maintenant beaucoup moins alarmant !** ✅

