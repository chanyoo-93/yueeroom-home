'use client';

import { useState } from 'react';
import {
  useAdminProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/lib/hooks/useAdminProducts';
import { useCategories } from '@/lib/hooks/useCategories';
import type { Product } from '@/lib/types/product';

interface FormValues {
  name: string;
  categoryId: string;
  description: string;
  basePrice: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  categoryId?: string;
  basePrice?: string;
}

interface FormState {
  open: boolean;
  mode: 'create' | 'edit';
  product: Product | null;
}

interface DeleteState {
  open: boolean;
  product: Product | null;
}

const EMPTY_FORM: FormValues = {
  name: '',
  categoryId: '',
  description: '',
  basePrice: '',
  isActive: true,
};

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) errors.name = '상품명을 입력해주세요.';
  if (!values.categoryId) errors.categoryId = '카테고리를 선택해주세요.';
  if (values.basePrice === '' || values.basePrice === undefined) {
    errors.basePrice = '가격을 입력해주세요.';
  } else {
    const price = Number(values.basePrice);
    if (isNaN(price)) {
      errors.basePrice = '유효한 숫자를 입력해주세요.';
    } else if (price < 0) {
      errors.basePrice = '가격은 0 이상이어야 합니다.';
    }
  }
  return errors;
}

export default function AdminProductsPage() {
  const [form, setForm] = useState<FormState>({ open: false, mode: 'create', product: null });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false, product: null });
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const { data, isLoading, isError } = useAdminProducts();
  const { data: categories } = useCategories();
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();

  const isMutating = isCreating || isUpdating || isDeleting;

  function openCreateForm() {
    setValues(EMPTY_FORM);
    setErrors({});
    setForm({ open: true, mode: 'create', product: null });
  }

  function openEditForm(product: Product) {
    setValues({
      name: product.name,
      categoryId: product.categoryId,
      description: product.description ?? '',
      basePrice: String(product.basePrice),
      isActive: product.isActive,
    });
    setErrors({});
    setForm({ open: true, mode: 'edit', product });
  }

  function closeForm() {
    setForm({ open: false, mode: 'create', product: null });
  }

  function openDeleteDialog(product: Product) {
    setDeleteState({ open: true, product });
  }

  function closeDeleteDialog() {
    setDeleteState({ open: false, product: null });
  }

  function handleChange(field: keyof FormValues, value: string | boolean) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleSubmit() {
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      name: values.name.trim(),
      categoryId: values.categoryId,
      description: values.description.trim() || undefined,
      basePrice: Number(values.basePrice),
      isActive: values.isActive,
    };

    if (form.mode === 'create') {
      createProduct(payload, { onSuccess: closeForm });
    } else if (form.product) {
      updateProduct({ id: form.product.id, payload }, { onSuccess: closeForm });
    }
  }

  function handleDelete() {
    if (!deleteState.product) return;
    deleteProduct(deleteState.product.id, { onSuccess: closeDeleteDialog });
  }

  const products = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
        <button
          onClick={openCreateForm}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          상품 등록
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : isError ? (
        <p className="text-red-500">상품 목록을 불러오는 중 오류가 발생했습니다.</p>
      ) : products.length === 0 ? (
        <p className="text-gray-500">상품이 없습니다.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">상품명</th>
                <th className="px-4 py-3">카테고리</th>
                <th className="px-4 py-3">가격</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                  <td className="px-4 py-3 text-gray-600">{product.category.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {product.basePrice.toLocaleString('ko-KR')}원
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        product.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {product.isActive ? '판매중' : '판매중지'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditForm(product)}
                        className="rounded px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => openDeleteDialog(product)}
                        className="rounded px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 상품 등록/수정 폼 모달 */}
      {form.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              {form.mode === 'create' ? '상품 등록' : '상품 수정'}
            </h2>

            <div className="space-y-4">
              {/* 상품명 */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  상품명
                </label>
                <input
                  id="name"
                  type="text"
                  value={values.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="상품명을 입력하세요"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              {/* 카테고리 */}
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                  카테고리
                </label>
                <select
                  id="categoryId"
                  value={values.categoryId}
                  onChange={(e) => handleChange('categoryId', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">카테고리 선택</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-xs text-red-500">{errors.categoryId}</p>
                )}
              </div>

              {/* 기본 가격 */}
              <div>
                <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700">
                  기본 가격 (원)
                </label>
                <input
                  id="basePrice"
                  type="number"
                  min={0}
                  value={values.basePrice}
                  onChange={(e) => handleChange('basePrice', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0"
                />
                {errors.basePrice && (
                  <p className="mt-1 text-xs text-red-500">{errors.basePrice}</p>
                )}
              </div>

              {/* 설명 */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  설명 (선택)
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={values.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="상품 설명을 입력하세요"
                />
              </div>

              {/* 판매 상태 */}
              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={values.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  판매 활성화
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeForm}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={isMutating}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteState.open && deleteState.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <p className="mb-6 text-center text-gray-800">
              <span className="font-semibold">{deleteState.product.name}</span> 상품을
              삭제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeDeleteDialog}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                삭제 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
