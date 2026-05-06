'use client';

import Link from 'next/link';
import { useCategories } from '@/lib/hooks/useCategories';

const CATEGORY_ICONS: Record<string, string> = {
  top: '👕',
  bottom: '👖',
  onepiece: '👗',
  outer: '🧥',
  shoes: '👟',
  accessory: '🎀',
};

function SkeletonItem() {
  return (
    <div role="status" aria-label="로딩 중" className="animate-pulse space-y-2 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-gray-200" />
      <div className="mx-auto h-3.5 w-12 rounded bg-gray-200" />
    </div>
  );
}

export default function CategoryQuickLinks() {
  const { data, isLoading } = useCategories();

  const activeCategories = (Array.isArray(data) ? data : []).filter((c) => c.isActive);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">카테고리</h2>

      {isLoading && (
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonItem key={i} />
          ))}
        </div>
      )}

      {!isLoading && activeCategories.length > 0 && (
        <div
          data-testid="category-grid"
          className="grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-8"
        >
          {activeCategories.map((category) => (
            <Link
              key={category.id}
              href={`/products?categoryId=${category.id}`}
              aria-label={category.name}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-2xl transition-colors group-hover:bg-indigo-100">
                {CATEGORY_ICONS[category.slug] ?? '🏷️'}
              </div>
              <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-600">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
