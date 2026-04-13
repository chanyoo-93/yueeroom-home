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

  async create(productId: string, dto: CreateVariantDto): Promise<ProductVariant> {
    await this.findProductOrFail(productId);
    await this.assertSkuUnique(dto.sku);

    return this.prisma.productVariant.create({
      data: { ...dto, productId },
    });
  }

  async update(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ): Promise<ProductVariant> {
    await this.findOneOrFail(productId, variantId);

    if (dto.sku) {
      const existing = await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } });
      if (existing && existing.id !== variantId) {
        throw new ConflictException(`이미 사용 중인 SKU입니다: ${dto.sku}`);
      }
    }

    return this.prisma.productVariant.update({ where: { id: variantId }, data: dto });
  }

  async remove(productId: string, variantId: string): Promise<void> {
    await this.findOneOrFail(productId, variantId);
    await this.prisma.productVariant.delete({ where: { id: variantId } });
  }

  private async findProductOrFail(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`상품을 찾을 수 없습니다: ${productId}`);
    return product;
  }

  private async findOneOrFail(productId: string, variantId: string): Promise<ProductVariant> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant || variant.productId !== productId) {
      throw new NotFoundException(`변형을 찾을 수 없습니다: ${variantId}`);
    }
    return variant;
  }

  private async assertSkuUnique(sku: string): Promise<void> {
    const existing = await this.prisma.productVariant.findUnique({ where: { sku } });
    if (existing) throw new ConflictException(`이미 사용 중인 SKU입니다: ${sku}`);
  }
}
