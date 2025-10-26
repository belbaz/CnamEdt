# 📱 Guide Mobile APK - EDT EICNAM

## 🚀 Créer l'APK et l'uploader sur Supabase (ultra-simple)

### ⚠️ Étape 0 : Configuration Supabase

Créez un fichier `.env.local` à la racine du projet avec :
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-project-id.supabase.co
SUPABASE_SERVICE_ROLE=votre-service-role-key
NEXT_PUBLIC_APK_URL=https://votre-project-id.supabase.co/storage/v1/object/public/Apk%20Edt%20Eicnam/apk/app-debug.apk
```

**Note :** Trouvez votre `SUPABASE_SERVICE_ROLE` dans : Supabase Dashboard → Project Settings → API → service_role key

### ⚠️ Étape 1 : Arrêter le serveur de dev

**IMPORTANT :** Si vous avez `npm run dev` en cours, **arrêtez-le d'abord** (Ctrl+C) !

Le script tue automatiquement les processus Node.js, mais si vous voulez vérifier manuellement :
```powershell
.\check-node-processes.ps1
```

### Étape 2 : Lancer le build

```bash
.\build-apk.bat
```

**Le script fait automatiquement :**
1. Build de l'APK
2. Upload vers Supabase Storage
3. Suppression de l'ancien APK (si existant)

**APK généré localement :** `..\android\app\build\outputs\apk\debug\app-debug.apk`
**APK en ligne :** URL affichée après l'upload

---

## 📲 Installer sur téléphone

### Méthode 1 : Via USB
```bash
adb install ..\android\app\build\outputs\apk\debug\app-debug.apk
```

### Méthode 2 : Copier le fichier
1. Copier `app-debug.apk` sur ton téléphone
2. Ouvrir le fichier
3. Autoriser l'installation
4. Installer

---

## ⚙️ Prérequis (première fois)

1. **Android Studio** - https://developer.android.com/studio
2. **JDK 17** - https://adoptium.net/temurin/releases/?version=17
3. **Dépendances** - `npm install` (à la racine)

---

## 🔄 Workflow

### Modifier le code et rebuild
```bash
# 1. Modifier ton code React/CSS dans src/
# 2. Rebuild l'APK
.\build-apk.bat
# 3. Réinstaller sur téléphone
```

---

## 📁 Fichiers dans ce dossier

- **build-apk.bat** - Script pour créer l'APK et l'uploader sur Supabase
- **upload-to-supabase.js** - Script Node.js pour uploader l'APK
- **check-node-processes.ps1** - Script pour vérifier/tuer les processus Node.js
- **capacitor.config.ts** - Config Capacitor (copié à la racine au build)
- **next.config.mobile.js** - Config Next.js pour export statique
- **GUIDE.md** - Ce fichier

---

## 🔧 Ce que fait build-apk.bat

1. **Vérifie et tue** les processus Node.js en cours (serveurs de dev)
2. Nettoyage des builds précédents
3. **Sauvegarde** `next.config.js` actuel et swap vers config mobile
4. **Renomme** temporairement `src/app/api/` → `_api_backup` (incompatible export statique)
5. Build Next.js en mode statique → dossier `out/`
6. **Restaure** `_api_backup` → `api/` ET `next.config.js` en mode web
7. Sync avec Capacitor → copie `out/` vers `android/`
8. Compile l'APK avec Gradle
9. **Upload vers Supabase** (supprime l'ancien APK si existant)

✅ Après le build APK, vous pouvez immédiatement faire `npm run build` pour le web sans problème !

---

## 🎯 Différences Web vs Mobile

| Feature | Web (Vercel) | Mobile (APK) |
|---------|-------------|--------------|
| Fetch ICS | Via API `/api/fetch-ics` | Direct avec CapacitorHttp |
| Parse ICS | Serveur (node-ical) | Client (parseICSContent) |
| Cache | localStorage | localStorage |
| Chargement | ~2s | 1er: ~3s, suivants: ~0.5s ⚡ |
| Splash screen | ❌ | ✅ Bleu avec spinner |

---

## 🐛 Problèmes courants

### "Access denied" lors du build
→ **Le script tue automatiquement les processus Node.js**  
→ Si l'erreur persiste, consultez `TROUBLESHOOTING.md`  
→ Ou lancez manuellement : `.\check-node-processes.ps1`

### "JAVA_HOME not set"
→ Installer JDK 17 : https://adoptium.net/temurin/releases/?version=17

### "SDK location not found"
→ Le fichier `android/local.properties` est créé automatiquement

### L'app crash au démarrage
→ Vérifier que `npm run build` fonctionne sans erreur

### L'app ne charge pas les données
→ Voir les infos de debug dans l'app (zone d'erreur rouge)

### Upload Supabase échoue
→ Vérifiez que `.env.local` contient `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE`
→ Vérifiez que votre projet Supabase existe et que la clé est valide
→ Le bucket sera créé automatiquement s'il n'existe pas

---

## ⚡ Optimisations

✅ **Cache intelligent** - Affichage instantané après 1er lancement  
✅ **Splash screen** - Chargement fluide  
✅ **CapacitorHttp** - Fetch réseau optimisé  
✅ **Build minifié** - Code optimisé  

---

## 🔮 Version 2.0 (optionnel, plus tard)

Pour ajouter les notifications push automatiques :
- Setup Supabase (backend)
- Setup Firebase FCM (notifications)
- Edge Functions (vérification toutes les heures)

Voir le fichier racine `README.md` pour plus d'infos.

---

## 📝 Notes

- Le dossier `android/` est généré et ne doit pas être commité dans git
- L'APK Debug fait ~20 MB
- Pour partager l'APK : juste envoyer le fichier `app-debug.apk`
- Pas besoin du Play Store, l'APK s'installe directement

---

**Version actuelle : v1.0 - APK fonctionnel avec cache optimisé**
