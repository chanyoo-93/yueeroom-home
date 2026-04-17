import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

type StripeClient = Stripe.Stripe;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('STRIPE_CLIENT') private readonly stripe: StripeClient,
  ) {}

  async createPaymentIntent(userId: string, orderId: string) {
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

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: order.totalAmount,
      currency: 'krw',
      metadata: { orderId },
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount: order.totalAmount,
        paymentMethod: 'stripe',
        paymentKey: paymentIntent.id,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    };
  }

  async handleWebhookEvent(payload: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
    const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    const intent = event.data.object as { id: string; metadata?: { orderId?: string } };
    const orderId = intent.metadata?.orderId;

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
