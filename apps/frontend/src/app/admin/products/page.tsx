'use client';

import { useState, useEffect } from 'react';
import {
  useAdminProducts,
  useAdminProductDetail,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateVariant,
  useDeleteVariant,
} from '@/lib/hooks/useAdminProducts';
import ProductImageManager from '@/components/admin/ProductImageManager';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { useCategories } from '@/lib/hooks/useCategories';
import { useBrands } from '@/lib/hooks/useAdminBrands';
import { formatPrice } from '@/lib/utils/format';
import type { Product } from '@/lib/types/product';
import type { CreateVariantPayload } from '@/lib/api/admin-products';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormValues {
  name: string;
  categoryId: string;
  brandId: string;
  description: string;
  basePrice: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  categoryId?: string;
  basePrice?: string;
}

interface VariantRow {
  size: string;
  color: string;
  price: string;
  sku: string;
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

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormValues = {
  name: '',
  categoryId: '',
  brandId: '',
  description: '',
  basePrice: '',
  isActive: true,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) errors.name = '상품명을 입력해주세요.';
  if (!values.categoryId) errors.categoryId = '카테고리를 선택해주세요.';
  if (values.basePrice === '') {
    errors.basePrice = '가격을 입력해주세요.';
  } else {
    const price = Number(values.basePrice);
    if (isNaN(price)) errors.basePrice = '유효한 숫자를 입력해주세요.';
    else if (price < 0) errors.basePrice = '가격은 0 이상이어야 합니다.';
  }
  return errors;
}

function buildVariants(sizes: string[], colors: string[], basePrice: string): VariantRow[] {
  const price = basePrice || '0';
  return sizes.flatMap((size) =>
    colors.map((color) => ({
      size,
      color,
      price,
      sku: `${size}-${color}`.toUpperCase().replace(/\s+/g, '_'),
    })),
  );
}

function mapRowsToPayloads(rows: VariantRow[], basePrice: string): CreateVariantPayload[] {
  return rows.map((row) => ({
    size: row.size,
    color: row.color,
    price: row.price === '' || isNaN(Number(row.price)) ? Number(basePrice) : Number(row.price),
    sku: row.sku.trim(),
  }));
}

// ── Tag Input ─────────────────────────────────────────────────────────────────

