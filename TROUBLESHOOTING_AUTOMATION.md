# 🔧 Guide de Dépannage - Automatisation EDT

Ce guide vous aide à résoudre les problèmes courants du système d'automatisation.

---

## 🩺 Diagnostic rapide

### ✅ Comment savoir si tout fonctionne ?

1. **Test immédiat :**
```bash
npm run test:automation
```
**Résultat attendu :** 2/2 tests réussis ✅

2. **Vérification Supabase :**
```sql
SELECT last_check FROM test_edt WHERE id = 1;
```
**Résultat attendu :** Timestamp récent (< 2 heures)

3. **Page de monitoring :**
Visitez `/monitoring` → doit afficher "✅ Timestamp mis à jour avec succès"

---

## 🚨 Problèmes courants

### ❌ Erreur: "Table test_edt does not exist"

**Symptôme :**
```json
{
  "error": "Erreur lors de la mise à jour",
  "details": "relation \"test_edt\" does not exist"
}
```

**Cause :**  
La table n'a pas été créée dans Supabase.

**Solution :**
1. Ouvrir **Supabase Dashboard** → SQL Editor
2. Copier-coller le contenu de `supabase-sql/create_test_edt_table.sql`
3. Cliquer sur **Run**
4. Vérifier : `SELECT * FROM test_edt;`

---

### ❌ Erreur: "Supabase non configuré"

**Symptôme :**
```json
{
  "error": "Supabase non configuré",
  "details": "Vérifiez les variables d'environnement..."
}
```

**Cause :**  
Variables d'environnement manquantes ou incorrectes.

**Solution :**

#### En local (`.env.local`)
```bash
# Vérifier que le fichier existe
ls .env.local

# Vérifier le contenu
cat .env.local
```

Contenu requis :
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGc...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
```

#### En production (Vercel)
1. **Vercel Dashboard** → Votre projet → **Settings**
2. **Environment Variables**
3. Vérifier que ces 3 variables existent :
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE`
   - `NEXT_PUBLIC_SUPABASE_URL`

**⚠️ Important :** Après modification, redéployer :
```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

---

### ❌ Le timestamp ne se met pas à jour

**Symptôme :**  
`test_edt.last_check` ne change pas après 1-2 heures.

**Diagnostic étape par étape :**

#### 1. Vérifier que l'API fonctionne manuellement

```bash
# Test en production
curl https://votre-domaine.vercel.app/api/test-update
```

**Si ça fonctionne ici**, le problème vient du cron job.

#### 2. Vérifier Vercel Cron Jobs

1. **Vercel Dashboard** → Votre projet
2. Onglet **Cron Jobs**

**Questions à vérifier :**
- [ ] Les 2 cron jobs sont-ils visibles ?
- [ ] Sont-ils actifs (enabled) ?
- [ ] Y a-t-il des erreurs dans l'historique ?

**Si les cron jobs n'apparaissent pas :**
- Vérifier que `vercel.json` existe à la racine
- Vérifier que `vercel.json` est bien dans Git
- Redéployer : `git push`

#### 3. Vérifier les logs Vercel

1. **Vercel Dashboard** → Votre projet → **Logs**
2. Filtrer par "test-update" ou "fetch-ics"
3. Chercher des erreurs (rouges)

**Erreurs communes :**
- `ECONNREFUSED` → Problème réseau
- `401 Unauthorized` → Service role invalide
- `500 Internal Server Error` → Voir le message d'erreur

#### 4. Vérifier GitHub Actions (backup)

1. **GitHub** → Votre repo → **Actions**
2. Workflow "Update EDT Automatique"
3. Vérifier les exécutions récentes

**Si aucune exécution :**
- Vérifier que le fichier `.github/workflows/update-edt.yml` existe
- Vérifier que le secret `VERCEL_DOMAIN` est configuré
- Lancer manuellement : **Run workflow**

---

### ❌ Erreur 500 sur /api/test-update

**Symptôme :**
```
Error 500: Internal Server Error
```

**Solutions par ordre de probabilité :**

#### 1. Variables d'environnement manquantes
Voir section ["Supabase non configuré"](#erreur-supabase-non-configuré)

#### 2. Mauvaise clé service role
```bash
# Dans .env.local
# La clé doit commencer par "eyJ..." (JWT)
# PAS la clé anon (commence aussi par "eyJ" mais différente)
```

**Où trouver la bonne clé :**
1. **Supabase Dashboard** → Settings → API
2. Copier **service_role** (⚠️ PAS anon key)
3. Cette clé est secrète, ne pas la commiter !

#### 3. Table corrompue
```sql
-- Vérifier la structure
\d test_edt

-- Recréer si besoin
DROP TABLE IF EXISTS test_edt;
-- Puis réexécuter create_test_edt_table.sql
```

---

### ❌ Erreur CORS sur /monitoring

**Symptôme :**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Cause :**  
Ce problème ne devrait pas arriver car l'API et le frontend sont sur le même domaine.

**Solutions :**
1. Vérifier que vous accédez à `/monitoring` via le même domaine
2. Vider le cache du navigateur (Ctrl+Shift+R)
3. Vérifier qu'il n'y a pas de bloqueur de contenu

---

### ❌ Page /monitoring ne charge pas

**Symptôme :**
- Page blanche
- Erreur 404
- Erreur de compilation

**Solutions :**

#### 1. Vérifier que le fichier existe
```bash
ls src/app/monitoring/page.jsx
```

#### 2. Vérifier les logs Next.js
```bash
npm run dev
# Chercher les erreurs de compilation
```

#### 3. Erreur React commune
Si erreur "Hooks can only be called inside...", vérifier que le fichier commence par :
```jsx
'use client';
```

---

### ❌ Erreur lors du test local

**Symptôme :**
```bash
npm run test:automation
# Erreur: ECONNREFUSED
```

**Cause :**  
Le serveur Next.js n'est pas démarré.

**Solution :**
```bash
# Terminal 1
npm run dev

