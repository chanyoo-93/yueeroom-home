import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateOrderTrackingDto {
  @IsString()
  @IsNotEmpty()
  carrier!: string;

  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;
}
