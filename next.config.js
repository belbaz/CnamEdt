/** @type {import('next').NextConfig} */
// En mode dev, on utilise la config web (sans output: 'export') pour permettre les routes API
// En mode build, on utilise la config mobile (avec output: 'export') pour Capacitor
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = isDev ? {
  // Mode dev - API routes activées
  // Pas de "output: 'export'" pour permettre les API routes
  
  // Optimisation d'images activée en dev
  images: {
    unoptimized: false
  },
  
  // Trailing slash désactivé (mode web standard)
  trailingSlash: false,
  
  // Variables d'environnement accessibles côté client
  env: {
    NEXT_PUBLIC_APP_MODE: 'web'
  }
} : {
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
