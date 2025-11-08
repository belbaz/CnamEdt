# 🚀 Démarrage Rapide - Automatisation EDT

Guide ultra-rapide pour mettre en place l'automatisation en 5 minutes.

---

## ⚡ Étape 1 : Créer la table de test (2 min)

1. Ouvrez **Supabase Dashboard** → votre projet
2. Allez dans **SQL Editor**
3. Copiez-collez le contenu de `supabase-sql/create_test_edt_table.sql`
4. Cliquez sur **Run** (Exécuter)
5. ✅ La table `test_edt` est créée

---

## ⚡ Étape 2 : Tester en local (1 min)

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

## ⚡ Étape 3 : Activer Vercel Cron (1 min)

Le fichier `vercel.json` est déjà créé ✅

**Il suffit de déployer sur Vercel :**

```bash
git add .
git commit -m "Add automatic EDT update system"
git push
```

Vercel détectera automatiquement le fichier `vercel.json` et activera les cron jobs.

**Vérification :**
1. Allez sur **Vercel Dashboard**
2. Ouvrez votre projet
3. Onglet **Cron Jobs**
4. Vous devriez voir 2 jobs actifs :
   - `/api/fetch-ics` - toutes les heures
   - `/api/test-update` - toutes les heures

---

## ⚡ Étape 4 : Vérifier que ça marche (1 min)

### Dans Supabase

```sql
SELECT * FROM test_edt;
```

Le champ `last_check` sera mis à jour toutes les heures (automatiquement).

### Dans Vercel

1. **Vercel Dashboard** → votre projet → **Logs**
2. Recherchez "test-update" ou "fetch-ics"
3. Vous verrez les logs d'exécution automatique

---

## 🎯 C'est tout !

Votre système est maintenant automatisé. Les cours seront vérifiés et mis à jour **toutes les heures**, automatiquement.

---

## 🆘 Dépannage rapide

### ❌ "Table test_edt does not exist"
→ Retournez à l'étape 1 et exécutez le script SQL

### ❌ "Supabase non configuré"
→ Vérifiez votre fichier `.env.local` :
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGc...
```

### ❌ Les cron jobs n'apparaissent pas dans Vercel
→ Vérifiez que `vercel.json` est bien à la racine et déployé

### ❌ Le test local ne fonctionne pas
→ Assurez-vous que `npm run dev` tourne dans un autre terminal

---

## 📚 Documentation complète

Pour plus de détails et d'options avancées, consultez :
- `AUTOMATISATION_GUIDE.md` - Guide complet avec toutes les solutions
- `supabase-sql/create_test_edt_table.sql` - Script SQL commenté
- `src/app/api/test-update/route.js` - Code de l'API de test

---

## ✅ Checklist

- [ ] Table `test_edt` créée dans Supabase
- [ ] Test local réussi (`npm run test:automation`)
- [ ] Code déployé sur Vercel
- [ ] Cron jobs visibles dans Vercel Dashboard
- [ ] Attendre 1 heure et vérifier que `last_check` a changé

---

**Tout est prêt ! 🎉**

