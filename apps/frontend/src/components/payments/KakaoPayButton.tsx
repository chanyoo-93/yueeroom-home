'use client';

import { useState } from 'react';
import { kakaoPayReady } from '@/lib/api/payments';

interface KakaoPayButtonProps {
  orderId: string;
}

export default function KakaoPayButton({ orderId }: KakaoPayButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleKakaoPay = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { redirectUrl } = await kakaoPayReady(orderId);
      window.location.href = redirectUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.';
      setErrorMessage(message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => void handleKakaoPay()}
        disabled={isProcessing}
        aria-label="카카오페이로 결제하기"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 text-sm font-semibold text-[#191919] hover:bg-[#f0d800] disabled:opacity-50"
      >
        {isProcessing ? (
          '처리 중...'
        ) : (
          <>
            <span className="text-base font-bold">K</span>
            카카오페이로 결제
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
