import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

interface NaverPayWebhookPayload {
  paymentId?: string;
  merchantPayKey?: string;
  totalPayAmount?: number;
  paymentStatus: string;
}

interface NaverPayReserveResponse {
  code: string;
  message: string;
  body: {
    paymentId: string;
    merchantPayKey: string;
    paymentURL: string;
  };
}

interface NaverPayApplyResponse {
  code: string;
  message: string;
  body: {
    paymentId: string;
    merchantPayKey: string;
    totalPayAmount: number;
    paymentStatus: string;
    merchantId: string;
    productName: string;
  };
}

const NAVER_PAY_API_BASE = 'https://dev.apis.naver.com/naverpay-partner/naverpay';

@Injectable()
export class NaverPayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async preparePayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: { include: { variant: { include: { product: true } } } } },
    });

    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    if (order.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    if (order.payment?.status === 'COMPLETED') {
      throw new BadRequestException('이미 결제된 주문입니다.');
    }

    const productName =
      order.items[0]?.variant?.product?.name ??
      '유이룸 상품' + (order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : '');

    const chainId = this.config.get<string>('NAVER_PAY_CHAIN_ID');
    const clientId = this.config.get<string>('NAVER_CLIENT_ID');
    const clientSecret = this.config.get<string>('NAVER_CLIENT_SECRET');

    if (!chainId || !clientId || !clientSecret) {
      throw new InternalServerErrorException('네이버페이 서비스가 설정되지 않았습니다.');
    }

    const returnUrl = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')}/checkout/naver-pay/result`;

    const params = new URLSearchParams({
      merchantPayKey: orderId,
      productName,
      totalPayAmount: String(order.totalAmount),
      taxScopeAmount: String(order.totalAmount),
      taxExScopeAmount: '0',
      returnUrl,
      productCount: String(order.items.length),
    });

    const response = await fetch(`${NAVER_PAY_API_BASE}/payments/v2.2/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-NaverPay-Chain-Id': chainId,
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('네이버페이 결제 준비 요청에 실패했습니다.');
    }

    const result = (await response.json()) as NaverPayReserveResponse;
    if (result.code !== 'Success') {
      throw new InternalServerErrorException(`네이버페이 오류: ${result.message}`);
    }

    await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        amount: order.totalAmount,
        paymentMethod: 'naverpay',
        paymentKey: result.body.paymentId,
      },
      update: {
        paymentKey: result.body.paymentId,
        status: 'PENDING',
      },
    });

    return {
      paymentId: result.body.paymentId,
      merchantPayKey: result.body.merchantPayKey,
      paymentURL: result.body.paymentURL,
    };
  }

  async approvePayment(userId: string, paymentId: string, merchantPayKey: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: merchantPayKey },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    if (order.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    if (order.payment?.status === 'COMPLETED') {
      throw new BadRequestException('이미 결제된 주문입니다.');
    }
    if (!order.payment?.paymentKey || order.payment.paymentKey !== paymentId) {
      throw new BadRequestException('유효하지 않은 결제 정보입니다.');
    }

    const chainId = this.config.get<string>('NAVER_PAY_CHAIN_ID');
    const clientId = this.config.get<string>('NAVER_CLIENT_ID');
    const clientSecret = this.config.get<string>('NAVER_CLIENT_SECRET');

    if (!chainId || !clientId || !clientSecret) {
      throw new InternalServerErrorException('네이버페이 서비스가 설정되지 않았습니다.');
    }

    const params = new URLSearchParams({ paymentId, merchantPayKey });

    const response = await fetch(`${NAVER_PAY_API_BASE}/payments/v1/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-NaverPay-Chain-Id': chainId,
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('네이버페이 결제 승인 요청에 실패했습니다.');
    }

    const result = (await response.json()) as NaverPayApplyResponse;
    if (result.code !== 'Success') {
      await this.prisma.payment.update({
        where: { orderId: merchantPayKey },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException(`네이버페이 결제 승인 실패: ${result.message}`);
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { orderId: merchantPayKey },
        data: { status: 'COMPLETED', paidAt: new Date() },
      }),
      this.prisma.order.update({
        where: { id: merchantPayKey },
        data: { status: 'PAID' },
      }),
    ]);

    return { orderId: merchantPayKey, status: 'COMPLETED' };
  }

  async refundNaverPayment(paymentKey: string, amount: number, reason?: string): Promise<void> {
    const chainId = this.config.get<string>('NAVER_PAY_CHAIN_ID');
    const clientId = this.config.get<string>('NAVER_CLIENT_ID');
    const clientSecret = this.config.get<string>('NAVER_CLIENT_SECRET');

    if (!chainId || !clientId || !clientSecret) {
      throw new InternalServerErrorException('네이버페이 서비스가 설정되지 않았습니다.');
    }

    const params = new URLSearchParams({
      paymentId: paymentKey,
      cancelAmount: String(amount),
      cancelTaxScopeAmount: String(amount),
      cancelTaxExScopeAmount: '0',
      cancelReason: reason ?? '고객 요청 환불',
    });

    const response = await fetch(`${NAVER_PAY_API_BASE}/payments/v1/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-NaverPay-Chain-Id': chainId,
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('네이버페이 환불 요청에 실패했습니다.');
    }

    const result = (await response.json()) as { code: string; message: string };
    if (result.code !== 'Success') {
      throw new BadRequestException(`네이버페이 환불 실패: ${result.message}`);
    }
  }

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    const secret = this.config.get<string>('NAVER_CLIENT_SECRET');
    if (!secret) {
      throw new InternalServerErrorException('NAVER_CLIENT_SECRET이 설정되지 않았습니다.');
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest();
    const signatureBuffer = Buffer.from(signature || '', 'base64');
    if (
      !signature ||
      expected.length !== signatureBuffer.length ||
      !timingSafeEqual(expected, signatureBuffer)
    ) {
      throw new BadRequestException('웹훅 서명 검증에 실패했습니다.');
    }

    let payload: NaverPayWebhookPayload;
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object') {
        throw new BadRequestException('웹훅 페이로드가 유효하지 않습니다.');
      }
      payload = parsed as NaverPayWebhookPayload;
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('웹훅 페이로드 파싱에 실패했습니다.');
    }
    const orderId = payload.merchantPayKey;
    if (!orderId) return;

    if (payload.paymentStatus === 'SUCCESS') {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { orderId },
          data: { status: 'COMPLETED', paidAt: new Date() },
        }),
        this.prisma.order.update({
          where: { id: orderId },
          data: { status: 'PAID' },
        }),
      ]);
    } else if (payload.paymentStatus === 'CANCEL' || payload.paymentStatus === 'FAIL') {
      await this.prisma.payment.update({
        where: { orderId },
        data: { status: 'FAILED' },
      });
    }
  }
}
