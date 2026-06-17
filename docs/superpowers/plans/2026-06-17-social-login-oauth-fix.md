# 소셜 로그인 OAuth 오류 해결 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬 환경에서 네이버/카카오 OAuth 설정 오류를 해결하고, 신규 소셜 사용자는 승인 대기 상태로 `/pending`에 보내며 승인된 기존 소셜 사용자만 로그인되게 한다.

**Architecture:** OAuth 시작은 기존 `/api/auth/naver`, `/api/auth/kakao` 엔드포인트를 유지한다. 콜백에서는 소셜 사용자 조회/생성 후 상태에 따라 `APPROVED`는 로그인 쿠키 발급 후 홈으로, `PENDING`은 pending 세션 쿠키 발급 후 `/pending`으로, `REJECTED`/`SUSPENDED` 및 이메일 충돌은 `/login` 오류 쿼리로 리다이렉트한다. OAuth provider 설정 오류는 코드가 아니라 로컬 `.env`와 Kakao/Naver 개발자 콘솔의 redirect URI 정합성으로 해결한다.

**Tech Stack:** NestJS, Passport OAuth (`passport-naver-v2`, `passport-kakao`), Prisma, JWT HTTP-only cookies, Next.js, Vitest, Jest

---

## 파일 구조

| 파일                                            | 작업           | 책임                                                            |
| ----------------------------------------------- | -------------- | --------------------------------------------------------------- |
| `apps/backend/src/auth/auth.service.ts`         | 수정           | 소셜 사용자 생성/조회, 이메일 충돌 처리, pending 세션 토큰 발급 |
| `apps/backend/src/auth/auth.controller.ts`      | 수정           | OAuth 콜백 상태별 쿠키 설정 및 리다이렉트                       |
| `apps/backend/src/auth/auth.service.spec.ts`    | 수정           | 소셜 사용자 생성/충돌/pending 토큰 테스트                       |
| `apps/backend/src/auth/auth.controller.spec.ts` | 수정           | OAuth 콜백 리다이렉트 테스트                                    |
| `apps/frontend/src/app/login/page.tsx`          | 수정           | `?error=` 쿼리 기반 소셜 로그인 오류 안내                       |
| `apps/frontend/src/app/login/page.test.tsx`     | 수정           | 소셜 로그인 오류 메시지 렌더링 테스트                           |
| `apps/backend/.env`                             | 로컬 수동 수정 | 실제 OAuth client id/secret 및 callback URL 입력                |
| Kakao Developers                                | 수동 설정      | Redirect URI와 Web platform domain 등록                         |
| Naver Developers                                | 수동 설정      | Callback URL과 서비스 URL 등록                                  |

---

### Task 1: OAuth 로컬 설정 정합성 확인

**Files:**

- Read: `apps/backend/.env`
- Read: `apps/frontend/.env.local`
- Reference: `.env.example`
- Manual: Kakao Developers, Naver Developers

- [ ] **Step 1: 로컬 프론트 API URL 확인**

Run:

```bash
rg -n "NEXT_PUBLIC_API_URL" apps/frontend/.env.local
```

Expected:

```text
apps/frontend/.env.local:1:NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

- [ ] **Step 2: 백엔드 OAuth env를 실제 값으로 설정**

`apps/backend/.env`에서 placeholder를 실제 값으로 교체한다.

```dotenv
FRONTEND_URL=http://localhost:3000

NAVER_CLIENT_ID=<Naver Developers Client ID>
NAVER_CLIENT_SECRET=<Naver Developers Client Secret>
NAVER_CALLBACK_URL=http://localhost:4000/api/auth/naver/callback

