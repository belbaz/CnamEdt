# GitHub Actions Configuration

## 🔧 Configuration requise

Pour que le workflow `update-edt.yml` fonctionne, vous devez ajouter un secret GitHub :

### Ajouter le secret VERCEL_DOMAIN

1. Allez dans votre repo GitHub
2. Cliquez sur **Settings** (Paramètres)
3. Dans le menu de gauche : **Secrets and variables** > **Actions**
4. Cliquez sur **New repository secret**
5. Ajoutez :
   - **Name:** `VERCEL_DOMAIN`
   - **Value:** `votre-domaine.vercel.app` (sans https://)
   - Exemple : `cnam-edt.vercel.app`

## 🚀 Utilisation

### Exécution automatique
Le workflow s'exécute automatiquement **toutes les heures** (à la minute 0).

### Exécution manuelle
1. Allez dans l'onglet **Actions** de votre repo
2. Sélectionnez **Update EDT Automatique**
3. Cliquez sur **Run workflow**
4. Choisissez la branche (main/master)
5. Cliquez sur **Run workflow**

## 📊 Vérification

Après chaque exécution :
- Consultez les logs dans l'onglet **Actions**
- Vérifiez la table `test_edt` dans Supabase
- Le champ `last_check` doit être mis à jour

## ⚠️ Note

GitHub Actions peut être désactivé après 60 jours d'inactivité du repo.
Pour éviter cela, faites un commit de temps en temps, ou utilisez Vercel Cron Jobs comme solution principale.

