import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<Prisma.OrderGetPayload<{ include: { items: true; address: true } }>> {
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
          throw new NotFoundException(`상품 변형을 찾을 수 없습니다: ${variantId}`);
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
          throw new BadRequestException(`재고가 부족합니다. 상품: ${variantId}, 요청: ${quantity}`);
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

  async getOrder(userId: string, orderId: string) {
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
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return order;
  }

  async getOrders(userId: string, page: number = 1, limit: number = 10) {
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
}
