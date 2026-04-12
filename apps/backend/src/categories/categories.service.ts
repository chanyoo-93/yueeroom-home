import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: { children: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug ?? this.toSlug(dto.name);

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException(`이미 사용 중인 slug입니다: ${slug}`);

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        parentId: dto.parentId ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.findOneOrFail(id);

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOneOrFail(id);

    const productCount = await this.prisma.category.count({
      where: { id, products: { some: {} } },
    });
    if (productCount > 0) {
      throw new BadRequestException('하위 상품이 있는 카테고리는 삭제할 수 없습니다.');
    }

    await this.prisma.category.delete({ where: { id } });
  }

  private async findOneOrFail(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`카테고리를 찾을 수 없습니다: ${id}`);
    return category;
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w가-힣-]/g, '');
  }
}
