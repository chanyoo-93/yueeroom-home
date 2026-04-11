import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';
import { AuthService } from '../auth.service';
import type { User } from '@prisma/client';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('KAKAO_CLIENT_ID') ?? '',
      clientSecret: configService.get<string>('KAKAO_CLIENT_SECRET') ?? '',
      callbackURL: configService.get<string>('KAKAO_CALLBACK_URL') ?? '',
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: User) => void,
  ): Promise<void> {
    const kakaoAccount = (profile._json as { kakao_account?: { email?: string } }).kakao_account;
    const user = await this.authService.findOrCreateSocialUser({
      provider: 'KAKAO',
      providerId: String(profile.id),
      email: kakaoAccount?.email ?? `kakao_${String(profile.id)}@noemail.com`,
      name: profile.displayName ?? '카카오 사용자',
    });
    done(null, user);
  }
}
