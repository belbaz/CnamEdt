# 🚀 Démarrage Rapide - Automatisation EDT

Guide ultra-rapide pour mettre en place l'automatisation en 5 minutes avec **GitHub Actions**.

---

## ⚡ Étape 1 : Créer la table de test (2 min)

1. Ouvrez **Supabase Dashboard** → votre projet
2. Allez dans **SQL Editor**
3. Copiez-collez le contenu de `supabase-sql/create_test_edt_table.sql`
4. Cliquez sur **Run** (Exécuter)
5. ✅ La table `test_edt` est créée

---

## ⚡ Étape 2 : Configurer GitHub Actions (2 min)

### **Ajouter le secret VERCEL_DOMAIN**

1. Allez sur **GitHub** → votre repository
2. Cliquez sur **Settings**
3. Menu gauche : **Secrets and variables** → **Actions**
4. Cliquez sur **New repository secret**
5. Configurez :
   - **Name :** `VERCEL_DOMAIN`
   - **Value :** `votre-domaine.vercel.app` (sans `https://`)
   
   **Exemple :**
   ```
   cnam-edt.vercel.app
   ```

6. Cliquez sur **Add secret**

---

## ⚡ Étape 3 : Tester en local (1 min)

```bash
# Démarrer le serveur local
npm run dev

# Dans un autre terminal, tester l'API
npm run test:automation
```

**Résultat attendu :**
```
✅ Mise à jour table test_edt: 200 (XXXms)
✅ Fetch ICS et mise à jour EDT: 200 (XXXXms)
📊 Résultat: 2/2 tests réussis
```

---

## ⚡ Étape 4 : Déployer et vérifier

```bash
git add .
git commit -m "Setup automation with GitHub Actions"
git push
```

### **Vérifier que GitHub Actions fonctionne :**

1. Allez sur **GitHub** → votre repo → **Actions**
2. Vous devriez voir le workflow **"Update EDT Automatique"**
3. Cliquez dessus pour voir les exécutions
4. Lancez-le manuellement une première fois : **Run workflow**

---

## 🎯 C'est tout !

Votre système est maintenant automatisé. GitHub Actions va :
- ✅ Appeler `/api/fetch-ics` toutes les heures
- ✅ Appeler `/api/test-update` toutes les heures
- ✅ Mettre à jour l'EDT automatiquement

---

## 🔍 Vérification

### Dans Supabase (après 1 heure)
```sql
SELECT * FROM test_edt;
-- Le champ last_check doit avoir changé
```

### Sur votre site
Visitez : `https://votre-domaine.vercel.app/monitoring`

### Dans GitHub Actions
1. **GitHub** → votre repo → **Actions**
2. Voir l'historique des exécutions
3. Une nouvelle exécution toutes les heures

---

## 🆘 Dépannage rapide

### ❌ "Table test_edt does not exist"
→ Retournez à l'étape 1 et exécutez le script SQL

### ❌ GitHub Actions échoue avec "Could not resolve host"
→ Vérifiez le secret `VERCEL_DOMAIN` (sans `https://`)

### ❌ Le timestamp ne change pas
→ Attendez 1 heure complète (les crons s'exécutent à l'heure pile : 14:00, 15:00, etc.)

---

## ℹ️ Pourquoi GitHub Actions et pas Vercel Cron ?

**Vercel Cron sur le plan gratuit :**
- ❌ Maximum 2 cron jobs
- ❌ Limité à 1 exécution par jour

**GitHub Actions :**
- ✅ Gratuit (2000 minutes/mois)
- ✅ Exécutions illimitées (toutes les heures)
- ✅ Logs détaillés
- ✅ Parfait pour ce projet

---

## ✅ Checklist

- [ ] Table `test_edt` créée dans Supabase
- [ ] Secret `VERCEL_DOMAIN` configuré dans GitHub
- [ ] Test local réussi (`npm run test:automation`)
- [ ] Code déployé (`git push`)
- [ ] GitHub Actions visible dans l'onglet Actions
- [ ] Workflow lancé manuellement avec succès
- [ ] Attendre 1 heure et vérifier que `last_check` a changé

---

**Tout est prêt ! 🎉**

Pour plus de détails, consultez :
- **[INDEX_AUTOMATION.md](INDEX_AUTOMATION.md)** - Documentation complète
- **[TROUBLESHOOTING_AUTOMATION.md](TROUBLESHOOTING_AUTOMATION.md)** - Dépannage détaillé
