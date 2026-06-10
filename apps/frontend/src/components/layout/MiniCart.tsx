'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/lib/stores/cart';
import { useCart, useRemoveCartItem } from '@/lib/hooks/useCart';
import { formatPrice } from '@/lib/utils/format';

export default function MiniCart() {
  const [isOpen, setIsOpen] = useState(false);
  // 하이드레이션 완료 후에만 localStorage 기반 스토어 값을 렌더링
  const [isMounted, setIsMounted] = useState(false);
  const rawItems = useCartStore((s) => s.items);
  const items = Array.isArray(rawItems) ? rawItems : [];
  const removeMutation = useRemoveCartItem();
  const ref = useRef<HTMLDivElement>(null);

  // 전역 서버 동기화 — 인증된 모든 페이지(헤더 포함)에서 장바구니를 최신 상태로 유지
  useCart();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalCount = isMounted ? items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="장바구니"
        aria-expanded={isOpen}
        className="flex flex-col items-center text-xs text-gray-600 hover:text-blue-600"
      >
        <span className="relative">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {totalCount > 0 && (
            <span
              className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white"
              aria-label={`장바구니 ${totalCount}개`}
            >
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </span>
        <span className="hidden sm:inline">장바구니</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="미니 장바구니"
          className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-gray-100 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-800">장바구니 ({totalCount}개)</span>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="닫기"
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">장바구니가 비어 있어요.</div>
          ) : (
            <>
              <ul className="max-h-60 divide-y divide-gray-50 overflow-y-auto">
                {items.map((item) => (
                  <li key={item.variantId} className="flex items-center gap-3 px-4 py-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {item.productImageUrl ? (
                        <Image
                          src={item.productImageUrl}
                          alt={item.productName}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">
                          🧸
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-900">
                        {item.productName}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {item.color} / {item.size} × {item.quantity}
                      </p>
                      <p className="text-xs font-semibold text-indigo-600">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        removeMutation.mutate({ itemId: item.id, variantId: item.variantId })
                      }
                      disabled={removeMutation.isPending}
                      aria-label={`${item.productName} 삭제`}
                      className="shrink-0 text-xs text-gray-300 hover:text-red-400 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <div className="border-t border-gray-100 px-4 py-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">합계</span>
                  <span className="font-semibold text-gray-900">{formatPrice(totalPrice)}</span>
                </div>
                <Link
                  href="/cart"
                  onClick={() => setIsOpen(false)}
                  className="mt-3 block rounded-xl bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  장바구니 보기
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
