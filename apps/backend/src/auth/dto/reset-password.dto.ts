import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: '비밀번호 재설정 토큰 (이메일로 발송됨)' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'NewPassword1!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message: '비밀번호는 영문 대/소문자, 숫자, 특수문자를 포함해야 합니다.',
  })
  newPassword!: string;
}
