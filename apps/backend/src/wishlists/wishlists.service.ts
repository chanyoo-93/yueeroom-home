import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistsService {
  constructor(private readonly prisma: PrismaService) {}

  async addItem(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`상품을 찾을 수 없습니다: ${productId}`);
    }

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      throw new ConflictException('이미 위시리스트에 추가된 상품입니다.');
    }

    return this.prisma.wishlistItem.create({
      data: { userId, productId },
    });
  }

  async removeItem(userId: string, productId: string) {
    const { count } = await this.prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });
    if (count === 0) {
      throw new NotFoundException('위시리스트 항목을 찾을 수 없습니다.');
    }
  }

  async getWishlist(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            images: { take: 1, orderBy: { order: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
