'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useNewArrivals } from '@/lib/hooks/useNewArrivals';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
}

function SkeletonCard() {
  return (
    <div role="status" aria-label="로딩 중" className="animate-pulse space-y-3">
      <div className="aspect-square rounded-xl bg-gray-200" />
      <div className="h-4 w-3/4 rounded bg-gray-200" />
      <div className="h-4 w-1/2 rounded bg-gray-200" />
    </div>
  );
}

export default function NewArrivals() {
  const { data, isLoading, isError } = useNewArrivals();

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">신상품</h2>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {isError && (
        <p className="py-8 text-center text-sm text-red-500">상품을 불러오는 데 실패했습니다.</p>
      )}

      {!isLoading && !isError && data?.data.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">등록된 신상품이 없습니다.</p>
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {data.data.map((product) => {
            const thumbnail = product.images?.[0]?.url;
            return (
              <Link key={product.id} href={`/products/${product.id}`} className="group space-y-2">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-gray-300">
                      👕
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm font-semibold text-indigo-600">
                    {formatPrice(product.basePrice)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
