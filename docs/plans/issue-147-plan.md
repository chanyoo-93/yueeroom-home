# Issue #147 구현 계획 — Access Token HttpOnly 재설계

## 배경

현재 `access_token`을 non-httpOnly 쿠키로 저장해 XSS 발생 시 토큰 탈취 위험이 있다.
백엔드 `JwtStrategy`는 이미 쿠키 추출을 우선 지원하며, Next.js 미들웨어는 Edge Runtime에서 httpOnly 쿠키도 읽을 수 있으므로 프론트엔드 라우팅 보호는 그대로 유지된다.

---

## 1. 관련 파일 목록

### 백엔드

| 파일                                               | 역할                                   |
| -------------------------------------------------- | -------------------------------------- |
| `apps/backend/src/auth/auth.controller.ts`         | 쿠키 발급 로직 변경 핵심               |
| `apps/backend/src/auth/auth.service.ts`            | `refresh()` 반환 타입에 `status` 추가  |
| `apps/backend/src/auth/strategies/jwt.strategy.ts` | 이미 쿠키 추출 지원 — **변경 불필요**  |
| `apps/backend/src/auth/auth.controller.spec.ts`    | `httpOnly: false` → `true` 어서션 수정 |

### 프론트엔드

| 파일                                               | 역할                                         |
| -------------------------------------------------- | -------------------------------------------- |
| `apps/frontend/src/lib/api/client.ts`              | 요청 인터셉터 제거, 갱신 인터셉터 수정       |
| `apps/frontend/src/app/login/page.tsx`             | `document.cookie` 쓰기·읽기 제거             |
| `apps/frontend/src/app/register/page.tsx`          | `document.cookie` 쓰기 제거                  |
| `apps/frontend/src/app/pending/page.tsx`           | JWT 디코딩 → `status` 필드로 교체            |
| `apps/frontend/src/app/admin/AdminGuard.tsx`       | `document.cookie` 읽기 → API 호출로 교체     |
| `apps/frontend/src/components/layout/UserMenu.tsx` | `document.cookie` 삭제 제거                  |
| `apps/frontend/src/middleware.ts`                  | `/login` 방문 시 인증 사용자 리다이렉트 추가 |
| `apps/frontend/src/app/login/page.test.tsx`        | 쿠키 어서션 수정                             |
| `apps/frontend/src/app/register/page.test.tsx`     | 쿠키 어서션 수정                             |

---

## 2. 현재 구조 요약

```
[로그인] → backend: refresh_token(httpOnly) 쿠키 + { accessToken } 응답 바디
         → frontend: document.cookie = access_token=...  ← 문제 지점
         → Axios 요청 시: document.cookie에서 읽어 Authorization: Bearer 헤더로 전송

[미들웨어] → request.cookies.get('access_token') 으로 JWT payload 읽어 라우팅
[AdminGuard] → document.cookie에서 access_token 읽어 role 확인

핵심 구조적 사실:
- JwtStrategy는 이미 req.cookies['access_token']을 우선 추출 (Authorization 헤더는 fallback)
- Next.js 미들웨어는 Edge Runtime에서 httpOnly 쿠키도 request.cookies로 읽을 수 있음
- withCredentials: true 가 이미 설정되어 있어 httpOnly 쿠키 자동 전송 가능
```

---

## 3. 변경해야 할 지점

### 백엔드 (`auth.controller.ts`)

| 엔드포인트                        | 현재                                         | 변경 후                                                         |
| --------------------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| `POST /auth/login`                | `{ accessToken }` 반환, refresh_token만 쿠키 | `access_token`도 **httpOnly** 쿠키 설정, 바디는 `{}`            |
| `POST /auth/register`             | `{ message, accessToken }` 반환              | `access_token` **httpOnly** 쿠키 설정, 바디는 `{ message }`     |
| `POST /auth/refresh`              | `{ accessToken }` 반환                       | `access_token` **httpOnly** 쿠키 설정, 바디는 `{ status }` 반환 |
| `POST /auth/logout`               | `refresh_token`만 `clearCookie`              | `access_token`도 `clearCookie` 추가                             |
| `GET /auth/naver\|kakao/callback` | `httpOnly: false`                            | `httpOnly: true` 로 변경                                        |

### 백엔드 (`auth.service.ts`)

`refresh()` 반환 타입에 `status: UserStatus` 추가 — 컨트롤러가 응답 바디에 내려줄 수 있도록.

### 프론트엔드 (`client.ts`)

```
요청 인터셉터 전체 제거
  - document.cookie 읽기 + Authorization 헤더 세팅 로직 삭제
  - withCredentials: true 가 httpOnly 쿠키를 자동 전송하므로 불필요

갱신 인터셉터 수정
  - document.cookie = access_token=... 제거 (백엔드가 httpOnly로 설정)
  - document.cookie = access_token=; expires=... 제거 (httpOnly는 JS로 삭제 불가)
  - 재시도 로직은 그대로 유지
```

