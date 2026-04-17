import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class NaverPayApproveDto {
  @ApiProperty({ description: '네이버페이 결제 ID' })
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @ApiProperty({ description: '가맹점 결제 키 (주문 ID)' })
  @IsString()
  @IsNotEmpty()
  merchantPayKey!: string;
}
