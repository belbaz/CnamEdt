import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API pour récupérer le build ID actuel
 * Utilisé par WebVersionChecker pour détecter les nouvelles versions
 */
export async function GET() {
    // Utiliser une combinaison de variables d'environnement pour créer un ID unique
    const buildId = process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.BUILD_ID ||
        process.env.NEXT_BUILD_ID ||
        Date.now().toString();

    return NextResponse.json({
        buildId: buildId.substring(0, 12), // Raccourcir pour faciliter la comparaison
        timestamp: new Date().toISOString()
    });
}
