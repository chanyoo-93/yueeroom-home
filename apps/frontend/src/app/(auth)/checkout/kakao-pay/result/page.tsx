'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { kakaoPayApprove } from '@/lib/api/payments';
import { useCartStore } from '@/lib/stores/cart';

type PageState = 'loading' | 'success' | 'failed';

function KakaoPayResultContent() {
  const searchParams = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);

  const [state, setState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const approvedRef = useRef(false);

  useEffect(() => {
    if (approvedRef.current) return;
    approvedRef.current = true;

    const pgToken = searchParams.get('pg_token');
    const orderId = searchParams.get('orderId');

    if (!pgToken || !orderId) {
      setState('failed');
      setErrorMessage('결제 정보가 올바르지 않습니다.');
      return;
    }

    kakaoPayApprove(orderId, pgToken)
      .then(() => {
        clearCart();
        setState('success');
      })
      .catch((err: unknown) => {
        setState('failed');
        setErrorMessage(err instanceof Error ? err.message : '결제 승인에 실패했습니다.');
      });
  }, [searchParams, clearCart]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">결제 처리 중...</p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <h1 className="text-2xl font-bold text-gray-900">결제 완료</h1>
        <p className="text-gray-500">카카오페이 결제가 성공적으로 완료되었습니다.</p>
        <Link
          href="/products"
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          쇼핑 계속하기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold text-gray-900">결제 실패</h1>
      <p className="text-red-600">{errorMessage}</p>
      <Link
        href="/checkout"
        className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        다시 시도
      </Link>
    </div>
  );
}

export default function KakaoPayResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-gray-500">결제 처리 중...</p>
        </div>
      }
    >
      <KakaoPayResultContent />
    </Suspense>
  );
}
