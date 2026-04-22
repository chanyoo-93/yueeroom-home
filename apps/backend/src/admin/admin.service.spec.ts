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
    count: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};

const mockEmailService = {
  sendApprovalEmail: jest.fn().mockResolvedValue(undefined),
  sendRejectionEmail: jest.fn().mockResolvedValue(undefined),
  sendOrderStatusEmail: jest.fn().mockResolvedValue(undefined),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-22T12:00:00Z'));

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

  afterEach(() => {
    jest.useRealTimers();
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

  // ── suspendUser ───────────────────────────────────────────────────────────────

  describe('suspendUser', () => {
    it('관리자가 APPROVED 회원을 정지하면 SUSPENDED 상태가 된다', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockApprovedUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockApprovedUser,
        status: UserStatus.SUSPENDED,
      });

      const result = await service.suspendUser('admin-1', 'user-2');
      expect(result.status).toBe(UserStatus.SUSPENDED);
    });

    it('비관리자가 정지 요청 시 ForbiddenException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockPendingUser,
        role: UserRole.CUSTOMER,
      });

      await expect(service.suspendUser('user-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('APPROVED가 아닌 회원 정지 시 BadRequestException을 던진다', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockPendingUser);

      await expect(service.suspendUser('admin-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('존재하지 않는 사용자 정지 시 NotFoundException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin).mockResolvedValueOnce(null);

      await expect(service.suspendUser('admin-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('관리자가 자기 자신을 정지하려는 경우 BadRequestException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin).mockResolvedValueOnce(mockAdmin);

      await expect(service.suspendUser('admin-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── restoreUser ───────────────────────────────────────────────────────────────

  describe('restoreUser', () => {
    const mockSuspendedUser = { ...mockApprovedUser, id: 'user-3', status: UserStatus.SUSPENDED };

    it('관리자가 SUSPENDED 회원을 복구하면 APPROVED 상태가 된다', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockSuspendedUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockSuspendedUser,
        status: UserStatus.APPROVED,
      });

      const result = await service.restoreUser('admin-1', 'user-3');
      expect(result.status).toBe(UserStatus.APPROVED);
    });

    it('비관리자가 복구 요청 시 ForbiddenException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockPendingUser,
        role: UserRole.CUSTOMER,
      });

      await expect(service.restoreUser('user-1', 'user-3')).rejects.toThrow(ForbiddenException);
    });

    it('SUSPENDED가 아닌 회원 복구 시 BadRequestException을 던진다', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockApprovedUser);

      await expect(service.restoreUser('admin-1', 'user-2')).rejects.toThrow(BadRequestException);
    });

    it('존재하지 않는 사용자 복구 시 NotFoundException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin).mockResolvedValueOnce(null);

      await expect(service.restoreUser('admin-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
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
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockApprovedUser);
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

    it('상태 변경 성공 시 회원 이메일 알림을 발송한다', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockApprovedUser);
      mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder);
      mockPrisma.order.update.mockResolvedValueOnce({
        ...baseOrder,
        status: OrderStatus.DELIVERED,
      });

      await service.updateOrderStatus('admin-1', 'order-1', { status: OrderStatus.DELIVERED });

      expect(mockEmailService.sendOrderStatusEmail).toHaveBeenCalledWith(
        mockApprovedUser.email,
        mockApprovedUser.name,
        'order-1',
        OrderStatus.DELIVERED,
      );
    });

    it('존재하지 않는 주문 변경 시 NotFoundException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.order.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateOrderStatus('admin-1', 'nonexistent', { status: OrderStatus.SHIPPING }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── listOrders ────────────────────────────────────────────────────────────────

  describe('listOrders', () => {
    const orderWithUser = {
      id: 'order-1',
      userId: 'user-2',
      addressId: 'addr-1',
      status: OrderStatus.PAID,
      totalAmount: 20000,
      shippingFee: 0,
      carrier: null,
      trackingNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'user-2', email: 'user@test.com', name: '테스터' },
    };

    it('주문 목록을 페이지네이션하여 반환한다', async () => {
      mockPrisma.order.findMany.mockResolvedValueOnce([orderWithUser]);
      mockPrisma.order.count.mockResolvedValueOnce(1);
      mockPrisma.$transaction.mockImplementationOnce((args: Promise<unknown>[]) =>
        Promise.all(args),
      );

      const result = await service.listOrders(1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.items[0].user.email).toBe('user@test.com');
    });

    it('빈 목록을 올바르게 반환한다', async () => {
      mockPrisma.order.findMany.mockResolvedValueOnce([]);
      mockPrisma.order.count.mockResolvedValueOnce(0);
      mockPrisma.$transaction.mockImplementationOnce((args: Promise<unknown>[]) =>
        Promise.all(args),
      );

      const result = await service.listOrders(1, 20);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // ── getSalesStats ─────────────────────────────────────────────────────────────

  describe('getSalesStats', () => {
    it('일별/월별 매출 및 인기 상품 통계를 반환한다', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          { date: '2026-04-22', revenue: BigInt(150000), orderCount: BigInt(3) },
        ])
        .mockResolvedValueOnce([
          { month: '2026-04', revenue: BigInt(500000), orderCount: BigInt(10) },
        ])
        .mockResolvedValueOnce([
          { id: 'prod-1', name: '티셔츠', totalSold: BigInt(20), totalRevenue: BigInt(400000) },
        ]);

      const result = await service.getSalesStats();

      expect(result.daily).toHaveLength(30);
      const todayEntry = result.daily.find((d) => d.date === '2026-04-22');
      expect(todayEntry?.revenue).toBe(150000);
      expect(todayEntry?.orderCount).toBe(3);
      const missingEntry = result.daily.find((d) => d.date === '2026-04-21');
      expect(missingEntry?.revenue).toBe(0);
      expect(result.monthly[0].month).toBe('2026-04');
      expect(result.monthly[0].revenue).toBe(500000);
      expect(result.topProducts[0].name).toBe('티셔츠');
      expect(result.topProducts[0].totalSold).toBe(20);
    });

    it('데이터가 없으면 30일 분량의 빈 일별 데이터를 반환한다', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getSalesStats();

      expect(result.daily).toHaveLength(30);
      expect(result.daily.every((d) => d.revenue === 0 && d.orderCount === 0)).toBe(true);
      expect(result.monthly).toHaveLength(0);
      expect(result.topProducts).toHaveLength(0);
    });
  });

  // ── getOrderStats ─────────────────────────────────────────────────────────────

  describe('getOrderStats', () => {
    it('주문 상태별 통계와 승인 대기 회원 수를 반환한다', async () => {
      mockPrisma.order.groupBy.mockResolvedValueOnce([
        { status: OrderStatus.PENDING, _count: { id: 5 } },
        { status: OrderStatus.PAID, _count: { id: 3 } },
        { status: OrderStatus.DELIVERED, _count: { id: 10 } },
      ]);
      mockPrisma.order.count.mockResolvedValueOnce(18);
      mockPrisma.user.count.mockResolvedValueOnce(7);

      const result = await service.getOrderStats();

      expect(result.statusBreakdown[OrderStatus.PENDING]).toBe(5);
      expect(result.statusBreakdown[OrderStatus.PAID]).toBe(3);
      expect(result.statusBreakdown[OrderStatus.DELIVERED]).toBe(10);
      expect(result.totalOrders).toBe(18);
      expect(result.pendingUsersCount).toBe(7);
    });

    it('주문이 없으면 빈 statusBreakdown을 반환한다', async () => {
      mockPrisma.order.groupBy.mockResolvedValueOnce([]);
      mockPrisma.order.count.mockResolvedValueOnce(0);
      mockPrisma.user.count.mockResolvedValueOnce(0);

      const result = await service.getOrderStats();

      expect(result.statusBreakdown).toEqual({});
      expect(result.totalOrders).toBe(0);
      expect(result.pendingUsersCount).toBe(0);
    });
  });

  // ── updateOrderTracking ───────────────────────────────────────────────────────

  describe('updateOrderTracking', () => {
    const baseOrder = {
      id: 'order-1',
      userId: 'user-2',
      addressId: 'addr-1',
      status: OrderStatus.SHIPPING,
      totalAmount: 10000,
      shippingFee: 0,
      carrier: null,
      trackingNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('관리자가 송장번호를 업데이트할 수 있다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder);
      const updated = { ...baseOrder, carrier: 'CJ대한통운', trackingNumber: '111222' };
      mockPrisma.order.update.mockResolvedValueOnce(updated);

      const result = await service.updateOrderTracking('admin-1', 'order-1', {
        carrier: 'CJ대한통운',
        trackingNumber: '111222',
      });

      expect(result.carrier).toBe('CJ대한통운');
      expect(result.trackingNumber).toBe('111222');
    });

    it('완료된 주문의 송장번호 변경 시 BadRequestException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        ...baseOrder,
        status: OrderStatus.DELIVERED,
      });

      await expect(
        service.updateOrderTracking('admin-1', 'order-1', {
          carrier: 'CJ대한통운',
          trackingNumber: '111222',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('존재하지 않는 주문 송장 변경 시 NotFoundException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.order.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateOrderTracking('admin-1', 'nonexistent', {
          carrier: 'CJ대한통운',
          trackingNumber: '111222',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('비관리자가 요청 시 ForbiddenException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockPendingUser,
        role: UserRole.CUSTOMER,
      });

      await expect(
        service.updateOrderTracking('user-1', 'order-1', {
          carrier: 'CJ대한통운',
          trackingNumber: '111222',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
