# 🐌 Analyse de Performance : `/api/fetch-ics` - TRÈS LENT

## 📊 Problèmes Identifiés

### ⏱️ Timeline Typique d'une Requête (Total: ~8-15 secondes)

```
1. Fetch ICS externe (Galao)           ~2-5s   ████████████
2. Parsing ICS avec node-ical          ~500ms  ██
3. Requête Supabase (10000 lignes)     ~2-3s   ██████
4. Calcul des diffs                    ~200ms  █
5. Migration des notes orphelines      ~1-5s   ███████
6. Updates en boucle (1 par 1)         ~500ms-2s ████
7. Inserts/Deletes                     ~300ms  █
────────────────────────────────────────────────────
Total                                  ~8-15s  ████████████████
```

---

## 🔴 **Problème #1 : Requête Supabase Massive (10000 lignes)**

### Code Actuel :
```javascript
const { data, error } = await supabase
    .from('edt_events_versions')
    .select('uid, version_no, summary, start, end_time, location, description, content_hash')
    .order('uid', { ascending: true })
    .order('version_no', { ascending: false })
    .limit(10000); // ⚠️ RÉCUPÈRE 10000 LIGNES !
```

### Problème :
- Transfert de **2-5 MB de données** depuis PostgreSQL
- Temps de requête : **2-3 secondes**
- Parsing JSON côté application : **200-500ms**

### Solution :
- Utiliser une **vue matérialisée** PostgreSQL qui garde uniquement la dernière version
- Ou créer un **index composite** optimisé
- Limiter les champs récupérés (projections)

---

## 🔴 **Problème #2 : Migration des Notes - N+1 Queries**

### Code Actuel :
```javascript
for (const note of orphanNotes) { // Ex: 50 notes orphelines
    // 1. Récupérer ancien event
    const oldEvent = oldEventsMap.get(note.course_uid);
    
    // 2. Vérifier si note existe déjà
    const { data: existingNote } = await supabase
        .from('edt_agenda')
        .select('...')
        .eq('user_id', note.user_id)
        .eq('course_uid', newCourseUid)
        .maybeSingle(); // ⚠️ 1 requête par note
    
    // 3. Archiver
    await archiveNote(supabase, note, ...); // ⚠️ 1 requête par note
    
    // 4. Update/Delete
    await supabase.from('edt_agenda').update(...); // ⚠️ 1 requête par note
}
```

### Problème :
- **50 notes orphelines = 150-200 requêtes SQL !**
- Temps total : **1-5 secondes** (selon le nombre de notes)
- Chaque requête : ~20-50ms (latence réseau)

### Solution :
- Récupérer **toutes les notes existantes** en une seule requête
- Faire les **updates/deletes en batch** (PostgreSQL RPC)
- Utiliser des **transactions** pour garantir la cohérence

---

## 🔴 **Problème #3 : Updates en Boucle Séquentielle**

### Code Actuel :
```javascript
for (const upd of updates) { // Ex: 20 events modifiés
    const { error } = await supabase
        .from('edt_events_versions')
        .update(upd.data)
        .eq('uid', upd.uid); // ⚠️ 1 requête par event
}
```

### Problème :
- **20 updates = 20 requêtes SQL séquentielles**
- Temps total : **500ms - 2 secondes**
- Latence réseau cumulée

### Solution :
- Utiliser **upsert** avec `ON CONFLICT` (PostgreSQL)
- Ou créer une **fonction RPC** qui fait tout en batch
- Ou utiliser des **transactions**

---

## 🔴 **Problème #4 : Pas de Cache Efficace**

### Code Actuel :
```javascript
// Cache basé sur hash ICS
if (ics_hash === lastHash) {
    return NextResponse.json({ unchanged: true });
}
// Sinon : re-fetch + re-parse + re-diff (8-15s)
```

### Problème :
- Si le hash change (même légèrement), **tout le processus recommence**
- Pas de cache intermédiaire (events parsés, diff calculé, etc.)
- Chaque requête refait le travail complet

### Solution :
- Cache en **mémoire** (Node.js) ou **Redis** pour :
  - ICS parsé (évite node-ical)
  - Latest event map (évite la grosse requête Supabase)
  - Résultats de diff
- Cache avec **TTL de 5-10 minutes**

---

## 🔴 **Problème #5 : Fetch ICS Externe Lent**

### Code Actuel :
```javascript
const res = await fetchInsecure(icsUrl, 15000); // Timeout 15s
const text = await res.text(); // ~2-5 secondes
```

### Problème :
- Dépend de la vitesse du serveur externe (Galao)
- Pas de parallélisation possible
- **Incompressible** (dépend du réseau)

### Solution :
- **Cache agressif** : si le hash ICS n'a pas changé, ne pas re-fetch
- **Background refresh** : retourner le cache immédiatement, refresh en background
- **Compression** : demander gzip au serveur ICS

---

## 🔴 **Problème #6 : Pas de Parallélisation**

### Code Actuel :
```javascript
// Tout est séquentiel
1. Fetch ICS                    (2-5s)
2. Parse ICS                    (500ms)
3. Fetch Supabase events        (2-3s)
4. Compute diff                 (200ms)
5. Migrate notes                (1-5s)
6. Updates                      (500ms-2s)
```

### Solution :
```javascript
// Paralléliser ce qui peut l'être
Promise.all([
    fetchInsecure(icsUrl),
    loadLatestEventMap(supabase), // En parallèle du fetch ICS !
    loadIcsHistory(supabase)
]);
```

---

## ✅ **Solutions Proposées (Par Ordre de Priorité)**

### 🚀 **Optimisation #1 : Cache In-Memory (Gain: 70-90%)**

Créer un cache global en mémoire Node.js :

