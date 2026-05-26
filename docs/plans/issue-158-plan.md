# 이슈 #158 — 결제/환불 이벤트 멱등성 키 저장 구조 추가

## Context

결제 webhook(Stripe, Naver Pay, Kakao Pay)은 네트워크 오류 등의 이유로 동일 이벤트를 재전송할 수 있다.
현재 코드에는 중복 이벤트를 감지하는 구조가 없어서, 같은 webhook이 두 번 오면 Payment·Order 상태가 중복 업데이트된다.
또한 환불 신청도 중복 Refund 레코드 생성이 가능한 상태다.

`PaymentEvent` 테이블을 신규 추가해 외부 이벤트 ID를 저장하고, 각 webhook 핸들러 진입 시 중복 여부를 조회하는 방식으로 멱등성을 보장한다.
Kakao Pay는 현재 webhook이 없으므로 이번 이슈에서 함께 추가한다.

---

## 1. 관련 파일 목록

| 파일                                                  | 변경 유형                                                             |
| ----------------------------------------------------- | --------------------------------------------------------------------- |
| `apps/backend/prisma/schema.prisma`                   | 수정 — PaymentEvent 모델 추가                                         |
| `apps/backend/src/payments/payments.service.ts`       | 수정 — Stripe webhook 멱등성 + requestRefund 중복 방지 + $transaction |
| `apps/backend/src/payments/naver-pay.service.ts`      | 수정 — Naver Pay webhook 멱등성 추가                                  |
| `apps/backend/src/payments/kakao-pay.service.ts`      | 수정 — handleWebhook() 신규 추가                                      |
| `apps/backend/src/payments/payments.controller.ts`    | 수정 — `POST /payments/kakao/webhook` 엔드포인트 추가                 |
| `apps/backend/src/payments/payments.service.spec.ts`  | 수정 — Stripe webhook 멱등성 테스트 추가                              |
| `apps/backend/src/payments/naver-pay.service.spec.ts` | 수정 — Naver webhook 멱등성 테스트 추가                               |
| `apps/backend/src/payments/kakao-pay.service.spec.ts` | 수정 — Kakao webhook 테스트 추가                                      |
| `apps/backend/prisma/migrations/`                     | 자동 생성 (migrate dev)                                               |

---

## 2. 현재 구조 요약

### 외부 이벤트 ID 현황

| 게이트웨이 | 외부 ID              | 저장 위치                   | 중복 방지    |
| ---------- | -------------------- | --------------------------- | ------------ |
| Stripe     | `event.id` (evt_xxx) | **저장 안 됨**              | **없음**     |
| Naver Pay  | `paymentId`          | `Payment.paymentKey`에 저장 | **없음**     |
| Kakao Pay  | `tid`                | `Payment.paymentKey`에 저장 | webhook 없음 |

### 현재 취약점

1. **Stripe webhook**: `payment_intent.succeeded` 두 번 오면 Payment·Order 중복 업데이트. `$transaction` 미사용으로 부분 실패 위험
2. **Naver Pay webhook**: `paymentStatus === 'SUCCESS'` 두 번 오면 동일
3. **Kakao Pay**: webhook 엔드포인트 자체 없음 — 결제 완료 알림 수신 불가
4. **requestRefund()**: 동일 Payment에 REQUESTED 상태 Refund 존재 여부 체크 없음

---

## 3. 변경 포인트

### 3-1. `schema.prisma` — PaymentEvent 모델 추가

```prisma
model PaymentEvent {
  id              String   @id @default(cuid())
  externalEventId String   @unique           // 외부 게이트웨이 이벤트 ID (DB unique 제약)
  gateway         String                     // 'stripe' | 'naverpay' | 'kakaopay'
  eventType       String                     // 이벤트 종류 (payment_intent.succeeded 등)
  paymentId       String?
  processedAt     DateTime @default(now())

  payment Payment? @relation(fields: [paymentId], references: [id])
}
```

Payment 모델에 관계 추가:

```prisma
model Payment {
  // 기존 필드 ...
  events PaymentEvent[]
}
```

### 3-2. `payments.service.ts` — Stripe webhook 멱등성 + $transaction + 환불 중복 방지

**handleWebhookEvent() 수정**:

```
이벤트 수신 (Stripe event.id = evt_xxx)
→ prisma.paymentEvent.findUnique({ where: { externalEventId: event.id } })
→ 존재하면: return { received: true } (처리 스킵)
→ 없으면:
    prisma.$transaction([
      prisma.payment.update(...COMPLETED),
      prisma.order.update(...PAID),
      prisma.paymentEvent.create({
        externalEventId: event.id,
        gateway: 'stripe',
        eventType: event.type,
        paymentId: payment.id
      })
    ])
```

**requestRefund() 수정**:

```
기존 Payment 조회 후
→ prisma.refund.findFirst({
    where: { paymentId, status: { in: ['REQUESTED', 'COMPLETED'] } }
  })
→ 존재하면: throw new ConflictException('이미 처리 중인 환불 요청이 있습니다')
→ 없으면: 기존 Refund 생성
```

### 3-3. `naver-pay.service.ts` — Naver Pay webhook 멱등성

**handleWebhook() 수정**:

