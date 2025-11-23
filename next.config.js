/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mode web/PWA - API routes activées
  // Pas de "output: 'export'" pour permettre les API routes serverless
  
  // Optimisation d'images activée
  images: {
    unoptimized: false
  },
  
  // Trailing slash désactivé (mode web standard)
  trailingSlash: false,
  
  // Variables d'environnement accessibles côté client
  env: {
    NEXT_PUBLIC_APP_MODE: 'web'
  }
}

module.exports = nextConfig

