import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class KakaoPayApproveDto {
  @ApiProperty({ description: '결제할 주문 ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ description: '카카오페이 결제 승인 토큰' })
  @IsString()
  @IsNotEmpty()
  pgToken!: string;
}
