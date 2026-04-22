import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get(':variantId')
  findByVariant(@Param('variantId') variantId: string) {
    return this.inventoryService.findByVariant(variantId);
  }

  @Patch(':variantId')
  updateQuantity(@Param('variantId') variantId: string, @Body() dto: UpdateInventoryDto) {
    return this.inventoryService.updateQuantity(variantId, dto);
  }

  @Patch(':variantId/threshold')
  updateThreshold(@Param('variantId') variantId: string, @Body() dto: UpdateThresholdDto) {
    return this.inventoryService.updateThreshold(variantId, dto);
  }
}
