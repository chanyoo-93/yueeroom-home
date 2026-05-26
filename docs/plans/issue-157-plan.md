# 이슈 #157 — API 에러 메시지 표준화 구현 계획

## Context

현재 일부 서비스 메서드가 내부 DB ID(`${id}`, `${variantId}`, `${itemId}`) 또는 외부 결제 게이트웨이 오류 메시지(`${result.message}`)를 클라이언트 응답에 그대로 노출한다. 이는 정보 노출 위험과 사용자 경험 저하를 야기한다. 이 이슈에서는 클라이언트 응답 메시지를 안전하게 정제하고, 서버 로그에만 상세 정보를 남기며, 글로벌 `HttpExceptionFilter`로 응답 포맷을 통일한다.

---

## 1. 관련 파일 목록

### 신규 생성

- `apps/backend/src/common/filters/http-exception.filter.ts`
- `apps/backend/src/common/filters/http-exception.filter.spec.ts`

### 수정 대상

| 파일                                                  | 변경 내용                                |
| ----------------------------------------------------- | ---------------------------------------- |
| `apps/backend/src/main.ts`                            | 글로벌 필터 등록                         |
| `apps/backend/src/products/products.service.ts`       | 내부 ID 제거 (6곳)                       |
| `apps/backend/src/orders/orders.service.ts`           | 내부 ID/상세 제거 (5곳)                  |
| `apps/backend/src/payments/naver-pay.service.ts`      | Logger 추가, 외부 오류 메시지 제거 (3곳) |
| `apps/backend/src/products/products.service.spec.ts`  | 메시지 문자열 변경 반영 (해당 케이스만)  |
| `apps/backend/src/orders/orders.service.spec.ts`      | 메시지 문자열 변경 반영 (해당 케이스만)  |
| `apps/backend/src/payments/naver-pay.service.spec.ts` | Logger mock 추가 (필요 시)               |

> 현재 spec 파일은 대부분 `.rejects.toThrow(SomeException)` 패턴 사용 → 메시지 문자열 직접 검증 없음 → spec 변경 최소화

---

## 2. 현재 구조 요약

### 에러 처리 현황

- **글로벌 필터 없음**: NestJS 기본 예외 응답 포맷 사용 (`{ statusCode, message, error }`)
- **Logger 미사용**: 서비스 계층에서 `console.log` 또는 아무 로그도 없음
- **Sentry 통합**: `apps/backend/src/instrument.ts`에서 전역으로 초기화됨 → 처리되지 않은 예외는 자동으로 캡처됨
- **내부 ID 노출**: 상품, 주문, 결제 변형 ID가 에러 메시지에 포함됨

### 내부 ID/상세 노출 지점

**products.service.ts**

- L127: `상품을 찾을 수 없습니다: ${id}` (findOne)
- L133: `카테고리를 찾을 수 없습니다: ${dto.categoryId}` (create)
- L137: `브랜드를 찾을 수 없습니다: ${dto.brandId}` (create)
- L203: `카테고리를 찾을 수 없습니다: ${dto.categoryId}` (update)
- L207: `브랜드를 찾을 수 없습니다: ${dto.brandId}` (update)
- L285: `상품을 찾을 수 없습니다: ${id}` (findOneOrFail)

**orders.service.ts**

- L56: `상품 변형을 찾을 수 없습니다: ${variantId}`
- L70: `재고가 부족합니다. 상품: ${variantId}, 요청: ${quantity}`
- L244: `주문 항목을 찾을 수 없습니다: ${refundItem.itemId}`
- L248–250: `이미 환불된 수량을 포함하여 환불 가능 수량을 초과합니다: ${refundItem.itemId}`
- L315: `지원하지 않는 결제 수단입니다: ${payment.paymentMethod}`

**naver-pay.service.ts** (외부 결제 오류 메시지)

- L104: `네이버페이 오류: ${result.message}`
- L174: `네이버페이 결제 승인 실패: ${result.message}`
- L225: `네이버페이 환불 실패: ${result.message}`

---

## 3. 변경 지점 상세

### (1) HttpExceptionFilter 신규 생성

