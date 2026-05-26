# Issue #158 준비 계획

## 사람이 읽는 요약

1. 네가 이해한 작업 목표

결제 webhook과 환불 요청에 멱등성 보장을 추가한다.  
Stripe, Naver Pay, Kakao Pay 외부 이벤트 ID를 신규 `PaymentEvent` 테이블에 저장하고, 동일 이벤트가 재전송되면 Payment/Order 상태 업데이트를 다시 수행하지 않도록 한다.  
또한 동일 Payment에 이미 `REQUESTED` 또는 `COMPLETED` 환불이 있으면 새 Refund를 생성하지 않도록 막는다.

2. 수정 대상 파일

- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/`
- `apps/backend/src/payments/payments.service.ts`
- `apps/backend/src/payments/naver-pay.service.ts`
- `apps/backend/src/payments/kakao-pay.service.ts`
- `apps/backend/src/payments/payments.controller.ts`
- `apps/backend/src/payments/payments.service.spec.ts`
- `apps/backend/src/payments/naver-pay.service.spec.ts`
- `apps/backend/src/payments/kakao-pay.service.spec.ts`

3. 구현 순서

1. `schema.prisma`에 `PaymentEvent` 모델과 `Payment.events` 관계를 추가한다.
1. `add-payment-event` 마이그레이션을 생성한다.
1. Stripe webhook 처리에서 `event.id` 중복 여부를 먼저 확인하고, 최초 이벤트만 `$transaction`으로 Payment/Order/PaymentEvent를 함께 처리한다.
1. `requestRefund()`에서 동일 Payment의 `REQUESTED` 또는 `COMPLETED` Refund 존재 여부를 확인해 중복 환불 요청을 차단한다.
1. Naver Pay webhook 처리에서 `body.paymentId` 기준으로 PaymentEvent 중복 여부를 확인하고 최초 이벤트만 처리한다.
1. Kakao Pay `handleWebhook()`을 추가하고 `tid` 기준 멱등성, 성공/취소 상태 처리를 구현한다.
1. Controller에 `POST /payments/kakao/webhook` 공개 엔드포인트를 추가한다.
1. 관련 단위 테스트를 추가/수정한다.

1. 테스트 추가/수정 계획

- `payments.service.spec.ts`
  - Stripe 동일 `event.id` 재호출 시 두 번째 호출은 DB update 없이 `{ received: true }` 반환
  - 최초 Stripe webhook 처리 시 Payment, Order, PaymentEvent가 `$transaction`으로 처리되는지 확인
  - `requestRefund()`에서 `REQUESTED` Refund 존재 시 `ConflictException`
  - `requestRefund()`에서 `COMPLETED` Refund 존재 시 `ConflictException`

- `naver-pay.service.spec.ts`
  - 동일 `paymentId` webhook 재호출 시 두 번째 호출 early return
  - 최초 `SUCCESS` webhook 처리 시 PaymentEvent 생성 확인

- `kakao-pay.service.spec.ts`
  - `SUCCESS_PAYMENT` 처리 시 Payment/Order 상태 업데이트 및 PaymentEvent 생성
  - 동일 `tid` 재호출 시 early return
  - `CANCEL_PAYMENT` 처리 시 Payment `FAILED` 업데이트 확인

5. 위험 요소

- webhook이 동시에 두 번 들어오면 둘 다 사전 조회를 통과할 수 있으므로 `externalEventId @unique` 제약과 P2002 처리로 방어해야 한다.
- Kakao Pay webhook의 실제 payload 필드명과 서명 검증 방식이 계획서상 미확정이다.
- 상태 업데이트와 PaymentEvent 생성이 같은 트랜잭션에 들어가지 않으면 부분 실패 시 재처리 기준이 깨질 수 있다.
- 기존 테스트 mock에 `paymentEvent`, `$transaction`, `refund.findFirst`가 없을 가능성이 있어 테스트 fixture 보강이 필요하다.

6. 작업 시작 전에 확인이 필요한 점

- Kakao Pay webhook 실제 payload에서 `payment_status`, `tid`, `partner_order_id` 필드가 계획서와 일치하는지 확인해야 한다.
- Kakao Pay webhook 서명 검증을 `KAKAO_PAY_SECRET_KEY`와 Naver Pay HMAC 패턴으로 구현하는 것이 현재 코드 구조에 맞는지 확인해야 한다.
- 로컬 DB 마이그레이션 실행 전 Docker compose 기반 DB가 실행 중인지 확인해야 한다.
- `PaymentEvent.externalEventId`를 gateway와 무관하게 전역 unique로 둘지, 계획서대로 그대로 전역 unique로 진행할지 확인해야 한다.

## machine_readable

```yaml
issue_number: 158
short_name: payment-event-idempotency
issue_goal: 'PaymentEvent 테이블을 추가해 Stripe, Naver Pay, Kakao Pay webhook 외부 이벤트 ID를 저장하고 중복 이벤트 재처리를 방지하며, 중복 환불 요청 생성을 차단한다.'
core_principles:
  - '외부 이벤트 ID는 PaymentEvent.externalEventId에 저장한다.'
  - 'externalEventId는 DB unique 제약으로 중복을 최종 방어한다.'
  - 'webhook 처리 전 PaymentEvent 존재 여부를 확인하고, 존재하면 상태 업데이트 없이 early return 한다.'
  - 'Payment/Order 상태 업데이트와 PaymentEvent 생성은 가능한 한 같은 $transaction 안에서 처리한다.'
  - 'requestRefund는 REQUESTED 또는 COMPLETED Refund가 이미 있으면 ConflictException을 던진다.'
