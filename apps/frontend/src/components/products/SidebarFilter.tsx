'use client';

import type { Category } from '@/lib/types/category';
import type { ProductListParams } from '@/lib/api/products';

const CHILDREN_SIZES = ['80', '90', '100', '110', '120', '130', '140'];

interface Props {
  categories: Category[];
  filters: ProductListParams;
  onChange: (filters: ProductListParams) => void;
}

export default function SidebarFilter({ categories, filters, onChange }: Props) {
  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <aside className="space-y-6" aria-label="상품 필터">
      {/* 카테고리 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">카테고리</h3>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => onChange({ ...filters, categoryId: undefined, page: 1 })}
              className={`w-full rounded px-2 py-1 text-left text-sm ${
                !filters.categoryId
                  ? 'bg-indigo-50 font-medium text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
          </li>
          {activeCategories.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => onChange({ ...filters, categoryId: cat.id, page: 1 })}
                className={`w-full rounded px-2 py-1 text-left text-sm ${
                  filters.categoryId === cat.id
                    ? 'bg-indigo-50 font-medium text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 가격 범위 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">가격</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            aria-label="최소 가격"
            placeholder="최소"
            min={0}
            value={filters.minPrice ?? ''}
            onChange={(e) =>
              onChange({
                ...filters,
                minPrice: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              })
            }
            className="w-full rounded border px-2 py-1 text-sm"
          />
          <span className="text-gray-400">~</span>
          <input
            type="number"
            aria-label="최대 가격"
            placeholder="최대"
            min={0}
            value={filters.maxPrice ?? ''}
            onChange={(e) =>
              onChange({
                ...filters,
                maxPrice: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              })
            }
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* 사이즈 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">사이즈</h3>
        <div className="flex flex-wrap gap-2">
          {CHILDREN_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  size: filters.size === size ? undefined : size,
                  page: 1,
                })
              }
              className={`rounded border px-2 py-1 text-xs ${
                filters.size === size
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* 초기화 */}
      <button
        type="button"
        onClick={() => onChange({ page: 1 })}
        className="w-full rounded border border-gray-300 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
      >
        필터 초기화
      </button>
    </aside>
  );
}
