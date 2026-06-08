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
    expect(kakaoPayService.refund).not.toHaveBeenCalled();
  });

  it('naverpay 결제 수단은 NaverPayService로 reason을 전달해 환불한다', async () => {
    await service.refund(
      { paymentMethod: 'naverpay', paymentKey: 'naver-pay-id-123' },
      80000,
      '고객 요청',
    );

    expect(naverPayService.refund).toHaveBeenCalledWith('naver-pay-id-123', 80000, '고객 요청');
    expect(kcpEasyPayService.refund).not.toHaveBeenCalled();
    expect(kakaoPayService.refund).not.toHaveBeenCalled();
  });

  it('kakaopay 결제 수단은 KakaoPayService로 환불한다', async () => {
    await service.refund(
      { paymentMethod: 'kakaopay', paymentKey: 'T469b847306d7b2dc234' },
      80000,
      '환불',
    );

    expect(kakaoPayService.refund).toHaveBeenCalledWith('T469b847306d7b2dc234', 80000, '환불');
    expect(kcpEasyPayService.refund).not.toHaveBeenCalled();
    expect(naverPayService.refund).not.toHaveBeenCalled();
  });

  it('미지원 결제 수단이면 BadRequestException을 던진다', async () => {
    await expect(
      service.refund({ paymentMethod: 'unknown', paymentKey: 'payment-key' }, 1000),
    ).rejects.toThrow(BadRequestException);
  });

  it('paymentKey가 없으면 BadRequestException을 던진다', async () => {
    await expect(
      service.refund({ paymentMethod: 'kcpeasypay', paymentKey: null }, 1000),
    ).rejects.toThrow(new BadRequestException('결제 키가 없어 환불할 수 없습니다.'));
  });
});
