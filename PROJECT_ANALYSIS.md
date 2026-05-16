# 프로젝트 전체 분석 보고서

## 1. 전체 디렉터리 구조 요약

```text
.
├── apps/
│   ├── backend/        # NestJS API 서버
│   │   ├── src/        # 모듈, 컨트롤러, 서비스, Guard
│   │   └── prisma/     # Prisma schema 및 migration
│   └── frontend/       # Next.js 프론트엔드
│       ├── src/app/    # App Router 페이지
│       ├── src/components/
│       ├── src/lib/    # API client, hooks, stores, utils
│       └── e2e/        # Playwright E2E 테스트
├── packages/shared/    # 공유 TypeScript 패키지
├── infra/              # AWS/Terraform/IAM 인프라
├── docs/               # 운영/작업 문서
├── .github/workflows/  # CI/CD
└── docker-compose.yml  # 로컬 PostgreSQL/Redis
```

근거 파일: `pnpm-workspace.yaml`, `package.json`, `apps/backend/package.json`, `apps/frontend/package.json`.

## 2. 백엔드 기술 스택 추정

백엔드는 NestJS 10 기반 API 서버입니다. 주요 의존성은 `@nestjs/*`, `@prisma/client`, `passport`, `passport-jwt`, `passport-local`, `passport-kakao`, `passport-naver-v2`, `ioredis`, `stripe`, AWS S3/SES SDK, Sentry입니다.

근거 파일:

- `apps/backend/package.json`
- `apps/backend/src/main.ts`
- `apps/backend/src/app.module.ts`

주요 설정:

- 전역 prefix: `/api`
- Swagger: `/api/docs`
- Helmet, CORS, cookie-parser 사용
- `ValidationPipe`로 DTO whitelist 및 transform 적용
- Throttler 전역 적용

## 3. 프론트엔드 기술 스택 추정

프론트엔드는 Next.js 15 + React 19 기반입니다. App Router를 사용하며, React Query, Axios, Zustand, React Hook Form, Tailwind CSS 4, TipTap, Recharts, Stripe React SDK, Sentry가 포함되어 있습니다.

근거 파일:

- `apps/frontend/package.json`
- `apps/frontend/src/app/*`
- `apps/frontend/src/lib/api/client.ts`
- `apps/frontend/next.config.ts`

빌드 설정상 `NEXT_STATIC_EXPORT=true`일 때 `output: 'export'`로 정적 export를 수행합니다.

## 4. 데이터베이스 사용 여부와 관련 파일

데이터베이스 사용이 명확합니다.

- 주 DB: PostgreSQL
- ORM: Prisma
- 캐시/토큰 저장: Redis

관련 파일:

- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/*/migration.sql`
- `apps/backend/src/prisma/prisma.service.ts`
- `apps/backend/src/redis/redis.service.ts`
- `docker-compose.yml`
- `infra/terraform/rds.tf`
- `infra/terraform/elasticache.tf`

주요 Prisma 모델:

`User`, `Address`, `ChildProfile`, `Category`, `Brand`, `Product`, `ProductVariant`, `Inventory`, `Order`, `Payment`, `Refund`, `Review`, `WishlistItem`, `Cart`.

## 5. 인증/인가 구조

인증은 JWT + Refresh Token 구조로 보입니다.

근거 파일:

- `apps/backend/src/auth/auth.controller.ts`
- `apps/backend/src/auth/auth.service.ts`
- `apps/backend/src/common/guards/*.ts`
- `apps/frontend/src/middleware.ts`
- `apps/frontend/src/lib/api/client.ts`

흐름:

- 로그인 성공 시 backend가 `refresh_token`을 HttpOnly cookie로 설정합니다.
- `accessToken`은 응답으로 내려가고 프론트에서 `access_token` cookie에 저장합니다.
- Axios interceptor가 `access_token`을 `Authorization: Bearer` 헤더로 붙입니다.
- 401 발생 시 `/auth/refresh` 호출 후 재시도합니다.
- Refresh Token은 Redis에 `refresh:{userId}` 형태로 저장됩니다.
- 회원 상태는 `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`입니다.
- 전역 Guard는 `JwtAuthGuard`, `UserStatusGuard`입니다.
- 관리자 권한은 `AdminGuard`, `RolesGuard`, `UserRole.ADMIN`로 처리됩니다.

추가 확인 필요:

- 프론트 middleware는 JWT 서명 검증 없이 payload를 decode합니다. API 보안은 백엔드 Guard가 담당하지만, 화면 접근 제어 신뢰 경계는 별도 검토가 필요합니다.
- 정적 export 배포 시 Next middleware가 실제로 동작하지 않을 가능성이 큽니다.

## 6. 주요 API 라우트

전역 prefix가 `/api`이므로 실제 라우트는 `/api/...`입니다.

- `GET /api/health`
- Auth: `/api/auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `/naver`, `/kakao`, `/admin/mfa/*`
- Users: `/api/users/me`, `/me/password`, `/me/children`, `/me/addresses`
- Products: `/api/products`, `/products/search`, `/products/:id`
- Product variants/images: `/api/products/:productId/variants`, `/api/products/:productId/images`
- Categories: `/api/categories`
- Brands: `/api/brands`
- Cart: `/api/cart`, `/api/cart/items`, `/api/cart/merge`
- Orders: `/api/orders`, `/api/orders/:id`, refund endpoints
- Payments: `/api/payments/me`, Stripe/Naver/Kakao payment endpoints
- Admin: `/api/admin/users`, `/api/admin/orders`, `/api/admin/stats/*`
- Inventory: `/api/inventory`
- Wishlist: `/api/wishlist`

근거 파일: `apps/backend/src/**/*controller.ts`.

## 7. 주요 화면 또는 페이지 구조

공개 페이지:

- `/login`
- `/register`
- `/pending`
- `/privacy`
- `/terms`

인증 필요 페이지:

- `/`
- `/products`
- `/products/[id]`
- `/cart`
- `/checkout`
- `/checkout/kakao-pay/result`
- `/checkout/naver-pay/result`
- `/orders`
- `/orders/[id]`
- `/my-page`

관리자 페이지:

- `/admin`
- `/admin/products`
- `/admin/brands`
- `/admin/categories`
- `/admin/inventory`
- `/admin/orders`
- `/admin/users`

근거 파일:

- `apps/frontend/src/app`
- `apps/frontend/src/middleware.ts`
- `apps/frontend/src/app/admin/layout.tsx`
- `apps/frontend/src/app/(auth)/layout.tsx`

## 8. 환경 변수 및 설정 파일 구조

주요 환경 파일:

- `.env.example`
- `apps/backend/.env`
- `apps/frontend/.env.local`
- `infra/terraform/terraform.tfvars.example`
- `infra/terraform/terraform.tfvars`

주요 변수 영역:

- API URL: `NEXT_PUBLIC_API_URL`
- 서버: `PORT`, `FRONTEND_URL`, `NODE_ENV`
- DB: `DATABASE_URL`, `POSTGRES_*`
- Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_URL`
- JWT: `JWT_SECRET`, `JWT_REFRESH_SECRET`, 만료 시간
- AWS/S3/SES: `AWS_REGION`, `S3_BUCKET_NAME`, `CDN_URL`, `SES_FROM_EMAIL`
- 결제: Stripe, Naver Pay, Kakao Pay
- OAuth: Naver, Kakao
- Sentry

주의: 실제 `.env`, `.env.local`, `terraform.tfvars`, `terraform.tfstate` 파일이 워크트리에 존재합니다. Git 추적 여부와 민감 정보 포함 여부를 우선 확인해야 합니다.

## 9. 배포 관련 파일

배포는 AWS 중심으로 구성되어 있습니다.

관련 파일:

- `.github/workflows/ci.yml`
- `.github/workflows/cd-backend.yml`
- `.github/workflows/cd-frontend.yml`
- `.github/workflows/lighthouse.yml`
- `apps/backend/Dockerfile`
- `infra/terraform/*.tf`
- `infra/iam/*.json`

백엔드 배포 추정:

- Docker image build
- ECR push
- ECS/Fargate 배포
- ECS one-off task로 Prisma migration 실행
- production health check: `/api/health`

프론트엔드 배포 추정:

- Next static export
- S3 업로드
- CloudFront invalidation

## 10. 테스트 코드 존재 여부

