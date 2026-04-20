import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    private readonly configService: ConfigService,
  ) {}

  private static readonly INSTALLMENT_THRESHOLD = 50000;

  async createPaymentIntent(userId: string, orderId: string, installmentMonths?: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }
    if (order.payment && order.payment.status === 'COMPLETED') {
      throw new BadRequestException('이미 결제된 주문입니다.');
    }

    const stripeParams: Stripe.PaymentIntentCreateParams = {
      amount: order.totalAmount,
      currency: 'krw',
      metadata: { orderId },
    };

    if (installmentMonths && order.totalAmount >= PaymentsService.INSTALLMENT_THRESHOLD) {
      stripeParams.payment_method_options = {
        card: {
          installments: {
            enabled: true,
            plan: {
              type: 'fixed_count',
              count: installmentMonths,
              interval: 'month',
            },
          },
        },
      };
    }

    const paymentIntent = await this.stripe.paymentIntents.create(stripeParams);

    const payment = await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        amount: order.totalAmount,
        paymentMethod: 'stripe',
        paymentKey: paymentIntent.id,
      },
      update: {
        paymentKey: paymentIntent.id,
        status: 'PENDING',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    };
  }

  async getUserPayments(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { order: { userId } },
        include: {
          order: {
            include: {
              items: {
                include: {
                  variant: { include: { product: { include: { images: true } } } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: { order: { userId } } }),
    ]);
    return { items: payments, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async requestRefund(userId: string, paymentId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('결제를 찾을 수 없습니다.');
    if (payment.order.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    if (payment.status !== 'COMPLETED')
      throw new BadRequestException('환불 가능한 결제 상태가 아닙니다.');

    return this.prisma.refund.create({
      data: {
        orderId: payment.orderId,
        paymentId: payment.id,
        amount: payment.amount,
        reason,
      },
    });
  }

  async refundStripePayment(paymentKey: string, amount: number): Promise<void> {
    await this.stripe.refunds.create({ payment_intent: paymentKey, amount });
  }

  async handleWebhookEvent(payload: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new BadRequestException('웹훅 서명 검증에 실패했습니다.');
    }

    const intent = event.data.object as { id: string; metadata?: { orderId?: string } };
    const orderId = intent.metadata?.orderId;
    if (!orderId) return;

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.prisma.payment.update({
          where: { orderId },
          data: { status: 'COMPLETED', paidAt: new Date() },
        });
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: 'PAID' },
        });
        break;

      case 'payment_intent.payment_failed':
        await this.prisma.payment.update({
          where: { orderId },
          data: { status: 'FAILED' },
        });
        break;

      default:
        break;
    }
  }
}
