# Architecture

## Frontend (Next.js App Router)

```
apps/frontend/src/
├── app/
│   ├── (auth)/                # 인증된 회원 공통 레이아웃 (Header + Footer + MobileNav)
│   │   ├── page.tsx           # 홈
│   │   ├── products/[id]/     # 상품 상세
│   │   ├── cart/              # 장바구니
│   │   ├── checkout/          # 결제 (kakao-pay/, naver-pay/ 하위 경로)
│   │   ├── orders/            # 주문 내역
│   │   └── my-page/           # 마이페이지
│   ├── admin/                 # 관리자 전용 (AdminGuard로 보호)
│   ├── login/ register/ pending/ privacy/ terms/   # 공개 경로
├── components/
│   ├── layout/                # Header, Footer, MobileNav
│   ├── admin/                 # 관리자 전용 컴포넌트
│   └── products/              # ProductCard, SidebarFilter 등
├── lib/
│   ├── api/
│   │   ├── client.ts          # Axios 인스턴스 (401 자동 재발급 + 큐 패턴)
│   │   ├── query-client.ts    # TanStack Query — React cache()로 SSR 격리
│   │   ├── query-keys.ts      # 모든 queryKey 중앙 관리
│   │   └── *.ts               # 도메인별 API 함수
│   ├── hooks/                 # useProducts, useCart, useOrders…
│   ├── stores/cart.ts         # Zustand (persist → localStorage)
│   ├── types/                 # 프론트엔드 전용 타입
│   └── utils/                 # format.ts (가격·날짜), jwt.ts
├── middleware.ts               # Edge Runtime 라우트 보호
└── test/setup.ts
```

**라우트 보호 (middleware.ts)**

- `access_token` 쿠키의 JWT payload를 `atob` + `TextDecoder`로 디코딩 (서명 검증 없음)
- `status === 'PENDING'` → `/pending` / `status !== 'APPROVED'` → `/login`
- `/admin`: `AdminGuard`에서 클라이언트 사이드로 `role === 'ADMIN'` 검사

**JWT 쿠키 설계 (의도된 결정)**

- `access_token`: non-httpOnly — 미들웨어가 Edge Runtime에서 payload를 직접 읽기 위해 필요
- `refresh_token`: httpOnly — AuthController에서만 관리
- APPROVED 감지 시 반드시 `/auth/refresh`로 토큰 갱신 (기존 payload에 PENDING이 남아 있어 무한 리다이렉트 방지)

**Zustand 장바구니**: `syncFromServer(items)`로 서버 동기화. "바로 구매"는 `buyNow` 필드 사용.

## Backend (NestJS)

```
apps/backend/src/
├── auth/          # 인증 (local, JWT, Naver OAuth, Kakao OAuth)
├── users/         # 회원 정보·주소·자녀 프로필
├── admin/         # 회원 승인·관리
├── categories/    # 카테고리 트리 (self-referencing)
├── brands/        # 브랜드 CRUD
├── products/      # 상품·이미지·옵션(variants) CRUD
├── inventory/     # 재고 관리
├── cart/          # 장바구니
├── orders/        # 주문
├── payments/      # 결제 (KakaoPay, NaverPay)
├── wishlists/     # 위시리스트
├── files/         # S3 업로드·삭제 (AWS SDK v3)
├── email/         # 이메일 발송
├── common/
│   ├── guards/    # JwtAuthGuard, UserStatusGuard, RolesGuard, AdminGuard
│   └── decorators/ # @Public(), @Roles(), @CurrentUser()
├── prisma/        # PrismaService
└── redis/         # RedisService (refresh token 저장)
```

- **전역 가드**: `JwtAuthGuard` → `UserStatusGuard` 순서. `@Public()`으로 우회 가능.
- **역할 제한**: `@Roles('ADMIN')` + `RolesGuard`, 또는 `AdminGuard` 단독 사용.
- **API prefix**: `/api`. Swagger: `http://localhost:4000/api/docs`
- **ValidationPipe**: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- **소셜 로그인**: NaverStrategy, KakaoStrategy. 소셜 회원도 `status: PENDING`으로 생성.
- **관리자 MFA**: `User.mfaSecret`(TOTP) · `User.mfaEnabled`

## Shared Types (`packages/shared`)

```typescript
// types/user.ts
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type UserRole = 'CUSTOMER' | 'ADMIN';

// types/common.ts
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

## Prisma Schema (`apps/backend/prisma/schema.prisma`)

- **Enum**: `UserStatus`, `UserRole`, `AuthProvider`, `OrderStatus`, `PaymentStatus`, `RefundStatus`
- `User.status` 기본값: `PENDING`
- **모델 관계**: `User` → `Address`, `ChildProfile`, `Order`, `Cart`, `WishlistItem`
  `Product` → `ProductVariant` → `Inventory`, `CartItem`, `OrderItem`
  `Order` → `Payment` → `Refund` → `RefundItem`
- `Product.basePrice`, `ProductVariant.price`: KRW 정수
- `Payment.paymentKey`: 게이트웨이 토큰 (PCI DSS 범위 밖)
