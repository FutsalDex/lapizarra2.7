import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Quitamos standalone por ahora para que Firebase use su comportamiento por defecto
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },
};

export default nextConfig;