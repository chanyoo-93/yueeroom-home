import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { UserStatusGuard } from './user-status.guard';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

function makeContext(user: Partial<JwtPayload> | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('UserStatusGuard', () => {
  let guard: UserStatusGuard;

  beforeEach(() => {
    guard = new UserStatusGuard();
  });

  it('APPROVED 회원은 통과한다', () => {
    const ctx = makeContext({
      sub: 'u1',
      email: 'a@test.com',
      role: UserRole.CUSTOMER,
      status: UserStatus.APPROVED,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('user가 없으면 통과한다 (Public 엔드포인트 대응)', () => {
    const ctx = makeContext(undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('PENDING 회원은 ForbiddenException을 던진다', () => {
    const ctx = makeContext({
      sub: 'u2',
      email: 'p@test.com',
      role: UserRole.CUSTOMER,
      status: UserStatus.PENDING,
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('SUSPENDED 회원은 정지 안내 메시지와 함께 ForbiddenException을 던진다', () => {
    const ctx = makeContext({
      sub: 'u3',
      email: 's@test.com',
      role: UserRole.CUSTOMER,
      status: UserStatus.SUSPENDED,
    });
    expect(() => guard.canActivate(ctx)).toThrow(
      new ForbiddenException('계정이 정지되었습니다. 관리자에게 문의하세요.'),
    );
  });
});