target_files:
  new:
    - 'apps/backend/prisma/migrations/'
  modify:
    - 'apps/backend/prisma/schema.prisma'
    - 'apps/backend/src/payments/payments.service.ts'
    - 'apps/backend/src/payments/naver-pay.service.ts'
    - 'apps/backend/src/payments/kakao-pay.service.ts'
    - 'apps/backend/src/payments/payments.controller.ts'
    - 'apps/backend/src/payments/payments.service.spec.ts'
    - 'apps/backend/src/payments/naver-pay.service.spec.ts'
    - 'apps/backend/src/payments/kakao-pay.service.spec.ts'
  delete: []
do_not_touch:
  - 'apps/frontend/**'
  - 'packages/shared/**'
  - 'issue-158-plan.md 범위 밖의 결제 기능'
  - '계획서에서 변경 대상으로 언급되지 않은 파일'
implementation_requirements:
  - 'schema.prisma에 PaymentEvent 모델을 추가한다.'
  - 'PaymentEvent 필드는 id, externalEventId, gateway, eventType, paymentId, processedAt, payment 관계를 포함한다.'
  - 'Payment 모델에 events PaymentEvent[] 관계를 추가한다.'
  - '마이그레이션 이름은 add-payment-event로 생성한다.'
  - 'Stripe handleWebhookEvent는 event.id로 PaymentEvent를 조회하고 중복이면 { received: true }를 반환한다.'
  - 'Stripe 최초 처리 시 Payment COMPLETED, Order PAID, PaymentEvent 생성을 $transaction으로 처리한다.'
  - 'Stripe PaymentEvent gateway는 stripe, eventType은 event.type을 사용한다.'
  - "requestRefund는 paymentId 기준 REQUESTED 또는 COMPLETED Refund가 있으면 ConflictException('이미 처리 중인 환불 요청이 있습니다')을 던진다."
  - 'Naver Pay handleWebhook은 body.paymentId로 PaymentEvent를 조회하고 중복이면 처리 스킵한다.'
  - 'Naver Pay 최초 처리 시 PaymentEvent externalEventId는 body.paymentId, gateway는 naverpay, eventType은 body.paymentStatus로 저장한다.'
  - 'Kakao Pay service에 handleWebhook(body: KakaoPayWebhookPayload)을 추가한다.'
  - 'Kakao Pay externalEventId는 body.tid를 사용한다.'
  - 'Kakao Pay SUCCESS_PAYMENT는 Payment COMPLETED, Order PAID, PaymentEvent 생성을 처리한다.'
  - 'Kakao Pay CANCEL_PAYMENT는 Payment FAILED 업데이트와 PaymentEvent 생성을 처리한다.'
  - 'payments.controller.ts에 POST /payments/kakao/webhook 엔드포인트를 추가하고 Public으로 노출한다.'
  - '동시 중복 webhook으로 PaymentEvent unique 충돌이 발생하면 early return 처리한다.'
test_requirements:
  - 'payments.service.spec.ts에 Stripe 동일 event.id 두 번째 호출이 DB update 없이 { received: true }를 반환하는 테스트를 추가한다.'
  - 'payments.service.spec.ts에 Stripe 최초 webhook 처리 시 $transaction으로 Payment, Order, PaymentEvent가 처리되는 테스트를 추가한다.'
  - 'payments.service.spec.ts에 requestRefund가 REQUESTED Refund 존재 시 ConflictException을 던지는 테스트를 추가한다.'
  - 'payments.service.spec.ts에 requestRefund가 COMPLETED Refund 존재 시 ConflictException을 던지는 테스트를 추가한다.'
  - 'naver-pay.service.spec.ts에 동일 paymentId 두 번째 webhook 호출이 early return 되는 테스트를 추가한다.'
  - 'naver-pay.service.spec.ts에 Naver SUCCESS 최초 처리 시 PaymentEvent 생성 테스트를 추가한다.'
  - 'kakao-pay.service.spec.ts에 SUCCESS_PAYMENT 성공 처리와 PaymentEvent 생성 테스트를 추가한다.'
  - 'kakao-pay.service.spec.ts에 동일 tid 두 번째 호출이 early return 되는 테스트를 추가한다.'
  - 'kakao-pay.service.spec.ts에 CANCEL_PAYMENT가 Payment FAILED로 업데이트되는 테스트를 추가한다.'
test_commands:
  - 'pnpm --filter @yueeroom/backend test -- --silent payments.service'
  - 'pnpm --filter @yueeroom/backend test -- --silent naver-pay.service'
  - 'pnpm --filter @yueeroom/backend test -- --silent kakao-pay.service'
risks:
  - '동시 webhook 요청은 사전 조회를 모두 통과할 수 있으므로 externalEventId unique 제약과 P2002 처리 필요'
  - 'Kakao Pay webhook 서명 검증 방식이 계획서에서 미확정'
  - 'Kakao Pay webhook payload 필드명이 실제 문서와 다를 수 있음'
  - '$transaction에 PaymentEvent 생성이 포함되지 않으면 상태 업데이트와 이벤트 기록이 불일치할 수 있음'
pre_start_checks:
  - 'Kakao Pay webhook 실제 payload 필드명 확인'
  - 'Kakao Pay webhook 서명 헤더 및 KAKAO_PAY_SECRET_KEY 사용 방식 확인'
  - '로컬 DB 실행 상태 확인 후 Prisma migrate dev 실행'
  - '기존 Prisma mock/test setup에 paymentEvent, refund.findFirst, $transaction mock 추가 필요 여부 확인'
```
