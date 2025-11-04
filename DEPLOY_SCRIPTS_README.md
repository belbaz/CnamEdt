# Guide des Scripts de Déploiement EDT EICNAM

## 📋 Scripts Disponibles

### 1. **deploy_website.bat** - Déployer le site web

Déploie uniquement le site web sur Vercel.

```batch
.\deploy_website.bat ["message de commit"]
```

**Exemple :**
```batch
.\deploy_website.bat "Fix bug navbar"
```

**Fait :**
- ✅ Vérifie la configuration web
- ✅ Vérifie les API routes
- ✅ Git add + commit + push
- ✅ Déploiement automatique Vercel

**Résultat :**
- Site web mis à jour sur https://edt-eicnam.vercel.app

---

### 2. **deploy_apk.bat** - Déployer l'APK mobile

Crée l'APK Android et l'uploade sur Supabase.

```batch
.\deploy_apk.bat [version]
```

**Exemples :**
```batch
.\deploy_apk.bat              # Demande si incrémenter
.\deploy_apk.bat 2.0.60      # Utilise la version 2.0.60
```

**Fait :**
- ✅ Demande si vous voulez incrémenter la version (+0.0.1)
- ✅ Met à jour tous les fichiers avec la version
- ✅ Build l'APK release signé
- ✅ Renomme en `edt_cnam_vX.Y.Z.apk`
- ✅ Uploade sur Supabase (remplace l'ancien de même version)

**Résultat :**
- APK créé : `android\app\build\outputs\apk\release\edt_cnam_vX.Y.Z.apk`
- APK uploadé sur Supabase
- Accessible via l'API `/api/version`

---

## 🎯 Utilisation Typique

### Développement Web

1. Faire vos modifications
2. Tester localement avec `npm run dev`
3. Déployer : `.\deploy_website.bat "Description des changements"`

### Développement Mobile

1. Faire vos modifications
2. Déployer l'APK : `.\deploy_apk.bat`
3. Tester sur appareil Android

### Déploiement Complet

1. Déployer l'APK : `.\deploy_apk.bat`
2. Déployer le site : `.\deploy_website.bat "Mise à jour version X.Y.Z"`

---

## 📱 Format APK

**Format unique :** `edt_cnam_vX.Y.Z.apk`

Exemples :
- `edt_cnam_v2.0.60.apk`
- `edt_cnam_v2.0.61.apk`

**Note importante :**
- Il n'y a plus de distinction prod/dev pour l'APK
- Format unique utilisé partout
- Le site web conserve ses environnements prod/dev si nécessaire

---

## 🔄 Gestion des Versions

### Incrémentation optionnelle

Quand vous lancez `.\deploy_apk.bat` sans paramètre :

```
Version actuelle: 2.0.60
Voulez-vous incrementer la version (+0.0.1) ? (O/N):
```

- **O** : Incrémente → `2.0.61`
- **N** : Garde → `2.0.60`

### Version spécifique

Pour forcer une version précise :

```batch
.\deploy_apk.bat 2.1.0
```

→ Utilise directement `2.1.0` sans demander

---

## ⚙️ Configuration Requise

### Variables d'Environnement (`.env.local`)

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

## 🛠️ Résolution des Problèmes

### "Erreur de mise à jour" dans l'app

1. Vérifier la connexion internet
2. Vérifier que l'APK est bien dans Supabase
3. Vérifier les logs de l'API `/api/version`

### Build APK échoue

1. Fermer Android Studio et l'émulateur
2. Supprimer `android/app/build`
3. Relancer le script

### Git push échoue

1. Vérifier votre connexion
2. `git pull --rebase` puis relancer
3. Vérifier vos credentials GitHub

### Upload Supabase échoue

1. Vérifier `.env.local` contient `SUPABASE_SERVICE_ROLE`
2. Vérifier que le bucket `Apk Edt Eicnam` existe dans Supabase
3. Vérifier que le bucket est public

---

## 📊 Vérification des Versions

### Version Actuelle en Production

```bash
curl https://edt-eicnam.vercel.app/api/version
```

### Logs de Déploiement

- **Vercel** : https://vercel.com/dashboard
- **Supabase** : https://app.supabase.com/project/.../storage/buckets

---

## 💡 Tips

### Vérifier la version actuelle

```bash
node mobile-config\get-version.js
```

### Installer l'APK sur téléphone

```bash
adb install android\app\build\outputs\apk\release\edt_cnam_v*.apk
```

### Déployer sans incrémenter

```bash
.\deploy_apk.bat 2.0.60
```

(Utile pour corriger un APK sans changer la version)

---

## ✨ Avantages

✅ **2 scripts simples** au lieu de 6+ scripts  
✅ **Workflow clair** : Un script par usage  
✅ **Format unique** : Un seul format APK  
✅ **Moins de confusion** : Plus de gestion prod/dev pour l'APK  
✅ **Automatisation complète** : Tout est géré automatiquement  

---

**🎉 Déploiement simplifié !**
