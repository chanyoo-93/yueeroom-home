# Issue #150 구현 계획 — 관리자 MFA API에 AdminGuard 적용

## 배경

`/api/auth/admin/mfa/setup`, `/api/auth/admin/mfa/verify` 두 엔드포인트는
관리자 전용 기능임에도 `AdminGuard`(또는 `RolesGuard`)가 없어
인증된 CUSTOMER 사용자도 호출 가능한 상태다.

---

## 1. 관련 파일 목록

| 파일                                                 | 역할                                    |
| ---------------------------------------------------- | --------------------------------------- |
| `apps/backend/src/auth/auth.controller.ts`           | MFA 엔드포인트 정의 (변경 대상)         |
| `apps/backend/src/auth/auth.controller.spec.ts`      | 컨트롤러 단위 테스트 (변경 대상)        |
| `apps/backend/src/common/guards/admin.guard.ts`      | `AdminGuard` 구현체 (읽기 전용 참고)    |
| `apps/backend/src/common/guards/admin.guard.spec.ts` | `AdminGuard` 자체 테스트 (참고)         |
| `apps/backend/src/admin/admin.controller.ts`         | `@UseGuards(AdminGuard)` 적용 패턴 참고 |

---

## 2. 현재 구조 요약

### MFA 엔드포인트 현황 (`auth.controller.ts` L166–L183)

```typescript
// ── Admin MFA ──────────────────────────────────────────────
@Post('admin/mfa/setup')
@ApiOperation({ summary: '관리자 MFA 설정 (TOTP QR 코드 발급)' })
setupMfa(@CurrentUser() user: JwtPayload): Promise<...> { ... }

@Post('admin/mfa/verify')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'MFA 코드 검증' })
verifyMfa(@CurrentUser() ..., @Body() ...): Promise<...> { ... }
```

**문제**: 두 핸들러 모두 `@UseGuards(AdminGuard)` 데코레이터가 없다.  
전역 `JwtAuthGuard` + `UserStatusGuard`는 적용되지만 역할(role) 검증은 없다.

### AdminGuard 동작 방식

- `request.user.role !== UserRole.ADMIN` 이면 `ForbiddenException` (HTTP 403) 을 던진다.
- `user` 자체가 없으면 동일하게 403.
- 의존성 주입 없이 독립 실행 가능한 단순 Guard다.

### 기존 적용 패턴 (`admin.controller.ts`)

```typescript
@UseGuards(AdminGuard)
export class AdminController { ... }
```

컨트롤러 레벨에 선언하여 모든 핸들러에 일괄 적용하는 패턴을 쓴다.

### 현재 테스트 현황 (`auth.controller.spec.ts`)

- `setupMfa`, `verifyMfa`는 `mockAuthService`에 mock 함수로 등록되어 있으나
  `describe` 블록이 없고 테스트 케이스가 전혀 없다.
- `TestingModule` 생성 시 Guard를 별도로 override하지 않으므로,
  Guard 추가 후 테스트에서 Guard를 통과시킬 방법이 필요하다.

---

## 3. 변경해야 할 지점

### (A) `auth.controller.ts`

두 MFA 핸들러에 각각 `@UseGuards(AdminGuard)` 데코레이터를 추가한다.

```
L168: @Post('admin/mfa/setup')
      → @UseGuards(AdminGuard) 추가

L174: @Post('admin/mfa/verify')
      → @UseGuards(AdminGuard) 추가
```

`AdminGuard`는 이미 `apps/backend/src/common/guards/admin.guard.ts`에 존재하므로
import 구문만 추가하면 된다.

### (B) `auth.controller.spec.ts`

MFA 엔드포인트에 대한 `describe` 블록 2개를 추가한다.

- `setupMfa` describe
  - ADMIN 사용자: `setupMfa` 서비스 호출 후 `{ secret, qrCodeUrl }` 반환 확인
  - CUSTOMER 사용자: 403 반환 확인 (Guard override 또는 컨트롤러 직접 호출로 검증)
