# Issue #163 준비 계획

## 사람이 읽는 요약

1. 네가 이해한 작업 목표

목록 API query DTO의 `limit` 값에 payments와 동일한 `@Max(100)` 상한을 일관 적용한다. `limit=101` 같은 과도한 요청은 전역 `ValidationPipe`에 의해 400 Bad Request로 거부되어야 한다.

현재 git 상태는 `feat/issue-163-pagination-limit-max` 브랜치이며, working tree는 clean 상태다.

2. 수정 대상 파일

- `apps/backend/src/products/dto/product-query.dto.ts`
- `apps/backend/src/orders/dto/get-orders-query.dto.ts`
- `apps/backend/src/admin/dto/get-admin-orders-query.dto.ts`
- `apps/backend/src/admin/dto/admin-product-query.dto.ts`
- `apps/backend/src/products/products.service.spec.ts`
- `apps/backend/src/orders/orders.service.spec.ts`
- `apps/backend/src/admin/admin.service.spec.ts`

참고만 할 파일:

- `apps/backend/src/payments/dto/get-payments-query.dto.ts`

3. 구현 순서

1. 4개 query DTO에 `Max` import를 추가한다.
1. 각 DTO의 `limit` 필드에 `@Max(100)`을 추가한다.
1. payments DTO의 기존 패턴과 데코레이터 구조를 맞춘다.
1. 관련 spec 파일 3개에 DTO 유효성 검증 테스트를 추가한다.
1. 프론트엔드에서 `limit > 100` 호출이 있는지 확인한다.
1. 지정된 백엔드 테스트만 실행한다.
1. 커밋, 푸시, PR 생성 시 PR 본문에 `Closes #163`을 포함한다.

1. 테스트 추가/수정 계획

- `ProductQueryDto`: `limit=101` 실패, `limit=100` 통과 검증
- `GetOrdersQueryDto`: `limit=101` 실패, `limit=100` 통과 검증
- `GetAdminOrdersQueryDto`: `limit=101` 실패, `limit=100` 통과 검증
- `AdminProductQueryDto`: `limit=101` 실패, `limit=100` 통과 검증
- 테스트는 `plainToInstance`와 `validate`를 사용한다.

5. 위험 요소

- 기존 클라이언트가 `limit > 100`을 보내고 있었다면 400 응답으로 바뀐다.
- 관리자 주문 목록 기본값은 20이고 상한 100이지만, 대량 조회 요구가 있다면 클라이언트 UX에 영향이 있을 수 있다.
- `admin-product-query.dto.ts`는 이슈 범위 확장으로 포함되어 있으므로 반드시 함께 처리한다.

6. 작업 시작 전에 확인이 필요한 점

- 현재 working tree가 clean인지 확인 완료.
- 프론트엔드 호출부에서 `limit > 100`을 넘기는 케이스가 있는지 구현 전 확인 필요.
- `apps/backend/src/payments/dto/get-payments-query.dto.ts`는 참고용이며 변경하지 않는다.

## machine_readable

```yaml
issue_number: 163
short_name: pagination-limit-max
issue_goal: '상품, 주문, 관리자 주문, 관리자 상품 목록 API query DTO의 limit 상한을 payments와 동일하게 100으로 제한하고, 초과 요청이 DTO validation에서 거부되도록 한다.'
core_principles:
  - 'payments DTO의 @Max(100) 패턴과 일관성을 맞춘다.'
  - '기존 @Min(1), 기본값, transform 동작은 유지한다.'
  - '과도한 limit 요청은 전역 ValidationPipe를 통해 400 Bad Request가 되도록 DTO validation으로 처리한다.'
  - 'issue-163-plan.md에 명시된 범위 밖 변경은 하지 않는다.'
target_files:
  new: []
  modify:
    - 'apps/backend/src/products/dto/product-query.dto.ts'
    - 'apps/backend/src/orders/dto/get-orders-query.dto.ts'
    - 'apps/backend/src/admin/dto/get-admin-orders-query.dto.ts'
    - 'apps/backend/src/admin/dto/admin-product-query.dto.ts'
    - 'apps/backend/src/products/products.service.spec.ts'
    - 'apps/backend/src/orders/orders.service.spec.ts'
    - 'apps/backend/src/admin/admin.service.spec.ts'
  delete: []
do_not_touch:
  - 'apps/backend/src/payments/dto/get-payments-query.dto.ts'
implementation_requirements:
  - 'product-query.dto.ts에 Max import를 추가하고 limit 필드에 @Max(100)을 추가한다.'
  - 'get-orders-query.dto.ts에 Max import를 추가하고 limit 필드에 @Max(100)을 추가한다.'
  - 'get-admin-orders-query.dto.ts에 Max import를 추가하고 limit 필드에 @Max(100)을 추가한다.'
  - 'admin-product-query.dto.ts에 Max import를 추가하고 limit 필드에 @Max(100)을 추가한다.'
  - '각 DTO의 기존 @Min(1), @IsInt, @IsOptional, @Type 데코레이터와 기본값은 유지한다.'
test_requirements:
  - 'products.service.spec.ts에 ProductQueryDto limit=101 실패 테스트를 추가한다.'
  - 'products.service.spec.ts에 ProductQueryDto limit=100 통과 테스트를 추가한다.'
  - 'orders.service.spec.ts에 GetOrdersQueryDto limit=101 실패 테스트를 추가한다.'
  - 'orders.service.spec.ts에 GetOrdersQueryDto limit=100 통과 테스트를 추가한다.'
  - 'admin.service.spec.ts에 GetAdminOrdersQueryDto limit=101 실패 테스트를 추가한다.'
  - 'admin.service.spec.ts에 GetAdminOrdersQueryDto limit=100 통과 테스트를 추가한다.'
  - 'admin.service.spec.ts에 AdminProductQueryDto limit=101 실패 테스트를 추가한다.'
  - 'admin.service.spec.ts에 AdminProductQueryDto limit=100 통과 테스트를 추가한다.'
  - 'DTO 테스트는 class-transformer plainToInstance와 class-validator validate를 사용한다.'
test_commands:
  - 'pnpm --filter @yueeroom/backend test -- --silent src/products/products.service.spec.ts'
  - 'pnpm --filter @yueeroom/backend test -- --silent src/orders/orders.service.spec.ts'
  - 'pnpm --filter @yueeroom/backend test -- --silent src/admin/admin.service.spec.ts'
risks:
  - '기존 클라이언트가 limit > 100으로 호출하면 400 응답으로 변경된다.'
  - '관리자 주문 목록 기본값 20과 상한 100은 충분하다고 판단되어 있으나 대량 조회 요구가 있으면 영향이 있을 수 있다.'
  - 'admin-product-query.dto.ts는 이슈 범위 확장으로 포함되어 있으므로 누락하면 일관성 목표가 깨진다.'
pre_start_checks:
  - '현재 브랜치: feat/issue-163-pagination-limit-max'
  - '현재 git status: clean'
  - 'apps/frontend에서 limit > 100 호출 여부를 확인한다.'
  - 'payments DTO는 참고용으로만 확인하고 수정하지 않는다.'
```
