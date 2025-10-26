# 🔧 Configuration du projet

## Variables d'environnement

### Créer le fichier `.env.local`

Copiez le fichier `env.example` en `.env.local` à la racine du projet :

```bash
cp env.example .env.local
```

Puis modifiez les valeurs selon votre configuration.

### Variables Supabase (obligatoires pour l'upload APK)

| Variable | Description | Où la trouver |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase | Dashboard → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE` | Clé de service (pour upload) | Dashboard → Project Settings → API → service_role key |
| `NEXT_PUBLIC_APK_URL` | URL publique de l'APK | Générée automatiquement après le 1er upload |

⚠️ **IMPORTANT** : Ne partagez JAMAIS votre `SUPABASE_SERVICE_ROLE` publiquement !

### Variables ICS (optionnelles)

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `ICS_URL` | URL du fichier ICS (API web) | URL CNAM par défaut |
| `NEXT_PUBLIC_ICS_URL` | URL du fichier ICS (mobile) | URL CNAM par défaut |

## Configuration Supabase

### 1. Créer un compte Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte gratuit
3. Créez un nouveau projet

### 2. Créer le bucket pour l'APK

Le bucket sera créé automatiquement par le script lors du premier upload, mais vous pouvez aussi le créer manuellement :

1. Allez dans **Storage** dans le menu Supabase
2. Cliquez sur **New bucket**
3. Nom : `Apk Edt Eicnam`
4. Cochez **Public bucket** ✅
5. File size limit : `50 MB`
6. Créez le bucket
7. Créez un dossier `apk` dans le bucket

### 3. Récupérer les clés

1. Allez dans **Project Settings** → **API**
2. Copiez **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copiez **service_role key** (secret!) → `SUPABASE_SERVICE_ROLE`

### 4. Tester l'upload

```bash
cd mobile-config
.\build-apk.bat
```

Si la configuration est correcte, l'APK sera automatiquement uploadé sur Supabase après le build.

## Déploiement Vercel

Pour que la popup de téléchargement APK fonctionne sur votre site déployé :

1. Allez dans **Vercel Dashboard** → votre projet
2. **Settings** → **Environment Variables**
3. Ajoutez les variables :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_APK_URL`
   - `ICS_URL` (optionnel)
   - `NEXT_PUBLIC_ICS_URL` (optionnel)

⚠️ **Ne mettez PAS** `SUPABASE_SERVICE_ROLE` dans Vercel (elle n'est nécessaire que pour le script local)

4. Redéployez votre application

## Résolution de problèmes

### Upload échoue : "SUPABASE_SERVICE_ROLE manquante"

→ Vérifiez que `.env.local` existe et contient la clé
→ Vérifiez qu'il n'y a pas d'espace avant/après le `=`

### Upload échoue : "Bucket not found"

→ Le bucket sera créé automatiquement au premier upload
→ Si l'erreur persiste, créez-le manuellement (voir ci-dessus)

### APK ne se télécharge pas depuis le site

→ Vérifiez que le bucket est bien **public**
→ Vérifiez que `NEXT_PUBLIC_APK_URL` est correct
→ Testez l'URL directement dans votre navigateur

### Popup ne s'affiche pas

→ La popup s'affiche uniquement sur Android (navigateur web)
→ Elle ne s'affiche pas dans l'app native
→ Vérifiez que `NEXT_PUBLIC_APK_URL` est définie

## Sécurité

### Fichiers ignorés par Git

Le fichier `.env.local` est automatiquement ignoré par Git (voir `.gitignore`).

**Ne committez JAMAIS** :
- `.env.local`
- `SUPABASE_SERVICE_ROLE`
- Autres clés secrètes

### Clés publiques vs secrètes

| Clé | Type | Où l'utiliser |
|-----|------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Publique | Partout |
| `NEXT_PUBLIC_APK_URL` | Publique | Partout |
| `SUPABASE_SERVICE_ROLE` | **Secrète** | Uniquement en local |

## Support

Pour toute question, consultez :
- `README.md` - Documentation générale
- `mobile-config/GUIDE.md` - Guide de build APK

