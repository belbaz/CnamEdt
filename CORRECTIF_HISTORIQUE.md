# 🔧 Correctif : Problème de mise à jour de l'historique

## 🐛 Problème identifié

L'historique des cours (`events_versions`) était mis à jour à chaque visite de l'application, même quand rien n'avait changé. Cela créait des centaines de versions inutiles.

**Symptômes** :
```
[ICS Service] Events fetched: 265 changes: 753
```
→ 753 changements détectés alors qu'il n'y en a pas !

## 🔍 Causes du problème

1. **Normalisation des dates** : Le hash du contenu des cours utilisait le format ISO des dates, qui peut varier légèrement entre le parsing initial et la récupération depuis la DB (avec/sans millisecondes)
   - `2024-11-07T10:00:00.000Z` ≠ `2024-11-07T10:00:00Z`
   - Les hashs étaient donc différents à chaque fois !

2. **Limite de requête** : La requête pour récupérer les événements existants avait une limite qui pouvait manquer certains événements

## ✅ Corrections apportées

### 1. Normalisation des dates dans le hash

**Fichier** : `src/app/api/fetch-ics/route.js`

**Avant** :
```javascript
function computeEventContentHash(event) {
    const normalized = [
        event.uid || '',
        (event.summary || '').toLowerCase(),
        event.start || '',  // ❌ Format peut varier
        event.end || '',    // ❌ Format peut varier
        (event.location || '').toLowerCase(),
        normalizeDescriptionForHash(event.description || '')
    ].join('\u241F');
    return createHash('sha256').update(normalized).digest('hex');
}
```

**Après** :
```javascript
function computeEventContentHash(event) {
    const normalizeDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            // ✅ Utiliser le timestamp pour éviter les problèmes de format
            return date.getTime().toString();
        } catch {
            return '';
        }
    };
    
    const normalized = [
        event.uid || '',
        (event.summary || '').toLowerCase(),
        normalizeDate(event.start),  // ✅ Timestamp stable
        normalizeDate(event.end),    // ✅ Timestamp stable
        (event.location || '').toLowerCase(),
        normalizeDescriptionForHash(event.description || '')
    ].join('\u241F');
    return createHash('sha256').update(normalized).digest('hex');
}
```

### 2. Amélioration du chargement des événements existants

**Avant** :
- Limite de 10000 lignes sans vérification
- Pas de log pour savoir combien d'événements uniques chargés

**Après** :
- Limite explicite avec warning si atteinte
- Log du nombre d'événements uniques vs total de lignes
- Meilleur filtrage de la dernière version de chaque UID

### 3. Utilisation de `now()` pour `changed_at`

**Vérifié** : Le code utilise bien `new Date().toISOString()` pour la colonne `changed_at` :
```javascript
const nowISO = new Date().toISOString();
// ...
changed_at: nowISO
```

## 🧹 Réinitialisation nécessaire

**Problème** : Les anciens hashs dans la table `events_versions` ont été calculés avec l'ancien algorithme. Ils ne correspondront pas aux nouveaux hashs calculés avec la normalisation des dates.

**Solution** : Vider la table `events_versions` pour recommencer avec le nouveau système.

### Option 1 : Via l'API (recommandé)

```bash
# Vider la table events_versions
curl "http://localhost:3000/api/reset-events-versions?confirm=true"
```

Ou ouvrez dans le navigateur :
```
http://localhost:3000/api/reset-events-versions?confirm=true
```

**Résultat attendu** :
```json
{
  "success": true,
  "message": "Table events_versions vidée avec succès",
  "rows_deleted": 753,
  "next_step": "Rechargez l'application pour re-synchroniser tous les événements"
}
```

### Option 2 : Via Supabase Dashboard

1. Aller sur le Supabase Dashboard
2. Ouvrir l'éditeur SQL
3. Exécuter :
   ```sql
   DELETE FROM events_versions;
   ```

### Option 3 : Via SQL (ligne de commande)

```bash
# Si vous avez psql installé
psql -h <supabase-host> -U postgres -d postgres -c "DELETE FROM events_versions;"
```

## 📊 Vérification après correction

Après avoir vidé la table et rechargé l'application :

### 1. Premier chargement (synchronisation initiale)

Console attendue :
```
[API fetch-ics] No existing events in DB (first sync)
[API fetch-ics] NEW event: <uid> - <summary>
[API fetch-ics] NEW event: <uid> - <summary>
...
[API fetch-ics] Diff computed: 265 added, 0 updated, 0 removed
[API fetch-ics] Will insert 265 new version(s) in DB
[ICS Service] Events fetched: 265 changes: 265
```

✅ **Normal** : Tous les événements sont "added" (première fois)

### 2. Deuxième chargement (aucun changement)

Console attendue :
```
[API fetch-ics] ICS hash unchanged, returning cached events from DB
[ICS Service] Events fetched: 265 changes: 0
```

✅ **Parfait** : Aucun changement détecté, événements retournés depuis le cache !

### 3. Si un cours change vraiment

Console attendue :
```
[API fetch-ics] Loaded 265 unique events (latest versions) from 265 total rows
[API fetch-ics] UPDATED event: <uid> - <summary> | old hash: abcd1234 | new hash: wxyz9876
[API fetch-ics] Diff computed: 0 added, 1 updated, 0 removed
[API fetch-ics] Will insert 1 new version(s) in DB
[ICS Service] Events fetched: 265 changes: 1
```

✅ **Parfait** : Seulement 1 événement mis à jour !

## 🎯 Résultat final

Maintenant, le système devrait :
- ✅ Ne créer de nouvelles versions **UNIQUEMENT** quand un cours change vraiment
- ✅ Utiliser le cache quand le fichier ICS n'a pas changé
- ✅ Utiliser des hashs stables qui ne varient pas avec le format des dates
- ✅ Logger clairement ce qui se passe (added/updated/removed)
- ✅ Stocker `changed_at` avec la date et l'heure complète (ISO 8601)

## ⚠️ Important

⚠️ **Ne PAS supprimer la table `ics_history`** ! Cette table contient l'historique global des matières et n'a pas besoin d'être réinitialisée.

⚠️ **Après la réinitialisation**, l'historique des changements individuels sera perdu, mais le système fonctionnera correctement à partir de maintenant.

## 📝 Notes techniques

### Format de stockage des dates

- **`changed_at`** : Date/heure de la modification (ISO 8601)
  - Exemple : `2024-11-07T14:23:45.678Z`
  
- **`start` et `end_time`** : Dates des cours (ISO 8601)
  - Exemple : `2024-11-08T09:00:00.000Z`

### Calcul du hash

Le hash est calculé avec :
1. UID du cours
2. Titre (lowercase)
3. Date de début (timestamp en millisecondes)
4. Date de fin (timestamp en millisecondes)
5. Lieu (lowercase)
6. Description (normalisée, sans lignes "dernière mise à jour")

Séparateur : `\u241F` (caractère de contrôle Unicode)
Algorithme : SHA-256

### Structure de la table `events_versions`

```sql
CREATE TABLE events_versions (
    uid TEXT NOT NULL,
    version_no INTEGER NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL,
    summary TEXT,
    start TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    location TEXT,
    description TEXT,
    content_hash TEXT NOT NULL,
    PRIMARY KEY (uid, version_no)
);
```

## 🚀 Prochaines étapes

Si le problème persiste après ces corrections :

1. Vérifier les logs du serveur
2. Comparer les hashs entre deux rechargements
3. Vérifier que Supabase retourne bien les données
4. Augmenter le niveau de log (décommenter les logs "UNCHANGED event")

