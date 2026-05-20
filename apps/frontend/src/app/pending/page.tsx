'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

const POLL_INTERVAL_MS = 5_000;

export default function PendingPage() {
  const router = useRouter();

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    const checkStatus = async () => {
      try {
        // /auth/refresh는 @Public() 엔드포인트이며, DB에서 현재 status를 조회해 새 쿠키를 발급한다.
        // PENDING 사용자가 /users/me를 호출하면 UserStatusGuard에 의해 403이 반환되므로
        // refresh를 통해 최신 status를 확인한다.
        const refreshRes = await apiClient.post<{ status: UserStatus }>('/auth/refresh');
        const status = refreshRes.data.status;

        if (status === 'APPROVED') {
          router.replace('/');
          return;
        }

        if (status === 'REJECTED' || status === 'SUSPENDED') {
          router.replace('/login');
          return;
        }
      } catch {
        // 폴링 실패 시 무시 (네트워크 오류 등)
      }

      // PENDING 상태 유지 시: 이전 요청 완료 후 다음 폴링 예약 (요청 누적 방지)
      timerId = setTimeout(checkStatus, POLL_INTERVAL_MS);
    };

    checkStatus();
    return () => clearTimeout(timerId);
  }, [router]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
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
