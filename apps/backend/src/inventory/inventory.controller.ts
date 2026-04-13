import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':variantId')
  findByVariant(@Param('variantId') variantId: string) {
    return this.inventoryService.findByVariant(variantId);
  }

  @Patch(':variantId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateQuantity(@Param('variantId') variantId: string, @Body() dto: UpdateInventoryDto) {
    return this.inventoryService.updateQuantity(variantId, dto);
  }
}
