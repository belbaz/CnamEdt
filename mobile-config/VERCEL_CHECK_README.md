# Vérification du déploiement Vercel

Ce document explique le fonctionnement du script `check-vercel-deployment.js` et les codes de sortie.

## Codes de sortie

Le script utilise 3 codes de sortie différents pour indiquer le statut :

### Code 0 - Succès ✅
Le déploiement Vercel est terminé avec succès et le site est en ligne.

### Code 1 - Erreur de déploiement ❌
Le déploiement Vercel a échoué (état ERROR, FAILED, CANCELED).
Action requise : Consultez le dashboard Vercel pour voir les logs d'erreur.

### Code 2 - Vérification impossible ⚠️
La vérification automatique n'a pas pu être effectuée pour l'une des raisons suivantes :
- Vercel CLI n'est pas installé
- Utilisateur non connecté à Vercel CLI (`vercel login` requis)
- Timeout atteint (déploiement trop long > 3 minutes)
- Erreurs réseau ou API Vercel indisponible
- Aucun déploiement détecté après 1 minute d'attente

**Note** : Ce n'est pas une erreur de déploiement, juste l'impossibilité de vérifier automatiquement.
Le déploiement peut être en cours ou terminé. Vérifiez manuellement sur le dashboard.

## Utilisation dans deploy.bat

Le script `deploy.bat` traite ces codes comme suit :

```batch
if !VERCEL_CHECK_EXIT! EQU 1 (
    REM Erreur de déploiement - avertir l'utilisateur
    echo ATTENTION: ERREUR DE DEPLOIEMENT
) else if !VERCEL_CHECK_EXIT! EQU 2 (
    REM Vérification impossible - note discrète
    echo Note: Verification automatique non disponible.
)
REM Code 0 - message de succès déjà affiché par le script Node
```

## Paramètres

```bash
node check-vercel-deployment.js [timeoutSeconds]
```

- `timeoutSeconds` : Durée maximale d'attente en secondes (défaut : 180 = 3 minutes)

## Exemple

```bash
# Attendre max 5 minutes
node mobile-config/check-vercel-deployment.js 300
```

## Améliorations apportées

1. **Gestion robuste des erreurs** : Distinction entre vraies erreurs de déploiement et problèmes de vérification
2. **Codes de sortie clairs** : 3 codes distincts pour une meilleure automatisation
3. **Timeouts augmentés** : 20 secondes pour `vercel ls` (connexions lentes)
4. **Messages d'erreur détaillés** : Identification des problèmes réseau/timeout
5. **Abandon intelligent** : Arrêt après 12 tentatives infructueuses (1 minute) au lieu de boucler indéfiniment

