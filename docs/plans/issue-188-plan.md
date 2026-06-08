# [결제 PG 교체] Stripe → KCP 이지페이 연동 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stripe를 KCP 이지페이로 완전 교체하고, 신용카드·가상계좌 결제를 지원한다.

**Architecture:** `KcpEasyPayService`가 `IPaymentProvider`를 구현하고 `'kcpeasypay'` 키로 `PaymentGatewayService`에 등록된다. 신용카드 결제는 백엔드가 서명된 파라미터를 생성하고 프론트엔드 KCP JS SDK 팝업이 결제를 처리한 뒤 KCP webhook으로 결과를 수신한다. 가상계좌는 백엔드가 KCP API를 직접 호출해 계좌를 발급하고, 입금 시 KCP webhook으로 통보를 받는다. `PaymentsService`는 Stripe 코드를 모두 제거하고 공통 기능(결제 내역 조회, 환불 신청)만 담당한다.

**Tech Stack:** NestJS, Prisma, KCP 이지페이 REST API, Next.js 14 App Router, KCP JS SDK

---

## ⚠️ KCP API 선행 확인 필요 항목

아래 항목은 KCP 이지페이 개발자 센터 및 Sandbox 계정 확보 후 채워야 한다.  
각 Task의 `【확인 필요】` 표시 위치에 실제 값을 대입한다.

| 항목                             | 위치                          | 비고                             |
| -------------------------------- | ----------------------------- | -------------------------------- |
| Sandbox API Base URL             | `kcp-easypay.service.ts` 상수 | 예: `https://testpayx.kcp.co.kr` |
| Production API Base URL          | `kcp-easypay.service.ts` 상수 | 예: `https://payx.kcp.co.kr`     |
| KCP JS SDK `<script>` URL        | `KcpPaymentButton.tsx`        | CDN URL                          |
| JS SDK 팝업 호출 함수            | `KcpPaymentButton.tsx`        | 예: `window.KCP.pay(params)`     |
| 신용카드 결제 준비 파라미터 목록 | `prepareCardPayment()`        | site_cd, ordr_idxx, good_mny 등  |
| 가상계좌 발급 API 엔드포인트     | `prepareVbank()`              | 예: `/v1/api/payments/vbank`     |
| 가상계좌 발급 요청 파라미터      | `prepareVbank()`              | bank_cd, va_date 등              |
| 가상계좌 응답 파라미터           | `prepareVbank()`              | va_no, va_bank_nm, va_date 등    |
| 환불(취소) API 엔드포인트        | `refund()`                    | 예: `/v1/api/payments/cancel`    |
| 환불 요청 파라미터               | `refund()`                    | tno, mod_mny, cncl_type 등       |
| Webhook 서명 헤더명              | `handleWebhook()`             | 예: `kcp-signature`              |
| Webhook 서명 검증 알고리즘       | `handleWebhook()`             | HMAC-SHA256 예상                 |
| Webhook 결과코드 성공값          | `handleWebhook()`             | 예: `'0000'`                     |
| Webhook 파라미터 이름 목록       | `handleWebhook()`             | tno, ordr_idxx, pay_method 등    |
| Sandbox 사이트 코드 / 사이트 키  | `.env`                        | 개발자 센터에서 발급             |

---

## 파일 구조

**백엔드 신규 생성**

- `apps/backend/src/payments/kcp-easypay.service.ts`
- `apps/backend/src/payments/kcp-easypay.service.spec.ts`
- `apps/backend/src/payments/dto/kcp-card-prepare.dto.ts`
- `apps/backend/src/payments/dto/kcp-vbank-prepare.dto.ts`

**백엔드 수정**

- `apps/backend/prisma/schema.prisma` — PaymentStatus 및 Payment 모델
- `apps/backend/src/payments/payments.service.ts` — Stripe 코드 제거
- `apps/backend/src/payments/payments.service.spec.ts` — Stripe 테스트 제거
- `apps/backend/src/payments/payment-gateway.service.ts` — `'stripe'` → `'kcpeasypay'`
- `apps/backend/src/payments/payment-gateway.service.spec.ts` — 테스트 갱신
- `apps/backend/src/payments/payments.module.ts` — Stripe 제거, KCP 등록
- `apps/backend/src/payments/payments.controller.ts` — KCP 엔드포인트 추가, Stripe 제거
- `.env.example` — 환경변수 교체

**백엔드 삭제**

- `apps/backend/src/payments/dto/create-payment-intent.dto.ts`

**프론트엔드 신규 생성**

- `apps/frontend/src/components/payments/KcpPaymentButton.tsx`
- `apps/frontend/src/components/payments/KcpPaymentButton.test.tsx`
- `apps/frontend/src/components/payments/VirtualAccountInfo.tsx`
- `apps/frontend/src/components/payments/VirtualAccountInfo.test.tsx`
- `apps/frontend/src/app/(auth)/checkout/kcp/result/page.tsx`

**프론트엔드 수정**

- `apps/frontend/src/lib/types/order.ts`
- `apps/frontend/src/lib/api/payments.ts`
- `apps/frontend/src/components/checkout/CheckoutContent.tsx`
- `apps/frontend/src/components/checkout/CheckoutContent.test.tsx`

**프론트엔드 삭제**

- `apps/frontend/src/components/payments/StripePaymentForm.tsx`
- `apps/frontend/src/components/payments/StripePaymentForm.test.tsx`

---

## Task 1: Prisma 스키마 갱신 및 마이그레이션

**Files:**

- Modify: `apps/backend/prisma/schema.prisma`

- [ ] **Step 1: schema.prisma 수정 — PaymentStatus에 AWAITING_DEPOSIT 추가**

```prisma
enum PaymentStatus {
  PENDING
  AWAITING_DEPOSIT
  COMPLETED
  FAILED
  REFUNDED
}
```

- [ ] **Step 2: schema.prisma 수정 — Payment 모델에 가상계좌 컬럼 추가**

```prisma
model Payment {
  id            String        @id @default(cuid())
  orderId       String        @unique
  status        PaymentStatus @default(PENDING)
  amount        Int
  paymentMethod String
  paymentKey    String?
  paidAt        DateTime?
  // 가상계좌 전용 (신용카드 결제 시 null)
  virtualAccountNumber String?
  virtualBankName      String?
  virtualAccountExpiry DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  order   Order          @relation(fields: [orderId], references: [id])
  refunds Refund[]
  events  PaymentEvent[]

  @@map("payments")
}
```

- [ ] **Step 3: 마이그레이션 실행**

```bash
cd apps/backend && npx prisma migrate dev --name add_kcp_payment_fields
```

Expected: 마이그레이션 파일 생성 및 적용 성공 메시지

- [ ] **Step 4: Prisma client 재생성 확인**

```bash
cd apps/backend && npx prisma generate
```

Expected: Generated Prisma Client 성공

- [ ] **Step 5: 커밋**

```bash
git add apps/backend/prisma/
git commit -m "feat: add AWAITING_DEPOSIT status and virtual account fields for KCP"
```

---

## Task 2: KcpEasyPayService 골격 및 신용카드 결제 준비 TDD

**Files:**

- Create: `apps/backend/src/payments/kcp-easypay.service.spec.ts`
- Create: `apps/backend/src/payments/kcp-easypay.service.ts`
- Create: `apps/backend/src/payments/dto/kcp-card-prepare.dto.ts`

- [ ] **Step 1: DTO 작성**

`apps/backend/src/payments/dto/kcp-card-prepare.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class KcpCardPrepareDto {
  @ApiProperty({ description: '결제할 주문 ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;
}
```

- [ ] **Step 2: 실패할 테스트 작성 (신용카드 결제 준비)**

`apps/backend/src/payments/kcp-easypay.service.spec.ts`:

