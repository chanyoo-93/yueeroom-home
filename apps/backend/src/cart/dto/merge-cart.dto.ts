import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class MergeCartItemDto {
  @IsString()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class MergeCartDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MergeCartItemDto)
  items!: MergeCartItemDto[];
}
