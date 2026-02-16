const packageJson = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mode web/PWA - API routes activées
  // Pas de "output: 'export'" pour permettre les API routes serverless
  
  // Variables d'environnement accessibles côté client
  env: {
    NEXT_PUBLIC_APP_MODE: 'web',
    NEXT_PUBLIC_APP_VERSION: packageJson.version || '1.0.0'
  },
  
  // Optimisation d'images activée
  images: {
    unoptimized: false
  },
  
  // Trailing slash désactivé (mode web standard)
  trailingSlash: false,
  
}

module.exports = nextConfig

