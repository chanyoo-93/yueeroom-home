# Issue #155 — 인증 상태 관리와 API refresh 흐름 통합

## Context

현재 `/auth/refresh` 호출과 `/login` redirect 로직이 두 곳에 분산되어 있다.

- `client.ts` interceptor: 401 시 `apiClient.post('/auth/refresh')` → 실패하면 `window.location.replace('/login')`
- `pending/page.tsx`: 5초마다 `apiClient.post('/auth/refresh')` 직접 호출 → 상태별 redirect

이 두 파일이 각자 `apiClient`를 직접 호출하고 redirect 목적지 `/login`을 하드코딩하고 있다.
`UserStatus` 타입도 `pending/page.tsx` 내부에만 정의되어 있다.

목표: auth 관련 API 호출과 redirect 정책을 한 곳에 모아 중복을 제거한다.

---

## 1. 관련 파일 목록

| 파일                                              | 역할                                                 |
| ------------------------------------------------- | ---------------------------------------------------- |
| `apps/frontend/src/lib/api/client.ts`             | Axios 인스턴스, 401 interceptor, refresh + redirect  |
| `apps/frontend/src/app/pending/page.tsx`          | refresh 폴링, 상태별 redirect, logout                |
| `apps/frontend/src/app/pending/page.test.tsx`     | pending 페이지 테스트 (apiClient.post mock)          |
| `apps/frontend/src/lib/api/client.test.ts`        | interceptor 테스트 (refresh 재시도, /login redirect) |
| _(신규)_ `apps/frontend/src/lib/api/auth.ts`      | refreshAuth(), logout(), UserStatus 타입             |
| _(신규)_ `apps/frontend/src/lib/api/auth.test.ts` | auth API 단위 테스트                                 |
| _(신규)_ `apps/frontend/src/lib/auth/redirect.ts` | redirectToLogin() 헬퍼                               |

---

## 2. 현재 구조 요약

```
client.ts (interceptor)
  └── apiClient.post('/auth/refresh')  ← 직접 호출
  └── window.location.replace('/login')  ← 하드코딩

pending/page.tsx
  └── apiClient.post<{ status: UserStatus }>('/auth/refresh')  ← 직접 호출
  └── apiClient.post('/auth/logout')  ← 직접 호출
  └── router.replace('/login')  ← redirect
  type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'  ← 로컬 타입
```

`lib/api/auth.ts`는 존재하지 않는다. `lib/auth/` 디렉토리도 없다.

---

## 3. 변경해야 할 지점

### 신규 생성

**`lib/auth/redirect.ts`**

- `redirectToLogin()`: `window.location.replace('/login')` 캡슐화
- `apiClient` 의존 없음 → `client.ts`가 import해도 순환 의존 없음

**`lib/api/auth.ts`**

- `UserStatus` 타입 (pending/page.tsx에서 이동)
- `refreshAuth()`: `apiClient.post<{ status: UserStatus }>('/auth/refresh')`
- `logout()`: `apiClient.post('/auth/logout')`

**`lib/api/auth.test.ts`**

- `refreshAuth()`, `logout()` 단위 테스트

### 수정

**`lib/api/client.ts`**

- `import { redirectToLogin } from '@/lib/auth/redirect'`
- `window.location.replace('/login')` → `redirectToLogin()` 교체
- `apiClient.post('/auth/refresh')` 호출은 유지 (순환 의존 방지)

**`app/pending/page.tsx`**

- `import { refreshAuth, logout, type UserStatus } from '@/lib/api/auth'`
- `apiClient.post('/auth/refresh')` → `refreshAuth()`
- `apiClient.post('/auth/logout')` → `logout()`
- 로컬 `type UserStatus` 삭제
- `apiClient` 직접 import 제거

**`app/pending/page.test.tsx`**

- `vi.mock('@/lib/api/client', ...)` → `vi.mock('@/lib/api/auth', ...)`
- `apiClient.post` 검증 → `refreshAuth`, `logout` 함수 직접 검증
- 테스트 케이스 수와 시나리오는 동일하게 유지

**`lib/api/client.test.ts`**

- redirect 테스트에서 `window.location.replace` mock → `vi.mock('@/lib/auth/redirect', ...)` 교체
- `redirectToLogin` 호출 검증으로 변경

---

## 4. 잠재적 위험

| 위험                                               | 대응                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **순환 의존**                                      | `redirect.ts`는 `apiClient` import 없음. `client.ts` → `redirect.ts` 단방향만 허용     |
| **pending/page.test.tsx mock 경로 변경**           | `@/lib/api/client` mock → `@/lib/api/auth` mock으로 교체 필요. 누락 시 실제 API 호출됨 |
| **client.ts interceptor에서 refreshAuth() 미사용** | 순환 의존 회피를 위해 interceptor는 `apiClient.post('/auth/refresh')` 직접 유지        |

---

## 5. 구현 순서 (TDD)

1. **`lib/auth/redirect.ts`** 신규 작성
2. **`lib/api/auth.ts`** + `auth.test.ts` 신규 작성
3. **`lib/api/client.ts`** 수정 — `redirectToLogin()` 교체
4. **`lib/api/client.test.ts`** 수정 — redirect mock 교체
5. **`app/pending/page.tsx`** 수정 — `refreshAuth()`, `logout()` 사용
6. **`app/pending/page.test.tsx`** 수정 — `@/lib/api/auth` mock으로 교체
7. 전체 테스트 실행

---

## 6. 테스트 전략

### 신규: `lib/api/auth.test.ts`

- `refreshAuth()`가 `apiClient.post('/auth/refresh')`를 호출하는지
- `logout()`이 `apiClient.post('/auth/logout')`를 호출하는지

### 수정: `lib/api/client.test.ts`

- `refresh 실패 → /login 이동` 테스트: `window.location.replace` mock 대신 `vi.mock('@/lib/auth/redirect')` + `redirectToLogin` 호출 여부 검증

### 수정: `app/pending/page.test.tsx`

- mock 대상을 `@/lib/api/client` → `@/lib/api/auth`로 교체
- 테스트 케이스 7개 동일 유지 (APPROVED/PENDING/REJECTED/SUSPENDED/로그아웃/렌더링)

### 실행 커맨드

```bash
cd apps/frontend && npx vitest run --reporter=dot src/lib/api/auth.test.ts src/lib/api/client.test.ts src/app/pending/page.test.tsx
```

---

## 최종 의존 관계

```
redirect.ts  ←  client.ts
auth.ts      ←  pending/page.tsx
client.ts    ←  auth.ts (auth.ts가 apiClient 사용)
```

순환 없음: `client.ts` → `redirect.ts` (단방향), `auth.ts` → `client.ts` (단방향)
