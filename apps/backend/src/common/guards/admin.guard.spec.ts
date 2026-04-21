import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { AdminGuard } from './admin.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

function makeContext(user: Partial<JwtPayload> | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  it('ADMIN role이면 통과한다', () => {
    const ctx = makeContext({
      sub: 'u1',
      email: 'a@test.com',
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('CUSTOMER role이면 ForbiddenException을 던진다', () => {
    const ctx = makeContext({
      sub: 'u2',
      email: 'c@test.com',
      role: UserRole.CUSTOMER,
      status: UserStatus.APPROVED,
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('user가 없으면 ForbiddenException을 던진다', () => {
    const ctx = makeContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
