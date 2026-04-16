'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  useAddWishlistItem,
  useRemoveWishlistItem,
  useWishlistStatus,
} from '@/lib/hooks/useWishlist';
import type { Product } from '@/lib/types/product';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
}

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const thumbnail = product.images?.[0]?.url;
  const isWishlisted = useWishlistStatus(product.id);
  const addWishlistMutation = useAddWishlistItem();
  const removeWishlistMutation = useRemoveWishlistItem();

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault(); // Link 클릭 방지
    e.stopPropagation(); // 이벤트 버블링 방지
    if (isWishlisted) {
      removeWishlistMutation.mutate(product.id);
    } else {
      addWishlistMutation.mutate(product.id);
    }
  };

  return (
    <Link href={`/products/${product.id}`} className="group space-y-2">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-gray-300">👕</div>
        )}
        <button
          onClick={handleToggleWishlist}
          disabled={addWishlistMutation.isPending || removeWishlistMutation.isPending}
          aria-label={isWishlisted ? '위시리스트에서 제거' : '위시리스트에 추가'}
          aria-pressed={isWishlisted}
          className={`absolute right-2 top-2 rounded-full p-1.5 text-lg leading-none shadow-sm transition-colors disabled:opacity-50 ${
            isWishlisted ? 'bg-red-50 text-red-500' : 'bg-white/80 text-gray-400 hover:text-red-400'
          }`}
        >
          {isWishlisted ? '♥' : '♡'}
        </button>
      </div>
      <div className="space-y-0.5">
        <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
        <p className="text-sm font-semibold text-indigo-600">{formatPrice(product.basePrice)}</p>
      </div>
    </Link>
  );
}
