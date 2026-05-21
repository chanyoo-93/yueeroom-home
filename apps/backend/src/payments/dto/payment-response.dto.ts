import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, RefundStatus } from '@prisma/client';
import { OrderResponseDto } from '../../orders/dto/order-response.dto';

export class PaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  paymentMethod!: string;

  @ApiPropertyOptional({ nullable: true })
  paidAt!: Date | null;

  @ApiPropertyOptional({ type: OrderResponseDto })
  order?: OrderResponseDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class RefundResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  paymentId!: string;

  @ApiProperty({ enum: RefundStatus })
  status!: RefundStatus;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  reason!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaymentListResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  items!: PaymentResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
