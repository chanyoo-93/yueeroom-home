import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

const mockPayment = {
  id: 'payment-1',
  orderId: 'order-1',
  status: 'PENDING',
  amount: 50000,
  paymentMethod: 'kcpeasypay',
  paymentKey: 'kcp-tno-001',
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  payment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  refund: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
    mockPrisma.refund.findFirst.mockResolvedValue(null);
  });

  describe('getUserPayments', () => {
    it('paymentKey 필드를 응답에서 제외하고 가상계좌 필드를 포함한다', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'payment-1',
          orderId: 'order-1',
          status: 'AWAITING_DEPOSIT',
          amount: 50000,
          paymentMethod: 'kcpeasypay',
          paidAt: null,
          virtualAccountNumber: '1234567890',
          virtualBankName: '국민은행',
          virtualAccountExpiry: new Date('2026-06-10T06:00:00.000Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          order: {
            id: 'order-1',
            userId: 'user-1',
            addressId: 'address-1',
            status: 'PENDING',
            totalAmount: 50000,
            shippingFee: 0,
            carrier: null,
            trackingNumber: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            items: [],
          },
        },
      ]);
      mockPrisma.payment.count.mockResolvedValue(1);

      const result = await service.getUserPayments('user-1', 1, 10);

      expect(result.items[0]).not.toHaveProperty('paymentKey');
      expect(result.items[0]).toHaveProperty('virtualAccountNumber', '1234567890');
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('findMany 쿼리가 include 없이 select를 사용한다', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await service.getUserPayments('user-1', 1, 10);

      const arg = mockPrisma.payment.findMany.mock.calls[0][0];
      expect(arg.include).toBeUndefined();
      expect(arg.select.paymentKey).toBeUndefined();
      expect(arg.select).toEqual(
        expect.objectContaining({
          virtualAccountNumber: true,
          virtualBankName: true,
          virtualAccountExpiry: true,
        }),
      );
      const variantSelect = arg.select.order.select.items.select.variant.select;
      expect(variantSelect).toEqual(
        expect.objectContaining({
          id: true,
          productId: true,
          size: true,
          color: true,
          sku: true,
          price: true,
          createdAt: true,
          updatedAt: true,
        }),
      );
      expect(variantSelect.product.select).toEqual(
        expect.objectContaining({
          id: true,
          productCode: true,
          categoryId: true,
          brandId: true,
          name: true,
          description: true,
          basePrice: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          images: expect.any(Object),
        }),
      );
    });
  });

  describe('requestRefund', () => {
    const completedPayment = {
      ...mockPayment,
      status: 'COMPLETED',
      order: { id: 'order-1', userId: 'user-1' },
    };

    it('결제가 없으면 NotFoundException을 던진다', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.requestRefund('user-1', 'payment-x', '단순 변심')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('타인 결제면 ForbiddenException을 던진다', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        order: { id: 'order-1', userId: 'other-user' },
      });

      await expect(service.requestRefund('user-1', 'payment-1', '단순 변심')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('COMPLETED 상태가 아니면 BadRequestException을 던진다', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        status: 'PENDING',
      });

      await expect(service.requestRefund('user-1', 'payment-1', '단순 변심')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('환불 요청을 생성한다', async () => {
      const refund = {
        id: 'refund-1',
        orderId: 'order-1',
        paymentId: 'payment-1',
        amount: 50000,
        reason: '단순 변심',
        status: 'REQUESTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.payment.findUnique.mockResolvedValue(completedPayment);
      mockPrisma.refund.create.mockResolvedValue(refund);

      await expect(service.requestRefund('user-1', 'payment-1', '단순 변심')).resolves.toBe(refund);
      expect(mockPrisma.refund.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          paymentId: 'payment-1',
          amount: 50000,
          reason: '단순 변심',
        },
      });
    });

    it('REQUESTED 상태 Refund가 있으면 ConflictException을 던진다', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(completedPayment);
      mockPrisma.refund.findFirst.mockResolvedValue({ id: 'refund-1', status: 'REQUESTED' });

      await expect(service.requestRefund('user-1', 'payment-1', '단순 변심')).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.refund.findFirst).toHaveBeenCalledWith({
        where: {
          paymentId: 'payment-1',
          status: { in: ['REQUESTED', 'COMPLETED'] },
        },
      });
      expect(mockPrisma.refund.create).not.toHaveBeenCalled();
    });

    it('COMPLETED 상태 Refund가 있으면 ConflictException을 던진다', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(completedPayment);
      mockPrisma.refund.findFirst.mockResolvedValue({ id: 'refund-1', status: 'COMPLETED' });

      await expect(service.requestRefund('user-1', 'payment-1', '단순 변심')).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.refund.create).not.toHaveBeenCalled();
    });
  });
});
