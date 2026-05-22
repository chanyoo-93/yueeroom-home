# Issue #156 구현 계획: 공개 상품 API와 관리자 상품 API 분리

## Context

현재 `GET /api/products`는 `isActive` 쿼리 파라미터를 받아 비활성 상품도 조회할 수 있다. 프론트엔드 공개 페이지는 `isActive: true`를 명시적으로 전달하고, 관리자 페이지는 파라미터 없이 전체 목록을 요청한다. 즉, **비활성 상품 조회는 클라이언트 파라미터에만 의존**하고 있어 API 의도가 혼재되어 있다. 이 이슈는 공개 API는 항상 활성 상품만 반환하도록 강제하고, 비활성 상품 조회를 관리자 전용 엔드포인트로 분리한다.

---

## 1. 관련 파일 목록

### 백엔드

| 파일                                                    | 변경 여부                         |
| ------------------------------------------------------- | --------------------------------- |
| `apps/backend/src/products/products.controller.ts`      | 수정                              |
| `apps/backend/src/products/products.service.ts`         | 수정                              |
| `apps/backend/src/products/dto/product-query.dto.ts`    | 수정 (isActive 제거)              |
| `apps/backend/src/products/dto/search-product.dto.ts`   | 수정 (isActive 제거)              |
| `apps/backend/src/admin/admin.controller.ts`            | 수정 (GET /admin/products 추가)   |
| `apps/backend/src/admin/admin.module.ts`                | 수정 (ProductsModule import 추가) |
| `apps/backend/src/admin/dto/admin-product-query.dto.ts` | **신규**                          |

### 프론트엔드

| 파일                                          | 변경 여부             |
| --------------------------------------------- | --------------------- |
| `apps/frontend/src/lib/api/admin-products.ts` | 수정 (호출 경로 변경) |

### 테스트

| 파일                                                 | 변경 여부                           |
| ---------------------------------------------------- | ----------------------------------- |
| `apps/backend/src/products/products.service.spec.ts` | 수정 (findAll isActive 케이스 정리) |

---

## 2. 현재 구조 요약

```
공개 사용자:
  GET /api/products?isActive=true  (클라이언트가 직접 파라미터 전달)
  └─ ProductsController.findAll()
     └─ ProductsService.findAll({ isActive: true, ... })

관리자:
  GET /api/products  (isActive 파라미터 없음 → 전체 반환)
  └─ ProductsController.findAll()  ← 동일 엔드포인트!
     └─ ProductsService.findAll({ isActive: undefined, ... })
```

**문제**: 누구나 `?isActive=false`를 붙이면 비활성 상품 조회 가능.

---

## 3. 변경해야 할 지점

### 3-1. `ProductQueryDto` — `isActive` 필드 제거

공개 API에서는 클라이언트가 `isActive`를 지정하는 것 자체를 금지한다.

```typescript
// 제거 대상
@IsBoolean()
@IsOptional()
@Transform(...)
isActive?: boolean;
```

### 3-2. `ProductsService.findAll()` — `forceActive` 파라미터 추가

`where` 절 분기를 `forceActive` 파라미터로 제어한다.

```typescript
// 변경 전
...(query.isActive !== undefined && { isActive: query.isActive }),

// 변경 후 (forceActive 기본값 true)
isActive: forceActive ? true : query.isActive,
```

공개 컨트롤러: `findAll(query)` → `forceActive = true` 기본값 적용
관리자 컨트롤러: `findAll(query, false)` → 관리자 DTO의 `isActive?` 사용

### 3-3. `SearchProductDto` — `isActive` 필드 제거

공개 검색도 항상 활성 상품만 반환한다.

### 3-4. `ProductsController.search()` — `isActive: true` 고정

서비스 `search()` 메서드 시그니처(`isActive?: boolean`)는 유지하고,
공개 컨트롤러에서 항상 `true`를 전달한다.

```typescript
@Get('search')
search(@Query() dto: SearchProductDto) {
  return this.productsService.search(dto.q, true);
}
```

### 3-5. 신규: `AdminProductQueryDto`

관리자 상품 목록 조회 DTO. `isActive?`, `page`, `limit` 포함.

```typescript
// apps/backend/src/admin/dto/admin-product-query.dto.ts
export class AdminProductQueryDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
```

### 3-6. `AdminController` — `GET /admin/products` 추가

기존 `@UseGuards(AdminGuard)`가 클래스 레벨에 적용되어 있으므로 별도 가드 불필요.

