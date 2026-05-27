# Issue #164 준비 계획

## 사람이 읽는 요약

1. 네가 이해한 작업 목표

   `OrdersService.processGatewayRefund()`가 Stripe, NaverPay, KakaoPay 서비스를 직접 주입받고 `switch`로 분기하는 구조를 제거한다. 결제 provider별 환불 메서드 시그니처를 `IPaymentProvider.refund(paymentKey, amount, reason?)`로 맞추고, `PaymentGatewayService`가 provider 라우팅과 공통 검증을 담당하게 한다. 기존 provider별 specific 환불 메서드는 유지한다.

2. 수정 대상 파일

   신규 파일:
   - `apps/backend/src/payments/interfaces/payment-provider.interface.ts`
   - `apps/backend/src/payments/payment-gateway.service.ts`
   - `apps/backend/src/payments/payment-gateway.service.spec.ts`

   수정 파일:
   - `apps/backend/src/payments/payments.service.ts`
   - `apps/backend/src/payments/naver-pay.service.ts`
   - `apps/backend/src/payments/kakao-pay.service.ts`
   - `apps/backend/src/payments/payments.module.ts`
   - `apps/backend/src/orders/orders.service.ts`
   - `apps/backend/src/orders/orders.service.spec.ts`

   변경하지 않을 파일:
   - `apps/backend/src/orders/orders.module.ts`
   - `apps/backend/src/payments/payments.service.spec.ts`
   - `apps/backend/src/payments/naver-pay.service.spec.ts`
   - `apps/backend/src/payments/kakao-pay.service.spec.ts`

3. 구현 순서
   1. `IPaymentProvider` 인터페이스를 생성해 `refund(paymentKey: string, amount: number, reason?: string): Promise<void>`를 정의한다.
   2. `PaymentsService`, `NaverPayService`, `KakaoPayService`에 공통 `refund()` 위임 메서드를 추가한다.
   3. `PaymentGatewayService`를 생성해 `paymentMethod`별 provider `Map` 라우팅을 구현한다.
   4. `PaymentGatewayService.refund()`에서 미지원 결제 수단과 `paymentKey` 누락을 `BadRequestException`으로 방어한다.
   5. `PaymentsModule`의 `providers`와 `exports`에 `PaymentGatewayService`를 추가한다.
   6. `OrdersService` constructor에서 `NaverPayService`, `KakaoPayService` 의존성을 제거하고 `PaymentGatewayService`를 주입한다.
   7. `OrdersService.processGatewayRefund()`를 `paymentGatewayService.refund(payment, amount, reason)` 호출로 단순화한다.
   8. `payment-gateway.service.spec.ts`를 추가하고 provider 라우팅과 예외 케이스를 검증한다.
   9. `orders.service.spec.ts`에서 provider별 환불 mock 3개를 `mockPaymentGatewayService.refund` 1개로 교체한다.

4. 테스트 추가/수정 계획

   `payment-gateway.service.spec.ts`를 새로 추가해 다음을 검증한다.
   - `stripe`는 `paymentsService.refund()`를 호출한다.
   - `naverpay`는 `naverPayService.refund()`를 호출하며 `reason`을 전달한다.
   - `kakaopay`는 `kakaoPayService.refund()`를 호출한다.
   - 미지원 결제 수단은 `BadRequestException`을 던진다.
   - `paymentKey`가 `null`이면 `BadRequestException`을 던진다.

   `orders.service.spec.ts`는 환불 처리 검증을 `PaymentGatewayService.refund()` 호출 기준으로 수정한다. 기존 `payments.service.spec.ts`, `naver-pay.service.spec.ts`, `kakao-pay.service.spec.ts`는 변경하지 않는다.

   실행 대상:
   - `pnpm --filter @yueeroom/backend test -- --silent payment-gateway`
   - `pnpm --filter @yueeroom/backend test -- --silent orders.service`

5. 위험 요소
   - `paymentKey`가 `null`인 기존 데이터 또는 테스트가 있으면 새 공통 검증으로 예외 동작이 명확해진다.
   - KakaoPay는 `reason`을 사용하지 않으므로 공통 인터페이스에서는 `reason?`을 optional로 두고 KakaoPay 구현에서는 무시해야 한다.
   - `orders.service.spec.ts`의 DI mock 구성이 바뀌므로 테스트 모듈 provider 정리가 필요하다.
   - `PaymentsService`는 OrdersService에서 비-환불 기능에 계속 사용되므로 제거하면 안 된다.
   - approve 흐름은 이번 계획 범위가 아니므로 건드리면 범위가 커진다.

6. 작업 시작 전에 확인이 필요한 점
   - 사용자 요청에는 "GitHub repository issue #163"이라고 되어 있지만, 계획서와 출력 경로는 `issue-164`이며 계획서 제목도 Issue #164다. 실제 작업 대상 issue 번호가 #164인지 #163인지 확인이 필요하다.
   - 현재 `git status --short` 결과 `docs/plans/issue-164-plan.md`가 untracked 상태다. 이 파일이 의도된 입력 파일인지 확인이 필요하다.
   - 계획서에 명시된 대로 `orders.module.ts`는 변경하지 않는 전제로 진행한다.
   - 기존 provider별 specific 환불 메서드와 해당 spec 파일은 유지한다.

## machine_readable

