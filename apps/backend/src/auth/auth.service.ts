import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import { toDataURL } from 'qrcode';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { RegisterDto } from './dto/register.dto';
import type { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const PASSWORD_RESET_TTL_SECONDS = 30 * 60; // 30 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────────

  async register(
    dto: RegisterDto,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }> {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        status: UserStatus.PENDING,
        consentAt: dto.termsAgreed ? new Date() : null,
      },
    });

    // 가입 직후 PENDING 상태 토큰을 발급한다.
    // 브라우저에 남은 이전 세션 쿠키와 혼용되지 않도록 신규 사용자 세션을 즉시 확립한다.
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
    await this.redisService.set(`refresh:${user.id}`, refreshToken, REFRESH_TOKEN_TTL_SECONDS);

    return {
      message: '회원가입 신청이 완료되었습니다. 관리자 승인 후 로그인하실 수 있습니다.',
      accessToken,
      refreshToken,
    };
  }

  // ── Validate (local strategy) ────────────────────────────────────────────────

  async validateLocalUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      this.logger.warn(`로그인 실패 — 존재하지 않는 이메일: ${email}`);
      return null;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      this.logger.warn(`로그인 실패 — 비밀번호 불일치: userId=${user.id}`);
      return null;
    }

    return user;
  }

  // ── Login ───────────────────────────────────────────────────────────────────

  async login(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    if (user.status !== UserStatus.APPROVED) {
      const messageMap: Record<string, string> = {
        [UserStatus.PENDING]: '관리자 승인 대기 중입니다.',
        [UserStatus.REJECTED]: '가입이 거절되었습니다.',
        [UserStatus.SUSPENDED]: '계정이 정지되었습니다.',
      };
      this.logger.warn(`로그인 거부 — 미승인 계정: userId=${user.id} status=${user.status}`);
      throw new ForbiddenException(messageMap[user.status] ?? '접근 불가');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    await this.redisService.set(`refresh:${user.id}`, refreshToken, REFRESH_TOKEN_TTL_SECONDS);

    return { accessToken, refreshToken };
  }

  // ── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<{ accessToken: string; status: UserStatus }> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh Token이 유효하지 않습니다.');
    }

    const stored = await this.redisService.get(`refresh:${payload.sub}`);
    if (stored !== refreshToken) {
      this.logger.warn(`토큰 재발급 실패 — 저장된 토큰 불일치: userId=${payload.sub}`);
      throw new UnauthorizedException('Refresh Token이 만료되었습니다.');
    }

    // payload의 status는 발급 당시 값이므로 DB에서 현재 상태를 조회한다.
    // (관리자 승인 후 APPROVED로 갱신된 상태를 반영하기 위해)
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('존재하지 않는 사용자입니다.');

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    return { accessToken, status: user.status };
  }

  // ── Logout ──────────────────────────────────────────────────────────────────

  async logout(userId: string): Promise<{ message: string }> {
    await this.redisService.del(`refresh:${userId}`);
    return { message: '로그아웃 되었습니다.' };
  }

  async issuePendingSession(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException('승인 대기 사용자가 아닙니다.');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
    await this.redisService.set(`refresh:${user.id}`, refreshToken, REFRESH_TOKEN_TTL_SECONDS);

    return { accessToken, refreshToken };
  }

  // ── Social Login ─────────────────────────────────────────────────────────────

  async findOrCreateSocialUser(data: {
    provider: 'NAVER' | 'KAKAO';
    providerId: string;
    email: string;
    name: string;
  }): Promise<User> {
    const provider = data.provider as AuthProvider;
    const existing = await this.prisma.user.findUnique({
      where: { provider_providerId: { provider, providerId: data.providerId } },
    });
    if (existing) return existing;

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        provider,
        providerId: data.providerId,
        status: UserStatus.PENDING,
      },
    });
  }

  // ── Forgot Password ──────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // 보안상 이메일 존재 여부와 무관하게 동일 응답
    if (!user || user.provider !== AuthProvider.LOCAL) {
      return { message: '비밀번호 재설정 링크를 이메일로 발송했습니다.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    await this.redisService.set(`password_reset:${token}`, user.id, PASSWORD_RESET_TTL_SECONDS);

    await this.emailService.sendPasswordResetEmail(user.email, token);
    return { message: '비밀번호 재설정 링크를 이메일로 발송했습니다.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const userId = await this.redisService.get(`password_reset:${dto.token}`);
    if (!userId) throw new BadRequestException('유효하지 않거나 만료된 토큰입니다.');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.redisService.del(`password_reset:${dto.token}`);
    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }

  // ── MFA (Admin TOTP) ─────────────────────────────────────────────────────────

  async setupMfa(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secretObj = speakeasy.generateSecret({ name: `유이룸 Admin (${user.email})` });
    const secret = secretObj.base32;
    const otpAuthUrl = secretObj.otpauth_url ?? '';
    const qrCodeUrl = await toDataURL(otpAuthUrl);

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaEnabled: false },
    });

    return { secret, qrCodeUrl };
  }

  async verifyMfa(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret) throw new BadRequestException('MFA가 설정되지 않았습니다.');

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!isValid) throw new UnauthorizedException('MFA 코드가 올바르지 않습니다.');

    if (!user.mfaEnabled) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      });
    }

    return { message: 'MFA 인증 성공' };
  }
}
