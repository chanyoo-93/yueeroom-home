import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthProvider, UserRole, UserStatus } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ enum: AuthProvider })
  provider!: AuthProvider;

  @ApiProperty()
  mfaEnabled!: boolean;

  @ApiPropertyOptional({ nullable: true })
  consentAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  deletedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ChildProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  birthDate!: Date;

  @ApiPropertyOptional({ nullable: true })
  gender!: string | null;

  @ApiPropertyOptional({ nullable: true })
  height!: number | null;

  @ApiPropertyOptional({ nullable: true })
  weight!: number | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class AddressResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  recipient!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  zipCode!: string;

  @ApiProperty()
  address1!: string;

  @ApiPropertyOptional({ nullable: true })
  address2!: string | null;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
