import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { NaverPayService } from './naver-pay.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    NaverPayService,
    {
      provide: 'STRIPE_CLIENT',
      useFactory: (config: ConfigService) =>
        new Stripe(config.get<string>('STRIPE_SECRET_KEY', ''), {
          apiVersion: '2025-02-24.acacia',
        }),
      inject: [ConfigService],
    },
  ],
  exports: [PaymentsService, NaverPayService],
})
export class PaymentsModule {}
