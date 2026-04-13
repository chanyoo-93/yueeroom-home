import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async findAll(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { isActive: query.isActive ?? true };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take: limit,
        where,
        include: { category: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page, limit };
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

  async search(q: string): Promise<Product[]> {
    if (!q || q.trim().length === 0) return [];

    return this.prisma.$queryRaw<Product[]>(
      Prisma.sql`
        SELECT id,
               category_id   AS "categoryId",
               name,
               description,
               base_price    AS "basePrice",
               is_active     AS "isActive",
               created_at    AS "createdAt",
               updated_at    AS "updatedAt"
        FROM   products
        WHERE  (
                 to_tsvector('simple', name || ' ' || COALESCE(description, '')) @@
                 plainto_tsquery('simple', ${q})
               )
               AND is_active = true
        ORDER BY ts_rank(
                   to_tsvector('simple', name || ' ' || COALESCE(description, '')),
                   plainto_tsquery('simple', ${q})
                 ) DESC
        LIMIT  20
      `,
    );
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
