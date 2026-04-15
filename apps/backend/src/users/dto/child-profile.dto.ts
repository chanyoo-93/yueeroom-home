import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateChildProfileDto {
  @IsString()
  @MinLength(1, { message: '자녀 이름을 입력해주세요.' })
  @MaxLength(50)
  name!: string;

  @IsDateString({}, { message: '올바른 생년월일 형식이 아닙니다.' })
  birthDate!: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}

export class UpdateChildProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: '자녀 이름을 입력해주세요.' })
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsDateString({}, { message: '올바른 생년월일 형식이 아닙니다.' })
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}
