'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

const POLL_INTERVAL_MS = 30_000;

export default function PendingPage() {
  const router = useRouter();

  // 30초마다 승인 상태 폴링 → APPROVED 전환 시 홈으로 리다이렉트
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await apiClient.get<{ status: string }>('/auth/me');
        if (res.data.status === 'APPROVED') {
          clearInterval(id);
          router.replace('/');
        }
      } catch {
        // 폴링 실패 시 무시 (네트워크 오류 등)
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [router]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      router.push('/login');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold">승인 대기 중</h1>
        <p className="text-gray-700">
          가입 신청이 완료되었습니다. 관리자 승인 후 서비스를 이용하실 수 있습니다.
        </p>
        <p className="text-sm text-gray-500">예상 처리 기간: 영업일 기준 1~3일</p>
        <p className="text-sm text-gray-400">승인 완료 시 자동으로 이동합니다.</p>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded border border-gray-300 px-6 py-2 text-sm hover:bg-gray-50"
        >
          로그아웃
        </button>
      </div>
    </main>
  );
}
