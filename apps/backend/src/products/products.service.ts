import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto, SortOrder } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  private readonly listInclude = {
    category: { select: { id: true, name: true, slug: true } },
    brand: { select: { id: true, name: true } },
    images: { orderBy: { order: 'asc' as const }, take: 1, select: { url: true } },
  };

  async findAll(query: ProductQueryDto) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException('minPrice는 maxPrice보다 클 수 없습니다.');
    }

    const limit = query.limit ?? 20;
    const orderBy = this.resolveOrderBy(query.sort);

    const where: Prisma.ProductWhereInput = {
      isActive: query.isActive ?? true,
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            basePrice: {
              ...(query.minPrice !== undefined && { gte: query.minPrice }),
              ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
            },
          }
        : {}),
      ...(query.size && { variants: { some: { size: query.size } } }),
    };

    // cursor 기반 페이지네이션
    if (query.cursor) {
      const rows = await this.prisma.product.findMany({
        take: limit + 1,
        skip: 1,
        cursor: { id: query.cursor },
        where,
        include: this.listInclude,
        orderBy,
      });
      const hasNext = rows.length > limit;
      const data = hasNext ? rows.slice(0, limit) : rows;
      const nextCursor = hasNext ? (data[data.length - 1]?.id ?? null) : null;
      return { data, limit, nextCursor };
    }

    // offset 기반 페이지네이션 (기본) — nextCursor도 함께 반환
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        take: limit + 1,
        skip,
        where,
        include: this.listInclude,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    const hasNext = rows.length > limit;
    const data = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext ? (data[data.length - 1]?.id ?? null) : null;
    return { data, total, page, limit, nextCursor };
  }

  private resolveOrderBy(sort?: SortOrder): Prisma.ProductOrderByWithRelationInput[] {
    const secondary: Prisma.ProductOrderByWithRelationInput = { id: 'desc' };
    switch (sort) {
      case 'price_asc':
        return [{ basePrice: 'asc' }, secondary];
      case 'price_desc':
        return [{ basePrice: 'desc' }, secondary];
      default:
        return [{ createdAt: 'desc' }, secondary];
    }
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true } },
        images: { orderBy: { order: 'asc' } },
        variants: {
          include: { inventory: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!product) throw new NotFoundException(`상품을 찾을 수 없습니다: ${id}`);
    return product;
  }

  async create(dto: CreateProductDto) {
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException(`카테고리를 찾을 수 없습니다: ${dto.categoryId}`);

    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
      if (!brand) throw new NotFoundException(`브랜드를 찾을 수 없습니다: ${dto.brandId}`);
    }

    const productCode = await this.generateProductCode();

    try {
      return await this.prisma.product.create({
        data: {
          productCode,
          categoryId: dto.categoryId,
          brandId: dto.brandId ?? null,
          name: dto.name,
          description: dto.description,
          basePrice: dto.basePrice,
          isActive: dto.isActive ?? true,
          variants: dto.variants?.length
            ? {
                create: dto.variants.map((v) => ({
                  size: v.size,
                  color: v.color,
                  price: v.price,
                  sku: this.buildSku(productCode, v.size, v.color),
                  inventory: { create: { quantity: 0 } },
                })),
              }
            : undefined,
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true } },
          images: { orderBy: { order: 'asc' } },
          variants: { include: { inventory: true }, orderBy: { createdAt: 'asc' } },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = e.meta?.target as string[];
        if (target?.includes('productCode')) {
          throw new ConflictException('상품 코드 충돌이 발생했습니다. 다시 시도해주세요.');
        }
        if (target?.includes('sku')) {
          throw new ConflictException('이미 동일한 사이즈/색상 옵션이 포함되어 있습니다.');
        }
      }
      throw e;
    }
  }

  private async generateProductCode(): Promise<string> {
    const last = await this.prisma.product.findFirst({
      orderBy: { productCode: 'desc' },
      select: { productCode: true },
    });
    const next = last ? parseInt(last.productCode.slice(3), 10) + 1 : 1;
    return `PRD${String(next).padStart(6, '0')}`;
  }

  private buildSku(productCode: string, size: string, color: string): string {
    return `${productCode}-${size}-${color}`.toUpperCase().replace(/\s+/g, '_');
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOneOrFail(id);

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException(`카테고리를 찾을 수 없습니다: ${dto.categoryId}`);
    }

    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
      if (!brand) throw new NotFoundException(`브랜드를 찾을 수 없습니다: ${dto.brandId}`);
    }

    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async search(q: string): Promise<{ data: Product[]; total: number }> {
    if (!q || q.trim().length === 0) return { data: [], total: 0 };

    // rank을 SELECT에서 한 번만 계산하고 ORDER BY에서 재사용
    const data = await this.prisma.$queryRaw<Product[]>(
      Prisma.sql`
        SELECT id,
               category_id AS "categoryId",
               name,
               description,
               base_price  AS "basePrice",
               is_active   AS "isActive",
               created_at  AS "createdAt",
               updated_at  AS "updatedAt"
        FROM (
          SELECT *,
                 ts_rank(
                   to_tsvector('simple', name || ' ' || COALESCE(description, '')),
                   plainto_tsquery('simple', ${q})
                 ) AS rank
          FROM   products
          WHERE  to_tsvector('simple', name || ' ' || COALESCE(description, '')) @@
                 plainto_tsquery('simple', ${q})
                 AND is_active = true
        ) ranked
        ORDER BY rank DESC
        LIMIT  20
      `,
    );

    return { data, total: data.length };
  }

  async remove(id: string): Promise<void> {
    await this.findOneOrFail(id);

    const [hasOrders, images] = await Promise.all([
      this.prisma.orderItem.findFirst({
        where: { variant: { productId: id } },
        select: { id: true },
      }),
      this.prisma.productImage.findMany({ where: { productId: id } }),
    ]);

    if (hasOrders) {
      throw new ConflictException(
        '주문 내역이 있는 상품은 삭제할 수 없습니다. 비활성화만 가능합니다.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { variant: { productId: id } } });
      await tx.review.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    await Promise.allSettled(images.map((img) => this.filesService.deleteFile(img.key)));
  }

  private async findOneOrFail(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`상품을 찾을 수 없습니다: ${id}`);
    return product;
  }
}
