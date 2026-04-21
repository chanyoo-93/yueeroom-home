import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class UserStatusGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    const user = request.user;

    if (user) {
      if (user.status === UserStatus.SUSPENDED) {
        throw new ForbiddenException('계정이 정지되었습니다. 관리자에게 문의하세요.');
      }
      if (user.status !== UserStatus.APPROVED) {
        throw new ForbiddenException('승인된 회원만 이용 가능합니다.');
      }
    }
    return true;
  }
}
