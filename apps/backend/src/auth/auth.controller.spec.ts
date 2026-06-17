import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, UserStatus } from '@prisma/client';
import type { Response } from 'express';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SocialKakaoAuthGuard, SocialNaverAuthGuard } from './guards/social-auth.guard';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

const GUARDS_METADATA_KEY = '__guards__';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  issuePendingSession: jest.fn(),
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

function makeContext(user: JwtPayload): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function getMethodGuards(
  methodName: 'setupMfa' | 'verifyMfa' | 'naverCallback' | 'kakaoCallback',
): unknown[] {
  return Reflect.getMetadata(GUARDS_METADATA_KEY, AuthController.prototype[methodName]) ?? [];
}

function getPublicMetadata(methodName: keyof AuthController): boolean | undefined {
  return Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype[methodName] as object) as
    | boolean
    | undefined;
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

  describe('setupMfa', () => {
    it('ADMIN 사용자는 authService.setupMfa를 호출하고 기존 응답을 반환한다', async () => {
      const user: JwtPayload = {
        sub: 'admin-1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        status: UserStatus.APPROVED,
      };
      mockAuthService.setupMfa.mockResolvedValue({
        secret: 'totp-secret',
        qrCodeUrl: 'otpauth://totp/yueeroom',
      });

      const result = await controller.setupMfa(user);

      expect(mockAuthService.setupMfa).toHaveBeenCalledWith('admin-1');
      expect(result).toEqual({
        secret: 'totp-secret',
        qrCodeUrl: 'otpauth://totp/yueeroom',
      });
    });

    it('AdminGuard가 적용되어 있다', () => {
      expect(getMethodGuards('setupMfa')).toContain(AdminGuard);
    });
  });

  describe('verifyMfa', () => {
    it('ADMIN 사용자는 authService.verifyMfa를 호출하고 기존 응답을 반환한다', async () => {
      const user: JwtPayload = {
        sub: 'admin-1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        status: UserStatus.APPROVED,
      };
      mockAuthService.verifyMfa.mockResolvedValue({ message: 'MFA 인증이 완료되었습니다.' });

      const result = await controller.verifyMfa(user, { code: '123456' });

      expect(mockAuthService.verifyMfa).toHaveBeenCalledWith('admin-1', '123456');
      expect(result).toEqual({ message: 'MFA 인증이 완료되었습니다.' });
    });

    it('AdminGuard가 적용되어 있다', () => {
      expect(getMethodGuards('verifyMfa')).toContain(AdminGuard);
    });
  });

  describe('AdminGuard authorization for admin MFA', () => {
    it('CUSTOMER payload를 ForbiddenException으로 거부한다', () => {
      const guard = new AdminGuard();
      const customer: JwtPayload = {
        sub: 'customer-1',
        email: 'customer@test.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.APPROVED,
      };

      expect(() => guard.canActivate(makeContext(customer))).toThrow(ForbiddenException);
    });
  });

  describe('공개 API @Public() 메타데이터 검증', () => {
    it.each([
      ['register'],
      ['login'],
      ['refresh'],
      ['forgotPassword'],
      ['resetPassword'],
      ['naverLogin'],
      ['naverCallback'],
      ['kakaoLogin'],
      ['kakaoCallback'],
    ] as const)('%s는 @Public()이 적용되어 있다', (methodName) => {
      expect(getPublicMetadata(methodName)).toBe(true);
    });

    it.each([['logout'], ['setupMfa'], ['verifyMfa']] as const)(
      '%s는 @Public()이 적용되어 있지 않다',
      (methodName) => {
        expect(getPublicMetadata(methodName)).toBeUndefined();
      },
    );
  });

  describe('소셜 OAuth Guard 설정', () => {
    it('네이버 콜백은 소셜 실패 리다이렉트 Guard를 사용한다', () => {
      expect(getMethodGuards('naverCallback')).toContain(SocialNaverAuthGuard);
    });

    it('카카오 콜백은 소셜 실패 리다이렉트 Guard를 사용한다', () => {
      expect(getMethodGuards('kakaoCallback')).toContain(SocialKakaoAuthGuard);
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

    it('PENDING 소셜 사용자는 pending 쿠키를 설정하고 /pending으로 리다이렉트한다', async () => {
      const fakeUser = {
        id: 'pending-1',
        email: 'pending@test.com',
        status: UserStatus.PENDING,
      } as never;
      mockAuthService.issuePendingSession.mockResolvedValue({
        accessToken: 'pending.acc',
        refreshToken: 'pending.ref',
      });
      const res = makeResponse();

      await controller.naverCallback({ user: fakeUser } as never, res);

      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(mockAuthService.issuePendingSession).toHaveBeenCalledWith(fakeUser);
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'pending.acc',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'pending.ref',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/pending');
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

    it.each([
      [UserStatus.REJECTED, 'rejected'],
      [UserStatus.SUSPENDED, 'suspended'],
    ] as const)('%s 소셜 사용자는 로그인 오류로 리다이렉트한다', async (status, errorCode) => {
      const fakeUser = {
        id: 'blocked-1',
        email: 'blocked@test.com',
        status,
      } as never;
      const res = makeResponse();

      await controller.kakaoCallback({ user: fakeUser } as never, res);

      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(mockAuthService.issuePendingSession).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(`http://localhost:3000/login?error=${errorCode}`);
    });
  });
});
