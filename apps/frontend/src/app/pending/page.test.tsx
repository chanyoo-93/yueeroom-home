import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    // 기본값: PENDING (마운트 직후 checkStatus 호출 시 타이머 예약만 하고 리다이렉트 없음)
    vi.mocked(apiClient.get).mockResolvedValue({ data: { status: 'PENDING' } });
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

  it('마운트 직후 APPROVED 상태이면 토큰 갱신 후 홈으로 리다이렉트한다', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { status: 'APPROVED' } });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { accessToken: 'new-approved-token' } });
    render(<PendingPage />);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh');
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('PENDING 상태이면 리다이렉트하지 않는다', async () => {
    render(<PendingPage />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('REJECTED 상태이면 /login으로 리다이렉트한다', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { status: 'REJECTED' } });
    render(<PendingPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('SUSPENDED 상태이면 /login으로 리다이렉트한다', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { status: 'SUSPENDED' } });
    render(<PendingPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });
});
