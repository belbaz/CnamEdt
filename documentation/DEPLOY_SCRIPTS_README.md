# Guide des Scripts de Déploiement EDT EICNAM

## 📋 Script Disponible

### **deploy_website.bat** - Déployer le site web

Déploie le site web sur Vercel.

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

## 🎯 Utilisation Typique

### Développement Web

1. Faire vos modifications
2. Tester localement avec `npm run dev`
3. Déployer : `.\deploy_website.bat "Description des changements"`

---

## ⚙️ Configuration Requise

### Variables d'Environnement (`.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-project-id.supabase.co
SUPABASE_SERVICE_ROLE=votre-service-role-key

# Site URL
NEXT_PUBLIC_SITE_URL=https://edt-eicnam.vercel.app

# ICS URLs
ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics
NEXT_PUBLIC_ICS_URL=https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics

# Vercel Blob Storage (optionnel)
BLOB_READ_WRITE_TOKEN=votre-token-vercel-blob
```

---

## 🛠️ Résolution des Problèmes

### Git push échoue

1. Vérifier votre connexion
2. `git pull --rebase` puis relancer
3. Vérifier vos credentials GitHub

### Erreur de configuration

1. Vérifier que `next.config.js` est en mode web (pas `output: 'export'`)
2. Vérifier que les API routes existent
3. Exécuter `node scripts/verify-api-routes.js`

---

## 📊 Vérification du Déploiement

### Logs de Déploiement

- **Vercel** : https://vercel.com/dashboard
- **GitHub** : Voir l'historique des commits

---

## 💡 Tips

### Tester localement avant de déployer

```bash
npm run build
npm start
```

### Voir la version actuelle

Vérifier `package.json` :
```bash
cat package.json | grep version
```

---

## ✨ Avantages

✅ **Script simple** : Une seule commande pour tout  
✅ **Workflow clair** : Build, test, déploiement automatique  
✅ **Automatisation complète** : Tout est géré par le script  
✅ **PWA intégrée** : L'application est installable sur mobile et desktop  

---

**🎉 Déploiement simplifié !**
