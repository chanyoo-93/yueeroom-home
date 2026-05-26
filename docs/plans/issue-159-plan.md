# Issue #159 — 인증/인가 회귀 테스트 보강

## Context

전역 Guard(ThrottlerGuard → JwtAuthGuard → UserStatusGuard)와 `@Public()`, `AdminGuard` 조합이 많아
코드 리뷰만으로는 권한 누락을 발견하기 어렵다. 자동 회귀 테스트가 없어 이슈 발생 시 디버깅 비용이 높다.

완료 조건:

- 일반 사용자(CUSTOMER)는 관리자 API에서 403을 받는다
- 미인증 사용자는 보호 API에서 401을 받는다
- 공개 API는 @Public()이 적용되어 있다

---

## 1. 관련 파일 목록

| 파일                                          | 역할                        | 현재 상태                                    |
| --------------------------------------------- | --------------------------- | -------------------------------------------- |
| `src/auth/auth.controller.spec.ts`            | Auth 엔드포인트 기능 테스트 | MFA 권한 메타데이터/실행 테스트 있음         |
| `src/admin/admin.controller.spec.ts`          | Admin 엔드포인트 테스트     | 클래스 레벨 AdminGuard 메타데이터 1개만 있음 |
| `src/common/guards/admin.guard.spec.ts`       | AdminGuard 유닛 테스트      | 완전함 (ADMIN/CUSTOMER/no-user 3케이스)      |
| `src/common/guards/jwt-auth.guard.ts`         | 전역 JWT 인증 Guard         | 구현만 있고 **spec 파일 없음**               |
| `src/common/guards/user-status.guard.spec.ts` | UserStatusGuard 유닛 테스트 | 완전함                                       |
| `src/common/decorators/public.decorator.ts`   | IS_PUBLIC_KEY = 'isPublic'  | 참조용                                       |
| `src/auth/auth.controller.ts`                 | Auth 엔드포인트 정의        | @Public() 8개 / AdminGuard 2개               |
| `src/admin/admin.controller.ts`               | Admin 엔드포인트 12개       | 클래스 레벨 @UseGuards(AdminGuard)           |

---

## 2. 현재 구조 요약

### 전역 Guard 파이프라인 (app.module.ts)

```
모든 요청 → ThrottlerGuard → JwtAuthGuard → UserStatusGuard
```

- `@Public()` 메타데이터 있으면 JwtAuthGuard가 JWT 검증 스킵
- `@UseGuards(AdminGuard)` 추가 시 role === ADMIN 검증

### Auth 엔드포인트 권한 현황

| 메서드                                              | @Public()                 | AdminGuard |
| --------------------------------------------------- | ------------------------- | ---------- |
| register / refresh / forgotPassword / resetPassword | ✅                        | -          |
| login                                               | ✅ (+ AuthGuard('local')) | -          |
| naver / naverCallback / kakao / kakaoCallback       | ✅                        | -          |
| logout                                              | ❌ (JWT 필요)             | -          |
| setupMfa / verifyMfa                                | ❌ (JWT 필요)             | ✅         |

### Admin 엔드포인트 권한 현황

- 클래스 레벨 `@UseGuards(AdminGuard)` → 12개 엔드포인트 전체 보호

---

## 3. 변경해야 할 지점

### [신규] `src/common/guards/jwt-auth.guard.spec.ts`

**401 케이스 커버** — 현재 spec 파일 없음. 추가할 테스트:

```
JwtAuthGuard
  handleRequest
    ✓ user가 없으면 UnauthorizedException을 던진다
    ✓ err가 있으면 UnauthorizedException을 던진다
    ✓ user가 있으면 그대로 반환한다
  canActivate
    ✓ @Public() 엔드포인트는 JWT 검증 없이 true를 반환한다
    ✓ @Public() 없는 엔드포인트는 super.canActivate()를 호출한다
```

`canActivate` 테스트 시 `super.canActivate()` mock 방법:

- Reflector를 jest.fn()으로 생성해 `getAllAndOverride` 반환값을 제어
- @Public() true → 즉시 true 반환 (super 호출 없음)
- @Public() false → super 호출 여부를 spy로 검증

### [수정] `src/auth/auth.controller.spec.ts`

**공개 API @Public() 메타데이터 검증 섹션 추가**

```
공개 API @Public() 메타데이터 검증
  ✓ register는 @Public()이 적용되어 있다
  ✓ refresh는 @Public()이 적용되어 있다
  ✓ forgotPassword는 @Public()이 적용되어 있다
  ✓ resetPassword는 @Public()이 적용되어 있다
  ✓ logout은 @Public()이 적용되어 있지 않다 (JWT 인증 필요)
  ✓ setupMfa는 @Public()이 적용되어 있지 않다 (관리자 인증 필요)
  ✓ verifyMfa는 @Public()이 적용되어 있지 않다 (관리자 인증 필요)
```

