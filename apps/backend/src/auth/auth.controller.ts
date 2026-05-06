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
import type { User } from '@prisma/client';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { MfaVerifyDto } from './dto/mfa.dto';
import { RegisterDto } from './dto/register.dto';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15분
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7일

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
  ): Promise<{ message: string; accessToken: string }> {
    const { message, accessToken, refreshToken } = await this.authService.register(dto);
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
    return { message, accessToken };
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
  ): Promise<{ accessToken: string }> {
    const { accessToken, refreshToken } = await this.authService.login(req.user);
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
    this.logger.log(`로그인 성공: userId=${req.user.id}`);
    return { accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access Token 재발급' })
  refresh(@Req() req: Request): Promise<{ accessToken: string }> {
    const token = (req.cookies as Record<string, string>)['refresh_token'] ?? '';
    return this.authService.refresh(token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    res.clearCookie('refresh_token');
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
    const { accessToken, refreshToken } = await this.authService.login(user);
    const secure = process.env['NODE_ENV'] === 'production';
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';

    // access_token: non-httpOnly (Edge Runtime 미들웨어에서 JWT payload 직접 읽기 위해)
    res.cookie('access_token', accessToken, {
      httpOnly: false,
      secure,
      sameSite: 'strict',
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    this.logger.log(`소셜 로그인 성공: userId=${user.id}`);
    res.redirect(frontendUrl);
  }

  // ── Admin MFA ────────────────────────────────────────────────────────────────

  @Post('admin/mfa/setup')
  @ApiOperation({ summary: '관리자 MFA 설정 (TOTP QR 코드 발급)' })
  setupMfa(@CurrentUser() user: JwtPayload): Promise<{ secret: string; qrCodeUrl: string }> {
    return this.authService.setupMfa(user.sub);
  }

  @Post('admin/mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MFA 코드 검증' })
  verifyMfa(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MfaVerifyDto,
  ): Promise<{ message: string }> {
    return this.authService.verifyMfa(user.sub, dto.code);
  }
}
