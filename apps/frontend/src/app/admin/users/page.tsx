'use client';

import { useState } from 'react';
import { useAdminUsers, useApproveUser, useRejectUser } from '@/lib/hooks/useAdminUsers';
import type { AdminUser, UserStatus } from '@/lib/types/admin';

type FilterStatus = UserStatus | undefined;

interface DialogState {
  open: boolean;
  action: 'approve' | 'reject' | null;
  user: AdminUser | null;
}

const STATUS_LABELS: Record<UserStatus, string> = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '거절',
  SUSPENDED: '정지',
};

const STATUS_BADGE: Record<UserStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-gray-100 text-gray-800',
};

const FILTER_BUTTONS: { label: string; value: FilterStatus }[] = [
  { label: '전체', value: undefined },
  { label: 'PENDING', value: 'PENDING' },
  { label: 'APPROVED', value: 'APPROVED' },
  { label: 'REJECTED', value: 'REJECTED' },
];

export default function AdminUsersPage() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(undefined);
  const [dialog, setDialog] = useState<DialogState>({ open: false, action: null, user: null });

  const { data: users, isLoading } = useAdminUsers(statusFilter);
  const { mutate: approve, isPending: isApproving } = useApproveUser();
  const { mutate: reject, isPending: isRejecting } = useRejectUser();

  function openDialog(action: 'approve' | 'reject', user: AdminUser) {
    setDialog({ open: true, action, user });
  }

  function closeDialog() {
    setDialog({ open: false, action: null, user: null });
  }

  function handleConfirm() {
    if (!dialog.user || !dialog.action) return;
    if (dialog.action === 'approve') {
      approve(dialog.user.id);
    } else {
      reject(dialog.user.id);
    }
    closeDialog();
  }

  const isMutating = isApproving || isRejecting;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">회원 가입 신청 관리</h1>

      {/* 상태 필터 */}
      <div className="mb-4 flex gap-2">
        {FILTER_BUTTONS.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setStatusFilter(value)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {isLoading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : !users || users.length === 0 ? (
        <p className="text-gray-500">회원이 없습니다.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">신청일</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[user.status] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {STATUS_LABELS[user.status] ?? user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDialog('approve', user)}
                          disabled={isMutating}
                          className="rounded px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => openDialog('reject', user)}
                          disabled={isMutating}
                          className="rounded px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                          거절
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 확인 다이얼로그 */}
      {dialog.open && dialog.user && dialog.action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <p className="mb-6 text-center text-gray-800">
              {dialog.user.name}님을 {dialog.action === 'approve' ? '승인' : '거절'}하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeDialog}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 rounded-lg py-2 text-sm font-medium text-white ${
                  dialog.action === 'approve'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