# Terminal 2 (attendre que le serveur soit prêt)
npm run test:automation
```

---

### ❌ GitHub Actions échoue

**Symptôme :**
Workflow "Update EDT Automatique" en rouge (❌ Failed)

**Solutions :**

#### 1. Secret manquant
```
Error: curl: (6) Could not resolve host: /api/fetch-ics
```

**Solution :**
1. **GitHub** → Repo → **Settings** → **Secrets and variables** → **Actions**
2. Créer secret `VERCEL_DOMAIN`
3. Valeur : `votre-domaine.vercel.app` (sans https://)

#### 2. URL invalide
Vérifier dans `.github/workflows/update-edt.yml` :
```yaml
https://${{ secrets.VERCEL_DOMAIN }}/api/test-update
```

#### 3. API retourne 500
Voir section ["Erreur 500"](#erreur-500-sur-apitest-update)

---

### ❌ Script PowerShell ne s'exécute pas

**Symptôme :**
```
.\scripts\test-automation.ps1 : File cannot be loaded because running scripts is disabled
```

**Cause :**  
Politique d'exécution PowerShell restrictive.

**Solution :**
```powershell
# Option 1 : Autoriser pour cette session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# Option 2 : Utiliser le script Node.js à la place
npm run test:automation
```

---

## 🔍 Outils de diagnostic

### 1. Logs Vercel

```bash
# Via CLI Vercel (optionnel)
vercel logs votre-projet --follow
```

### 2. Requête manuelle avec détails

```bash
# Linux/Mac
curl -v https://votre-domaine.vercel.app/api/test-update

# Windows PowerShell
Invoke-WebRequest -Uri "https://votre-domaine.vercel.app/api/test-update" -Verbose
```

### 3. Vérifier la santé de Supabase

```bash
curl https://xxxxx.supabase.co/rest/v1/
# Doit retourner 200 OK
```

### 4. Tester la connexion ICS

```bash
curl -I https://galao.cnam.fr/partage/agendas/dbeiparis/agenda_62407593.ics
# Doit retourner 200 OK
```

---

## 📊 Checklist de dépannage

Utilisez cette checklist pour diagnostiquer systématiquement :

```
[ ] Test local fonctionne (npm run test:automation)
[ ] Fichier .env.local existe et est correct
[ ] Table test_edt existe dans Supabase
[ ] Variables env configurées sur Vercel
[ ] Fichier vercel.json existe à la racine
[ ] Cron jobs visibles dans Vercel Dashboard
[ ] Pas d'erreurs dans les logs Vercel (dernières 24h)
[ ] Page /monitoring charge sans erreur
[ ] Timestamp change dans Supabase après test manuel
[ ] GitHub Actions secret VERCEL_DOMAIN configuré
```

**Si tout est ✅ mais ça ne marche pas :**
→ Attendre 1 heure complète (les crons s'exécutent à l'heure pile : 14:00, 15:00, etc.)

---

## 🆘 Demander de l'aide

Si rien ne fonctionne, préparez ces informations :

### 1. Logs d'erreur
```bash
# Copier le résultat de :
npm run test:automation

# Ou screenshot de la page /monitoring
```

### 2. Configuration Vercel
```
Screenshot de :
- Vercel Dashboard → Cron Jobs
- Vercel Dashboard → Environment Variables (masquer les valeurs sensibles)
```

### 3. État Supabase
```sql
SELECT * FROM test_edt;
-- Copier le résultat
```

### 4. Logs détaillés
```
Vercel Dashboard → Logs → Filter by "test-update"
-- Screenshot des dernières erreurs
```

---

## 💡 Conseils de prévention

### ✅ Bonnes pratiques

1. **Tester en local d'abord**
```bash
npm run test:automation
# Avant chaque déploiement
```

2. **Vérifier régulièrement**
```sql
-- Tous les jours ou une fois par semaine
SELECT last_check FROM test_edt WHERE id = 1;
```

3. **Surveiller les logs Vercel**
- Activer les notifications par email (optionnel)
- Vérifier une fois par semaine

4. **Garder les secrets à jour**
- Si vous régénérez les clés Supabase, mettre à jour partout
- Redéployer après modification

5. **Ne pas commiter les secrets**
```bash
# .env.local doit être dans .gitignore
git status  # Ne doit PAS montrer .env.local
```

---

## 📞 Ressources utiles

- **Vercel Status :** https://www.vercel-status.com/
- **Supabase Status :** https://status.supabase.com/
- **GitHub Status :** https://www.githubstatus.com/

---

## 🎯 Si vraiment rien ne marche

### Plan B : Automatisation manuelle simple

Si toutes les solutions automatiques échouent, voici une alternative :

#### Créer un bookmark
```javascript
javascript:(function(){fetch('/api/test-update').then(r=>r.json()).then(d=>alert(JSON.stringify(d)))})();
```

Créer un bookmark dans votre navigateur avec ce code, cliquer dessus manuellement chaque jour.

#### Tâche planifiée Windows (local)
```powershell
# Créer une tâche qui s'exécute toutes les heures
schtasks /create /tn "EDT Update" /tr "curl https://votre-domaine.vercel.app/api/test-update" /sc hourly
```

**Note :** Ces solutions ne sont pas idéales mais fonctionnent en dernier recours.

---

**Dernière mise à jour :** 8 novembre 2025  
**Version :** 1.0

