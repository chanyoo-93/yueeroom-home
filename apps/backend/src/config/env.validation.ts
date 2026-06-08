const ALWAYS_REQUIRED = [
  'NODE_ENV',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'KCP_SITE_CODE',
  'KCP_SITE_KEY',
  'KCP_SANDBOX',
] as const;

const PRODUCTION_REQUIRED = [
  'FRONTEND_URL',
  'DATABASE_URL',
  'REDIS_URL',
  'KAKAO_PAY_SECRET_KEY',
  'KAKAO_PAY_CID',
  'KAKAO_CLIENT_ID',
  'KAKAO_CLIENT_SECRET',
  'KAKAO_CALLBACK_URL',
  'NAVER_CLIENT_ID',
  'NAVER_CLIENT_SECRET',
  'NAVER_CALLBACK_URL',
  'NAVER_PAY_CHAIN_ID',
  'AWS_REGION',
  'S3_BUCKET_NAME',
  'CDN_URL',
  'SES_FROM_EMAIL',
  'ADMIN_EMAIL',
  'SENTRY_DSN',
] as const;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing: string[] = [];

  for (const key of ALWAYS_REQUIRED) {
    if (!config[key]) {
      missing.push(key);
    }
  }

  if (config['NODE_ENV'] === 'production') {
    for (const key of PRODUCTION_REQUIRED) {
      if (!config[key]) {
        missing.push(key);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `환경 변수 검증 실패 - 다음 변수가 누락되었습니다:\n${missing
        .map((key) => `  - ${key}`)
        .join('\n')}`,
    );
  }

  return config;
}
