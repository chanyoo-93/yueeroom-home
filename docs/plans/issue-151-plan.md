# Issue #151 구현 계획 — 결제 승인 시 내부 paymentKey 교차 검증 추가

## 배경

`NaverPayService.approvePayment()`는 요청 파라미터로 받은 `paymentId`를
DB에 저장된 `payment.paymentKey`와 비교하지 않는다.
공격자가 자신의 `merchantPayKey`(orderId)에 다른 사용자의 `paymentId`를 제출하면
Naver Pay API에 잘못된 paymentId로 승인 요청이 가게 되며 IDOR 취약점이 될 수 있다.
preparePayment 단계에서 Naver API로부터 받아 DB에 저장한 `paymentKey`와
승인 요청의 `paymentId`를 비교해 불일치 시 즉시 차단해야 한다.

---

## 1. 관련 파일 목록

| 파일                                                  | 역할                                        |
| ----------------------------------------------------- | ------------------------------------------- |
| `apps/backend/src/payments/naver-pay.service.ts`      | approvePayment() 검증 로직 추가 (변경 대상) |
| `apps/backend/src/payments/naver-pay.service.spec.ts` | paymentKey 불일치 테스트 추가 (변경 대상)   |

---

## 2. 현재 구조 요약

### preparePayment() — paymentKey 저장 (L107–L119)

```typescript
await this.prisma.payment.upsert({
  where: { orderId },
  create: { ..., paymentKey: result.body.paymentId },  // Naver API 응답 paymentId 저장
  update: { paymentKey: result.body.paymentId, status: 'PENDING' },
});
```

### approvePayment() — 현재 검증 흐름 (L128–L186)

```typescript
async approvePayment(userId: string, paymentId: string, merchantPayKey: string) {
  const order = await prisma.order.findUnique({
    where: { id: merchantPayKey },
    include: { payment: true },  // payment.paymentKey 포함 조회
  });

  if (!order) throw new NotFoundException(...)       // ✅ 존재 확인
  if (order.userId !== userId) throw ForbiddenException(...)  // ✅ 소유권 확인
  if (order.payment?.status === 'COMPLETED') throw BadRequestException(...)  // ✅ 중복 결제 방지

  // ❌ paymentId vs order.payment.paymentKey 비교 없음

  // ... Naver API 호출 (paymentId를 그대로 전달)
}
```

### 테스트 fixture (spec.ts L29–L39)

```typescript
const mockPayment = {
  paymentKey: 'np_payment_123',  // preparePayment에서 저장된 값
  ...
};
```

성공 케이스 호출: `service.approvePayment('user-1', 'np_payment_123', 'order-1')`
→ paymentId와 paymentKey가 이미 일치하므로 기존 성공 테스트는 수정 없이 통과

---

## 3. 변경해야 할 지점

### (A) `naver-pay.service.ts` — L138 직후에 검증 추가

```typescript
// 기존 (L136–138):
if (order.payment?.status === 'COMPLETED') {
  throw new BadRequestException('이미 결제된 주문입니다.');
}

// 추가할 코드 (L139–141):
if (!order.payment?.paymentKey || order.payment.paymentKey !== paymentId) {
  throw new BadRequestException('유효하지 않은 결제 정보입니다.');
}
```

**조건 해설**:

- `!order.payment?.paymentKey`: payment 레코드 없거나 paymentKey가 null → preparePayment 미호출 케이스 차단
- `order.payment.paymentKey !== paymentId`: 저장된 키와 요청 키 불일치 → 교차 대입 공격 차단

**HTTP 상태**: `BadRequestException` (400) — 기존 검증 패턴과 일관성 유지
(이슈에서 "400 또는 403"으로 허용하며, 기존 결제 상태 검증과 같은 예외 타입 사용)

### (B) `naver-pay.service.spec.ts` — approvePayment describe 블록에 테스트 케이스 추가

```typescript
it('paymentKey 불일치 → BadRequestException', async () => {
  mockPrisma.order.findUnique.mockResolvedValue({
    ...mockOrder,
    payment: { ...mockPayment, paymentKey: 'np_payment_123' },
  });

  await expect(service.approvePayment('user-1', 'DIFFERENT_PAYMENT_ID', 'order-1')).rejects.toThrow(
    BadRequestException,
  );
  expect(global.fetch).not.toHaveBeenCalled(); // API 호출 전 차단 확인
});
```

---

## 4. 잠재적 위험

| 위험                       | 설명                                                                                               | 대응                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| payment 레코드 없는 경우   | preparePayment를 호출하지 않은 주문에 approvePayment 시도 시 `order.payment`가 null                | `!order.payment?.paymentKey` 조건으로 함께 차단됨 |
| paymentKey nullable 필드   | 스키마에서 `paymentKey: String?` — null 가능                                                       | optional chaining으로 안전하게 처리               |
| 기존 성공 테스트 영향 없음 | 기존 성공 테스트의 paymentId(`'np_payment_123'`) = mockPayment.paymentKey(`'np_payment_123'`) 일치 | 변경 없이 통과                                    |
| Kakao Pay 동일 취약점 여부 | kakao-pay.service.ts approvePayment()는 tid를 DB에서 직접 읽어 사용 → 취약하지 않음                | 이슈 범위 밖, 별도 확인 불필요                    |

---

## 5. 구현 순서

1. **`naver-pay.service.spec.ts`**: `approvePayment` describe 블록에 paymentKey 불일치 테스트 케이스 추가
2. 테스트 실행 → 실패 확인 (Red)
3. **`naver-pay.service.ts`**: L138 직후에 paymentKey 검증 로직 추가
4. 테스트 실행 → 통과 확인 (Green)
5. feature 브랜치 생성 → 커밋 → PR (`Closes #151`)

---

## 6. 테스트 전략

### 실행 명령

```bash
pnpm --filter @yueeroom/backend test -- --silent src/payments/naver-pay.service.spec.ts
```

### 추가할 테스트 케이스 (approvePayment describe 내)

```
✓ paymentKey 불일치 → BadRequestException, fetch 미호출
```

### 기존 테스트 케이스 유지 확인 (변경 없어야 함)

```
✓ 결제 승인 성공 → Payment COMPLETED, Order PAID 업데이트
✓ 존재하지 않는 주문 → NotFoundException
✓ 다른 사용자의 주문 → ForbiddenException
✓ 이미 결제 완료된 주문 → BadRequestException
✓ Naver Pay API code != Success → BadRequestException + Payment FAILED 업데이트
✓ Naver Pay API 응답 실패(ok=false) → InternalServerErrorException
```

### IDOR 회귀 방지 포인트

- `global.fetch`가 **호출되지 않아야** 함 (API 호출 전에 차단)
- 불일치 paymentId가 Naver API로 전달되지 않아야 함
