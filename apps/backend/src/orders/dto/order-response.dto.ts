import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { AddressResponseDto } from '../../users/dto/user-response.dto';

export class OrderProductImageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  order!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class OrderProductResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  productCode?: string;

  @ApiPropertyOptional()
  categoryId?: string;

  @ApiPropertyOptional({ nullable: true })
  brandId?: string | null;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiPropertyOptional()
  basePrice?: number;

  @ApiPropertyOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;

  @ApiPropertyOptional({ type: [OrderProductImageResponseDto] })
  images?: OrderProductImageResponseDto[];
}

export class OrderProductVariantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  size!: string;

  @ApiProperty()
  color!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: OrderProductResponseDto })
  product?: OrderProductResponseDto;
}

export class OrderItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  variantId!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ type: OrderProductVariantResponseDto })
  variant?: OrderProductVariantResponseDto;
}

export class OrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  addressId!: string;

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

  @ApiPropertyOptional({ type: [OrderItemResponseDto] })
  items?: OrderItemResponseDto[];

  @ApiPropertyOptional({ type: AddressResponseDto })
  address?: AddressResponseDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class OrderListResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items!: OrderResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
