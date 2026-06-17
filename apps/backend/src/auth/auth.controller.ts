import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserStatus, type User } from '@prisma/client';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { MfaVerifyDto } from './dto/mfa.dto';
import { RegisterDto } from './dto/register.dto';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15분
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7일

function makeCookieOptions(maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/',
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '회원가입 신청 (PENDING 상태 생성)' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const { message, accessToken, refreshToken } = await this.authService.register(dto);
    res.cookie('access_token', accessToken, makeCookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refresh_token', refreshToken, makeCookieOptions(REFRESH_TOKEN_MAX_AGE));
    return { message };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: '로그인 (APPROVED 회원만 허용)' })
  async login(
    @Req() req: Request & { user: User },
    @Res({ passthrough: true }) res: Response,
    @Body() _dto: LoginDto,
  ): Promise<Record<string, never>> {
    const { accessToken, refreshToken } = await this.authService.login(req.user);
    res.cookie('access_token', accessToken, makeCookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refresh_token', refreshToken, makeCookieOptions(REFRESH_TOKEN_MAX_AGE));
    this.logger.log(`로그인 성공: userId=${req.user.id}`);
    return {};
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access Token 재발급' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ status: UserStatus }> {
    const token = (req.cookies as Record<string, string>)['refresh_token'] ?? '';
    const { accessToken, status } = await this.authService.refresh(token);
    res.cookie('access_token', accessToken, makeCookieOptions(ACCESS_TOKEN_MAX_AGE));
    return { status };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const clearOptions = makeCookieOptions();
    res.clearCookie('access_token', clearOptions);
    res.clearCookie('refresh_token', clearOptions);
    return this.authService.logout(user.sub);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 재설정 이메일 발송' })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 재설정' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  // ── Social Login ─────────────────────────────────────────────────────────────

  @Public()
  @Get('naver')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({ summary: '네이버 소셜 로그인' })
  naverLogin(): void {
    // Passport redirects to Naver OAuth
  }

  @Public()
  @Get('naver/callback')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({ summary: '네이버 OAuth 콜백' })
  async naverCallback(@Req() req: Request & { user: User }, @Res() res: Response): Promise<void> {
    await this.setSocialLoginCookiesAndRedirect(req.user, res);
  }

  @Public()
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: '카카오 소셜 로그인' })
  kakaoLogin(): void {
    // Passport redirects to Kakao OAuth
  }

  @Public()
  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: '카카오 OAuth 콜백' })
  async kakaoCallback(@Req() req: Request & { user: User }, @Res() res: Response): Promise<void> {
    await this.setSocialLoginCookiesAndRedirect(req.user, res);
  }

  private async setSocialLoginCookiesAndRedirect(user: User, res: Response): Promise<void> {
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';

    if (user.status === UserStatus.PENDING) {
      const { accessToken, refreshToken } = await this.authService.issuePendingSession(user);
      res.cookie('access_token', accessToken, makeCookieOptions(ACCESS_TOKEN_MAX_AGE));
      res.cookie('refresh_token', refreshToken, makeCookieOptions(REFRESH_TOKEN_MAX_AGE));
      this.logger.log(`소셜 가입 승인 대기: userId=${user.id}`);
      res.redirect(`${frontendUrl}/pending`);
      return;
    }

    if (user.status === UserStatus.REJECTED) {
      res.redirect(`${frontendUrl}/login?error=rejected`);
      return;
    }

    if (user.status === UserStatus.SUSPENDED) {
      res.redirect(`${frontendUrl}/login?error=suspended`);
      return;
    }

    const { accessToken, refreshToken } = await this.authService.login(user);
    res.cookie('access_token', accessToken, makeCookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refresh_token', refreshToken, makeCookieOptions(REFRESH_TOKEN_MAX_AGE));

    this.logger.log(`소셜 로그인 성공: userId=${user.id}`);
    res.redirect(frontendUrl);
  }

  // ── Admin MFA ────────────────────────────────────────────────────────────────

  @Post('admin/mfa/setup')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '관리자 MFA 설정 (TOTP QR 코드 발급)' })
  setupMfa(@CurrentUser() user: JwtPayload): Promise<{ secret: string; qrCodeUrl: string }> {
    return this.authService.setupMfa(user.sub);
  }

  @Post('admin/mfa/verify')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MFA 코드 검증' })
  verifyMfa(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MfaVerifyDto,
  ): Promise<{ message: string }> {
    return this.authService.verifyMfa(user.sub, dto.code);
  }
}
