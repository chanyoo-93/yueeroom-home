'use client';

import { useState } from 'react';
import { useBrands, useCreateBrand, useDeleteBrand } from '@/lib/hooks/useAdminBrands';

export default function AdminBrandsPage() {
  const [name, setName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState('');

  const { data: brands, isLoading, isError } = useBrands();
  const { mutate: createBrand, isPending: isCreating } = useCreateBrand();
  const { mutate: deleteBrand, isPending: isDeleting } = useDeleteBrand();

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('브랜드명을 입력해주세요.');
      return;
    }
    setError('');
    createBrand(trimmed, {
      onSuccess: () => setName(''),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
        setError(msg ?? '브랜드 생성에 실패했습니다.');
      },
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteBrand(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
        alert(msg ?? '브랜드 삭제에 실패했습니다.');
        setDeleteTarget(null);
      },
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">브랜드 관리</h1>
      </div>

      {/* 브랜드 추가 */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">새 브랜드 추가</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="브랜드명 입력"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            추가
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>

      {/* 브랜드 목록 */}
      {isLoading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : isError ? (
        <p className="text-red-500">브랜드 목록을 불러오는 중 오류가 발생했습니다.</p>
      ) : !brands || brands.length === 0 ? (
        <p className="text-gray-500">등록된 브랜드가 없습니다.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">브랜드명</th>
                <th className="px-4 py-3">등록일</th>
                <th className="px-4 py-3">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brands.map((brand) => (
                <tr key={brand.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{brand.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(brand.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDeleteTarget({ id: brand.id, name: brand.name })}
                      className="rounded px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <p className="mb-6 text-center text-gray-800">
              <span className="font-semibold">{deleteTarget.name}</span> 브랜드를 삭제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
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
