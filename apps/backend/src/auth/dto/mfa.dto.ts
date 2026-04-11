import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class MfaVerifyDto {
  @ApiProperty({ example: '123456', description: 'TOTP 6자리 코드' })
  @IsString()
  @Length(6, 6, { message: 'MFA 코드는 6자리여야 합니다.' })
  code!: string;
}
