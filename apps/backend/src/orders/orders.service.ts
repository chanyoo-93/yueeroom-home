import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentGatewayService } from '../payments/payment-gateway.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderListResponseDto, OrderResponseDto } from './dto/order-response.dto';
import { PartialRefundDto } from './dto/partial-refund.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<OrderResponseDto> {
    // 배송지 소유권 확인
    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId },
    });
    if (!address || address.userId !== userId) {
      throw new NotFoundException('배송지를 찾을 수 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      // dto.items에서 동일 variantId 합산 — 중복 항목 선처리
      const itemMap = new Map<string, number>();
      for (const item of dto.items) {
        itemMap.set(item.variantId, (itemMap.get(item.variantId) ?? 0) + item.quantity);
      }

      const variantIds = Array.from(itemMap.keys());

      // 변형 정보 일괄 조회 (N+1 방지, 재고는 DB 원자 연산으로 처리하므로 select 최소화)
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, price: true },
      });
      const variantPriceMap = new Map(variants.map((v) => [v.id, v.price]));

      // 변형 존재 여부 확인 및 총 금액·OrderItem 데이터 계산
      let totalAmount = 0;
      const itemsToCreate: { variantId: string; quantity: number; unitPrice: number }[] = [];

      for (const [variantId, quantity] of itemMap) {
        const price = variantPriceMap.get(variantId);
        if (price === undefined) {
          throw new NotFoundException('상품 옵션을 찾을 수 없습니다.');
        }
        totalAmount += price * quantity;
        itemsToCreate.push({ variantId, quantity, unitPrice: price });
      }

      // DB 레벨 원자적 재고 차감
      // where: quantity >= requestedQty 조건을 DB가 평가하므로 Race Condition 방지
      for (const [variantId, quantity] of itemMap) {
        const { count } = await tx.inventory.updateMany({
          where: { variantId, quantity: { gte: quantity } },
          data: { quantity: { decrement: quantity } },
        });
        if (count === 0) {
          throw new BadRequestException('일부 상품의 재고가 부족합니다.');
        }
      }

      // 주문 생성
      return tx.order.create({
        data: {
          userId,
          addressId: dto.addressId,
          totalAmount,
          shippingFee: 0,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          items: true,
          address: true,
        },
      });
    });
  }

  async getOrder(userId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true, name: true, images: { take: 1, orderBy: { order: 'asc' } } },
                },
              },
            },
          },
        },
        address: true,
      },
    });

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return this.toOrderResponse(order);
  }

  async getOrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<OrderListResponseDto> {
    const skip = (page - 1) * limit;
    const include = {
      items: {
        include: {
          variant: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: { take: 1, orderBy: { order: 'asc' as const } },
                },
              },
            },
          },
        },
      },
    } as const;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async refundOrder(userId: string, orderId: string, reason: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: true },
    });

    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    if (order.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    if (order.status === 'REFUNDED') throw new BadRequestException('이미 환불된 주문입니다.');
    if (order.status !== 'PAID' && order.status !== 'DELIVERED') {
      throw new BadRequestException('환불 가능한 상태가 아닙니다.');
    }
    if (!order.payment) throw new BadRequestException('결제 정보를 찾을 수 없습니다.');

    // 환불 시도 기록을 먼저 저장하여 게이트웨이 API 성공 후 DB 실패 시 추적 가능하도록 함
    const pendingRefund = await this.prisma.refund.create({
      data: {
        orderId,
        paymentId: order.payment.id,
        amount: order.totalAmount,
        reason,
        status: 'REQUESTED',
      },
    });

    await this.processGatewayRefund(order.payment, order.totalAmount, reason);

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      await tx.refund.update({
        where: { id: pendingRefund.id },
        data: { status: 'COMPLETED' },
      });

      await tx.payment.update({
        where: { id: order.payment!.id },
        data: { status: 'REFUNDED' },
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'REFUNDED' },
      });
      return this.toOrderResponse(updatedOrder);
    });
  }

  async partialRefundOrder(userId: string, orderId: string, dto: PartialRefundDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: { include: { refundItems: true } }, refunds: true },
    });

    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    if (order.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    if (order.status === 'REFUNDED') throw new BadRequestException('이미 환불된 주문입니다.');
    if (order.status !== 'PAID' && order.status !== 'DELIVERED') {
      throw new BadRequestException('환불 가능한 상태가 아닙니다.');
    }
    if (!order.payment) throw new BadRequestException('결제 정보를 찾을 수 없습니다.');

    const existingRefundTotal = order.refunds
      .filter((r) => r.status === 'COMPLETED' || r.status === 'REQUESTED')
      .reduce((sum, r) => sum + r.amount, 0);

    let refundAmount = 0;
    const itemsToRefund: { orderItemId: string; variantId: string; quantity: number }[] = [];

    for (const refundItem of dto.items) {
      const orderItem = order.items.find((i) => i.id === refundItem.itemId);
      if (!orderItem) {
        throw new NotFoundException('주문 항목을 찾을 수 없습니다.');
      }
      const alreadyRefundedQty = orderItem.refundItems.reduce((sum, ri) => sum + ri.quantity, 0);
      if (alreadyRefundedQty + refundItem.quantity > orderItem.quantity) {
        throw new BadRequestException('환불 가능 수량을 초과합니다.');
      }
      refundAmount += orderItem.unitPrice * refundItem.quantity;
      itemsToRefund.push({
        orderItemId: orderItem.id,
        variantId: orderItem.variantId,
        quantity: refundItem.quantity,
      });
    }

    if (existingRefundTotal + refundAmount > order.totalAmount) {
      throw new BadRequestException('누적 환불 금액이 결제 총액을 초과합니다.');
    }

    // 환불 시도 기록을 먼저 저장하여 게이트웨이 API 성공 후 DB 실패 시 추적 가능하도록 함
    const pendingRefund = await this.prisma.refund.create({
      data: {
        orderId,
        paymentId: order.payment.id,
        amount: refundAmount,
        reason: dto.reason,
        status: 'REQUESTED',
        items: {
          create: itemsToRefund.map(({ orderItemId, quantity }) => ({ orderItemId, quantity })),
        },
      },
    });

    await this.processGatewayRefund(order.payment, refundAmount, dto.reason);

    return this.prisma.$transaction(async (tx) => {
      for (const { variantId, quantity } of itemsToRefund) {
        await tx.inventory.update({
          where: { variantId },
          data: { quantity: { increment: quantity } },
        });
      }

      return tx.refund.update({
        where: { id: pendingRefund.id },
        data: { status: 'COMPLETED' },
      });
    });
  }

  private async processGatewayRefund(
    payment: { id: string; paymentKey: string | null; paymentMethod: string },
    amount: number,
    reason?: string,
  ): Promise<void> {
    await this.paymentGatewayService.refund(payment, amount, reason);
  }

  private toOrderResponse(order: OrderResponseDto & { payment?: unknown }): OrderResponseDto {
    const { payment, ...response } = order;
    void payment;
    return response;
  }
}
