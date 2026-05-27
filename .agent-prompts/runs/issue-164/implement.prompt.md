정리한 Issue #164 이해 내용을 기준으로 구현을 진행해.

목표:
OrdersService의 provider별 환불 switch를 제거하고 IPaymentProvider 및 PaymentGatewayService로 환불 라우팅을 단일화한다.

핵심 원칙:

- issue-164-plan.md에 명시된 범위만 수행한다.
- 기존 provider별 specific 환불 메서드는 삭제하지 않는다.
- OrdersService는 NaverPayService와 KakaoPayService를 직접 주입받지 않는다.
- PaymentsService는 OrdersService의 비-환불 기능 때문에 의존성을 유지한다.
- approve 흐름은 이번 작업 범위에서 제외한다.

참고 문서:

- docs/plans/issue-164-plan.md

중요한 제약:

- 작업 시작 전 메인 브랜치의 최신화 여부를 확인하고, 작업 브랜치로 체크아웃한다.
- 브랜치 네이밍은 fix/issue-164-payment-provider-interface 또는 feat/issue-164-payment-provider-interface 형식을 사용한다.
- docs/plans/issue-164-plan.md는 참고만 하고, 코드 변경 대상에 포함하지 마.
- 계획서 범위를 벗어난 리팩토링이나 기능 추가는 하지 마.
- DB schema, migration, seed 파일은 수정하지 마.
- 새 API endpoint는 명시적으로 요구되지 않는 한 추가하지 마.
  - apps/backend/src/orders/orders.module.ts
- apps/backend/src/payments/payments.service.spec.ts
- apps/backend/src/payments/naver-pay.service.spec.ts
- apps/backend/src/payments/kakao-pay.service.spec.ts
- PaymentsService.refundStripePayment
- NaverPayService.refundNaverPayment
- KakaoPayService.refundKakaoPayment
- provider별 approve 흐름

수정 대상 파일:

- 신규: apps/backend/src/payments/interfaces/payment-provider.interface.ts
- 신규: apps/backend/src/payments/payment-gateway.service.ts
- 신규: apps/backend/src/payments/payment-gateway.service.spec.ts
- 수정: apps/backend/src/payments/payments.service.ts
- 수정: apps/backend/src/payments/naver-pay.service.ts
- 수정: apps/backend/src/payments/kakao-pay.service.ts
- 수정: apps/backend/src/payments/payments.module.ts
- 수정: apps/backend/src/orders/orders.service.ts
- 수정: apps/backend/src/orders/orders.service.spec.ts

구현 요구사항:

- IPaymentProvider는 refund(paymentKey: string, amount: number, reason?: string): Promise<void>를 정의한다.
- PaymentsService.refund()는 refundStripePayment(paymentKey, amount)를 호출한다.
- NaverPayService.refund()는 refundNaverPayment(paymentKey, amount, reason)를 호출한다.
- KakaoPayService.refund()는 refundKakaoPayment(paymentKey, amount)를 호출하고 reason은 무시한다.
- PaymentGatewayService는 PaymentsService, NaverPayService, KakaoPayService를 주입받는다.
- PaymentGatewayService는 stripe, naverpay, kakaopay 키를 가진 Map<string, IPaymentProvider>로 provider를 선택한다.
- PaymentGatewayService.refund()는 미지원 paymentMethod에 BadRequestException('지원하지 않는 결제 수단입니다.')을 던진다.
- PaymentGatewayService.refund()는 paymentKey가 없으면 BadRequestException('결제 키가 없습니다.')을 던진다.
- PaymentsModule providers와 exports에 PaymentGatewayService를 추가한다.
- OrdersService constructor에서 NaverPayService와 KakaoPayService를 제거하고 PaymentGatewayService를 추가한다.
- OrdersService.processGatewayRefund()는 paymentGatewayService.refund(payment, amount, reason) 호출로 단순화한다.

테스트 요구사항:

- payment-gateway.service.spec.ts를 추가한다.
- stripe 결제 수단이 paymentsService.refund()를 호출하는지 검증한다.
- naverpay 결제 수단이 naverPayService.refund()를 호출하고 reason을 전달하는지 검증한다.
- kakaopay 결제 수단이 kakaoPayService.refund()를 호출하는지 검증한다.
- 미지원 결제 수단이 BadRequestException을 던지는지 검증한다.
- paymentKey null이 BadRequestException을 던지는지 검증한다.
- orders.service.spec.ts의 환불 관련 mock을 PaymentGatewayService.refund 단일 mock으로 교체한다.
- payments.service.spec.ts, naver-pay.service.spec.ts, kakao-pay.service.spec.ts는 변경하지 않는다.

작업 방식:

1. 먼저 실제 현재 코드 상태와 git diff를 확인한다.
2. 위 범위 안에서만 코드를 수정한다.
3. 변경이 커질 경우 백엔드 → 프론트엔드 → 테스트 순서로 나눠 진행한다.
4. 수정 후 관련 테스트를 실행한다.
5. 실패 테스트가 있으면 원인을 설명하고, Issue #164 범위 안에서만 수정한다.

우선 실행 권장 테스트:

```bash
pnpm --filter @yueeroom/backend test -- --silent payment-gateway
```

```bash
pnpm --filter @yueeroom/backend test -- --silent orders.service
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
- 계획서에 있는 Issue #164 범위만 구현해.
- 보안/인증 이슈라면 기존보다 취약한 흐름을 다시 만들지 마.
