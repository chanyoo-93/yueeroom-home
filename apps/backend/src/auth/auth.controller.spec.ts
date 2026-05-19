import { Test, TestingModule } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';
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

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('access_token과 refresh_token을 httpOnly 쿠키로 설정하고 accessToken을 응답하지 않는다', async () => {
      mockAuthService.register.mockResolvedValue({
        message: '회원가입 신청이 완료되었습니다.',
        accessToken: 'acc.token',
        refreshToken: 'ref.token',
      });
      const res = makeResponse();

      const result = await controller.register(
        {
          email: 'new@test.com',
          password: 'Password1!',
          name: '신규회원',
          termsAgreed: true,
        },
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'acc.token',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'ref.token',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      expect(result).toEqual({ message: '회원가입 신청이 완료되었습니다.' });
      expect(result).not.toHaveProperty('accessToken');
    });
  });

  describe('login', () => {
    it('access_token과 refresh_token을 httpOnly 쿠키로 설정하고 빈 응답을 반환한다', async () => {
      const fakeUser = { id: 'u1', email: 'a@test.com', status: 'APPROVED' } as never;
      mockAuthService.login.mockResolvedValue({
        accessToken: 'acc.token',
        refreshToken: 'ref.token',
      });
      const res = makeResponse();

      const result = await controller.login({ user: fakeUser } as never, res, {
        email: 'a@test.com',
        password: 'Password1!',
      });

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'acc.token',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'ref.token',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      expect(result).toEqual({});
      expect(result).not.toHaveProperty('accessToken');
    });
  });

  describe('refresh', () => {
    it('새 access_token을 httpOnly 쿠키로 설정하고 status만 응답한다', async () => {
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new.acc.token',
        status: UserStatus.APPROVED,
      });
      const res = makeResponse();

      const result = await controller.refresh(
        { cookies: { refresh_token: 'ref.token' } } as never,
        res,
      );

      expect(mockAuthService.refresh).toHaveBeenCalledWith('ref.token');
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'new.acc.token',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      expect(result).toEqual({ status: UserStatus.APPROVED });
      expect(result).not.toHaveProperty('accessToken');
    });
  });

  describe('logout', () => {
    it('access_token과 refresh_token을 모두 clearCookie한다', async () => {
      mockAuthService.logout.mockResolvedValue({ message: '로그아웃 되었습니다.' });
      const res = makeResponse();

      const result = await controller.logout({ sub: 'u1' } as never, res);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      expect(result).toEqual({ message: '로그아웃 되었습니다.' });
    });
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
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'ref.token',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
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
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'ref.token',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      const redirectArg = (res.redirect as jest.Mock).mock.calls[0][0] as string;
      expect(redirectArg).not.toContain('token=');
    });
  });
});
