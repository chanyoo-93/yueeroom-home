'use client';

import { useState } from 'react';
import {
  useAdminOrders,
  useUpdateAdminOrderStatus,
  useUpdateAdminOrderTracking,
} from '@/lib/hooks/useAdminOrders';
import type { AdminOrder } from '@/lib/types/admin';
import type { OrderStatus } from '@/lib/types/order';
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/types/order';

const STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
};

interface TrackingModal {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  mode: 'shipping-status' | 'tracking-update';
}

export default function AdminOrdersPage() {
  const { data, isLoading, isError } = useAdminOrders();
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateAdminOrderStatus();
  const { mutate: updateTracking, isPending: isUpdatingTracking } = useUpdateAdminOrderTracking();

  const [trackingModal, setTrackingModal] = useState<TrackingModal | null>(null);

  function handleStatusChange(order: AdminOrder, newStatus: OrderStatus) {
    if (newStatus === 'SHIPPING') {
      setTrackingModal({
        orderId: order.id,
        carrier: order.carrier ?? '',
        trackingNumber: order.trackingNumber ?? '',
        mode: 'shipping-status',
      });
    } else {
      updateStatus({ orderId: order.id, status: newStatus });
    }
  }

  function handleTrackingOpen(order: AdminOrder) {
    setTrackingModal({
      orderId: order.id,
      carrier: order.carrier ?? '',
      trackingNumber: order.trackingNumber ?? '',
      mode: 'tracking-update',
    });
  }

  function handleTrackingSubmit() {
    if (!trackingModal) return;
    if (trackingModal.mode === 'shipping-status') {
      updateStatus(
        {
          orderId: trackingModal.orderId,
          status: 'SHIPPING',
          carrier: trackingModal.carrier,
          trackingNumber: trackingModal.trackingNumber,
        },
        { onSuccess: () => setTrackingModal(null) },
      );
    } else {
      updateTracking(
        {
          orderId: trackingModal.orderId,
          carrier: trackingModal.carrier,
          trackingNumber: trackingModal.trackingNumber,
        },
        { onSuccess: () => setTrackingModal(null) },
      );
    }
  }

  const isMutating = isUpdatingStatus || isUpdatingTracking;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">주문 관리</h1>

      {isLoading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : isError ? (
        <p className="text-red-500">주문 목록을 불러오는 중 오류가 발생했습니다.</p>
      ) : !data?.items || data.items.length === 0 ? (
        <p className="text-gray-500">주문이 없습니다.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">주문번호</th>
                <th className="px-4 py-3">회원</th>
                <th className="px-4 py-3">금액</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">주문일</th>
                <th className="px-4 py-3">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((order) => {
                const transitions = STATUS_TRANSITIONS[order.status] ?? [];
                const isImmutable = transitions.length === 0;
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{order.user.name}</div>
                      <div className="text-xs text-gray-500">{order.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {order.totalAmount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        disabled={isImmutable || isMutating}
                        onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                        className={`rounded px-2 py-1 text-xs font-semibold ${ORDER_STATUS_COLOR[order.status]} disabled:opacity-50`}
                      >
                        <option value={order.status}>{ORDER_STATUS_LABEL[order.status]}</option>
                        {transitions.map((s) => (
                          <option key={s} value={s}>
                            {ORDER_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      {order.status === 'SHIPPING' && (
                        <button
                          onClick={() => handleTrackingOpen(order)}
                          disabled={isMutating}
                          className="rounded px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                          송장 입력
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {trackingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {trackingModal.mode === 'shipping-status'
                ? '배송 중 전환 — 송장 입력'
                : '송장번호 수정'}
            </h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="택배사 (예: CJ대한통운)"
                value={trackingModal.carrier}
                onChange={(e) => setTrackingModal({ ...trackingModal, carrier: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="송장번호"
                value={trackingModal.trackingNumber}
                onChange={(e) =>
                  setTrackingModal({ ...trackingModal, trackingNumber: e.target.value })
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setTrackingModal(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleTrackingSubmit}
                disabled={isMutating || !trackingModal.carrier || !trackingModal.trackingNumber}
                className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {trackingModal.mode === 'shipping-status' ? '확인' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
