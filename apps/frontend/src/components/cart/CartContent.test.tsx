import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    sizes: _sizes,
    ...props
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    sizes?: string;
    [key: string]: unknown;
  }) => <img src={src} alt={alt} {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />,
}));

// useCart 훅 목킹 (서버 쿼리)
vi.mock('@/lib/hooks/useCart', () => ({
  useCart: vi.fn(() => ({ isLoading: false, isError: false })),
  useUpdateCartItem: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRemoveCartItem: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useClearCart: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

// useCartStore 목킹
vi.mock('@/lib/stores/cart', () => ({
  useCartStore: vi.fn(() => []),
}));

import CartContent from './CartContent';
import type { LocalCartItem } from '@/lib/stores/cart';
import { useCartStore } from '@/lib/stores/cart';

function mockCartItem(overrides: Partial<LocalCartItem> = {}): LocalCartItem {
  return {
    id: 'item-1',
    variantId: 'variant-1',
    productId: 'prod-1',
    productName: '베이비 블루 롬퍼',
    productImageUrl: null,
    color: '블루',
    size: '80',
    price: 29000,
    quantity: 2,
    stock: 10,
    ...overrides,
  };
}

function setMockItems(items: LocalCartItem[]) {
  // vi.mock 으로 대체된 함수이므로 unknown 경유로 캐스팅
  (
    useCartStore as unknown as { mockImplementation: (...args: unknown[]) => void }
  ).mockImplementation((selector: (state: { items: LocalCartItem[] }) => unknown) =>
    selector({ items }),
  );
}

describe('CartContent', () => {
  beforeEach(() => {
    setMockItems([]);
  });

  describe('빈 장바구니', () => {
    it('빈 장바구니 안내 메시지를 렌더링한다', () => {
      setMockItems([]);
      render(<CartContent />);
      expect(screen.getByText('장바구니가 비어 있어요.')).toBeInTheDocument();
    });

    it('쇼핑 계속하기 링크가 /products로 이동한다', () => {
      setMockItems([]);
      render(<CartContent />);
      const link = screen.getByRole('link', { name: '쇼핑 계속하기' });
      expect(link).toHaveAttribute('href', '/products');
    });
  });

  describe('장바구니 항목이 있는 경우', () => {
    it('상품명을 렌더링한다', () => {
      setMockItems([mockCartItem()]);
      render(<CartContent />);
      expect(screen.getByText('베이비 블루 롬퍼')).toBeInTheDocument();
    });

    it('옵션(색상/사이즈)을 렌더링한다', () => {
      setMockItems([mockCartItem()]);
      render(<CartContent />);
      expect(screen.getByText('블루 / 80')).toBeInTheDocument();
    });

    it('수량 × 단가로 계산된 금액을 렌더링한다', () => {
      setMockItems([mockCartItem({ price: 29000, quantity: 2 })]);
      render(<CartContent />);
      // 29000 * 2 = 58000
      const prices = screen.getAllByText('58,000원');
      expect(prices.length).toBeGreaterThanOrEqual(1);
    });

    it('여러 항목의 합계를 주문 요약에 렌더링한다', () => {
      setMockItems([
        mockCartItem({ variantId: 'v1', price: 29000, quantity: 2 }),
        mockCartItem({ variantId: 'v2', price: 15000, quantity: 1 }),
      ]);
      render(<CartContent />);
      // 58000 + 15000 = 73000
      const summaryTotal = screen.getAllByText('73,000원');
      expect(summaryTotal.length).toBeGreaterThanOrEqual(1);
    });

    it('이미지가 없으면 이모지 플레이스홀더를 렌더링한다', () => {
      setMockItems([mockCartItem({ productImageUrl: null })]);
      render(<CartContent />);
      expect(screen.getAllByText('🧸').length).toBeGreaterThanOrEqual(1);
    });

    it('이미지가 있으면 img 태그를 렌더링한다', () => {
      setMockItems([mockCartItem({ productImageUrl: 'https://cdn.example.com/img.jpg' })]);
      render(<CartContent />);
      const img = screen.getByRole('img', { name: '베이비 블루 롬퍼' });
      expect(img).toHaveAttribute('src', 'https://cdn.example.com/img.jpg');
    });

    it('항목 수를 상품 목록 헤더에 표시한다', () => {
      setMockItems([
        mockCartItem({ variantId: 'v1', quantity: 2 }),
        mockCartItem({ variantId: 'v2', quantity: 3 }),
      ]);
      render(<CartContent />);
      // 총 5개
      expect(screen.getByText('상품 목록 (5개)')).toBeInTheDocument();
    });

    it('삭제 버튼이 각 항목마다 렌더링된다', () => {
      const item = mockCartItem();
      setMockItems([item]);
      render(<CartContent />);
      expect(screen.getByRole('button', { name: `${item.productName} 삭제` })).toBeInTheDocument();
    });

    it('수량 증가/감소 버튼이 렌더링된다', () => {
      setMockItems([mockCartItem()]);
      render(<CartContent />);
      expect(screen.getByRole('button', { name: '수량 줄이기' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '수량 늘리기' })).toBeInTheDocument();
    });

    it('주문하기 버튼이 렌더링된다', () => {
      setMockItems([mockCartItem()]);
      render(<CartContent />);
      expect(screen.getByRole('button', { name: '주문하기' })).toBeInTheDocument();
    });
  });

  describe('로딩/에러 상태', () => {
    it('로딩 중일 때 스켈레톤을 렌더링한다', async () => {
      const { useCart } = await import('@/lib/hooks/useCart');
      (useCart as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        isLoading: true,
        isError: false,
      });
      setMockItems([]);
      render(<CartContent />);
      // 스켈레톤 div들이 animate-pulse 클래스를 갖는다
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('에러 발생 시 에러 메시지를 렌더링한다', async () => {
      const { useCart } = await import('@/lib/hooks/useCart');
      (useCart as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        isLoading: false,
        isError: true,
      });
      setMockItems([]);
      render(<CartContent />);
      expect(screen.getByText('장바구니를 불러오는 데 실패했습니다.')).toBeInTheDocument();
    });
  });

  describe('전체 삭제', () => {
    it('전체 삭제 버튼이 렌더링된다', () => {
      setMockItems([mockCartItem()]);
      render(<CartContent />);
      expect(screen.getByRole('button', { name: '전체 삭제' })).toBeInTheDocument();
    });

    it('전체 삭제 버튼 클릭 시 clearCart mutate 가 호출된다', async () => {
      const clearMutate = vi.fn();
      const { useClearCart } = await import('@/lib/hooks/useCart');
      (useClearCart as ReturnType<typeof vi.fn>).mockReturnValue({
        mutate: clearMutate,
        isPending: false,
      });
      setMockItems([mockCartItem()]);
      render(<CartContent />);
      await userEvent.click(screen.getByRole('button', { name: '전체 삭제' }));
      expect(clearMutate).toHaveBeenCalledTimes(1);
    });
  });
});
