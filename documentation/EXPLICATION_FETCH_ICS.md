# 📚 Système de suivi des changements d'emploi du temps

## 🎯 Vue d'ensemble

Le système utilise **2 tables Supabase** pour optimiser les performances et tracker l'historique des changements de l'emploi du temps :

1. **`ics_history`** : Historique global des changements (liste des matières)
2. **`edt_events_versions`** : Historique détaillé de chaque cours individuel avec versioning

**Principe** : Ne mettre à jour la base de données **que lorsqu'il y a de vrais changements** !

---

## 📊 Les 2 tables Supabase

### 1️⃣ Table `ics_history` - Vue d'ensemble globale

**Rôle** : Stocke un "instantané" global de l'emploi du temps à chaque fois que la liste des matières change.

**Structure** :
```sql
CREATE TABLE ics_history (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    ics_hash TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    subjects TEXT[] NOT NULL,
    added TEXT[] NOT NULL,
    removed TEXT[] NOT NULL,
    total INTEGER NOT NULL,
    ics_url TEXT
);
```

**Colonnes** :
- `ics_hash` : Hash SHA256 du fichier ICS complet (détecte si le fichier a changé)
- `fingerprint` : Signature unique de la liste des matières (ex: "Math|#|Info|#|Éco")
- `subjects` : Tableau des matières actuelles
- `added` : Nouvelles matières ajoutées depuis le dernier snapshot
- `removed` : Matières supprimées depuis le dernier snapshot
- `timestamp` : Date/heure du snapshot (format ISO 8601)

**Exemple** :
```json
{
  "id": "1731000000000",
  "timestamp": "2024-11-07T14:23:45.678Z",
  "ics_hash": "abc123def456...",
  "fingerprint": "Communication|#|Mathématiques|#|Programmation",
  "subjects": ["Communication", "Mathématiques", "Programmation"],
  "added": ["Programmation"],
  "removed": [],
  "total": 3
}
```

**Utilité** :
- ✅ Détection rapide : 1 requête pour savoir si le fichier ICS a changé
- ✅ Vue d'ensemble : Quelles matières ont été ajoutées/supprimées
- ✅ Performance : Éviter de parser le fichier si rien n'a changé

---

### 2️⃣ Table `edt_events_versions` - Historique détaillé par cours

**Rôle** : Stocke **chaque version** de **chaque cours** quand son contenu change (salle, date, titre, etc.).

**Structure** :
```sql
CREATE TABLE edt_events_versions (
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

**Colonnes** :
- `uid` : Identifiant unique du cours (généré depuis le fichier ICS)
- `version_no` : Numéro de version (1 = première fois vu, 2+ = modifications)
- `content_hash` : Hash SHA256 du contenu du cours (pour détecter les changements)
- `summary` : Titre du cours
- `start` : Date/heure de début
- `end_time` : Date/heure de fin
- `location` : Salle
- `description` : Description du cours
- `changed_at` : Date/heure de la modification (format ISO 8601)

**Exemple - Historique d'un cours qui change de salle** :
```json
// Version 1 (première fois vu)
{
  "uid": "abc123xyz",
  "version_no": 1,
  "content_hash": "hash1...",
  "summary": "USSI05 : Communication",
  "start": "2024-11-08T09:00:00.000Z",
  "end_time": "2024-11-08T12:00:00.000Z",
  "location": "Salle A101",
  "changed_at": "2024-11-01T08:00:00.000Z"
}

// Version 2 (la salle a changé)
{
  "uid": "abc123xyz",
  "version_no": 2,
  "content_hash": "hash2...",
  "summary": "USSI05 : Communication",
  "start": "2024-11-08T09:00:00.000Z",
  "end_time": "2024-11-08T12:00:00.000Z",
  "location": "Salle B205",  // ← Changé !
  "changed_at": "2024-11-05T14:23:45.678Z"
}
```

**Utilité** :
- ✅ Précision : Savoir exactement quel cours a changé et quand
- ✅ Historique complet : Voir toutes les modifications d'un cours
- ✅ Récupération rapide : Charger tous les cours actuels sans parser le fichier ICS

---

## 🔄 Flux complet : Que se passe-t-il quand vous chargez la page ?

### Étape 1 : Chargement de la page

```
Vous ouvrez http://localhost:3000
        ↓
    page.js appelle fetchEvents()
        ↓
    fetchICSEvents() appelle /api/fetch-ics