```
webhook body.paymentId 수신
→ prisma.paymentEvent.findUnique({ where: { externalEventId: body.paymentId } })
→ 존재하면: return (처리 스킵)
→ 없으면:
    기존 상태 업데이트 로직 실행
    prisma.paymentEvent.create({
      externalEventId: body.paymentId,
      gateway: 'naverpay',
      eventType: body.paymentStatus,  // 'SUCCESS' | 'CANCEL' | 'FAIL'
      paymentId: payment.id
    })
```

### 3-4. `kakao-pay.service.ts` — handleWebhook() 신규 추가

Kakao Pay webhook payload 인터페이스:

```typescript
interface KakaoPayWebhookPayload {
  cid: string;
  tid: string; // 거래 고유번호 → externalEventId
  partner_order_id: string; // orderId
  partner_user_id: string;
  payment_method_type: string;
  payment_status: string; // 'SUCCESS_PAYMENT' | 'CANCEL_PAYMENT'
  approved_at?: string;
}
```

**handleWebhook() 신규 메서드**:

```
webhook body.tid 수신
→ prisma.paymentEvent.findUnique({ where: { externalEventId: body.tid } })
→ 존재하면: return (처리 스킵)
→ 없으면:
    payment_status === 'SUCCESS_PAYMENT':
      prisma.$transaction([
        prisma.payment.update(...COMPLETED),
        prisma.order.update(...PAID),
        prisma.paymentEvent.create({ externalEventId: body.tid, gateway: 'kakaopay', ... })
      ])
    payment_status === 'CANCEL_PAYMENT':
      prisma.$transaction([
        prisma.payment.update(...FAILED),
        prisma.paymentEvent.create({ ... })
      ])
```

### 3-5. `payments.controller.ts` — Kakao Pay webhook 엔드포인트 추가

Naver Pay webhook 패턴과 동일하게:

```typescript
@Post('kakao/webhook')
@Public()
@ApiOperation({ summary: '카카오페이 웹훅 처리' })
handleKakaoWebhook(@Body() body: KakaoPayWebhookPayload) {
  return this.kakaoPayService.handleWebhook(body);
}
```

---

## 4. 잠재적 위험

| 위험                               | 내용                                                                  | 대응                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Race condition                     | 동시 webhook 2개가 paymentEvent 없음을 동시에 확인 후 둘 다 처리 시도 | externalEventId @unique 제약 → DB 레벨에서 두 번째 insert 시 P2002 발생 → catch 후 early return |
| Kakao Pay webhook 서명 검증        | Kakao Pay webhook 서명 헤더 방식 미확인                               | `KAKAO_PAY_SECRET_KEY` 활용, Naver Pay HMAC 패턴 참고하여 추가                                  |
| Kakao Pay webhook payload 필드     | `payment_status` 필드명이 실제 문서와 다를 수 있음                    | 구현 시 Kakao Pay 개발자 문서 실제 필드명 확인 필요                                             |
| $transaction + paymentEvent 원자성 | 상태 업데이트와 paymentEvent 생성을 동일 트랜잭션에서 처리            | 트랜잭션 내 paymentEvent.create 포함으로 해결                                                   |

---

## 5. 구현 순서

1. `schema.prisma` 수정 — PaymentEvent 모델 + Payment 관계 추가
2. 마이그레이션 실행 — `pnpm --filter @yueeroom/backend prisma migrate dev --name add-payment-event`
3. `payments.service.ts` 수정 — Stripe webhook 멱등성 + $transaction + requestRefund 중복 방지
4. `naver-pay.service.ts` 수정 — Naver Pay webhook 멱등성
5. `kakao-pay.service.ts` 수정 — handleWebhook() 추가
6. `payments.controller.ts` 수정 — `POST /payments/kakao/webhook` 추가
7. 테스트 작성 — payments.service.spec.ts, naver-pay.service.spec.ts, kakao-pay.service.spec.ts

---

## 6. 테스트 전략

### payments.service.spec.ts 추가 케이스

- `handleWebhookEvent`: 동일 `event.id` 두 번 호출 → 두 번째는 DB update 없이 `{ received: true }` 반환
- `handleWebhookEvent`: 최초 호출 시 $transaction으로 Payment + Order + PaymentEvent 동시 생성 확인
- `requestRefund`: REQUESTED 상태 Refund 존재 시 ConflictException
- `requestRefund`: COMPLETED 상태 Refund 존재 시 ConflictException

### naver-pay.service.spec.ts 추가 케이스

- `handleWebhook('SUCCESS')`: 동일 `paymentId` 두 번 → 두 번째는 DB update 없이 early return
- `handleWebhook('SUCCESS')`: 최초 호출 시 PaymentEvent 생성 확인

### kakao-pay.service.spec.ts 추가 케이스

- `handleWebhook('SUCCESS_PAYMENT')`: 성공 처리 + PaymentEvent 생성
- `handleWebhook('SUCCESS_PAYMENT')`: 동일 `tid` 두 번 → 두 번째는 early return
- `handleWebhook('CANCEL_PAYMENT')`: Payment FAILED 업데이트 확인

### 실행 커맨드

```bash
pnpm --filter @yueeroom/backend test -- --silent payments.service
pnpm --filter @yueeroom/backend test -- --silent naver-pay.service
pnpm --filter @yueeroom/backend test -- --silent kakao-pay.service
```
