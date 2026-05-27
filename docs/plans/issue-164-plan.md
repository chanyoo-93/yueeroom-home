# Issue #164 구현 계획: 결제 provider별 공통 인터페이스 정리

## Context

`OrdersService.processGatewayRefund()`가 Stripe·NaverPay·KakaoPay 서비스를 직접 주입받아 switch 분기로 호출한다.
각 provider의 메서드 시그니처가 불일치(`reason` 파라미터 유무 등)하고, 새 결제 수단 추가 시 OrdersService를 직접 수정해야 하는 구조적 문제가 있다.
공통 인터페이스와 PaymentGatewayService를 도입해 OrdersService의 switch를 제거하고 확장 지점을 단일화한다.

---

## 1. 관련 파일 목록

| 파일                                                                          | 역할                                 | 작업                                     |
| ----------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------- |
| `apps/backend/src/payments/payments.service.ts`                               | Stripe 환불 (`refundStripePayment`)  | `refund()` 메서드 추가 (인터페이스 구현) |
| `apps/backend/src/payments/naver-pay.service.ts`                              | NaverPay 환불 (`refundNaverPayment`) | `refund()` 메서드 추가 (인터페이스 구현) |
| `apps/backend/src/payments/kakao-pay.service.ts`                              | KakaoPay 환불 (`refundKakaoPayment`) | `refund()` 메서드 추가 (인터페이스 구현) |
| `apps/backend/src/payments/payments.module.ts`                                | providers/exports 선언               | `PaymentGatewayService` 추가             |
| `apps/backend/src/orders/orders.service.ts`                                   | `processGatewayRefund()` switch 로직 | `PaymentGatewayService`로 대체           |
| `apps/backend/src/orders/orders.module.ts`                                    | imports                              | 변경 없음 (PaymentsModule 이미 import)   |
| **신규** `apps/backend/src/payments/interfaces/payment-provider.interface.ts` | 인터페이스 정의                      | 생성                                     |
| **신규** `apps/backend/src/payments/payment-gateway.service.ts`               | provider 라우팅                      | 생성                                     |
| **신규** `apps/backend/src/payments/payment-gateway.service.spec.ts`          | 게이트웨이 테스트                    | 생성                                     |
| `apps/backend/src/orders/orders.service.spec.ts`                              | 주문 테스트                          | mock 3개 → 1개로 교체                    |

---

## 2. 현재 구조 요약

```
OrdersService
  ├─ PaymentsService  →  refundStripePayment(paymentKey, amount)
  ├─ NaverPayService  →  refundNaverPayment(paymentKey, amount, reason?)
  └─ KakaoPayService  →  refundKakaoPayment(tid, amount)

processGatewayRefund() {
  switch (payment.paymentMethod) {
    case 'stripe':   this.paymentsService.refundStripePayment(...)
    case 'naverpay': this.naverPayService.refundNaverPayment(...)
    case 'kakaopay': this.kakaoPayService.refundKakaoPayment(...)
    default: throw BadRequestException
  }
}
```

인터페이스 없음. provider마다 메서드 이름·파라미터 불일치.

---

## 3. 변경해야 할 지점

### 3-1. 신규: `IPaymentProvider` 인터페이스

```typescript
// payments/interfaces/payment-provider.interface.ts
export interface IPaymentProvider {
  refund(paymentKey: string, amount: number, reason?: string): Promise<void>;
}
```

### 3-2. 기존 서비스에 `refund()` 위임 메서드 추가

각 서비스는 기존 메서드를 유지하고, 인터페이스 구현 메서드를 추가한다.
기존 specific 메서드는 삭제하지 않는다 (각 서비스 spec이 직접 테스트 중).

```typescript
// PaymentsService
async refund(paymentKey: string, amount: number): Promise<void> {
  await this.refundStripePayment(paymentKey, amount);
}

// NaverPayService
async refund(paymentKey: string, amount: number, reason?: string): Promise<void> {
  await this.refundNaverPayment(paymentKey, amount, reason);
}

// KakaoPayService
async refund(paymentKey: string, amount: number): Promise<void> {
  await this.refundKakaoPayment(paymentKey, amount);
}
```

### 3-3. 신규: `PaymentGatewayService`

```typescript
// payments/payment-gateway.service.ts
@Injectable()
export class PaymentGatewayService {
  private readonly providers: Map<string, IPaymentProvider>;

  constructor(
    paymentsService: PaymentsService,
    naverPayService: NaverPayService,
    kakaoPayService: KakaoPayService,
  ) {
    this.providers = new Map<string, IPaymentProvider>([
      ['stripe', paymentsService],
      ['naverpay', naverPayService],
      ['kakaopay', kakaoPayService],
    ]);
  }

  async refund(
    payment: { paymentKey: string | null; paymentMethod: string },
    amount: number,
    reason?: string,
  ): Promise<void> {
    const provider = this.providers.get(payment.paymentMethod);
    if (!provider) throw new BadRequestException('지원하지 않는 결제 수단입니다.');
    if (!payment.paymentKey) throw new BadRequestException('결제 키가 없습니다.');
    await provider.refund(payment.paymentKey, amount, reason);
  }
}
```