```

### Étape 2 : Téléchargement et vérification du hash

```javascript
// 1. Télécharger le fichier ICS
const response = await fetch(ICS_URL);
const text = await response.text();

// 2. Calculer le hash du fichier
const ics_hash = createHash('sha256').update(text).digest('hex');

// 3. Récupérer le dernier hash de la DB
const { data } = await supabase
    .from('ics_history')
    .select('ics_hash')
    .order('timestamp', { ascending: false })
    .limit(1);

// 4. Comparer les hashs
const lastHash = data[0]?.ics_hash;
```

### Étape 3 : Deux cas possibles

```
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

---

### 🟢 CAS 1 : Hash identique (rien n'a changé)

**Le fichier ICS n'a pas changé → pas besoin de parser !**

```javascript
// Récupérer les événements depuis la DB
const cachedEvents = await fetchEventsFromDB(supabase);

// Retourner immédiatement
return {
    events: cachedEvents,
    diff: {
        added: [],
        updated: [],
        removed: []
    },
    meta: {
        source: 'cache',
        fromCache: true,
        changed: 0
    }
};
```

**Logs** :
```
[API fetch-ics] ICS hash unchanged, returning cached events from DB
[ICS Service] Events fetched: 265 changes: 0
```

**Résultat** : ⚡ Ultra rapide, aucune modification en base !

---

### 🟡 CAS 2 : Hash différent (fichier a changé)

**Le fichier ICS a changé → il faut parser et comparer !**

#### Étape 2.1 : Parser le fichier ICS

```javascript
// Parser le fichier avec node-ical
const parsed = ical.sync.parseICS(text);

// Extraire les événements
const events = [];
for (const value of Object.values(parsed)) {
    if (value.type === 'VEVENT') {
        events.push(buildEventPayload(value));
    }
}
```

#### Étape 2.2 : Mettre à jour `ics_history` (si les matières changent)

```javascript
// Extraire les matières
const subjects = [...new Set(
    events.map(e => e.summary.replace(/^(USS|UAS)[A-Z0-9]*\s*:\s*/i, '').trim())
)].sort();

// Calculer le fingerprint
const fingerprint = subjects.join('|#|');

// Comparer avec le dernier snapshot
const { data: lastRows } = await supabase
    .from('ics_history')
    .select('fingerprint, subjects')
    .order('timestamp', { ascending: false })
    .limit(1);

const last = lastRows[0];

// Si le fingerprint a changé, insérer un nouveau snapshot
if (!last || last.fingerprint !== fingerprint) {
    // Calculer added et removed
    const added = subjects.filter(s => !last.subjects.includes(s));
    const removed = last.subjects.filter(s => !subjects.includes(s));
    
    await supabase.from('ics_history').insert({
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
        ics_hash,
        fingerprint,
        subjects,
        added,
        removed,
        total: subjects.length
    });
}
```

#### Étape 2.3 : Mettre à jour `edt_events_versions` (pour chaque cours modifié)

**⚠️ C'EST ICI QUE LA MAGIE OPÈRE !**

```javascript
// Charger toutes les dernières versions depuis la DB
const latestEventMap = await loadLatestEventMap(supabase);
// Map<uid, {event, content_hash, version_no}>

const inserts = [];
const nowISO = new Date().toISOString();

for (const event of events) {
    // Calculer le hash du contenu du cours
    const contentHash = computeEventContentHash(event);
    
    // Récupérer la dernière version connue
    const latest = latestEventMap.get(event.uid);
    
    if (!latest) {
        // ✅ NOUVEAU COURS - Ajouter version 1
        inserts.push({
            uid: event.uid,
            version_no: 1,
            changed_at: nowISO,
            summary: event.summary,
            start: event.start,
            end_time: event.end,
            location: event.location,
            description: event.description,
            content_hash: contentHash
        });
    } else if (latest.content_hash !== contentHash) {
        // ✅ COURS MODIFIÉ - Ajouter version N+1
        inserts.push({
            uid: event.uid,
            version_no: latest.version_no + 1,
            changed_at: nowISO,
            summary: event.summary,
            start: event.start,
            end_time: event.end,
            location: event.location,
            description: event.description,
            content_hash: contentHash
        });
    } else {
        // ✅ COURS INCHANGÉ - Ne rien faire !
    }
}

// Insérer les nouvelles versions en batch
if (inserts.length > 0) {
    await supabase.from('edt_events_versions').insert(inserts);
}
```

