import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { KakaoPayService } from './kakao-pay.service';
import { NaverPayService } from './naver-pay.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentGatewayService,
    NaverPayService,
    KakaoPayService,
    {
      provide: 'STRIPE_CLIENT',
      useFactory: (config: ConfigService) =>
        new Stripe(config.get<string>('STRIPE_SECRET_KEY') || 'sk_placeholder_not_configured', {
          apiVersion: '2025-02-24.acacia',
        }),
      inject: [ConfigService],
    },
  ],
  exports: [PaymentsService, PaymentGatewayService],
})
export class PaymentsModule {}
