'use client';

import { useState, useEffect } from 'react';
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

  // 가격 입력은 로컬 state로 관리 → onBlur 시 부모에 전달하여 불필요한 API 호출 방지
  const [localMin, setLocalMin] = useState<string>(filters.minPrice?.toString() ?? '');
  const [localMax, setLocalMax] = useState<string>(filters.maxPrice?.toString() ?? '');

  // 외부(예: 필터 초기화)에서 minPrice/maxPrice가 변경되면 로컬 state 동기화
  useEffect(() => {
    setLocalMin(filters.minPrice?.toString() ?? '');
  }, [filters.minPrice]);

  useEffect(() => {
    setLocalMax(filters.maxPrice?.toString() ?? '');
  }, [filters.maxPrice]);

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
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            onBlur={() =>
              onChange({
                ...filters,
                minPrice: localMin ? Number(localMin) : undefined,
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
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            onBlur={() =>
              onChange({
                ...filters,
                maxPrice: localMax ? Number(localMax) : undefined,
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
