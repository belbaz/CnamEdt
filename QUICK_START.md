# 🚀 Quick Start - Configuration finale

## 📋 Pour commencer (une seule fois)

### 1️⃣ Créez votre fichier `.env.local`

Si vous n'en avez pas encore, copiez l'exemple :

```bash
copy env.example .env.local
```

### 2️⃣ Remplissez `.env.local` avec vos informations

```env
# Supabase (obligatoire pour upload APK)
NEXT_PUBLIC_SUPABASE_URL=https://aeftxgwfokzlspojzisx.supabase.co
SUPABASE_SERVICE_ROLE=votre-service-role-key-ici

# APK URL (sera généré après premier upload)
NEXT_PUBLIC_APK_URL=https://aeftxgwfokzlspojzisx.supabase.co/storage/v1/object/public/Apk%20Edt%20Eicnam/apk/edt_cnam_v1.1.3.apk

# Site web
NEXT_PUBLIC_SITE_URL=https://edt-eicnam.vercel.app

# ICS URLs (emploi du temps)
ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics
NEXT_PUBLIC_ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics

# Mot de passe pour signature APK (choisissez-en un et gardez-le)
KEYSTORE_PASSWORD=VotreMotDePasseSecurise123
```

**⚠️ Important :**
- Remplacez `votre-service-role-key-ici` par votre vraie clé Supabase
- Choisissez un mot de passe pour `KEYSTORE_PASSWORD` (minimum 6 caractères)
- **Gardez toujours le même mot de passe** pour la signature APK !

---

## 🎯 Utilisation quotidienne

### Déployer l'application (APK + Site)

```bash
.\deploy.bat
```

**Ce que ça fait :**
1. Incrémente la version automatiquement (`1.1.5` → `1.1.6`)
2. Build l'APK Android
3. Upload sur Supabase
4. Commit et push sur Git
5. Déclenche le déploiement Vercel

**Version spécifique :**
```bash
.\deploy.bat 2.0.0
```

---

## 🔐 Configuration signature APK (optionnel mais recommandé)

**Pourquoi ?** Pour réduire l'avertissement Google Play Protect

**Une seule fois :**

1. Vérifiez que `KEYSTORE_PASSWORD` est dans `.env.local`

2. Exécutez :
   ```bash
   .\setup-signing.bat
   ```

3. Suivez les instructions du script pour modifier :
   - `android\app\build.gradle`
   - `deploy.bat`

4. Testez :
   ```bash
   .\deploy.bat
   ```

**Plus de détails :** Voir `GOOGLE_WARNING_FIX.md`

---

## 📚 Documentation complète

| Fichier | Description |
|---------|-------------|
| `DEPLOY_GUIDE.md` | Guide complet du script `deploy.bat` |
| `GOOGLE_WARNING_FIX.md` | Solutions pour l'avertissement Google |
| `SIGNING_GUIDE.md` | Guide détaillé signature APK |
| `CHANGES.md` | Récapitulatif de toutes les modifications |

---

## 🆘 Problèmes courants

### "KEYSTORE_PASSWORD non trouvé"
➡️ Ajoutez `KEYSTORE_PASSWORD=VotreMotDePasse` dans `.env.local`

### "Upload Supabase échoué"
➡️ Vérifiez `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE` dans `.env.local`

### "Git push échoué"
➡️ Vérifiez votre connexion Internet et vos droits sur le repository

---

## ✅ Checklist de démarrage

- [ ] Créer `.env.local` depuis `env.example`
- [ ] Remplir les variables Supabase
- [ ] Définir `KEYSTORE_PASSWORD`
- [ ] Tester : `.\deploy.bat`
- [ ] (Optionnel) Configurer signature : `.\setup-signing.bat`

---

**🎉 C'est tout ! Vous êtes prêt à déployer !**

```bash
.\deploy.bat
```

