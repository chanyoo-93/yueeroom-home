# Issue #159 준비 계획

## 사람이 읽는 요약

1. **네가 이해한 작업 목표**

Issue #159의 목표는 인증/인가 회귀 테스트를 보강하는 것이다.

- 일반 사용자 `CUSTOMER`가 관리자 API에 접근하면 `403 Forbidden`을 받는지 검증한다.
- 미인증 사용자가 보호 API에 접근하면 `401 Unauthorized`를 받는지 검증한다.
- 공개 API에는 `@Public()` 메타데이터가 적용되어 있는지 검증한다.
- 구현 코드 변경보다는 Guard, Controller metadata, Controller method wiring에 대한 테스트 추가가 핵심이다.

2. **수정 대상 파일**

신규:

- `apps/backend/src/common/guards/jwt-auth.guard.spec.ts`

수정:

- `apps/backend/src/auth/auth.controller.spec.ts`
- `apps/backend/src/admin/admin.controller.spec.ts`

참조만 하고 수정하지 않을 파일:

- `docs/plans/issue-159-plan.md`
- `apps/backend/src/common/guards/jwt-auth.guard.ts`
- `apps/backend/src/common/guards/admin.guard.ts`
- `apps/backend/src/common/decorators/public.decorator.ts`
- `apps/backend/src/auth/auth.controller.ts`
- `apps/backend/src/admin/admin.controller.ts`

3. **구현 순서**

1. `jwt-auth.guard.spec.ts`를 새로 추가한다.
   - `handleRequest()`에서 user 없음, err 존재, 정상 user 반환 케이스를 테스트한다.
   - `canActivate()`에서 `@Public()`이면 JWT 검증을 우회하고, 아니면 상위 `AuthGuard('jwt')` 흐름을 호출하는지 테스트한다.

1. `auth.controller.spec.ts`에 `@Public()` 메타데이터 검증 섹션을 추가한다.
   - `register`, `login`, `refresh`, `forgotPassword`, `resetPassword`, `naver`, `naverCallback`, `kakao`, `kakaoCallback` 공개 여부를 확인한다.
   - `logout`, `setupMfa`, `verifyMfa`는 `@Public()`이 없어야 함을 확인한다.
   - 기존 AdminGuard MFA 테스트와 충돌하지 않게 metadata 검증만 추가한다.

1. `admin.controller.spec.ts`를 보강한다.
   - `AdminGuard`가 `CUSTOMER` payload와 user 없음 케이스를 `ForbiddenException`으로 거부하는지 테스트한다.
   - 계획서에 명시된 누락 엔드포인트가 `adminService` 메서드를 올바른 인자로 호출하는지 검증한다.

1. 관련 테스트만 실행한다.
   - `jwt-auth.guard`
   - `auth.controller`
   - `admin.controller`

1. **테스트 추가/수정 계획**

추가 테스트:

- `JwtAuthGuard.handleRequest`
  - user가 없으면 `UnauthorizedException`
  - err가 있으면 해당 err 또는 Unauthorized 흐름
  - user가 있으면 그대로 반환

- `JwtAuthGuard.canActivate`
  - `@Public()`이면 `true`
  - `@Public()`이 아니면 `super.canActivate()` 호출

- `AuthController @Public()` metadata
  - 공개 API는 `IS_PUBLIC_KEY`가 `true`
  - 보호 API는 `IS_PUBLIC_KEY`가 없음

- `AdminController authorization`
  - `CUSTOMER` payload는 `ForbiddenException`
  - user 없음은 `ForbiddenException`

- `AdminController 기능 wiring`
  - `listUsers`
  - `listPendingUsers`
  - `approveUser`
  - `listOrders`
  - `updateOrderStatus`
  - `updateOrderTracking`
  - `rejectUser`
  - `suspendUser`
  - `restoreUser`

5. **위험 요소**

- `JwtAuthGuard`는 `AuthGuard('jwt')`를 상속하므로 `super.canActivate()` 테스트에서 Passport 실행 흐름이 개입될 수 있다. 실제 전략 실행이 아닌 호출 여부 검증 중심으로 mocking해야 한다.
- `@Public()` 메타데이터는 Nest `SetMetadata` 기반이므로 method target을 정확히 잡아야 한다.
- `auth.controller.ts`에서 `login`, 소셜 로그인 메서드는 `@Public()`과 `@UseGuards(AuthGuard(...))`가 함께 있으므로 guard metadata와 public metadata를 혼동하지 않아야 한다.
- `admin.controller.spec.ts`는 현재 `adminService`가 빈 객체로 생성되어 있어, 누락 엔드포인트 테스트 추가 시 필요한 mock 메서드를 명시적으로 구성해야 한다.
- 현재 `docs/plans/issue-159-plan.md`가 untracked 상태이므로 커밋 단계에서는 포함 여부를 별도로 확인해야 한다.

6. **작업 시작 전에 확인이 필요한 점**

- 계획서 주의사항에 `issue-158-plan.md`라고 적혀 있지만, 현재 요청과 참조 파일은 `issue-159-plan.md`이므로 Issue #159 범위로 해석한다.
- `docs/plans/issue-159-plan.md`는 현재 git에서 untracked 상태다. 구현 커밋에 포함할지 여부는 작업 시작 전 확인이 필요하다.
- 실제 구현 단계에서는 코드 변경 전 현재 브랜치와 git diff를 다시 확인해야 한다.

