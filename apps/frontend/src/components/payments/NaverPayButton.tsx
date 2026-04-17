'use client';

import { useState } from 'react';
import { naverPayApprove, naverPayPrepare } from '@/lib/api/payments';

interface NaverPayButtonProps {
  orderId: string;
  onSuccess: () => void;
}

export default function NaverPayButton({ orderId, onSuccess }: NaverPayButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNaverPay = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { paymentId, merchantPayKey, paymentURL } = await naverPayPrepare(orderId);

      const popup = window.open(paymentURL, 'naver_pay', 'width=480,height=700');

      await new Promise<void>((resolve, reject) => {
        const timer = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(timer);
            resolve();
          }
        }, 500);

        setTimeout(
          () => {
            clearInterval(timer);
            reject(new Error('결제 시간이 초과되었습니다.'));
          },
          10 * 60 * 1000,
        );
      });

      await naverPayApprove(paymentId, merchantPayKey);
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => void handleNaverPay()}
        disabled={isProcessing}
        aria-label="네이버페이로 결제하기"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3 text-sm font-semibold text-white hover:bg-[#02b350] disabled:opacity-50"
      >
        {isProcessing ? (
          '처리 중...'
        ) : (
          <>
            <span className="text-base font-bold">N</span>
            네이버페이로 결제
          </>
        )}
      </button>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
