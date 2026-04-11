import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, UserStatus, AuthProvider } from '@prisma/client';
import { AdminService } from './admin.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

const base = {
  phone: null,
  provider: AuthProvider.LOCAL,
  providerId: null,
  mfaSecret: null,
  mfaEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAdmin = {
  ...base,
  id: 'admin-1',
  email: 'admin@test.com',
  name: '관리자',
  password: 'hashed',
  role: UserRole.ADMIN,
  status: UserStatus.APPROVED,
};
const mockPendingUser = {
  ...base,
  id: 'user-1',
  email: 'user@test.com',
  name: '신청자',
  password: 'hashed',
  role: UserRole.CUSTOMER,
  status: UserStatus.PENDING,
};
const mockApprovedUser = { ...mockPendingUser, id: 'user-2', status: UserStatus.APPROVED };

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockEmailService = {
  sendApprovalEmail: jest.fn().mockResolvedValue(undefined),
  sendRejectionEmail: jest.fn().mockResolvedValue(undefined),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  // ── approveUser ───────────────────────────────────────────────────────────────

  describe('approveUser', () => {
    it('관리자가 PENDING 회원을 승인하면 APPROVED 상태가 된다', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockPendingUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockPendingUser, status: UserStatus.APPROVED });

      const result = await service.approveUser('admin-1', 'user-1');
      expect(result.status).toBe(UserStatus.APPROVED);
      expect(mockEmailService.sendApprovalEmail).toHaveBeenCalledWith(
        mockPendingUser.email,
        mockPendingUser.name,
      );
    });

    it('비관리자가 승인 요청 시 ForbiddenException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockPendingUser,
        role: UserRole.CUSTOMER,
      });

      await expect(service.approveUser('user-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('이미 APPROVED 상태 회원 승인 시 BadRequestException을 던진다', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockApprovedUser);

      await expect(service.approveUser('admin-1', 'user-2')).rejects.toThrow(BadRequestException);
    });

    it('존재하지 않는 사용자 승인 시 NotFoundException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin).mockResolvedValueOnce(null);

      await expect(service.approveUser('admin-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── rejectUser ────────────────────────────────────────────────────────────────

  describe('rejectUser', () => {
    it('관리자가 PENDING 회원을 거절하면 REJECTED 상태가 된다', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockPendingUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockPendingUser, status: UserStatus.REJECTED });

      const result = await service.rejectUser('admin-1', 'user-1');
      expect(result.status).toBe(UserStatus.REJECTED);
      expect(mockEmailService.sendRejectionEmail).toHaveBeenCalled();
    });

    it('비관리자가 거절 요청 시 ForbiddenException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockPendingUser,
        role: UserRole.CUSTOMER,
      });

      await expect(service.rejectUser('user-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('이미 처리된 회원 거절 시 BadRequestException을 던진다', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockApprovedUser);

      await expect(service.rejectUser('admin-1', 'user-2')).rejects.toThrow(BadRequestException);
    });
  });
});
