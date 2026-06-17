import type { ConfigService } from '@nestjs/config';
import { createKakaoStrategyOptions } from './kakao.strategy';

describe('createKakaoStrategyOptions', () => {
  it('KAKAO_CLIENT_SECRET이 비어 있으면 clientSecret을 전달하지 않는다', () => {
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          KAKAO_CLIENT_ID: 'kakao-client-id',
          KAKAO_CLIENT_SECRET: '',
          KAKAO_CALLBACK_URL: 'http://localhost:4000/api/auth/kakao/callback',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    const options = createKakaoStrategyOptions(configService);

    expect(options).toEqual({
      clientID: 'kakao-client-id',
      callbackURL: 'http://localhost:4000/api/auth/kakao/callback',
    });
    expect(options).not.toHaveProperty('clientSecret');
  });

  it('KAKAO_CLIENT_SECRET이 있으면 clientSecret을 전달한다', () => {
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          KAKAO_CLIENT_ID: 'kakao-client-id',
          KAKAO_CLIENT_SECRET: 'kakao-secret',
          KAKAO_CALLBACK_URL: 'http://localhost:4000/api/auth/kakao/callback',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    const options = createKakaoStrategyOptions(configService);

    expect(options).toEqual({
      clientID: 'kakao-client-id',
      clientSecret: 'kakao-secret',
      callbackURL: 'http://localhost:4000/api/auth/kakao/callback',
    });
  });
});
