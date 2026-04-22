import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  setupMfa: jest.fn(),
  verifyMfa: jest.fn(),
};

function makeResponse(overrides: Partial<Response> = {}): Response {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
    ...overrides,
  } as unknown as Response;
}

describe('AuthController — 소셜 로그인 콜백', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  describe('naverCallback', () => {
    it('access_token을 URL 파라미터가 아닌 쿠키로 설정하고 프론트엔드로 리다이렉트한다', async () => {
      const fakeUser = { id: 'u1', email: 'a@test.com', status: 'APPROVED' } as never;
      mockAuthService.login.mockResolvedValue({
        accessToken: 'acc.token',
        refreshToken: 'ref.token',
      });
      const res = makeResponse();

      await controller.naverCallback({ user: fakeUser } as never, res);

      // 쿠키 설정 확인 (token이 URL에 노출되어서는 안 됨)
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'acc.token',
        expect.objectContaining({ httpOnly: false, sameSite: 'strict' }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'ref.token',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
      );
      // 리다이렉트 URL에 token 파라미터가 없어야 함
      const redirectArg = (res.redirect as jest.Mock).mock.calls[0][0] as string;
      expect(redirectArg).not.toContain('token=');
    });
  });

  describe('kakaoCallback', () => {
    it('access_token을 URL 파라미터가 아닌 쿠키로 설정하고 프론트엔드로 리다이렉트한다', async () => {
      const fakeUser = { id: 'u1', email: 'a@test.com', status: 'APPROVED' } as never;
      mockAuthService.login.mockResolvedValue({
        accessToken: 'acc.token',
        refreshToken: 'ref.token',
      });
      const res = makeResponse();

      await controller.kakaoCallback({ user: fakeUser } as never, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'acc.token',
        expect.objectContaining({ httpOnly: false, sameSite: 'strict' }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'ref.token',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
      );
      const redirectArg = (res.redirect as jest.Mock).mock.calls[0][0] as string;
      expect(redirectArg).not.toContain('token=');
    });
  });
});
