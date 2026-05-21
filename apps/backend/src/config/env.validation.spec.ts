import { validateEnv } from './env.validation';

const productionConfig = {
  NODE_ENV: 'production',
  JWT_SECRET: 'jwt-secret',
  JWT_REFRESH_SECRET: 'jwt-refresh-secret',
  FRONTEND_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  STRIPE_SECRET_KEY: 'sk_test_secret',
  KAKAO_PAY_SECRET_KEY: 'kakao-pay-secret',
  KAKAO_PAY_CID: 'TC0ONETIME',
  KAKAO_CLIENT_ID: 'kakao-client-id',
  KAKAO_CLIENT_SECRET: 'kakao-client-secret',
  KAKAO_CALLBACK_URL: 'http://localhost:4000/auth/kakao/callback',
  NAVER_CLIENT_ID: 'naver-client-id',
  NAVER_CLIENT_SECRET: 'naver-client-secret',
  NAVER_CALLBACK_URL: 'http://localhost:4000/auth/naver/callback',
  NAVER_PAY_CHAIN_ID: 'naver-pay-chain-id',
  AWS_REGION: 'ap-northeast-2',
  S3_BUCKET_NAME: 'yueeroom-assets',
  CDN_URL: 'https://cdn.yueeroom.com',
  SES_FROM_EMAIL: 'noreply@yueeroom.com',
  ADMIN_EMAIL: 'admin@yueeroom.com',
  SENTRY_DSN: 'https://example@sentry.io/1',
};

describe('validateEnv', () => {
  it('NODE_ENV가 undefined이면 throw 된다', () => {
    expect(() =>
      validateEnv({
        JWT_SECRET: 'jwt-secret',
        JWT_REFRESH_SECRET: 'jwt-refresh-secret',
      }),
    ).toThrow(/NODE_ENV/);
  });

  it('development에서 JWT_SECRET 누락 시 throw 된다', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        JWT_REFRESH_SECRET: 'jwt-refresh-secret',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('development에서 JWT_REFRESH_SECRET 누락 시 throw 된다', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        JWT_SECRET: 'jwt-secret',
      }),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('production에서 운영 필수 변수 누락 시 throw 된다', () => {
    const config = { ...productionConfig, REDIS_URL: '' };

    expect(() => validateEnv(config)).toThrow(/REDIS_URL/);
  });

  it('production에서 복수 누락 변수를 모두 에러 메시지에 포함한다', () => {
    const config = {
      ...productionConfig,
      STRIPE_SECRET_KEY: '',
      KAKAO_PAY_SECRET_KEY: '',
      SENTRY_DSN: '',
    };

    try {
      validateEnv(config);
      fail('validateEnv should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('STRIPE_SECRET_KEY');
      expect((error as Error).message).toContain('KAKAO_PAY_SECRET_KEY');
      expect((error as Error).message).toContain('SENTRY_DSN');
    }
  });

  it('development에서는 production 전용 변수가 없어도 통과한다', () => {
    const config = {
      NODE_ENV: 'development',
      JWT_SECRET: 'jwt-secret',
      JWT_REFRESH_SECRET: 'jwt-refresh-secret',
    };

    expect(validateEnv(config)).toBe(config);
  });

  it('production 필수 변수가 모두 있으면 입력 config 객체를 반환한다', () => {
    expect(validateEnv(productionConfig)).toBe(productionConfig);
  });
});
