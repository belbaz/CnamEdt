/**
 * API proxy pour télécharger l'APK depuis Supabase
 * Utilisée comme intermédiaire pour accéder au bucket privé
 * Passant par le serveur pour générer une URL signée
 */

import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  // Configuration Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aeftxgwfokzlspojzisx.supabase.co';
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
  
  const BUCKET_NAME = 'Apk Edt Eicnam';
  
  // Récupérer la version depuis le query param ou utiliser la version par défaut
  const { searchParams } = new URL(request.url);
  const version = searchParams.get('version') || '2.0.4';
  const FILE_PATH = `apk/edt_cnam_v${version}.apk`;
  
  if (!supabaseServiceRole) {
    return new Response('Service role non configuré', { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Générer une URL signée valide pendant 1 heure
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(FILE_PATH, 3600); // 1 heure
    
    if (error) {
      console.error('Erreur lors de la génération de l\'URL signée:', error);
      return new Response(`Erreur: ${error.message}`, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Rediriger vers l'URL signée
    return Response.redirect(data.signedUrl, 302);
    
  } catch (error) {
    console.error('Erreur lors de la connexion à Supabase:', error);
    return new Response(`Erreur: ${error.message}`, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
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

