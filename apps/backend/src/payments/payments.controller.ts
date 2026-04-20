import { Body, Controller, Headers, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { KakaoPayApproveDto } from './dto/kakao-pay-approve.dto';
import { KakaoPayReadyDto } from './dto/kakao-pay-ready.dto';
import { NaverPayApproveDto } from './dto/naver-pay-approve.dto';
import { NaverPayPrepareDto } from './dto/naver-pay-prepare.dto';
import { KakaoPayService } from './kakao-pay.service';
import { NaverPayService } from './naver-pay.service';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly naverPayService: NaverPayService,
    private readonly kakaoPayService: KakaoPayService,
  ) {}

  @Post('stripe/intent')
  @ApiOperation({ summary: 'Stripe PaymentIntent 생성' })
  createPaymentIntent(@CurrentUser() user: JwtPayload, @Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(user.sub, dto.orderId, dto.installmentMonths);
  }

  @Post('stripe/webhook')
  @Public()
  @ApiOperation({ summary: 'Stripe 웹훅 처리' })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhookEvent(req.rawBody!, signature);
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
}
