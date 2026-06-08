import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KcpEasyPayService } from './kcp-easypay.service';

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  totalAmount: 50000,
  status: 'PENDING',
  payment: null,
  items: [
    {
      quantity: 1,
      variant: { product: { name: '베이비 롬퍼' } },
    },
  ],
};

const mockPrisma = {
  order: { findUnique: jest.fn(), update: jest.fn() },
  payment: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  paymentEvent: { findUnique: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
};

const getMockConfigValue = (key: string) => {
  const map: Record<string, string> = {
    KCP_SITE_CODE: 'T0000',
    KCP_SITE_KEY: 'test-site-key',
    KCP_SANDBOX: 'true',
    KCP_WEBHOOK_SIGNATURE_DISABLED: 'true',
  };
  return map[key] ?? '';
};

const mockConfig = {
  get: jest.fn(getMockConfigValue),
};

describe('KcpEasyPayService', () => {
  let service: KcpEasyPayService;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        KcpEasyPayService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(KcpEasyPayService);
    jest.clearAllMocks();
    mockConfig.get.mockImplementation(getMockConfigValue);
    mockPrisma.paymentEvent.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation((fn: unknown) =>
      typeof fn === 'function' ? fn(mockPrisma) : Promise.all(fn as Promise<unknown>[]),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('prepareCardPayment', () => {
    it('주문 미존재 -> NotFoundException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.prepareCardPayment('user-1', 'order-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('타인 주문 접근 -> ForbiddenException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, userId: 'other' });

      await expect(service.prepareCardPayment('user-1', 'order-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('이미 결제된 주문 -> BadRequestException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: { status: 'COMPLETED' },
      });

      await expect(service.prepareCardPayment('user-1', 'order-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('정상 주문 -> KCP 결제창 파라미터 반환', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.upsert.mockResolvedValue({ id: 'payment-1' });

      const result = await service.prepareCardPayment('user-1', 'order-1');

      expect(result).toMatchObject({
        siteCode: 'T0000',
        orderId: 'order-1',
        amount: 50000,
        productName: '베이비 롬퍼',
      });
      expect(result.signData).toBeDefined();
      expect(mockPrisma.payment.upsert).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        create: {
          orderId: 'order-1',
          amount: 50000,
          paymentMethod: 'kcpeasypay',
          status: 'PENDING',
        },
        update: { status: 'PENDING' },
      });
    });
  });

  describe('prepareVbank', () => {
    const mockFetch = jest.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    it('주문 미존재 -> NotFoundException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.prepareVbank('user-1', 'order-x')).rejects.toThrow(NotFoundException);
    });

    it('KCP API 호출 성공 -> 계좌 정보 반환 및 AWAITING_DEPOSIT 저장', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          res_cd: '0000',
          tno: 'kcp-tno-001',
          va_no: '1234567890',
          va_bank_nm: '국민은행',
          va_date: '20260610150000',
        }),
      });
      mockPrisma.payment.upsert.mockResolvedValue({ id: 'payment-1' });

      const result = await service.prepareVbank('user-1', 'order-1');

      expect(result).toMatchObject({
        accountNumber: '1234567890',
        bankName: '국민은행',
        amount: 50000,
      });
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockPrisma.payment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            status: 'AWAITING_DEPOSIT',
            virtualAccountNumber: '1234567890',
            virtualBankName: '국민은행',
            virtualAccountExpiry: expect.any(Date),
          }),
          update: expect.objectContaining({
            status: 'AWAITING_DEPOSIT',
            virtualAccountNumber: '1234567890',
            virtualBankName: '국민은행',
            virtualAccountExpiry: expect.any(Date),
          }),
        }),
      );
    });

    it("KCP API res_cd != '0000' -> InternalServerErrorException", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ res_cd: '9999' }),
      });

      await expect(service.prepareVbank('user-1', 'order-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('handleWebhook', () => {
    it('CARD 성공 -> Payment COMPLETED with paymentKey/paidAt, Order PAID', async () => {
      mockPrisma.payment.update.mockResolvedValue({ id: 'payment-1' });
      mockPrisma.order.update.mockResolvedValue({});
      mockPrisma.paymentEvent.create.mockResolvedValue({});

      await service.handleWebhook(
        {
          res_cd: '0000',
          res_msg: '정상',
          tno: 'kcp-tno-001',
          ordr_idxx: 'order-1',
          pay_method: 'CARD',
          good_mny: '50000',
        },
        'test-signature',
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'COMPLETED', paymentKey: 'kcp-tno-001', paidAt: expect.any(Date) },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'PAID' },
      });
    });

    it('CARD 실패 -> Payment FAILED, no order update', async () => {
      mockPrisma.payment.update.mockResolvedValue({ id: 'payment-1' });
      mockPrisma.paymentEvent.create.mockResolvedValue({});

      await service.handleWebhook(
        {
          res_cd: '8100',
          res_msg: '결제 실패',
          tno: 'kcp-tno-002',
          ordr_idxx: 'order-1',
          pay_method: 'CARD',
          good_mny: '50000',
        },
        'test-signature',
      );

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'FAILED' },
      });
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('VBANK_DEPOSIT -> Payment COMPLETED paidAt, Order PAID', async () => {
      mockPrisma.payment.update.mockResolvedValue({ id: 'payment-1' });
      mockPrisma.order.update.mockResolvedValue({});
      mockPrisma.paymentEvent.create.mockResolvedValue({});

      await service.handleWebhook(
        {
          res_cd: '0000',
          res_msg: '입금',
          tno: 'kcp-tno-003',
          ordr_idxx: 'order-1',
          pay_method: 'VBANK_DEPOSIT',
          good_mny: '50000',
        },
        'test-signature',
      );

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'COMPLETED', paidAt: expect.any(Date) },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'PAID' },
      });
    });

    it('duplicate tno existing paymentEvent -> no transaction', async () => {
      mockPrisma.paymentEvent.findUnique.mockResolvedValue({ id: 'event-1' });

      await service.handleWebhook(
        {
          res_cd: '0000',
          res_msg: '정상',
          tno: 'kcp-tno-dup',
          ordr_idxx: 'order-1',
          pay_method: 'CARD',
          good_mny: '50000',
        },
        'test-signature',
      );

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('Payment 레코드가 없는 webhook P2025 -> 재시도 방지를 위해 무시', async () => {
      mockPrisma.payment.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.19.3',
        }),
      );

      await expect(
        service.handleWebhook(
          {
            res_cd: '0000',
            res_msg: '정상',
            tno: 'kcp-tno-missing-payment',
            ordr_idxx: 'order-missing-payment',
            pay_method: 'CARD',
            good_mny: '50000',
          },
          'test-signature',
        ),
      ).resolves.not.toThrow();
    });

    it('서명 검증 우회가 꺼져 있고 서명이 없으면 BadRequestException', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        const map: Record<string, string> = {
          KCP_SITE_CODE: 'T0000',
          KCP_SITE_KEY: 'test-site-key',
          KCP_SANDBOX: 'true',
          KCP_WEBHOOK_SIGNATURE_DISABLED: 'false',
        };
        return map[key] ?? '';
      });

      await expect(
        service.handleWebhook(
          {
            res_cd: '0000',
            res_msg: '정상',
            tno: 'kcp-tno-invalid-signature',
            ordr_idxx: 'order-1',
            pay_method: 'CARD',
            good_mny: '50000',
          },
          '',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refund', () => {
    const mockFetch = jest.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    it("KCP API success res_cd '0000' resolves", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ res_cd: '0000' }),
      });

      await expect(service.refund('kcp-tno-001', 50000, '고객 변심')).resolves.not.toThrow();
    });

    it("KCP API res_cd != '0000' -> BadRequestException", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ res_cd: '9999' }),
      });

      await expect(service.refund('kcp-tno-001', 50000)).rejects.toThrow(BadRequestException);
    });
  });
});
