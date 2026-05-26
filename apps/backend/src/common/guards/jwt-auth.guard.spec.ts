import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  describe('handleRequest', () => {
    it('user가 없으면 UnauthorizedException을 던진다', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
    });

    it('err가 있으면 해당 에러를 던진다', () => {
      const error = new UnauthorizedException('jwt expired');

      expect(() => guard.handleRequest(error, { sub: 'user-1' })).toThrow(error);
    });

    it('user가 있으면 그대로 반환한다', () => {
      const user = { sub: 'user-1' };

      expect(guard.handleRequest(null, user)).toBe(user);
    });
  });

  describe('canActivate', () => {
    const jwtAuthGuardPrototype = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
      canActivate: (context: ExecutionContext) => boolean;
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('@Public() 엔드포인트는 JWT 검증 없이 true를 반환한다', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const superCanActivate = jest.spyOn(jwtAuthGuardPrototype, 'canActivate');

      const result = guard.canActivate(makeContext());

      expect(result).toBe(true);
      expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('@Public() 없는 엔드포인트는 super.canActivate()를 호출한다', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = makeContext();
      const superCanActivate = jest
        .spyOn(jwtAuthGuardPrototype, 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(superCanActivate).toHaveBeenCalledWith(context);
    });
  });
});