function TagInput({
  label,
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  function add() {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
      setInput('');
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 flex flex-wrap gap-1.5 rounded-md border border-gray-300 p-2 min-h-[42px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemove(tag)}
              className="hover:text-blue-600"
              aria-label={`${tag} 삭제`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] border-none text-sm outline-none bg-transparent"
        />
      </div>
      <p className="mt-0.5 text-xs text-gray-400">입력 후 Enter</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const [form, setForm] = useState<FormState>({ open: false, mode: 'create', product: null });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false, product: null });
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [colorOptions, setColorOptions] = useState<string[]>([]);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [variantError, setVariantError] = useState('');
  const [editProductId, setEditProductId] = useState('');

  const { data, isLoading, isError } = useAdminProducts();
  const { data: editProductDetail, isLoading: isLoadingDetail } =
    useAdminProductDetail(editProductId);
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();
  const { mutateAsync: createVariant } = useCreateVariant();
  const { mutate: deleteVariant, isPending: isDeletingVariant } = useDeleteVariant();

  const isMutating = isCreating || isUpdating || isDeleting || isDeletingVariant;

  // 사이즈 또는 색상 변경 시 신규 추가할 variant 테이블 자동 재생성
  useEffect(() => {
    if (sizeOptions.length === 0 || colorOptions.length === 0) {
      setVariantRows([]);
      return;
    }

    setVariantRows((prev) => {
      const next = buildVariants(sizeOptions, colorOptions, values.basePrice);
      // 기존 행의 가격/SKU 보존
      return next.map((row) => {
        const existing = prev.find((p) => p.size === row.size && p.color === row.color);
        return existing ?? row;
      });
    });
  }, [sizeOptions, colorOptions, values.basePrice]);

  function openCreateForm() {
    setValues(EMPTY_FORM);
    setErrors({});
    setSizeOptions([]);
    setColorOptions([]);
    setVariantRows([]);
    setVariantError('');
    setForm({ open: true, mode: 'create', product: null });
  }

  function openEditForm(product: Product) {
    setValues({
      name: product.name,
      categoryId: product.categoryId,
      brandId: product.brandId ?? '',
      description: product.description ?? '',
      basePrice: String(product.basePrice),
      isActive: product.isActive,
    });
    setErrors({});
    setSizeOptions([]);
    setColorOptions([]);
    setVariantRows([]);
    setVariantError('');
    setEditProductId(product.id);
    setForm({ open: true, mode: 'edit', product });
  }

  function closeForm() {
    setEditProductId('');
    setForm({ open: false, mode: 'create', product: null });
  }

  function handleChange(field: keyof FormValues, value: string | boolean) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function updateVariantRow(index: number, field: keyof VariantRow, value: string) {
    setVariantRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function removeVariantRow(index: number) {
    setVariantRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // 신규 추가할 variant 유효성 검사
    if (variantRows.length > 0) {
      const hasEmptySku = variantRows.some((r) => !r.sku.trim());
      const skus = variantRows.map((r) => r.sku.trim());
      const hasDuplicateSku = new Set(skus).size !== skus.length;

      if (hasEmptySku) {
        setVariantError('모든 옵션의 SKU를 입력해주세요.');
        return;
      }
      if (hasDuplicateSku) {
        setVariantError('SKU가 중복되었습니다. 각 옵션의 SKU는 고유해야 합니다.');
        return;
      }
    }
    setVariantError('');

    const variantPayloads =
      variantRows.length > 0 ? mapRowsToPayloads(variantRows, values.basePrice) : undefined;

    const payload = {
      name: values.name.trim(),
      categoryId: values.categoryId,
      brandId: values.brandId || null,
      description: values.description.trim() || undefined,
      basePrice: Number(values.basePrice),
      isActive: values.isActive,
    };

    if (form.mode === 'create') {
      createProduct(
        { ...payload, variants: variantPayloads },
        { onSuccess: (newProduct) => openEditForm(newProduct) },
      );
    } else if (form.product) {
      const productId = form.product.id;
      updateProduct(
        { id: productId, payload },
        {
          onSuccess: async () => {
            if (variantPayloads) {
              await Promise.all(
                variantPayloads.map((vp) => createVariant({ productId, payload: vp })),
              );
            }
            closeForm();
          },
        },
      );
    }
  }

  function handleDelete() {
    if (!deleteState.product) return;
    deleteProduct(deleteState.product.id, {
      onSuccess: () => setDeleteState({ open: false, product: null }),
    });
  }

  const products = data?.data ?? [];
  const isCreateMode = form.mode === 'create';

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
                <th className="px-4 py-3">브랜드</th>
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
                  <td className="px-4 py-3 text-gray-500">{product.brand?.name ?? '-'}</td>
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
                        onClick={() => setDeleteState({ open: true, product })}
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

      {/* 상품 등록/수정 모달 */}
      {form.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              {isCreateMode ? '상품 등록' : '상품 수정'}
            </h2>

            <div className="space-y-4">
              {/* 이미지 관리 — 수정 모드에서만 */}
              {!isCreateMode && form.product && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">상품 이미지</h3>
                  <ProductImageManager
                    productId={form.product.id}
                    images={editProductDetail?.images ?? []}
                  />
                </div>
              )}

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

              {/* 카테고리 + 브랜드 */}
              <div className="grid grid-cols-2 gap-3">
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

                <div>
                  <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">
                    브랜드 (선택)
                  </label>
                  <select
                    id="brandId"
                    value={values.brandId}
                    onChange={(e) => handleChange('brandId', e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">브랜드 없음</option>
                    {brands?.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                <label className="block text-sm font-medium text-gray-700">상세 설명 (선택)</label>
                <div className="mt-1">
                  <RichTextEditor
                    content={values.description}
                    onChange={(html) => handleChange('description', html)}
                    productId={isCreateMode ? undefined : form.product?.id}
                  />
                </div>
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

              {/* 기존 옵션 목록 — 수정 모드에서만 */}
              {!isCreateMode && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">등록된 옵션</h3>
                  {isLoadingDetail ? (
                    <p className="text-xs text-gray-400">불러오는 중...</p>
                  ) : editProductDetail?.variants?.length ? (
                    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-500">
                          <tr>
                            <th className="px-3 py-2 text-left">사이즈</th>
                            <th className="px-3 py-2 text-left">색상</th>
                            <th className="px-3 py-2 text-left">가격</th>
                            <th className="px-3 py-2 text-left">SKU</th>
                            <th className="px-3 py-2 text-left">재고</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {editProductDetail.variants.map((v) => (
                            <tr key={v.id}>
                              <td className="px-3 py-1.5 text-gray-700">{v.size}</td>
                              <td className="px-3 py-1.5 text-gray-700">{v.color}</td>
                              <td className="px-3 py-1.5 text-gray-700">{formatPrice(v.price)}</td>
                              <td className="px-3 py-1.5 text-gray-500">{v.sku}</td>
                              <td className="px-3 py-1.5 text-gray-500">
                                {v.inventory?.quantity ?? 0}개
                              </td>
                              <td className="px-3 py-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    form.product &&
                                    window.confirm('이 옵션을 삭제하시겠습니까?') &&
                                    deleteVariant({
                                      productId: form.product.id,
                                      variantId: v.id,
                                    })
                                  }
                                  disabled={isDeletingVariant}
                                  className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                  aria-label="옵션 삭제"
                                >
                                  삭제
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">등록된 옵션이 없습니다.</p>
                  )}
                </div>
              )}

              {/* 옵션(Variant) 빌더 */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  {isCreateMode ? '옵션 설정' : '옵션 추가'}{' '}
                  <span className="font-normal text-gray-400">(선택)</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <TagInput
                    label="사이즈"
                    tags={sizeOptions}
                    onAdd={(v) => setSizeOptions((prev) => [...prev, v])}
                    onRemove={(v) => setSizeOptions((prev) => prev.filter((s) => s !== v))}
                    placeholder="예: 80, 90, 100"
                  />
                  <TagInput
                    label="색상"
                    tags={colorOptions}
                    onAdd={(v) => setColorOptions((prev) => [...prev, v])}
                    onRemove={(v) => setColorOptions((prev) => prev.filter((c) => c !== v))}
                    placeholder="예: 블루, 핑크"
                  />
                </div>

                {variantRows.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-gray-500">
                      옵션 조합 {variantRows.length}개 — 가격과 SKU를 확인·수정하세요. SKU는 전체
                      상품에서 고유해야 합니다.
                    </p>
                    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-500">
                          <tr>
                            <th className="px-3 py-2 text-left">사이즈</th>
                            <th className="px-3 py-2 text-left">색상</th>
                            <th className="px-3 py-2 text-left">가격 (원)</th>
                            <th className="px-3 py-2 text-left">SKU</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {variantRows.map((row, i) => (
                            <tr key={`${row.size}-${row.color}`}>
                              <td className="px-3 py-1.5 text-gray-700">{row.size}</td>
                              <td className="px-3 py-1.5 text-gray-700">{row.color}</td>
                              <td className="px-3 py-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={row.price}
                                  onChange={(e) => updateVariantRow(i, 'price', e.target.value)}
                                  className="w-24 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <input
                                  type="text"
                                  value={row.sku}
                                  onChange={(e) => updateVariantRow(i, 'sku', e.target.value)}
                                  className="w-36 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <button
                                  type="button"
                                  onClick={() => removeVariantRow(i)}
                                  className="text-red-500 hover:text-red-700"
                                  aria-label="옵션 삭제"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {variantError && <p className="mt-1 text-xs text-red-500">{variantError}</p>}
                  </div>
                )}

                {sizeOptions.length > 0 && colorOptions.length === 0 && (
                  <p className="text-xs text-amber-600">색상도 입력하면 옵션 조합이 생성됩니다.</p>
                )}
                {colorOptions.length > 0 && sizeOptions.length === 0 && (
                  <p className="text-xs text-amber-600">
                    사이즈도 입력하면 옵션 조합이 생성됩니다.
                  </p>
                )}
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
                onClick={() => setDeleteState({ open: false, product: null })}
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
