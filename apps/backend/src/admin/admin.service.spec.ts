import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, UserRole, UserStatus, AuthProvider } from '@prisma/client';
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
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
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

  // ── listUsers ─────────────────────────────────────────────────────────────────

  describe('listUsers', () => {
    it('status 없이 호출하면 전체 회원 목록을 반환한다', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockPendingUser, mockApprovedUser]);

      const result = await service.listUsers();
      expect(result).toHaveLength(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'asc' },
      });
    });

    it('status 필터로 PENDING 회원만 반환한다', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockPendingUser]);

      const result = await service.listUsers(UserStatus.PENDING);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(UserStatus.PENDING);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { status: UserStatus.PENDING },
        orderBy: { createdAt: 'asc' },
      });
    });
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

  // ── updateOrderStatus ─────────────────────────────────────────────────────────

  describe('updateOrderStatus', () => {
    const baseOrder = {
      id: 'order-1',
      userId: 'user-1',
      addressId: 'addr-1',
      status: OrderStatus.PAID,
      totalAmount: 10000,
      shippingFee: 0,
      carrier: null,
      trackingNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('DELIVERED 상태 주문의 상태 변경 시 BadRequestException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        ...baseOrder,
        status: OrderStatus.DELIVERED,
      });

      await expect(
        service.updateOrderStatus('admin-1', 'order-1', { status: OrderStatus.PAID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('CANCELLED 상태 주문의 상태 변경 시 BadRequestException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        ...baseOrder,
        status: OrderStatus.CANCELLED,
      });

      await expect(
        service.updateOrderStatus('admin-1', 'order-1', { status: OrderStatus.PAID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('REFUNDED 상태 주문의 상태 변경 시 BadRequestException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        ...baseOrder,
        status: OrderStatus.REFUNDED,
      });

      await expect(
        service.updateOrderStatus('admin-1', 'order-1', { status: OrderStatus.PAID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('SHIPPING 전환 시 carrier 없으면 BadRequestException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder);

      await expect(
        service.updateOrderStatus('admin-1', 'order-1', {
          status: OrderStatus.SHIPPING,
          trackingNumber: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('SHIPPING 전환 시 trackingNumber 없으면 BadRequestException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder);

      await expect(
        service.updateOrderStatus('admin-1', 'order-1', {
          status: OrderStatus.SHIPPING,
          carrier: 'CJ대한통운',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('SHIPPING 전환 시 carrier와 trackingNumber가 있으면 성공한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder);
      const updatedOrder = {
        ...baseOrder,
        status: OrderStatus.SHIPPING,
        carrier: 'CJ대한통운',
        trackingNumber: '123456',
      };
      mockPrisma.order.update.mockResolvedValueOnce(updatedOrder);

      const result = await service.updateOrderStatus('admin-1', 'order-1', {
        status: OrderStatus.SHIPPING,
        carrier: 'CJ대한통운',
        trackingNumber: '123456',
      });
      expect(result.status).toBe(OrderStatus.SHIPPING);
    });

    it('존재하지 않는 주문 변경 시 NotFoundException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.order.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateOrderStatus('admin-1', 'nonexistent', { status: OrderStatus.SHIPPING }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
