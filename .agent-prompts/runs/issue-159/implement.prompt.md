정리한 Issue #159 이해 내용을 기준으로 구현을 진행해.

목표:
인증/인가 회귀 테스트를 보강해 CUSTOMER의 관리자 API 접근 403, 미인증 사용자의 보호 API 접근 401, 공개 API의 @Public() 적용 여부를 자동 검증한다.

핵심 원칙:

- 기능 구현 변경이 아니라 테스트 보강을 중심으로 작업한다.
- 전역 Guard 파이프라인과 @Public(), AdminGuard 조합의 회귀를 테스트로 고정한다.
- 계획서에서 변경 대상으로 언급된 spec 파일 중심으로만 수정한다.
- Guard/Controller 구현 파일은 참조만 하고 불필요하게 수정하지 않는다.

참고 문서:

- docs/plans/issue-159-plan.md

중요한 제약:

- 작업 시작 전 메인 브랜치의 최신화 여부를 확인하고, 작업 브랜치로 체크아웃한다.
- 브랜치 네이밍은 fix/issue-159-auth-authorization-regression-tests 또는 feat/issue-159-auth-authorization-regression-tests 형식을 사용한다.
- docs/plans/issue-159-plan.md는 참고만 하고, 코드 변경 대상에 포함하지 마.
- 계획서 범위를 벗어난 리팩토링이나 기능 추가는 하지 마.
- DB schema, migration, seed 파일은 수정하지 마.
- 새 API endpoint는 명시적으로 요구되지 않는 한 추가하지 마.
  - docs/plans/issue-159-plan.md
- apps/backend/src/common/guards/jwt-auth.guard.ts
- apps/backend/src/common/guards/admin.guard.ts
- apps/backend/src/common/guards/user-status.guard.spec.ts
- apps/backend/src/common/decorators/public.decorator.ts
- apps/backend/src/auth/auth.controller.ts
- apps/backend/src/admin/admin.controller.ts
- apps/frontend/\*\*
- packages/shared/\*\*

수정 대상 파일:

- 신규: apps/backend/src/common/guards/jwt-auth.guard.spec.ts
- 수정: apps/backend/src/auth/auth.controller.spec.ts
- 수정: apps/backend/src/admin/admin.controller.spec.ts

구현 요구사항:

- JwtAuthGuard spec 파일을 신규 작성한다.
- JwtAuthGuard.handleRequest에서 user 없음, err 존재, 정상 user 반환 케이스를 테스트한다.
- JwtAuthGuard.canActivate에서 @Public() 엔드포인트는 true를 반환하고 JWT 검증을 우회하는지 테스트한다.
- JwtAuthGuard.canActivate에서 @Public()이 없는 엔드포인트는 상위 AuthGuard canActivate 흐름을 호출하는지 테스트한다.
- auth.controller.spec.ts에 공개 API @Public() 메타데이터 검증 섹션을 추가한다.
- register, login, refresh, forgotPassword, resetPassword, naverLogin, naverCallback, kakaoLogin, kakaoCallback의 @Public() 적용 여부를 검증한다.
- logout, setupMfa, verifyMfa는 @Public()이 적용되어 있지 않음을 검증한다.
- admin.controller.spec.ts에 AdminGuard authorization 테스트를 추가한다.
- CUSTOMER payload와 user 없음 케이스가 ForbiddenException으로 거부되는지 검증한다.
- admin.controller.spec.ts에 누락된 admin controller method wiring 테스트를 추가한다.
- listUsers, listPendingUsers, approveUser, listOrders, updateOrderStatus, updateOrderTracking, rejectUser, suspendUser, restoreUser의 service 호출을 검증한다.

테스트 요구사항:

- JwtAuthGuard 401 및 @Public() 우회 테스트가 통과해야 한다.
- AuthController 공개/보호 API metadata 테스트가 통과해야 한다.
- AdminController AdminGuard authorization 테스트가 통과해야 한다.
- AdminController 누락 엔드포인트 service 호출 테스트가 통과해야 한다.
- 기존 auth/admin guard 관련 테스트를 깨뜨리지 않아야 한다.

작업 방식:

1. 먼저 실제 현재 코드 상태와 git diff를 확인한다.
2. 위 범위 안에서만 코드를 수정한다.
3. 변경이 커질 경우 백엔드 → 프론트엔드 → 테스트 순서로 나눠 진행한다.
4. 수정 후 관련 테스트를 실행한다.
5. 실패 테스트가 있으면 원인을 설명하고, Issue #159 범위 안에서만 수정한다.

우선 실행 권장 테스트:

```bash
pnpm --filter @yueeroom/backend test -- --silent src/common/guards/jwt-auth.guard
```

```bash
pnpm --filter @yueeroom/backend test -- --silent src/auth/auth.controller
```

```bash
pnpm --filter @yueeroom/backend test -- --silent src/admin/admin.controller
```

출력 형식:

1. 변경한 파일 목록
2. 핵심 변경 내용
3. 응답 계약 변경 요약
4. 실행한 테스트 명령
5. 테스트 결과
6. 실패한 테스트가 있다면 원인과 조치 내용
7. 남은 위험 요소
8. 커밋 전 확인해야 할 사항

주의:

- 한 번에 전체 구조를 갈아엎지 마.
- 계획서에 있는 Issue #159 범위만 구현해.
- 보안/인증 이슈라면 기존보다 취약한 흐름을 다시 만들지 마.