테스트 코드가 존재합니다. 확인된 테스트 파일 수는 57개입니다.

백엔드:

- Jest
- `*.spec.ts`
- 예: `auth.service.spec.ts`, `orders.service.spec.ts`, `payments.service.spec.ts`

프론트엔드:

- Vitest + Testing Library
- `*.test.ts`, `*.test.tsx`
- Playwright E2E: `apps/frontend/e2e/auth-middleware.spec.ts`

설정 파일:

- `apps/backend/jest.config.ts`
- `apps/backend/jest-e2e.config.ts`
- `apps/frontend/vitest.config.ts`
- `apps/frontend/playwright.config.ts`

## 11. 프로젝트 실행 흐름

로컬 실행 추정:

1. `pnpm install`
2. `docker-compose.yml`로 PostgreSQL/Redis 실행
3. 백엔드:
   - `pnpm --filter @yueeroom/backend prisma:generate`
   - `pnpm --filter @yueeroom/backend prisma:migrate`
   - `pnpm --filter @yueeroom/backend dev`
4. 프론트엔드:
   - `pnpm --filter @yueeroom/frontend dev`
5. 루트에서 전체 실행:
   - `pnpm dev`

런타임 흐름:

- 브라우저가 Next 페이지 접근
- `middleware.ts`가 cookie 기반 접근 제어
- 프론트 API 호출은 `apiClient` 사용
- 백엔드는 `/api` prefix로 요청 수신
- JWT Guard 및 상태 Guard 통과 후 서비스 실행
- Prisma로 PostgreSQL 접근
- 인증 토큰/비밀번호 재설정 토큰은 Redis 사용
- 결제/파일/메일은 외부 서비스 Stripe, Naver/Kakao Pay, S3, SES와 연동

## 12. 현재 구조에서 가장 먼저 검토해야 할 위험 영역

1. 정적 export와 인증 middleware의 충돌 가능성

   `apps/frontend/next.config.ts`는 `NEXT_STATIC_EXPORT=true`일 때 정적 export를 사용합니다. 하지만 `apps/frontend/src/middleware.ts`는 서버/Edge 런타임 기능입니다. S3/CloudFront 정적 배포에서 middleware 기반 접근 제어가 동작하지 않을 수 있습니다.

2. 민감 파일 존재 여부

   `apps/backend/.env`, `apps/frontend/.env.local`, `infra/terraform/terraform.tfvars`, `terraform.tfstate`가 워크트리에 있습니다. 실제 secret 포함 및 Git 추적 여부 확인이 필요합니다.

3. Access Token 저장 방식

   프론트가 `access_token`을 non-HttpOnly cookie로 저장합니다. XSS 발생 시 탈취 가능성이 있습니다. 백엔드 API는 JWT 검증을 하지만 클라이언트 저장 정책은 재검토 대상입니다.

4. 결제/환불 도메인

   Stripe/Naver/Kakao Pay, 주문, 환불, 부분 환불이 얽혀 있습니다. 금액 정합성, 재시도, webhook idempotency 검토가 필요합니다.

5. 관리자 승인 기반 회원 상태 흐름

   가입 직후 `PENDING` 토큰을 발급하고, 로그인은 `APPROVED`만 허용합니다. 프론트 redirect, refresh 후 상태 반영, Guard 동작을 함께 검토해야 합니다.

## 다음 분석 단계에서 집중할 파일 목록

- `apps/frontend/next.config.ts`
- `apps/frontend/src/middleware.ts`
- `apps/frontend/src/lib/api/client.ts`
- `apps/backend/src/auth/auth.controller.ts`
- `apps/backend/src/auth/auth.service.ts`
- `apps/backend/src/common/guards/jwt-auth.guard.ts`
- `apps/backend/src/common/guards/user-status.guard.ts`
- `apps/backend/src/payments/payments.controller.ts`
- `apps/backend/src/payments/payments.service.ts`
- `apps/backend/src/orders/orders.service.ts`
- `apps/backend/prisma/schema.prisma`
- `.github/workflows/cd-frontend.yml`
- `.github/workflows/cd-backend.yml`
- `infra/terraform/*.tf`
- `.gitignore` 및 실제 민감 파일 추적 상태
