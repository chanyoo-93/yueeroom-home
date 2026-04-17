import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { KakaoPayService } from './kakao-pay.service';
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
      quantity: 1,
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
  paymentMethod: 'kakaopay',
  paymentKey: 'T469b847306d7b2dc234',
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockReadyApiResponse = {
  tid: 'T469b847306d7b2dc234',
  next_redirect_pc_url: 'https://online-pay.kakao.com/mockup/v1/1234/info',
  next_redirect_mobile_url: 'https://online-pay.kakao.com/mockup/v1/1234/mInfo',
  next_redirect_app_url: 'https://online-pay.kakao.com/mockup/v1/1234/aInfo',
  created_at: '2024-01-01T00:00:00',
};

const mockApproveApiResponse = {
  aid: 'A469b847306d7b2dc235',
  tid: 'T469b847306d7b2dc234',
  cid: 'TC0ONETIME',
  partner_order_id: 'order-1',
  partner_user_id: 'user-1',
  payment_method_type: 'CARD',
  item_name: '아동 원피스',
  quantity: 1,
  amount: { total: 50000, tax_free: 0, vat: 4545, point: 0, discount: 0, green_mileage: 0 },
  created_at: '2024-01-01T00:00:00',
  approved_at: '2024-01-01T00:00:01',
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
      KAKAO_PAY_SECRET_KEY: 'test_secret_key',
      KAKAO_PAY_CID: 'TC0ONETIME',
    };
    return configs[key] ?? defaultVal;
  }),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('KakaoPayService', () => {
  let service: KakaoPayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KakaoPayService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<KakaoPayService>(KakaoPayService);
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  // ── readyPayment ─────────────────────────────────────────────────────────────

  describe('readyPayment', () => {
    it('결제 준비 성공 → tid, redirectUrl 반환', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockReadyApiResponse),
      });
      mockPrisma.payment.upsert.mockResolvedValue(mockPayment);

      const result = await service.readyPayment('user-1', 'order-1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/payment/ready'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('SECRET_KEY'),
            'Content-Type': 'application/json',
          }),
        }),
      );
      expect(mockPrisma.payment.upsert).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        create: expect.objectContaining({ paymentMethod: 'kakaopay', orderId: 'order-1' }),
        update: expect.objectContaining({ paymentKey: 'T469b847306d7b2dc234', status: 'PENDING' }),
      });
      expect(result).toEqual({
        tid: 'T469b847306d7b2dc234',
        redirectUrl: mockReadyApiResponse.next_redirect_pc_url,
      });
    });

    it('존재하지 않는 주문 → NotFoundException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.readyPayment('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('다른 사용자의 주문 → ForbiddenException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, userId: 'other-user' });

      await expect(service.readyPayment('user-1', 'order-1')).rejects.toThrow(ForbiddenException);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('이미 결제 완료된 주문 → BadRequestException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: { ...mockPayment, status: 'COMPLETED' },
      });

      await expect(service.readyPayment('user-1', 'order-1')).rejects.toThrow(BadRequestException);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('KakaoPay API 응답 실패(ok=false) → InternalServerErrorException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ code: -780, msg: 'failure' }),
      });

      await expect(service.readyPayment('user-1', 'order-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('KAKAO_PAY_SECRET_KEY 미설정 → InternalServerErrorException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockConfigService.get.mockImplementation((key: string, defaultVal = '') => {
        if (key === 'KAKAO_PAY_SECRET_KEY') return '';
        const configs: Record<string, string> = {
          FRONTEND_URL: 'http://localhost:3000',
          KAKAO_PAY_CID: 'TC0ONETIME',
        };
        return configs[key] ?? defaultVal;
      });

      await expect(service.readyPayment('user-1', 'order-1')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(global.fetch).not.toHaveBeenCalled();

      // restore
      mockConfigService.get.mockImplementation((key: string, defaultVal = '') => {
        const configs: Record<string, string> = {
          FRONTEND_URL: 'http://localhost:3000',
          KAKAO_PAY_SECRET_KEY: 'test_secret_key',
          KAKAO_PAY_CID: 'TC0ONETIME',
        };
        return configs[key] ?? defaultVal;
      });
    });
  });

  // ── approvePayment ───────────────────────────────────────────────────────────

  describe('approvePayment', () => {
    it('결제 승인 성공 → Payment COMPLETED, Order PAID 업데이트', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, payment: mockPayment });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApproveApiResponse),
      });
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'COMPLETED' });
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'PAID' });

      const result = await service.approvePayment('user-1', 'order-1', 'pg_token_123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/payment/approve'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('SECRET_KEY'),
          }),
        }),
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

      await expect(service.approvePayment('user-1', 'nonexistent', 'pg_token')).rejects.toThrow(
        NotFoundException,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('다른 사용자의 주문 → ForbiddenException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, userId: 'other-user' });

      await expect(service.approvePayment('user-1', 'order-1', 'pg_token')).rejects.toThrow(
        ForbiddenException,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('이미 결제 완료된 주문 → BadRequestException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: { ...mockPayment, status: 'COMPLETED' },
      });

      await expect(service.approvePayment('user-1', 'order-1', 'pg_token')).rejects.toThrow(
        BadRequestException,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('결제 레코드 없음(tid 없음) → BadRequestException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, payment: null });

      await expect(service.approvePayment('user-1', 'order-1', 'pg_token')).rejects.toThrow(
        BadRequestException,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('KakaoPay API 응답 실패(ok=false) → InternalServerErrorException + Payment FAILED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, payment: mockPayment });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ code: -780, msg: '결제 승인 실패' }),
      });
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'FAILED' });

      await expect(service.approvePayment('user-1', 'order-1', 'pg_token')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'FAILED' },
      });
    });
  });
});
