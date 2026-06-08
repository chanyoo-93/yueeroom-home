'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import KcpPaymentButton from '@/components/payments/KcpPaymentButton';
import NaverPayButton from '@/components/payments/NaverPayButton';
import VirtualAccountInfo from '@/components/payments/VirtualAccountInfo';
import { useCartStore } from '@/lib/stores/cart';
import { useAddresses } from '@/lib/hooks/useAddresses';
import { useCreateOrder } from '@/lib/hooks/useOrders';
import { formatPrice } from '@/lib/utils/format';
import type { Order, PaymentMethod } from '@/lib/types/order';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'kakaopay', label: '카카오페이' },
  { value: 'naverpay', label: '네이버페이' },
  { value: 'kcpeasypay', label: '신용카드' },
  { value: 'kcpeasypay-vbank', label: '가상계좌' },
];

export default function CheckoutContent() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const buyNow = useCartStore((s) => s.buyNow);
  const clearBuyNow = useCartStore((s) => s.clearBuyNow);

  const effectiveItems = buyNow ? [buyNow] : items;

  const { data: addresses, isLoading: isAddressLoading } = useAddresses();
  const createOrderMutation = useCreateOrder();

  const defaultAddress = addresses?.find((a) => a.isDefault) ?? addresses?.[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('kakaopay');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingNaverPayOrderId, setPendingNaverPayOrderId] = useState<string | null>(null);
  const [pendingKcpCardOrder, setPendingKcpCardOrder] = useState<{ id: string } | null>(null);
  const [pendingVbankOrderId, setPendingVbankOrderId] = useState<string | null>(null);

  const resolvedAddressId = selectedAddressId ?? defaultAddress?.id;

  const totalPrice = effectiveItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const clearOrderState = () => {
    if (buyNow) clearBuyNow();
    else clearCart();
  };

  useEffect(() => {
    return () => clearBuyNow();
  }, [clearBuyNow]);

  useEffect(() => {
    setPendingOrderId(null);
  }, [resolvedAddressId]);

  // 주문 완료 화면 — 별도 페이지 이동 없이 즉시 결과 표시
  if (completedOrderId) {
    return (
      <div className="py-20 text-center">
        <p className="text-5xl">🎉</p>
        <p className="mt-4 text-lg font-bold text-gray-900">주문이 완료되었습니다!</p>
        <p className="mt-1 text-sm text-gray-500">주문번호: {completedOrderId}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/products"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            쇼핑 계속하기
          </Link>
          <Link
            href="/my-page"
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400"
          >
            마이페이지
          </Link>
        </div>
      </div>
    );
  }

  if (effectiveItems.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl">🛒</p>
        <p className="mt-3 text-base font-medium text-gray-700">장바구니가 비어 있어요.</p>
        <Link
          href="/cart"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          장바구니로 돌아가기
        </Link>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!resolvedAddressId) {
      setErrorMessage('배송지를 선택해주세요.');
      return;
    }

    setErrorMessage(null);

    try {
      let orderId = pendingOrderId;
      if (!orderId) {
        const order = await createOrderMutation.mutateAsync({
          addressId: resolvedAddressId,
          items: effectiveItems.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        });
        orderId = (order as Order).id;
        setPendingOrderId(orderId);
      }

      if (selectedPayment === 'naverpay') {
        setPendingNaverPayOrderId(orderId);
        return;
      }

      if (selectedPayment === 'kcpeasypay') {
        setPendingKcpCardOrder({ id: orderId });
        return;
      }

      if (selectedPayment === 'kcpeasypay-vbank') {
        setPendingVbankOrderId(orderId);
        return;
      }

      clearOrderState();
      setCompletedOrderId(orderId);
    } catch {
      setErrorMessage('주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* 왼쪽: 주문 상품 + 배송지 + 결제 방법 */}
      <div className="flex-1 space-y-6">
        {/* 주문 상품 */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-800">
            주문 상품 ({effectiveItems.length}종)
          </h2>
          <ul className="space-y-3">
            {effectiveItems.map((item) => (
              <li
                key={item.variantId}
                className="flex gap-4 rounded-xl border border-gray-100 p-4 shadow-sm"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.productImageUrl ? (
                    <Image
                      src={item.productImageUrl}
                      alt={item.productName}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">🧸</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-center">
                  <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {item.color} / {item.size} · {item.quantity}개
                  </p>
                  <p className="mt-1 text-sm font-semibold text-indigo-600">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 배송지 선택 */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-800">배송지 선택</h2>
          {isAddressLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : !addresses || addresses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
              등록된 배송지가 없습니다.{' '}
              <Link href="/my-page" className="text-indigo-600 hover:underline">
                마이페이지에서 추가
              </Link>
              하세요.
            </div>
          ) : (
            <ul className="space-y-2">
              {addresses.map((address) => {
                const isSelected = resolvedAddressId === address.id;
                return (
                  <li key={address.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={isSelected}
                        onChange={() => setSelectedAddressId(address.id)}
                        className="mt-0.5"
                        aria-label={`${address.name} 선택`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{address.name}</span>
                          {address.isDefault && (
                            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                              기본
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-600">
                          {address.recipient} · {address.phone}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {address.zipCode} {address.address1}
                          {address.address2 ? ` ${address.address2}` : ''}
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 결제 방법 */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-800">결제 방법</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAYMENT_METHODS.map(({ value, label }) => (
              <li key={value}>
                <label
                  className={`flex cursor-pointer items-center justify-center rounded-xl border py-3 text-sm font-medium transition-colors ${
                    selectedPayment === value
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={value}
                    checked={selectedPayment === value}
                    onChange={() => setSelectedPayment(value)}
                    className="sr-only"
                    aria-label={label}
                  />
                  {label}
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 오른쪽: 결제 요약 */}
      <div className="w-full rounded-xl border border-gray-100 p-5 shadow-sm lg:w-72">
        <h2 className="text-base font-semibold text-gray-800">결제 요약</h2>

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

        {errorMessage && (
          <p role="alert" className="mt-3 text-xs text-red-600">
            {errorMessage}
          </p>
        )}

        {pendingNaverPayOrderId ? (
          <div className="mt-5">
            <NaverPayButton
              orderId={pendingNaverPayOrderId}
              onBack={() => setPendingNaverPayOrderId(null)}
            />
          </div>
        ) : pendingKcpCardOrder ? (
          <div className="mt-5">
            <KcpPaymentButton
              orderId={pendingKcpCardOrder.id}
              onSuccess={() => {
                clearOrderState();
                setCompletedOrderId(pendingKcpCardOrder.id);
              }}
              onError={(message) => setErrorMessage(message)}
            />
            <button
              onClick={() => setPendingKcpCardOrder(null)}
              className="mt-2 block w-full text-center text-xs text-gray-400 hover:text-indigo-500"
            >
              돌아가기
            </button>
          </div>
        ) : pendingVbankOrderId ? (
          <div className="mt-5">
            <VirtualAccountInfo
              orderId={pendingVbankOrderId}
              onBack={() => setPendingVbankOrderId(null)}
            />
          </div>
        ) : (
          <button
            onClick={() => void handleSubmit()}
            disabled={createOrderMutation.isPending}
            aria-label="결제하기"
            className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createOrderMutation.isPending ? '처리 중...' : '결제하기'}
          </button>
        )}

        <Link
          href={buyNow ? `/products/${buyNow.productId}` : '/cart'}
          className="mt-3 block text-center text-xs text-gray-400 hover:text-indigo-500"
        >
          {buyNow ? '상품으로 돌아가기' : '장바구니로 돌아가기'}
        </Link>
      </div>
    </div>
  );
}
