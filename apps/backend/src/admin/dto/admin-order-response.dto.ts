import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class AdminOrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional({ nullable: true })
  addressId!: string | null;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  shippingFee!: number;

  @ApiPropertyOptional({ nullable: true })
  carrier!: string | null;

  @ApiPropertyOptional({ nullable: true })
  trackingNumber!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
