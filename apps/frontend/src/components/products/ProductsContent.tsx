'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useProducts } from '@/lib/hooks/useProducts';
import { useCategories } from '@/lib/hooks/useCategories';
import ProductCard from '@/components/products/ProductCard';
import SidebarFilter from '@/components/products/SidebarFilter';
import SortDropdown from '@/components/products/SortDropdown';
import Pagination from '@/components/products/Pagination';
import type { ProductListParams, SortOrder } from '@/lib/api/products';

function SkeletonCard() {
  return (
    <div role="status" aria-label="로딩 중" className="animate-pulse space-y-3">
      <div className="aspect-square rounded-xl bg-gray-200" />
      <div className="h-4 w-3/4 rounded bg-gray-200" />
      <div className="h-4 w-1/2 rounded bg-gray-200" />
    </div>
  );
}

export default function ProductsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: ProductListParams = {
    categoryId: searchParams.get('categoryId') ?? undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    size: searchParams.get('size') ?? undefined,
    sort: (searchParams.get('sort') as SortOrder) || undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
  };

  const { data, isLoading, isError } = useProducts(filters);
  const { data: categories = [] } = useCategories();

  const handleFilterChange = (newFilters: ProductListParams) => {
    // 기존 URL 파라미터를 기반으로 시작하여 필터 외 파라미터(예: 마케팅 추적 파라미터)를 보존
    const params = new URLSearchParams(searchParams.toString());

    // 필터 관련 파라미터 초기화 후 새 값 적용
    ['categoryId', 'minPrice', 'maxPrice', 'size', 'sort', 'page'].forEach((key) =>
      params.delete(key),
    );
    if (newFilters.categoryId) params.set('categoryId', newFilters.categoryId);
    if (newFilters.minPrice !== undefined) params.set('minPrice', String(newFilters.minPrice));
    if (newFilters.maxPrice !== undefined) params.set('maxPrice', String(newFilters.maxPrice));
    if (newFilters.size) params.set('size', newFilters.size);
    if (newFilters.sort) params.set('sort', newFilters.sort);
    if (newFilters.page && newFilters.page > 1) params.set('page', String(newFilters.page));

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  };

  const currentPage = filters.page ?? 1;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;
  const currentSort: SortOrder = filters.sort ?? 'latest';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">상품 목록</h1>

      <div className="flex gap-8">
        {/* 사이드바 필터 */}
        <div className="hidden w-56 shrink-0 lg:block">
          <SidebarFilter categories={categories} filters={filters} onChange={handleFilterChange} />
        </div>

        {/* 메인 콘텐츠 */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* 상단: 결과 수 + 정렬 */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {!isLoading && data ? `총 ${data.total}개` : ''}
            </p>
            <SortDropdown
              value={currentSort}
              onChange={(sort) => handleFilterChange({ ...filters, sort, page: 1 })}
            />
          </div>

          {/* 로딩 */}
          {isLoading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* 에러 */}
          {isError && (
            <p className="py-12 text-center text-sm text-red-500">
              상품을 불러오는 데 실패했습니다.
            </p>
          )}

          {/* 빈 상태 */}
          {!isLoading && !isError && data?.data.length === 0 && (
            <p className="py-12 text-center text-sm text-gray-500">조건에 맞는 상품이 없습니다.</p>
          )}

          {/* 상품 그리드 */}
          {!isLoading && !isError && data && data.data.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {data.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          {!isLoading && totalPages > 1 && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={(page) => handleFilterChange({ ...filters, page })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
