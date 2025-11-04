/**
 * API proxy pour télécharger l'APK depuis Supabase
 * Utilisée comme intermédiaire pour accéder au bucket privé
 * Passant par le serveur pour générer une URL signée
 */

import { createClient } from '@supabase/supabase-js';

// Note: This API route is only available when running in server mode (not with output: 'export')

// Force dynamic rendering pour Vercel
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  // Configuration Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aeftxgwfokzlspojzisx.supabase.co';
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
  
  const BUCKET_NAME = 'Apk Edt Eicnam';
  
  const { searchParams } = new URL(request.url);
  let version = searchParams.get('version');
  
  // Si aucune version fournie, déterminer automatiquement la dernière version dans le bucket
  if (!version) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceRole);
      const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list('apk', { limit: 100 });

      if (error || !files) {
        throw new Error(error?.message || 'Fichiers introuvables');
      }

      // Filtrer uniquement les fichiers de production (pas de test)
      const relevantFiles = files.filter(file => {
        return file.name.startsWith('edt_cnam_v') && !file.name.includes('_test_') && file.name.endsWith('.apk');
      });

      // Fonction utilitaire de comparaison de versions
      const compareVersions = (a, b) => {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        while (pa.length < 3) pa.push(0);
        while (pb.length < 3) pb.push(0);
        for (let i = 0; i < 3; i++) {
          if (pa[i] > pb[i]) return 1;
          if (pa[i] < pb[i]) return -1;
        }
        return 0;
      };

      // Extraire la version depuis le nom de fichier
      const extractVersion = (filename) => {
        // Supporter X.Y et X.Y.Z
        const m = filename.match(/edt_cnam_v(\d+\.\d+(?:\.\d+)?)\.apk$/);
        return m ? m[1] : null;
      };

      let latest = null;
      for (const f of relevantFiles) {
        const v = extractVersion(f.name);
        if (!v) continue;
        if (!latest || compareVersions(v, latest) > 0) latest = v;
      }

      if (!latest) {
        throw new Error('Aucune version trouvée');
      }

      version = latest;
    } catch (autoErr) {
      console.error('[API Download] Impossible de déterminer la dernière version:', autoErr);
      // Fallback sur une valeur par défaut
      version = '2.0.0';
    }
  }

  // Construire le nom du fichier : edt_cnam_vX.Y.Z.apk
  const fileName = `edt_cnam_v${version}.apk`;
  const FILE_PATH = `apk/${fileName}`;
  
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

