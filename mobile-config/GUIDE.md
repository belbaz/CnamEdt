# 📱 Guide Mobile APK - EDT EICNAM

## 🚀 Créer l'APK (ultra-simple)

```bash
.\build-apk.bat
```

**APK généré :** `..\android\app\build\outputs\apk\debug\app-debug.apk`

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

- **build-apk.bat** - Script pour créer l'APK
- **capacitor.config.ts** - Config Capacitor (copié à la racine au build)
- **next.config.mobile.js** - Config Next.js pour export statique
- **GUIDE.md** - Ce fichier

---

## 🔧 Ce que fait build-apk.bat

1. Swap `next.config.js` (web → mobile)
2. Déplace `src/app/api/` temporairement (incompatible export statique)
3. Build Next.js en mode statique → dossier `out/`
4. Restaure `next.config.js` et `api/`
5. Sync avec Capacitor → copie `out/` vers `android/`
6. Compile l'APK avec Gradle

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
→ Arrêter `npm run dev` avant de builder

### "JAVA_HOME not set"
→ Installer JDK 17 : https://adoptium.net/temurin/releases/?version=17

### "SDK location not found"
→ Le fichier `android/local.properties` est créé automatiquement

### L'app crash au démarrage
→ Vérifier que `npm run build` fonctionne sans erreur

### L'app ne charge pas les données
→ Voir les infos de debug dans l'app (zone d'erreur rouge)

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
