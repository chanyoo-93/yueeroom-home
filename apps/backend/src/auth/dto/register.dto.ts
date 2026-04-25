import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email!: string;

  @ApiProperty({ example: 'Password1!' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message: '비밀번호는 영문 대/소문자, 숫자, 특수문자를 포함해야 합니다.',
  })
  password!: string;

  @ApiProperty({ example: '홍길동' })
  @IsString()
  @MinLength(2, { message: '이름은 최소 2자 이상이어야 합니다.' })
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: true, description: '개인정보 수집·이용 동의 (필수)' })
  @IsBoolean({ message: '개인정보 수집·이용에 동의해야 합니다.' })
  termsAgreed!: boolean;
}