```typescript
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { KcpEasyPayService } from './kcp-easypay.service';
import { PrismaService } from '../prisma/prisma.service';

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  totalAmount: 50000,
  status: 'PENDING',
  payment: null,
  items: [
    {
      quantity: 1,
      variant: { product: { name: '베이비 롬퍼' } },
    },
  ],
};

const mockPrisma = {
  order: { findUnique: jest.fn() },
  payment: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  paymentEvent: { findUnique: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      KCP_SITE_CODE: 'T0000',
      KCP_SITE_KEY: 'test-site-key',
      KCP_SANDBOX: 'true',
    };
    return map[key] ?? '';
  }),
};

describe('KcpEasyPayService', () => {
  let service: KcpEasyPayService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        KcpEasyPayService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(KcpEasyPayService);
    jest.clearAllMocks();
    mockPrisma.paymentEvent.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation((fn: unknown) =>
      typeof fn === 'function' ? fn(mockPrisma) : Promise.all(fn as Promise<unknown>[]),
    );
  });

  describe('prepareCardPayment', () => {
    it('주문 미존재 → NotFoundException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.prepareCardPayment('user-1', 'order-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('타인 주문 접근 → ForbiddenException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, userId: 'other' });
      await expect(service.prepareCardPayment('user-1', 'order-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('이미 결제된 주문 → BadRequestException', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: { status: 'COMPLETED' },
      });
      await expect(service.prepareCardPayment('user-1', 'order-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('정상 주문 → KCP 결제창 파라미터 반환', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.upsert.mockResolvedValue({ id: 'payment-1' });

      const result = await service.prepareCardPayment('user-1', 'order-1');

      expect(result).toMatchObject({
        siteCode: 'T0000',
        orderId: 'order-1',
        amount: 50000,
        productName: '베이비 롬퍼',
      });
      expect(result.signData).toBeDefined();
      expect(mockPrisma.payment.upsert).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        create: {
          orderId: 'order-1',
          amount: 50000,
          paymentMethod: 'kcpeasypay',
          status: 'PENDING',
        },
        update: { status: 'PENDING' },
      });
    });
  });
});
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

```bash
pnpm --filter @yueeroom/backend test -- --silent kcp-easypay.service
```

Expected: FAIL (KcpEasyPayService not found)

- [ ] **Step 4: KcpEasyPayService 골격 및 prepareCardPayment 구현**

`apps/backend/src/payments/kcp-easypay.service.ts`:

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { IPaymentProvider } from './interfaces/payment-provider.interface';
import { isUniqueConstraintError } from './utils/prisma-error.util';

// 【확인 필요】KCP 이지페이 개발자 센터에서 아래 URL 및 파라미터 이름 확인
const KCP_API_BASE_SANDBOX = 'https://testpayx.kcp.co.kr'; // 【확인 필요】
const KCP_API_BASE_PROD = 'https://payx.kcp.co.kr'; // 【확인 필요】
const KCP_VBANK_ENDPOINT = '/v1/api/payments/vbank'; // 【확인 필요】
const KCP_CANCEL_ENDPOINT = '/v1/api/payments/cancel'; // 【확인 필요】

export interface KcpWebhookBody {
  res_cd: string; // 결과코드, 성공='0000' 【확인 필요】
  res_msg: string; // 결과 메시지 【확인 필요】
  tno: string; // KCP 거래번호 (paymentKey) 【확인 필요】
  ordr_idxx: string; // 주문번호 【확인 필요】
  pay_method: string; // 결제수단 'CARD'|'VBANK'|'VBANK_DEPOSIT' 【확인 필요】
  good_mny: string; // 결제금액 (문자열) 【확인 필요】
  va_bank_cd?: string; // 가상계좌 은행코드 【확인 필요】
  va_no?: string; // 가상계좌번호 【확인 필요】
  va_date?: string; // 입금기한 YYYYMMDDHHMMSS 【확인 필요】
  va_bank_nm?: string; // 은행명 【확인 필요】
}

@Injectable()
export class KcpEasyPayService implements IPaymentProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get apiBase(): string {
    return this.config.get<string>('KCP_SANDBOX') === 'true'
      ? KCP_API_BASE_SANDBOX
      : KCP_API_BASE_PROD;
  }

  private get siteCode(): string {
    const code = this.config.get<string>('KCP_SITE_CODE');
    if (!code) throw new InternalServerErrorException('KCP_SITE_CODE가 설정되지 않았습니다.');
    return code;
  }

  private get siteKey(): string {
    const key = this.config.get<string>('KCP_SITE_KEY');
    if (!key) throw new InternalServerErrorException('KCP_SITE_KEY가 설정되지 않았습니다.');
    return key;
  }

  // 【확인 필요】서명 생성 알고리즘은 KCP 문서 확인 후 수정
  private generateSignData(orderId: string, amount: number, timestamp: string): string {
    const raw = `${this.siteCode}^${orderId}^${amount}^${timestamp}`;
    return createHmac('sha256', this.siteKey).update(raw).digest('hex');
  }

  async prepareCardPayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: { include: { variant: { include: { product: true } } } } },
    });

    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    if (order.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    if (order.payment?.status === 'COMPLETED') {
      throw new BadRequestException('이미 결제된 주문입니다.');
    }

    const productName =
      order.items[0]?.variant?.product?.name ??
      '유이룸 상품' + (order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : '');

    const timestamp = Date.now().toString();
    const signData = this.generateSignData(orderId, order.totalAmount, timestamp);

    await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        amount: order.totalAmount,
        paymentMethod: 'kcpeasypay',
        status: 'PENDING',
      },
      update: { status: 'PENDING' },
    });

    // 【확인 필요】프론트엔드 KCP JS SDK가 요구하는 파라미터 이름 확인 후 수정
    return {
      siteCode: this.siteCode,
      orderId,
      amount: order.totalAmount,
      productName,
      timestamp,
      signData,
    };
  }

  async prepareVbank(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: { include: { variant: { include: { product: true } } } } },
    });

    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    if (order.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    if (order.payment?.status === 'COMPLETED') {
      throw new BadRequestException('이미 결제된 주문입니다.');
    }

    const productName =
      order.items[0]?.variant?.product?.name ??
      '유이룸 상품' + (order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : '');

    // 【확인 필요】가상계좌 발급 API 요청 파라미터 이름 및 타입 확인
    const response = await fetch(`${this.apiBase}${KCP_VBANK_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 【확인 필요】KCP 인증 헤더 방식 확인 (Basic Auth / Bearer / HMAC)
        Authorization: `Basic ${Buffer.from(`${this.siteCode}:${this.siteKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        site_cd: this.siteCode, // 【확인 필요】파라미터 이름
        ordr_idxx: orderId, // 【확인 필요】파라미터 이름
        good_name: productName, // 【확인 필요】파라미터 이름
        good_mny: String(order.totalAmount), // 【확인 필요】파라미터 이름
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('가상계좌 발급 요청에 실패했습니다.');
    }

    // 【확인 필요】KCP 가상계좌 발급 응답 파라미터 이름 확인
    const result = (await response.json()) as {
      res_cd: string; // 【확인 필요】
      tno: string; // KCP 거래번호 【확인 필요】
      va_no: string; // 가상계좌번호 【확인 필요】
      va_bank_nm: string; // 은행명 【확인 필요】
      va_date: string; // 입금기한 YYYYMMDDHHMMSS 【확인 필요】
    };

    if (result.res_cd !== '0000') {
      // 【확인 필요】성공 코드
      throw new InternalServerErrorException('가상계좌 발급에 실패했습니다.');
    }

    // va_date: 'YYYYMMDDHHMMSS' → Date 변환 【확인 필요】날짜 형식
    const expiryStr = result.va_date;
    const expiry = new Date(
      `${expiryStr.slice(0, 4)}-${expiryStr.slice(4, 6)}-${expiryStr.slice(6, 8)}T` +
        `${expiryStr.slice(8, 10)}:${expiryStr.slice(10, 12)}:${expiryStr.slice(12, 14)}+09:00`,
    );

    await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        amount: order.totalAmount,
        paymentMethod: 'kcpeasypay',
        paymentKey: result.tno,
        status: 'AWAITING_DEPOSIT',
        virtualAccountNumber: result.va_no,
        virtualBankName: result.va_bank_nm,
        virtualAccountExpiry: expiry,
      },
      update: {
        paymentKey: result.tno,
        status: 'AWAITING_DEPOSIT',
        virtualAccountNumber: result.va_no,
        virtualBankName: result.va_bank_nm,
        virtualAccountExpiry: expiry,
      },
    });

    return {
      accountNumber: result.va_no,
      bankName: result.va_bank_nm,
      expiresAt: expiry,
      amount: order.totalAmount,
    };
  }

  async refund(paymentKey: string, amount: number, reason?: string): Promise<void> {
    // 【확인 필요】환불 API 파라미터 이름 및 인증 방식 확인
    const response = await fetch(`${this.apiBase}${KCP_CANCEL_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.siteCode}:${this.siteKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        tno: paymentKey, // 【확인 필요】파라미터 이름
        mod_type: 'FULL', // 【확인 필요】전액 취소 코드
        cncl_type: '0', // 【확인 필요】취소 유형
        cncl_mny: String(amount), // 【확인 필요】파라미터 이름
        cncl_rsn: reason ?? '고객 요청 환불', // 【확인 필요】파라미터 이름
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('KCP 환불 요청에 실패했습니다.');
    }

    const result = (await response.json()) as { res_cd: string }; // 【확인 필요】
    if (result.res_cd !== '0000') {
      // 【확인 필요】성공 코드
      throw new BadRequestException('KCP 환불 처리에 실패했습니다.');
    }
  }

  async handleWebhook(body: KcpWebhookBody, signature: string): Promise<void> {
    // 【확인 필요】Webhook 서명 검증 방식 (헤더명, 알고리즘) 확인
    this.verifyWebhookSignature(body, signature);

    const { tno, ordr_idxx: orderId, pay_method, res_cd } = body;
    if (!orderId || !tno) return;

    const existingEvent = await this.prisma.paymentEvent.findUnique({
      where: { externalEventId: tno },
    });
    if (existingEvent) return;

    try {
      // 【확인 필요】pay_method 값 및 성공 코드 확인
      if (pay_method === 'CARD' && res_cd === '0000') {
        await this.prisma.$transaction(async (tx) => {
          const payment = await tx.payment.update({
            where: { orderId },
            data: { status: 'COMPLETED', paymentKey: tno, paidAt: new Date() },
          });
          await tx.order.update({ where: { id: orderId }, data: { status: 'PAID' } });
          await tx.paymentEvent.create({
            data: {
              externalEventId: tno,
              gateway: 'kcpeasypay',
              eventType: 'CARD_PAYMENT_COMPLETED',
              paymentId: payment.id,
            },
          });
        });
      } else if (pay_method === 'CARD' && res_cd !== '0000') {
        await this.prisma.$transaction(async (tx) => {
          const payment = await tx.payment.update({
            where: { orderId },
            data: { status: 'FAILED' },
          });
          await tx.paymentEvent.create({
            data: {
              externalEventId: tno,
              gateway: 'kcpeasypay',
              eventType: 'CARD_PAYMENT_FAILED',
              paymentId: payment.id,
            },
          });
        });
      } else if (pay_method === 'VBANK_DEPOSIT') {
        // 【확인 필요】가상계좌 입금 이벤트 구분값
        await this.prisma.$transaction(async (tx) => {
          const payment = await tx.payment.update({
            where: { orderId },
            data: { status: 'COMPLETED', paidAt: new Date() },
          });
          await tx.order.update({ where: { id: orderId }, data: { status: 'PAID' } });
          await tx.paymentEvent.create({
            data: {
              externalEventId: tno,
              gateway: 'kcpeasypay',
              eventType: 'VBANK_DEPOSIT_COMPLETED',
              paymentId: payment.id,
            },
          });
        });
      }
    } catch (error) {
      if (isUniqueConstraintError(error)) return;
      throw error;
    }
  }

  // 【확인 필요】실제 서명 검증 구현 — KCP webhook 서명 방식 확인 후 수정
  private verifyWebhookSignature(_body: KcpWebhookBody, _signature: string): void {
    // TODO: KCP webhook 서명 검증 구현
    // const expected = createHmac('sha256', this.siteKey)
    //   .update(`${body.tno}${body.ordr_idxx}${body.good_mny}`)
    //   .digest('hex');
    // if (!timingSafeEqual(Buffer.from(expected), Buffer.from(_signature))) {
    //   throw new BadRequestException('웹훅 서명 검증에 실패했습니다.');
    // }
  }
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

```bash
pnpm --filter @yueeroom/backend test -- --silent kcp-easypay.service
```

Expected: PASS (prepareCardPayment 테스트 3개 통과)

- [ ] **Step 6: 커밋**

```bash
git add apps/backend/src/payments/kcp-easypay.service.ts \
        apps/backend/src/payments/kcp-easypay.service.spec.ts \
        apps/backend/src/payments/dto/kcp-card-prepare.dto.ts
git commit -m "feat: add KcpEasyPayService with card payment prepare"
```

---

## Task 3: KcpEasyPayService — 가상계좌·webhook·환불 TDD

**Files:**

- Modify: `apps/backend/src/payments/kcp-easypay.service.spec.ts`
- Create: `apps/backend/src/payments/dto/kcp-vbank-prepare.dto.ts`

- [ ] **Step 1: vbank DTO 작성**

`apps/backend/src/payments/dto/kcp-vbank-prepare.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class KcpVbankPrepareDto {
  @ApiProperty({ description: '결제할 주문 ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;
}
```

- [ ] **Step 2: kcp-easypay.service.spec.ts에 가상계좌/webhook/환불 테스트 추가**

`kcp-easypay.service.spec.ts`의 기존 `describe('KcpEasyPayService')` 블록 안에 추가:

```typescript
describe('prepareVbank', () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    global.fetch = mockFetch;
  });

  it('주문 미존재 → NotFoundException', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    await expect(service.prepareVbank('user-1', 'order-x')).rejects.toThrow(NotFoundException);
  });

  it('KCP API 호출 성공 → 계좌 정보 반환 및 AWAITING_DEPOSIT 저장', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        res_cd: '0000',
        tno: 'kcp-tno-001',
        va_no: '1234567890',
        va_bank_nm: '국민은행',
        va_date: '20260610150000',
      }),
    });
    mockPrisma.payment.upsert.mockResolvedValue({ id: 'payment-1' });

    const result = await service.prepareVbank('user-1', 'order-1');

    expect(result).toMatchObject({
      accountNumber: '1234567890',
      bankName: '국민은행',
      amount: 50000,
    });
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(mockPrisma.payment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: 'AWAITING_DEPOSIT',
          virtualAccountNumber: '1234567890',
          virtualBankName: '국민은행',
        }),
      }),
    );
  });

  it('KCP API 응답 실패 → InternalServerErrorException', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ res_cd: '9999' }),
    });
    await expect(service.prepareVbank('user-1', 'order-1')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});

