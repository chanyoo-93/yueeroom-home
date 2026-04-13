import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductVariant } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(productId: string): Promise<ProductVariant[]> {
    await this.findProductOrFail(productId);
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // [리뷰 반영] 단일 쿼리 + Inventory 동시 초기화, P2002/P2025 에러 핸들링으로 원자성 보장
  async create(productId: string, dto: CreateVariantDto): Promise<ProductVariant> {
    try {
      return await this.prisma.productVariant.create({
        data: {
          ...dto,
          product: { connect: { id: productId } },
          inventory: { create: { quantity: 0 } },
        },
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new ConflictException(`이미 사용 중인 SKU입니다: ${dto.sku}`);
      }
      if (prismaError.code === 'P2025') {
        throw new NotFoundException(`상품을 찾을 수 없습니다: ${productId}`);
      }
      throw error;
    }
  }

  // [리뷰 반영] 사전 SKU 조회 제거, P2002 캐치로 대체 (쿼리 1개 절감)
  async update(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ): Promise<ProductVariant> {
    await this.findOneOrFail(productId, variantId);

    try {
      return await this.prisma.productVariant.update({ where: { id: variantId }, data: dto });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new ConflictException(`이미 사용 중인 SKU입니다: ${dto.sku ?? ''}`);
      }
      throw error;
    }
  }

  // [리뷰 반영] deleteMany로 존재 확인+삭제+productId 검증을 단일 쿼리 처리
  async remove(productId: string, variantId: string): Promise<void> {
    const { count } = await this.prisma.productVariant.deleteMany({
      where: { id: variantId, productId },
    });
    if (count === 0) throw new NotFoundException(`변형을 찾을 수 없습니다: ${variantId}`);
  }

  private async findProductOrFail(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`상품을 찾을 수 없습니다: ${productId}`);
    return product;
  }

  private async findOneOrFail(productId: string, variantId: string): Promise<ProductVariant> {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) {
      throw new NotFoundException(`변형을 찾을 수 없습니다: ${variantId}`);
    }
    return variant;
  }
}
