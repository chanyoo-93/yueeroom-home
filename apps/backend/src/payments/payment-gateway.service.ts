import { BadRequestException, Injectable } from '@nestjs/common';
import type { IPaymentProvider } from './interfaces/payment-provider.interface';
import { KakaoPayService } from './kakao-pay.service';
import { NaverPayService } from './naver-pay.service';
import { PaymentsService } from './payments.service';

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
    if (!provider) {
      throw new BadRequestException('지원하지 않는 결제 수단입니다.');
    }
    if (!payment.paymentKey) {
      throw new BadRequestException('결제 키가 없어 환불할 수 없습니다.');
    }

    await provider.refund(payment.paymentKey, amount, reason);
  }
}
