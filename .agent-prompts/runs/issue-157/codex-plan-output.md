# Issue #157 준비 계획

## 사람이 읽는 요약

1. 네가 이해한 작업 목표

Issue #157의 목표는 백엔드 API 에러 응답을 표준화하고, 클라이언트 응답에서 내부 DB ID, variant/item/payment 상세값, 외부 결제 게이트웨이 원문 오류 메시지를 제거하는 것이다. 상세 정보는 클라이언트에 노출하지 않고 서버 로그에만 남긴다. 글로벌 `HttpExceptionFilter`를 추가해 응답 포맷을 `{ statusCode, message, timestamp }` 형태로 통일한다.

2. 수정 대상 파일

신규 생성:

- `apps/backend/src/common/filters/http-exception.filter.ts`
- `apps/backend/src/common/filters/http-exception.filter.spec.ts`

수정:

- `apps/backend/src/main.ts`
- `apps/backend/src/products/products.service.ts`
- `apps/backend/src/orders/orders.service.ts`
- `apps/backend/src/payments/naver-pay.service.ts`
- `apps/backend/src/products/products.service.spec.ts`
- `apps/backend/src/orders/orders.service.spec.ts`
- `apps/backend/src/payments/naver-pay.service.spec.ts`

3. 구현 순서

1. `HttpExceptionFilter`를 신규 생성한다.
1. `ValidationPipe`의 배열 메시지까지 처리하도록 필터 메시지 추출 로직을 만든다.
1. 필터 유닛 테스트를 추가한다.
1. `main.ts`에서 `useGlobalPipes` 바로 아래에 글로벌 필터를 등록한다.
1. `products.service.ts`의 상품/카테고리/브랜드 NotFound 메시지에서 내부 ID를 제거한다.
1. `orders.service.ts`의 상품 옵션, 재고, 주문 항목, 환불 수량, 결제 수단 메시지에서 내부 상세값을 제거한다.
1. `naver-pay.service.ts`에 `Logger`를 추가하고, `result.message`는 `logger.warn`으로만 남기며 throw 메시지는 안전한 문구로 교체한다.
1. 관련 서비스 테스트를 실행하고, 메시지 직접 검증이 있는 경우에만 spec을 최소 수정한다.

1. 테스트 추가/수정 계획

- `http-exception.filter.spec.ts` 신규 추가
  - 404 예외 응답 포맷 검증
  - `BadRequestException` 배열 메시지 처리 검증
  - 500 예외에서 `logger.error` 호출 검증
  - 400 예외에서 `logger.error` 미호출 검증
- 기존 서비스 spec은 대부분 예외 타입 검증이므로 변경 최소화
- 메시지 문자열을 직접 검증하는 케이스가 발견될 때만 해당 expectation 수정
- `naver-pay.service.spec.ts`는 Logger 호출 검증이 필요할 경우에만 `Logger.prototype.warn` spy 추가

5. 위험 요소

- 프론트엔드가 기존 에러 메시지 문자열을 직접 파싱하거나 표시하고 있다면 UI 문구가 달라질 수 있다.
- `BadRequestException`의 `message`가 `string[]`일 수 있으므로 필터에서 배열 처리를 누락하면 ValidationPipe 응답이 깨질 수 있다.
- `NaverPayService`의 외부 오류 원문 제거 후에도 서버 로그에는 디버깅 가능한 정보가 남아야 한다.
- 글로벌 필터 등록으로 기존 NestJS 기본 예외 응답 포맷에 의존하던 테스트나 클라이언트 코드가 영향을 받을 수 있다.

6. 작업 시작 전에 확인이 필요한 점

- `BadRequestException` 배열 메시지를 응답에서 배열 그대로 유지할지, 첫 번째 메시지만 반환할지 확정 필요.
- Issue 본문에는 trace id/request id 포함 검토가 있으나 계획서는 `timestamp`까지만 구현한다. 이번 작업 범위에서 request id/trace id는 구현하지 않는 것으로 진행해도 되는지 확인 필요.
- 프론트엔드에서 에러 메시지 문자열을 파싱하는 코드가 있는지 확인 필요.

## machine_readable

