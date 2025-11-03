# Guide des Scripts de Déploiement EDT EICNAM

## Scripts Disponibles

### 1. **deploy_apk_test.bat** - Créer un APK de Test
```batch
deploy_apk_test.bat [version]
```
- Crée un APK de test avec le canal TEST
- Version optionnelle (ex: `deploy_apk_test.bat 2.0.42`)
- Sans version : incrémentation automatique
- Upload automatique vers Supabase

### 2. **deploy_website_only.bat** - Mettre à jour le Site Web uniquement
```batch
deploy_website_only.bat ["message de commit"]
```
- Met à jour UNIQUEMENT le site web
- Ne touche pas aux APKs
- Message de commit optionnel

### 3. **deploy_prod_complete.bat** - Déploiement Production Complet
```batch
deploy_prod_complete.bat [version]
```
- Crée un APK de production signé
- Met à jour le site web
- Version optionnelle (incrémentation auto sinon)
- Upload APK + push Git automatiques

## Utilisation Typique

### Développement / Test
1. Faire vos modifications
2. Tester localement avec `npm run dev`
3. Créer un APK test : `deploy_apk_test.bat`
4. Tester sur appareil Android

### Mise en Production
1. S'assurer que tout fonctionne en test
2. Lancer : `deploy_prod_complete.bat`
3. L'APK et le site seront déployés automatiquement

### Mise à jour du Site uniquement
- Si vous modifiez uniquement le site (pas l'app mobile)
- Lancer : `deploy_website_only.bat "Fix bug navbar"`

## Canaux de Distribution

### Canal PRODUCTION (par défaut)
- APK : `edt_cnam_vX.Y.Z.apk`
- Utilisateurs : Tous les utilisateurs finaux
- API : `/api/version` retourne la dernière version prod

### Canal TEST
- APK : `edt_cnam_v_test_X.Y.Z.apk`
- Utilisateurs : Développeurs et testeurs
- API : `/api/version` avec APP_CHANNEL=test retourne la version test

## Vérification des Versions

### Version Actuelle en Production
```bash
curl https://edt-eicnam.vercel.app/api/version
```

### Logs de Déploiement
- Vercel : https://vercel.com/dashboard
- Supabase : https://app.supabase.com/project/aeftxgwfokzlspojzisx/storage/buckets/Apk%20Edt%20Eicnam

## Résolution des Problèmes

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

## Variables d'Environnement Requises

Dans `.env.local` :
```env
# Supabase (obligatoire pour upload APK)
NEXT_PUBLIC_SUPABASE_URL=https://aeftxgwfokzlspojzisx.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGci...

# Signature APK (obligatoire pour prod)
KEYSTORE_PASSWORD=VotreMotDePasse
```

## Notes Importantes

- Les scripts gèrent automatiquement les canaux (test/prod)
- La version est synchronisée dans tous les fichiers
- Les APKs sont automatiquement uploadés vers Supabase
- Le site est déployé via Git push → Vercel
- Les utilisateurs Android reçoivent les notifications de mise à jour automatiquement
