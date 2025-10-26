# 🔐 Guide de signature APK

## Pourquoi signer l'APK ?

Actuellement, votre APK est signé avec une clé de **debug** automatique. Google affiche un avertissement car :
- ❌ Clé de debug = non sécurisée
- ❌ APK non publié sur Play Store
- ❌ Google ne connaît pas l'éditeur

**Solution :** Créer une clé de **release** officielle.

---

## 🔑 Étape 1 : Créer une clé de signature

### Méthode automatique (recommandée)

**1. Ajoutez dans `.env.local` :**
```env
KEYSTORE_PASSWORD=VotreMotDePasseSecurise123
```
*Choisissez un mot de passe solide (minimum 6 caractères) et gardez-le toujours !*

**2. Exécutez le script :**
```bash
.\setup-signing.bat
```

Le script va :
- ✅ Lire le mot de passe depuis `.env.local`
- ✅ Créer la clé `edt-cnam-release-key.keystore`
- ✅ Créer `android/keystore.properties`
- ✅ Mettre à jour `.gitignore`

### Méthode manuelle (avancée)

Si vous préférez faire manuellement :

```bash
keytool -genkey -v -keystore edt-cnam-release-key.keystore -alias edt-cnam -keyalg RSA -keysize 2048 -validity 10000
```

**Informations à fournir :**
```
Enter keystore password: [VOTRE_MOT_DE_PASSE]
Re-enter new password: [VOTRE_MOT_DE_PASSE]
What is your first and last name? [Votre nom ou nom de l'organisation]
What is the name of your organizational unit? [EICNAM]
What is the name of your organization? [EICNAM]
What is the name of your City or Locality? [Paris]
What is the name of your State or Province? [Île-de-France]
What is the two-letter country code for this unit? [FR]
Is CN=..., correct? [yes]

Enter key password for <edt-cnam>: [Appuyez sur Entrée pour utiliser le même mot de passe]
```

**✅ Fichier créé :** `edt-cnam-release-key.keystore`

⚠️ **IMPORTANT :** 
- **Sauvegardez ce fichier en lieu sûr !**
- **Le mot de passe est dans `.env.local`** (déjà ignoré par Git)
- Ne partagez JAMAIS ces fichiers
- Ne les committez JAMAIS dans Git

---

## 📝 Étape 2 : Configurer Android pour utiliser la clé

### Créer le fichier de configuration

Créez `android/keystore.properties` :

```properties
storeFile=../edt-cnam-release-key.keystore
storePassword=VOTRE_MOT_DE_PASSE
keyAlias=edt-cnam
keyPassword=VOTRE_MOT_DE_PASSE
```

### Ajouter à .gitignore

Ajoutez dans `.gitignore` :
```
# Clé de signature (NE PAS COMMITER)
*.keystore
android/keystore.properties
edt-cnam-release-key.keystore
```

---

## ⚙️ Étape 3 : Modifier le build.gradle Android

### Fichier : `android/app/build.gradle`

Ajoutez avant `android {` :

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Puis dans `android { ... }`, ajoutez avant `buildTypes` :

```gradle
signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
}
```

Puis modifiez `buildTypes` :