- `verifyMfa` describe
  - ADMIN 사용자: `verifyMfa` 서비스 호출 후 `{ message }` 반환 확인
  - CUSTOMER 사용자: 403 반환 확인

**테스트에서 Guard를 처리하는 두 가지 접근법** (확인 필요 — 기존 spec 패턴 없음):

| 방법                                      | 설명                                         |
| ----------------------------------------- | -------------------------------------------- |
| `overrideGuard(AdminGuard).useValue(...)` | `TestingModule`에서 Guard를 mock으로 교체    |
| 컨트롤러 메서드 직접 호출                 | Guard 레이어를 건너뛰고 메서드 로직만 테스트 |

기존 spec 파일의 패턴(컨트롤러 인스턴스를 직접 호출)을 따르면
Guard 자체는 `admin.guard.spec.ts`에서 이미 검증되므로,
**컨트롤러 테스트에서는 ADMIN 사용자 시나리오만 직접 호출로 검증**하는 것이 일관적이다.

403 시나리오는 Guard 단위 테스트(`admin.guard.spec.ts`)에서 이미 커버되므로
컨트롤러 테스트에서 중복 검증은 불필요하다.

> **확인 필요**: 이슈 완료 조건에 "CUSTOMER 사용자는 403을 받는다"가 명시되어 있으므로,
> 컨트롤러 테스트에서도 해당 케이스를 요구하는지 확인 필요.
> 요구한다면 `overrideGuard` 패턴으로 module을 두 벌 생성해야 한다.

---

## 4. 잠재적 위험

| 위험                  | 설명                                                                                                                                                              | 대응                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Guard 실행 순서       | 전역 `JwtAuthGuard` → `UserStatusGuard` → `AdminGuard` 순서로 실행되어야 한다. 핸들러 레벨 `@UseGuards(AdminGuard)`는 전역 Guard 이후에 실행되므로 순서 문제 없음 | 별도 조치 불필요                         |
| `@Public()` 충돌 없음 | 두 MFA 핸들러에 `@Public()` 데코레이터가 없으므로 JWT 인증은 이미 통과 중                                                                                         | 확인 완료                                |
| Swagger 문서 노출     | `@ApiOperation`만 있고 `@ApiBearerAuth`, `@ApiForbiddenResponse` 등 보안 관련 Swagger 어노테이션이 없음                                                           | 선택 사항 — 이슈 범위 밖이므로 생략 가능 |
| 테스트 module 분기    | Guard를 의미있게 테스트하려면 ADMIN/CUSTOMER 두 역할로 module을 분리해야 할 수 있음                                                                               | 위 4번 "확인 필요" 참고                  |

---

## 5. 구현 순서

1. **`auth.controller.ts`**: `AdminGuard` import 추가 + 두 핸들러에 `@UseGuards(AdminGuard)` 추가
2. **`auth.controller.spec.ts`**: `setupMfa` describe 블록 추가 (ADMIN 정상 흐름)
3. **`auth.controller.spec.ts`**: `verifyMfa` describe 블록 추가 (ADMIN 정상 흐름)
4. 테스트 실행으로 통과 확인
5. feature 브랜치 생성 → 커밋 → PR (`Closes #150`)

---

## 6. 테스트 전략

### 실행 명령

```bash
cd apps/backend && pnpm test -- --silent src/auth/auth.controller.spec.ts
```

### 추가할 테스트 케이스

```
describe('setupMfa')
  ✓ ADMIN 사용자: authService.setupMfa(user.sub) 호출 후 { secret, qrCodeUrl } 반환

describe('verifyMfa')
  ✓ ADMIN 사용자: authService.verifyMfa(user.sub, dto.code) 호출 후 { message } 반환
```

### Guard 403 커버리지

- `admin.guard.spec.ts`에서 CUSTOMER → ForbiddenException이 이미 검증됨
- 컨트롤러 레벨에서 중복 검증 여부는 팀 컨벤션에 따라 결정 (확인 필요)
