import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Brand } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Brand[]> {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateBrandDto): Promise<Brand> {
    const existing = await this.prisma.brand.findUnique({ where: { name: dto.name } });
    if (existing) throw new BadRequestException(`이미 사용 중인 브랜드명입니다: ${dto.name}`);
    return this.prisma.brand.create({ data: { name: dto.name } });
  }

  async remove(id: string): Promise<void> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundException(`브랜드를 찾을 수 없습니다: ${id}`);
    if (brand._count.products > 0) {
      throw new BadRequestException('해당 브랜드에 연결된 상품이 있어 삭제할 수 없습니다.');
    }
    await this.prisma.brand.delete({ where: { id } });
  }
}