참고: `login`은 `@Public()` + `AuthGuard('local')` 조합이므로 메서드 레벨이 아닌
클래스/핸들러 레벨로 메타데이터가 설정됨을 확인 필요.

### [수정] `src/admin/admin.controller.spec.ts`

**AdminGuard authorization 테스트 추가**

auth.controller.spec.ts의 기존 패턴과 동일:

```
AdminGuard authorization (admin controller)
  ✓ CUSTOMER payload를 ForbiddenException으로 거부한다
  ✓ user가 없으면(미인증) ForbiddenException을 던진다
```

`makeContext()` 헬퍼와 `new AdminGuard()` 직접 인스턴스화 방식 사용 (기존 패턴 재사용).

추가로 누락된 엔드포인트 기능 테스트:

```
listUsers — adminService.listUsers 호출 확인
listPendingUsers — adminService.listPendingUsers 호출 확인
approveUser — adminService.approveUser(admin.sub, userId) 호출 확인
listOrders — adminService.listOrders 호출 확인
updateOrderStatus — adminService.updateOrderStatus 호출 확인
updateOrderTracking — adminService.updateOrderTracking 호출 확인
rejectUser — adminService.rejectUser 호출 확인
suspendUser — adminService.suspendUser 호출 확인
restoreUser — adminService.restoreUser 호출 확인
```

---

## 4. 잠재적 위험

1. **JwtAuthGuard canActivate() mock 복잡도**
   - `AuthGuard('jwt')`를 상속하므로 `super.canActivate()`가 Passport 전략을 실행함
   - `jest.spyOn(Object.getPrototypeOf(guard), 'canActivate')` 또는 Passport mock 필요
   - 대안: `handleRequest` 단위 테스트만으로도 401 시나리오 충분히 커버 가능

2. **@Public() 메타데이터 위치**
   - `IS_PUBLIC_KEY = 'isPublic'`, `SetMetadata`로 설정됨
   - 메서드 레벨 메타데이터는 `Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.methodName)`으로 확인
   - `login`에 @Public()이 없을 경우 확인 필요 (auth.controller.ts 코드 검토 필요)

3. **admin.controller.spec.ts 중복 우려**
   - `admin.guard.spec.ts`가 이미 CUSTOMER/no-user 케이스를 완전히 커버
   - 컨트롤러 spec에 동일 테스트 추가 시 중복이나, "guard가 실제로 wired됨"을 증명하는 integration 관점에서 가치 있음
   - 이슈 요구사항(관리자 API에서 403)을 명시적으로 충족하려면 컨트롤러 spec에도 추가

---

## 5. 구현 순서

1. **`jwt-auth.guard.spec.ts` 신규 작성** — 401 케이스 핵심 요구사항
   - `handleRequest` 테스트 (user 없음/있음/err)
   - `canActivate` + @Public() 우회 테스트
2. **`auth.controller.spec.ts` 보강** — @Public() 메타데이터 describe 블록 추가
3. **`admin.controller.spec.ts` 보강** — AdminGuard authorization + 누락 엔드포인트 기능 테스트
4. **테스트 실행 및 통과 확인**
   ```bash
   pnpm --filter @yueeroom/backend test -- --silent src/common/guards/jwt-auth.guard
   pnpm --filter @yueeroom/backend test -- --silent src/auth/auth.controller
   pnpm --filter @yueeroom/backend test -- --silent src/admin/admin.controller
   ```

---

## 6. 테스트 전략

### 접근 방식

- **Guard 유닛 테스트**: Guard 인스턴스 직접 생성, `canActivate(makeContext(user))` 호출
- **메타데이터 검증**: `Reflect.getMetadata(key, target)` — Guard/Public 데코레이터 "wired" 여부
- **컨트롤러 기능 테스트**: Guard mock 환경에서 서비스 메서드 호출 검증

### 신규 테스트 수 예상

| 파일                       | 신규 테스트 |
| -------------------------- | ----------- |
| `jwt-auth.guard.spec.ts`   | ~5개        |
| `auth.controller.spec.ts`  | ~7개        |
| `admin.controller.spec.ts` | ~11개       |
| **합계**                   | **~23개**   |

### 기존 패턴 재사용

- `makeContext(user)` 헬퍼 — `admin.guard.spec.ts`, `auth.controller.spec.ts` 모두 동일 패턴 사용
- `Reflect.getMetadata(GUARDS_METADATA_KEY, ...)` — `auth.controller.spec.ts` 기존 코드 참고
- `IS_PUBLIC_KEY` import — `src/common/decorators/public.decorator.ts`