```typescript
@Get('products')
getProducts(@Query() query: AdminProductQueryDto) {
  return this.productsService.findAll(query, false);
}
```

### 3-7. `ProductsService.findAll()` 시그니처 조정

관리자 호출 시 `isActive?` 지원을 위해 타입 확장:

```typescript
interface FindAllQuery extends Omit<ProductQueryDto, 'isActive'> {
  isActive?: boolean;
}

async findAll(query: FindAllQuery, forceActive = true) {
  const where: Prisma.ProductWhereInput = {
    isActive: forceActive ? true : query.isActive,
    ...
  };
}
```

### 3-8. `AdminModule` — `ProductsModule` import

`ProductsService`를 AdminModule에서 사용하려면 imports에 `ProductsModule` 추가 필요.
`ProductsModule`은 이미 `exports: [ProductsService]`를 선언하고 있음.

```typescript
@Module({
  imports: [EmailModule, ProductsModule],
  ...
})
```

### 3-9. 프론트엔드 `adminGetProducts()` 경로 변경

```typescript
// 변경 전
apiClient.get<AdminProductListResponse>('/products', { params: { page, limit: 20 } });

// 변경 후
apiClient.get<AdminProductListResponse>('/admin/products', { params: { page, limit: 20 } });
```

### 3-10. 공개 프론트 `products.ts` — `isActive` 파라미터 제거

서버가 강제하므로 불필요. `forbidNonWhitelisted: true` 설정 확인됨 — 제거하지 않으면 400 에러 발생.

```typescript
// 변경 전
params: { limit: 20, isActive: true, ...params }

// 변경 후
params: { limit: 20, ...params }
```

---

## 4. 잠재적 위험

| 위험                                                           | 대응                                                                                                                                                                       |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductsService.findAll()` 시그니처 변경으로 다른 호출부 영향 | `grep -r "findAll"` 로 모든 호출 확인 필요                                                                                                                                 |
| AdminModule에 ProductsModule 추가 시 순환 의존성               | ProductsModule은 admin을 참조하지 않으므로 안전                                                                                                                            |
| 기존 프론트 공개 API의 `isActive: true` 파라미터 전송          | **`forbidNonWhitelisted: true` 확인됨** — `ProductQueryDto`에서 `isActive` 제거 시 400 에러 발생. 공개 프론트 `products.ts`에서 `isActive: true` 파라미터 반드시 제거 필요 |
| 관리자 화면의 페이지네이션/총 개수 로직 차이                   | 현재 offset 기반 페이지네이션 동일하게 유지                                                                                                                                |

---

## 5. 구현 순서

1. **`AdminProductQueryDto` 신규 작성** (`apps/backend/src/admin/dto/`)
2. **`ProductsService.findAll()` 수정** — `FindAllQuery` 인터페이스 + `forceActive` 파라미터 추가
3. **`ProductQueryDto` isActive 제거** + **`SearchProductDto` isActive 제거**
4. **`ProductsController` 수정** — search에 `true` 고정
5. **`AdminController` 수정** — `GET /admin/products` 추가 + `ProductsService` 주입
6. **`AdminModule` 수정** — `ProductsModule` import 추가
7. **프론트엔드 `adminGetProducts()`** 경로 변경
8. **공개 프론트 `products.ts`** — `isActive: true` 파라미터 제거
9. **테스트 업데이트 및 신규 테스트 작성**

---

## 6. 테스트 전략

### 백엔드 (Jest)

- `products.service.spec.ts`: `findAll()` 호출 시 `isActive: true`가 where 절에 항상 포함되는지 확인
- `products.service.spec.ts`: `findAll(query, false)`로 호출 시 `isActive: false` 필터가 동작하는지 확인
- 신규: `AdminController`의 `GET /admin/products` 엔드포인트 단위 테스트 (AdminGuard 통과, isActive 필터 동작)
- 실행: `pnpm --filter @yueeroom/backend test -- --silent products.service`

### 프론트엔드 (Vitest)

- `admin-products.ts` 관련 테스트 존재 시 경로 변경 반영
- 실행: `cd apps/frontend && npx vitest run --reporter=dot`

### E2E 수동 검증

1. 비로그인 또는 일반 사용자로 `GET /api/products?isActive=false` 요청 → 비활성 상품 미반환 확인
2. 관리자로 `GET /api/admin/products` 요청 → 전체 상품(비활성 포함) 반환 확인
3. 관리자 화면에서 상품 목록 정상 로드 확인
4. 공개 상품 목록 화면에서 활성 상품만 표시 확인
