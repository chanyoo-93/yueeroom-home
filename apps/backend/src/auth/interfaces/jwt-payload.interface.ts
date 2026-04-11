import { UserRole, UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
  status: UserStatus;
}
