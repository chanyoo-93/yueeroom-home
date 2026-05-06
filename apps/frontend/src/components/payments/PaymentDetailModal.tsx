'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/utils/format';
import { useRequestRefund } from '@/lib/hooks/usePayments';
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  type PaymentWithOrder,
} from '@/lib/types/order';

interface Props {
  payment: PaymentWithOrder;
  onClose: () => void;
}

const REFUND_REASONS = [
  '단순 변심',
  '상품 불량/하자',
  '배송 지연',
  '잘못된 상품 배송',
  '기타',
] as const;

export default function PaymentDetailModal({ payment, onClose }: Props) {
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundReason, setRefundReason] = useState<string>(REFUND_REASONS[0]);
  const { mutate: requestRefund, isPending } = useRequestRefund();

  const displayDate = payment.paidAt ?? payment.createdAt;
  const methodLabel = PAYMENT_METHOD_LABEL[payment.paymentMethod] ?? payment.paymentMethod;

  const handleRefundConfirm = () => {
    requestRefund(
      { paymentId: payment.id, reason: refundReason },
      {
        onSuccess: () => {
          setShowRefundConfirm(false);
          onClose();
        },
      },
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="결제 상세"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">결제 영수증</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            닫기
          </button>
        </div>

        {/* 결제 요약 */}
        <dl className="mb-5 space-y-2 rounded-xl bg-gray-50 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">결제일</dt>
            <dd className="font-medium text-gray-900">
              {new Date(displayDate).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">결제 수단</dt>
            <dd className="font-medium text-gray-900">{methodLabel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">결제 금액</dt>
            <dd className="font-semibold text-gray-900">{formatPrice(payment.amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">상태</dt>
            <dd>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLOR[payment.status]}`}
              >
                {PAYMENT_STATUS_LABEL[payment.status]}
              </span>
            </dd>
          </div>
        </dl>

        {/* 주문 상품 목록 */}
        {Array.isArray(payment.order.items) && payment.order.items.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              주문 상품
            </p>
            <ul className="space-y-2">
              {payment.order.items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.variant?.product?.name ?? '상품 정보 없음'}
                    {item.variant && (
                      <span className="ml-1 text-xs text-gray-400">
                        {item.variant.size} / {item.variant.color}
                      </span>
                    )}
                    <span className="ml-1 text-xs text-gray-400">× {item.quantity}</span>
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 환불 신청 */}
        {payment.status === 'COMPLETED' && !showRefundConfirm && (
          <button
            onClick={() => setShowRefundConfirm(true)}
            className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50"
          >
            환불 신청
          </button>
        )}

        {/* 환불 확인 다이얼로그 */}
        {showRefundConfirm && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="mb-3 text-sm font-semibold text-red-700">환불 신청 확인</p>
            <p className="mb-3 text-sm text-red-600">
              {formatPrice(payment.amount)} 환불을 신청하시겠습니까?
            </p>
            <div className="mb-4">
              <label
                htmlFor="refund-reason"
                className="mb-1 block text-xs font-medium text-red-700"
              >
                환불 사유
              </label>
              <select
                id="refund-reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-red-300"
              >
                {REFUND_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRefundConfirm(false)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleRefundConfirm}
                disabled={isPending}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
