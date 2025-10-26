# 🚀 Guide de déploiement - EDT EICNAM

## 📦 Script `deploy.bat` - Déploiement complet automatisé

### Qu'est-ce que ce script fait ?

Le script `deploy.bat` automatise **TOUT** le processus de déploiement :

1. ✅ **Incrémentation de version** (automatique ou manuelle)
2. ✅ **Mise à jour des fichiers** avec la nouvelle version
3. ✅ **Build de l'APK** Android
4. ✅ **Upload sur Supabase** 
5. ✅ **Git add, commit et push** vers GitHub
6. ✅ **Déploiement automatique** sur Vercel (via le push)

### 🎯 Utilisation

#### Option 1 : Auto-incrémentation (+0.0.1)

```bash
.\deploy.bat
```

Exemple : `1.1.3` → `1.1.4`

#### Option 2 : Version spécifique

```bash
.\deploy.bat 2.0.0
```

Utilise directement la version `2.0.0`

---

## 📋 Processus détaillé

### Étapes du script

```
[0/9] Vérification des processus Node.js
[1/9] Nettoyage des dossiers build
[2/9] Préparation configuration mobile
[3/9] Build Next.js (export statique)
[4/9] Restauration configuration web
[5/9] Sync Capacitor Android
[6/9] Build APK avec Gradle
[7/9] Renommage APK avec version
[8/9] Upload APK vers Supabase
[9/9] Git add + commit + push
```

### Fichiers mis à jour automatiquement

- `package.json` → version
- `src/app/api/version/route.js` → version + URL APK
- `src/app/page.js` → version affichée

### Commandes Git exécutées

```bash
git add .
git commit -m "Update version to X.X.X"
git push
```

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

## 🔄 Workflow complet

### 1. Modifications locales

Faites vos modifications dans le code source.

### 2. Déploiement

```bash
.\deploy.bat
```

Le script va :
- Incrémenter la version
- Créer l'APK
- Uploader sur Supabase
- Commit et push sur GitHub

### 3. Déploiement Vercel

Vercel détecte automatiquement le push et déploie le site.

### 4. Vérification

- ✅ APK disponible sur Supabase
- ✅ Site déployé sur Vercel
- ✅ API `/api/version` mise à jour
- ✅ Route `/download` fonctionnelle

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

Le script continue automatiquement avec le Git push même si l'upload échoue.

### Erreur : "Git push a échoué"

Vérifiez :
- Connexion Internet
- Droits sur le repository
- Pas de conflits Git

### Processus Node.js verrouillent les fichiers

Le script arrête automatiquement les processus Node.js.
Si l'erreur persiste, fermez manuellement votre IDE.

---

## 📝 Comparaison avec l'ancien script

### Ancien : `mobile-config\build-apk.bat`

```bash
cd mobile-config
.\build-apk.bat
```

**Faisait :**
- ✅ Build APK
- ✅ Upload Supabase
- ❌ Pas de Git commit/push

### Nouveau : `deploy.bat` (racine)

```bash
.\deploy.bat
```

**Fait :**
- ✅ Build APK
- ✅ Upload Supabase
- ✅ Git add + commit + push
- ✅ Déploiement Vercel automatique

---

## 💡 Tips

### Vérifier la version actuelle

```bash
node mobile-config\get-version.js
```

### Déployer sans incrémenter

```bash
.\deploy.bat 1.1.3
```
(Utilise la même version, utile après des corrections)

### Skip le push Git

Si vous voulez juste builder l'APK sans pusher :
➡️ Utilisez l'ancien script : `mobile-config\build-apk.bat`

### Vérifier le déploiement Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. Vérifiez le dernier déploiement

---

## 🎯 Cas d'usage

### Nouvelle fonctionnalité

```bash
# 1. Développement
# ... codez votre feature ...

# 2. Deploy complet
.\deploy.bat

# 3. Attendre le déploiement Vercel (~2 min)
# 4. Tester sur le site + app mobile
```

### Correction de bug (hotfix)

```bash
# 1. Correction
# ... corrigez le bug ...

# 2. Deploy
.\deploy.bat

# Version incrémentée automatiquement
```

### Release majeure

```bash
# Version 2.0.0
.\deploy.bat 2.0.0
```

---

## 📱 Après le déploiement

### Sur le site web

- URL : https://edt-eicnam.vercel.app
- API version : https://edt-eicnam.vercel.app/api/version
- Télécharger APK : https://edt-eicnam.vercel.app/download

### Sur l'app mobile

Les utilisateurs recevront une notification de mise à jour au prochain lancement de l'app.

---

## ✨ Avantages

✅ **Un seul script** pour tout déployer  
✅ **Automatisation complète** du workflow  
✅ **Moins d'erreurs humaines**  
✅ **Gain de temps** considérable  
✅ **Traçabilité** avec Git commits  
✅ **Déploiement Vercel** automatique  

---

**🎉 Plus besoin de faire 5 commandes manuellement, tout est automatisé !**