```yaml
issue_number: 157
short_name: api-error-message-standardization
issue_goal: '백엔드 API 에러 응답 포맷을 표준화하고, 클라이언트 응답에서 내부 ID 및 외부 결제 게이트웨이 원문 오류 메시지를 제거하며, 상세 정보는 서버 로그에만 남긴다.'
core_principles:
  - '클라이언트 응답에는 내부 식별자와 외부 시스템 원문 오류를 노출하지 않는다.'
  - '디버깅에 필요한 상세 정보는 서버 로그에 남긴다.'
  - '글로벌 HttpExceptionFilter로 응답 포맷을 통일한다.'
  - '계획서에 명시된 상품, 주문, 네이버페이 에러 메시지만 변경한다.'
  - '기존 테스트는 메시지 직접 검증이 있는 경우에만 최소 수정한다.'
target_files:
  new:
    - 'apps/backend/src/common/filters/http-exception.filter.ts'
    - 'apps/backend/src/common/filters/http-exception.filter.spec.ts'
  modify:
    - 'apps/backend/src/main.ts'
    - 'apps/backend/src/products/products.service.ts'
    - 'apps/backend/src/orders/orders.service.ts'
    - 'apps/backend/src/payments/naver-pay.service.ts'
    - 'apps/backend/src/products/products.service.spec.ts'
    - 'apps/backend/src/orders/orders.service.spec.ts'
    - 'apps/backend/src/payments/naver-pay.service.spec.ts'
  delete: []
do_not_touch:
  - 'apps/frontend'
  - 'packages/shared'
  - 'apps/backend/src/instrument.ts'
  - 'Prisma schema and migrations'
  - '계획서에 명시되지 않은 서비스, 컨트롤러, DTO'
  - '계획서에서 변경 대상으로 지정되지 않은 에러 메시지'
implementation_requirements:
  - 'HttpExceptionFilter는 @Catch(HttpException)를 사용한다.'
  - '응답 포맷은 statusCode, message, timestamp를 포함한다.'
  - '5xx 에러만 logger.error로 기록한다.'
  - '4xx 에러는 logger.error로 기록하지 않는다.'
  - 'exception.getResponse()가 string인 경우 그대로 message로 사용한다.'
  - 'exception.getResponse()가 object인 경우 message 필드를 사용한다.'
  - "message가 없으면 '요청을 처리할 수 없습니다.'를 기본값으로 사용한다."
  - 'ValidationPipe의 BadRequestException 배열 메시지를 처리한다.'
  - 'main.ts에서 useGlobalPipes 바로 아래에 app.useGlobalFilters(new HttpExceptionFilter())를 등록한다.'
  - 'products.service.ts의 상품, 카테고리, 브랜드 NotFound 메시지에서 내부 ID를 제거한다.'
  - 'orders.service.ts의 variantId, itemId, quantity, paymentMethod 상세값을 클라이언트 메시지에서 제거한다.'
  - 'naver-pay.service.ts에 private readonly logger = new Logger(NaverPayService.name)을 추가한다.'
  - 'naver-pay.service.ts에서 result.message는 logger.warn으로만 기록하고 throw 메시지에는 포함하지 않는다.'
test_requirements:
  - 'HttpExceptionFilter 유닛 테스트를 신규 작성한다.'
  - 'NotFoundException 404 응답이 statusCode, message, timestamp를 포함하는지 검증한다.'
  - 'BadRequestException 배열 메시지 처리 방식을 검증한다.'
  - 'InternalServerErrorException 500에서 logger.error 호출을 검증한다.'
  - 'BadRequestException 400에서 logger.error 미호출을 검증한다.'
  - 'products.service, orders.service, naver-pay.service 관련 기존 테스트를 실행한다.'
  - '메시지 문자열 직접 검증이 있는 기존 테스트만 최소 수정한다.'
test_commands:
  - 'pnpm --filter @yueeroom/backend test -- --silent products.service'
  - 'pnpm --filter @yueeroom/backend test -- --silent orders.service'
  - 'pnpm --filter @yueeroom/backend test -- --silent naver-pay.service'
  - 'pnpm --filter @yueeroom/backend test -- --silent http-exception.filter'
risks:
  - '프론트엔드가 기존 에러 메시지 문자열을 직접 파싱하거나 표시할 경우 UI 문구 변경 영향이 있을 수 있다.'
  - 'ValidationPipe의 string[] message 처리를 누락하면 400 응답 포맷이 의도와 달라질 수 있다.'
  - '네이버페이 외부 오류 원문을 제거하면서 서버 로그에 충분한 디버깅 정보가 남지 않을 수 있다.'
  - '글로벌 필터 등록으로 NestJS 기본 예외 응답 포맷에 의존하던 테스트나 클라이언트 코드가 영향을 받을 수 있다.'
pre_start_checks:
  - 'BadRequestException 배열 메시지를 배열 그대로 반환할지 첫 번째 요소만 반환할지 확정한다.'
  - 'Issue 본문의 trace id/request id 포함 검토 항목은 이번 계획 범위에서 구현하지 않는 것으로 진행해도 되는지 확인한다.'
  - '프론트엔드에서 에러 메시지 문자열을 파싱하는 코드가 있는지 확인한다.'
```
