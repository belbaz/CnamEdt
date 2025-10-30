/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour build statique (nécessaire pour Capacitor)
  // Désactiver en mode dev pour permettre les routes API
  // Active uniquement en mode build/production
  ...(process.env.NODE_ENV === 'production' && process.env.BUILD_MODE === 'mobile' ? {
    output: 'export',
  } : {}),
  
  // Désactiver l'optimisation d'images (non compatible avec export statique)
  images: {
    unoptimized: process.env.NODE_ENV === 'production' && process.env.BUILD_MODE === 'mobile' ? true : false
  },
  
  // Désactiver le trailing slash seulement en mode mobile
  trailingSlash: process.env.NODE_ENV === 'production' && process.env.BUILD_MODE === 'mobile' ? true : false,
  
  // Optimisations pour mobile
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // Minification (Next 15+ utilise SWC par défaut; option legacy supprimée)
  
  // Variables d'environnement accessibles côté client
  env: {
    NEXT_PUBLIC_APP_MODE: process.env.BUILD_MODE === 'mobile' ? 'mobile' : 'web'
  }
}

module.exports = nextConfig
