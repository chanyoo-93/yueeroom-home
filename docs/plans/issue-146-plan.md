# 작업 계획 — 이슈 #146

**제목**: [보안 개선] 관리자 사용자 목록 응답에서 민감 필드 제거  
**우선순위**: High / **난이도**: Easy / **선행 작업**: 없음

---

## 1. 관련 파일 목록

| 파일                                           | 역할                                                   |
| ---------------------------------------------- | ------------------------------------------------------ |
| `apps/backend/src/admin/admin.service.ts`      | 문제 발생 지점 — `listUsers()`, `listPendingUsers()`   |
| `apps/backend/src/admin/admin.controller.ts`   | 반환 타입 수정 필요                                    |
| `apps/backend/src/admin/admin.service.spec.ts` | 기존 테스트 수정 + 새 테스트 추가                      |
| `apps/backend/src/users/users.service.ts`      | `USER_SAFE_SELECT`, `SafeUser` 정의 위치 (수정 불필요) |

---

## 2. 현재 구조 요약

`USER_SAFE_SELECT`와 `SafeUser`는 `users.service.ts`에 정의되어 있고, `admin.service.ts`에 **이미 import**되어 있다.  
`approveUser`, `rejectUser`, `suspendUser`, `restoreUser`는 모두 `select: USER_SAFE_SELECT`를 올바르게 적용 중이다.

문제는 `listUsers()`와 `listPendingUsers()` 두 메서드만 select 없이 전체 필드를 반환한다는 점이다.

```ts
// admin.service.ts — 현재 (문제)
async listPendingUsers(): Promise<User[]> {
  return this.prisma.user.findMany({ where: { status: UserStatus.PENDING }, ... });
  // select 없음 → password, mfaSecret, providerId 포함
}

async listUsers(status?: UserStatus): Promise<User[]> {
  return this.prisma.user.findMany({ where: ..., orderBy: ... });
  // select 없음 → password, mfaSecret, providerId 포함
}
```

---

## 3. 변경해야 할 지점

### `admin.service.ts` (2곳)

```ts
async listPendingUsers(): Promise<SafeUser[]> {
  return this.prisma.user.findMany({
    where: { status: UserStatus.PENDING },
    orderBy: { createdAt: 'asc' },
    select: USER_SAFE_SELECT,   // 추가
  });
}

async listUsers(status?: UserStatus): Promise<SafeUser[]> {
  return this.prisma.user.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'asc' },
    select: USER_SAFE_SELECT,   // 추가
  });
}
```

### `admin.controller.ts` (2곳)

```ts
listUsers(...): Promise<SafeUser[]>       // User[] → SafeUser[]
listPendingUsers(): Promise<SafeUser[]>   // User[] → SafeUser[]
```

`User` import가 컨트롤러에서 더 이상 사용되지 않으면 제거 (`Order`는 여전히 필요).

---

## 4. 잠재적 위험

| 항목                         | 내용                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `getTarget()` 내부 메서드    | 전체 `User`를 반환하는 private 헬퍼 — 내부 상태 검증용이므로 **변경 불필요** |
| 프론트 관리자 화면           | `password`, `mfaSecret`은 프론트에서 사용하지 않으므로 화면 영향 없음        |
| `USER_SAFE_SELECT` 필드 범위 | `consentAt`, `deletedAt` 포함 — 관리자 기능상 문제 없음                      |

---

## 5. 구현 순서

```
1. admin.service.ts
   ├── listPendingUsers(): select + 반환 타입 변경
   └── listUsers(): select + 반환 타입 변경

2. admin.controller.ts
   ├── listUsers 반환 타입 → SafeUser[]
   ├── listPendingUsers 반환 타입 → SafeUser[]
   └── 불필요한 User import 제거 여부 확인

3. admin.service.spec.ts
   ├── listUsers 기존 테스트: findMany 호출에 select 포함 검증 추가
   ├── listPendingUsers 테스트 suite 신규 추가
   └── password / mfaSecret 미포함 검증 테스트 추가
```

---

## 6. 테스트 전략

### 기존 테스트 수정 (`listUsers` describe 블록)

`findMany` 호출 시 `{ select: USER_SAFE_SELECT }` 포함 여부 검증 추가.

### 신규 테스트 추가 (`listPendingUsers` describe 블록)

```ts
describe('listPendingUsers', () => {
  it('PENDING 회원 목록을 반환한다');
  it('응답에 password 필드가 없다');
  it('응답에 mfaSecret 필드가 없다');
  it('select: USER_SAFE_SELECT로 호출된다');
});
```

### 실행 명령

```bash
pnpm --filter @yueeroom/backend test -- --silent apps/backend/src/admin/admin.service.spec.ts
```