```gradle
buildTypes {
    debug {
        signingConfig signingConfigs.debug
    }
    release {
        signingConfig signingConfigs.release  // Ajoutez cette ligne
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

---

## 🏗️ Étape 4 : Modifier le script deploy.bat

### Changer la commande de build

Dans `deploy.bat`, ligne ~107, remplacez :

```batch
call .\gradlew.bat clean assembleDebug
```

Par :

```batch
call .\gradlew.bat clean assembleRelease
```

Et ligne ~116, remplacez :

```batch
set APK_SOURCE=android\app\build\outputs\apk\debug\app-debug.apk
set APK_DEST=android\app\build\outputs\apk\debug\edt_cnam_v!VERSION!.apk
```

Par :

```batch
set APK_SOURCE=android\app\build\outputs\apk\release\app-release.apk
set APK_DEST=android\app\build\outputs\apk\release\edt_cnam_v!VERSION!.apk
```

---

## ✅ Étape 5 : Builder et tester

```bash
.\deploy.bat
```

L'APK sera maintenant signé avec votre clé officielle !

**Fichier généré :** `android\app\build\outputs\apk\release\edt_cnam_v1.1.6.apk`

---

## 🔍 Vérifier la signature

```bash
keytool -printcert -jarfile android\app\build\outputs\apk\release\edt_cnam_v1.1.6.apk
```

Vous devriez voir vos informations (nom, organisation, etc.)

---

## ⚠️ L'avertissement sera toujours là... mais moins grave !

### Pourquoi ?

Google Play Protect affichera toujours un message car :
- ❌ L'app n'est pas sur le Google Play Store
- ❌ Google n'a pas analysé l'app

### Mais maintenant :

✅ **Clé de signature officielle** = Plus professionnel
✅ **Même clé pour toutes les versions** = Mises à jour fluides
✅ **Message Google moins alarmant** = "Application inconnue" au lieu de "Dangereuse"

---

## 🎯 Option 2 : Publier sur Play Store (Solution complète)

Pour **éliminer complètement** l'avertissement :

### 1. Créer un compte développeur Google Play

- URL : https://play.google.com/console
- Coût : **25 USD** (paiement unique)
- Délai : ~2-3 jours pour validation

### 2. Publier l'application

**Avantages :**
- ✅ Aucun avertissement Google
- ✅ Mises à jour automatiques
- ✅ Statistiques d'utilisation
- ✅ Accessible dans le Play Store
- ✅ Crédibilité professionnelle

**Inconvénients :**
- ❌ Coût initial (25 USD)
- ❌ Processus de validation (1-3 jours)
- ❌ Politique de confidentialité obligatoire
- ❌ Conditions Google Play à respecter

### Publication en "Internal Testing"

Vous pouvez publier en **test interne** gratuitement :
- ✅ Pas d'avertissement Google
- ✅ Pas de validation stricte
- ✅ Jusqu'à 100 testeurs
- ❌ Pas accessible au public

---

## 🚀 Option 3 : Distribution interne (actuelle)

### Accepter l'avertissement

**Avantages :**
- ✅ Gratuit
- ✅ Aucune validation
- ✅ Contrôle total
- ✅ Installation directe

**Inconvénients :**
- ⚠️ Avertissement Google Play Protect
- ⚠️ Utilisateurs doivent autoriser "Sources inconnues"

### Instructions pour les utilisateurs

Créez un guide pour vos utilisateurs :

**Lors de l'installation :**

1. **Message "Application bloquée"**
   - Appuyez sur "Plus d'informations"
   - Appuyez sur "Installer quand même"

2. **Autoriser les sources inconnues**
   - Paramètres → Sécurité
   - Activer "Sources inconnues" ou "Installer des apps inconnues"
   - Autoriser pour le navigateur/gestionnaire de fichiers

3. **Google Play Protect**
   - "Envoyer l'app à Google pour analyse" → Ignorer
   - L'app s'installera normalement

---

## 📊 Comparaison des options

| Option | Avertissement | Coût | Effort | Recommandé pour |
|--------|--------------|------|--------|-----------------|
| **APK Debug** (actuel) | ⚠️⚠️⚠️ Très visible | Gratuit | 0 | Tests personnels |
| **APK Signé** | ⚠️⚠️ Visible | Gratuit | 30 min | Distribution interne |
| **Play Store Internal** | ⚠️ Léger | 25 USD | 1 jour | Bêta testeurs |
| **Play Store Public** | ✅ Aucun | 25 USD | 3-5 jours | Production |

---

## 💡 Recommandation

### Pour votre cas (EICNAM) :

**Court terme (maintenant) :**
```bash
✅ Créer une clé de signature
✅ Modifier build.gradle
✅ Builder en Release
```

**Moyen terme (optionnel) :**
```bash
⭐ Publier en "Internal Testing" sur Play Store
```

**Avantages :**
- Distribution facile (lien unique)
- Pas d'avertissement pour les testeurs autorisés
- Statistiques de crash/utilisation

---

## 🔐 Checklist de sécurité

- [ ] Créer la clé de signature
- [ ] Sauvegarder la clé (backup cloud sécurisé)
- [ ] Noter le mot de passe
- [ ] Ajouter `*.keystore` à `.gitignore`
- [ ] Ajouter `keystore.properties` à `.gitignore`
- [ ] Configurer `build.gradle`
- [ ] Tester le build Release
- [ ] Vérifier la signature

---

## 📞 Support

Si vous avez des questions ou problèmes :
1. Vérifiez que Java/keytool est installé : `keytool -version`
2. Vérifiez que la clé existe : `dir edt-cnam-release-key.keystore`
3. Testez la signature : `keytool -list -v -keystore edt-cnam-release-key.keystore`

---

**🎯 En résumé : L'avertissement ne disparaîtra complètement que sur le Play Store, mais une clé de signature officielle le rendra beaucoup moins alarmant !**

