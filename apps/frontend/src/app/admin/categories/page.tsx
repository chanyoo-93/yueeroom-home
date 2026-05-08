'use client';

import { useState } from 'react';
import { useCategories } from '@/lib/hooks/useCategories';
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/lib/hooks/useAdminCategories';
import type { Category } from '@/lib/types/category';

interface FormValues {
  name: string;
  slug: string;
  displayOrder: string;
  isActive: boolean;
}

interface FormState {
  open: boolean;
  mode: 'create' | 'edit';
  category: Category | null;
}

const EMPTY_FORM: FormValues = {
  name: '',
  slug: '',
  displayOrder: '0',
  isActive: true,
};

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-가-힣]/g, '');
}

export default function AdminCategoriesPage() {
  const [form, setForm] = useState<FormState>({ open: false, mode: 'create', category: null });
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [nameError, setNameError] = useState('');

  const { data: categories, isLoading, isError } = useCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();

  const isMutating = isCreating || isUpdating || isDeleting;

  function openCreateForm() {
    setValues(EMPTY_FORM);
    setNameError('');
    setForm({ open: true, mode: 'create', category: null });
  }

  function openEditForm(category: Category) {
    setValues({
      name: category.name,
      slug: category.slug,
      displayOrder: String(category.displayOrder),
      isActive: category.isActive,
    });
    setNameError('');
    setForm({ open: true, mode: 'edit', category });
  }

  function closeForm() {
    setForm({ open: false, mode: 'create', category: null });
  }

  function handleChange(field: keyof FormValues, value: string | boolean) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && typeof value === 'string' && prev.slug === toSlug(prev.name)) {
        next.slug = toSlug(value);
      }
      return next;
    });
    if (field === 'name') setNameError('');
  }

  function handleSubmit() {
    if (!values.name.trim()) {
      setNameError('카테고리명을 입력해주세요.');
      return;
    }

    const payload = {
      name: values.name.trim(),
      slug: values.slug.trim() || toSlug(values.name.trim()),
      displayOrder: Number(values.displayOrder) || 0,
      isActive: values.isActive,
    };

    if (form.mode === 'create') {
      createCategory(payload, { onSuccess: closeForm });
    } else if (form.category) {
      updateCategory({ id: form.category.id, payload }, { onSuccess: closeForm });
    }
  }

  const list = categories ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">카테고리 관리</h1>
        <button
          onClick={openCreateForm}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          카테고리 등록
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : isError ? (
        <p className="text-red-500">카테고리 목록을 불러오는 중 오류가 발생했습니다.</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500">등록된 카테고리가 없습니다.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">카테고리명</th>
                <th className="px-4 py-3">슬러그</th>
                <th className="px-4 py-3">순서</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-4 py-3 text-gray-600">{cat.slug}</td>
                  <td className="px-4 py-3 text-gray-600">{cat.displayOrder}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        cat.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditForm(cat)}
                        className="rounded px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
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

      {/* 등록/수정 모달 */}
      {form.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              {form.mode === 'create' ? '카테고리 등록' : '카테고리 수정'}
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700">
                  카테고리명
                </label>
                <input
                  id="cat-name"
                  type="text"
                  value={values.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="예: 상의"
                />
                {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
              </div>

              <div>
                <label htmlFor="cat-slug" className="block text-sm font-medium text-gray-700">
                  슬러그 (선택)
                </label>
                <input
                  id="cat-slug"
                  type="text"
                  value={values.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="자동 생성됩니다"
                />
              </div>

              <div>
                <label htmlFor="cat-order" className="block text-sm font-medium text-gray-700">
                  표시 순서
                </label>
                <input
                  id="cat-order"
                  type="number"
                  min={0}
                  value={values.displayOrder}
                  onChange={(e) => handleChange('displayOrder', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="cat-active"
                  type="checkbox"
                  checked={values.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="cat-active" className="text-sm font-medium text-gray-700">
                  활성화
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
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <p className="mb-6 text-center text-gray-800">
              <span className="font-semibold">{deleteTarget.name}</span> 카테고리를
              삭제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() =>
                  deleteCategory(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
                }
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
