'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useOrders } from '@/lib/hooks/useOrders';
import { formatPrice } from '@/lib/utils/format';
import { type Order, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/types/order';

function OrderCard({ order }: { order: Order }) {
  const firstItem = order.items[0];
  const firstImage = firstItem?.variant?.product?.images?.[0]?.url;
  const productName = firstItem?.variant?.product?.name ?? '상품 정보 없음';
  const extraCount = order.items.length - 1;

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block rounded-xl border border-gray-100 p-4 shadow-sm transition-colors hover:border-indigo-200"
      aria-label={`주문 ${order.id} 상세 보기`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {firstImage ? (
              <Image
                src={firstImage}
                alt={productName}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg">🧸</div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {productName}
              {extraCount > 0 && (
                <span className="ml-1 text-xs text-gray-400"> 외 {extraCount}건</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLOR[order.status]}`}
          >
            {ORDER_STATUS_LABEL[order.status]}
          </span>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {formatPrice(order.totalAmount)}
          </p>
        </div>
      </div>
    </Link>
  );
}

const PAGE_LIMIT = 10;

export default function OrderList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useOrders(page, PAGE_LIMIT);

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
        주문 내역을 불러오는 데 실패했습니다.
      </p>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-3xl">📦</p>
        <p className="mt-3 text-base font-medium text-gray-700">아직 주문 내역이 없어요.</p>
        <Link
          href="/products"
          className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          쇼핑 시작하기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-3">
        {data.items.map((order) => (
          <li key={order.id}>
            <OrderCard order={order} />
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
  );
}
