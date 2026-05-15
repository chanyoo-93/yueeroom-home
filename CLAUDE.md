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

## 파일 탐색 규칙

- 작업 전 전체 디렉토리 구조를 탐색하지 않는다.
- 이슈와 직접 관련된 파일만 읽는다.
- 모르는 경로가 있을 때만 최소 범위로 탐색한다.

---

## 테스트 실행 규칙

- **Frontend**: `cd apps/frontend && npx vitest run --reporter=dot {대상 파일 또는 디렉터리}`
- **Backend**: `pnpm --filter @yueeroom/backend test -- --silent {대상 파일}`
- 전체 테스트가 아닌 **수정된 파일과 관련된 테스트만** 실행한다.
- 테스트 통과 시 결과 요약만 확인한다. 실패 시에만 전체 로그를 확인한다.

---

## Architecture

### Frontend (Next.js App Router)

```
apps/frontend/src/
├── app/
│   ├── (auth)/                # 인증된 회원 공통 레이아웃 (Header + Footer + MobileNav)
│   │   ├── layout.tsx
│   │   ├── page.tsx           # 홈
│   │   ├── products/[id]/     # 상품 상세
│   │   ├── cart/              # 장바구니
│   │   ├── checkout/          # 결제 (kakao-pay/, naver-pay/ 하위 경로)
│   │   ├── orders/            # 주문 내역
│   │   └── my-page/           # 마이페이지
│   ├── admin/                 # 관리자 전용 (AdminGuard로 보호)
│   │   ├── layout.tsx
│   │   ├── brands/
│   │   ├── categories/
│   │   ├── inventory/
│   │   ├── orders/
│   │   ├── products/
│   │   └── users/
│   ├── login/                 # 공개 경로
│   ├── register/              # 공개 경로
│   ├── pending/               # 공개 경로 (승인 대기 폴링 페이지)
│   ├── privacy/               # 공개 경로
│   └── terms/                 # 공개 경로
├── components/
│   ├── layout/                # Header, Footer, MobileNav
│   ├── admin/                 # 관리자 전용 컴포넌트
│   └── products/              # 상품 관련 컴포넌트 (ProductCard, SidebarFilter 등)
├── lib/
│   ├── api/
│   │   ├── client.ts          # Axios 인스턴스 (401 자동 재발급 + 큐 패턴)
│   │   ├── query-client.ts    # TanStack Query — React cache()로 SSR 격리
│   │   ├── query-keys.ts      # 모든 queryKey 중앙 관리
│   │   └── *.ts               # 도메인별 API 함수 (products, cart, orders, payments…)
│   ├── hooks/                 # 도메인별 커스텀 훅 (useProducts, useCart, useOrders…)
│   ├── stores/
│   │   └── cart.ts            # Zustand 장바구니 스토어 (persist 미들웨어)
│   ├── types/                 # 프론트엔드 전용 타입 정의
│   └── utils/                 # format.ts (가격·날짜), jwt.ts
├── middleware.ts               # Edge Runtime 라우트 보호
└── test/setup.ts              # @testing-library/jest-dom
```

**라우트 보호 흐름 (middleware.ts)**  
공개 경로: `/login`, `/register`, `/pending`, `/privacy`, `/terms`  
보호된 경로: `access_token` 쿠키의 JWT payload를 `atob` + `TextDecoder`로 디코딩 (Edge Runtime에서 서명 검증 없이)

- `status === 'PENDING'` → `/pending`
- `status !== 'APPROVED'` → `/login`

관리자 경로(`/admin`): `AdminGuard` 컴포넌트에서 클라이언트 사이드로 `role === 'ADMIN'` 검사.

**JWT 쿠키 설계 (의도된 결정)**

- `access_token`: **non-httpOnly** 쿠키 — 미들웨어가 Edge Runtime에서 JWT payload를 직접 읽어야 하므로 클라이언트에서 `document.cookie`로 설정·삭제한다.
- `refresh_token`: **httpOnly** 쿠키 — 서버(AuthController)에서만 관리한다.
- APPROVED 감지 시 반드시 `/auth/refresh`로 새 토큰을 발급받아 쿠키를 갱신해야 무한 리다이렉트가 방지된다(기존 JWT payload에는 여전히 PENDING이 담겨 있기 때문).

**TanStack Query 패턴**

