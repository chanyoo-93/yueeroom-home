정리한 Issue #163 이해 내용을 기준으로 구현을 진행해.

목표:
상품, 주문, 관리자 주문, 관리자 상품 목록 API query DTO의 limit 상한을 payments와 동일하게 100으로 제한하고, 초과 요청이 DTO validation에서 거부되도록 한다.

핵심 원칙:

- payments DTO의 @Max(100) 패턴과 일관성을 맞춘다.
- 기존 @Min(1), 기본값, transform 동작은 유지한다.
- 과도한 limit 요청은 전역 ValidationPipe를 통해 400 Bad Request가 되도록 DTO validation으로 처리한다.
- issue-163-plan.md에 명시된 범위 밖 변경은 하지 않는다.

참고 문서:

- docs/plans/issue-163-plan.md

중요한 제약:

- 작업 시작 전 메인 브랜치의 최신화 여부를 확인하고, 작업 브랜치로 체크아웃한다.
- 브랜치 네이밍은 fix/issue-163-pagination-limit-max 또는 feat/issue-163-pagination-limit-max 형식을 사용한다.
- docs/plans/issue-163-plan.md는 참고만 하고, 코드 변경 대상에 포함하지 마.
- 계획서 범위를 벗어난 리팩토링이나 기능 추가는 하지 마.
- DB schema, migration, seed 파일은 수정하지 마.
- 새 API endpoint는 명시적으로 요구되지 않는 한 추가하지 마.
  - apps/backend/src/payments/dto/get-payments-query.dto.ts

수정 대상 파일:

- 수정: apps/backend/src/products/dto/product-query.dto.ts
- 수정: apps/backend/src/orders/dto/get-orders-query.dto.ts
- 수정: apps/backend/src/admin/dto/get-admin-orders-query.dto.ts
- 수정: apps/backend/src/admin/dto/admin-product-query.dto.ts
- 수정: apps/backend/src/products/products.service.spec.ts
- 수정: apps/backend/src/orders/orders.service.spec.ts
- 수정: apps/backend/src/admin/admin.service.spec.ts

구현 요구사항:

- product-query.dto.ts에 Max import를 추가하고 limit 필드에 @Max(100)을 추가한다.
- get-orders-query.dto.ts에 Max import를 추가하고 limit 필드에 @Max(100)을 추가한다.
- get-admin-orders-query.dto.ts에 Max import를 추가하고 limit 필드에 @Max(100)을 추가한다.
- admin-product-query.dto.ts에 Max import를 추가하고 limit 필드에 @Max(100)을 추가한다.
- 각 DTO의 기존 @Min(1), @IsInt, @IsOptional, @Type 데코레이터와 기본값은 유지한다.

테스트 요구사항:

- products.service.spec.ts에 ProductQueryDto limit=101 실패 테스트를 추가한다.
- products.service.spec.ts에 ProductQueryDto limit=100 통과 테스트를 추가한다.
- orders.service.spec.ts에 GetOrdersQueryDto limit=101 실패 테스트를 추가한다.
- orders.service.spec.ts에 GetOrdersQueryDto limit=100 통과 테스트를 추가한다.
- admin.service.spec.ts에 GetAdminOrdersQueryDto limit=101 실패 테스트를 추가한다.
- admin.service.spec.ts에 GetAdminOrdersQueryDto limit=100 통과 테스트를 추가한다.
- admin.service.spec.ts에 AdminProductQueryDto limit=101 실패 테스트를 추가한다.
- admin.service.spec.ts에 AdminProductQueryDto limit=100 통과 테스트를 추가한다.
- DTO 테스트는 class-transformer plainToInstance와 class-validator validate를 사용한다.

작업 방식:

1. 먼저 실제 현재 코드 상태와 git diff를 확인한다.
2. 위 범위 안에서만 코드를 수정한다.
3. 변경이 커질 경우 백엔드 → 프론트엔드 → 테스트 순서로 나눠 진행한다.
4. 수정 후 관련 테스트를 실행한다.
5. 실패 테스트가 있으면 원인을 설명하고, Issue #163 범위 안에서만 수정한다.

우선 실행 권장 테스트:

```bash
pnpm --filter @yueeroom/backend test -- --silent src/products/products.service.spec.ts
```

```bash
pnpm --filter @yueeroom/backend test -- --silent src/orders/orders.service.spec.ts
```

```bash
pnpm --filter @yueeroom/backend test -- --silent src/admin/admin.service.spec.ts
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
- 계획서에 있는 Issue #163 범위만 구현해.
- 보안/인증 이슈라면 기존보다 취약한 흐름을 다시 만들지 마.