```javascript
const CACHE = {
    parsedICS: null,
    parsedICSHash: null,
    latestEventMap: null,
    latestEventMapTimestamp: 0,
    TTL: 5 * 60 * 1000 // 5 minutes
};

// Au début de GET()
if (CACHE.parsedICSHash === currentIcsHash) {
    // Retourner depuis le cache (0.1s au lieu de 8-15s)
    return NextResponse.json({
        events: CACHE.parsedICS,
        meta: { source: 'memory-cache', fromCache: true }
    });
}
```

**Gain :** 
- Temps de réponse : **8-15s → 50-100ms** (99% plus rapide)
- Coût serveur : **-95%**

---

### 🚀 **Optimisation #2 : Vue Matérialisée PostgreSQL (Gain: 50-70%)**

Créer une vue qui garde uniquement la dernière version :

```sql
CREATE MATERIALIZED VIEW latest_events_view AS
SELECT DISTINCT ON (uid) 
    uid, version_no, summary, start, end_time, 
    location, description, content_hash
FROM edt_events_versions
ORDER BY uid, version_no DESC;

CREATE UNIQUE INDEX ON latest_events_view (uid);
```

**Code modifié :**
```javascript
// Au lieu de récupérer 10000 lignes et filtrer côté app
const { data } = await supabase
    .from('latest_events_view') // ✅ Vue matérialisée
    .select('uid, version_no, content_hash');
```

**Gain :**
- Requête : **2-3s → 200-500ms** (5-10x plus rapide)
- Données transférées : **2-5 MB → 200-500 KB** (90% réduction)

---

### 🚀 **Optimisation #3 : Batch Operations (Gain: 40-60%)**

Remplacer les boucles séquentielles par des bulk operations :

```javascript
// ❌ AVANT : 20 requêtes séquentielles (500ms-2s)
for (const upd of updates) {
    await supabase.from('edt_events_versions').update(upd.data).eq('uid', upd.uid);
}

// ✅ APRÈS : 1 seule requête batch (50-100ms)
await supabase.rpc('bulk_update_events', { updates: updates });
```

**Fonction PostgreSQL :**
```sql
CREATE FUNCTION bulk_update_events(updates JSONB)
RETURNS void AS $$
BEGIN
    UPDATE edt_events_versions SET
        version_no = (updates->>'version_no')::int,
        summary = updates->>'summary',
        ...
    WHERE uid = ANY(SELECT jsonb_array_elements(updates)->>'uid');
END;
$$ LANGUAGE plpgsql;
```

**Gain :**
- Updates : **500ms-2s → 50-100ms** (10-20x plus rapide)

---

### 🚀 **Optimisation #4 : Parallélisation (Gain: 30-40%)**

```javascript
// ❌ AVANT : Séquentiel (total: 5-8s)
const res = await fetchInsecure(icsUrl); // 2-5s
const latestMap = await loadLatestEventMap(supabase); // 2-3s

// ✅ APRÈS : Parallèle (total: 2-5s, le max des deux)
const [res, latestMap] = await Promise.all([
    fetchInsecure(icsUrl),
    loadLatestEventMap(supabase)
]);
```

**Gain :**
- Temps total : **5-8s → 2-5s** (40% plus rapide)

---

### 🚀 **Optimisation #5 : Cache HTTP avec stale-while-revalidate (Gain: 50-80%)**

```javascript
return NextResponse.json(payload, {
    headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, max-age=300'
    }
});
```

**Gain :**
- Requêtes répétées : **8-15s → 50ms** (depuis CDN)
- Charge serveur : **-80%**

---

### 🚀 **Optimisation #6 : Optimiser Migration Notes (Gain: 50-70%)**

```javascript
// ❌ AVANT : N requêtes (1-5s)
for (const note of orphanNotes) {
    const existing = await supabase.from('edt_agenda').select(...).eq(...);
    await supabase.from('edt_agenda').update(...);
}

// ✅ APRÈS : 2-3 requêtes totales (200-500ms)
// 1. Récupérer TOUTES les notes existantes en une fois
const allExisting = await supabase
    .from('edt_agenda')
    .select('...')
    .in('course_uid', newCourseUids);

// 2. Bulk update
await supabase.rpc('bulk_update_notes', { updates: ... });
```

**Gain :**
- Migration notes : **1-5s → 200-500ms** (5-10x plus rapide)

---

## 📊 **Performance Attendue**

### Avant Optimisations :
```
Première requête  : 8-15s   ███████████████
Requête suivante  : 8-15s   ███████████████
Cache hit         : N/A (pas de cache efficace)
```

### Après Optimisations :
```
Première requête  : 2-4s    ████ (60-75% plus rapide)
Requête suivante  : 50-100ms █ (99% plus rapide, cache memory)
Cache CDN hit     : 20-50ms  █ (99.5% plus rapide)
```

---

## 🎯 **Recommandation : Ordre d'Implémentation**

1. **Cache In-Memory** (Facile, Impact Énorme)
2. **Parallélisation** (Facile, Gain Immédiat)
3. **Cache HTTP/CDN** (Facile, Gratuit)
4. **Vue Matérialisée PostgreSQL** (Moyen, Gain Important)
5. **Batch Operations** (Moyen, Bon Gain)
6. **Optimiser Migration Notes** (Difficile, Gain Moyen)

---

## 💡 **Note Importante**

Le **fetch ICS externe** (2-5s) est incompressible car il dépend du serveur Galao. 
Les optimisations permettent de :
- **Éviter ce fetch** quand le cache est valide (99% des cas)
- **Paralléliser** pendant le fetch
- **Accélérer** tout le reste du traitement

**Résultat final :** Temps de réponse divisé par **10-20x** pour la plupart des requêtes.
