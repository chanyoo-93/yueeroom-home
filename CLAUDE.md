# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

유이룸(Yu-ee Room) — 완전 비공개 유아/아동복 쇼핑몰. 회원은 관리자 승인 후에만 서비스를 이용할 수 있다.

**Monorepo**: pnpm 10.33.0 + Turborepo  
**Workspaces**: `apps/frontend`, `apps/backend`, `packages/shared`

---

## Commands

### Monorepo (root)

```bash
pnpm install           # 의존성 설치
pnpm dev               # 전체 앱 개발 서버 (turbo)
pnpm build             # 전체 빌드
pnpm test              # 전체 테스트
pnpm lint              # 전체 린트
pnpm type-check        # 전체 타입 체크
pnpm format            # 전체 포맷 수정
pnpm format:check      # 포맷 검사만
```

### Frontend (`apps/frontend`)

```bash
# 프로젝트 루트에서 실행
pnpm --filter @yueeroom/frontend dev
pnpm --filter @yueeroom/frontend test:coverage

# apps/frontend 디렉터리 내에서 실행
cd apps/frontend
npx vitest run                          # 전체 테스트
npx vitest run src/components/layout/   # 특정 디렉터리 테스트
npx vitest run src/app/login/page.test.tsx  # 단일 파일 테스트
```

> **중요**: vitest는 `apps/frontend` 디렉터리에서 실행해야 한다. 루트에서 `npx --prefix apps/frontend vitest run`으로 실행하면 루트의 vitest가 실행되어 설정이 잘못 적용된다.

### Backend (`apps/backend`)

```bash
pnpm --filter @yueeroom/backend dev
pnpm --filter @yueeroom/backend test
pnpm --filter @yueeroom/backend test:coverage
pnpm --filter @yueeroom/backend prisma:generate   # Prisma 클라이언트 생성
pnpm --filter @yueeroom/backend prisma:migrate    # 마이그레이션 실행
pnpm --filter @yueeroom/backend prisma:studio     # Prisma Studio
```

---

## Architecture

### Frontend (Next.js App Router)

```
apps/frontend/src/
├── app/
│   ├── (auth)/layout.tsx      # 인증된 회원 공통 레이아웃 (Header + Footer + MobileNav)
│   ├── login/                 # 공개 경로
│   ├── register/              # 공개 경로
│   ├── pending/               # 공개 경로 (승인 대기 폴링 페이지)
│   └── page.tsx               # 홈 (인증 필요)
├── components/layout/         # Header, Footer, MobileNav
├── lib/api/
│   ├── client.ts              # Axios 인스턴스 (401 자동 재발급 + 큐 패턴)
│   └── query-client.ts        # TanStack Query — React cache()로 SSR 격리
├── middleware.ts               # Edge Runtime 라우트 보호
└── test/setup.ts              # @testing-library/jest-dom
```

**라우트 보호 흐름 (middleware.ts)**  
공개 경로: `/login`, `/register`, `/pending` (정확한 경로 또는 `path/` 하위만 허용)  
보호된 경로: `access_token` 쿠키의 JWT payload를 `atob` + `TextDecoder`로 디코딩 (Edge Runtime에서 서명 검증 없이)

- `status === 'PENDING'` → `/pending`
- `status !== 'APPROVED'` → `/login`

**JWT 쿠키 설계 (의도된 결정)**

- `access_token`: **non-httpOnly** 쿠키 — 미들웨어가 Edge Runtime에서 JWT payload를 직접 읽어야 하므로 클라이언트에서 `document.cookie`로 설정·삭제한다.
- `refresh_token`: **httpOnly** 쿠키 — 서버(AuthController)에서만 관리한다.
- APPROVED 감지 시 반드시 `/auth/refresh`로 새 토큰을 발급받아 쿠키를 갱신해야 무한 리다이렉트가 방지된다(기존 JWT payload에는 여전히 PENDING이 담겨 있기 때문).

**TanStack Query 패턴**

```typescript
// query-client.ts — SSR 요청마다 격리된 인스턴스 생성
export const getQueryClient = cache(() => new QueryClient({ ... }));
```

### Backend (NestJS)

```
apps/backend/src/
├── auth/          # 인증 (local, JWT, Naver, Kakao)
├── users/
├── admin/         # 회원 승인·관리 (관리자 전용)
├── categories/
├── products/
├── inventory/
├── orders/        # (예정)
├── common/guards/ # JwtAuthGuard, UserStatusGuard (전역 적용)
├── prisma/        # PrismaService
└── redis/         # RedisService (refresh token 저장)
```

- **전역 가드**: `JwtAuthGuard` → `UserStatusGuard` 순서로 적용. 컨트롤러/엔드포인트에서 `@Public()` 데코레이터로 인증 우회 가능.
- **API prefix**: 모든 엔드포인트는 `/api`로 시작한다. 예: `POST /api/auth/login`
- **Swagger**: `http://localhost:4000/api/docs`
- **ValidationPipe**: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`

### Shared Types (`packages/shared`)

```typescript
// packages/shared/src/types/user.ts
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type UserRole = 'CUSTOMER' | 'ADMIN';
export interface User {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// packages/shared/src/types/common.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

프론트엔드에서 `UserStatus` 같은 공유 타입을 사용할 때는 `packages/shared`에서 import한다. 아직 해당 패키지를 import하지 않은 파일에서는 로컬 union type으로 정의해도 무방하지만, 추후 통일한다.

### Prisma Schema

- 위치: `apps/backend/prisma/schema.prisma`
- 핵심 enum: `UserStatus`, `UserRole`, `AuthProvider`, `OrderStatus`, `PaymentStatus`
- `User.status` 기본값: `PENDING`

---

## Development Workflow

**브랜치 전략**: `feature/phase{N}-issue{N}-{description}` → PR → `main`

**TDD 순서**: 테스트 파일 작성 → 구현 → `npx vitest run` 통과 확인 → 커밋 → 푸시 → PR 생성

**커밋 후 PR**: `Closes #N` 태그를 PR 본문에 포함시켜 병합 시 이슈가 자동으로 닫히도록 한다.

**Lint-staged**: 커밋 시 `apps/**/*.{ts,tsx}`에 대해 `eslint --fix` + `prettier --write` 자동 실행.

---

## Testing Conventions

### Frontend (Vitest + React Testing Library)

- `vi.mock('next/navigation', ...)` — `useRouter`, `usePathname` 모킹
- `vi.mock('next/link', ...)` — `<a>` 태그로 대체하여 테스트
- `vi.mock('@/lib/api/client', ...)` — `apiClient.get`, `apiClient.post` 모킹
- `axios.isAxiosError()` 검사를 통과시키려면 mock 객체에 `isAxiosError: true` 프로퍼티 포함 필요
- polling 테스트 시 `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()`를 사용

### Backend (Jest)

- `apps/backend/src/**/*.spec.ts` — 단위/통합 테스트
- `apps/backend/test/**/*.e2e-spec.ts` — E2E 테스트 (별도 설정 `jest-e2e.config.ts`)

---

## CI Pipeline (`.github/workflows/ci.yml`)

PR 대상 브랜치: `main`, `staging`

1. **Lint & Format Check**
2. **Type Check**
3. **Backend Tests** — PostgreSQL 16 + Redis 7 서비스 컨테이너 사용
4. **Frontend Tests**
5. **Build Check** — lint/type-check 완료 후 실행, `NEXT_PUBLIC_API_URL=http://localhost:4000/api`
