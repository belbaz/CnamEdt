import { NextResponse } from 'next/server';
import { buildCommitTimestamp } from '@/build-info';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

/**
 * API pour récupérer le build ID actuel et la date du dernier commit déployé
 * Utilisé par WebVersionChecker et l'UI superAdmin
 *
 * ⚠️ Important :
 * - En production (Vercel connecté à GitHub), VERCEL_GIT_COMMIT_TIMESTAMP
 *   correspond à la date du dernier push GitHub déployé.
 * - En local, si aucune variable n'est disponible, on récupère directement
 *   le dernier commit Git avec `git log -1 --format=%cI`.
 */
export async function GET() {
    // Utiliser une combinaison de variables d'environnement pour créer un ID unique
    const buildId =
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.BUILD_ID ||
        process.env.NEXT_BUILD_ID ||
        Date.now().toString();

    // Date du dernier commit déployé connue par Vercel (provenant de GitHub, même pour un repo privé)
    // On essaie dans l'ordre :
    // 1) Variable fournie automatiquement par Vercel (si dispo)
    // 2) Variable BUILD_TIMESTAMP (si tu décides de la définir manuellement dans Vercel)
    // 3) Fichier généré au build à partir de git (scripts/pre-build.js), sans token GitHub
    // 4) En local uniquement : récupération directe via git log
    let commitTimestamp =
        process.env.VERCEL_GIT_COMMIT_TIMESTAMP ||
        process.env.BUILD_TIMESTAMP ||
        buildCommitTimestamp ||
        null;

    // En local uniquement : si aucun timestamp n'est disponible, récupérer directement via Git
    if (!commitTimestamp && !process.env.VERCEL) {
        try {
            // %cI = date ISO 8601 du dernier commit (auteur)
            const gitDate = execSync('git log -1 --format=%cI', {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
            }).trim();
            
            if (gitDate) {
                commitTimestamp = gitDate;
                console.log('[build-id] Dernier commit Git récupéré en local =', commitTimestamp);
            }
        } catch (e) {
            console.warn('[build-id] Impossible de récupérer la date du dernier commit via git en local:', e.message);
        }
    }

    // Logs de debug pour vérifier les valeurs réellement fournies par Vercel en production
    console.log('[build-id] VERCEL_GIT_COMMIT_TIMESTAMP =', process.env.VERCEL_GIT_COMMIT_TIMESTAMP);
    console.log('[build-id] BUILD_TIMESTAMP =', process.env.BUILD_TIMESTAMP);
    console.log('[build-id] buildCommitTimestamp (fallback git) =', buildCommitTimestamp);
    console.log('[build-id] commitTimestamp (utilisé par l\'API) =', commitTimestamp);

    return NextResponse.json({
        buildId: buildId.substring(0, 12), // Raccourcir pour faciliter la comparaison
        // timestamp = date du dernier push GitHub déployé (ou null si non disponible)
        timestamp: commitTimestamp,
    });
}