describe('handleWebhook', () => {
  it('CARD 결제 성공 webhook → Payment COMPLETED, Order PAID', async () => {
    mockPrisma.payment.update.mockResolvedValue({ id: 'payment-1' });
    mockPrisma.order.update.mockResolvedValue({});
    mockPrisma.paymentEvent.create.mockResolvedValue({});

    await service.handleWebhook(
      {
        res_cd: '0000',
        res_msg: '정상',
        tno: 'kcp-tno-001',
        ordr_idxx: 'order-1',
        pay_method: 'CARD',
        good_mny: '50000',
      },
      'test-signature',
    );

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { orderId: 'order-1' },
      data: { status: 'COMPLETED', paymentKey: 'kcp-tno-001', paidAt: expect.any(Date) },
    });
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'PAID' },
    });
  });

  it('CARD 결제 실패 webhook → Payment FAILED', async () => {
    mockPrisma.payment.update.mockResolvedValue({ id: 'payment-1' });
    mockPrisma.paymentEvent.create.mockResolvedValue({});

    await service.handleWebhook(
      {
        res_cd: '8100',
        res_msg: '결제 실패',
        tno: 'kcp-tno-002',
        ordr_idxx: 'order-1',
        pay_method: 'CARD',
        good_mny: '50000',
      },
      'test-signature',
    );

    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { orderId: 'order-1' },
      data: { status: 'FAILED' },
    });
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it('가상계좌 입금 webhook → Payment COMPLETED, Order PAID', async () => {
    mockPrisma.payment.update.mockResolvedValue({ id: 'payment-1' });
    mockPrisma.order.update.mockResolvedValue({});
    mockPrisma.paymentEvent.create.mockResolvedValue({});

    await service.handleWebhook(
      {
        res_cd: '0000',
        res_msg: '입금',
        tno: 'kcp-tno-003',
        ordr_idxx: 'order-1',
        pay_method: 'VBANK_DEPOSIT',
        good_mny: '50000',
      },
      'test-signature',
    );

    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { orderId: 'order-1' },
      data: { status: 'COMPLETED', paidAt: expect.any(Date) },
    });
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'PAID' },
    });
  });

  it('중복 tno webhook → 멱등성 보장, DB 업데이트 없음', async () => {
    mockPrisma.paymentEvent.findUnique.mockResolvedValue({ id: 'event-1' });

    await service.handleWebhook(
      {
        res_cd: '0000',
        res_msg: '정상',
        tno: 'kcp-tno-dup',
        ordr_idxx: 'order-1',
        pay_method: 'CARD',
        good_mny: '50000',
      },
      'test-signature',
    );

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('refund', () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    global.fetch = mockFetch;
  });

  it('KCP 환불 API 호출 성공', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ res_cd: '0000' }),
    });

    await expect(service.refund('kcp-tno-001', 50000, '고객 변심')).resolves.not.toThrow();
  });

  it('KCP 환불 API 응답 실패 → BadRequestException', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ res_cd: '9999' }),
    });

    await expect(service.refund('kcp-tno-001', 50000)).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 3: 테스트 실행 → 통과 확인**

