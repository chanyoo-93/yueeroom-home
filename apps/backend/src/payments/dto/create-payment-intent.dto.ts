import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ description: '결제할 주문 ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiPropertyOptional({ description: '할부 개월 수 (2, 3, 6, 12)', enum: [2, 3, 6, 12] })
  @IsOptional()
  @IsInt()
  @IsIn([2, 3, 6, 12])
  installmentMonths?: number;
}