### 프론트엔드 (페이지 파일)

- **`login/page.tsx`**: `document.cookie` 읽어 기존 세션 확인하는 `useEffect` 제거, 로그인 후 쿠키 쓰기 제거
- **`register/page.tsx`**: 가입 후 `document.cookie = access_token=...` 제거
- **`pending/page.tsx`**: `decodeJwtStatus()` 제거, `/auth/refresh` 응답 `{ status }` 필드로 라우팅, `document.cookie` 쓰기 제거
- **`AdminGuard.tsx`**: `getRoleFromCookie()` 제거, `/users/me` API 호출로 role 확인 (미들웨어 1차 방어 유지)
- **`UserMenu.tsx`**: `document.cookie = 'access_token=; ...'` 제거 (logout API가 서버에서 clearCookie 처리)

### 프론트엔드 (`middleware.ts`)

인증 사용자가 `/login` 직접 접근 시 `/`로 리다이렉트 추가 — 기존 login 페이지 `useEffect` 대체.

---

## 4. 잠재적 위험

| 위험                                    | 설명                                                                          | 대응                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **pending 페이지 폴링 깨짐**            | 응답 바디에서 JWT 디코딩 → httpOnly 전환 시 불가                              | refresh 응답에 `{ status }` 명시적으로 추가                         |
| **login 기존 세션 감지 UX 손실**        | `document.cookie` 방식 제거 시 이미 로그인된 사용자가 `/login` 직접 접근 가능 | middleware에서 APPROVED 토큰 보유 시 `/login` → `/` 리다이렉트 처리 |
| **소셜 로그인 쿠키 적용 타이밍**        | OAuth 콜백 redirect 응답의 쿠키는 브라우저가 처리 — `withCredentials` 무관    | 표준 동작, 위험 없음                                                |
| **auth.service refresh 반환 타입 변경** | spec 파일에 파급 효과                                                         | 서비스 스펙 파일 동시 수정                                          |
| **AdminGuard API 호출 지연**            | 즉각적인 쿠키 읽기 → 비동기 API 호출로 전환                                   | 로딩 상태는 기존 `null` 반환 패턴 유지                              |

---

## 5. 구현 순서

```
1. [BE] auth.service.ts — refresh() 반환에 status 추가
2. [BE] auth.controller.ts — 모든 엔드포인트에서 access_token httpOnly 쿠키 설정,
                             login/register 바디에서 accessToken 제거,
                             logout에 clearCookie('access_token') 추가
3. [BE] auth.controller.spec.ts — httpOnly: true 어서션, logout clearCookie 어서션 수정
4. [FE] client.ts — 요청 인터셉터 제거, 갱신 인터셉터에서 document.cookie 코드 제거
5. [FE] middleware.ts — 인증 사용자의 /login 접근 시 리다이렉트 추가
6. [FE] pending/page.tsx — status 필드 기반으로 폴링 로직 교체
7. [FE] login/page.tsx, register/page.tsx — document.cookie 코드 제거
8. [FE] AdminGuard.tsx — API 호출 방식으로 교체
9. [FE] UserMenu.tsx — document.cookie 삭제 코드 제거
10. [FE] 테스트 파일 수정 (login, register)
```

---

## 6. 테스트 전략

### 백엔드 (`auth.controller.spec.ts`)

- `login` / `register`: `res.cookie` 호출 시 `httpOnly: true` 어서션 추가
- `refresh`: `res.cookie('access_token', ...)` 설정 + 응답 바디에 `status` 포함 확인
- `logout`: `res.clearCookie('access_token')` 호출 확인 추가
- 소셜 콜백: 기존 `httpOnly: false` → `httpOnly: true` 어서션 수정

### 프론트엔드 (`login/page.test.tsx`)

- `document.cookie` 직접 세팅 어서션 제거
- 로그인 성공 후 `router.push('/')` 호출 확인으로 대체
- 기존 세션 확인 테스트(line 133, `document.cookie = 'access_token=existing-token'`)는 미들웨어 담당으로 이관 → 삭제

### 프론트엔드 (`register/page.test.tsx`)

- 가입 성공 후 쿠키 설정 어서션이 있다면 제거하고 `router.push('/pending')` 확인

### 실행 커맨드

```bash
# 백엔드
pnpm --filter @yueeroom/backend test -- --silent apps/backend/src/auth/auth.controller.spec.ts

# 프론트엔드
cd apps/frontend && npx vitest run --reporter=dot src/app/login/page.test.tsx src/app/register/page.test.tsx
```

---

## 사전 결정 사항

`auth.service.ts`의 `refresh()` 반환 타입에 `status` 추가 여부를 먼저 확정해야 pending 페이지 폴링 로직 방향이 결정된다.
