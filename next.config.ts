import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Configuración de salida y directorios
  output: 'standalone',
  distDir: '.next',

  // Configuración de paquetes a transpilar (para Next.js 14)
  transpilePackages: [
    'genkit', 
    '@genkit-ai/ai', 
    '@genkit-ai/core', 
    '@genkit-ai/google-genai'
  ],

  // Optimización de imágenes
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
