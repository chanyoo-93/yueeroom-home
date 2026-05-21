# Issue #153: API 응답 DTO와 내부 Prisma 타입 분리

## 1. 관련 파일 목록

### 탐색한 현황

| 파일                                                 | 역할                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `apps/backend/src/payments/payments.service.ts`      | `getUserPayments` — `include` 사용으로 `paymentKey` 노출 중                       |
| `apps/backend/src/users/users.service.ts`            | SafeUser/USER_SAFE_SELECT 정의 위치. ChildProfile, Address는 Prisma 원본 반환     |
| `apps/backend/src/admin/admin.service.ts`            | User는 SafeUser 처리됨. `updateOrderStatus/Tracking` — `Promise<Order>` 원본 반환 |
| `apps/backend/src/orders/orders.service.ts`          | 모든 메서드 Prisma 암묵적 타입 반환, 민감 필드 없음                               |
| `apps/backend/src/payments/payments.service.spec.ts` | `getUserPayments` 테스트 없음. `mockPayment`에 `paymentKey: 'pi_test_123'` 포함   |
| `packages/shared/src/types/user.ts`                  | 기본 User 인터페이스 (id, email, name, status, role, createdAt, updatedAt)        |

---

## 2. 현재 구조 요약

### 민감 필드 현황

- **User**: `password`, `mfaSecret`, `providerId` → PR #165에서 SafeUser/USER_SAFE_SELECT로 처리 완료
- **Payment**: `paymentKey`(결제 게이트웨이 토큰) → `getUserPayments`에서 그대로 노출 중
- Order, Refund, ChildProfile, Address: 민감 필드 없음

### 분리 상태

| 모듈                                        | 상태                                   |
| ------------------------------------------- | -------------------------------------- |
| User getProfile/updateProfile               | ✅ SafeUser select 적용                |
| Admin listUsers/approveUser 등              | ✅ SafeUser select 적용                |
| User getChildren/addChild/getAddresses 등   | ❌ Prisma 타입 그대로, 민감 필드 없음  |
| Admin updateOrderStatus/updateOrderTracking | ❌ `Promise<Order>` 원본               |
| Orders createOrder/getOrder/getOrders 등    | ❌ Prisma 타입 그대로, 민감 필드 없음  |
| Payments getUserPayments                    | ❌ `include` 사용, **paymentKey 노출** |
| Payments requestRefund                      | ❌ Refund 원본 반환, 민감 필드 없음    |

### Swagger 현황

- 모든 controller에 `@ApiOkResponse`, `@ApiCreatedResponse` 없음 → Swagger 스키마 비어 있음

---

## 3. 변경해야 할 지점

### 핵심 보안 수정 (paymentKey 필터링)

**`payments/payments.service.ts` — `getUserPayments` 메서드 (L81-104)**

```
// 변경 전
include: {
  order: {
    include: {
      items: {
        include: { variant: { include: { product: { include: { images: true } } } } }
      }
    }
  }
}

// 변경 후: 전체를 select로 재작성, paymentKey 필드 제외
select: {
  id, orderId, status, amount, paymentMethod, paidAt, createdAt, updatedAt,
  // paymentKey 없음
  order: { select: { id, userId, status, totalAmount, items: { select: { ... } } } }
}
```

### 생성할 파일 (4개) — API 계약 명시

**`apps/backend/src/users/dto/user-response.dto.ts`**

- `UserResponseDto` — SafeUser 필드 전체 + `@ApiProperty`
- `ChildProfileResponseDto` — id, userId, name, birthDate, gender, height, weight, createdAt, updatedAt
- `AddressResponseDto` — id, userId, name, recipient, phone, zipCode, address1, address2, isDefault, createdAt, updatedAt

**`apps/backend/src/orders/dto/order-response.dto.ts`**

- `OrderItemResponseDto` — id, orderId, variantId, quantity, unitPrice, createdAt
- `OrderResponseDto` — id, userId, status, totalAmount, shippingFee, carrier?, trackingNumber?, items?, address?, createdAt, updatedAt
- `OrderListResponseDto` — `{ items: OrderResponseDto[], total, page, limit, totalPages }`

**`apps/backend/src/payments/dto/payment-response.dto.ts`**

- `PaymentResponseDto` — id, orderId, status, amount, paymentMethod, paidAt, createdAt, updatedAt (**paymentKey 제외**)
- `RefundResponseDto` — id, orderId, paymentId, status, amount, reason, createdAt, updatedAt
- `PaymentListResponseDto` — `{ items: PaymentResponseDto[], total, page, limit, totalPages }`

**`apps/backend/src/admin/dto/admin-order-response.dto.ts`**

- `AdminOrderResponseDto` — id, userId, status, totalAmount, shippingFee, carrier?, trackingNumber?, createdAt, updatedAt

### 반환 타입 선언 변경 (구현 로직 변경 없음)

**`users/users.service.ts`**

- `getChildren` → `Promise<ChildProfileResponseDto[]>`
- `addChild/updateChild` → `Promise<ChildProfileResponseDto>`
- `getAddresses` → `Promise<AddressResponseDto[]>`
- `addAddress/updateAddress` → `Promise<AddressResponseDto>`

**`orders/orders.service.ts`**

- `createOrder` → `Promise<OrderResponseDto>` (기존 `Prisma.OrderGetPayload<...>` 교체)
- `getOrder/refundOrder` → `Promise<OrderResponseDto>`
- `getOrders` → `Promise<OrderListResponseDto>`

**`admin/admin.service.ts`**

