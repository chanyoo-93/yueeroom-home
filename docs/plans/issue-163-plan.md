# Issue #163: 페이지네이션 limit 상한 일관 적용

## Context

일부 목록 API query DTO에 `@Min(1)`은 있지만 `@Max`가 없어 클라이언트가 limit을 무제한으로 설정할 수 있다. 이미 `GetPaymentsQueryDto`는 `@Max(100)`이 적용되어 있으나 상품·주문·관리자 주문·관리자 상품 DTO에는 누락되어 있다. 과도한 limit 요청은 400으로 거부하고 payments와 동일한 `@Max(100)` 기준을 전체 목록 API에 일관 적용한다.

---

## 1. 관련 파일 목록

| 파일                                                       | 현재 상태                              | 변경 필요           |
| ---------------------------------------------------------- | -------------------------------------- | ------------------- |
| `apps/backend/src/products/dto/product-query.dto.ts`       | `@Min(1)` 있음, `@Max` 없음            | ✅                  |
| `apps/backend/src/orders/dto/get-orders-query.dto.ts`      | `@Min(1)` 있음, `@Max` 없음, 기본값 10 | ✅                  |
| `apps/backend/src/admin/dto/get-admin-orders-query.dto.ts` | `@Min(1)` 있음, `@Max` 없음, 기본값 20 | ✅                  |
| `apps/backend/src/admin/dto/admin-product-query.dto.ts`    | `@Min(1)` 있음, `@Max` 없음            | ✅ (이슈 범위 확장) |
| `apps/backend/src/payments/dto/get-payments-query.dto.ts`  | `@Max(100)` 이미 적용                  | 참고용              |
| `apps/backend/src/products/products.service.spec.ts`       | limit 기본값 테스트 있음               | 테스트 추가         |
| `apps/backend/src/orders/orders.service.spec.ts`           | limit 관련 테스트 없음                 | 테스트 추가         |
| `apps/backend/src/admin/admin.service.spec.ts`             | limit 관련 테스트 없음                 | 테스트 추가         |

---

## 2. 현재 구조 요약

**전역 ValidationPipe** (`apps/backend/src/main.ts`):

```typescript
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
```

→ DTO 데코레이터 위반 시 자동 400 응답.

**기존 패턴** (payments DTO 참고):

```typescript
@Type(() => Number)
@IsInt()
@Min(1)
@Max(100)    // 누락된 데코레이터
limit: number = 10;
```

**누락 대상 4개 DTO의 공통 구조**:

- `@Min(1)` 있음
- `@Max` 없음
- `Max` import 없음

---

## 3. 변경할 지점

### 3-1. `product-query.dto.ts`

```typescript
// Before
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
limit?: number;

// After
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
@IsInt()
@Min(1)
@Max(100)   // 추가
@IsOptional()
@Type(() => Number)
limit?: number;
```

### 3-2. `get-orders-query.dto.ts`

```typescript
// Before
import { IsInt, IsOptional, Min } from 'class-validator';
limit: number = 10;

// After
import { IsInt, IsOptional, Max, Min } from 'class-validator';
@IsOptional()
@Type(() => Number)
@IsInt()
@Min(1)
@Max(100)   // 추가
limit: number = 10;
```

### 3-3. `get-admin-orders-query.dto.ts`

```typescript
// Before
import { IsInt, IsOptional, Min } from 'class-validator';
limit: number = 20;

// After
import { IsInt, IsOptional, Max, Min } from 'class-validator';
@IsOptional()
@Type(() => Number)
@IsInt()
@Min(1)
@Max(100)   // 추가
limit: number = 20;
```

### 3-4. `admin-product-query.dto.ts`

```typescript
// Before
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
limit?: number;

// After
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
@IsInt()
@Min(1)
@Max(100)   // 추가
@IsOptional()
@Type(() => Number)
limit?: number;
```

---

## 4. 잠재적 위험

| 위험                                                 | 가능성                    | 대응                              |
| ---------------------------------------------------- | ------------------------- | --------------------------------- |
| 기존 클라이언트가 limit > 100으로 호출               | 낮음 (완전 비공개 쇼핑몰) | 프론트엔드 호출부 확인 필요       |
| 관리자 주문 목록 기본값 20인데 상한 100으로 충분한지 | 낮음                      | 비즈니스상 100건 이내 충분        |
| `admin-product-query.dto.ts`가 이슈 범위 외          | 없음                      | 사용자 확인 완료, 포함하기로 결정 |

**프론트엔드 확인 필요 항목**:

- `apps/frontend/`에서 각 API 호출 시 limit 파라미터를 100 초과로 넘기는 케이스가 있는지 확인

---

## 5. 구현 순서

1. **DTO 수정** (4개 파일)
   - `product-query.dto.ts` → `@Max(100)` 추가, `Max` import 추가
   - `get-orders-query.dto.ts` → `@Max(100)` 추가, `Max` import 추가
   - `get-admin-orders-query.dto.ts` → `@Max(100)` 추가, `Max` import 추가
   - `admin-product-query.dto.ts` → `@Max(100)` 추가, `Max` import 추가

2. **테스트 추가** (3개 spec 파일)
   - `products.service.spec.ts`: limit=101 입력 시 거부 테스트 (DTO 유효성 검증)
   - `orders.service.spec.ts`: limit=101 입력 시 거부 테스트
   - `admin.service.spec.ts`: limit=101 입력 시 거부 테스트

3. **커밋 → 푸시 → PR** (`Closes #163` 포함)

---

## 6. 테스트 전략

### DTO 유효성 검증 테스트 패턴 (class-validator validate 활용)

```typescript
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

it('limit이 100을 초과하면 유효성 검사 실패', async () => {
  const dto = plainToInstance(ProductQueryDto, { limit: 101 });
  const errors = await validate(dto);
  expect(errors.length).toBeGreaterThan(0);
  expect(errors[0].constraints).toHaveProperty('max');
});

it('limit이 100이면 유효성 검사 통과', async () => {
  const dto = plainToInstance(ProductQueryDto, { limit: 100 });
  const errors = await validate(dto);
  expect(errors.length).toBe(0);
});
```

### 테스트 실행 명령

```bash
pnpm --filter @yueeroom/backend test -- --silent src/products/products.service.spec.ts
pnpm --filter @yueeroom/backend test -- --silent src/orders/orders.service.spec.ts
pnpm --filter @yueeroom/backend test -- --silent src/admin/admin.service.spec.ts
```

### 완료 조건 확인

- [ ] limit=101 요청 → 400 Bad Request
- [ ] limit=100 요청 → 정상 동작
- [ ] limit=1 요청 → 정상 동작 (기존 @Min 유지)
- [ ] limit 미전달 → 기본값(10 또는 20) 사용
