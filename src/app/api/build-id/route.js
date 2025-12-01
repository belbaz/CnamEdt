import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API pour récupérer le build ID actuel et la date du dernier commit déployé
 * Utilisé par WebVersionChecker et l'UI superAdmin
 *
 * ⚠️ Important :
 * - En production (Vercel connecté à GitHub), VERCEL_GIT_COMMIT_TIMESTAMP
 *   correspond à la date du dernier push GitHub déployé.
 * - En local, si cette variable n'existe pas, on NE renvoie PAS l'heure courante
 *   pour éviter de donner une fausse information : le front affichera "Non disponible".
 */
export async function GET() {
    // Utiliser une combinaison de variables d'environnement pour créer un ID unique
    const buildId =
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.BUILD_ID ||
        process.env.NEXT_BUILD_ID ||
        Date.now().toString();

    // Date du dernier commit déployé connue par Vercel (provenant de GitHub, même pour un repo privé)
    const commitTimestamp =
        process.env.VERCEL_GIT_COMMIT_TIMESTAMP ||
        process.env.BUILD_TIMESTAMP ||
        null; // surtout PAS new Date() pour ne pas afficher l'heure actuelle

    return NextResponse.json({
        buildId: buildId.substring(0, 12), // Raccourcir pour faciliter la comparaison
        // timestamp = date du dernier push GitHub déployé (ou null si non disponible)
        timestamp: commitTimestamp,
    });
}
