# 📚 Explication du système fetch-ics et des tables Supabase

## 🎯 Vue d'ensemble

Votre système utilise **2 tables Supabase** pour optimiser les performances et tracker l'historique :

1. **`ics_history`** : Historique global des changements (liste des matières)
2. **`events_versions`** : Historique détaillé de chaque cours individuel

---

## 📊 Les 2 tables Supabase

### 1️⃣ Table `ics_history` - Vue d'ensemble globale

**Rôle** : Stocke un "instantané" global de l'emploi du temps à chaque fois qu'il change.

**Contenu** :
- `ics_hash` : Hash SHA256 du fichier ICS complet (pour détecter si le fichier a changé)
- `fingerprint` : Liste des matières (ex: "Math|Info|Éco")
- `subjects` : Tableau des matières
- `added` : Nouvelles matières ajoutées
- `removed` : Matières supprimées
- `timestamp` : Date/heure du snapshot

**Exemple de ligne** :
```json
{
  "ics_hash": "abc123...",
  "fingerprint": "Math|Info|Éco",
  "subjects": ["Math", "Info", "Éco"],
  "added": ["Éco"],
  "removed": [],
  "timestamp": "2026-04-03T10:00:00Z"
}
```

**Utilité** :
- ✅ Détecter rapidement si le fichier ICS a changé (comparaison de hash)
- ✅ Voir l'historique des matières ajoutées/supprimées
- ✅ Éviter de parser le fichier si rien n'a changé

---

### 2️⃣ Table `events_versions` - Historique détaillé par cours

**Rôle** : Stocke chaque version de chaque cours individuel quand il change.

**Contenu** :
- `uid` : Identifiant unique du cours (depuis le fichier ICS)
- `version_no` : Numéro de version (1 = première fois vu, 2+ = changements)
- `content_hash` : Hash du contenu du cours (summary, date, salle, etc.)
- `summary` : Titre du cours
- `start` : Date/heure de début
- `end_time` : Date/heure de fin
- `location` : Salle
- `description` : Description
- `changed_at` : Date/heure du changement

**Exemple de lignes** :
```json
// Version 1 (première fois vu)
{
  "uid": "event-123",
  "version_no": 1,
  "content_hash": "hash1",
  "summary": "USSI05 : Communication",
  "location": "Salle A101",
  "changed_at": "2026-04-01T08:00:00Z"
}

// Version 2 (la salle a changé)
{
  "uid": "event-123",
  "version_no": 2,
  "content_hash": "hash2",
  "summary": "USSI05 : Communication",
  "location": "Salle B205",  // ← Changé !
  "changed_at": "2026-04-03T10:00:00Z"
}
```

**Utilité** :
- ✅ Savoir exactement quel cours a changé et quand
- ✅ Voir l'historique complet d'un cours (ex: "Ce cours a changé de salle 3 fois")
- ✅ Récupérer rapidement tous les cours actuels (dernière version de chaque UID)

---

## 🔄 Flux complet : Que se passe-t-il quand vous chargez la page ?

### Étape 1 : La page se charge
```
Vous ouvrez http://localhost:3000
↓
La page appelle fetchEvents() dans page.js
↓
fetchEvents() appelle /api/fetch-ics
```

### Étape 2 : fetch-ics commence (ligne 95-126)
```
1. Télécharge le fichier ICS depuis l'URL
   ↓
2. Calcule le hash SHA256 du fichier téléchargé
   (ex: "abc123def456...")
```

### Étape 3 : Vérification du hash (ligne 128-158)
```
3. Va chercher le dernier hash dans ics_history
   SELECT ics_hash FROM ics_history ORDER BY timestamp DESC LIMIT 1
   
4. Compare les deux hashs :
   
   ┌─────────────────────────────────────┐
   │ Hash identique ?                     │
   └─────────────────────────────────────┘
           │                    │
          OUI                  NON
           │                    │
           ↓                    ↓
   ┌──────────────┐    ┌──────────────────┐
   │ CAS 1        │    │ CAS 2            │
   │ Rien changé  │    │ Fichier changé   │
   └──────────────┘    └──────────────────┘
```

### CAS 1 : Hash identique (rien n'a changé) ✅

```
5a. Appelle fetchEventsFromDB()
    ↓
5b. Récupère tous les UIDs uniques depuis events_versions
    ↓
5c. Pour chaque UID, récupère la dernière version (version_no max)
    ↓
5d. Retourne les événements depuis la BD
    ↓
6. ✅ FIN - Pas de parsing, pas de mise à jour !
```

**Résultat** : Ultra rapide, pas de traitement inutile !

---

### CAS 2 : Hash différent (fichier a changé) 🔄

