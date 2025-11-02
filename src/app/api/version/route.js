/**
 * API pour obtenir la dernière version de l'APK
 * Utilisée par l'application mobile pour vérifier les mises à jour
 */

// Note: Les routes API ne fonctionnent pas avec output: 'export'
// Le dossier API doit être renommé avant le build (voir scripts de build ou package.json)

import { createClient } from '@supabase/supabase-js';

export async function GET() {
  // Version actuelle de l'APK
  const currentVersion = "2.0.1";
  
  // Configuration Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aeftxgwfokzlspojzisx.supabase.co';
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
  
  const BUCKET_NAME = 'Apk Edt Eicnam';
  const FILE_PATH = `apk/edt_cnam_v${currentVersion}.apk`;
  
  let apkUrl;
  
  // Générer une URL signée si le bucket est privé
  if (supabaseServiceRole) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceRole);
      
      // Générer une URL signée valide pendant 1 heure
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(FILE_PATH, 3600); // 1 heure
      
      if (error) {
        console.error('Erreur lors de la génération de l\'URL signée:', error);
        // Fallback vers l'URL publique si la génération échoue
        apkUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(BUCKET_NAME)}/${FILE_PATH}`;
      } else {
        apkUrl = data.signedUrl;
      }
    } catch (error) {
      console.error('Erreur lors de la connexion à Supabase:', error);
      // Fallback vers l'URL publique
      apkUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(BUCKET_NAME)}/${FILE_PATH}`;
    }
  } else {
    // Si pas de service role, utiliser l'URL publique (bucket public)
    apkUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(BUCKET_NAME)}/${FILE_PATH}`;
  }
  
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

