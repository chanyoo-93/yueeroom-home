'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function KcpResultPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  // TODO(확인 필요): KCP redirect URL 쿼리 파라미터 이름을 실제 값으로 확정한다.
  const status = searchParams.get('res_cd') === '0000' ? 'success' : 'fail';

  if (status === 'success') {
    return (
      <div className="py-20 text-center">
        <p className="text-5xl">🎉</p>
        <p className="mt-4 text-lg font-bold text-gray-900">결제가 완료되었습니다!</p>
        {orderId && <p className="mt-1 text-sm text-gray-500">주문번호: {orderId}</p>}
        <Link
          href="/my-page"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          마이페이지
        </Link>
      </div>
    );
  }

  return (
    <div className="py-20 text-center">
      <p className="text-4xl">❌</p>
      <p className="mt-4 text-base font-medium text-gray-700">결제에 실패했습니다.</p>
      <Link
        href="/checkout"
        className="mt-6 inline-block rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700"
      >
        다시 시도
      </Link>
    </div>
  );
}
