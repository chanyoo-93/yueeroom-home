import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentListResponseDto, RefundResponseDto } from './dto/payment-response.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPayments(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaymentListResponseDto> {
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { order: { userId } },
        select: {
          id: true,
          orderId: true,
          status: true,
          amount: true,
          paymentMethod: true,
          paidAt: true,
          virtualAccountNumber: true,
          virtualBankName: true,
          virtualAccountExpiry: true,
          createdAt: true,
          updatedAt: true,
          order: {
            select: {
              id: true,
              userId: true,
              addressId: true,
              status: true,
              totalAmount: true,
              shippingFee: true,
              carrier: true,
              trackingNumber: true,
              createdAt: true,
              updatedAt: true,
              items: {
                select: {
                  id: true,
                  orderId: true,
                  variantId: true,
                  quantity: true,
                  unitPrice: true,
                  createdAt: true,
                  variant: {
                    select: {
                      id: true,
                      productId: true,
                      size: true,
                      color: true,
                      sku: true,
                      price: true,
                      createdAt: true,
                      updatedAt: true,
                      product: {
                        select: {
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
                          images: {
                            select: {
                              id: true,
                              productId: true,
                              url: true,
                              key: true,
                              order: true,
                              createdAt: true,
                            },
                          },
                        },
                      },
                    },
                  },
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

  async requestRefund(
    userId: string,
    paymentId: string,
    reason: string,
  ): Promise<RefundResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('결제를 찾을 수 없습니다.');
    if (payment.order.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('환불 가능한 결제 상태가 아닙니다.');
    }

    const existingRefund = await this.prisma.refund.findFirst({
      where: {
        paymentId,
        status: { in: ['REQUESTED', 'COMPLETED'] },
      },
    });
    if (existingRefund) {
      throw new ConflictException('이미 처리 중인 환불 요청이 있습니다');
    }

    return this.prisma.refund.create({
      data: {
        orderId: payment.orderId,
        paymentId: payment.id,
        amount: payment.amount,
        reason,
      },
    });
  }
}