## machine_readable

```yaml
issue_number: 159
short_name: auth-authorization-regression-tests
issue_goal: '인증/인가 회귀 테스트를 보강해 CUSTOMER의 관리자 API 접근 403, 미인증 사용자의 보호 API 접근 401, 공개 API의 @Public() 적용 여부를 자동 검증한다.'
core_principles:
  - '기능 구현 변경이 아니라 테스트 보강을 중심으로 작업한다.'
  - '전역 Guard 파이프라인과 @Public(), AdminGuard 조합의 회귀를 테스트로 고정한다.'
  - '계획서에서 변경 대상으로 언급된 spec 파일 중심으로만 수정한다.'
  - 'Guard/Controller 구현 파일은 참조만 하고 불필요하게 수정하지 않는다.'
target_files:
  new:
    - 'apps/backend/src/common/guards/jwt-auth.guard.spec.ts'
  modify:
    - 'apps/backend/src/auth/auth.controller.spec.ts'
    - 'apps/backend/src/admin/admin.controller.spec.ts'
  delete: []
do_not_touch:
  - 'docs/plans/issue-159-plan.md'
  - 'apps/backend/src/common/guards/jwt-auth.guard.ts'
  - 'apps/backend/src/common/guards/admin.guard.ts'
  - 'apps/backend/src/common/guards/user-status.guard.spec.ts'
  - 'apps/backend/src/common/decorators/public.decorator.ts'
  - 'apps/backend/src/auth/auth.controller.ts'
  - 'apps/backend/src/admin/admin.controller.ts'
  - 'apps/frontend/**'
  - 'packages/shared/**'
implementation_requirements:
  - 'JwtAuthGuard spec 파일을 신규 작성한다.'
  - 'JwtAuthGuard.handleRequest에서 user 없음, err 존재, 정상 user 반환 케이스를 테스트한다.'
  - 'JwtAuthGuard.canActivate에서 @Public() 엔드포인트는 true를 반환하고 JWT 검증을 우회하는지 테스트한다.'
  - 'JwtAuthGuard.canActivate에서 @Public()이 없는 엔드포인트는 상위 AuthGuard canActivate 흐름을 호출하는지 테스트한다.'
  - 'auth.controller.spec.ts에 공개 API @Public() 메타데이터 검증 섹션을 추가한다.'
  - 'register, login, refresh, forgotPassword, resetPassword, naverLogin, naverCallback, kakaoLogin, kakaoCallback의 @Public() 적용 여부를 검증한다.'
  - 'logout, setupMfa, verifyMfa는 @Public()이 적용되어 있지 않음을 검증한다.'
  - 'admin.controller.spec.ts에 AdminGuard authorization 테스트를 추가한다.'
  - 'CUSTOMER payload와 user 없음 케이스가 ForbiddenException으로 거부되는지 검증한다.'
  - 'admin.controller.spec.ts에 누락된 admin controller method wiring 테스트를 추가한다.'
  - 'listUsers, listPendingUsers, approveUser, listOrders, updateOrderStatus, updateOrderTracking, rejectUser, suspendUser, restoreUser의 service 호출을 검증한다.'
test_requirements:
  - 'JwtAuthGuard 401 및 @Public() 우회 테스트가 통과해야 한다.'
  - 'AuthController 공개/보호 API metadata 테스트가 통과해야 한다.'
  - 'AdminController AdminGuard authorization 테스트가 통과해야 한다.'
  - 'AdminController 누락 엔드포인트 service 호출 테스트가 통과해야 한다.'
  - '기존 auth/admin guard 관련 테스트를 깨뜨리지 않아야 한다.'
test_commands:
  - 'pnpm --filter @yueeroom/backend test -- --silent src/common/guards/jwt-auth.guard'
  - 'pnpm --filter @yueeroom/backend test -- --silent src/auth/auth.controller'
  - 'pnpm --filter @yueeroom/backend test -- --silent src/admin/admin.controller'
risks:
  - "JwtAuthGuard가 AuthGuard('jwt')를 상속하므로 super.canActivate() mocking이 부정확하면 Passport 전략 실행으로 테스트가 불안정해질 수 있다."
  - '@Public() 메타데이터 target을 잘못 잡으면 실제 decorator 적용 여부와 다른 결과를 볼 수 있다.'
  - 'login과 소셜 로그인은 @Public()과 AuthGuard가 함께 적용되어 있어 public metadata와 guard metadata를 구분해야 한다.'
  - 'admin.controller.spec.ts의 기존 adminService mock이 빈 객체라 누락 엔드포인트 테스트 추가 시 필요한 mock 메서드를 명시적으로 구성해야 한다.'
  - 'docs/plans/issue-159-plan.md가 현재 untracked 상태이므로 커밋 포함 여부를 별도 확인해야 한다.'
pre_start_checks:
  - '현재 브랜치와 git diff를 확인한다.'
  - 'docs/plans/issue-159-plan.md의 untracked 상태를 확인한다.'
  - 'Issue #159 범위가 테스트 보강으로 제한됨을 확인한다.'
  - '구현 파일은 수정하지 않고 spec 파일 중심으로 작업한다.'
  - '계획서의 issue-158-plan.md 언급은 문맥상 issue-159-plan.md로 해석한다.'
```
