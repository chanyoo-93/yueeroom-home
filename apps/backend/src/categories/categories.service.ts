import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // [리뷰 수정] 2depth만 조회 (Root > Child)
  async findAll() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
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

  // [리뷰 수정] slug 변경 시 중복 체크 추가
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.findOneOrFail(id);

    if (dto.slug) {
      const existing = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`이미 사용 중인 slug입니다: ${dto.slug}`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  // [리뷰 수정] 하위 카테고리 존재 여부도 함께 확인 (_count 단일 쿼리)
  async remove(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) throw new NotFoundException(`카테고리를 찾을 수 없습니다: ${id}`);

    if (category._count.products > 0 || category._count.children > 0) {
      throw new BadRequestException(
        '하위 상품 또는 하위 카테고리가 있는 카테고리는 삭제할 수 없습니다.',
      );
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
