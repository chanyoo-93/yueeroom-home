import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface KakaoPayReadyResponse {
  tid: string;
  next_redirect_pc_url: string;
  next_redirect_mobile_url: string;
  next_redirect_app_url: string;
  created_at: string;
}

interface KakaoPayApproveResponse {
  aid: string;
  tid: string;
  partner_order_id: string;
  partner_user_id: string;
  payment_method_type: string;
  amount: { total: number };
  approved_at: string;
}

const KAKAO_PAY_API_BASE = 'https://open-api.kakaopay.com/online/v1';

@Injectable()
export class KakaoPayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async readyPayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        items: { include: { variant: { include: { product: true } } } },
      },
    });

    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    if (order.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    if (order.payment?.status === 'COMPLETED') {
      throw new BadRequestException('이미 결제된 주문입니다.');
    }

    const secretKey = this.config.get<string>('KAKAO_PAY_SECRET_KEY');
    const cid = this.config.get<string>('KAKAO_PAY_CID', 'TC0ONETIME');

    if (!secretKey) {
      throw new InternalServerErrorException('카카오페이 서비스가 설정되지 않았습니다.');
    }

    const productName =
      order.items[0]?.variant?.product?.name ??
      '유이룸 상품' + (order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : '');
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    const response = await fetch(`${KAKAO_PAY_API_BASE}/payment/ready`, {
      method: 'POST',
      headers: {
        Authorization: `SECRET_KEY ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cid,
        partner_order_id: orderId,
        partner_user_id: userId,
        item_name: productName,
        quantity: totalQuantity,
        total_amount: order.totalAmount,
        tax_free_amount: 0,
        approval_url: `${frontendUrl}/checkout/kakao-pay/result?orderId=${orderId}`,
        cancel_url: `${frontendUrl}/checkout/kakao-pay/cancel?orderId=${orderId}`,
        fail_url: `${frontendUrl}/checkout/kakao-pay/fail?orderId=${orderId}`,
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('카카오페이 결제 준비 요청에 실패했습니다.');
    }

    const result = (await response.json()) as KakaoPayReadyResponse;

    await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        amount: order.totalAmount,
        paymentMethod: 'kakaopay',
        paymentKey: result.tid,
      },
      update: {
        paymentKey: result.tid,
        status: 'PENDING',
      },
    });

    return {
      tid: result.tid,
      redirectUrl: result.next_redirect_pc_url,
    };
  }

  async approvePayment(userId: string, orderId: string, pgToken: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    if (order.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    if (order.payment?.status === 'COMPLETED') {
      throw new BadRequestException('이미 결제된 주문입니다.');
    }
    if (!order.payment?.paymentKey) {
      throw new BadRequestException('결제 준비가 완료되지 않은 주문입니다.');
    }

    const secretKey = this.config.get<string>('KAKAO_PAY_SECRET_KEY');
    const cid = this.config.get<string>('KAKAO_PAY_CID', 'TC0ONETIME');

    if (!secretKey) {
      throw new InternalServerErrorException('카카오페이 서비스가 설정되지 않았습니다.');
    }

    const response = await fetch(`${KAKAO_PAY_API_BASE}/payment/approve`, {
      method: 'POST',
      headers: {
        Authorization: `SECRET_KEY ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cid,
        tid: order.payment.paymentKey,
        partner_order_id: orderId,
        partner_user_id: userId,
        pg_token: pgToken,
      }),
    });

    if (!response.ok) {
      await this.prisma.payment.update({
        where: { orderId },
        data: { status: 'FAILED' },
      });
      throw new InternalServerErrorException('카카오페이 결제 승인 요청에 실패했습니다.');
    }

    const result = (await response.json()) as KakaoPayApproveResponse;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { orderId },
        data: { status: 'COMPLETED', paidAt: new Date(result.approved_at) },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      }),
    ]);

    return { orderId, status: 'COMPLETED' };
  }

  async refundKakaoPayment(tid: string, amount: number): Promise<void> {
    const secretKey = this.config.get<string>('KAKAO_PAY_SECRET_KEY');
    const cid = this.config.get<string>('KAKAO_PAY_CID', 'TC0ONETIME');

    if (!secretKey) {
      throw new InternalServerErrorException('카카오페이 서비스가 설정되지 않았습니다.');
    }

    const response = await fetch(`${KAKAO_PAY_API_BASE}/payment/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `SECRET_KEY ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cid,
        tid,
        cancel_amount: amount,
        cancel_tax_free_amount: 0,
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('카카오페이 환불 요청에 실패했습니다.');
    }
  }
}
