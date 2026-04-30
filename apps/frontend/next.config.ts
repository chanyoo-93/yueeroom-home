import type { NextConfig } from 'next';

const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  ...(isStaticExport && { output: 'export' }),
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
  },
  transpilePackages: ['@yueeroom/shared'],
};

export default nextConfig;
