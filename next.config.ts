import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Requerido para Firebase Hosting (Next >= 13, 14, 15)
  output: 'standalone',

  // NUEVO: Turbopack estable en Next 15
  turbopack: {
    // Puedes agregar reglas si luego las necesitas
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
