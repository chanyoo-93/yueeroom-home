import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
        include: { category: { select: { id: true, name: true, slug: true } } },
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
        include: { category: { select: { id: true, name: true, slug: true } } },
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
        variants: true,
      },
    });
    if (!product) throw new NotFoundException(`상품을 찾을 수 없습니다: ${id}`);
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException(`카테고리를 찾을 수 없습니다: ${dto.categoryId}`);

    return this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        basePrice: dto.basePrice,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOneOrFail(id);

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException(`카테고리를 찾을 수 없습니다: ${dto.categoryId}`);
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

    const images = await this.prisma.productImage.findMany({ where: { productId: id } });
    await Promise.allSettled(images.map((img) => this.filesService.deleteFile(img.key)));

    await this.prisma.product.delete({ where: { id } });
  }

  private async findOneOrFail(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`상품을 찾을 수 없습니다: ${id}`);
    return product;
  }
}
