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
