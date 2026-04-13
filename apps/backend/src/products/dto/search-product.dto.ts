import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SearchProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q!: string;
}
