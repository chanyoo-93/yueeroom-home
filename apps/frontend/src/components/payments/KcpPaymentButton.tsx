'use client';

import { useState } from 'react';
import { kcpCardPrepare } from '@/lib/api/payments';

declare global {
  interface Window {
    KCP?: {
      pay: (params: Record<string, string>, callback: (result: KcpPayResult) => void) => void;
    };
  }
}

interface KcpPayResult {
  res_cd: string;
  res_msg: string;
  enc_data?: string;
}

interface KcpPaymentButtonProps {
  orderId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function KcpPaymentButton({ orderId, onSuccess, onError }: KcpPaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    setIsProcessing(true);
    try {
      const params = await kcpCardPrepare(orderId);

      if (!window.KCP) {
        onError('KCP 결제 모듈을 불러오지 못했습니다.');
        return;
      }

      window.KCP.pay(
        {
          site_cd: params.siteCode,
          ordr_idxx: params.orderId,
          good_name: params.productName,
          good_mny: String(params.amount),
          timestamp: params.timestamp,
          sign_data: params.signData,
        },
        (result) => {
          if (result.res_cd === '0000') {
            onSuccess();
          } else {
            onError(result.res_msg || '결제에 실패했습니다.');
          }
        },
      );
    } catch {
      onError('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={() => void handleClick()}
      disabled={isProcessing}
      className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
    >
      {isProcessing ? '결제 처리 중...' : '신용카드 결제'}
    </button>
  );
}
