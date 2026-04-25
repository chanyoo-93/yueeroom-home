import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const now = new Date();

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: '$2b$10$hashed',
  name: '홍길동',
  phone: null,
  status: 'APPROVED',
  role: 'CUSTOMER',
  provider: 'LOCAL',
  providerId: null,
  mfaSecret: null,
  mfaEnabled: false,
  consentAt: now,
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
};

// 민감 필드(password, mfaSecret, providerId)가 제외된 안전한 사용자 픽스처
const mockSafeUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: '홍길동',
  phone: null,
  status: 'APPROVED',
  role: 'CUSTOMER',
  provider: 'LOCAL',
  mfaEnabled: false,
  consentAt: now,
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
};

const mockChild = {
  id: 'child-1',
  userId: 'user-1',
  name: '홍아이',
  birthDate: new Date('2022-05-01'),
  gender: null,
  height: null,
  weight: null,
  createdAt: now,
  updatedAt: now,
};

const mockAddress = {
  id: 'addr-1',
  userId: 'user-1',
  name: '집',
  recipient: '홍길동',
  phone: '010-1234-5678',
  zipCode: '12345',
  address1: '서울시 강남구',
  address2: null,
  isDefault: true,
  createdAt: now,
  updatedAt: now,
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  childProfile: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  address: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  // $transaction에 동일한 mock 객체를 전달하여 트랜잭션 내부 호출을 그대로 가로챔
  $transaction: jest
    .fn()
    .mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma)),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
    // clearAllMocks가 $transaction 구현을 지우므로 재설정
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) =>
      fn(mockPrisma),
    );
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('사용자를 조회하여 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.findById('user-1');
      expect(result).toEqual(mockUser);
    });

    it('존재하지 않는 사용자 조회 시 NotFoundException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findById('not-exist')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getProfile ────────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('민감 필드 없이 사용자 프로필을 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockSafeUser);
      const result = await service.getProfile('user-1');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('mfaSecret');
      expect(result).not.toHaveProperty('providerId');
      expect(result.email).toBe('test@example.com');
    });

    it('존재하지 않는 사용자 조회 시 NotFoundException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('not-exist')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateProfile ─────────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('이름과 전화번호를 수정하고 민감 필드를 제외한 사용자를 반환한다', async () => {
      const updatedSafe = { ...mockSafeUser, name: '김철수', phone: '010-9999-8888' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedSafe);

      const result = await service.updateProfile('user-1', {
        name: '김철수',
        phone: '010-9999-8888',
      });

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('mfaSecret');
      expect(result.name).toBe('김철수');
    });
  });

  // ── changePassword ────────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('올바른 현재 비밀번호로 비밀번호를 변경한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
      jest.mocked(bcrypt.hash).mockResolvedValue('$2b$10$newhash' as never);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, password: '$2b$10$newhash' });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'OldPass1!',
          newPassword: 'NewPass1!',
        }),
      ).resolves.toBeUndefined();

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: '$2b$10$newhash' },
      });
    });

    it('현재 비밀번호가 틀리면 UnauthorizedException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.changePassword('user-1', { currentPassword: 'wrong', newPassword: 'NewPass1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('소셜 로그인 계정(password null)은 ForbiddenException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, password: null });

      await expect(
        service.changePassword('user-1', { currentPassword: 'any', newPassword: 'NewPass1!' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('새 비밀번호가 현재와 동일하면 BadRequestException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'SamePass1!',
          newPassword: 'SamePass1!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── 자녀 정보 ─────────────────────────────────────────────────────────────────

  describe('getChildren', () => {
    it('자녀 목록을 반환한다', async () => {
      mockPrisma.childProfile.findMany.mockResolvedValue([mockChild]);
      const result = await service.getChildren('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('addChild', () => {
    it('자녀 정보를 생성하여 반환한다', async () => {
      mockPrisma.childProfile.create.mockResolvedValue(mockChild);
      const result = await service.addChild('user-1', {
        name: '홍아이',
        birthDate: '2022-05-01',
      });
      expect(result).toEqual(mockChild);
      expect(mockPrisma.childProfile.create).toHaveBeenCalled();
    });
  });

  describe('updateChild', () => {
    it('자녀 정보를 수정하여 반환한다', async () => {
      mockPrisma.childProfile.findUnique.mockResolvedValue(mockChild);
      mockPrisma.childProfile.update.mockResolvedValue({ ...mockChild, name: '홍아이2' });

      const result = await service.updateChild('user-1', 'child-1', { name: '홍아이2' });
      expect(result.name).toBe('홍아이2');
    });

    it('다른 사용자의 자녀 수정 시 NotFoundException을 던진다', async () => {
      mockPrisma.childProfile.findUnique.mockResolvedValue({
        ...mockChild,
        userId: 'other-user',
      });
      await expect(service.updateChild('user-1', 'child-1', { name: '홍아이2' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeChild', () => {
    it('자녀 정보를 삭제한다', async () => {
      mockPrisma.childProfile.findUnique.mockResolvedValue(mockChild);
      mockPrisma.childProfile.delete.mockResolvedValue(mockChild);

      await service.removeChild('user-1', 'child-1');
      expect(mockPrisma.childProfile.delete).toHaveBeenCalledWith({ where: { id: 'child-1' } });
    });
  });

  // ── 배송지 ────────────────────────────────────────────────────────────────────

  describe('getAddresses', () => {
    it('배송지 목록을 반환한다', async () => {
      mockPrisma.address.findMany.mockResolvedValue([mockAddress]);
      const result = await service.getAddresses('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('addAddress', () => {
    it('첫 배송지는 자동으로 기본 배송지로 설정된다', async () => {
      mockPrisma.address.count.mockResolvedValue(0);
      mockPrisma.address.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.address.create.mockResolvedValue(mockAddress);

      const result = await service.addAddress('user-1', {
        name: '집',
        recipient: '홍길동',
        phone: '010-1234-5678',
        zipCode: '12345',
        address1: '서울시 강남구',
      });

      expect(result.isDefault).toBe(true);
    });

    it('isDefault: true로 추가하면 기존 기본 배송지를 해제한다', async () => {
      mockPrisma.address.count.mockResolvedValue(2);
      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.address.create.mockResolvedValue({ ...mockAddress, id: 'addr-2' });

      await service.addAddress('user-1', {
        name: '회사',
        recipient: '홍길동',
        phone: '010-1234-5678',
        zipCode: '54321',
        address1: '서울시 서초구',
        isDefault: true,
      });

      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('removeAddress', () => {
    it('기본 배송지를 삭제하면 다음 배송지를 기본으로 승격한다', async () => {
      const nextAddr = { ...mockAddress, id: 'addr-2', isDefault: false };
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress); // isDefault: true
      mockPrisma.address.delete.mockResolvedValue(mockAddress);
      mockPrisma.address.findFirst.mockResolvedValue(nextAddr);
      mockPrisma.address.update.mockResolvedValue({ ...nextAddr, isDefault: true });

      await service.removeAddress('user-1', 'addr-1');

      expect(mockPrisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-2' },
        data: { isDefault: true },
      });
    });

    it('존재하지 않는 배송지 삭제 시 NotFoundException을 던진다', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(null);
      await expect(service.removeAddress('user-1', 'not-exist')).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteAccount ─────────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('개인정보를 익명화하고 deletedAt을 설정한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({});

      await service.deleteAccount('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          email: 'deleted_user-1@deleted.com',
          name: '탈퇴회원',
          phone: null,
          password: null,
          providerId: null,
          mfaSecret: null,
          mfaEnabled: false,
          status: 'SUSPENDED',
          deletedAt: expect.any(Date),
        }),
      });
    });

    it('존재하지 않는 사용자 탈퇴 시 NotFoundException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.deleteAccount('not-exist')).rejects.toThrow(NotFoundException);
    });
  });
});
