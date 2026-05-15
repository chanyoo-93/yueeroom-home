import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q!: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  isActive?: boolean;
}
