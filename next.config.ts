import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 1. Ignoramos errores para el build
  typescript: { 
    ignoreBuildErrors: true 
  },
  eslint: { 
    ignoreDuringBuilds: true 
  },

  // 2. Configuración de salida y directorios
  output: 'standalone',
  distDir: '.next',

  // 3. Configuración de paquetes a transpilar (para Next.js 14)
  transpilePackages: [
    'genkit', 
    '@genkit-ai/ai', 
    '@genkit-ai/core', 
    '@genkit-ai/google-genai'
  ],

  // 4. Optimización de imágenes
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'i.ibb.co' },
    ],
  },
};

export default nextConfig;
