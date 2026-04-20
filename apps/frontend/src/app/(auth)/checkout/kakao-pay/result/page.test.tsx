import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/api/payments', () => ({
  kakaoPayApprove: vi.fn(),
}));

vi.mock('@/lib/stores/cart', () => ({
  useCartStore: vi.fn(() => vi.fn()),
}));

import { useSearchParams } from 'next/navigation';
import { kakaoPayApprove } from '@/lib/api/payments';
import { useCartStore } from '@/lib/stores/cart';
import KakaoPayResultPage from './page';

const mockUseSearchParams = vi.mocked(useSearchParams);
const mockKakaoPayApprove = vi.mocked(kakaoPayApprove);
const mockUseCartStore = vi.mocked(useCartStore);

describe('KakaoPayResultPage', () => {
  const mockClearCart = vi.fn();
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue({ get: mockGet } as unknown as ReturnType<
      typeof useSearchParams
    >);
    mockUseCartStore.mockReturnValue(mockClearCart);
  });

  it('pg_token 또는 orderId 없음 → 결제 실패 메시지 표시', async () => {
    mockGet.mockReturnValue(null);

    render(<KakaoPayResultPage />);

    await waitFor(() => {
      expect(screen.getByText('결제 실패')).toBeInTheDocument();
      expect(screen.getByText('결제 정보가 올바르지 않습니다.')).toBeInTheDocument();
    });
  });

  it('kakaoPayApprove 성공 → 결제 완료 메시지 + clearCart 호출', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'pg_token') return 'pg_token_123';
      if (key === 'orderId') return 'order-1';
      return null;
    });
    mockKakaoPayApprove.mockResolvedValue({ orderId: 'order-1', status: 'COMPLETED' });

    render(<KakaoPayResultPage />);

    await waitFor(() => {
      expect(screen.getByText('결제 완료')).toBeInTheDocument();
      expect(screen.getByText('카카오페이 결제가 성공적으로 완료되었습니다.')).toBeInTheDocument();
    });

    expect(mockKakaoPayApprove).toHaveBeenCalledWith('order-1', 'pg_token_123');
    expect(mockClearCart).toHaveBeenCalled();
  });

  it('kakaoPayApprove 실패 → 결제 실패 메시지 표시', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'pg_token') return 'pg_token_123';
      if (key === 'orderId') return 'order-1';
      return null;
    });
    mockKakaoPayApprove.mockRejectedValue(new Error('승인 서버 오류'));

    render(<KakaoPayResultPage />);

    await waitFor(() => {
      expect(screen.getByText('결제 실패')).toBeInTheDocument();
      expect(screen.getByText('승인 서버 오류')).toBeInTheDocument();
    });
  });

  it('처리 중 로딩 상태 표시', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'pg_token') return 'pg_token_123';
      if (key === 'orderId') return 'order-1';
      return null;
    });
    let resolve!: (val: { orderId: string; status: string }) => void;
    mockKakaoPayApprove.mockReturnValue(new Promise((r) => (resolve = r)));

    render(<KakaoPayResultPage />);

    expect(screen.getByText('결제 처리 중...')).toBeInTheDocument();

    resolve({ orderId: 'order-1', status: 'COMPLETED' });
  });
});
