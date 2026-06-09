'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useNewArrivals } from '@/lib/hooks/useNewArrivals';
import { formatPrice } from '@/lib/utils/format';

function SkeletonCard() {
  return (
    <div
      role="status"
      aria-label="로딩 중"
      className="flex animate-pulse items-center gap-3 px-4 py-4"
    >
      <div className="h-[68px] w-[68px] shrink-0 rounded-lg bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default function EditorialHero() {
  const { data, isLoading } = useNewArrivals();
  const topTwo = Array.isArray(data?.data) ? data.data.slice(0, 2) : [];

  return (
    <section
      aria-label="에디토리얼 히어로"
      className="grid h-[300px] grid-cols-[3fr_2fr] overflow-hidden rounded-xl shadow-sm"
    >
      {/* 좌: 히어로 이미지 */}
      <div className="relative">
        <Image src="/banner.jpg" alt="유이룸 배너" fill priority className="object-cover" />
        {/* 이미지 위 그라디언트 오버레이 — 이미지 없을 때도 배경 역할 */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/70 to-indigo-400/70" />
        <div className="absolute bottom-6 left-6 text-white">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-widest opacity-85">
            New Collection
          </p>
          <h1 className="mb-3 text-2xl font-bold">유이룸</h1>
          <Link
            href="/products"
            className="inline-block rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            상품 보기 →
          </Link>
        </div>
      </div>

      {/* 우: 신상품 상위 2개 카드 */}
      <div className="grid grid-rows-2 divide-y divide-gray-200 bg-white">
        {isLoading
          ? [0, 1].map((i) => <SkeletonCard key={i} />)
          : topTwo.map((product) => {
              const thumbnail = product.images?.[0]?.url;
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50"
                >
                  <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={product.name}
                        fill
                        sizes="68px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl text-gray-300">
                        👕
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900">{product.name}</p>
                    {product.brand?.name && (
                      <p className="text-[10px] text-gray-400">{product.brand.name}</p>
                    )}
                    <p className="mt-1 text-xs font-bold text-indigo-600">
                      {formatPrice(product.basePrice)}
                    </p>
                  </div>
                </Link>
              );
            })}
      </div>
    </section>
  );
}