**Logs** :
```
[API fetch-ics] Computing diffs: comparing 265 fetched events vs 265 DB events
[API fetch-ics] UPDATED event: abc123 - Mathématiques | old hash: 12345678 | new hash: 87654321
[API fetch-ics] Diff computed: 0 added, 1 updated, 0 removed
[API fetch-ics] Will insert 1 new version(s) in DB
[ICS Service] Events fetched: 265 changes: 1
```

**Résultat** : ✅ Seul le cours modifié a créé une nouvelle version !

---

## 🔐 Calcul du hash de contenu (la clé du système)

### Le problème résolu : Format des dates

**Avant (BUG)** :
```javascript
// Les dates au format ISO pouvaient varier
event.start = "2024-11-07T10:00:00.000Z"  // Avec millisecondes
event.start = "2024-11-07T10:00:00Z"      // Sans millisecondes
// → Hashs différents → TOUT était détecté comme modifié !
```

**Maintenant (CORRIGÉ)** :
```javascript
function computeEventContentHash(event) {
    // Normaliser les dates en timestamps (millisecondes)
    const normalizeDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.getTime().toString(); // Exemple: "1699358400000"
    };
    
    const normalized = [
        event.uid || '',
        (event.summary || '').toLowerCase(),
        normalizeDate(event.start),  // ✅ Toujours le même format
        normalizeDate(event.end),    // ✅ Toujours le même format
        (event.location || '').toLowerCase(),
        normalizeDescriptionForHash(event.description || '')
    ].join('\u241F');
    
    return createHash('sha256').update(normalized).digest('hex');
}
```

**Résultat** : Les hashs sont maintenant **stables** et ne changent que si le contenu change vraiment ! 🎯

---

## 🔧 Notification de debug en mode développement

Quand `useDevMode()` est actif, une notification s'affiche après chaque synchronisation :

```
🔧 📊 Events: 265 | Changes: 0 (0 added, 0 updated, 0 removed)
```

**Emplacement** : En haut à droite, disparaît après 5 secondes

**Interprétation** :
- `Events: 265` = Nombre total d'événements chargés
- `Changes: 0` = Aucun changement détecté
- `0 added` = Aucun nouveau cours
- `0 updated` = Aucun cours modifié
- `0 removed` = Aucun cours supprimé

**Composant** : `src/components/DevNotification.js`

---

## 📈 Exemples concrets

### Scénario 1 : Premier chargement (base vide)

```
1. Télécharge le fichier ICS
2. Hash = "abc123" (aucun hash en DB)
3. Parse le fichier → 265 événements
4. Tous les événements sont nouveaux !
5. Insère 265 lignes dans edt_events_versions (version_no = 1)
6. Insère 1 ligne dans ics_history
```

**Logs** :
```
[API fetch-ics] No existing events in DB (first sync)
[API fetch-ics] NEW event: xyz123 - Mathématiques
[API fetch-ics] NEW event: abc456 - Communication
...
[API fetch-ics] Diff computed: 265 added, 0 updated, 0 removed
[ICS Service] Events fetched: 265 changes: 265
```

**Notification dev** :
```
🔧 📊 Events: 265 | Changes: 265 (265 added, 0 updated, 0 removed)
```

---

### Scénario 2 : Rechargement sans changement

```
1. Télécharge le fichier ICS
2. Hash = "abc123" (identique !)
3. Récupère les événements depuis edt_events_versions
4. ✅ Retourne immédiatement, aucune insertion !
```

**Logs** :
```
[API fetch-ics] ICS hash unchanged, returning cached events from DB
[ICS Service] Events fetched: 265 changes: 0
```

