import {
  ConflictException,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

function getSocialErrorCode(error: unknown): 'email_conflict' | 'social' {
  return error instanceof ConflictException ? 'email_conflict' : 'social';
}

function redirectSocialAuthError(
  context: ExecutionContext,
  errorCode: 'email_conflict' | 'social',
): void {
  const response = context.switchToHttp().getResponse<Response>();
  const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';
  response.redirect(`${frontendUrl}/login?error=${errorCode}`);
}

@Injectable()
export class SocialNaverAuthGuard extends AuthGuard('naver') {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      redirectSocialAuthError(context, getSocialErrorCode(error));
      return false;
    }
  }

  override handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('소셜 로그인에 실패했습니다.');
    }
    return user;
  }
}

@Injectable()
export class SocialKakaoAuthGuard extends AuthGuard('kakao') {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      redirectSocialAuthError(context, getSocialErrorCode(error));
      return false;
    }
  }

  override handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('소셜 로그인에 실패했습니다.');
    }
    return user;
  }
}