```
5a. Parse le fichier ICS avec ical.sync.parseICS()
    ↓
5b. Extrait tous les événements (cours)
    ↓
6. Met à jour ics_history (si fingerprint différent)
   ┌─────────────────────────────────────┐
   │ Compare la liste des matières       │
   │ (fingerprint) avec la dernière      │
   └─────────────────────────────────────┘
           │                    │
      Identique ?            Différent ?
           │                    │
          OUI                  NON
           │                    │
           ↓                    ↓
   ┌──────────────┐    ┌──────────────────┐
   │ Ne fait      │    │ Insère nouvelle  │
   │ rien         │    │ ligne dans       │
   │              │    │ ics_history      │
   └──────────────┘    └──────────────────┘
```

```
7. Met à jour events_versions (pour chaque cours)
   ┌─────────────────────────────────────┐
   │ Pour chaque cours dans le fichier : │
   │                                     │
   │ 1. Calcule content_hash du cours   │
   │ 2. Cherche la dernière version      │
   │    dans events_versions             │
   │ 3. Compare les hashs                │
   └─────────────────────────────────────┘
           │                    │
      Identique ?            Différent ?
           │                    │
          OUI                  NON
           │                    │
           ↓                    ↓
   ┌──────────────┐    ┌──────────────────┐
   │ Ne fait      │    │ Insère nouvelle  │
   │ rien         │    │ version          │
   │              │    │ (version_no++)   │
   └──────────────┘    └──────────────────┘
```

```
8. Retourne les événements parsés
```

**Résultat** : Seuls les cours qui ont changé sont mis à jour !

---

## 🎯 Pourquoi 2 tables au lieu d'une ?

### ❌ Avec une seule table (mauvaise idée)

Si on mettait tout dans `ics_history` :
- On devrait parser le fichier à chaque fois
- On ne saurait pas quel cours précis a changé
- On ne pourrait pas voir l'historique d'un cours spécifique

### ✅ Avec 2 tables (solution optimale)

**`ics_history`** = Détection rapide
- Hash du fichier complet → Détecte si quelque chose a changé en 1 requête
- Fingerprint des matières → Vue d'ensemble des changements globaux

**`events_versions`** = Détails précis
- Chaque cours individuel → Savoir exactement ce qui a changé
- Historique complet → Voir toutes les modifications d'un cours
- Récupération rapide → Récupérer tous les cours actuels sans parser

---

## 📈 Exemple concret

### Scénario : Le prof change la salle d'un cours

**Jour 1** :
```
Fichier ICS téléchargé
↓
ics_history : Hash = "abc123", Fingerprint = "Math|Info"
events_versions : 
  - event-123, version 1, salle = "A101"
```

**Jour 2** (vous rechargez la page) :
```
1. Télécharge le fichier ICS
2. Hash = "abc123" (identique !)
3. ✅ Retourne depuis events_versions (rapide !)
```

**Jour 3** (le prof change la salle) :
```
1. Télécharge le fichier ICS
2. Hash = "xyz789" (différent !)
3. Parse le fichier
4. Compare chaque cours :
   - event-123 : content_hash différent !
5. Insère dans events_versions :
   - event-123, version 2, salle = "B205" ← Nouvelle version !
6. Insère dans ics_history :
   - Hash = "xyz789", Fingerprint = "Math|Info" (identique, donc pas d'insert)
```

**Résultat** :
- ✅ Vous savez que le cours a changé de salle
- ✅ Vous savez quand (changed_at)
- ✅ Vous pouvez voir toutes les versions (A101 → B205)

---

## 🚀 Avantages du système

1. **Performance** : Si rien n'a changé, pas de parsing (ultra rapide)
2. **Précision** : Vous savez exactement quel cours a changé
3. **Historique** : Vous pouvez voir l'historique complet de chaque cours
4. **Efficacité** : Seuls les changements sont enregistrés

---

## 🔍 Comment vérifier que ça marche ?

### Dans les logs du serveur :

**Si rien n'a changé** :
```
[API fetch-ics] ICS downloaded, length: 12345
[API fetch-ics] ICS hash unchanged, returning cached events from DB
```

**Si quelque chose a changé** :
```
[API fetch-ics] ICS downloaded, length: 12345
[API fetch-ics] Events parsed: 150
[API fetch-ics] 3 event version(s) recorded
[API fetch-ics] History snapshot inserted
```

### Dans Supabase :

**Table `ics_history`** :
- Une ligne par changement global (ajout/suppression de matière)

**Table `events_versions`** :
- Version 1 = première fois vu
- Version 2+ = changements (salle, date, titre, etc.)

---

## 💡 Résumé en 3 points

1. **`ics_history`** = Détecte rapidement si le fichier a changé (hash)
2. **`events_versions`** = Stocke chaque version de chaque cours
3. **Optimisation** = Si hash identique → retour depuis BD, sinon → parse et met à jour

C'est comme un système de cache intelligent qui ne se met à jour que quand c'est nécessaire ! 🎯

