import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inventory } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly threshold: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.threshold =
      this.configService.get<number>('LOW_STOCK_THRESHOLD') ?? DEFAULT_LOW_STOCK_THRESHOLD;
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

    await this.findByVariant(variantId);

    const updated = await this.prisma.inventory.update({
      where: { variantId },
      data: { quantity: dto.quantity },
      include: { variant: { select: { id: true, sku: true, size: true, color: true } } },
    });

    if (updated.quantity <= this.threshold) {
      const variant = (updated as typeof updated & { variant: { sku: string } }).variant;
      this.emailService
        .sendLowStockEmail({
          sku: variant.sku,
          quantity: updated.quantity,
          threshold: this.threshold,
        })
        .catch((err: unknown) => this.logger.error(`저재고 이메일 발송 실패: ${String(err)}`));
    }

    return updated;
  }
}
