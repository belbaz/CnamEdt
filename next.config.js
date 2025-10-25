/** @type {import('next').NextConfig} */

// Détecter si on build pour mobile ou web
const isMobileBuild = process.env.BUILD_MODE === 'mobile';

const nextConfig = {
  // Configuration conditionnelle selon le mode
  // Mobile : export statique (pas d'API routes)
  // Web : mode normal (avec API routes serverless)
  ...(isMobileBuild ? { output: 'export' } : {}),
  
  // Images non optimisées (compatible avec les deux modes)
  images: {
    unoptimized: true
  },
  
  // Trailing slash
  trailingSlash: true,
  
  // Optimisations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // Variables d'environnement accessibles côté client
  env: {
    NEXT_PUBLIC_APP_MODE: isMobileBuild ? 'mobile' : 'web'
  }
}

module.exports = nextConfig
