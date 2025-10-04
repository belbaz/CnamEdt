/** @type {import('next').NextConfig} */
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
    NEXT_PUBLIC_APP_MODE: 'mobile'
  }
}

module.exports = nextConfig
