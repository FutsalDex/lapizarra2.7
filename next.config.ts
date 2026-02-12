import type {Config} from 'next';

const nextConfig: Config = {
  // ESM packages to be transpiled must be specified here.
  transpilePackages: ['@genkit-ai/ai', '@genkit-ai/google-genai', 'genkit'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
