import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-naver-v2';
import { AuthService } from '../auth.service';
import type { User } from '@prisma/client';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('NAVER_CLIENT_ID') || 'naver_not_configured',
      clientSecret: configService.get<string>('NAVER_CLIENT_SECRET') || 'naver_not_configured',
      callbackURL:
        configService.get<string>('NAVER_CALLBACK_URL') ||
        'http://localhost:4000/api/auth/naver/callback',
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile): Promise<User> {
    return this.authService.findOrCreateSocialUser({
      provider: 'NAVER',
      providerId: profile.id,
      email: profile.email ?? `naver_${profile.id}@noemail.com`,
      name: profile.name ?? '네이버 사용자',
    });
  }
}
