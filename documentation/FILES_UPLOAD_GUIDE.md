# 📄 Guide d'Upload de Fichiers - EDT EICNAM

## 🎯 Vue d'ensemble

Le système d'upload de fichiers permet aux utilisateurs d'ajouter des fichiers (images, PDF, documents) aux cours. Les fichiers sont stockés sur **Vercel Blob Storage** (gratuit jusqu'à 1 GB) plutôt que sur Supabase (limité à 50 MB).

---

## 🏗️ Architecture

### Stockage des fichiers

- **Fichiers** : Stockés sur Vercel Blob Storage (gratuit jusqu'à 1 GB)
- **Métadonnées** : Stockées dans Supabase (`edt_course_files` table)
- **Limite par fichier** : 
  - **PDF** : 30 MB
  - **Autres fichiers** : 10 MB (images, documents, tableurs, texte)
- **Types autorisés** : Images (JPEG, PNG, GIF, WebP), PDF, Documents (DOC, DOCX), Tableurs (XLS, XLSX), Texte (TXT, CSV)

### Tables Supabase

#### Table `edt_course_files`

```sql
CREATE TABLE edt_course_files (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_uid TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    blob_url TEXT NOT NULL,
    blob_path TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Colonnes** :
- `user_id` : ID de l'utilisateur propriétaire
- `course_uid` : UID unique du cours
- `file_name` : Nom original du fichier
- `file_size` : Taille en octets
- `file_type` : Type MIME (ex: `image/png`, `application/pdf`)
- `blob_url` : URL publique du fichier sur Vercel Blob
- `blob_path` : Chemin du fichier sur Vercel Blob

---

## ⚙️ Configuration

### 1. Créer la table Supabase

Exécutez le script SQL dans Supabase :

```bash
supabase-sql/create_course_files_table.sql
```

Ou via le dashboard Supabase : SQL Editor → Coller le contenu du fichier → Run

### 2. Configurer Vercel Blob Storage

#### Étape 1 : Créer un projet Blob sur Vercel

1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Storage** → **Create Database** → **Blob**

#### Étape 2 : Récupérer le token

1. Dans votre projet Vercel, allez dans **Settings** → **Environment Variables**
2. Créez une variable `BLOB_READ_WRITE_TOKEN`
3. Le token sera automatiquement disponible dans votre projet

**Note** : Le token est automatiquement injecté par Vercel dans les API Routes. Pas besoin de l'ajouter manuellement dans `.env.local` pour la production.

#### Étape 3 : Configuration locale (optionnel)

Pour tester en local, ajoutez dans `.env.local` :

```env
BLOB_READ_WRITE_TOKEN=votre-token-vercel-blob
```

**Important** : Ne commitez JAMAIS ce token dans Git !

---

## 📡 API Routes

### POST `/api/files/upload`

Upload un fichier vers Vercel Blob Storage.

**Body (FormData)** :
- `file` : File (fichier à uploader)
- `course_uid` : string (UID du cours)

**Réponse** :
```json
{
  "success": true,
  "file": {
    "id": 1,
    "file_name": "document.pdf",
    "file_size": 1024000,
    "file_type": "application/pdf",
    "blob_url": "https://...",
    "uploaded_at": "2024-01-01T12:00:00Z"
  }
}
```

**Erreurs** :
- `400` : Fichier manquant, taille trop grande, type non autorisé
- `401` : Non authentifié
- `500` : Erreur serveur

### GET `/api/files/list?course_uid=xxx`

Récupère la liste des fichiers pour un cours.

**Query params** :
- `course_uid` : string (requis)

**Réponse** :
```json
{
  "success": true,
  "files": [
    {
      "id": 1,
      "file_name": "document.pdf",
      "file_size": 1024000,
      "file_type": "application/pdf",
      "blob_url": "https://...",
      "uploaded_at": "2024-01-01T12:00:00Z",
      "user_id": "user-123"
    }
  ],
  "count": 1
}
```

### DELETE `/api/files/delete?id=xxx`

Supprime un fichier (uniquement si l'utilisateur est le propriétaire).

**Query params** :
- `id` : number (ID du fichier)

**Réponse** :
```json
{
  "success": true,
  "message": "Fichier supprimé avec succès"
}
```

**Erreurs** :
- `400` : ID manquant
- `401` : Non authentifié
- `404` : Fichier introuvable ou permissions insuffisantes
- `500` : Erreur serveur

---

## 🎨 Composant React

### `CourseFiles`

Composant pour afficher et gérer les fichiers d'un cours.

**Props** :
- `courseUid` : string (requis) - UID du cours
- `authenticated` : boolean (requis) - Si l'utilisateur est connecté

**Utilisation** :

```jsx
import CourseFiles from "@/components/CourseFiles/CourseFiles";

<CourseFiles 
  courseUid={selectedEvent.uid} 
  authenticated={notesAuthenticated}
/>
```

**Fonctionnalités** :
- ✅ Affichage de la liste des fichiers
- ✅ Upload de fichiers (si authentifié)
- ✅ Suppression de fichiers (si propriétaire)
- ✅ Téléchargement des fichiers
- ✅ Affichage de la taille et du type
- ✅ Gestion des erreurs

---

## 🔒 Sécurité

### Authentification

- Tous les endpoints nécessitent une authentification (sauf `GET /api/files/list` qui peut être public)
- Seul le propriétaire peut supprimer ses fichiers

### Validation

- **Taille maximale** : 
  - PDF : 30 MB
  - Autres fichiers : 10 MB
- **Types autorisés** : Liste blanche stricte
- **Nom de fichier** : Sanitisé pour éviter les injections

### Stockage

- Les fichiers sont stockés sur Vercel Blob Storage (sécurisé)
- Les URLs sont publiques mais les chemins sont uniques et non devinables
- Les métadonnées sont stockées en base de données Supabase

---

## 📊 Limites et quotas

### Vercel Blob Storage (Plan Gratuit)

- **Stockage total** : 1 GB
- **Bande passante** : 100 GB/mois
- **Requêtes** : Illimitées

### Limites de l'application

- **Taille max par fichier** : 
  - PDF : 30 MB
  - Autres fichiers : 10 MB
- **Types autorisés** : Images, PDF, Documents Office, Texte

---

## 🐛 Dépannage

### Erreur "BLOB_READ_WRITE_TOKEN manquant"

**Solution** :
1. Vérifiez que le token est configuré dans Vercel Dashboard
2. Pour le développement local, ajoutez-le dans `.env.local`
3. Redémarrez le serveur de développement

### Erreur "Fichier trop volumineux"

**Solution** :
- Réduisez la taille du fichier (compression, optimisation)
- Limites actuelles :
  - PDF : 30 MB
  - Autres fichiers : 10 MB

### Erreur "Type de fichier non autorisé"

**Solution** :
- Vérifiez que le type de fichier est dans la liste autorisée
- Types autorisés : Images (JPEG, PNG, GIF, WebP), PDF, Documents (DOC, DOCX), Tableurs (XLS, XLSX), Texte (TXT, CSV)

### Les fichiers ne s'affichent pas

**Solution** :
1. Vérifiez que la table `edt_course_files` existe dans Supabase
2. Vérifiez les logs de la console pour les erreurs
3. Vérifiez que `course_uid` est correct

---

## 🚀 Déploiement

### Vercel

Le système fonctionne automatiquement sur Vercel une fois le Blob Storage configuré. Aucune configuration supplémentaire n'est nécessaire.

### Variables d'environnement

**Production (Vercel)** :
- `BLOB_READ_WRITE_TOKEN` : Configuré automatiquement par Vercel

**Développement local** :
- Ajoutez `BLOB_READ_WRITE_TOKEN` dans `.env.local`

---

## 📝 Notes importantes

1. **Nettoyage** : Les fichiers supprimés de la base de données restent sur Vercel Blob Storage jusqu'à expiration automatique. Un nettoyage manuel peut être nécessaire.

2. **Backup** : Les fichiers sont stockés uniquement sur Vercel Blob Storage. Assurez-vous d'avoir un backup si nécessaire.

3. **Coûts** : Le plan gratuit Vercel Blob offre 1 GB. Au-delà, des frais peuvent s'appliquer.

4. **Performance** : Les fichiers sont servis via CDN Vercel pour une performance optimale.

---

## 🔗 Ressources

- [Documentation Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- [SDK @vercel/blob](https://www.npmjs.com/package/@vercel/blob)
- [Documentation Supabase](https://supabase.com/docs)

---

**Version** : 1.0  
**Dernière mise à jour** : 8 novembre 2025

