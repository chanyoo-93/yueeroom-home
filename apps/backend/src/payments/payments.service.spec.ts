import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  status: 'PENDING',
  totalAmount: 50000,
  payment: null,
};

const mockPayment = {
  id: 'payment-1',
  orderId: 'order-1',
  status: 'PENDING',
  amount: 50000,
  paymentMethod: 'stripe',
  paymentKey: 'pi_test_123',
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    upsert: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  refund: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  paymentEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(''),
};

const mockStripePaymentIntent = {
  id: 'pi_test_123',
  client_secret: 'pi_test_123_secret_abc',
  amount: 50000,
  currency: 'krw',
  status: 'requires_payment_method',
};

const mockStripe = {
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'STRIPE_CLIENT', useValue: mockStripe },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
    mockPrisma.paymentEvent.findUnique.mockResolvedValue(null);
    mockPrisma.refund.findFirst.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return arg(mockPrisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
  });

  // ── getUserPayments ─────────────────────────────────────────────────────────

  describe('getUserPayments', () => {
    it('paymentKey 필드를 응답에서 제외한다', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'payment-1',
          orderId: 'order-1',
          status: 'COMPLETED',
          amount: 50000,
          paymentMethod: 'stripe',
          paidAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          order: {
            id: 'order-1',
            userId: 'user-1',
            addressId: 'address-1',
            status: 'DELIVERED',
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
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('findMany 쿼리가 include 없이 select를 사용한다', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await service.getUserPayments('user-1', 1, 10);

      const arg = mockPrisma.payment.findMany.mock.calls[0][0];
      expect(arg.include).toBeUndefined();
      expect(arg.select).toBeDefined();
      expect(arg.select.paymentKey).toBeUndefined();
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

  // ── createPaymentIntent ───────────────────────────────────────────────────────

  describe('createPaymentIntent', () => {
    it('PaymentIntent를 생성하고 clientSecret과 paymentId를 반환한다', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockStripe.paymentIntents.create.mockResolvedValue(mockStripePaymentIntent);
      mockPrisma.payment.upsert.mockResolvedValue(mockPayment);

      const result = await service.createPaymentIntent('user-1', 'order-1');

      // Stripe paymentIntents.create가 올바른 금액·통화로 호출되었는지 확인
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 50000,
        currency: 'krw',
        metadata: { orderId: 'order-1' },
      });

      // Payment 레코드가 upsert로 저장되었는지 확인
      expect(mockPrisma.payment.upsert).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        create: {
          orderId: 'order-1',
          amount: 50000,
          paymentMethod: 'stripe',
          paymentKey: 'pi_test_123',
        },
        update: {
          paymentKey: 'pi_test_123',
          status: 'PENDING',
        },
      });

      expect(result).toEqual({
        clientSecret: 'pi_test_123_secret_abc',
        paymentId: 'payment-1',
      });
    });

    it('존재하지 않는 주문 → NotFoundException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.createPaymentIntent('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('다른 사용자의 주문 → ForbiddenException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, userId: 'other-user' });

      await expect(service.createPaymentIntent('user-1', 'order-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('5만원 이상 + installmentMonths → Stripe에 할부 파라미터 포함', async () => {
      const orderAboveThreshold = { ...mockOrder, totalAmount: 50000 };
      mockPrisma.order.findUnique.mockResolvedValue(orderAboveThreshold);
      mockStripe.paymentIntents.create.mockResolvedValue(mockStripePaymentIntent);
      mockPrisma.payment.upsert.mockResolvedValue(mockPayment);

      await service.createPaymentIntent('user-1', 'order-1', 3);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 50000,
        currency: 'krw',
        metadata: { orderId: 'order-1' },
        payment_method_options: {
          card: {
            installments: {
              enabled: true,
              plan: { type: 'fixed_count', count: 3, interval: 'month' },
            },
          },
        },
      });
    });

    it('5만원 미만 + installmentMonths → Stripe에 할부 파라미터 미포함', async () => {
      const orderBelowThreshold = { ...mockOrder, totalAmount: 49999 };
      mockPrisma.order.findUnique.mockResolvedValue(orderBelowThreshold);
      mockStripe.paymentIntents.create.mockResolvedValue({
        ...mockStripePaymentIntent,
        amount: 49999,
      });
      mockPrisma.payment.upsert.mockResolvedValue({ ...mockPayment, amount: 49999 });

      await service.createPaymentIntent('user-1', 'order-1', 3);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 49999,
        currency: 'krw',
        metadata: { orderId: 'order-1' },
      });
    });

    it('5만원 이상 + installmentMonths 없음 → Stripe에 할부 파라미터 미포함', async () => {
      const orderAboveThreshold = { ...mockOrder, totalAmount: 80000 };
      mockPrisma.order.findUnique.mockResolvedValue(orderAboveThreshold);
      mockStripe.paymentIntents.create.mockResolvedValue({
        ...mockStripePaymentIntent,
        amount: 80000,
      });
      mockPrisma.payment.upsert.mockResolvedValue({ ...mockPayment, amount: 80000 });

      await service.createPaymentIntent('user-1', 'order-1');

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 80000,
        currency: 'krw',
        metadata: { orderId: 'order-1' },
      });
    });

    it('이미 결제된 주문(payment 존재) → BadRequestException', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: { ...mockPayment, status: 'COMPLETED' },
      });

      await expect(service.createPaymentIntent('user-1', 'order-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
    });
  });

  // ── requestRefund ───────────────────────────────────────────────────────────

  describe('requestRefund', () => {
    const completedPayment = {
      ...mockPayment,
      status: 'COMPLETED',
      order: { id: 'order-1', userId: 'user-1' },
    };

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

  // ── handleWebhookEvent ────────────────────────────────────────────────────────

  describe('handleWebhookEvent', () => {
    it('payment_intent.succeeded → Payment COMPLETED, Order PAID로 업데이트', async () => {
      const event = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            metadata: { orderId: 'order-1' },
          },
        },
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'COMPLETED' });
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'PAID' });

      const result = await service.handleWebhookEvent(Buffer.from('payload'), 'sig_test');

      expect(result).toEqual({ received: true });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'COMPLETED', paidAt: expect.any(Date) },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'PAID' },
      });
      expect(mockPrisma.paymentEvent.create).toHaveBeenCalledWith({
        data: {
          externalEventId: 'evt_test_123',
          gateway: 'stripe',
          eventType: 'payment_intent.succeeded',
          paymentId: 'payment-1',
        },
      });
    });

    it('동일 event.id가 이미 처리된 경우 DB update 없이 { received: true }를 반환한다', async () => {
      const event = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            metadata: { orderId: 'order-1' },
          },
        },
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.paymentEvent.findUnique.mockResolvedValue({ id: 'payment-event-1' });

      const result = await service.handleWebhookEvent(Buffer.from('payload'), 'sig_test');

      expect(result).toEqual({ received: true });
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
      expect(mockPrisma.paymentEvent.create).not.toHaveBeenCalled();
    });

    it('결제 실패(payment_intent.payment_failed) → Payment FAILED, 주문 상태 미변경', async () => {
      const event = {
        id: 'evt_failed_123',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            metadata: { orderId: 'order-1' },
          },
        },
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'FAILED' });

      await service.handleWebhookEvent(Buffer.from('payload'), 'sig_test');

      // Payment는 FAILED로 업데이트
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'FAILED' },
      });

      // 주문 상태는 변경되지 않아야 함
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('처리하지 않는 이벤트 타입 → 아무것도 하지 않는다', async () => {
      const event = {
        id: 'evt_customer_123',
        type: 'customer.created',
        data: { object: {} },
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      await service.handleWebhookEvent(Buffer.from('payload'), 'sig_test');

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });
});
