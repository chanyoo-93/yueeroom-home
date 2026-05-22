# Issue #154 구현 계획: 정적 export 환경의 인증 라우팅 전략 재정의

## Context

현재 프론트엔드는 `NEXT_STATIC_EXPORT=true` 빌드로 S3/CloudFront에 정적 파일로 배포된다.
**Next.js `middleware.ts`는 정적 export 환경에서 실행되지 않는다** — Edge Runtime이 없기 때문이다.

따라서 `middleware.ts`가 담당하던 인증 라우팅(비로그인 → /login, PENDING → /pending, 비관리자 → /)은
프로덕션에서 전혀 작동하지 않는다.

**현재 프로덕션에서 실제로 작동하는 보호:**

- `AdminGuard.tsx` — admin 레이아웃에서 useMe() 기반 클라이언트 가드 (역할 검증)
- `apiClient` 401 인터셉터 — 토큰 만료 시 refresh 시도 → 실패 시 `/login` 리다이렉트
- 백엔드 API — 모든 인증 필요 엔드포인트에서 401/403 반환

**현재 프로덕션에서 작동하지 않는 보호:**

- PENDING 사용자의 (auth) 페이지 접근 차단 → /pending 리다이렉트 없음
- REJECTED/SUSPENDED 사용자의 (auth) 페이지 접근 차단 없음
- 비인증 사용자의 페이지 로드 시 즉각 리다이렉트 없음 (apiClient가 API 호출 후 처리)

---

## 결정: 정적 export 유지 + 클라이언트 AuthGuard 도입

**근거:**

- 인프라 변경 없이 해결 가능
- `AdminGuard.tsx`가 이미 동일 패턴으로 작동 중임을 검증
- 백엔드 API 자체가 최종 인증 방어선 역할

---

## 1. 관련 파일 목록

### 읽기 전용 (참조)

| 파일                                         | 역할                                           |
| -------------------------------------------- | ---------------------------------------------- |
| `apps/frontend/src/middleware.ts`            | 로컬 dev 전용 미들웨어 (정적 export 시 미작동) |
| `apps/frontend/next.config.ts`               | `NEXT_STATIC_EXPORT=true` → `output: 'export'` |
| `apps/frontend/src/app/admin/AdminGuard.tsx` | 구현 참조 패턴                                 |
| `apps/frontend/src/lib/hooks/useMe.ts`       | useMe() hook                                   |
| `apps/frontend/src/lib/api/client.ts`        | 401 인터셉터 (refresh → /login)                |
| `apps/frontend/src/lib/types/user.ts`        | `UserProfile.status: string` 존재 확인         |
| `.github/workflows/cd-frontend.yml`          | CD 파이프라인 (NEXT_STATIC_EXPORT=true 확인)   |

### 수정 대상

| 파일                                              | 변경 유형                      |
| ------------------------------------------------- | ------------------------------ |
| `apps/frontend/src/app/(auth)/AuthGuard.tsx`      | **신규 생성**                  |
| `apps/frontend/src/app/(auth)/layout.tsx`         | **수정** — AuthGuard 래핑 추가 |
| `apps/frontend/src/app/(auth)/AuthGuard.test.tsx` | **신규 생성**                  |

---

## 2. 현재 구조 요약

```
(auth)/layout.tsx
  └── Providers (TanStack Query)
        └── children (cart, checkout, my-page, orders, products, page.tsx)
        ← 보호 없음 (middleware는 정적 export에서 미작동)

admin/layout.tsx
  └── Providers
        └── AdminGuard   ← 클라이언트 가드, 이미 작동 중
              └── AdminSidebar + children
```

`UserProfile` 타입: `status: string` 필드 확인 완료 (`src/lib/types/user.ts` line 6)

`apiClient` 동작:

- 401 응답 → `/auth/refresh` 재발급 시도
- 재발급 실패 → `window.location.replace('/login')` 전역 리다이렉트

---

## 3. 변경해야 할 지점

### `AuthGuard.tsx` 신규 생성

`AdminGuard.tsx`와 동일한 패턴, status 기반 라우팅 로직 추가:

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/lib/hooks/useMe';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const { data: user, isLoading, isError } = useMe();

  useEffect(() => {
    if (isLoading) return;
    if (isError) { router.replace('/login'); return; }
    if (user?.status === 'PENDING') { router.replace('/pending'); return; }
    if (user?.status !== 'APPROVED') { router.replace('/login'); return; }
    setAllowed(true);
  }, [isError, isLoading, router, user?.status]);

  if (!allowed) return null;
  return <>{children}</>;
}
```

### `(auth)/layout.tsx` 수정

```typescript
import AuthGuard from './AuthGuard';

export default function AuthLayout({ children }) {
  return (
    <Providers>
      <AuthGuard>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-4">
            {children}
          </main>
          <Footer />
          <MobileNav />
        </div>
      </AuthGuard>
    </Providers>
  );
}
```

---

## 4. 잠재적 위험

| 위험                            | 설명                                                         | 대응                                                  |
| ------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| **apiClient 중복 리다이렉트**   | isError 시 apiClient도 /login redirect, AuthGuard도 redirect | 무해한 중복 — 목적지 동일                             |
| **Loading 중 null 렌더**        | useMe() 응답 전까지 화면 비어 보임                           | AdminGuard와 동일 패턴, 허용 가능                     |
| **useMe staleTime 1분**         | 상태 변경 후 최대 1분 캐시 유지                              | AdminGuard도 동일 조건, 허용 가능                     |
| **middleware.ts 로컬 dev 중복** | 로컬에서 middleware + AuthGuard 동시 실행                    | middleware가 먼저 리다이렉트 → AuthGuard 미도달, 무해 |

---

## 5. 구현 순서

1. `AuthGuard.test.tsx` 작성 (TDD)
2. `AuthGuard.tsx` 구현 → 테스트 통과 확인
3. `(auth)/layout.tsx` 수정 — AuthGuard 래핑
4. 테스트 실행: `cd apps/frontend && npx vitest run --reporter=dot src/app/\\(auth\\)/AuthGuard.test.tsx`
5. 브랜치 생성 → 커밋 → PR (`Closes #154`)

---

## 6. 테스트 전략

**단위 테스트 (Vitest)** — `AuthGuard.test.tsx`:

| 케이스        | 입력                 | 기대 결과                    |
| ------------- | -------------------- | ---------------------------- |
| 로딩 중       | `isLoading: true`    | `null` 렌더                  |
| 인증 오류     | `isError: true`      | `router.replace('/login')`   |
| PENDING 상태  | `status: 'PENDING'`  | `router.replace('/pending')` |
| REJECTED 상태 | `status: 'REJECTED'` | `router.replace('/login')`   |
| APPROVED 상태 | `status: 'APPROVED'` | children 렌더                |

**수동 테스트 (로컬)**:

- 로그아웃 상태에서 `/` 접근 → `/login` 리다이렉트 확인
- PENDING 계정으로 `/` 접근 → `/pending` 리다이렉트 확인
- APPROVED 계정으로 `/` 접근 → 정상 렌더 확인
- APPROVED 계정으로 `/admin` 접근 → 홈 리다이렉트 확인 (기존 AdminGuard)
