import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MinLength(1, { message: '배송지 이름을 입력해주세요.' })
  @MaxLength(30)
  name!: string;

  @IsString()
  @MinLength(1, { message: '수령인을 입력해주세요.' })
  @MaxLength(50)
  recipient!: string;

  @IsString()
  @MinLength(1, { message: '연락처를 입력해주세요.' })
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(1, { message: '우편번호를 입력해주세요.' })
  @MaxLength(10)
  zipCode!: string;

  @IsString()
  @MinLength(1, { message: '주소를 입력해주세요.' })
  address1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  address2?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  recipient?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string;

  @IsOptional()
  @IsString()
  address1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  address2?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
