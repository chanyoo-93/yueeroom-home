import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthProvider, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';

// ── Test fixtures ──────────────────────────────────────────────────────────────

const mockApprovedUser = {
  id: 'user-1',
  email: 'approved@test.com',
  password: '$2a$12$hashedpassword',
  name: '홍길동',
  phone: null,
  status: UserStatus.APPROVED,
  role: UserRole.CUSTOMER,
  provider: AuthProvider.LOCAL,
  providerId: null,
  mfaSecret: null,
  mfaEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPendingUser = { ...mockApprovedUser, id: 'user-2', status: UserStatus.PENDING };
const mockRejectedUser = { ...mockApprovedUser, id: 'user-3', status: UserStatus.REJECTED };

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn(),
};

const mockRedisService = {
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  del: jest.fn().mockResolvedValue(undefined),
};

const mockEmailService = {
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendApprovalEmail: jest.fn().mockResolvedValue(undefined),
  sendRejectionEmail: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret'),
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.sign.mockReturnValue('mock.jwt.token');
  });

  // ── register ──────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('유효한 입력으로 회원가입 신청 시 PENDING 상태로 생성된다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockPendingUser);

      const result = await service.register({
        email: 'new@test.com',
        password: 'Password1!',
        name: '신규회원',
      });

      expect(result.message).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: UserStatus.PENDING }),
        }),
      );
    });

    it('중복 이메일로 가입 시 ConflictException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockApprovedUser);

      await expect(
        service.register({ email: 'approved@test.com', password: 'Password1!', name: '홍길동' }),
      ).rejects.toThrow(ConflictException);
    });

    it('비밀번호는 bcrypt로 해싱된다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockPendingUser);

      await service.register({ email: 'new@test.com', password: 'Password1!', name: '신규' });

      const createCall = mockPrisma.user.create.mock.calls[0] as [{ data: { password: string } }];
      const hashedPw = createCall[0].data.password;
      expect(hashedPw).not.toBe('Password1!');
      expect(await bcrypt.compare('Password1!', hashedPw)).toBe(true);
    });
  });

  // ── validateLocalUser ─────────────────────────────────────────────────────────

  describe('validateLocalUser', () => {
    it('올바른 이메일/비밀번호면 User를 반환한다', async () => {
      const hashed = await bcrypt.hash('Password1!', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockApprovedUser, password: hashed });

      const result = await service.validateLocalUser('approved@test.com', 'Password1!');
      expect(result).not.toBeNull();
    });

    it('잘못된 비밀번호면 null을 반환한다', async () => {
      const hashed = await bcrypt.hash('Password1!', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockApprovedUser, password: hashed });

      const result = await service.validateLocalUser('approved@test.com', 'WrongPass!');
      expect(result).toBeNull();
    });

    it('존재하지 않는 이메일이면 null을 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.validateLocalUser('none@test.com', 'Password1!');
      expect(result).toBeNull();
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('APPROVED 회원은 accessToken과 refreshToken을 발급받는다', async () => {
      const result = await service.login(mockApprovedUser);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `refresh:${mockApprovedUser.id}`,
        expect.any(String),
        expect.any(Number),
      );
    });

    it('PENDING 회원 로그인 시 ForbiddenException을 던진다', async () => {
      await expect(service.login(mockPendingUser)).rejects.toThrow(ForbiddenException);
    });

    it('REJECTED 회원 로그인 시 ForbiddenException을 던진다', async () => {
      await expect(service.login(mockRejectedUser)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('유효한 Refresh Token으로 새 Access Token을 발급한다', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'approved@test.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.APPROVED,
      });
      mockRedisService.get.mockResolvedValue('valid.refresh.token');

      const result = await service.refresh('valid.refresh.token');
      expect(result.accessToken).toBeDefined();
    });

    it('Redis에 없는 Refresh Token 사용 시 UnauthorizedException을 던진다', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });
      mockRedisService.get.mockResolvedValue('different.token');

      await expect(service.refresh('expired.token')).rejects.toThrow(UnauthorizedException);
    });

    it('만료된 Refresh Token 사용 시 UnauthorizedException을 던진다', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refresh('expired.refresh.token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('로그아웃 시 Redis에서 Refresh Token을 삭제한다', async () => {
      const result = await service.logout('user-1');
      expect(mockRedisService.del).toHaveBeenCalledWith('refresh:user-1');
      expect(result.message).toBeDefined();
    });
  });

  // ── findOrCreateSocialUser ────────────────────────────────────────────────────

  describe('findOrCreateSocialUser', () => {
    it('최초 소셜 로그인 시 PENDING 상태로 신규 생성한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockPendingUser);

      await service.findOrCreateSocialUser({
        provider: 'NAVER',
        providerId: 'naver-123',
        email: 'naver@test.com',
        name: '네이버유저',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: UserStatus.PENDING }),
        }),
      );
    });

    it('기존 소셜 계정이면 기존 User를 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockApprovedUser);

      const result = await service.findOrCreateSocialUser({
        provider: 'KAKAO',
        providerId: 'kakao-456',
        email: 'kakao@test.com',
        name: '카카오유저',
      });

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockApprovedUser);
    });
  });
});
