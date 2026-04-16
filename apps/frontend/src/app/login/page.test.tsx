import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: vi.fn() },
}));

vi.mock('@/lib/api/cart', () => ({
  mergeCart: vi.fn(),
}));

const mockClearCart = vi.fn();
const mockGetState = vi.fn();

vi.mock('@/lib/stores/cart', () => ({
  useCartStore: {
    getState: () => mockGetState(),
  },
}));

import LoginPage from './page';
import { apiClient } from '@/lib/api/client';
import { mergeCart } from '@/lib/api/cart';

function clearCookies() {
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0]?.trim();
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCookies();
    // 기본값: 로컬 장바구니 비어 있음
    mockGetState.mockReturnValue({ items: [], clearCart: mockClearCart });
  });

  it('이메일/비밀번호 입력 필드와 로그인 버튼이 렌더링된다', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('네이버/카카오 소셜 로그인 버튼이 렌더링된다', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /네이버/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /카카오/ })).toBeInTheDocument();
  });

  it('잘못된 이메일 형식 입력 시 형식 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('이메일'), 'invalid-email');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByText('올바른 이메일 형식이 아닙니다.')).toBeInTheDocument();
  });

  it('빈 폼 제출 시 유효성 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByText('이메일을 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호를 입력해주세요.')).toBeInTheDocument();
  });

  it('유효한 입력 제출 시 로그인 API를 호출한다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { accessToken: 'tok' } });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('로그인 성공 시 홈으로 리다이렉트한다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { accessToken: 'tok' } });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('로그인 실패(401) 시 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockRejectedValueOnce({
      response: { status: 401 },
      isAxiosError: true,
    });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'wrong');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    expect(
      await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다.'),
    ).toBeInTheDocument();
  });

  it('이미 로그인된 상태에서 /login 접근 시 홈으로 리다이렉트한다', async () => {
    document.cookie = 'access_token=existing-token; path=/';
    render(<LoginPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('로그인 성공 시 로컬 장바구니가 있으면 mergeCart를 호출한다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { accessToken: 'tok' } });
    vi.mocked(mergeCart).mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1', items: [] });
    mockGetState.mockReturnValue({
      items: [
        {
          variantId: 'var-1',
          quantity: 2,
          id: 'item-1',
          productId: 'prod-1',
          productName: '티셔츠',
          productImageUrl: null,
          color: '화이트',
          size: 'M',
          price: 25000,
          stock: 10,
        },
      ],
      clearCart: mockClearCart,
    });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(mergeCart).toHaveBeenCalledWith([{ variantId: 'var-1', quantity: 2 }]);
    });
  });

  it('로그인 성공 시 mergeCart 완료 후 로컬 장바구니를 초기화한다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { accessToken: 'tok' } });
    vi.mocked(mergeCart).mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1', items: [] });
    mockGetState.mockReturnValue({
      items: [
        {
          variantId: 'var-1',
          quantity: 1,
          id: 'item-1',
          productId: 'prod-1',
          productName: '티셔츠',
          productImageUrl: null,
          color: '화이트',
          size: 'M',
          price: 25000,
          stock: 10,
        },
      ],
      clearCart: mockClearCart,
    });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled();
    });
  });

  it('로그인 성공 시 로컬 장바구니가 비어 있으면 mergeCart를 호출하지 않는다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { accessToken: 'tok' } });
    // mockGetState는 beforeEach에서 items: [] 로 설정됨
    render(<LoginPage />);

    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
    expect(mergeCart).not.toHaveBeenCalled();
  });

  it('mergeCart 실패 시에도 홈으로 리다이렉트한다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { accessToken: 'tok' } });
    vi.mocked(mergeCart).mockRejectedValueOnce(new Error('network error'));
    mockGetState.mockReturnValue({
      items: [
        {
          variantId: 'var-1',
          quantity: 1,
          id: 'item-1',
          productId: 'prod-1',
          productName: '티셔츠',
          productImageUrl: null,
          color: '화이트',
          size: 'M',
          price: 25000,
          stock: 10,
        },
      ],
      clearCart: mockClearCart,
    });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
