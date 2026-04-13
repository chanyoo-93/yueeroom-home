import { IsInt, IsString, Min } from 'class-validator';

export class CreateVariantDto {
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
