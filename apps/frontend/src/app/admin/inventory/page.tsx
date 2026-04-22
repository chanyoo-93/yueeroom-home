'use client';

import { useState } from 'react';
import {
  useAdminInventory,
  useUpdateInventoryQuantity,
  useUpdateInventoryThreshold,
} from '@/lib/hooks/useAdminInventory';
import type { InventoryItem } from '@/lib/types/inventory';

interface QuantityEditState {
  variantId: string | null;
  value: string;
}

interface ThresholdEditState {
  variantId: string | null;
  value: string;
}

function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.lowStockThreshold;
}

export default function AdminInventoryPage() {
  const [quantityEdit, setQuantityEdit] = useState<QuantityEditState>({
    variantId: null,
    value: '',
  });
  const [thresholdEdit, setThresholdEdit] = useState<ThresholdEditState>({
    variantId: null,
    value: '',
  });

  const { data: inventories, isLoading, isError } = useAdminInventory();
  const { mutate: updateQuantity, isPending: isUpdatingQuantity } = useUpdateInventoryQuantity();
  const { mutate: updateThreshold, isPending: isUpdatingThreshold } = useUpdateInventoryThreshold();

  function openQuantityEdit(item: InventoryItem) {
    setQuantityEdit({ variantId: item.variantId, value: String(item.quantity) });
    setThresholdEdit({ variantId: null, value: '' });
  }

  function openThresholdEdit(item: InventoryItem) {
    setThresholdEdit({ variantId: item.variantId, value: String(item.lowStockThreshold) });
    setQuantityEdit({ variantId: null, value: '' });
  }

  function cancelEdit() {
    setQuantityEdit({ variantId: null, value: '' });
    setThresholdEdit({ variantId: null, value: '' });
  }

  function submitQuantity(variantId: string) {
    const qty = Number(quantityEdit.value);
    if (isNaN(qty) || qty < 0) return;
    updateQuantity({ variantId, quantity: qty }, { onSuccess: cancelEdit });
  }

  function submitThreshold(variantId: string) {
    const thr = Number(thresholdEdit.value);
    if (isNaN(thr) || thr < 0) return;
    updateThreshold({ variantId, lowStockThreshold: thr }, { onSuccess: cancelEdit });
  }

  const items = inventories ?? [];
  const lowStockCount = items.filter(isLowStock).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">재고 관리</h1>
        {lowStockCount > 0 && (
          <span
            aria-label="부족 재고 건수"
            className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700"
          >
            부족 {lowStockCount}건
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : isError ? (
        <p className="text-red-500">재고 목록을 불러오는 중 오류가 발생했습니다.</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">재고 항목이 없습니다.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">상품명</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">사이즈 / 색상</th>
                <th className="px-4 py-3">수량</th>
                <th className="px-4 py-3">임계값</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const low = isLowStock(item);
                const editingQty = quantityEdit.variantId === item.variantId;
                const editingThr = thresholdEdit.variantId === item.variantId;

                return (
                  <tr
                    key={item.variantId}
                    className={low ? 'bg-red-50' : 'hover:bg-gray-50'}
                    data-testid={low ? 'low-stock-row' : 'normal-stock-row'}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.variant.product.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {item.variant.sku}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.variant.size} / {item.variant.color}
                    </td>

                    {/* 수량 셀 */}
                    <td className="px-4 py-3">
                      {editingQty ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={quantityEdit.value}
                            onChange={(e) =>
                              setQuantityEdit((prev) => ({ ...prev, value: e.target.value }))
                            }
                            aria-label="수량 입력"
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            onClick={() => submitQuantity(item.variantId)}
                            disabled={isUpdatingQuantity}
                            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <span className={low ? 'font-semibold text-red-700' : 'text-gray-800'}>
                          {item.quantity}
                        </span>
                      )}
                    </td>

                    {/* 임계값 셀 */}
                    <td className="px-4 py-3">
                      {editingThr ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={thresholdEdit.value}
                            onChange={(e) =>
                              setThresholdEdit((prev) => ({ ...prev, value: e.target.value }))
                            }
                            aria-label="임계값 입력"
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            onClick={() => submitThreshold(item.variantId)}
                            disabled={isUpdatingThreshold}
                            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-600">{item.lowStockThreshold}</span>
                      )}
                    </td>

                    {/* 상태 배지 */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          low ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {low ? '부족' : '정상'}
                      </span>
                    </td>

                    {/* 작업 버튼 */}
                    <td className="px-4 py-3">
                      {!editingQty && !editingThr && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openQuantityEdit(item)}
                            className="rounded px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                          >
                            수량 수정
                          </button>
                          <button
                            onClick={() => openThresholdEdit(item)}
                            className="rounded px-3 py-1 text-xs font-medium text-white bg-gray-600 hover:bg-gray-700"
                          >
                            임계값 설정
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