### 3-4. `PaymentsModule` 업데이트

```typescript
providers: [...기존, PaymentGatewayService],
exports:   [...기존, PaymentGatewayService],
```

### 3-5. `OrdersService` 업데이트

```typescript
// constructor: NaverPayService·KakaoPayService 제거, PaymentGatewayService 추가
constructor(
  private readonly prisma: PrismaService,
  private readonly paymentsService: PaymentsService,  // createPaymentIntent 등 비-환불 기능 유지
  private readonly paymentGatewayService: PaymentGatewayService,
)

// processGatewayRefund() 단순화
private async processGatewayRefund(...): Promise<void> {
  await this.paymentGatewayService.refund(payment, amount, reason);
}
```

> `PaymentsService`는 `createPaymentIntent`, `getUserPayments`, `requestRefund`, `handleWebhookEvent` 등 비-환불 기능 때문에 OrdersService 의존을 유지한다.
> NaverPayService·KakaoPayService는 OrdersService constructor에서 제거한다.

---

## 4. 잠재적 위험

| 위험                             | 내용                                                                                  | 대응                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `paymentKey` null 처리           | 기존 switch 내부에서 각 메서드가 null을 받을 경우 런타임 에러 가능                    | `PaymentGatewayService.refund()`에서 null 체크 후 명시적 예외                                 |
| KakaoPay `reason` 미지원         | `refundKakaoPayment(tid, amount)`는 reason 없음                                       | 인터페이스의 `reason?`을 옵셔널로 선언, KakaoPay 구현에서 무시                                |
| orders.service.spec.ts mock 변경 | `mockNaverPayService`, `mockKakaoPayService` mock 제거 → 기존 테스트 케이스 조정 필요 | `mockPaymentGatewayService = { refund: jest.fn() }` 1개로 통합                                |
| 순환 의존                        | PaymentsModule 내에서 PaymentGatewayService가 3개 서비스를 주입받는 구조              | 동일 모듈 내 provider이므로 순환 의존 없음                                                    |
| approve 흐름 미포함              | 이슈 배경에 "refund/approve 책임 분리" 언급                                           | approve 흐름은 provider별 진입점이 다르고 공통 switch 없음 → 이번 범위 제외, 별도 이슈로 분리 |

---

## 5. 구현 순서

1. `payments/interfaces/payment-provider.interface.ts` 생성 — 인터페이스 정의
2. `PaymentsService`, `NaverPayService`, `KakaoPayService`에 `refund()` 위임 메서드 추가
3. `payment-gateway.service.ts` 생성 — Map 기반 라우팅 + null/unknown 방어
4. `payments.module.ts` — PaymentGatewayService providers/exports 추가
5. `orders.service.ts` — constructor에서 NaverPayService·KakaoPayService 제거, PaymentGatewayService 추가, processGatewayRefund() 단순화
6. `payment-gateway.service.spec.ts` 생성 — 라우팅 로직 테스트 (3 provider + unknown + null paymentKey)
7. `orders.service.spec.ts` — mock 3개 → 1개 교체, 기존 케이스 통과 확인

---

## 6. 테스트 전략

### 신규: `payment-gateway.service.spec.ts`

```typescript
describe('PaymentGatewayService', () => {
  // stripe → paymentsService.refund() 호출
  // naverpay → naverPayService.refund() 호출 (reason 전달 확인)
  // kakaopay → kakaoPayService.refund() 호출
  // 미지원 결제 수단 → BadRequestException
  // paymentKey null → BadRequestException
});
```

### 수정: `orders.service.spec.ts`

```typescript
const mockPaymentGatewayService = { refund: jest.fn() };
// 기존: mockPaymentsService.refundStripePayment, mockNaverPayService.refundNaverPayment, mockKakaoPayService.refundKakaoPayment
// 변경: mockPaymentGatewayService.refund 단일 검증
```

### 기존 유지 (변경 없음)

- `payments.service.spec.ts` — `refundStripePayment` 유지
- `naver-pay.service.spec.ts` — `refundNaverPayment` 유지
- `kakao-pay.service.spec.ts` — `refundKakaoPayment` 유지

### 실행 커맨드

```bash
pnpm --filter @yueeroom/backend test -- --silent payment-gateway
pnpm --filter @yueeroom/backend test -- --silent orders.service
```
