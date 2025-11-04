/**
 * API pour obtenir la dernière version de l'APK
 * Utilisée par l'application mobile pour vérifier les mises à jour
 * Détecte automatiquement la dernière version disponible dans Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'Apk Edt Eicnam';

// Note: dynamic rendering disabled to be compatible with static export

// Fonction pour comparer deux versions (gère X.X et X.X.X)
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  // Normaliser à 3 parties (ajouter 0 si manquant)
  while (parts1.length < 3) parts1.push(0);
  while (parts2.length < 3) parts2.push(0);
  
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  return 0;
}

// Fonction pour extraire la version depuis le nom de fichier
function extractVersion(filename, isTest) {
  if (isTest) {
    // Format: edt_cnam_v_test_X.X.X.apk
    const match = filename.match(/edt_cnam_v_test_(\d+\.\d+\.\d+)\.apk$/);
    return match ? match[1] : null;
  } else {
    // Formats supportés en prod:
    // - edt_cnam_vX.Y.apk (ancien)
    // - edt_cnam_vX.Y.Z.apk (nouveau, recommandé)
    const match = filename.match(/edt_cnam_v(\d+\.\d+(?:\.\d+)?)\.apk$/);
    return match ? match[1] : null;
  }
}

// Fonction pour obtenir la dernière version depuis Supabase
async function getLatestVersionFromStorage(isTest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
  
  // Ne pas essayer d'accéder à Supabase si les credentials ne sont pas disponibles
  // (par exemple lors du build sur Vercel si les variables ne sont pas configurées)
  if (!supabaseUrl || !supabaseKey) {
    console.log('[API Version] Supabase non configuré, utilisation de la version par défaut');
    return null;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Lister tous les fichiers APK avec un timeout
    const listPromise = supabase.storage
      .from(BUCKET_NAME)
      .list('apk', { limit: 100 });
    
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 5000)
    );
    
    // Utiliser Promise.race avec gestion d'erreur
    let result;
    try {
      result = await Promise.race([listPromise, timeoutPromise]);
    } catch (raceError) {
      console.warn('[API Version] Erreur Promise.race:', raceError.message);
      return null;
    }
    
    const { data: files, error } = result || {};
    
    if (error || !files) {
      console.warn('[API Version] Erreur lors de la récupération des fichiers:', error?.message || 'Fichiers introuvables');
      return null;
    }
    
    // Filtrer selon le type (test ou prod)
    const relevantFiles = files.filter(file => {
      if (isTest) {
        return file.name.startsWith('edt_cnam_v_test_') && file.name.endsWith('.apk');
      } else {
        return file.name.startsWith('edt_cnam_v') && 
               !file.name.includes('_test_') && 
               file.name.endsWith('.apk');
      }
    });
    
    if (relevantFiles.length === 0) {
      console.log('[API Version] Aucun APK trouvé pour le type:', isTest ? 'test' : 'prod');
      return null;
    }
    
    // Extraire les versions et trouver la plus récente
    let latestVersion = null;
    
    for (const file of relevantFiles) {
      const version = extractVersion(file.name, isTest);
      if (!version) continue;
      
      if (!latestVersion || compareVersions(version, latestVersion) > 0) {
        latestVersion = version;
      }
    }
    
    if (latestVersion) {
      console.log('[API Version] Dernière version trouvée:', latestVersion, isTest ? '(test)' : '(prod)');
    }
    
    return latestVersion;
  } catch (error) {
    // Erreur silencieuse - on retourne null pour utiliser la version par défaut
    console.warn('[API Version] Erreur lors de la récupération (utilisation version par défaut):', error.message);
    return null;
  }
}

export async function GET(request) {
  try {
    // Déterminer le canal
    const url = new URL(request.url);
    const testParam = url.searchParams.get('test');
    const envChannel = (process.env.APP_CHANNEL || process.env.NEXT_PUBLIC_APP_CHANNEL || 'prod').toLowerCase();
    let isTest = envChannel === 'test';
    if (typeof testParam === 'string') {
      const v = testParam.toLowerCase();
      if (v === 'true' || v === '1') isTest = true;
      if (v === 'false' || v === '0') isTest = false;
    }

    // Récupérer la dernière version depuis Supabase Storage
    const latestVersion = await getLatestVersionFromStorage(isTest);

    // Si aucune version trouvée dans Supabase, utiliser une version par défaut
    // Prod: utiliser la version de l'appli (package.json) si disponible; sinon 2.0.0
    // Test: format X.Y.Z
    const fallbackProd = process.env.NEXT_PUBLIC_APP_VERSION || '2.0.0';
    const currentVersion = latestVersion || (isTest ? '2.0.20' : fallbackProd);

    // Récupérer l'URL de base du site pour construire l'URL de l'API (toujours l'origine courante)
    const host = request?.headers?.get('host');
    const protocol = host && host.startsWith('localhost') ? 'http' : 'https';
    const siteUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL || 'https://edt-eicnam.vercel.app');

    // Utiliser la route API de l'application comme proxy pour le téléchargement
    const apkUrl = `${siteUrl}/api/download/apk?test=${isTest ? 'true' : 'false'}`;

    const body = {
      version: currentVersion,
      url: apkUrl,
      changelog: isTest ? 'Version de test - Préprod/Dev' : 'Version de production',
      isTest
    };

    return Response.json(body, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Cache-Control'
      }
    });
  } catch (err) {
    console.error('[API Version] Erreur GET /api/version:', err?.message || err);
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Cache-Control'
      }
    });
  }
}

// Support des requêtes OPTIONS pour CORS
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control'
    }
  });
}

// Support des requêtes HEAD pour les vérifications de connectivité
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control'
    }
  });
}