```typescript
// query-client.ts — SSR 요청마다 격리된 인스턴스 생성
export const getQueryClient = cache(() => new QueryClient({ ... }));

// query-keys.ts — 모든 쿼리 키를 한 곳에서 관리
import { queryKeys } from '@/lib/api/query-keys';
queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
```

**Zustand 장바구니 스토어**  
`lib/stores/cart.ts`는 `persist` 미들웨어로 localStorage에 저장된다. 서버 장바구니와 동기화할 때는 `syncFromServer(items)`를 호출한다. "바로 구매" 플로우는 `buyNow` 필드를 사용한다.

### Backend (NestJS)

```
apps/backend/src/
├── auth/          # 인증 (local, JWT, Naver OAuth, Kakao OAuth)
├── users/         # 회원 정보·주소·자녀 프로필
├── admin/         # 회원 승인·관리 (관리자 전용)
├── categories/    # 카테고리 트리 (self-referencing)
├── brands/        # 브랜드 CRUD
├── products/      # 상품·이미지·옵션(variants) CRUD
├── inventory/     # 재고 관리
├── cart/          # 장바구니
├── orders/        # 주문
├── payments/      # 결제 (KakaoPay, NaverPay)
├── wishlists/     # 위시리스트
├── files/         # S3 이미지 업로드·삭제 (AWS SDK v3)
├── email/         # 이메일 발송
├── common/
│   ├── guards/    # JwtAuthGuard, UserStatusGuard, RolesGuard, AdminGuard
│   └── decorators/ # @Public(), @Roles(), @CurrentUser()
├── prisma/        # PrismaService
└── redis/         # RedisService (refresh token 저장)
```

- **전역 가드**: `JwtAuthGuard` → `UserStatusGuard` 순서로 적용. `@Public()`으로 인증 우회 가능.
- **역할 제한**: `@Roles('ADMIN')`과 `RolesGuard`를 함께 사용. 또는 `AdminGuard`(단독 적용 가능).
- **API prefix**: 모든 엔드포인트는 `/api`로 시작한다. 예: `POST /api/auth/login`
- **Swagger**: `http://localhost:4000/api/docs`
- **ValidationPipe**: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- **파일 업로드**: `FilesService`가 AWS SDK v3(`@aws-sdk/client-s3`)로 S3에 업로드/삭제. `S3_BUCKET_NAME`, `AWS_REGION` 등 환경 변수 필요.
- **소셜 로그인**: NaverStrategy(`passport-naver-v2`), KakaoStrategy. 소셜 회원도 `status: PENDING`으로 생성된다.
- **관리자 MFA**: `User.mfaSecret`(TOTP)·`User.mfaEnabled` 필드로 관리한다.

### Shared Types (`packages/shared`)

```typescript
// packages/shared/src/types/user.ts
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type UserRole = 'CUSTOMER' | 'ADMIN';
export interface User {
  id;
  email;
  name;
  status;
  role;
  createdAt;
  updatedAt;
}

// packages/shared/src/types/common.ts
export interface ApiResponse<T> {
  success;
  data;
  message?;
}
export interface PaginatedResponse<T> {
  items;
  total;
  page;
  limit;
  totalPages;
}
```

프론트엔드에서 `UserStatus` 같은 공유 타입을 사용할 때는 `packages/shared`에서 import한다.

### Prisma Schema

- 위치: `apps/backend/prisma/schema.prisma`
- **Enum**: `UserStatus`, `UserRole`, `AuthProvider`, `OrderStatus`, `PaymentStatus`, `RefundStatus`
- `User.status` 기본값: `PENDING`
- **주요 모델**: `User` → `Address`, `ChildProfile`, `Order`, `Cart`, `WishlistItem`  
  `Product` → `ProductVariant` → `Inventory`, `CartItem`, `OrderItem`  
  `Order` → `Payment` → `Refund` → `RefundItem`
- `Product.basePrice`, `ProductVariant.price` 단위: KRW(원) 정수
- `Payment.paymentKey`: 게이트웨이 토큰 (카드 정보 아님, PCI DSS 범위 밖)

---

## Development Workflow

**브랜치 전략**: `feature/phase{N}-issue{N}-{description}` → PR → `main`

**TDD 순서**: 테스트 파일 작성 → 구현 → 테스트 통과 확인 → 커밋 → 푸시 → PR 생성

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
