/** @type {import('next').NextConfig} */
// En mode dev, on utilise la config web (sans output: 'export') pour permettre les routes API
// Sur Vercel, on utilise aussi la config web (sans output: 'export') pour permettre les routes API
// En mode build local mobile, on utilise la config mobile (avec output: 'export') pour Capacitor
const isDev = process.env.NODE_ENV === 'development';
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
const isMobileBuild = process.env.BUILD_MODE === 'mobile';

// Si on est sur Vercel ou en dev, on ne peut pas utiliser output: 'export' (nécessite les routes API)
const shouldUseExport = !isDev && !isVercel && isMobileBuild;

const nextConfig = (isDev || isVercel) ? {
  // Mode dev/Vercel - API routes activées
  // Pas de "output: 'export'" pour permettre les API routes
  
  // Optimisation d'images activée en dev/Vercel
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
  // Configuration pour build statique mobile (nécessaire pour Capacitor)
  // Seulement utilisé lors d'un build local avec BUILD_MODE=mobile
  ...(shouldUseExport && { output: 'export' }),
  
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
