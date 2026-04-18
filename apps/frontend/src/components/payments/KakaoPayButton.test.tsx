import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KakaoPayButton from './KakaoPayButton';

vi.mock('@/lib/api/payments', () => ({
  kakaoPayReady: vi.fn(),
}));

import { kakaoPayReady } from '@/lib/api/payments';

const mockKakaoPayReady = vi.mocked(kakaoPayReady);

describe('KakaoPayButton', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('카카오페이 버튼이 렌더링된다', () => {
    render(<KakaoPayButton orderId="order-1" />);
    expect(screen.getByRole('button', { name: '카카오페이로 결제하기' })).toBeInTheDocument();
  });

  it('버튼 클릭 시 kakaoPayReady 호출 후 redirect', async () => {
    mockKakaoPayReady.mockResolvedValue({
      tid: 'T469b847306d7b2dc234',
      redirectUrl: 'https://online-pay.kakao.com/test',
    });

    render(<KakaoPayButton orderId="order-1" />);
    await userEvent.click(screen.getByRole('button', { name: '카카오페이로 결제하기' }));

    await waitFor(() => {
      expect(mockKakaoPayReady).toHaveBeenCalledWith('order-1');
      expect(window.location.href).toBe('https://online-pay.kakao.com/test');
    });
  });

  it('처리 중에는 버튼이 비활성화된다', async () => {
    let resolveReady!: (val: { tid: string; redirectUrl: string }) => void;
    mockKakaoPayReady.mockReturnValue(
      new Promise((resolve) => {
        resolveReady = resolve;
      }),
    );

    render(<KakaoPayButton orderId="order-1" />);
    await userEvent.click(screen.getByRole('button', { name: '카카오페이로 결제하기' }));

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveTextContent('처리 중...');

    resolveReady({ tid: 'T123', redirectUrl: 'https://kakao.com' });
  });

  it('API 오류 시 에러 메시지를 표시한다', async () => {
    mockKakaoPayReady.mockRejectedValue(new Error('결제 준비에 실패했습니다.'));

    render(<KakaoPayButton orderId="order-1" />);
    await userEvent.click(screen.getByRole('button', { name: '카카오페이로 결제하기' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('결제 준비에 실패했습니다.');
    });
    expect(screen.getByRole('button')).not.toBeDisabled();
  });
});
