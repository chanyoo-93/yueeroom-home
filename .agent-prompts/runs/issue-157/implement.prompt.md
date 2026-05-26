정리한 Issue #157 이해 내용을 기준으로 구현을 진행해.

목표:
백엔드 API 에러 응답 포맷을 표준화하고, 클라이언트 응답에서 내부 ID 및 외부 결제 게이트웨이 원문 오류 메시지를 제거하며, 상세 정보는 서버 로그에만 남긴다.

핵심 원칙:

- 클라이언트 응답에는 내부 식별자와 외부 시스템 원문 오류를 노출하지 않는다.
- 디버깅에 필요한 상세 정보는 서버 로그에 남긴다.
- 글로벌 HttpExceptionFilter로 응답 포맷을 통일한다.
- 계획서에 명시된 상품, 주문, 네이버페이 에러 메시지만 변경한다.
- 기존 테스트는 메시지 직접 검증이 있는 경우에만 최소 수정한다.

참고 문서:

- docs/plans/issue-157-plan.md

중요한 제약:

- 작업 시작 전 메인 브랜치의 최신화 여부를 확인하고, 작업 브랜치로 체크아웃한다.
- 브랜치 네이밍은 fix/issue-157-api-error-message-standardization 또는 feat/issue-157-api-error-message-standardization 형식을 사용한다.
- docs/plans/issue-157-plan.md는 참고만 하고, 코드 변경 대상에 포함하지 마.
- 계획서 범위를 벗어난 리팩토링이나 기능 추가는 하지 마.
- DB schema, migration, seed 파일은 수정하지 마.
- 새 API endpoint는 명시적으로 요구되지 않는 한 추가하지 마.
- apps/frontend
- packages/shared
- apps/backend/src/instrument.ts
- Prisma schema and migrations
- 계획서에 명시되지 않은 서비스, 컨트롤러, DTO
- 계획서에서 변경 대상으로 지정되지 않은 에러 메시지

수정 대상 파일:

- 신규: apps/backend/src/common/filters/http-exception.filter.ts
- 신규: apps/backend/src/common/filters/http-exception.filter.spec.ts
- 수정: apps/backend/src/main.ts
- 수정: apps/backend/src/products/products.service.ts
- 수정: apps/backend/src/orders/orders.service.ts
- 수정: apps/backend/src/payments/naver-pay.service.ts
- 수정: apps/backend/src/products/products.service.spec.ts
- 수정: apps/backend/src/orders/orders.service.spec.ts
- 수정: apps/backend/src/payments/naver-pay.service.spec.ts

구현 요구사항:

- HttpExceptionFilter는 @Catch(HttpException)를 사용한다.
- 응답 포맷은 statusCode, message, timestamp를 포함한다.
- 5xx 에러만 logger.error로 기록한다.
- 4xx 에러는 logger.error로 기록하지 않는다.
- exception.getResponse()가 string인 경우 그대로 message로 사용한다.
- exception.getResponse()가 object인 경우 message 필드를 사용한다.
- message가 없으면 '요청을 처리할 수 없습니다.'를 기본값으로 사용한다.
- ValidationPipe의 BadRequestException 배열 메시지를 처리한다.
- main.ts에서 useGlobalPipes 바로 아래에 app.useGlobalFilters(new HttpExceptionFilter())를 등록한다.
- products.service.ts의 상품, 카테고리, 브랜드 NotFound 메시지에서 내부 ID를 제거한다.
- orders.service.ts의 variantId, itemId, quantity, paymentMethod 상세값을 클라이언트 메시지에서 제거한다.
- naver-pay.service.ts에 private readonly logger = new Logger(NaverPayService.name)을 추가한다.
- naver-pay.service.ts에서 result.message는 logger.warn으로만 기록하고 throw 메시지에는 포함하지 않는다.

테스트 요구사항:

- HttpExceptionFilter 유닛 테스트를 신규 작성한다.
- NotFoundException 404 응답이 statusCode, message, timestamp를 포함하는지 검증한다.
- BadRequestException 배열 메시지 처리 방식을 검증한다.
- InternalServerErrorException 500에서 logger.error 호출을 검증한다.
- BadRequestException 400에서 logger.error 미호출을 검증한다.
- products.service, orders.service, naver-pay.service 관련 기존 테스트를 실행한다.
- 메시지 문자열 직접 검증이 있는 기존 테스트만 최소 수정한다.

작업 방식:

1. 먼저 실제 현재 코드 상태와 git diff를 확인한다.
2. 위 범위 안에서만 코드를 수정한다.
3. 변경이 커질 경우 백엔드 → 프론트엔드 → 테스트 순서로 나눠 진행한다.
4. 수정 후 관련 테스트를 실행한다.
5. 실패 테스트가 있으면 원인을 설명하고, Issue #157 범위 안에서만 수정한다.

우선 실행 권장 테스트:

```bash
pnpm --filter @yueeroom/backend test -- --silent products.service
```

```bash
pnpm --filter @yueeroom/backend test -- --silent orders.service
```

```bash
pnpm --filter @yueeroom/backend test -- --silent naver-pay.service
```

```bash
pnpm --filter @yueeroom/backend test -- --silent http-exception.filter
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
- 계획서에 있는 Issue #157 범위만 구현해.
- 보안/인증 이슈라면 기존보다 취약한 흐름을 다시 만들지 마.
