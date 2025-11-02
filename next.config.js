/** @type {import('next').NextConfig} */
// Détection automatique du mode de build (mobile ou web)
const isMobileBuild = process.env.BUILD_MODE === 'mobile';
const isVercel = process.env.VERCEL === '1';

let nextConfig;

if (isMobileBuild) {
  // Configuration pour build statique (nécessaire pour Capacitor)
  nextConfig = {
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
    
    // Variables d'environnement accessibles côté client
    env: {
      NEXT_PUBLIC_APP_MODE: 'mobile'
    }
  };
} else {
  // Configuration pour build web (Vercel ou autre)
  // Pas de "output: 'export'" pour permettre les API routes serverless
  nextConfig = {
    // Optimisation d'images activée
    images: {
      unoptimized: false
    },
    
    // Trailing slash désactivé (mode web standard)
    trailingSlash: false,
    
    // Optimisations pour production
    compiler: {
      removeConsole: process.env.NODE_ENV === 'production' ? {
        exclude: ['error', 'warn']
      } : false,
    },
    
    // Variables d'environnement accessibles côté client
    env: {
      NEXT_PUBLIC_APP_MODE: 'web'
    }
  };
}

module.exports = nextConfig
