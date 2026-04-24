import type { NextConfig } from 'next';

const cspHeader = [
  "default-src 'self'",
  // Next.js App Router requires 'unsafe-inline' for hydration scripts;
  // external script sources are restricted to known payment providers only.
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://pay.naver.com https://online-pay.kakao.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  // Stripe payment iframes
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  // API connections to payment providers
  "connect-src 'self' https://api.stripe.com https://dev.apis.naver.com https://open-api.kakaopay.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
  },
  transpilePackages: ['@yueeroom/shared'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
