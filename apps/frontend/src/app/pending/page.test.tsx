import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
}));

import PendingPage from './page';
import { apiClient } from '@/lib/api/client';

describe('PendingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('승인 대기 안내 메시지와 로그아웃 버튼이 렌더링된다', () => {
    render(<PendingPage />);
    expect(screen.getByText(/승인 대기/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });

  it('예상 처리 기간 안내가 표시된다', () => {
    render(<PendingPage />);
    expect(screen.getByText(/예상 처리 기간/)).toBeInTheDocument();
  });

  it('로그아웃 버튼 클릭 시 로그아웃 API를 호출하고 /login으로 리다이렉트한다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({});
    render(<PendingPage />);

    await user.click(screen.getByRole('button', { name: '로그아웃' }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('상태 폴링', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('폴링 시 APPROVED 상태이면 홈으로 리다이렉트한다', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { status: 'APPROVED' } });
      render(<PendingPage />);

      await vi.advanceTimersByTimeAsync(30_000);

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(mockReplace).toHaveBeenCalledWith('/');
    });

    it('폴링 시 PENDING 상태이면 리다이렉트하지 않는다', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { status: 'PENDING' } });
      render(<PendingPage />);

      await vi.advanceTimersByTimeAsync(30_000);

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
