import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateVariantInProductDto {
  @IsString()
  size!: string;

  @IsString()
  color!: string;

  @IsString()
  sku!: string;

  @IsInt()
  @Min(0)
  price!: number;
}

export class CreateProductDto {
  @IsString()
  categoryId!: string;

  @IsString()
  @IsOptional()
  brandId?: string | null;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  basePrice!: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantInProductDto)
  @IsOptional()
  variants?: CreateVariantInProductDto[];
}
