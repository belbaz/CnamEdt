# ✅ Notification Intelligente : Changement Cette Semaine vs Autre Semaine

## 🎯 Comportement Final Implémenté

La notification affiche maintenant **2 messages différents** selon où se trouvent les changements :

---

## 📱 **Cas 1 : Changement CETTE SEMAINE (Semaine Affichée)**

### Conditions :
- ✅ Un changement (ajout/modification/suppression) concerne la semaine actuellement affichée
- ✅ Le hash ICS a changé (vraie modification)

### Message :
```
🔔 "Un changement a été détecté cette semaine."
```

### Exemple :
```
Vous regardez : Semaine du 30 Mars 2026
Changement : Nouveau cours le 2 Avril 2026
→ ✅ Notification : "Un changement a été détecté cette semaine"
```

---

## 📱 **Cas 2 : Changement AUTRE SEMAINE (Pas la Semaine Affichée)**

### Conditions :
- ✅ Un changement existe quelque part dans l'EDT
- ❌ MAIS pas dans la semaine actuellement affichée
- ✅ Le hash ICS a changé (vraie modification)

### Message :
```
🔔 "Votre emploi du temps a été mis à jour."
```

### Exemple :
```
Vous regardez : Semaine du 30 Mars 2026
Changement : Nouveau cours le 15 Mai 2026
→ ✅ Notification : "Votre emploi du temps a été mis à jour"
```

---

## 🚫 **Cas 3 : Pas de Notification (Faux Positif)**

### Conditions :
- ✅ Le backend détecte `changes: 2`
- ❌ MAIS le hash ICS est identique au précédent
- → Faux positif (cache backend vide sur Vercel)

### Message :
```
❌ Pas de notification
```

### Log Console :
```
[Page] Changements ignorés (cache backend vide, hash identique): 2 changes
```

---

## 🔍 Logique de Détection

### Algorithme Complet :

```javascript
// 1. Vérifier si le hash a changé
const previousHash = localStorage.getItem('lastNotificationHash');
const currentHash = meta.hash; // Ex: "9f679193"

if (currentHash === previousHash) {
    // ❌ Hash identique = Pas de vraie modification
    // → Ignorer même si backend dit "changes: 2"
    return;
}

// 2. Calculer la plage de dates de la semaine affichée
const weekStart = selectedWeek; // Ex: 30 Mars 2026 00:00
const weekEnd = selectedWeek + 6 jours; // Ex: 5 Avril 2026 23:59

// 3. Vérifier si les changements concernent cette semaine
const changesInCurrentWeek = 
    diff.added.some(ev => ev.start dans [weekStart, weekEnd]) ||
    diff.updated.some(ev => ev.start dans [weekStart, weekEnd]) ||
    diff.removed.some(ev => ev.start dans [weekStart, weekEnd]);

// 4. Afficher la notification appropriée
if (changesInCurrentWeek) {
    notification = "Un changement a été détecté cette semaine";
} else {
    notification = "Votre emploi du temps a été mis à jour";
}

// 5. Sauvegarder le hash
localStorage.setItem('lastNotificationHash', currentHash);
```

---

## 📊 Exemples Concrets

### **Exemple 1 : Cours Modifié Cette Semaine**

```
Date actuelle : 30 Mars 2026
Semaine affichée : 30 Mars - 5 Avril 2026

Changement :
- Cours "Programmation Web" le 2 Avril
  Salle : B101 → B202

Hash :
- Avant : 9f679193
- Après : a1b2c3d4

Résultat :
→ ✅ Notification : "Un changement a été détecté cette semaine"
→ Log : "Changements dans la semaine affichée (30/03/2026)"
```

---

### **Exemple 2 : Cours Ajouté dans 2 Mois**

```
Date actuelle : 30 Mars 2026
Semaine affichée : 30 Mars - 5 Avril 2026

Changement :
- Nouveau cours "Base de Données" le 15 Mai 2026

Hash :
- Avant : 9f679193
- Après : b3c4d5e6

Résultat :
→ ✅ Notification : "Votre emploi du temps a été mis à jour"
→ Log : "Changements HORS de la semaine affichée (30/03/2026)"
```

---

### **Exemple 3 : Rechargement Sans Changement**

```
Date actuelle : 30 Mars 2026
Semaine affichée : 30 Mars - 5 Avril 2026

Backend dit :
- changes: 2 (faux positif, cache vide)

Hash :
- Avant : 9f679193
- Après : 9f679193 (identique)

Résultat :
→ ❌ Pas de notification
→ Log : "Changements ignorés (cache backend vide, hash identique)"
```

---

## 📁 Fichiers Modifiés

### Code :
- ✅ `src/app/page.tsx`
  - Ajout du state `edtChangeToastMessage`
  - Logique de détection par semaine
  - Comparaison des hash
  - Message conditionnel dans Toast

### Traductions :
- ✅ `src/i18n/translations/fr.json`
  - Ajout : `"edtChangeGeneral": "Votre emploi du temps a été mis à jour."`

- ✅ `src/i18n/translations/en.json`
  - Ajout : `"edtChangeGeneral": "Your schedule has been updated."`

---

## 🧪 Comment Tester

### Test 1 : Notification "Cette Semaine"
1. Ouvrir DevTools > Console
2. Simuler un changement cette semaine :
```javascript
// Dans console navigateur
localStorage.setItem('lastNotificationHash', 'old-hash-123');
location.reload();
```
3. Vérifier les logs :
   - `Changements dans la semaine affichée`
   - Notification : "Un changement a été détecté cette semaine"

### Test 2 : Notification "Général"
1. Changer de semaine (vers une semaine sans changements récents)
2. Simuler un changement ailleurs :
```javascript
localStorage.setItem('lastNotificationHash', 'old-hash-456');
location.reload();
```
3. Vérifier les logs :
   - `Changements HORS de la semaine affichée`
   - Notification : "Votre emploi du temps a été mis à jour"

### Test 3 : Pas de Notification (Hash Identique)
1. Recharger la page plusieurs fois
2. Vérifier les logs :
   - `Changements ignorés (cache backend vide, hash identique)`
   - ❌ Pas de notification

---

## 💡 Résumé

**Comportement Final :**
```
┌─────────────────────────────────────────────────────────────┐
│ Situation                    │ Message Affiché              │
├──────────────────────────────┼──────────────────────────────┤
│ Changement cette semaine     │ "Un changement a été         │
│ (semaine affichée)           │  détecté cette semaine."     │
├──────────────────────────────┼──────────────────────────────┤
│ Changement autre semaine     │ "Votre emploi du temps a     │
│ (pas la semaine affichée)    │  été mis à jour."            │
├──────────────────────────────┼──────────────────────────────┤
│ Pas de changement            │ ❌ Pas de notification       │
│ (hash identique)             │                              │
└──────────────────────────────┴──────────────────────────────┘
```

**Plus de notification en boucle !** 🎉

**Les utilisateurs sont informés précisément selon la portée du changement !** 🚀
