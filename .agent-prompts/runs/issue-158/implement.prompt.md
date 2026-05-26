정리한 Issue #158 이해 내용을 기준으로 구현을 진행해.

목표:
PaymentEvent 테이블을 추가해 Stripe, Naver Pay, Kakao Pay webhook 외부 이벤트 ID를 저장하고 중복 이벤트 재처리를 방지하며, 중복 환불 요청 생성을 차단한다.

핵심 원칙:

- 외부 이벤트 ID는 PaymentEvent.externalEventId에 저장한다.
- externalEventId는 DB unique 제약으로 중복을 최종 방어한다.
- webhook 처리 전 PaymentEvent 존재 여부를 확인하고, 존재하면 상태 업데이트 없이 early return 한다.
- Payment/Order 상태 업데이트와 PaymentEvent 생성은 가능한 한 같은 $transaction 안에서 처리한다.
- requestRefund는 REQUESTED 또는 COMPLETED Refund가 이미 있으면 ConflictException을 던진다.

참고 문서:

- docs/plans/issue-158-plan.md

중요한 제약:

- 작업 시작 전 메인 브랜치의 최신화 여부를 확인하고, 작업 브랜치로 체크아웃한다.
- 브랜치 네이밍은 fix/issue-158-payment-event-idempotency 또는 feat/issue-158-payment-event-idempotency 형식을 사용한다.
- docs/plans/issue-158-plan.md는 참고만 하고, 코드 변경 대상에 포함하지 마.
- 계획서 범위를 벗어난 리팩토링이나 기능 추가는 하지 마.
- DB schema, migration, seed 파일은 수정하지 마.
- 새 API endpoint는 명시적으로 요구되지 않는 한 추가하지 마.
  - apps/frontend/\*\*
- packages/shared/\*\*
- issue-158-plan.md 범위 밖의 결제 기능
- 계획서에서 변경 대상으로 언급되지 않은 파일

수정 대상 파일:

- 신규: apps/backend/prisma/migrations/
- 수정: apps/backend/prisma/schema.prisma
- 수정: apps/backend/src/payments/payments.service.ts
- 수정: apps/backend/src/payments/naver-pay.service.ts
- 수정: apps/backend/src/payments/kakao-pay.service.ts
- 수정: apps/backend/src/payments/payments.controller.ts
- 수정: apps/backend/src/payments/payments.service.spec.ts
- 수정: apps/backend/src/payments/naver-pay.service.spec.ts
- 수정: apps/backend/src/payments/kakao-pay.service.spec.ts

구현 요구사항:

- schema.prisma에 PaymentEvent 모델을 추가한다.
- PaymentEvent 필드는 id, externalEventId, gateway, eventType, paymentId, processedAt, payment 관계를 포함한다.
- Payment 모델에 events PaymentEvent[] 관계를 추가한다.
- 마이그레이션 이름은 add-payment-event로 생성한다.
- Stripe handleWebhookEvent는 event.id로 PaymentEvent를 조회하고 중복이면 { received: true }를 반환한다.
- Stripe 최초 처리 시 Payment COMPLETED, Order PAID, PaymentEvent 생성을 $transaction으로 처리한다.
- Stripe PaymentEvent gateway는 stripe, eventType은 event.type을 사용한다.
- requestRefund는 paymentId 기준 REQUESTED 또는 COMPLETED Refund가 있으면 ConflictException('이미 처리 중인 환불 요청이 있습니다')을 던진다.
- Naver Pay handleWebhook은 body.paymentId로 PaymentEvent를 조회하고 중복이면 처리 스킵한다.
- Naver Pay 최초 처리 시 PaymentEvent externalEventId는 body.paymentId, gateway는 naverpay, eventType은 body.paymentStatus로 저장한다.
- Kakao Pay service에 handleWebhook(body: KakaoPayWebhookPayload)을 추가한다.
- Kakao Pay externalEventId는 body.tid를 사용한다.
- Kakao Pay SUCCESS_PAYMENT는 Payment COMPLETED, Order PAID, PaymentEvent 생성을 처리한다.
- Kakao Pay CANCEL_PAYMENT는 Payment FAILED 업데이트와 PaymentEvent 생성을 처리한다.
- payments.controller.ts에 POST /payments/kakao/webhook 엔드포인트를 추가하고 Public으로 노출한다.
- 동시 중복 webhook으로 PaymentEvent unique 충돌이 발생하면 early return 처리한다.

테스트 요구사항:

- payments.service.spec.ts에 Stripe 동일 event.id 두 번째 호출이 DB update 없이 { received: true }를 반환하는 테스트를 추가한다.
- payments.service.spec.ts에 Stripe 최초 webhook 처리 시 $transaction으로 Payment, Order, PaymentEvent가 처리되는 테스트를 추가한다.
- payments.service.spec.ts에 requestRefund가 REQUESTED Refund 존재 시 ConflictException을 던지는 테스트를 추가한다.
- payments.service.spec.ts에 requestRefund가 COMPLETED Refund 존재 시 ConflictException을 던지는 테스트를 추가한다.
- naver-pay.service.spec.ts에 동일 paymentId 두 번째 webhook 호출이 early return 되는 테스트를 추가한다.
- naver-pay.service.spec.ts에 Naver SUCCESS 최초 처리 시 PaymentEvent 생성 테스트를 추가한다.
- kakao-pay.service.spec.ts에 SUCCESS_PAYMENT 성공 처리와 PaymentEvent 생성 테스트를 추가한다.
- kakao-pay.service.spec.ts에 동일 tid 두 번째 호출이 early return 되는 테스트를 추가한다.
- kakao-pay.service.spec.ts에 CANCEL_PAYMENT가 Payment FAILED로 업데이트되는 테스트를 추가한다.

작업 방식:

1. 먼저 실제 현재 코드 상태와 git diff를 확인한다.
2. 위 범위 안에서만 코드를 수정한다.
3. 변경이 커질 경우 백엔드 → 프론트엔드 → 테스트 순서로 나눠 진행한다.
4. 수정 후 관련 테스트를 실행한다.
5. 실패 테스트가 있으면 원인을 설명하고, Issue #158 범위 안에서만 수정한다.

우선 실행 권장 테스트:

```bash
pnpm --filter @yueeroom/backend test -- --silent payments.service
```

```bash
pnpm --filter @yueeroom/backend test -- --silent naver-pay.service
```

```bash
pnpm --filter @yueeroom/backend test -- --silent kakao-pay.service
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
- 계획서에 있는 Issue #158 범위만 구현해.
- 보안/인증 이슈라면 기존보다 취약한 흐름을 다시 만들지 마.
