'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types/product';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
}

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const thumbnail = product.images?.[0]?.url;

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
      </div>
      <div className="space-y-0.5">
        <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
        <p className="text-sm font-semibold text-indigo-600">{formatPrice(product.basePrice)}</p>
      </div>
    </Link>
  );
}
