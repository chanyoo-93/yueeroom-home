import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Next.js 모듈 모킹 (vi.mock은 호이스팅되어 import보다 먼저 실행됨)
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/products/prod-1'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
  ),
}));

vi.mock('@/lib/hooks/useProductDetail');

vi.mock('@/lib/hooks/useCart', () => ({
  useAddCartItem: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/lib/stores/cart', () => ({
  useCartStore: vi.fn((selector: (s: { setBuyNow: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ setBuyNow: vi.fn() }),
  ),
}));

vi.mock('@/lib/hooks/useWishlist', () => ({
  useWishlistStatus: vi.fn(() => false),
  useAddWishlistItem: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRemoveWishlistItem: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import ProductDetailContent from './ProductDetailContent';
import { useProductDetail } from '@/lib/hooks/useProductDetail';
import {
  useWishlistStatus,
  useAddWishlistItem,
  useRemoveWishlistItem,
} from '@/lib/hooks/useWishlist';
import type { ProductDetail } from '@/lib/types/product';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function mockProductDetail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'prod-1',
    categoryId: 'cat-1',
    name: '베이비 블루 롬퍼',
    description: '편안한 면 소재 롬퍼',
    basePrice: 29000,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    category: { id: 'cat-1', name: '상의', slug: 'top' },
    images: [],
    variants: [
      {
        id: 'var-1',
        productId: 'prod-1',
        size: '80',
        color: '블루',
        sku: 'ROMPER-80-BLUE',
        price: 29000,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        inventory: { id: 'inv-1', variantId: 'var-1', quantity: 5 },
      },
      {
        id: 'var-2',
        productId: 'prod-1',
        size: '90',
        color: '블루',
        sku: 'ROMPER-90-BLUE',
        price: 29000,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        inventory: { id: 'inv-2', variantId: 'var-2', quantity: 0 }, // 품절
      },
      {
        id: 'var-3',
        productId: 'prod-1',
        size: '80',
        color: '핑크',
        sku: 'ROMPER-80-PINK',
        price: 29000,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        inventory: { id: 'inv-3', variantId: 'var-3', quantity: 3 },
      },
    ],
    ...overrides,
  };
}

const mockUseProductDetail = vi.mocked(useProductDetail);
const mockUseWishlistStatus = vi.mocked(useWishlistStatus);
const mockUseAddWishlistItem = vi.mocked(useAddWishlistItem);
const mockUseRemoveWishlistItem = vi.mocked(useRemoveWishlistItem);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProductDetailContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('로딩 / 에러 상태', () => {
    it('로딩 중에는 스켈레톤 UI를 렌더링한다', () => {
      mockUseProductDetail.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as ReturnType<typeof useProductDetail>);

      render(<ProductDetailContent />);

      // animate-pulse 클래스가 포함된 요소가 있어야 한다
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('에러 발생 시 오류 메시지와 목록 링크를 렌더링한다', () => {
      mockUseProductDetail.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as ReturnType<typeof useProductDetail>);

      render(<ProductDetailContent />);

      expect(screen.getByText(/상품 정보를 불러오는 데 실패했습니다/)).toBeInTheDocument();
      expect(screen.getByRole('link')).toHaveAttribute('href', '/products');
    });
  });

  describe('상품 정보 렌더링', () => {
    beforeEach(() => {
      mockUseProductDetail.mockReturnValue({
        data: mockProductDetail(),
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useProductDetail>);
    });

    it('상품명, 가격, 설명을 렌더링한다', () => {
      render(<ProductDetailContent />);

      expect(screen.getByText('베이비 블루 롬퍼')).toBeInTheDocument();
      expect(screen.getByText('29,000원')).toBeInTheDocument();
      expect(screen.getByText('편안한 면 소재 롬퍼')).toBeInTheDocument();
    });

    it('카테고리 이름을 렌더링한다', () => {
      render(<ProductDetailContent />);

      expect(screen.getByText('상의')).toBeInTheDocument();
    });
  });

  describe('옵션 선택 → 장바구니 버튼 활성화', () => {
    beforeEach(() => {
      mockUseProductDetail.mockReturnValue({
        data: mockProductDetail(),
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useProductDetail>);
    });

    it('옵션 미선택 시 장바구니 버튼이 비활성화된다', () => {
      render(<ProductDetailContent />);

      const cartButton = screen.getByRole('button', { name: /장바구니|옵션을 선택/ });
      expect(cartButton).toBeDisabled();
    });

    it('색상만 선택 시 장바구니 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      render(<ProductDetailContent />);

      await user.click(screen.getByRole('button', { name: '블루' }));

      const cartButton = screen.getByRole('button', { name: /장바구니|옵션을 선택/ });
      expect(cartButton).toBeDisabled();
    });

    it('재고 있는 색상+사이즈 선택 시 장바구니 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      render(<ProductDetailContent />);

      await user.click(screen.getByRole('button', { name: '블루' }));
      await user.click(screen.getByRole('button', { name: '사이즈 80' }));

      const cartButton = screen.getByRole('button', { name: '장바구니 담기' });
      expect(cartButton).toBeEnabled();
    });

    it('품절 변형(블루+90)을 선택하면 장바구니 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      render(<ProductDetailContent />);

      await user.click(screen.getByRole('button', { name: '블루' }));
      await user.click(screen.getByRole('button', { name: '사이즈 90' }));

      // 품절 조합이 선택되면 장바구니 버튼이 비활성화(isCartEnabled=false)
      const cartButton = screen.getByRole('button', { name: '장바구니 담기' });
      expect(cartButton).toBeDisabled();
    });
  });

  describe('수량 선택', () => {
    beforeEach(() => {
      mockUseProductDetail.mockReturnValue({
        data: mockProductDetail(),
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useProductDetail>);
    });

    it('재고 있는 옵션 선택 후 수량 조절 버튼이 나타난다', async () => {
      const user = userEvent.setup();
      render(<ProductDetailContent />);

      await user.click(screen.getByRole('button', { name: '블루' }));
      await user.click(screen.getByRole('button', { name: '사이즈 80' }));

      expect(screen.getByRole('button', { name: '수량 줄이기' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '수량 늘리기' })).toBeInTheDocument();
    });

    it('수량 늘리기 버튼으로 수량이 증가한다', async () => {
      const user = userEvent.setup();
      render(<ProductDetailContent />);

      await user.click(screen.getByRole('button', { name: '블루' }));
      await user.click(screen.getByRole('button', { name: '사이즈 80' }));
      await user.click(screen.getByRole('button', { name: '수량 늘리기' }));

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('수량 줄이기 버튼은 1 미만으로 내려가지 않는다', async () => {
      const user = userEvent.setup();
      render(<ProductDetailContent />);

      await user.click(screen.getByRole('button', { name: '블루' }));
      await user.click(screen.getByRole('button', { name: '사이즈 80' }));

      const decreaseButton = screen.getByRole('button', { name: '수량 줄이기' });
      expect(decreaseButton).toBeDisabled();
    });
  });

  describe('위시리스트 버튼', () => {
    beforeEach(() => {
      mockUseProductDetail.mockReturnValue({
        data: mockProductDetail(),
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useProductDetail>);
    });

    it('위시리스트에 없는 상품은 추가 버튼이 렌더링된다', () => {
      mockUseWishlistStatus.mockReturnValue(false);
      render(<ProductDetailContent />);

      expect(screen.getByRole('button', { name: '위시리스트에 추가' })).toBeInTheDocument();
    });

    it('위시리스트에 있는 상품은 제거 버튼이 렌더링된다', () => {
      mockUseWishlistStatus.mockReturnValue(true);
      render(<ProductDetailContent />);

      expect(screen.getByRole('button', { name: '위시리스트에서 제거' })).toBeInTheDocument();
    });

    it('위시리스트 미등록 상품 클릭 시 addWishlistItem을 호출한다', async () => {
      const mutate = vi.fn();
      mockUseWishlistStatus.mockReturnValue(false);
      mockUseAddWishlistItem.mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<
        typeof useAddWishlistItem
      >);

      const user = userEvent.setup();
      render(<ProductDetailContent />);

      await user.click(screen.getByRole('button', { name: '위시리스트에 추가' }));

      expect(mutate).toHaveBeenCalledWith('prod-1');
    });

    it('위시리스트 등록 상품 클릭 시 removeWishlistItem을 호출한다', async () => {
      const mutate = vi.fn();
      mockUseWishlistStatus.mockReturnValue(true);
      mockUseRemoveWishlistItem.mockReturnValue({
        mutate,
        isPending: false,
      } as unknown as ReturnType<typeof useRemoveWishlistItem>);

      const user = userEvent.setup();
      render(<ProductDetailContent />);

      await user.click(screen.getByRole('button', { name: '위시리스트에서 제거' }));

      expect(mutate).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('사이즈 가이드 모달', () => {
    beforeEach(() => {
      mockUseProductDetail.mockReturnValue({
        data: mockProductDetail(),
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useProductDetail>);
    });

    it('사이즈 가이드 버튼 클릭 시 모달이 열린다', async () => {
      const user = userEvent.setup();
      render(<ProductDetailContent />);

      await user.click(screen.getByRole('button', { name: '사이즈 가이드 열기' }));

      expect(screen.getByRole('dialog', { name: '사이즈 가이드' })).toBeInTheDocument();
    });

    it('닫기 버튼 클릭 시 모달이 닫힌다', async () => {
      const user = userEvent.setup();
      render(<ProductDetailContent />);

      await user.click(screen.getByRole('button', { name: '사이즈 가이드 열기' }));
      await user.click(screen.getByRole('button', { name: '닫기' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('보안 회귀 - XSS 렌더링 방어', () => {
    function renderProductDescription(description: string) {
      mockUseProductDetail.mockReturnValue({
        data: mockProductDetail({ description }),
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useProductDetail>);

      return render(<ProductDetailContent />);
    }

    it('script 태그가 포함된 description은 렌더링 시 제거된다', () => {
      const { container } = renderProductDescription(
        '<p>안전한 설명</p><script>alert("xss")</script>',
      );

      expect(container.innerHTML).not.toContain('<script');
    });

    it('onclick 이벤트 핸들러 속성이 제거된다', () => {
      const { container } = renderProductDescription('<p onclick="alert(1)">클릭 가능한 설명</p>');

      expect(container.innerHTML).not.toContain('onclick');
    });

    it('onerror 이벤트 핸들러 속성이 제거된다', () => {
      const { container } = renderProductDescription('<img src="x" onerror="alert(1)" />');

      expect(container.innerHTML).not.toContain('onerror');
    });

    it('javascript: scheme href 링크가 제거된다', () => {
      const { container } = renderProductDescription(
        '<a href="javascript:alert(1)">위험한 링크</a>',
      );

      expect(container.innerHTML).not.toContain('javascript:');
    });

    it('허용된 태그(strong, em)는 보존된다', () => {
      const { container } = renderProductDescription(
        '<p><strong>굵게</strong> <em>기울임</em></p>',
      );

      expect(container.innerHTML).toContain('<strong>굵게</strong>');
      expect(container.innerHTML).toContain('<em>기울임</em>');
    });
  });
});
