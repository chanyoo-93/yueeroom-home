'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from '@/lib/hooks/useCart';
import { useCartStore } from '@/lib/stores/cart';
import { formatPrice } from '@/lib/utils/format';

export default function CartContent() {
  const items = useCartStore((s) => s.items);
  const { isLoading, isError } = useCart();
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveCartItem();
  const clearMutation = useClearCart();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 rounded-xl border border-gray-100 p-4">
            <div className="h-20 w-20 animate-pulse rounded-lg bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-red-500">장바구니를 불러오는 데 실패했습니다.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl">🛒</p>
        <p className="mt-3 text-base font-medium text-gray-700">장바구니가 비어 있어요.</p>
        <p className="mt-1 text-sm text-gray-400">마음에 드는 상품을 담아보세요!</p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          쇼핑 계속하기
        </Link>
      </div>
    );
  }

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* 장바구니 항목 목록 */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">상품 목록 ({totalCount}개)</h2>
          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
          >
            전체 삭제
          </button>
        </div>

        {items.map((item) => (
          <div
            key={item.variantId}
            className="flex gap-4 rounded-xl border border-gray-100 p-4 shadow-sm"
          >
            {/* 상품 이미지 */}
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {item.productImageUrl ? (
                <Image
                  src={item.productImageUrl}
                  alt={item.productName}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">🧸</div>
              )}
            </div>

            {/* 상품 정보 */}
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {item.color} / {item.size}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-indigo-600">
                  {formatPrice(item.price * item.quantity)}
                </p>

                {/* 수량 조절 */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-gray-200">
                    <button
                      onClick={() =>
                        updateMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })
                      }
                      disabled={item.quantity <= 1 || updateMutation.isPending}
                      aria-label="수량 줄이기"
                      className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 disabled:text-gray-200"
                    >
                      −
                    </button>
                    <span className="min-w-[1.5rem] text-center text-xs font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })
                      }
                      disabled={item.quantity >= item.stock || updateMutation.isPending}
                      aria-label="수량 늘리기"
                      className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 disabled:text-gray-200"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() =>
                      removeMutation.mutate({ itemId: item.id, variantId: item.variantId })
                    }
                    disabled={removeMutation.isPending}
                    aria-label={`${item.productName} 삭제`}
                    className="text-xs text-gray-300 hover:text-red-400 disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 주문 요약 */}
      <div className="w-full rounded-xl border border-gray-100 p-5 shadow-sm lg:w-72">
        <h2 className="text-base font-semibold text-gray-800">주문 요약</h2>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>상품 금액</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>배송비</span>
            <span className="text-indigo-600">무료</span>
          </div>
          <div className="my-2 border-t border-gray-100" />
          <div className="flex justify-between font-semibold text-gray-900">
            <span>합계</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>

        <Link
          href="/checkout"
          className="mt-5 block w-full rounded-xl bg-indigo-600 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700"
          aria-label="주문하기"
        >
          주문하기
        </Link>

        <Link
          href="/products"
          className="mt-3 block text-center text-xs text-gray-400 hover:text-indigo-500"
        >
          쇼핑 계속하기
        </Link>
      </div>
    </div>
  );
}
