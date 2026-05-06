'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/utils/format';
import { usePayments } from '@/lib/hooks/usePayments';
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  type PaymentWithOrder,
} from '@/lib/types/order';
import PaymentDetailModal from './PaymentDetailModal';

function PaymentCard({ payment, onClick }: { payment: PaymentWithOrder; onClick: () => void }) {
  const displayDate = payment.paidAt ?? payment.createdAt;
  const methodLabel = PAYMENT_METHOD_LABEL[payment.paymentMethod] ?? payment.paymentMethod;

  return (
    <button
      onClick={onClick}
      aria-label={`결제 ${payment.id} 상세 보기`}
      className="w-full rounded-xl border border-gray-100 p-4 text-left shadow-sm transition-colors hover:border-indigo-200"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{methodLabel}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {new Date(displayDate).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLOR[payment.status]}`}
          >
            {PAYMENT_STATUS_LABEL[payment.status]}
          </span>
          <p className="mt-1 text-sm font-semibold text-gray-900">{formatPrice(payment.amount)}</p>
        </div>
      </div>
    </button>
  );
}

const PAGE_LIMIT = 10;

export default function PaymentList() {
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithOrder | null>(null);
  const { data, isLoading, isError } = usePayments(page, PAGE_LIMIT);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-red-500">
        결제 내역을 불러오는 데 실패했습니다.
      </p>
    );
  }

  const payments = Array.isArray(data?.items) ? data.items : [];

  if (!data || payments.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-3xl">💳</p>
        <p className="mt-3 text-base font-medium text-gray-700">아직 결제 내역이 없어요.</p>
      </div>
    );
  }

  return (
    <>
      <div>
        <ul className="space-y-3">
          {payments.map((payment) => (
            <li key={payment.id}>
              <PaymentCard payment={payment} onClick={() => setSelectedPayment(payment)} />
            </li>
          ))}
        </ul>

        {data.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="이전 페이지"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 disabled:opacity-40"
            >
              이전
            </button>
            <span
              className="text-sm text-gray-600"
              aria-label={`페이지 ${page} / ${data.totalPages}`}
            >
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              aria-label="다음 페이지"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {selectedPayment && (
        <PaymentDetailModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
      )}
    </>
  );
}
