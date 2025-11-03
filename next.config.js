/** @type {import('next').NextConfig} */
// Attention: ce fichier est copié à la racine en tant que next.config.js avant le build.
// Il doit donc référencer package.json comme s'il était à la racine.
const pkg = require('./package.json');
const appChannel = process.env.APP_CHANNEL || 'prod';

const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig = {
  // Configuration pour build statique (nécessaire pour Capacitor)
  // Activée uniquement si STATIC_EXPORT=true est défini dans l'environnement
  ...(isStaticExport ? { output: 'export' } : {}),
  
  // Désactiver l'optimisation d'images (non compatible avec export statique)
  images: {
    unoptimized: true
  },
  
  // Désactiver le trailing slash
  trailingSlash: true,
  
  // Optimisations pour mobile
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // Minification (Next 15+ utilise SWC par défaut; option legacy supprimée)
  
  // Variables d'environnement accessibles côté client
  env: {
    NEXT_PUBLIC_APP_MODE: 'mobile',
    NEXT_PUBLIC_APP_CHANNEL: appChannel,
    NEXT_PUBLIC_APP_VERSION: pkg.version
  }
}

module.exports = nextConfig
