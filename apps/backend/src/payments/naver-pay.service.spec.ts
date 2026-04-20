import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NaverPayService } from './naver-pay.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  status: 'PENDING',
  totalAmount: 50000,
  payment: null,
  items: [
    {
      variant: {
        product: { name: '아동 원피스' },
      },
    },
  ],
};

const mockPayment = {
  id: 'payment-1',
  orderId: 'order-1',
  status: 'PENDING',
  amount: 50000,
  paymentMethod: 'naverpay',
  paymentKey: 'np_payment_123',
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrepareApiResponse = {
  code: 'Success',
  message: '정상 처리되었습니다.',
  body: {
    paymentId: 'np_payment_123',
    merchantPayKey: 'order-1',
    paymentURL: 'https://pay.naver.com/o/naverpay/process/payment?orderToken=test',
  },
};

const mockApplyApiResponse = {
  code: 'Success',
  message: '정상 처리되었습니다.',
  body: {
    paymentId: 'np_payment_123',
    merchantPayKey: 'order-1',
    totalPayAmount: 50000,
    paymentStatus: 'SUCCESS',
    merchantId: 'test_merchant',
    productName: '아동 원피스',
  },
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
  },
  $transaction: jest.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string, defaultVal = '') => {
    const configs: Record<string, string> = {
      FRONTEND_URL: 'http://localhost:3000',
      NAVER_PAY_CHAIN_ID: 'test_chain_id',
      NAVER_CLIENT_ID: 'test_client_id',
      NAVER_CLIENT_SECRET: 'test_client_secret',
    };
    return configs[key] ?? defaultVal;
  }),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NaverPayService', () => {
  let service: NaverPayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NaverPayService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NaverPayService>(NaverPayService);
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  // ── preparePayment ────────────────────────────────────────────────────────────

  describe('preparePayment', () => {
    it('결제 준비 성공 → paymentId, merchantPayKey, paymentURL 반환', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPrepareApiResponse),
      });
      mockPrisma.payment.upsert.mockResolvedValue(mockPayment);

      const result = await service.preparePayment('user-1', 'order-1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/payments/v2.2/reserve'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-NaverPay-Chain-Id': 'test_chain_id',
          }),
        }),
      );
      expect(mockPrisma.payment.upsert).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        create: expect.objectContaining({ paymentMethod: 'naverpay', orderId: 'order-1' }),
        update: expect.objectContaining({ paymentKey: 'np_payment_123', status: 'PENDING' }),
      });
      expect(result).toEqual({
        paymentId: 'np_payment_123',
        merchantPayKey: 'order-1',
        paymentURL: expect.stringContaining('naver.com'),
      });
    });

    it('존재하지 않는 주문 → NotFoundException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.preparePayment('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('다른 사용자의 주문 → ForbiddenException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, userId: 'other-user' });

      await expect(service.preparePayment('user-1', 'order-1')).rejects.toThrow(ForbiddenException);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('이미 결제 완료된 주문 → BadRequestException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: { ...mockPayment, status: 'COMPLETED' },
      });

      await expect(service.preparePayment('user-1', 'order-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('Naver Pay API 응답 실패(ok=false) → InternalServerErrorException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      await expect(service.preparePayment('user-1', 'order-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('Naver Pay API code != Success → InternalServerErrorException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ code: 'InvalidParam', message: '잘못된 파라미터' }),
      });

      await expect(service.preparePayment('user-1', 'order-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── approvePayment ────────────────────────────────────────────────────────────

  describe('approvePayment', () => {
    it('결제 승인 성공 → Payment COMPLETED, Order PAID 업데이트', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: mockPayment,
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApplyApiResponse),
      });
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'COMPLETED' });
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'PAID' });

      const result = await service.approvePayment('user-1', 'np_payment_123', 'order-1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/payments/v1/apply'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'COMPLETED', paidAt: expect.any(Date) },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'PAID' },
      });
      expect(result).toEqual({ orderId: 'order-1', status: 'COMPLETED' });
    });

    it('존재하지 않는 주문 → NotFoundException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.approvePayment('user-1', 'np_id', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('다른 사용자의 주문 → ForbiddenException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, userId: 'other-user' });

      await expect(service.approvePayment('user-1', 'np_id', 'order-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('이미 결제 완료된 주문 → BadRequestException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: { ...mockPayment, status: 'COMPLETED' },
      });

      await expect(service.approvePayment('user-1', 'np_id', 'order-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('Naver Pay API code != Success → BadRequestException + Payment FAILED 업데이트', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: mockPayment,
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ code: 'PaymentFailed', message: '결제 실패' }),
      });
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'FAILED' });

      await expect(service.approvePayment('user-1', 'np_id', 'order-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'FAILED' },
      });
    });

    it('Naver Pay API 응답 실패(ok=false) → InternalServerErrorException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: mockPayment,
      });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      await expect(service.approvePayment('user-1', 'np_id', 'order-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── handleWebhook ─────────────────────────────────────────────────────────────

  describe('handleWebhook', () => {
    const buildSignature = (body: string) => {
      const { createHmac } = require('crypto') as typeof import('crypto');
      return createHmac('sha256', 'test_client_secret').update(body).digest('base64');
    };

    it('결제 성공(paymentStatus=SUCCESS) → Payment COMPLETED, Order PAID로 업데이트', async () => {
      const body = JSON.stringify({
        paymentId: 'np_payment_123',
        merchantPayKey: 'order-1',
        totalPayAmount: 50000,
        paymentStatus: 'SUCCESS',
      });
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'COMPLETED' });
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'PAID' });

      await service.handleWebhook(body, buildSignature(body));

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'COMPLETED', paidAt: expect.any(Date) },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'PAID' },
      });
    });

    it('결제 취소(paymentStatus=CANCEL) → Payment FAILED, 주문 상태 미변경', async () => {
      const body = JSON.stringify({
        paymentId: 'np_payment_123',
        merchantPayKey: 'order-1',
        paymentStatus: 'CANCEL',
      });
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'FAILED' });

      await service.handleWebhook(body, buildSignature(body));

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'FAILED' },
      });
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('결제 실패(paymentStatus=FAIL) → Payment FAILED, 주문 상태 미변경', async () => {
      const body = JSON.stringify({
        paymentId: 'np_payment_123',
        merchantPayKey: 'order-1',
        paymentStatus: 'FAIL',
      });
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'FAILED' });

      await service.handleWebhook(body, buildSignature(body));

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'FAILED' },
      });
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('잘못된 서명 → early return (DB 미호출)', async () => {
      const body = JSON.stringify({ merchantPayKey: 'order-1', paymentStatus: 'SUCCESS' });

      await expect(service.handleWebhook(body, 'invalid-signature')).resolves.toBeUndefined();
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('merchantPayKey 없는 페이로드 → 아무것도 하지 않는다', async () => {
      const body = JSON.stringify({ paymentId: 'np_payment_123', paymentStatus: 'SUCCESS' });

      await service.handleWebhook(body, buildSignature(body));

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });
});
