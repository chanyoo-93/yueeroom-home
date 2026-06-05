import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class KcpVbankPrepareDto {
  @ApiProperty({ description: '결제할 주문 ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;
}
