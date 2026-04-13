import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ProductQueryDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
