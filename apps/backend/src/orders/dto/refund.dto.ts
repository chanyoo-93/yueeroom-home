import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefundDto {
  @ApiProperty({ description: '환불 사유' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
