'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRemoveWishlistItem, useWishlist } from '@/lib/hooks/useWishlist';
import { formatPrice } from '@/lib/utils/format';

export default function WishlistTab() {
  const { data: items = [], isLoading, isError } = useWishlist();
  const removeWishlistMutation = useRemoveWishlistItem();

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded bg-gray-200" />;
  }

  if (isError) {
    return (
      <div className="py-16 text-center text-sm text-red-500">
        <p>위시리스트를 불러오는 데 실패했습니다.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        <p>위시리스트에 담긴 상품이 없습니다.</p>
        <Link href="/products" className="mt-2 inline-block text-indigo-600 hover:underline">
          상품 둘러보기 →
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {items.map((item) => {
        const thumbnail = item.product.images[0]?.url;
        return (
          <li key={item.id} className="flex items-center gap-4 py-4">
            <Link href={`/products/${item.productId}`} className="shrink-0">
              <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-gray-100">
                {thumbnail ? (
                  <Image src={thumbnail} alt={item.product.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl text-gray-300">
                    👕
                  </div>
                )}
              </div>
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/products/${item.productId}`}>
                <p className="truncate text-sm font-medium text-gray-900 hover:underline">
                  {item.product.name}
                </p>
              </Link>
              <p className="text-sm font-semibold text-indigo-600">
                {formatPrice(item.product.basePrice)}
              </p>
            </div>
            <button
              onClick={() => removeWishlistMutation.mutate(item.productId)}
              disabled={removeWishlistMutation.isPending}
              aria-label="위시리스트에서 제거"
              className="shrink-0 text-lg text-red-400 transition-colors hover:text-red-600 disabled:opacity-50"
            >
              ♥
            </button>
          </li>
        );
      })}
    </ul>
  );
}
