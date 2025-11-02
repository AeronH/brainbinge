import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ozithbabyugjtjywgndn.supabase.co'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark pdf2json as external for server-side
      config.externals = config.externals || [];
      config.externals.push('pdf2json');
    }
    return config;
  },
};

export default nextConfig;

