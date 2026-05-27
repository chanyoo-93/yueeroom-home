import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type SortOrder = 'latest' | 'price_asc' | 'price_desc';

export class ProductQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @IsString()
  @IsOptional()
  size?: string;

  @IsEnum(['latest', 'price_asc', 'price_desc'])
  @IsOptional()
  sort?: SortOrder;

  @IsString()
  @IsOptional()
  cursor?: string;
}
