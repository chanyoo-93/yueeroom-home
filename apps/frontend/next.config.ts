import type { NextConfig } from 'next';

function buildCspHeader(): string {
  const connectSrcOrigins = [
    "'self'",
    'https://api.stripe.com',
    'https://apis.naver.com',
    'https://open-api.kakaopay.com',
  ];

  // 백엔드 API URL 오리진을 connect-src에 추가 (E2E 및 클라이언트 사이드 API 호출 허용)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const { origin } = new URL(apiUrl);
      if (!connectSrcOrigins.includes(origin)) connectSrcOrigins.push(origin);
    } catch {
      // 잘못된 URL은 무시
    }
  }

  return [
    "default-src 'self'",
    // Next.js App Router requires 'unsafe-inline' for hydration scripts;
    // external script sources are restricted to known payment providers only.
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://pay.naver.com https://online-pay.kakao.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    // Stripe payment iframes
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    `connect-src ${connectSrcOrigins.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

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
          { key: 'Content-Security-Policy', value: buildCspHeader() },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
