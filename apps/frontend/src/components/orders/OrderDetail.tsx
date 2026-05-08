'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useOrderDetail } from '@/lib/hooks/useOrders';
import { formatPrice } from '@/lib/utils/format';
import { type PaymentStatus, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/types/order';
import OrderStatusStepper from './OrderStatusStepper';

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: '결제 대기',
  COMPLETED: '결제 완료',
  FAILED: '결제 실패',
  REFUNDED: '환불됨',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  kakaopay: '카카오페이',
  naverpay: '네이버페이',
  card: '신용/체크카드',
};

export default function OrderDetail() {
  const params = useParams<{ id: string }>();
  const orderId = params.id ?? '';
  const { data: order, isLoading, isError } = useOrderDetail(orderId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <p role="alert" className="text-sm text-red-500">
        주문 정보를 불러오는 데 실패했습니다.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* 주문 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-gray-500">주문번호: {order.id}</p>
          <p className="mt-0.5 text-xs text-gray-400">
            {new Date(order.createdAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${ORDER_STATUS_COLOR[order.status]}`}
          aria-label={`주문 상태: ${ORDER_STATUS_LABEL[order.status]}`}
        >
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* 주문 상태 스텝퍼 */}
      <OrderStatusStepper
        status={order.status}
        carrier={order.carrier}
        trackingNumber={order.trackingNumber}
      />

      {/* 주문 상품 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">주문 상품</h2>
        <ul className="space-y-3">
          {order.items.map((item) => {
            const productName = item.variant?.product?.name ?? '상품 정보 없음';
            const imageUrl = item.variant?.product?.images?.[0]?.url;
            return (
              <li key={item.id} className="flex gap-3 rounded-xl border border-gray-100 p-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={productName}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">🧸</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-center">
                  <p className="text-sm font-medium text-gray-900">{productName}</p>
                  {item.variant && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {item.variant.color} / {item.variant.size} · {item.quantity}개
                    </p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-indigo-600">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 배송 정보 */}
      {order.address && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">배송 정보</h2>
          <div className="rounded-xl border border-gray-100 p-4 text-sm">
            <p className="font-medium text-gray-900">{order.address.name}</p>
            <p className="mt-1 text-gray-600">
              {order.address.recipient} · {order.address.phone}
            </p>
            <p className="mt-0.5 text-gray-500">
              [{order.address.zipCode}] {order.address.address1}
              {order.address.address2 ? ` ${order.address.address2}` : ''}
            </p>
          </div>
        </section>
      )}

      {/* 결제 정보 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">결제 정보</h2>
        <div className="rounded-xl border border-gray-100 p-4 text-sm">
          {order.payment ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">결제 수단</dt>
                <dd className="font-medium text-gray-900">
                  {PAYMENT_METHOD_LABEL[order.payment.paymentMethod] ?? order.payment.paymentMethod}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">결제 상태</dt>
                <dd className="font-medium text-gray-900">
                  {PAYMENT_STATUS_LABEL[order.payment.status]}
                </dd>
              </div>
              {order.payment.paidAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">결제일</dt>
                  <dd className="text-gray-700">
                    {new Date(order.payment.paidAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-gray-400">결제 정보가 없습니다.</p>
          )}
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="flex justify-between">
              <span className="text-gray-500">상품 금액</span>
              <span className="text-gray-700">{formatPrice(order.totalAmount)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-gray-500">배송비</span>
              <span className="text-indigo-600">
                {order.shippingFee === 0 ? '무료' : formatPrice(order.shippingFee)}
              </span>
            </div>
            <div className="mt-2 flex justify-between font-semibold text-gray-900">
              <span>합계</span>
              <span>{formatPrice(order.totalAmount + order.shippingFee)}</span>
            </div>
          </div>
        </div>
      </section>

      <Link href="/orders" className="inline-block text-sm text-indigo-600 hover:underline">
        ← 주문 내역으로 돌아가기
      </Link>
    </div>
  );
}
