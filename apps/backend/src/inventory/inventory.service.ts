import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Inventory } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async findAll() {
    return this.prisma.inventory.findMany({
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            price: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { quantity: 'asc' },
    });
  }

  async findByVariant(variantId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId },
      include: { variant: { select: { id: true, sku: true, size: true, color: true } } },
    });
    if (!inventory) throw new NotFoundException(`재고 정보를 찾을 수 없습니다: ${variantId}`);
    return inventory;
  }

  async updateQuantity(variantId: string, dto: UpdateInventoryDto): Promise<Inventory> {
    if (dto.quantity < 0) {
      throw new BadRequestException('재고 수량은 0 이상이어야 합니다.');
    }

    const current = await this.prisma.inventory.findUnique({
      where: { variantId },
      include: { variant: { select: { id: true, sku: true, size: true, color: true } } },
    });
    if (!current) throw new NotFoundException(`재고 정보를 찾을 수 없습니다: ${variantId}`);

    const updated = await this.prisma.inventory.update({
      where: { variantId },
      data: { quantity: dto.quantity },
    });

    const threshold = current.lowStockThreshold;
    const wasAbove = current.quantity > threshold;
    const isNowBelow = dto.quantity <= threshold;
    if (wasAbove && isNowBelow) {
      this.emailService
        .sendLowStockEmail({
          sku: current.variant.sku,
          quantity: dto.quantity,
          threshold,
        })
        .catch((err: unknown) => this.logger.error(`저재고 이메일 발송 실패: ${String(err)}`));
    }

    return updated;
  }

  async updateThreshold(variantId: string, dto: UpdateThresholdDto): Promise<Inventory> {
    const inventory = await this.prisma.inventory.findUnique({ where: { variantId } });
    if (!inventory) throw new NotFoundException(`재고 정보를 찾을 수 없습니다: ${variantId}`);

    return this.prisma.inventory.update({
      where: { variantId },
      data: { lowStockThreshold: dto.lowStockThreshold },
    });
  }
}
