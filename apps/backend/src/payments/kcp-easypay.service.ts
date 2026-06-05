import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { IPaymentProvider } from './interfaces/payment-provider.interface';
import { isUniqueConstraintError } from './utils/prisma-error.util';

// TODO(확인 필요): KCP 이지페이 개발자 센터에서 URL 및 엔드포인트를 확정한다.
const KCP_API_BASE_SANDBOX = 'https://testpayx.kcp.co.kr';
const KCP_API_BASE_PROD = 'https://payx.kcp.co.kr';
const KCP_VBANK_ENDPOINT = '/v1/api/payments/vbank';
const KCP_CANCEL_ENDPOINT = '/v1/api/payments/cancel';

export interface KcpWebhookBody {
  res_cd: string;
  res_msg: string;
  tno: string;
  ordr_idxx: string;
  pay_method: string;
  good_mny: string;
  va_bank_cd?: string;
  va_no?: string;
  va_date?: string;
  va_bank_nm?: string;
}

@Injectable()
export class KcpEasyPayService implements IPaymentProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get apiBase(): string {
    return this.config.get<string>('KCP_SANDBOX') === 'true'
      ? KCP_API_BASE_SANDBOX
      : KCP_API_BASE_PROD;
  }

  private get siteCode(): string {
    const code = this.config.get<string>('KCP_SITE_CODE');
    if (!code) throw new InternalServerErrorException('KCP_SITE_CODE가 설정되지 않았습니다.');
    return code;
  }

  private get siteKey(): string {
    const key = this.config.get<string>('KCP_SITE_KEY');
    if (!key) throw new InternalServerErrorException('KCP_SITE_KEY가 설정되지 않았습니다.');
    return key;
  }

  // TODO(확인 필요): KCP 문서의 신용카드 결제 준비 서명 알고리즘으로 교체한다.
  private generateSignData(orderId: string, amount: number, timestamp: string): string {
    const raw = `${this.siteCode}^${orderId}^${amount}^${timestamp}`;
    return createHmac('sha256', this.siteKey).update(raw).digest('hex');
  }

  async prepareCardPayment(userId: string, orderId: string) {
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
    const timestamp = Date.now().toString();
    const signData = this.generateSignData(orderId, order.totalAmount, timestamp);

    await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        amount: order.totalAmount,
        paymentMethod: 'kcpeasypay',
        status: 'PENDING',
      },
      update: { status: 'PENDING' },
    });

    // TODO(확인 필요): 프론트엔드 KCP JS SDK 요구 파라미터 이름으로 확정한다.
    return {
      siteCode: this.siteCode,
      orderId,
      amount: order.totalAmount,
      productName,
      timestamp,
      signData,
    };
  }

  async prepareVbank(userId: string, orderId: string) {
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

    // TODO(확인 필요): KCP 가상계좌 발급 요청 파라미터와 인증 방식을 확정한다.
    const response = await fetch(`${this.apiBase}${KCP_VBANK_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.siteCode}:${this.siteKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        site_cd: this.siteCode,
        ordr_idxx: orderId,
        good_name: productName,
        good_mny: String(order.totalAmount),
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('가상계좌 발급 요청에 실패했습니다.');
    }

    const result = (await response.json()) as {
      res_cd: string;
      tno: string;
      va_no: string;
      va_bank_nm: string;
      va_date: string;
    };

    if (result.res_cd !== '0000') {
      throw new InternalServerErrorException('가상계좌 발급에 실패했습니다.');
    }

    const expiry = this.parseKcpDate(result.va_date);

    await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        amount: order.totalAmount,
        paymentMethod: 'kcpeasypay',
        paymentKey: result.tno,
        status: 'AWAITING_DEPOSIT',
        virtualAccountNumber: result.va_no,
        virtualBankName: result.va_bank_nm,
        virtualAccountExpiry: expiry,
      },
      update: {
        paymentKey: result.tno,
        status: 'AWAITING_DEPOSIT',
        virtualAccountNumber: result.va_no,
        virtualBankName: result.va_bank_nm,
        virtualAccountExpiry: expiry,
      },
    });

    return {
      accountNumber: result.va_no,
      bankName: result.va_bank_nm,
      expiresAt: expiry,
      amount: order.totalAmount,
    };
  }

  async refund(paymentKey: string, amount: number, reason?: string): Promise<void> {
    // TODO(확인 필요): KCP 환불 요청 파라미터와 인증 방식을 확정한다.
    const response = await fetch(`${this.apiBase}${KCP_CANCEL_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.siteCode}:${this.siteKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        tno: paymentKey,
        mod_type: 'FULL',
        cncl_type: '0',
        cncl_mny: String(amount),
        cncl_rsn: reason ?? '고객 요청 환불',
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('KCP 환불 요청에 실패했습니다.');
    }

    const result = (await response.json()) as { res_cd: string };
    if (result.res_cd !== '0000') {
      throw new BadRequestException('KCP 환불 처리에 실패했습니다.');
    }
  }

  async handleWebhook(body: KcpWebhookBody, signature: string): Promise<void> {
    // TODO(확인 필요): KCP webhook 서명 헤더명과 검증 알고리즘을 확정한다.
    this.verifyWebhookSignature(body, signature);

    const { tno, ordr_idxx: orderId, pay_method: payMethod, res_cd: resultCode } = body;
    if (!orderId || !tno) return;

    const existingEvent = await this.prisma.paymentEvent.findUnique({
      where: { externalEventId: tno },
    });
    if (existingEvent) return;

    try {
      if (payMethod === 'CARD' && resultCode === '0000') {
        await this.prisma.$transaction(async (tx) => {
          const payment = await tx.payment.update({
            where: { orderId },
            data: { status: 'COMPLETED', paymentKey: tno, paidAt: new Date() },
          });
          await tx.order.update({ where: { id: orderId }, data: { status: 'PAID' } });
          await tx.paymentEvent.create({
            data: {
              externalEventId: tno,
              gateway: 'kcpeasypay',
              eventType: 'CARD_PAYMENT_COMPLETED',
              paymentId: payment.id,
            },
          });
        });
      } else if (payMethod === 'CARD' && resultCode !== '0000') {
        await this.prisma.$transaction(async (tx) => {
          const payment = await tx.payment.update({
            where: { orderId },
            data: { status: 'FAILED' },
          });
          await tx.paymentEvent.create({
            data: {
              externalEventId: tno,
              gateway: 'kcpeasypay',
              eventType: 'CARD_PAYMENT_FAILED',
              paymentId: payment.id,
            },
          });
        });
      } else if (payMethod === 'VBANK_DEPOSIT') {
        await this.prisma.$transaction(async (tx) => {
          const payment = await tx.payment.update({
            where: { orderId },
            data: { status: 'COMPLETED', paidAt: new Date() },
          });
          await tx.order.update({ where: { id: orderId }, data: { status: 'PAID' } });
          await tx.paymentEvent.create({
            data: {
              externalEventId: tno,
              gateway: 'kcpeasypay',
              eventType: 'VBANK_DEPOSIT_COMPLETED',
              paymentId: payment.id,
            },
          });
        });
      }
    } catch (error) {
      if (isUniqueConstraintError(error)) return;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return;
      }
      throw error;
    }
  }

  private parseKcpDate(value: string): Date {
    return new Date(
      `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T` +
        `${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}+09:00`,
    );
  }

  private verifyWebhookSignature(body: KcpWebhookBody, signature: string): void {
    if (this.config.get<string>('KCP_WEBHOOK_SIGNATURE_DISABLED') === 'true') {
      return;
    }

    const secret = this.config.get<string>('KCP_WEBHOOK_SECRET');
    if (!secret || !signature) {
      throw new BadRequestException('웹훅 서명 검증에 실패했습니다.');
    }

    // TODO(확인 필요): KCP 문서 확보 후 서명 원문과 헤더명을 실제 규격으로 확정한다.
    const payload = `${body.tno}:${body.ordr_idxx}:${body.good_mny}:${body.res_cd}`;
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new BadRequestException('웹훅 서명 검증에 실패했습니다.');
    }
  }
}