`apps/backend/src/common/filters/http-exception.filter.ts`

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as Record<string, unknown>).message ?? '요청을 처리할 수 없습니다.');

    // 5xx 에러만 서버 로그에 기록 (4xx는 클라이언트 문제)
    if (status >= 500) {
      this.logger.error(`[${request.method}] ${request.url} ${status}`, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### (2) main.ts — 글로벌 필터 등록

```typescript
app.useGlobalFilters(new HttpExceptionFilter());
```

> `useGlobalPipes` 바로 아래에 추가

### (3) products.service.ts — 내부 ID 제거

| Before                                           | After                          |
| ------------------------------------------------ | ------------------------------ |
| `상품을 찾을 수 없습니다: ${id}`                 | `상품을 찾을 수 없습니다.`     |
| `카테고리를 찾을 수 없습니다: ${dto.categoryId}` | `카테고리를 찾을 수 없습니다.` |
| `브랜드를 찾을 수 없습니다: ${dto.brandId}`      | `브랜드를 찾을 수 없습니다.`   |

### (4) orders.service.ts — 내부 ID/상세 제거

| Before                                                                          | After                            |
| ------------------------------------------------------------------------------- | -------------------------------- |
| `상품 변형을 찾을 수 없습니다: ${variantId}`                                    | `상품 옵션을 찾을 수 없습니다.`  |
| `재고가 부족합니다. 상품: ${variantId}, 요청: ${quantity}`                      | `일부 상품의 재고가 부족합니다.` |
| `주문 항목을 찾을 수 없습니다: ${refundItem.itemId}`                            | `주문 항목을 찾을 수 없습니다.`  |
| `이미 환불된 수량을 포함하여 환불 가능 수량을 초과합니다: ${refundItem.itemId}` | `환불 가능 수량을 초과합니다.`   |
| `지원하지 않는 결제 수단입니다: ${payment.paymentMethod}`                       | `지원하지 않는 결제 수단입니다.` |

### (5) naver-pay.service.ts — Logger 추가 + 외부 오류 메시지 분리

- 클래스에 `private readonly logger = new Logger(NaverPayService.name);` 추가
- 세 곳에서 `result.message`를 `this.logger.warn(...)` 로 서버 로그에 기록 후 안전한 메시지를 throw

| Before                                         | After (throw)               | 서버 로그               |
| ---------------------------------------------- | --------------------------- | ----------------------- |
| `네이버페이 오류: ${result.message}`           | `결제 준비에 실패했습니다.` | `this.logger.warn(...)` |
| `네이버페이 결제 승인 실패: ${result.message}` | `결제 승인에 실패했습니다.` | `this.logger.warn(...)` |
| `네이버페이 환불 실패: ${result.message}`      | `환불 처리에 실패했습니다.` | `this.logger.warn(...)` |

---

## 4. 잠재적 위험

1. **프론트엔드 메시지 파싱**: `재고가 부족합니다.` 등의 메시지를 프론트엔드가 직접 파싱하거나 표시하는 경우 UI 텍스트가 변경될 수 있음 → 확인 필요
2. **naver-pay spec Logger mock**: `new Logger()` 방식이므로 생성자 주입 없음 → mock 불필요. 단, Logger 메서드가 실제로 호출되는지 검증하려면 `jest.spyOn(Logger.prototype, 'warn')` 사용 필요
3. **글로벌 필터와 ValidationPipe 충돌 없음**: `ValidationPipe`의 `BadRequestException`은 `message`가 배열 형태(`string[]`)일 수 있음 → 필터에서 `Array.isArray(message)` 처리 필요

---

## 5. 구현 순서

1. `HttpExceptionFilter` 신규 생성 (`apps/backend/src/common/filters/http-exception.filter.ts`)
   - ValidationPipe 배열 메시지 처리 포함
2. `HttpExceptionFilter` 테스트 작성 (`http-exception.filter.spec.ts`)
3. `main.ts`에 글로벌 필터 등록
4. `products.service.ts` — 내부 ID 제거 (6곳)
5. `orders.service.ts` — 내부 ID/상세 제거 (5곳)
6. `naver-pay.service.ts` — Logger 추가, 외부 오류 메시지 분리 (3곳)
7. 기존 spec 파일 실행하여 회귀 없는지 확인 (메시지 직접 검증 없으므로 대부분 pass 예상)

---

## 6. 테스트 전략

### HttpExceptionFilter 유닛 테스트 (`http-exception.filter.spec.ts`)

- `NotFoundException(404)` → `{ statusCode: 404, message: '...', timestamp: ... }` 형태 반환 검증
- `BadRequestException` + 배열 메시지 → 배열 그대로 또는 첫 번째 요소 반환 검증
- `InternalServerErrorException(500)` → logger.error 호출 검증 (`jest.spyOn`)
- `BadRequestException(400)` → logger.error 미호출 검증

### 기존 서비스 테스트 재실행

```bash
pnpm --filter @yueeroom/backend test -- --silent products.service
pnpm --filter @yueeroom/backend test -- --silent orders.service
pnpm --filter @yueeroom/backend test -- --silent naver-pay.service
```

> 메시지 문자열 직접 검증 없으므로 예외 타입 기반 테스트는 변경 없이 통과 예상
