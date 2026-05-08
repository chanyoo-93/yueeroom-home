import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { KakaoPayService } from './kakao-pay.service';
import { NaverPayService } from './naver-pay.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    NaverPayService,
    KakaoPayService,
    {
      provide: 'STRIPE_CLIENT',
      useFactory: (config: ConfigService) =>
        new Stripe(config.get<string>('STRIPE_SECRET_KEY') || 'sk_placeholder_not_configured', {
          apiVersion: '2026-04-22.dahlia',
        }),
      inject: [ConfigService],
    },
  ],
  exports: [PaymentsService, NaverPayService, KakaoPayService],
})
export class PaymentsModule {}
