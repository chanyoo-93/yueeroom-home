import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

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

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: dto.variantId } },
    });

    const totalQuantity = (existing?.quantity ?? 0) + dto.quantity;
    if (totalQuantity > stock) {
      throw new BadRequestException(`재고가 부족합니다. 현재 재고: ${stock}`);
    }

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: totalQuantity },
      });
    }

    return this.prisma.cartItem.create({
      data: { cartId: cart.id, variantId: dto.variantId, quantity: dto.quantity },
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
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
    });
    if (!item) {
      throw new NotFoundException(`장바구니 항목을 찾을 수 없습니다: ${itemId}`);
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) return;

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
}
