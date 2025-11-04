# 🚀 Guide de déploiement - EDT EICNAM

## 📋 Scripts de déploiement

Le projet utilise **2 scripts simplifiés** pour le déploiement :

### 1. **deploy_website.bat** - Déployer le site web

Déploie uniquement le site web sur Vercel.

```bash
.\deploy_website.bat
```

Ou avec un message de commit personnalisé :
```bash
.\deploy_website.bat "Fix bug navbar"
```

**Ce que fait le script :**
1. ✅ Vérifie la configuration web (s'assure que `next.config.js` est en mode web)
2. ✅ Vérifie que les API routes sont présentes
3. ✅ Git add + commit + push vers GitHub
4. ✅ Vercel déploie automatiquement via webhook (~1-2 minutes)

**Résultat :**
- Site web mis à jour sur Vercel
- Accessible sur https://edt-eicnam.vercel.app

---

### 2. **deploy_apk.bat** - Déployer l'APK mobile

Crée l'APK Android et l'uploade sur Supabase.

```bash
.\deploy_apk.bat
```

Ou avec une version spécifique :
```bash
.\deploy_apk.bat 2.0.60
```

**Ce que fait le script :**
1. ✅ Appelle `mobile-config/build-apk.bat`
2. ✅ Demande si vous voulez incrémenter la version (+0.0.1)
3. ✅ Met à jour tous les fichiers avec la version
4. ✅ Build l'APK release signé
5. ✅ Renomme en `edt_cnam_vX.Y.Z.apk`
6. ✅ Uploade sur Supabase (remplace l'ancien APK de même version)

**Résultat :**
- APK créé localement : `android\app\build\outputs\apk\release\edt_cnam_vX.Y.Z.apk`
- APK uploadé sur Supabase
- Accessible via l'API `/api/version`

---

## 🎯 Workflow typique

### Développement web uniquement

```bash
# 1. Modifier le code
# 2. Tester localement
npm run dev

# 3. Déployer
.\deploy_website.bat "Ajout fonctionnalité X"
```

### Développement mobile (APK)

```bash
# 1. Modifier le code
# 2. Tester localement (si possible)

# 3. Déployer l'APK
.\deploy_apk.bat

# 4. Tester sur téléphone
adb install android\app\build\outputs\apk\release\edt_cnam_v*.apk
```

### Déploiement complet (web + mobile)

```bash
# 1. Déployer l'APK
.\deploy_apk.bat

# 2. Déployer le site web
.\deploy_website.bat "Mise à jour version X.Y.Z"
```

---

## 📱 Format APK

**Format unique :** `edt_cnam_vX.Y.Z.apk`

Exemples :
- `edt_cnam_v2.0.60.apk`
- `edt_cnam_v2.0.61.apk`

**Remplacement Supabase :**
- Si vous uploadez `edt_cnam_v2.0.60.apk` alors qu'il existe déjà, l'ancien est supprimé et remplacé
- Utile pour corriger un APK sans changer la version

---

## 🔄 Gestion des versions

### Version actuelle

Le script `deploy_apk.bat` demande si vous voulez incrémenter :

```
Version actuelle: 2.0.60
Voulez-vous incrementer la version (+0.0.1) ? (O/N):
```

- **O** : Incrémente → `2.0.61`
- **N** : Garde la version actuelle → `2.0.60`

### Version spécifique

Passer la version en paramètre pour forcer une version :

```bash
.\deploy_apk.bat 2.1.0
```

→ Utilise directement `2.1.0` sans demander

---

## ⚙️ Configuration requise

### Prérequis

- ✅ Git installé et configuré
- ✅ Node.js installé
- ✅ Android SDK installé
- ✅ Compte Supabase configuré (`.env.local`)
- ✅ Repository Git initialisé et remote configuré

### Variables d'environnement (`.env.local`)

```env
# Supabase (obligatoire pour upload APK)
NEXT_PUBLIC_SUPABASE_URL=https://votre-project-id.supabase.co
SUPABASE_SERVICE_ROLE=votre-service-role-key

# Site URL
NEXT_PUBLIC_SITE_URL=https://edt-eicnam.vercel.app

# ICS URLs
ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics
NEXT_PUBLIC_ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics
```

---

## 🛠️ Dépannage

### Erreur : "Git n'est pas installé"

➡️ Installez Git : https://git-scm.com/downloads

### Erreur : "Upload Supabase a échoué"

➡️ Vérifiez `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE=...
```

### Erreur : "Git push a échoué"

Vérifiez :
- Connexion Internet
- Droits sur le repository
- Pas de conflits Git

Solution :
```bash
git pull --rebase
git push
```

### Processus Node.js verrouillent les fichiers

Le script `build-apk.bat` arrête automatiquement les processus Node.js.
Si l'erreur persiste, fermez manuellement votre IDE.

### Build APK échoue

1. Fermer Android Studio et l'émulateur
2. Supprimer `android/app/build`
3. Relancer le script

---

## 📝 Vérification des déploiements

### Site web

- URL : https://edt-eicnam.vercel.app
- Dashboard Vercel : https://vercel.com/dashboard
- API version : https://edt-eicnam.vercel.app/api/version

### APK mobile

- Supabase Storage : https://app.supabase.com/project/.../storage/buckets
- API version : https://edt-eicnam.vercel.app/api/version

### Tester la mise à jour

1. Installer l'APK sur un téléphone
2. Lancer l'app
3. L'app vérifie automatiquement s'il y a une mise à jour
4. Si nouvelle version disponible, popup de téléchargement

---

## 💡 Tips

### Vérifier la version actuelle

```bash
node mobile-config\get-version.js
```

### Déployer sans incrémenter

```bash
.\deploy_apk.bat 2.0.60
```

(Utilise la même version, utile après des corrections)

### Installer l'APK sur téléphone

```bash
adb install android\app\build\outputs\apk\release\edt_cnam_v*.apk
```

### Vérifier le déploiement Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. Vérifiez le dernier déploiement

---

## ✨ Avantages

✅ **Scripts simplifiés** : 2 scripts au lieu de 6+  
✅ **Workflow clair** : Un script par usage (web / mobile)  
✅ **Moins d'erreurs** : Automatisation complète  
✅ **Gain de temps** : Plus besoin de gérer prod/dev séparément  
✅ **Format unique** : Un seul format APK (`edt_cnam_vX.Y.Z.apk`)  

---

**🎉 Déploiement simplifié et automatisé !**
