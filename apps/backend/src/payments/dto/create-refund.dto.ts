import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRefundDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
