'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

const POLL_INTERVAL_MS = 30_000;

export default function PendingPage() {
  const router = useRouter();

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    const checkStatus = async () => {
      try {
        const res = await apiClient.get<{ status: UserStatus }>('/auth/me');
        const { status } = res.data;

        if (status === 'APPROVED') {
          // 미들웨어 JWT 상태 업데이트를 위해 새 access_token 발급 후 쿠키 갱신
          // (기존 쿠키의 JWT payload는 PENDING 상태이므로 갱신하지 않으면 무한 리다이렉트 발생)
          const refreshRes = await apiClient.post<{ accessToken: string }>('/auth/refresh');
          const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
          document.cookie = `access_token=${refreshRes.data.accessToken}; path=/; SameSite=Strict${secure}`;
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
      // access_token은 클라이언트가 직접 설정한 non-httpOnly 쿠키이므로 삭제 가능
      // refresh_token은 서버(AuthController.logout)에서 clearCookie로 삭제됨
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