```bash
pnpm --filter @yueeroom/backend test -- --silent kcp-easypay.service
```

Expected: PASS (전체 테스트 통과)

- [ ] **Step 4: 커밋**

```bash
git add apps/backend/src/payments/kcp-easypay.service.spec.ts \
        apps/backend/src/payments/dto/kcp-vbank-prepare.dto.ts
git commit -m "test: complete KcpEasyPayService test coverage"
```

---

## Task 4: PaymentsService Stripe 코드 제거

**Files:**

- Modify: `apps/backend/src/payments/payments.service.ts`
- Modify: `apps/backend/src/payments/payments.service.spec.ts`

- [ ] **Step 1: payments.service.ts 수정 — Stripe 코드 제거**

`apps/backend/src/payments/payments.service.ts`를 아래로 교체:

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentListResponseDto, RefundResponseDto } from './dto/payment-response.dto';
import { isUniqueConstraintError } from './utils/prisma-error.util';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPayments(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaymentListResponseDto> {
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { order: { userId } },
        select: {
          id: true,
          orderId: true,
          status: true,
          amount: true,
          paymentMethod: true,
          paidAt: true,
          virtualAccountNumber: true,
          virtualBankName: true,
          virtualAccountExpiry: true,
          createdAt: true,
          updatedAt: true,
          order: {
            select: {
              id: true,
              userId: true,
              addressId: true,
              status: true,
              totalAmount: true,
              shippingFee: true,
              carrier: true,
              trackingNumber: true,
              createdAt: true,
              updatedAt: true,
              items: {
                select: {
                  id: true,
                  orderId: true,
                  variantId: true,
                  quantity: true,
                  unitPrice: true,
                  createdAt: true,
                  variant: {
                    select: {
                      id: true,
                      productId: true,
                      size: true,
                      color: true,
                      sku: true,
                      price: true,
                      createdAt: true,
                      updatedAt: true,
                      product: {
                        select: {
                          id: true,
                          productCode: true,
                          categoryId: true,
                          brandId: true,
                          name: true,
                          description: true,
                          basePrice: true,
                          isActive: true,
                          createdAt: true,
                          updatedAt: true,
                          images: {
                            select: {
                              id: true,
                              productId: true,
                              url: true,
                              key: true,
                              order: true,
                              createdAt: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: { order: { userId } } }),
    ]);
    return { items: payments, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async requestRefund(
    userId: string,
    paymentId: string,
    reason: string,
  ): Promise<RefundResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('결제를 찾을 수 없습니다.');
    if (payment.order.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    if (payment.status !== 'COMPLETED')
      throw new BadRequestException('환불 가능한 결제 상태가 아닙니다.');

    const existingRefund = await this.prisma.refund.findFirst({
      where: { paymentId, status: { in: ['REQUESTED', 'COMPLETED'] } },
    });
    if (existingRefund) {
      throw new ConflictException('이미 처리 중인 환불 요청이 있습니다');
    }

    return this.prisma.refund.create({
      data: { orderId: payment.orderId, paymentId: payment.id, amount: payment.amount, reason },
    });
  }
}
```

- [ ] **Step 2: payments.service.spec.ts 수정 — Stripe 의존성 제거**

`payments.service.spec.ts`의 `describe('PaymentsService')` 블록을 아래로 교체.  
Stripe mock(`mockStripe`, `mockStripePaymentIntent`) 및 `STRIPE_CLIENT` provider 제거.  
`createPaymentIntent`, `handleWebhookEvent` describe 블록 전체 삭제.  
`getUserPayments`, `requestRefund` 테스트는 유지.

변경 후 `beforeEach` 내 모듈 설정:

```typescript
beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [PaymentsService, { provide: PrismaService, useValue: mockPrisma }],
  }).compile();

  service = module.get<PaymentsService>(PaymentsService);
  jest.clearAllMocks();
  mockPrisma.refund.findFirst.mockResolvedValue(null);
});
```

- [ ] **Step 3: 테스트 실행 → 통과 확인**

```bash
pnpm --filter @yueeroom/backend test -- --silent payments.service
```

Expected: PASS

- [ ] **Step 4: create-payment-intent.dto.ts 삭제**

```bash
rm apps/backend/src/payments/dto/create-payment-intent.dto.ts
```

- [ ] **Step 5: 커밋**

```bash
git add apps/backend/src/payments/payments.service.ts \
        apps/backend/src/payments/payments.service.spec.ts
git rm apps/backend/src/payments/dto/create-payment-intent.dto.ts
git commit -m "refactor: remove Stripe code from PaymentsService"
```

---

## Task 5: PaymentGatewayService 교체 + Controller + Module 갱신

**Files:**

- Modify: `apps/backend/src/payments/payment-gateway.service.ts`
- Modify: `apps/backend/src/payments/payment-gateway.service.spec.ts`
- Modify: `apps/backend/src/payments/payments.controller.ts`
- Modify: `apps/backend/src/payments/payments.module.ts`

- [ ] **Step 1: payment-gateway.service.ts 수정 — 'stripe' → 'kcpeasypay'**

```typescript
import { BadRequestException, Injectable } from '@nestjs/common';
import type { IPaymentProvider } from './interfaces/payment-provider.interface';
import { KakaoPayService } from './kakao-pay.service';
import { KcpEasyPayService } from './kcp-easypay.service';
import { NaverPayService } from './naver-pay.service';

@Injectable()
export class PaymentGatewayService {
  private readonly providers: Map<string, IPaymentProvider>;

  constructor(
    kcpEasyPayService: KcpEasyPayService,
    naverPayService: NaverPayService,
    kakaoPayService: KakaoPayService,
  ) {
    this.providers = new Map<string, IPaymentProvider>([
      ['kcpeasypay', kcpEasyPayService],
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
    if (!payment.paymentKey) throw new BadRequestException('결제 키가 없어 환불할 수 없습니다.');
    await provider.refund(payment.paymentKey, amount, reason);
  }
}
```

- [ ] **Step 2: payment-gateway.service.spec.ts 수정 — 'stripe' → 'kcpeasypay'**

```typescript
import { BadRequestException } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';

describe('PaymentGatewayService', () => {
  const kcpEasyPayService = { refund: jest.fn() };
  const naverPayService = { refund: jest.fn() };
  const kakaoPayService = { refund: jest.fn() };
  let service: PaymentGatewayService;

  beforeEach(() => {
    service = new PaymentGatewayService(
      kcpEasyPayService as never,
      naverPayService as never,
      kakaoPayService as never,
    );
    jest.clearAllMocks();
  });

  it('kcpeasypay 결제 수단은 KcpEasyPayService로 환불한다', async () => {
    await service.refund({ paymentMethod: 'kcpeasypay', paymentKey: 'kcp-tno-001' }, 80000, '환불');
    expect(kcpEasyPayService.refund).toHaveBeenCalledWith('kcp-tno-001', 80000, '환불');
    expect(naverPayService.refund).not.toHaveBeenCalled();
  });

  it('naverpay → NaverPayService', async () => {
    await service.refund({ paymentMethod: 'naverpay', paymentKey: 'naver-id' }, 80000, '고객 요청');
    expect(naverPayService.refund).toHaveBeenCalledWith('naver-id', 80000, '고객 요청');
  });

  it('kakaopay → KakaoPayService', async () => {
    await service.refund({ paymentMethod: 'kakaopay', paymentKey: 'T469b847' }, 80000, '환불');
    expect(kakaoPayService.refund).toHaveBeenCalledWith('T469b847', 80000, '환불');
  });

  it('미지원 결제 수단 → BadRequestException', async () => {
    await expect(
      service.refund({ paymentMethod: 'unknown', paymentKey: 'key' }, 1000),
    ).rejects.toThrow(BadRequestException);
  });

  it('paymentKey null → BadRequestException', async () => {
    await expect(
      service.refund({ paymentMethod: 'kcpeasypay', paymentKey: null }, 1000),
    ).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 3: payments.controller.ts 수정 — Stripe 엔드포인트 제거, KCP 추가**

```typescript
import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateRefundDto } from './dto/create-refund.dto';
import { GetPaymentsQueryDto } from './dto/get-payments-query.dto';
import { KakaoPayApproveDto } from './dto/kakao-pay-approve.dto';
import { KakaoPayReadyDto } from './dto/kakao-pay-ready.dto';
import { KcpCardPrepareDto } from './dto/kcp-card-prepare.dto';
import { KcpVbankPrepareDto } from './dto/kcp-vbank-prepare.dto';
import { NaverPayApproveDto } from './dto/naver-pay-approve.dto';
import { NaverPayPrepareDto } from './dto/naver-pay-prepare.dto';
import { PaymentListResponseDto, RefundResponseDto } from './dto/payment-response.dto';
import { KakaoPayService, type KakaoPayWebhookPayload } from './kakao-pay.service';
import { KcpEasyPayService, type KcpWebhookBody } from './kcp-easypay.service';
import { NaverPayService } from './naver-pay.service';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly kcpEasyPayService: KcpEasyPayService,
    private readonly naverPayService: NaverPayService,
    private readonly kakaoPayService: KakaoPayService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: '내 결제 내역 조회' })
  @ApiOkResponse({ type: PaymentListResponseDto })
  getMyPayments(@CurrentUser() user: JwtPayload, @Query() query: GetPaymentsQueryDto) {
    return this.paymentsService.getUserPayments(user.sub, query.page, query.limit);
  }

  @Post(':paymentId/refund')
  @ApiOperation({ summary: '환불 신청' })
  @ApiCreatedResponse({ type: RefundResponseDto })
  requestRefund(
    @CurrentUser() user: JwtPayload,
    @Param('paymentId') paymentId: string,
    @Body() dto: CreateRefundDto,
  ) {
    return this.paymentsService.requestRefund(user.sub, paymentId, dto.reason);
  }

  @Post('kcp/card/prepare')
  @ApiOperation({ summary: 'KCP 신용카드 결제 파라미터 생성' })
  kcpCardPrepare(@CurrentUser() user: JwtPayload, @Body() dto: KcpCardPrepareDto) {
    return this.kcpEasyPayService.prepareCardPayment(user.sub, dto.orderId);
  }

  @Post('kcp/vbank/prepare')
  @ApiOperation({ summary: 'KCP 가상계좌 발급' })
  kcpVbankPrepare(@CurrentUser() user: JwtPayload, @Body() dto: KcpVbankPrepareDto) {
    return this.kcpEasyPayService.prepareVbank(user.sub, dto.orderId);
  }

  @Post('kcp/webhook')
  @Public()
  @ApiOperation({ summary: 'KCP webhook 처리' })
  handleKcpWebhook(
    @Body() body: KcpWebhookBody,
    @Headers('kcp-signature') signature: string, // 【확인 필요】헤더명
  ) {
    return this.kcpEasyPayService.handleWebhook(body, signature);
  }

  @Post('naver/webhook')
  @Public()
  @ApiOperation({ summary: '네이버페이 웹훅 처리' })
  handleNaverWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-naverpay-signature') signature: string,
  ) {
    return this.naverPayService.handleWebhook(req.rawBody!.toString('utf-8'), signature);
  }

  @Post('naver/prepare')
  @ApiOperation({ summary: '네이버페이 결제 준비' })
  naverPayPrepare(@CurrentUser() user: JwtPayload, @Body() dto: NaverPayPrepareDto) {
    return this.naverPayService.preparePayment(user.sub, dto.orderId);
  }

  @Post('naver/approve')
  @ApiOperation({ summary: '네이버페이 결제 승인' })
  naverPayApprove(@CurrentUser() user: JwtPayload, @Body() dto: NaverPayApproveDto) {
    return this.naverPayService.approvePayment(user.sub, dto.paymentId, dto.merchantPayKey);
  }

  @Post('kakao/ready')
  @ApiOperation({ summary: '카카오페이 결제 준비' })
  kakaoPayReady(@CurrentUser() user: JwtPayload, @Body() dto: KakaoPayReadyDto) {
    return this.kakaoPayService.readyPayment(user.sub, dto.orderId);
  }

  @Post('kakao/approve')
  @ApiOperation({ summary: '카카오페이 결제 승인' })
  kakaoPayApprove(@CurrentUser() user: JwtPayload, @Body() dto: KakaoPayApproveDto) {
    return this.kakaoPayService.approvePayment(user.sub, dto.orderId, dto.pgToken);
  }

  @Post('kakao/webhook')
  @Public()
  @ApiOperation({ summary: '카카오페이 웹훅 처리' })
  handleKakaoWebhook(
    @Body() body: KakaoPayWebhookPayload,
    @Headers('authorization') authorization?: string,
  ) {
    return this.kakaoPayService.handleWebhook(body, authorization);
  }
}
```

- [ ] **Step 4: payments.module.ts 수정**

```typescript
import { Module } from '@nestjs/common';
import { KakaoPayService } from './kakao-pay.service';
import { KcpEasyPayService } from './kcp-easypay.service';
import { NaverPayService } from './naver-pay.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    KcpEasyPayService,
    PaymentGatewayService,
    NaverPayService,
    KakaoPayService,
  ],
  exports: [PaymentsService, PaymentGatewayService],
})
export class PaymentsModule {}
```

- [ ] **Step 5: 테스트 실행**

```bash
pnpm --filter @yueeroom/backend test -- --silent payment-gateway.service
```

Expected: PASS (5개 테스트 통과)

- [ ] **Step 6: 백엔드 빌드 확인**

```bash
pnpm --filter @yueeroom/backend build
```

Expected: 빌드 성공 (오류 없음)

- [ ] **Step 7: 커밋**

```bash
git add apps/backend/src/payments/payment-gateway.service.ts \
        apps/backend/src/payments/payment-gateway.service.spec.ts \
        apps/backend/src/payments/payments.controller.ts \
        apps/backend/src/payments/payments.module.ts
git commit -m "feat: replace stripe with kcpeasypay in gateway, controller, module"
```

---

## Task 6: 환경변수 교체

**Files:**

- Modify: `.env.example`

- [ ] **Step 1: .env.example 수정**

`.env.example`에서 `# 결제 - Stripe` 섹션을 아래로 교체:

```ini
# 결제 - KCP 이지페이
KCP_SITE_CODE=your-kcp-site-code        # 개발자 센터에서 발급
KCP_SITE_KEY=your-kcp-site-key          # 개발자 센터에서 발급
KCP_SANDBOX=true                         # 운영 시 false
```

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...` 라인도 제거한다.

- [ ] **Step 2: 커밋**

```bash
git add .env.example
git commit -m "chore: replace Stripe env vars with KCP in .env.example"
```

---

## Task 7: 프론트엔드 타입 및 API 클라이언트 교체

**Files:**

- Modify: `apps/frontend/src/lib/types/order.ts`
- Modify: `apps/frontend/src/lib/api/payments.ts`

- [ ] **Step 1: PaymentMethod 타입 수정**

`apps/frontend/src/lib/types/order.ts` 파일에서:

```typescript
// 변경 전
export type PaymentMethod = 'kakaopay' | 'naverpay' | 'stripe';

// 변경 후
export type PaymentMethod = 'kakaopay' | 'naverpay' | 'kcpeasypay' | 'kcpeasypay-vbank';
```

- [ ] **Step 2: payments.ts 수정 — Stripe 함수 제거, KCP 함수 추가**

`apps/frontend/src/lib/api/payments.ts` 전체를 아래로 교체:

```typescript
import { apiClient } from './client';
import type { PaginatedPaymentsResponse, Refund } from '../types/order';

export async function getPayments(page = 1, limit = 10): Promise<PaginatedPaymentsResponse> {
  const res = await apiClient.get<PaginatedPaymentsResponse>('/payments/me', {
    params: { page, limit },
  });
  return res.data;
}

export async function requestRefund(paymentId: string, reason: string): Promise<Refund> {
  const res = await apiClient.post<Refund>(`/payments/${paymentId}/refund`, { reason });
  return res.data;
}

export interface KcpCardPrepareResponse {
  siteCode: string;
  orderId: string;
  amount: number;
  productName: string;
  timestamp: string;
  signData: string;
  // 【확인 필요】KCP JS SDK가 요구하는 추가 파라미터
}

export async function kcpCardPrepare(orderId: string): Promise<KcpCardPrepareResponse> {
  const { data } = await apiClient.post<KcpCardPrepareResponse>('/payments/kcp/card/prepare', {
    orderId,
  });
  return data;
}

export interface KcpVbankPrepareResponse {
  accountNumber: string;
  bankName: string;
  expiresAt: string;
  amount: number;
}

export async function kcpVbankPrepare(orderId: string): Promise<KcpVbankPrepareResponse> {
  const { data } = await apiClient.post<KcpVbankPrepareResponse>('/payments/kcp/vbank/prepare', {
    orderId,
  });
  return data;
}

export interface NaverPayPrepareResponse {
  paymentId: string;
  merchantPayKey: string;
  paymentURL: string;
}

export async function naverPayPrepare(orderId: string): Promise<NaverPayPrepareResponse> {
  const { data } = await apiClient.post<NaverPayPrepareResponse>('/payments/naver/prepare', {
    orderId,
  });
  return data;
}

export interface NaverPayApproveResponse {
  orderId: string;
  status: string;
}

export async function naverPayApprove(
  paymentId: string,
  merchantPayKey: string,
): Promise<NaverPayApproveResponse> {
  const { data } = await apiClient.post<NaverPayApproveResponse>('/payments/naver/approve', {
    paymentId,
    merchantPayKey,
  });
  return data;
}

export interface KakaoPayReadyResponse {
  tid: string;
  redirectUrl: string;
}

export async function kakaoPayReady(orderId: string): Promise<KakaoPayReadyResponse> {
  const { data } = await apiClient.post<KakaoPayReadyResponse>('/payments/kakao/ready', {
    orderId,
  });
  return data;
}

export interface KakaoPayApproveResponse {
  orderId: string;
  status: string;
}

export async function kakaoPayApprove(
  orderId: string,
  pgToken: string,
): Promise<KakaoPayApproveResponse> {
  const { data } = await apiClient.post<KakaoPayApproveResponse>('/payments/kakao/approve', {
    orderId,
    pgToken,
  });
  return data;
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/frontend/src/lib/types/order.ts \
        apps/frontend/src/lib/api/payments.ts
git commit -m "feat: replace Stripe API client with KCP in frontend"
```

---

## Task 8: KcpPaymentButton 컴포넌트 TDD

**Files:**

- Create: `apps/frontend/src/components/payments/KcpPaymentButton.tsx`
- Create: `apps/frontend/src/components/payments/KcpPaymentButton.test.tsx`

- [ ] **Step 1: 실패할 테스트 작성**

`apps/frontend/src/components/payments/KcpPaymentButton.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/api/payments', () => ({
  kcpCardPrepare: vi.fn(),
}));

import { kcpCardPrepare } from '@/lib/api/payments';
import KcpPaymentButton from './KcpPaymentButton';

const mockKcpCardPrepare = vi.mocked(kcpCardPrepare);

// 【확인 필요】KCP JS SDK 팝업 함수 mock
const mockKcpPay = vi.fn();

describe('KcpPaymentButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // KCP JS SDK가 로드된 상태 mock
    (window as unknown as Record<string, unknown>).KCP = { pay: mockKcpPay };
    mockKcpCardPrepare.mockResolvedValue({
      siteCode: 'T0000',
      orderId: 'order-1',
      amount: 50000,
      productName: '베이비 롬퍼',
      timestamp: '1234567890',
      signData: 'test-sign',
    });
  });

  it('버튼 클릭 → kcpCardPrepare 호출', async () => {
    render(<KcpPaymentButton orderId="order-1" onSuccess={vi.fn()} onError={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '신용카드 결제' }));

    await waitFor(() => {
      expect(mockKcpCardPrepare).toHaveBeenCalledWith('order-1');
    });
  });

  it('준비 성공 → KCP SDK 팝업 호출', async () => {
    render(<KcpPaymentButton orderId="order-1" onSuccess={vi.fn()} onError={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '신용카드 결제' }));

    await waitFor(() => {
      expect(mockKcpPay).toHaveBeenCalledWith(
        expect.objectContaining({
          site_cd: 'T0000',
          ordr_idxx: 'order-1',
          good_mny: '50000',
        }),
        expect.any(Function),
      );
    });
  });

  it('API 오류 → onError 콜백 호출', async () => {
    const onError = vi.fn();
    mockKcpCardPrepare.mockRejectedValue(new Error('API 오류'));

    render(<KcpPaymentButton orderId="order-1" onSuccess={vi.fn()} onError={onError} />);

    await userEvent.click(screen.getByRole('button', { name: '신용카드 결제' }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('처리 중 버튼 비활성화', async () => {
    mockKcpCardPrepare.mockReturnValue(new Promise(() => {})); // never resolves

    render(<KcpPaymentButton orderId="order-1" onSuccess={vi.fn()} onError={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '신용카드 결제' }));

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot KcpPaymentButton
```

Expected: FAIL (컴포넌트 없음)

- [ ] **Step 3: KcpPaymentButton 구현**

`apps/frontend/src/components/payments/KcpPaymentButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { kcpCardPrepare } from '@/lib/api/payments';

// 【확인 필요】KCP JS SDK 타입 정의 및 팝업 호출 방식
declare global {
  interface Window {
    KCP?: {
      // 【확인 필요】실제 함수 시그니처
      pay: (params: Record<string, string>, callback: (result: KcpPayResult) => void) => void;
    };
  }
}

interface KcpPayResult {
  res_cd: string;     // 【확인 필요】
  res_msg: string;    // 【확인 필요】
  enc_data?: string;  // 【확인 필요】
}

interface KcpPaymentButtonProps {
  orderId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function KcpPaymentButton({ orderId, onSuccess, onError }: KcpPaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    setIsProcessing(true);
    try {
      const params = await kcpCardPrepare(orderId);

      if (!window.KCP) {
        onError('KCP 결제 모듈을 불러오지 못했습니다.');
        return;
      }

      // 【확인 필요】KCP JS SDK 팝업 호출 파라미터 이름 확인 후 수정
      window.KCP.pay(
        {
          site_cd: params.siteCode,
          ordr_idxx: params.orderId,
          good_name: params.productName,
          good_mny: String(params.amount),
          timestamp: params.timestamp,
          sign_data: params.signData,
        },
        (result) => {
          if (result.res_cd === '0000') { // 【확인 필요】성공 코드
            onSuccess();
          } else {
            onError(result.res_msg || '결제에 실패했습니다.');
          }
        },
      );
    } catch {
      onError('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={() => void handleClick()}
      disabled={isProcessing}
      className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
    >
      {isProcessing ? '결제 처리 중...' : '신용카드 결제'}
    </button>
  );
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot KcpPaymentButton
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/frontend/src/components/payments/KcpPaymentButton.tsx \
        apps/frontend/src/components/payments/KcpPaymentButton.test.tsx
git commit -m "feat: add KcpPaymentButton component"
```

---

## Task 9: VirtualAccountInfo 컴포넌트 TDD

**Files:**

- Create: `apps/frontend/src/components/payments/VirtualAccountInfo.tsx`
- Create: `apps/frontend/src/components/payments/VirtualAccountInfo.test.tsx`

- [ ] **Step 1: 실패할 테스트 작성**

`apps/frontend/src/components/payments/VirtualAccountInfo.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/api/payments', () => ({
  kcpVbankPrepare: vi.fn(),
}));

import { kcpVbankPrepare } from '@/lib/api/payments';
import VirtualAccountInfo from './VirtualAccountInfo';

const mockKcpVbankPrepare = vi.mocked(kcpVbankPrepare);

const mockVbankResponse = {
  accountNumber: '1234567890',
  bankName: '국민은행',
  expiresAt: '2026-06-10T15:00:00+09:00',
  amount: 50000,
};

describe('VirtualAccountInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKcpVbankPrepare.mockResolvedValue(mockVbankResponse);
  });

  it('마운트 시 가상계좌 발급 API 호출', async () => {
    render(<VirtualAccountInfo orderId="order-1" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(mockKcpVbankPrepare).toHaveBeenCalledWith('order-1');
    });
  });

  it('발급 완료 후 계좌 정보 표시', async () => {
    render(<VirtualAccountInfo orderId="order-1" onBack={vi.fn()} />);

    expect(await screen.findByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('국민은행')).toBeInTheDocument();
    expect(screen.getByText('50,000원')).toBeInTheDocument();
  });

  it('발급 중 로딩 상태 표시', () => {
    mockKcpVbankPrepare.mockReturnValue(new Promise(() => {}));
    render(<VirtualAccountInfo orderId="order-1" onBack={vi.fn()} />);

    expect(screen.getByText('계좌 발급 중...')).toBeInTheDocument();
  });

  it('발급 오류 시 오류 메시지 표시', async () => {
    mockKcpVbankPrepare.mockRejectedValue(new Error('API 오류'));
    render(<VirtualAccountInfo orderId="order-1" onBack={vi.fn()} />);

    expect(await screen.findByText(/가상계좌 발급에 실패했습니다/)).toBeInTheDocument();
  });

  it('뒤로 가기 버튼 클릭 → onBack 호출', async () => {
    const onBack = vi.fn();
    render(<VirtualAccountInfo orderId="order-1" onBack={onBack} />);

    await screen.findByText('1234567890');
    await userEvent.click(screen.getByRole('button', { name: '뒤로' }));

    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot VirtualAccountInfo
```

Expected: FAIL (컴포넌트 없음)

- [ ] **Step 3: VirtualAccountInfo 구현**

`apps/frontend/src/components/payments/VirtualAccountInfo.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { kcpVbankPrepare, type KcpVbankPrepareResponse } from '@/lib/api/payments';
import { formatPrice } from '@/lib/utils/format';

interface VirtualAccountInfoProps {
  orderId: string;
  onBack: () => void;
}

export default function VirtualAccountInfo({ orderId, onBack }: VirtualAccountInfoProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vbankInfo, setVbankInfo] = useState<KcpVbankPrepareResponse | null>(null);

  useEffect(() => {
    void kcpVbankPrepare(orderId)
      .then(setVbankInfo)
      .catch(() => setError('가상계좌 발급에 실패했습니다. 다시 시도해주세요.'))
      .finally(() => setIsLoading(false));
  }, [orderId]);

  if (isLoading) {
    return <p className="text-sm text-gray-500">계좌 발급 중...</p>;
  }

  if (error || !vbankInfo) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{error ?? '알 수 없는 오류가 발생했습니다.'}</p>
        <button
          onClick={onBack}
          aria-label="뒤로"
          className="text-xs text-gray-500 hover:text-indigo-600"
        >
          뒤로
        </button>
      </div>
    );
  }

  const expiresAt = new Date(vbankInfo.expiresAt);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">가상계좌 입금 안내</h3>
      <dl className="space-y-2 rounded-xl border border-gray-100 p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">은행</dt>
          <dd className="font-medium text-gray-900">{vbankInfo.bankName}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">계좌번호</dt>
          <dd className="font-medium text-gray-900">{vbankInfo.accountNumber}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">입금액</dt>
          <dd className="font-semibold text-indigo-600">{formatPrice(vbankInfo.amount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">입금 기한</dt>
          <dd className="text-gray-900">
            {expiresAt.toLocaleDateString('ko-KR')} {expiresAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-gray-400">
        입금 완료 후 자동으로 주문이 확정됩니다.
      </p>
      <button
        onClick={onBack}
        aria-label="뒤로"
        className="text-xs text-gray-500 hover:text-indigo-600"
      >
        뒤로
      </button>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot VirtualAccountInfo
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/frontend/src/components/payments/VirtualAccountInfo.tsx \
        apps/frontend/src/components/payments/VirtualAccountInfo.test.tsx
git commit -m "feat: add VirtualAccountInfo component"
```

---

## Task 10: CheckoutContent 교체 및 KCP 결과 페이지

**Files:**

- Modify: `apps/frontend/src/components/checkout/CheckoutContent.tsx`
- Modify: `apps/frontend/src/components/checkout/CheckoutContent.test.tsx`
- Create: `apps/frontend/src/app/(auth)/checkout/kcp/result/page.tsx`

- [ ] **Step 1: CheckoutContent.tsx 수정 — Stripe → KCP 교체**

`CheckoutContent.tsx`에서 아래 부분을 변경한다.

`import StripePaymentForm` 제거, 아래로 교체:

```typescript
import KcpPaymentButton from '@/components/payments/KcpPaymentButton';
import VirtualAccountInfo from '@/components/payments/VirtualAccountInfo';
```

`PAYMENT_METHODS` 배열 변경:

```typescript
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'kakaopay', label: '카카오페이' },
  { value: 'naverpay', label: '네이버페이' },
  { value: 'kcpeasypay', label: '신용카드' },
  { value: 'kcpeasypay-vbank', label: '가상계좌' },
];
```

`pendingStripeOrder` state 제거, 아래 state 추가:

```typescript
const [pendingKcpCardOrder, setPendingKcpCardOrder] = useState<{ id: string } | null>(null);
const [pendingVbankOrderId, setPendingVbankOrderId] = useState<string | null>(null);
```

`handleSubmit` 내 Stripe 분기 교체:

```typescript
if (selectedPayment === 'naverpay') {
  setPendingNaverPayOrderId(orderId);
  return;
}

if (selectedPayment === 'kcpeasypay') {
  setPendingKcpCardOrder({ id: orderId });
  return;
}

if (selectedPayment === 'kcpeasypay-vbank') {
  setPendingVbankOrderId(orderId);
  return;
}
```

결제 요약 패널 내 렌더링 교체:

```typescript
        {pendingNaverPayOrderId ? (
          <div className="mt-5">
            <NaverPayButton
              orderId={pendingNaverPayOrderId}
              onBack={() => setPendingNaverPayOrderId(null)}
            />
          </div>
        ) : pendingKcpCardOrder ? (
          <div className="mt-5">
            <KcpPaymentButton
              orderId={pendingKcpCardOrder.id}
              onSuccess={() => {
                clearOrderState();
                setCompletedOrderId(pendingKcpCardOrder.id);
              }}
              onError={(msg) => setErrorMessage(msg)}
            />
            <button
              onClick={() => setPendingKcpCardOrder(null)}
              className="mt-2 block w-full text-center text-xs text-gray-400 hover:text-indigo-500"
            >
              돌아가기
            </button>
          </div>
        ) : pendingVbankOrderId ? (
          <div className="mt-5">
            <VirtualAccountInfo
              orderId={pendingVbankOrderId}
              onBack={() => setPendingVbankOrderId(null)}
            />
          </div>
        ) : (
          <button ... >결제하기</button>
        )}
```

- [ ] **Step 2: CheckoutContent.test.tsx 수정 — Stripe mock 제거, KCP 방식으로 갱신**

`CheckoutContent.test.tsx`에서 아래 mock 추가:

```typescript
vi.mock('@/components/payments/KcpPaymentButton', () => ({
  default: ({ onSuccess }: { onSuccess: () => void }) => (
    <button onClick={onSuccess}>신용카드 결제</button>
  ),
}));

vi.mock('@/components/payments/VirtualAccountInfo', () => ({
  default: ({ onBack }: { onBack: () => void }) => (
    <div>
      <p>1234567890</p>
      <button onClick={onBack}>뒤로</button>
    </div>
  ),
}));
```

기존 Stripe 관련 테스트(`StripePaymentForm` mock, `stripe` PaymentMethod 선택 테스트)를 KCP 방식 테스트로 교체:

```typescript
  it('신용카드(KCP) 선택 후 결제하기 → KcpPaymentButton 노출', async () => {
    // ... mockCreateOrder, mockAddress 설정
    render(<CheckoutContent />);
    await userEvent.click(screen.getByRole('radio', { name: '신용카드' }));
    await userEvent.click(screen.getByRole('button', { name: '결제하기' }));

    expect(await screen.findByRole('button', { name: '신용카드 결제' })).toBeInTheDocument();
  });

  it('가상계좌 선택 후 결제하기 → VirtualAccountInfo 노출', async () => {
    // ... mockCreateOrder, mockAddress 설정
    render(<CheckoutContent />);
    await userEvent.click(screen.getByRole('radio', { name: '가상계좌' }));
    await userEvent.click(screen.getByRole('button', { name: '결제하기' }));

    expect(await screen.findByText('1234567890')).toBeInTheDocument();
  });
```

- [ ] **Step 3: KCP 결과 페이지 생성 (KCP redirect 방식 지원 시 필요)**

`apps/frontend/src/app/(auth)/checkout/kcp/result/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// 【확인 필요】KCP redirect 방식 사용 여부 및 쿼리 파라미터 이름 확인
// webhook 방식만 사용한다면 이 페이지는 필요 없을 수 있음
export default function KcpResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'fail'>('loading');
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // 【확인 필요】KCP redirect URL에 포함되는 쿼리 파라미터 이름
    const resCode = searchParams.get('res_cd'); // 【확인 필요】
    if (resCode === '0000') {
      setStatus('success');
    } else {
      setStatus('fail');
    }
  }, [searchParams, router]);

  if (status === 'loading') return <p className="py-20 text-center">처리 중...</p>;

  if (status === 'success') {
    return (
      <div className="py-20 text-center">
        <p className="text-5xl">🎉</p>
        <p className="mt-4 text-lg font-bold text-gray-900">결제가 완료되었습니다!</p>
        {orderId && <p className="mt-1 text-sm text-gray-500">주문번호: {orderId}</p>}
        <Link
          href="/my-page"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          마이페이지
        </Link>
      </div>
    );
  }

  return (
    <div className="py-20 text-center">
      <p className="text-4xl">❌</p>
      <p className="mt-4 text-base font-medium text-gray-700">결제에 실패했습니다.</p>
      <Link
        href="/checkout"
        className="mt-6 inline-block rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700"
      >
        다시 시도
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행**

```bash
cd apps/frontend && npx vitest run --reporter=dot CheckoutContent
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/frontend/src/components/checkout/CheckoutContent.tsx \
        apps/frontend/src/components/checkout/CheckoutContent.test.tsx \
        apps/frontend/src/app/\(auth\)/checkout/kcp/
git commit -m "feat: replace Stripe checkout with KCP card and virtual account"
```

---

## Task 11: KCP JS SDK 로드 및 Stripe 의존성 제거

**Files:**

- Modify: `apps/frontend/src/app/layout.tsx` (또는 KCP SDK 로드 위치)
- Modify: `apps/frontend/package.json`
- Modify: `apps/backend/package.json`

- [ ] **Step 1: KCP JS SDK Script 로드**

`apps/frontend/src/app/layout.tsx`의 `<head>` 또는 `<body>` 안에 추가:

```typescript
import Script from 'next/script';

// layout.tsx의 <body> 또는 <head> 안에:
<Script
  src="KCP_JS_SDK_URL" // 【확인 필요】실제 URL로 교체
  strategy="beforeInteractive"
/>
```

- [ ] **Step 2: Stripe 프론트엔드 패키지 제거**

```bash
cd apps/frontend && pnpm remove @stripe/react-stripe-js @stripe/stripe-js
```

Expected: package.json에서 Stripe 패키지 제거됨

- [ ] **Step 3: Stripe 백엔드 패키지 제거**

```bash
cd apps/backend && pnpm remove stripe
```

Expected: package.json에서 stripe 패키지 제거됨

- [ ] **Step 4: StripePaymentForm 파일 삭제**

```bash
git rm apps/frontend/src/components/payments/StripePaymentForm.tsx \
       apps/frontend/src/components/payments/StripePaymentForm.test.tsx
```

- [ ] **Step 5: 전체 테스트 실행**

```bash
pnpm --filter @yueeroom/backend test -- --silent
cd apps/frontend && npx vitest run --reporter=dot
```

Expected: 모든 테스트 통과

- [ ] **Step 6: 빌드 확인**

```bash
pnpm build
```

Expected: 빌드 성공

- [ ] **Step 7: 커밋**

```bash
git add apps/frontend/package.json apps/backend/package.json \
        apps/frontend/src/app/layout.tsx
git rm apps/frontend/src/components/payments/StripePaymentForm.tsx \
       apps/frontend/src/components/payments/StripePaymentForm.test.tsx
git commit -m "chore: remove Stripe dependencies, load KCP JS SDK"
```

---

## 완료 조건 체크리스트

- [ ] 신용카드 결제가 KCP 이지페이를 통해 처리된다
- [ ] 가상계좌 결제가 가능하다 (계좌 발급 → 입금 → 주문 상태 PAID 전환)
- [ ] 카카오페이, 네이버페이는 기존대로 동작한다
- [ ] Stripe 관련 코드 및 의존성이 완전히 제거된다
- [ ] KCP webhook으로 결제 완료/실패/가상계좌 입금이 처리된다
- [ ] 환불 흐름이 KCP API를 통해 동작한다
- [ ] 기존 결제 관련 테스트가 KCP 기준으로 갱신되어 통과한다
- [ ] `AWAITING_DEPOSIT` PaymentStatus가 가상계좌 입금 대기 상태에 사용된다
- [ ] Payment 테이블에 가상계좌 컬럼이 추가되어 계좌 정보가 저장된다
