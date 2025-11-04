/** @type {import('next').NextConfig} */
// Attention: ce fichier est copié à la racine en tant que next.config.js avant le build.
// Il doit donc référencer package.json comme s'il était à la racine.
const pkg = require('./package.json');
// Lire le canal depuis les variables d'environnement, avec fallback sur 'prod'
const appChannel = process.env.APP_CHANNEL || process.env.NEXT_PUBLIC_ENV || 'prod';
console.log('[next.config.mobile] APP_CHANNEL:', appChannel);

const nextConfig = {
  // Configuration pour build statique (nécessaire pour Capacitor)
  output: 'export',
  
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
    NEXT_PUBLIC_ENV: appChannel,
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://edt-eicnam.vercel.app',
    // Propager aussi APP_CHANNEL pour compatibilite
    APP_CHANNEL: appChannel
  }
}

module.exports = nextConfig
