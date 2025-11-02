/**
 * Script pour uploader l'APK vers Supabase Storage
 * Usage: node upload-to-supabase.js [version]
 * Exemple: node upload-to-supabase.js 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Récupérer la version depuis les arguments
const version = process.argv[2];
const isTest = process.argv[3] === 'test';

if (!version) {
  console.error('❌ Version manquante !');
  console.error('   Usage: node upload-to-supabase.js [version] [test]');
  console.error('   Exemple: node upload-to-supabase.js 2.0.20');
  console.error('   Exemple test: node upload-to-supabase.js 2.0.20 test');
  process.exit(1);
}

// Valider le format de version (X.Y ou X.Y.Z)
if (!/^\d+\.\d+(\.\d+)?$/.test(version)) {
  console.error('❌ Format de version invalide !');
  console.error('   Format attendu: X.Y ou X.Y.Z (exemple: 2.0 ou 2.0.20)');
  process.exit(1);
}

// Configuration
// Format: edt_cnam_v_test_X.X.X.apk pour test, edt_cnam_vX.X.apk pour prod
const APK_NAME = isTest ? `edt_cnam_v_test_${version}.apk` : `edt_cnam_v${version}.apk`;
// Le deploy.bat génère l'APK en mode release
const APK_PATH_RELEASE = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release', APK_NAME);
const APK_PATH_DEBUG = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', APK_NAME);
const BUCKET_NAME = 'Apk Edt Eicnam';
const FILE_PATH = `apk/${APK_NAME}`;

// Charger les variables d'environnement depuis .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ Fichier .env.local introuvable !');
    console.error('   Créez un fichier .env.local à la racine avec :');
    console.error('   NEXT_PUBLIC_SUPABASE_URL=https://votre-project-id.supabase.co');
    console.error('   SUPABASE_SERVICE_ROLE=votre-service-role-key');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return env;
}

async function uploadAPK() {
  console.log('\n========================================');
  console.log(`   Upload APK v${version} vers Supabase`);
  console.log('========================================\n');

  // Charger les variables d'environnement
  const env = loadEnvFile();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables d\'environnement manquantes !');
    console.error('   Vérifiez que .env.local contient :');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE');
    process.exit(1);
  }

  // Vérifier que l'APK existe (chercher d'abord en release, puis en debug)
  let finalAPKPath = APK_PATH_RELEASE;
  if (!fs.existsSync(finalAPKPath)) {
    // Essayer le dossier debug si release n'existe pas
    if (fs.existsSync(APK_PATH_DEBUG)) {
      finalAPKPath = APK_PATH_DEBUG;
      console.log(`ℹ️  APK trouvé en mode debug`);
    } else {
      console.error(`❌ APK introuvable dans les deux emplacements :`);
      console.error(`   - Release : ${APK_PATH_RELEASE}`);
      console.error(`   - Debug : ${APK_PATH_DEBUG}`);
      process.exit(1);
    }
  }

  console.log(`📦 APK trouvé : ${finalAPKPath}`);
  
  // Lire le fichier APK
  const fileBuffer = fs.readFileSync(finalAPKPath);
  const fileSizeInMB = (fileBuffer.length / 1024 / 1024).toFixed(2);
  console.log(`📊 Taille : ${fileSizeInMB} MB`);

  // Créer le client Supabase
  console.log('\n🔗 Connexion à Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Vérifier si le bucket existe
    console.log(`📁 Vérification du bucket "${BUCKET_NAME}"...`);
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Erreur lors de la récupération des buckets :', bucketsError.message);
      process.exit(1);
    }

    const bucketExists = buckets.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`⚠️  Bucket "${BUCKET_NAME}" introuvable. Création en cours...`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 52428800 // 50 MB
      });

      if (createError) {
        console.error('❌ Erreur lors de la création du bucket :', createError.message);
        process.exit(1);
      }
      console.log('✅ Bucket créé avec succès !');
    } else {
      console.log('✅ Bucket trouvé !');
    }

    // Lister et supprimer tous les anciens APKs
    console.log(`\n🗑️  Vérification des anciens APKs...`);
    const { data: existingFiles } = await supabase.storage
      .from(BUCKET_NAME)
      .list('apk', { limit: 100 });

    if (existingFiles && existingFiles.length > 0) {
      // Filtrer selon le type : test ou production
      const apkFiles = existingFiles.filter(f => {
        if (isTest) {
          return f.name.startsWith('edt_cnam_v_test_') && f.name.endsWith('.apk');
        } else {
          return f.name.startsWith('edt_cnam_v') && !f.name.includes('_test_') && f.name.endsWith('.apk');
        }
      });
      
      if (apkFiles.length > 0) {
        console.log(`🗑️  Suppression de ${apkFiles.length} ancien(s) APK(s)...`);
        const filesToDelete = apkFiles.map(f => `apk/${f.name}`);
        
        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove(filesToDelete);

        if (deleteError) {
          console.error('⚠️  Erreur lors de la suppression :', deleteError.message);
          console.log('   Tentative d\'upload malgré tout...');
        } else {
          console.log(`✅ ${apkFiles.length} ancien(s) APK(s) supprimé(s) !`);
        }
      } else {
        console.log('ℹ️  Aucun ancien APK à supprimer');
      }
    } else {
      console.log('ℹ️  Aucun fichier dans le dossier apk/');
    }

    // Uploader le nouveau APK
    console.log(`\n📤 Upload de l'APK en cours...`);
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(FILE_PATH, fileBuffer, {
        contentType: 'application/vnd.android.package-archive',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('❌ Erreur lors de l\'upload :', error.message);
      process.exit(1);
    }

    console.log('✅ APK uploadé avec succès !');

    // Construire l'URL publique
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${FILE_PATH}`;
    
    console.log('\n========================================');
    console.log('   ✅ UPLOAD TERMINÉ !');
    console.log('========================================');
    console.log(`\n🔗 URL publique :`);
    console.log(`   ${publicUrl}`);
    console.log('\n💡 Mettez à jour NEXT_PUBLIC_APK_URL dans .env.local si nécessaire');
    console.log('   Puis redéployez votre application sur Vercel\n');

  } catch (err) {
    console.error('❌ Erreur inattendue :', err.message);
    process.exit(1);
  }
}

// Exécuter le script
uploadAPK().catch(err => {
  console.error('❌ Erreur fatale :', err);
  process.exit(1);
});