- `updateOrderStatus/updateOrderTracking` → `Promise<AdminOrderResponseDto>`

### Swagger 어노테이션 추가 (4개 controller)

**`users/users.controller.ts`**

- GET /me → `@ApiOkResponse({ type: UserResponseDto })`
- GET /me/children → `@ApiOkResponse({ type: [ChildProfileResponseDto] })`
- POST /me/children → `@ApiCreatedResponse({ type: ChildProfileResponseDto })`
- GET /me/addresses → `@ApiOkResponse({ type: [AddressResponseDto] })`
- POST /me/addresses → `@ApiCreatedResponse({ type: AddressResponseDto })`

**`orders/orders.controller.ts`**

- POST / → `@ApiCreatedResponse({ type: OrderResponseDto })`
- GET / → `@ApiOkResponse({ type: OrderListResponseDto })`
- GET /:id → `@ApiOkResponse({ type: OrderResponseDto })`

**`payments/payments.controller.ts`**

- GET /me → `@ApiOkResponse({ type: PaymentListResponseDto })`
- POST /:id/refund → `@ApiCreatedResponse({ type: RefundResponseDto })`

**`admin/admin.controller.ts`**

- PATCH /orders/:id/status → `@ApiOkResponse({ type: AdminOrderResponseDto })`
- PATCH /orders/:id/tracking → `@ApiOkResponse({ type: AdminOrderResponseDto })`

---

## 4. 잠재적 위험

**위험 1: getUserPayments select 중첩 재작성**

- 현재 3단계 중첩 include(order → items → variant → product → images)를 select로 전환 시 필드 누락 위험
- Prisma는 `select`/`include` 동시 사용 불가 → 컴파일 에러로 즉시 감지됨 (안전망 있음)

**위험 2: getOrder의 `payment: true` include — 스코프 제외**

- `orders.service.ts:112` — 주문 상세 조회에서도 Payment 전체(paymentKey 포함) 반환
- 이번 이슈 스코프는 `getUserPayments`이므로 제외. 후속 이슈로 분리 권장

**위험 3: processGatewayRefund 내 paymentKey 사용**

- `orders.service.ts:295-314` — 환불 처리 시 내부적으로 `payment.paymentKey` 필요
- `getUserPayments` 외부 응답만 필터링하므로 내부 로직과 무관, 충돌 없음

**위험 4: admin.controller.ts import 정리**

- `import { Order } from '@prisma/client'` 제거 시, 같은 import에 있는 `OrderStatus` 유지 필요

**위험 5: packages/shared 타입 미수정**

- `packages/shared/types/user.ts`에 Order, Payment 공유 타입 없음
- Response DTO는 backend 내부에서만 정의 → shared 타입 수정 불필요
- 프론트엔드 호환 유지

---

## 5. 구현 순서

1. **Response DTO 파일 4개 생성** (병렬 가능)
   - `users/dto/user-response.dto.ts`
   - `orders/dto/order-response.dto.ts`
   - `payments/dto/payment-response.dto.ts`
   - `admin/dto/admin-order-response.dto.ts`

2. **`payments/payments.service.ts`** — `getUserPayments` select 교체 (핵심 보안)

3. **Service 반환 타입 선언 추가**
   - `users/users.service.ts`
   - `orders/orders.service.ts`
   - `admin/admin.service.ts`

4. **Controller Swagger 어노테이션 추가**
   - `payments/payments.controller.ts`
   - `users/users.controller.ts`
   - `orders/orders.controller.ts`
   - `admin/admin.controller.ts`

5. **테스트 추가 및 실행**

---

## 6. 테스트 전략

### 신규 테스트 (`payments/payments.service.spec.ts`)

```typescript
describe('getUserPayments', () => {
  it('paymentKey 필드를 응답에서 제외한다', async () => {
    mockPrisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        orderId: 'order-1',
        status: 'COMPLETED',
        amount: 50000,
        paymentMethod: 'stripe',
        paidAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        order: {
          id: 'order-1',
          userId: 'user-1',
          status: 'DELIVERED',
          totalAmount: 50000,
          items: [],
        },
      },
    ]);
    mockPrisma.payment.count.mockResolvedValue(1);

    const result = await service.getUserPayments('user-1', 1, 10);

    expect(result.items[0]).not.toHaveProperty('paymentKey');
    expect(result.total).toBe(1);
  });

  it('findMany 쿼리가 include 없이 select를 사용한다', async () => {
    mockPrisma.payment.findMany.mockResolvedValue([]);
    mockPrisma.payment.count.mockResolvedValue(0);

    await service.getUserPayments('user-1', 1, 10);

    const arg = mockPrisma.payment.findMany.mock.calls[0][0];
    expect(arg.include).toBeUndefined();
    expect(arg.select).toBeDefined();
    expect(arg.select.paymentKey).toBeUndefined();
  });
});
```

### 기존 테스트 회귀 확인

- `users.service.spec.ts` — ChildProfileResponseDto, AddressResponseDto 필드가 기존 Prisma 필드와 동일하므로 픽스처 변경 불필요
- `orders.service.spec.ts` — `mockOrder` 픽스처가 OrderResponseDto와 호환, 변경 불필요
- `payments.service.spec.ts` — 기존 `refundOrder` 테스트는 내부 `paymentKey` 사용 로직 검증, 이번 변경과 무관

### 실행 커맨드

```bash
pnpm --filter @yueeroom/backend test -- --silent payments.service
pnpm --filter @yueeroom/backend test -- --silent users.service
pnpm --filter @yueeroom/backend test -- --silent orders.service
```