KAKAO_CLIENT_ID=<Kakao Developers REST API Key>
KAKAO_CLIENT_SECRET=<Kakao Developers Client Secret>
KAKAO_CALLBACK_URL=http://localhost:4000/api/auth/kakao/callback
```

카카오에서 Client Secret을 사용하지 않도록 설정했다면 `KAKAO_CLIENT_SECRET`은 비우지 말고 코드 수정 Task 6까지 진행한 뒤 optional 처리한다.

- [ ] **Step 3: Kakao Developers 설정 확인**

Kakao Developers 앱 설정에서 아래 값이 정확히 등록되어 있어야 한다.

```text
카카오 로그인 활성화: ON
Redirect URI: http://localhost:4000/api/auth/kakao/callback
Web platform site domain: http://localhost:3000
REST API Key: apps/backend/.env 의 KAKAO_CLIENT_ID
Client Secret: apps/backend/.env 의 KAKAO_CLIENT_SECRET
```

KOE101은 보통 `KAKAO_CLIENT_ID`가 REST API 키가 아니거나, Redirect URI/Web platform domain이 등록값과 다를 때 발생한다.

- [ ] **Step 4: Naver Developers 설정 확인**

Naver Developers 앱 설정에서 아래 값이 정확히 등록되어 있어야 한다.

```text
서비스 URL: http://localhost:3000
Callback URL: http://localhost:4000/api/auth/naver/callback
Client ID: apps/backend/.env 의 NAVER_CLIENT_ID
Client Secret: apps/backend/.env 의 NAVER_CLIENT_SECRET
```

네이버의 "페이지를 찾을 수 없습니다."는 Client ID가 placeholder이거나 Callback URL이 등록값과 다를 때 재현될 수 있다.

- [ ] **Step 5: 서버 재시작**

Run:

```bash
pnpm dev
```

Expected:

```text
Server running on http://localhost:4000
```

---

### Task 2: 소셜 신규 사용자 pending 세션 발급 테스트 추가

**Files:**

- Modify: `apps/backend/src/auth/auth.service.spec.ts`
- Modify: `apps/backend/src/auth/auth.service.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/backend/src/auth/auth.service.spec.ts`의 `findOrCreateSocialUser` describe 아래에 pending 세션 발급 테스트를 추가한다.

```ts
describe('issuePendingSession', () => {
  it('PENDING 사용자에게 pending 상태 토큰을 발급하고 Redis에 refresh token을 저장한다', async () => {
    const pendingUser = {
      ...mockPendingUser,
      id: 'pending-social-1',
      email: 'social@test.com',
      status: UserStatus.PENDING,
    };

    mockJwtService.sign
      .mockReturnValueOnce('pending-access-token')
      .mockReturnValueOnce('pending-refresh-token');

    const result = await service.issuePendingSession(pendingUser);

    expect(mockJwtService.sign).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sub: 'pending-social-1',
        email: 'social@test.com',
        status: UserStatus.PENDING,
      }),
      { expiresIn: '15m' },
    );
    expect(mockJwtService.sign).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sub: 'pending-social-1',
        email: 'social@test.com',
        status: UserStatus.PENDING,
      }),
      { secret: 'refresh-secret', expiresIn: '7d' },
    );
    expect(mockRedisService.set).toHaveBeenCalledWith(
      'refresh:pending-social-1',
      'pending-refresh-token',
      604800,
    );
    expect(result).toEqual({
      accessToken: 'pending-access-token',
      refreshToken: 'pending-refresh-token',
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:

```bash
pnpm --filter @yueeroom/backend test -- --silent src/auth/auth.service.spec.ts
```

Expected:

```text
Property 'issuePendingSession' does not exist
```

- [ ] **Step 3: `issuePendingSession` 구현**

`apps/backend/src/auth/auth.service.ts`에서 `register()`의 pending 토큰 발급과 같은 형태로 public 메서드를 추가한다.

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run:

```bash
pnpm --filter @yueeroom/backend test -- --silent src/auth/auth.service.spec.ts
```

Expected:

```text
PASS src/auth/auth.service.spec.ts
```

- [ ] **Step 5: 커밋**

```bash
git add apps/backend/src/auth/auth.service.ts apps/backend/src/auth/auth.service.spec.ts
git commit -m "feat: 소셜 승인 대기 세션 발급 추가"
```

---

### Task 3: 소셜 이메일 충돌 처리

**Files:**

- Modify: `apps/backend/src/auth/auth.service.spec.ts`
- Modify: `apps/backend/src/auth/auth.service.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/backend/src/auth/auth.service.spec.ts`의 `findOrCreateSocialUser` describe에 같은 이메일의 다른 provider 계정이 있을 때 충돌시키는 테스트를 추가한다.

```ts
it('같은 이메일의 다른 provider 계정이 있으면 ConflictException을 던진다', async () => {
  mockPrisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
    ...mockApprovedUser,
    provider: AuthProvider.LOCAL,
    providerId: null,
    email: 'same@test.com',
  });

  await expect(
    service.findOrCreateSocialUser({
      provider: 'KAKAO',
      providerId: 'kakao-999',
      email: 'same@test.com',
      name: '카카오유저',
    }),
  ).rejects.toThrow(ConflictException);

  expect(mockPrisma.user.create).not.toHaveBeenCalled();
});
```

필요하면 파일 상단 import에 `ConflictException`과 `AuthProvider`를 추가한다.

```ts
import { ConflictException } from '@nestjs/common';
import { AuthProvider, UserStatus } from '@prisma/client';
```

- [ ] **Step 2: 테스트 실패 확인**

Run:

```bash
pnpm --filter @yueeroom/backend test -- --silent src/auth/auth.service.spec.ts
```

Expected: `ConflictException`이 아니라 create 호출 또는 Prisma mock 관련 실패.

- [ ] **Step 3: 이메일 충돌 검사를 구현**

`apps/backend/src/auth/auth.service.ts`의 `findOrCreateSocialUser()`에서 provider/providerId 조회 후 create 전에 이메일 조회를 추가한다.

```ts
const emailOwner = await this.prisma.user.findUnique({ where: { email: data.email } });
if (emailOwner) {
  throw new ConflictException('이미 다른 방식으로 가입된 이메일입니다.');
}
```

완성 형태:

```ts
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

  const emailOwner = await this.prisma.user.findUnique({ where: { email: data.email } });
  if (emailOwner) {
    throw new ConflictException('이미 다른 방식으로 가입된 이메일입니다.');
  }

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
```

- [ ] **Step 4: 테스트 통과 확인**

Run:

```bash
pnpm --filter @yueeroom/backend test -- --silent src/auth/auth.service.spec.ts
```

Expected:

```text
PASS src/auth/auth.service.spec.ts
```

- [ ] **Step 5: 커밋**

```bash
git add apps/backend/src/auth/auth.service.ts apps/backend/src/auth/auth.service.spec.ts
git commit -m "fix: 소셜 로그인 이메일 충돌 처리"
```

---

### Task 4: OAuth 콜백 상태별 리다이렉트

**Files:**

- Modify: `apps/backend/src/auth/auth.controller.spec.ts`
- Modify: `apps/backend/src/auth/auth.controller.ts`

- [ ] **Step 1: pending 사용자 콜백 테스트 작성**

`apps/backend/src/auth/auth.controller.spec.ts`의 `naverCallback` describe에 테스트를 추가한다.

```ts
it('PENDING 소셜 사용자는 pending 쿠키를 설정하고 /pending으로 리다이렉트한다', async () => {
  const fakeUser = {
    id: 'pending-1',
    email: 'pending@test.com',
    status: UserStatus.PENDING,
  } as never;
  mockAuthService.issuePendingSession.mockResolvedValue({
    accessToken: 'pending.acc',
    refreshToken: 'pending.ref',
  });
  const res = makeResponse();

  await controller.naverCallback({ user: fakeUser } as never, res);

  expect(mockAuthService.login).not.toHaveBeenCalled();
  expect(mockAuthService.issuePendingSession).toHaveBeenCalledWith(fakeUser);
  expect(res.cookie).toHaveBeenCalledWith(
    'access_token',
    'pending.acc',
    expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
  );
  expect(res.cookie).toHaveBeenCalledWith(
    'refresh_token',
    'pending.ref',
    expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
  );
  expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/pending');
});
```

`beforeEach`의 mockAuthService에 메서드를 추가한다.

```ts
issuePendingSession: jest.fn(),
```

- [ ] **Step 2: rejected/suspended 사용자 테스트 작성**

`kakaoCallback` describe에 거절/정지 리다이렉트 테스트를 추가한다.

```ts
it.each([
  [UserStatus.REJECTED, 'rejected'],
  [UserStatus.SUSPENDED, 'suspended'],
] as const)('%s 소셜 사용자는 로그인 오류로 리다이렉트한다', async (status, errorCode) => {
  const fakeUser = {
    id: 'blocked-1',
    email: 'blocked@test.com',
    status,
  } as never;
  const res = makeResponse();

  await controller.kakaoCallback({ user: fakeUser } as never, res);

  expect(mockAuthService.login).not.toHaveBeenCalled();
  expect(mockAuthService.issuePendingSession).not.toHaveBeenCalled();
  expect(res.redirect).toHaveBeenCalledWith(`http://localhost:3000/login?error=${errorCode}`);
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run:

```bash
pnpm --filter @yueeroom/backend test -- --silent src/auth/auth.controller.spec.ts
```

Expected: `issuePendingSession` 호출 또는 `/pending` 리다이렉트 기대 실패.

- [ ] **Step 4: 콜백 분기 구현**

`apps/backend/src/auth/auth.controller.ts`에서 `setSocialLoginCookiesAndRedirect()`를 상태별로 바꾼다.

```ts
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
```

- [ ] **Step 5: 컨트롤러 테스트 통과 확인**

Run:

```bash
pnpm --filter @yueeroom/backend test -- --silent src/auth/auth.controller.spec.ts
```

Expected:

```text
PASS src/auth/auth.controller.spec.ts
```

- [ ] **Step 6: 커밋**

```bash
git add apps/backend/src/auth/auth.controller.ts apps/backend/src/auth/auth.controller.spec.ts
git commit -m "fix: 소셜 로그인 상태별 리다이렉트 처리"
```

---

### Task 5: Passport OAuth 에러 리다이렉트 처리

**Files:**

- Modify: `apps/backend/src/auth/auth.controller.ts`
- Test: Manual local OAuth flow

- [ ] **Step 1: 콜백 Guard 실패 경로 설계 확인**

현재 `@UseGuards(AuthGuard('naver'))`, `@UseGuards(AuthGuard('kakao'))`에서 provider 설정 오류나 이메일 충돌 예외가 발생하면 Nest 예외 응답으로 끝난다. 사용자가 프론트로 돌아와 오류를 볼 수 있게 하려면 커스텀 Guard 또는 Exception Filter가 필요하다.

이번 작업에서는 최소 범위로 provider 콜백 실패를 프론트 `/login?error=social`로 보내는 커스텀 Guard를 추가한다.

- [ ] **Step 2: `SocialAuthGuard` 생성**

Create: `apps/backend/src/auth/guards/social-auth.guard.ts`

```ts
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
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      redirectSocialAuthError(context, getSocialErrorCode(error));
      return false;
    }
  }

  handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('소셜 로그인에 실패했습니다.');
    }
    return user;
  }
}

@Injectable()
export class SocialKakaoAuthGuard extends AuthGuard('kakao') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      redirectSocialAuthError(context, getSocialErrorCode(error));
      return false;
    }
  }

  handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('소셜 로그인에 실패했습니다.');
    }
    return user;
  }
}
```

- [ ] **Step 3: 콜백 엔드포인트에 Guard 적용**

`apps/backend/src/auth/auth.controller.ts`에서 callback 엔드포인트에만 커스텀 Guard를 적용한다. OAuth 시작 엔드포인트는 기존 `AuthGuard('naver')`, `AuthGuard('kakao')`를 유지한다.

```ts
@Public()
@Get('naver/callback')
@UseGuards(SocialNaverAuthGuard)
@ApiOperation({ summary: '네이버 OAuth 콜백' })
async naverCallback(@Req() req: Request & { user: User }, @Res() res: Response): Promise<void> {
  await this.setSocialLoginCookiesAndRedirect(req.user, res);
}

@Public()
@Get('kakao/callback')
@UseGuards(SocialKakaoAuthGuard)
@ApiOperation({ summary: '카카오 OAuth 콜백' })
async kakaoCallback(@Req() req: Request & { user: User }, @Res() res: Response): Promise<void> {
  await this.setSocialLoginCookiesAndRedirect(req.user, res);
}
```

- [ ] **Step 4: provider 설정 오류 수동 확인**

의도적으로 `KAKAO_CLIENT_ID`를 잘못 설정한 뒤 서버를 재시작하고 카카오 로그인을 시도한다.

Expected:

```text
브라우저가 http://localhost:3000/login?error=social 로 돌아온다.
```

- [ ] **Step 5: 커밋**

```bash
git add apps/backend/src/auth/auth.controller.ts apps/backend/src/auth/guards/social-auth.guard.ts
git commit -m "fix: 소셜 OAuth 실패 리다이렉트 처리"
```

---

### Task 6: 카카오 Client Secret optional 처리

**Files:**

- Modify: `apps/backend/src/auth/strategies/kakao.strategy.ts`
- Test: Manual local OAuth flow

- [ ] **Step 1: 현재 설정 확인**

Kakao Developers에서 Client Secret을 사용하는 경우 이 Task는 건너뛴다. Client Secret을 사용하지 않는 경우만 진행한다.

- [ ] **Step 2: Kakao strategy에서 빈 clientSecret 제외**

`apps/backend/src/auth/strategies/kakao.strategy.ts`의 constructor를 다음처럼 바꾼다.

```ts
const clientSecret = configService.get<string>('KAKAO_CLIENT_SECRET');

super({
  clientID: configService.get<string>('KAKAO_CLIENT_ID') || 'kakao_not_configured',
  ...(clientSecret ? { clientSecret } : {}),
  callbackURL:
    configService.get<string>('KAKAO_CALLBACK_URL') ||
    'http://localhost:4000/api/auth/kakao/callback',
});
```

- [ ] **Step 3: 수동 확인**

`apps/backend/.env`에서 `KAKAO_CLIENT_SECRET`을 비우고 백엔드를 재시작한다.

Expected:

```text
Kakao Developers에서 Client Secret 미사용 상태라면 카카오 인증 페이지까지 정상 진입한다.
```

- [ ] **Step 4: 커밋**

```bash
git add apps/backend/src/auth/strategies/kakao.strategy.ts
git commit -m "fix: 카카오 OAuth client secret optional 처리"
```

---

### Task 7: 프론트 로그인 오류 메시지 표시

**Files:**

- Modify: `apps/frontend/src/app/login/page.test.tsx`
- Modify: `apps/frontend/src/app/login/page.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/frontend/src/app/login/page.test.tsx`에서 `next/navigation` mock에 `useSearchParams`를 추가한다.

```ts
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));
```

오류 쿼리 테스트를 추가한다.

```ts
it.each([
  ['social', '소셜 로그인 중 오류가 발생했습니다. 다시 시도해주세요.'],
  ['rejected', '가입이 거절된 계정입니다.'],
  ['suspended', '정지된 계정입니다.'],
  ['email_conflict', '이미 다른 방식으로 가입된 이메일입니다. 이메일 로그인으로 접속해주세요.'],
] as const)('error=%s 쿼리가 있으면 안내 메시지를 표시한다', (errorCode, message) => {
  mockSearchParams.set('error', errorCode);

  render(<LoginPage />);

  expect(screen.getByRole('alert')).toHaveTextContent(message);
  mockSearchParams.delete('error');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:

```bash
cd apps/frontend && npx vitest run --reporter=dot src/app/login/page.test.tsx
```

Expected: alert 메시지 없음으로 FAIL.

- [ ] **Step 3: 로그인 페이지 구현**

`apps/frontend/src/app/login/page.tsx`에 `useSearchParams`를 import한다.

```ts
import { useRouter, useSearchParams } from 'next/navigation';
```

컴포넌트 안에 메시지 map을 추가한다.

```ts
const searchParams = useSearchParams();
const socialError = searchParams.get('error');
const socialErrorMessage =
  socialError === 'social'
    ? '소셜 로그인 중 오류가 발생했습니다. 다시 시도해주세요.'
    : socialError === 'rejected'
      ? '가입이 거절된 계정입니다.'
      : socialError === 'suspended'
        ? '정지된 계정입니다.'
        : socialError === 'email_conflict'
          ? '이미 다른 방식으로 가입된 이메일입니다. 이메일 로그인으로 접속해주세요.'
          : null;
```

폼 위나 `errors.root` 근처에 alert를 렌더링한다.

```tsx
{
  socialErrorMessage && (
    <p role="alert" className="text-sm text-red-600">
      {socialErrorMessage}
    </p>
  );
}
```

- [ ] **Step 4: 프론트 테스트 통과 확인**

Run:

```bash
cd apps/frontend && npx vitest run --reporter=dot src/app/login/page.test.tsx
```

Expected:

```text
PASS src/app/login/page.test.tsx
```

- [ ] **Step 5: 커밋**

```bash
git add apps/frontend/src/app/login/page.tsx apps/frontend/src/app/login/page.test.tsx
git commit -m "fix: 소셜 로그인 오류 메시지 표시"
```

---

### Task 8: 전체 인증 테스트와 수동 OAuth 검증

**Files:**

- Verify only

- [ ] **Step 1: 백엔드 인증 테스트 실행**

Run:

```bash
pnpm --filter @yueeroom/backend test -- --silent src/auth/auth.service.spec.ts src/auth/auth.controller.spec.ts
```

Expected:

```text
PASS src/auth/auth.service.spec.ts
PASS src/auth/auth.controller.spec.ts
```

- [ ] **Step 2: 프론트 로그인 테스트 실행**

Run:

```bash
cd apps/frontend && npx vitest run --reporter=dot src/app/login/page.test.tsx
```

Expected:

```text
Test Files  1 passed
Tests  passed
```

- [ ] **Step 3: 로컬 서버 실행**

Run:

```bash
docker compose up -d
pnpm dev
```

Expected:

```text
Frontend: http://localhost:3000
Backend: http://localhost:4000
```

- [ ] **Step 4: 카카오 신규 사용자 플로우 확인**

1. `http://localhost:3000/login` 접속
2. `카카오로 로그인` 클릭
3. 카카오 인증
4. 신규 계정이면 `http://localhost:3000/pending`으로 이동하는지 확인
5. DB에서 해당 사용자가 `provider=KAKAO`, `status=PENDING`인지 확인

- [ ] **Step 5: 네이버 신규 사용자 플로우 확인**

1. `http://localhost:3000/login` 접속
2. `네이버로 로그인` 클릭
3. 네이버 인증
4. 신규 계정이면 `http://localhost:3000/pending`으로 이동하는지 확인
5. DB에서 해당 사용자가 `provider=NAVER`, `status=PENDING`인지 확인

- [ ] **Step 6: 승인된 소셜 사용자 플로우 확인**

DB에서 테스트 소셜 사용자를 승인한다.

```sql
UPDATE users SET status = 'APPROVED' WHERE email = '<social-user-email>';
```

다시 같은 provider로 로그인한다.

Expected:

```text
http://localhost:3000/ 으로 이동하고 인증 쿠키가 설정된다.
```

- [ ] **Step 7: 최종 커밋 또는 PR 준비**

작업이 여러 커밋으로 나뉘어 있으면 그대로 두거나, 브랜치 정책에 따라 PR을 생성한다.

```bash
git status --short
git log --oneline -5
```

Expected:

```text
워킹트리에 의도하지 않은 변경 없음
```
