'use client';

import { useEffect, useState } from 'react';
import { kcpVbankPrepare, type KcpVbankPrepareResponse } from '@/lib/api/payments';
import { formatPrice } from '@/lib/utils/format';

interface VirtualAccountInfoProps {
  orderId: string;
  onBack: () => void;
}

function formatExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VirtualAccountInfo({ orderId, onBack }: VirtualAccountInfoProps) {
  const [accountInfo, setAccountInfo] = useState<KcpVbankPrepareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function issueVirtualAccount() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const info = await kcpVbankPrepare(orderId);
        if (isMounted) {
          setAccountInfo(info);
        }
      } catch {
        if (isMounted) {
          setErrorMessage('가상계좌 발급에 실패했습니다. 다시 시도해 주세요.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void issueVirtualAccount();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  return (
    <div className="space-y-4 rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">가상계좌 입금</h2>
          <p className="mt-1 text-sm text-gray-500">아래 계좌로 입금하면 결제가 완료됩니다.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-gray-300"
        >
          뒤로
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-600">계좌 발급 중...</p>}

      {errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      {accountInfo && !isLoading && !errorMessage && (
        <dl className="divide-y divide-gray-100 rounded-lg border border-gray-100">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-gray-500">은행</dt>
            <dd className="text-sm font-semibold text-gray-900">{accountInfo.bankName}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-gray-500">계좌번호</dt>
            <dd className="text-sm font-semibold text-gray-900">{accountInfo.accountNumber}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-gray-500">입금 금액</dt>
            <dd className="text-sm font-semibold text-gray-900">
              {formatPrice(accountInfo.amount)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-gray-500">입금 기한</dt>
            <dd className="text-sm font-semibold text-gray-900">
              {formatExpiry(accountInfo.expiresAt)}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
