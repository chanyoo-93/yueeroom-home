'use client';

import { useState } from 'react';
import { naverPayPrepare } from '@/lib/api/payments';

interface NaverPayButtonProps {
  orderId: string;
  onBack: () => void;
}

export default function NaverPayButton({ orderId, onBack }: NaverPayButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNaverPay = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { paymentURL } = await naverPayPrepare(orderId);
      window.location.href = paymentURL;
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.';
      setErrorMessage(message);
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
      {!isProcessing && (
        <button
          onClick={onBack}
          className="w-full rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400"
        >
          다른 결제 방법으로 변경
        </button>
      )}
    </div>
  );
}
