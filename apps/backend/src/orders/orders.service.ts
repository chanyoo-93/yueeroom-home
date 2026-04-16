import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Order } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    // 배송지 소유권 확인
    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId },
    });
    if (!address || address.userId !== userId) {
      throw new NotFoundException('배송지를 찾을 수 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const variantIds = dto.items.map((i) => i.variantId);

      // 변형 및 재고 일괄 조회 (N+1 방지)
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { inventory: true },
      });
      const variantMap = new Map(variants.map((v) => [v.id, v]));

      // 재고 검증 및 단가 계산
      let totalAmount = 0;
      const itemsToCreate: { variantId: string; quantity: number; unitPrice: number }[] = [];

      for (const item of dto.items) {
        const variant = variantMap.get(item.variantId);
        if (!variant) {
          throw new NotFoundException(`상품 변형을 찾을 수 없습니다: ${item.variantId}`);
        }

        const stock = variant.inventory?.quantity ?? 0;
        if (item.quantity > stock) {
          throw new BadRequestException(
            `재고가 부족합니다. 상품: ${item.variantId}, 요청: ${item.quantity}, 재고: ${stock}`,
          );
        }

        totalAmount += variant.price * item.quantity;
        itemsToCreate.push({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: variant.price,
        });
      }

      // 재고 차감 (각 variant별 업데이트)
      for (const item of dto.items) {
        const variant = variantMap.get(item.variantId)!;
        const currentStock = variant.inventory?.quantity ?? 0;
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: { quantity: currentStock - item.quantity },
        });
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

    if (!order || order.userId !== userId) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    return order;
  }

  async getOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
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
      orderBy: { createdAt: 'desc' },
    });
  }
}
