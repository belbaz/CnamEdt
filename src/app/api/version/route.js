/**
 * API pour obtenir la dernière version de l'APK
 * Utilisée par l'application mobile pour vérifier les mises à jour
 */

// Note: Les routes API ne fonctionnent pas avec output: 'export'
// Le dossier API doit être renommé avant le build (voir scripts de build ou package.json)

export async function GET(request) {
  // Version actuelle de l'APK
  const currentVersion = "2.0.16";
  
  // Récupérer l'URL de base du site pour construire l'URL de l'API
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                  (request.headers.get('host') ? `https://${request.headers.get('host')}` : 'https://edt-eicnam.vercel.app');
  
  // Utiliser la route API de l'application comme proxy pour le téléchargement
  // Cela permet de passer par le serveur pour accéder au bucket privé
  const apkUrl = `${siteUrl}/api/download/apk?version=${currentVersion}`;
  
  return Response.json({
    version: currentVersion,
    url: apkUrl,
    changelog: "Version initiale avec système de mise à jour automatique"
  }, {
    headers: {
      // Cache
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      // CORS - Permettre les requêtes depuis l'app mobile
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control'
    }
  });
}

// Support des requêtes OPTIONS pour CORS
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control'
    }
  });
}

