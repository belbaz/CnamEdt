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

    // Date du dernier commit déployé (ordre de priorité) :
    // 1) LAST_COMMIT_TIMESTAMP — variable d'env à définir (Vercel, .env) au format ISO 8601, ex: 2026-02-15T14:30:00+01:00
    // 2) VERCEL_GIT_COMMIT_TIMESTAMP — fournie par Vercel si dispo
    // 3) BUILD_TIMESTAMP — alias / ancienne convention
    // 4) build-info.js — généré à chaque build par scripts/pre-build.js (git log -1 --format=%cI)
    // 5) En local uniquement : git log -1 en direct
    let commitTimestamp =
        process.env.LAST_COMMIT_TIMESTAMP ||
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

    // Logs de debug
    console.log('[build-id] LAST_COMMIT_TIMESTAMP (env) =', process.env.LAST_COMMIT_TIMESTAMP ? '(défini)' : '(non défini)');
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
