import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
  },
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

  // ── handleWebhookEvent ────────────────────────────────────────────────────────

  describe('handleWebhookEvent', () => {
    it('payment_intent.succeeded → Payment COMPLETED, Order PAID로 업데이트', async () => {
      const event = {
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

      await service.handleWebhookEvent(Buffer.from('payload'), 'sig_test');

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'COMPLETED', paidAt: expect.any(Date) },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'PAID' },
      });
    });

    it('결제 실패(payment_intent.payment_failed) → Payment FAILED, 주문 상태 미변경', async () => {
      const event = {
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
