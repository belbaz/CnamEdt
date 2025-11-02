/**
 * API pour obtenir la dernière version de l'APK
 * Utilisée par l'application mobile pour vérifier les mises à jour
 * Détecte automatiquement la dernière version disponible dans Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'Apk Edt Eicnam';

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
    // Format: edt_cnam_vX.X.apk
    const match = filename.match(/edt_cnam_v(\d+\.\d+)\.apk$/);
    return match ? match[1] : null;
  }
}

// Fonction pour obtenir la dernière version depuis Supabase
async function getLatestVersionFromStorage(isTest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Lister tous les fichiers APK
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('apk', { limit: 100 });
    
    if (error || !files) {
      console.error('[API Version] Erreur lors de la récupération des fichiers:', error);
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
      return null;
    }
    
    // Extraire les versions et trouver la plus récente
    let latestVersion = null;
    let latestFile = null;
    
    for (const file of relevantFiles) {
      const version = extractVersion(file.name, isTest);
      if (!version) continue;
      
      if (!latestVersion || compareVersions(version, latestVersion) > 0) {
        latestVersion = version;
        latestFile = file;
      }
    }
    
    return latestVersion;
  } catch (error) {
    console.error('[API Version] Erreur lors de la récupération:', error);
    return null;
  }
}

export async function GET(request) {
  // Vérifier si on demande les versions test
  const searchParams = new URL(request.url).searchParams;
  const isTest = searchParams.get('test') === 'true';
  
  // Récupérer la dernière version depuis Supabase Storage
  const latestVersion = await getLatestVersionFromStorage(isTest);
  
  // Si aucune version trouvée dans Supabase, utiliser une version par défaut
  const currentVersion = latestVersion || (isTest ? "2.0.20" : "2.0");
  
  // Récupérer l'URL de base du site pour construire l'URL de l'API
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                  (request.headers.get('host') ? `https://${request.headers.get('host')}` : 'https://edt-eicnam.vercel.app');
  
  // Utiliser la route API de l'application comme proxy pour le téléchargement
  // Cela permet de passer par le serveur pour accéder au bucket privé
  const apkUrl = `${siteUrl}/api/download/apk?version=${currentVersion}&test=${isTest}`;
  
  return Response.json({
    version: currentVersion,
    url: apkUrl,
    changelog: isTest ? "Version de test - Préprod/Dev" : "Version de production",
    isTest: isTest
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
