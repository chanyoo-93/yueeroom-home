import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';

export class PartialRefundItemDto {
  @ApiProperty({ description: '주문 항목 ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: '환불 수량' })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class PartialRefundDto {
  @ApiProperty({ description: '환불 사유' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ type: [PartialRefundItemDto], description: '환불할 항목 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartialRefundItemDto)
  items: PartialRefundItemDto[];
}
