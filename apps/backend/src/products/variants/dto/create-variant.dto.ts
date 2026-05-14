import { IsInt, IsString, Min } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  size!: string;

  @IsString()
  color!: string;

  @IsInt()
  @Min(0)
  price!: number;
}
