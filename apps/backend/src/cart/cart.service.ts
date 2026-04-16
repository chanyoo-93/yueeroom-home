import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: { take: 1, orderBy: { order: 'asc' } },
                  },
                },
                inventory: { select: { quantity: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      return { id: null, userId, items: [] };
    }

    return cart;
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { inventory: true },
    });
    if (!variant) {
      throw new NotFoundException(`상품 변형을 찾을 수 없습니다: ${dto.variantId}`);
    }

    const stock = variant.inventory?.quantity ?? 0;

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    // $transaction으로 read-modify-write를 원자적으로 처리해 Race Condition 방지
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: cart.id, variantId: dto.variantId } },
      });

      const totalQuantity = (existing?.quantity ?? 0) + dto.quantity;
      if (totalQuantity > stock) {
        throw new BadRequestException(`재고가 부족합니다. 현재 재고: ${stock}`);
      }

      if (existing) {
        return tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: totalQuantity },
        });
      }

      return tx.cartItem.create({
        data: { cartId: cart.id, variantId: dto.variantId, quantity: dto.quantity },
      });
    });
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      include: { variant: { include: { inventory: true } } },
    });
    if (!item) {
      throw new NotFoundException(`장바구니 항목을 찾을 수 없습니다: ${itemId}`);
    }

    const stock = item.variant.inventory?.quantity ?? 0;
    if (dto.quantity > stock) {
      throw new BadRequestException(`재고가 부족합니다. 현재 재고: ${stock}`);
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });
  }

  async removeItem(userId: string, itemId: string) {
    // deleteMany로 소유권 확인과 삭제를 단일 쿼리로 처리
    const { count } = await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cart: { userId } },
    });

    if (count === 0) {
      throw new NotFoundException(`장바구니 항목을 찾을 수 없습니다: ${itemId}`);
    }
  }

  async clearCart(userId: string) {
    // 관계 필터로 cart.findUnique 선행 조회 없이 단일 쿼리 처리
    await this.prisma.cartItem.deleteMany({
      where: { cart: { userId } },
    });
  }

  async mergeCart(userId: string, dto: MergeCartDto) {
    if (dto.items.length === 0) {
      return this.getCart(userId);
    }

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { inventory: true },
        });
        if (!variant) continue; // 유효하지 않은 variant는 스킵

        const stock = variant.inventory?.quantity ?? 0;
        if (stock === 0) continue; // 재고 없는 항목 스킵

        const existing = await tx.cartItem.findUnique({
          where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } },
        });

        // 합산 수량은 재고를 초과하지 않도록 캡 처리
        const totalQuantity = Math.min((existing?.quantity ?? 0) + item.quantity, stock);

        if (existing) {
          await tx.cartItem.update({
            where: { id: existing.id },
            data: { quantity: totalQuantity },
          });
        } else {
          await tx.cartItem.create({
            data: { cartId: cart.id, variantId: item.variantId, quantity: totalQuantity },
          });
        }
      }
    });

    return this.getCart(userId);
  }
}