**Notification dev** :
```
🔧 📊 Events: 265 | Changes: 0 (0 added, 0 updated, 0 removed)
```

---

### Scénario 3 : Un cours change de salle

```
1. Télécharge le fichier ICS
2. Hash = "xyz789" (différent !)
3. Parse le fichier → 265 événements
4. Compare les hashs :
   - 264 événements inchangés → Ne rien faire
   - 1 événement modifié → Insérer version 2
5. Insère 1 ligne dans edt_events_versions (version_no = 2)
```

**Logs** :
```
[API fetch-ics] Loaded 265 unique events (latest versions) from 265 total rows
[API fetch-ics] UPDATED event: xyz123 - Mathématiques | old hash: 12345678 | new hash: 87654321
[API fetch-ics] Diff computed: 0 added, 1 updated, 0 removed
[API fetch-ics] Will insert 1 new version(s) in DB
[ICS Service] Events fetched: 265 changes: 1
```

**Notification dev** :
```
🔧 📊 Events: 265 | Changes: 1 (0 added, 1 updated, 0 removed)
```

---

## 🎯 Avantages du système

| Avantage | Description |
|----------|-------------|
| **⚡ Performance** | Si rien n'a changé, récupération en 1 requête (pas de parsing) |
| **🎯 Précision** | Détection exacte de ce qui a changé (salle, date, titre, etc.) |
| **📜 Historique** | Historique complet de chaque cours (toutes les versions) |
| **💾 Efficacité** | Seuls les changements sont enregistrés (pas de duplication) |
| **🔍 Debug** | Notification visuelle du nombre de changements en mode dev |

---

## 🔍 Vérification que tout fonctionne

### ✅ Comportement attendu

| Situation | Logs attendus | Changements |
|-----------|---------------|-------------|
| **Premier chargement** | `265 added, 0 updated, 0 removed` | 265 |
| **Rechargement (aucun changement)** | `ICS hash unchanged, returning cached events` | 0 |
| **1 cours modifié** | `UPDATED event: ... \| old hash: ... \| new hash: ...` | 1 |
| **Nouveau cours ajouté** | `NEW event: ...` | 1 |

### ❌ Problème : Tout est mis à jour à chaque fois

Si vous voyez :
```
[ICS Service] Events fetched: 265 changes: 265
```

À chaque rechargement, c'est qu'il y a un problème !

**Solution** : Vider la table `edt_events_versions` pour réinitialiser avec le nouveau système de hash :

```bash
# Via l'API
curl "http://localhost:3000/api/reset-events-versions?confirm=true"

# Ou via Supabase Dashboard
DELETE FROM edt_events_versions;
```

Puis rechargez l'application 2 fois. La deuxième fois devrait afficher `changes: 0` ✅

---

## 🛠️ Outils de debug

### Route API de reset

**Fichier** : `src/app/api/reset-events-versions/route.js`

**Usage** :
```
GET /api/reset-events-versions?confirm=true
```

**Effet** : Vide la table `edt_events_versions` (pour repartir de zéro)

⚠️ **Attention** : Cela supprime tout l'historique des changements !

### Mode développement

Activer le mode dev pour voir la notification :

1. **Via cookie** : `document.cookie = 'isDevMode=true'`
2. **Via variable d'environnement** : `NEXT_PUBLIC_ENV=DEV` dans `.env.local`

---

## 💡 Résumé en 3 points

1. **`ics_history`** détecte rapidement si le fichier ICS a changé (comparaison de hash)
2. **`edt_events_versions`** stocke chaque version de chaque cours (versioning intelligent)
3. **Optimisation** : Hash identique → cache, hash différent → parse et compare cours par cours

**Le système ne met à jour que ce qui a vraiment changé !** 🎯

---

## 📞 Support

Si vous voyez encore des mises à jour massives après avoir suivi les étapes :

1. Vérifiez les logs du serveur (backend)
2. Vérifiez la console du navigateur (frontend)
3. Vérifiez que la table `edt_events_versions` a été vidée
4. Vérifiez que vous avez bien rechargé l'application 2 fois

Le système devrait maintenant fonctionner parfaitement ! 🚀
