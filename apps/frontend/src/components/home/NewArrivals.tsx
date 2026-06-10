'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useNewArrivals } from '@/lib/hooks/useNewArrivals';
import { formatPrice } from '@/lib/utils/format';

function SkeletonCard() {
  return (
    <div role="status" aria-label="로딩 중" className="animate-pulse space-y-2">
      <div className="aspect-[4/5] rounded-xl bg-gray-200" />
      <div className="h-3.5 w-3/4 rounded bg-gray-200" />
      <div className="h-3.5 w-1/2 rounded bg-gray-200" />
    </div>
  );
}

export default function NewArrivals() {
  const { data, isLoading, isError } = useNewArrivals();
  const [visibleCount, setVisibleCount] = useState(30);
  const products = Array.isArray(data?.data) ? data.data : [];
  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = products.length > visibleCount;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">신상품</h2>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {isError && (
        <p className="py-8 text-center text-sm text-red-500">상품을 불러오는 데 실패했습니다.</p>
      )}

      {!isLoading && !isError && products.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">등록된 신상품이 없습니다.</p>
      )}

      {!isLoading && !isError && products.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {visibleProducts.map((product) => {
              const thumbnail = product.images?.[0]?.url;
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group space-y-1.5"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gray-100">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-gray-300">
                        👕
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="truncate text-xs font-semibold text-gray-900">{product.name}</p>
                    {product.brand?.name && (
                      <p className="text-[10px] text-gray-400">{product.brand.name}</p>
                    )}
                    <p className="text-xs font-bold text-indigo-600">
                      {formatPrice(product.basePrice)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + 30)}
                className="rounded border border-gray-300 px-10 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900"
              >
                MORE
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