```yaml
issue_number: 164
short_name: payment-provider-interface
issue_goal: 'OrdersService의 provider별 환불 switch를 제거하고 IPaymentProvider 및 PaymentGatewayService로 환불 라우팅을 단일화한다.'
core_principles:
  - 'issue-164-plan.md에 명시된 범위만 수행한다.'
  - '기존 provider별 specific 환불 메서드는 삭제하지 않는다.'
  - 'OrdersService는 NaverPayService와 KakaoPayService를 직접 주입받지 않는다.'
  - 'PaymentsService는 OrdersService의 비-환불 기능 때문에 의존성을 유지한다.'
  - 'approve 흐름은 이번 작업 범위에서 제외한다.'
target_files:
  new:
    - 'apps/backend/src/payments/interfaces/payment-provider.interface.ts'
    - 'apps/backend/src/payments/payment-gateway.service.ts'
    - 'apps/backend/src/payments/payment-gateway.service.spec.ts'
  modify:
    - 'apps/backend/src/payments/payments.service.ts'
    - 'apps/backend/src/payments/naver-pay.service.ts'
    - 'apps/backend/src/payments/kakao-pay.service.ts'
    - 'apps/backend/src/payments/payments.module.ts'
    - 'apps/backend/src/orders/orders.service.ts'
    - 'apps/backend/src/orders/orders.service.spec.ts'
  delete: []
do_not_touch:
  - 'apps/backend/src/orders/orders.module.ts'
  - 'apps/backend/src/payments/payments.service.spec.ts'
  - 'apps/backend/src/payments/naver-pay.service.spec.ts'
  - 'apps/backend/src/payments/kakao-pay.service.spec.ts'
  - 'PaymentsService.refundStripePayment'
  - 'NaverPayService.refundNaverPayment'
  - 'KakaoPayService.refundKakaoPayment'
  - 'provider별 approve 흐름'
implementation_requirements:
  - 'IPaymentProvider는 refund(paymentKey: string, amount: number, reason?: string): Promise<void>를 정의한다.'
  - 'PaymentsService.refund()는 refundStripePayment(paymentKey, amount)를 호출한다.'
  - 'NaverPayService.refund()는 refundNaverPayment(paymentKey, amount, reason)를 호출한다.'
  - 'KakaoPayService.refund()는 refundKakaoPayment(paymentKey, amount)를 호출하고 reason은 무시한다.'
  - 'PaymentGatewayService는 PaymentsService, NaverPayService, KakaoPayService를 주입받는다.'
  - 'PaymentGatewayService는 stripe, naverpay, kakaopay 키를 가진 Map<string, IPaymentProvider>로 provider를 선택한다.'
  - "PaymentGatewayService.refund()는 미지원 paymentMethod에 BadRequestException('지원하지 않는 결제 수단입니다.')을 던진다."
  - "PaymentGatewayService.refund()는 paymentKey가 없으면 BadRequestException('결제 키가 없습니다.')을 던진다."
  - 'PaymentsModule providers와 exports에 PaymentGatewayService를 추가한다.'
  - 'OrdersService constructor에서 NaverPayService와 KakaoPayService를 제거하고 PaymentGatewayService를 추가한다.'
  - 'OrdersService.processGatewayRefund()는 paymentGatewayService.refund(payment, amount, reason) 호출로 단순화한다.'
test_requirements:
  - 'payment-gateway.service.spec.ts를 추가한다.'
  - 'stripe 결제 수단이 paymentsService.refund()를 호출하는지 검증한다.'
  - 'naverpay 결제 수단이 naverPayService.refund()를 호출하고 reason을 전달하는지 검증한다.'
  - 'kakaopay 결제 수단이 kakaoPayService.refund()를 호출하는지 검증한다.'
  - '미지원 결제 수단이 BadRequestException을 던지는지 검증한다.'
  - 'paymentKey null이 BadRequestException을 던지는지 검증한다.'
  - 'orders.service.spec.ts의 환불 관련 mock을 PaymentGatewayService.refund 단일 mock으로 교체한다.'
  - 'payments.service.spec.ts, naver-pay.service.spec.ts, kakao-pay.service.spec.ts는 변경하지 않는다.'
test_commands:
  - 'pnpm --filter @yueeroom/backend test -- --silent payment-gateway'
  - 'pnpm --filter @yueeroom/backend test -- --silent orders.service'
risks:
  - 'paymentKey null 처리 동작이 기존 런타임 에러 가능성에서 명시적 BadRequestException으로 바뀐다.'
  - 'KakaoPay는 reason을 지원하지 않으므로 공통 인터페이스에서 optional 처리하고 구현에서 무시해야 한다.'
  - 'orders.service.spec.ts의 테스트 모듈 provider mock 구성이 바뀌어 DI 실패가 발생할 수 있다.'
  - 'PaymentsService 의존성을 OrdersService에서 제거하면 createPaymentIntent 등 비-환불 기능이 깨질 수 있다.'
  - 'approve 흐름을 함께 수정하면 계획서 범위를 초과한다.'
pre_start_checks:
  - '사용자 요청은 issue #163을 언급하지만 계획서, 제목, 출력 경로는 issue #164이므로 실제 대상 issue 번호를 확인한다.'
  - '현재 git status --short 결과 docs/plans/issue-164-plan.md가 untracked 상태임을 확인했다.'
  - 'orders.module.ts는 PaymentsModule이 이미 import되어 있으므로 변경하지 않는다.'
  - '기존 provider별 specific 환불 메서드와 해당 spec은 유지한다.'
```
