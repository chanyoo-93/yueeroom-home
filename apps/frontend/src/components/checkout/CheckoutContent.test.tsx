import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

vi.mock('@/lib/stores/cart', () => ({
  useCartStore: vi.fn(() => []),
}));

vi.mock('@/lib/hooks/useAddresses', () => ({
  useAddresses: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/lib/hooks/useOrders', () => ({
  useCreateOrder: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

import CheckoutContent from './CheckoutContent';
import { useCartStore } from '@/lib/stores/cart';
import { useAddresses } from '@/lib/hooks/useAddresses';
import { useCreateOrder } from '@/lib/hooks/useOrders';
import type { LocalCartItem } from '@/lib/stores/cart';
import type { Address } from '@/lib/types/user';

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function mockAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 'addr-1',
    userId: 'user-1',
    name: '집',
    recipient: '홍길동',
    phone: '010-1234-5678',
    zipCode: '12345',
    address1: '서울시 강남구 테헤란로 1',
    address2: null,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function setMockItems(items: LocalCartItem[]) {
  const clearCartFn = vi.fn();
  const clearBuyNowFn = vi.fn();
  (
    useCartStore as unknown as { mockImplementation: (...args: unknown[]) => void }
  ).mockImplementation(
    (
      selector: (state: {
        items: LocalCartItem[];
        clearCart: () => void;
        buyNow: null;
        clearBuyNow: () => void;
      }) => unknown,
    ) => selector({ items, clearCart: clearCartFn, buyNow: null, clearBuyNow: clearBuyNowFn }),
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CheckoutContent', () => {
  beforeEach(() => {
    setMockItems([]);
    (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });
    (useCreateOrder as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  // ── 빈 장바구니 ──────────────────────────────────────────────────────────────

  describe('장바구니가 비어 있는 경우', () => {
    it('빈 장바구니 메시지를 렌더링한다', () => {
      setMockItems([]);
      render(<CheckoutContent />);
      expect(screen.getByText('장바구니가 비어 있어요.')).toBeInTheDocument();
    });

    it('장바구니로 돌아가기 링크가 /cart로 이동한다', () => {
      setMockItems([]);
      render(<CheckoutContent />);
      const link = screen.getByRole('link', { name: '장바구니로 돌아가기' });
      expect(link).toHaveAttribute('href', '/cart');
    });
  });

  // ── 주문 상품 ────────────────────────────────────────────────────────────────

  describe('주문 상품 목록', () => {
    it('상품명을 렌더링한다', () => {
      setMockItems([mockCartItem()]);
      render(<CheckoutContent />);
      expect(screen.getByText('베이비 블루 롬퍼')).toBeInTheDocument();
    });

    it('색상/사이즈/수량 옵션을 렌더링한다', () => {
      setMockItems([mockCartItem()]);
      render(<CheckoutContent />);
      expect(screen.getByText('블루 / 80 · 2개')).toBeInTheDocument();
    });

    it('수량 × 단가로 계산된 금액을 렌더링한다', () => {
      setMockItems([mockCartItem({ price: 29000, quantity: 2 })]);
      render(<CheckoutContent />);
      // 29000 * 2 = 58000
      const prices = screen.getAllByText('58,000원');
      expect(prices.length).toBeGreaterThanOrEqual(1);
    });

    it('상품 이미지가 없으면 이모지 플레이스홀더를 렌더링한다', () => {
      setMockItems([mockCartItem({ productImageUrl: null })]);
      render(<CheckoutContent />);
      expect(screen.getAllByText('🧸').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 배송지 선택 ──────────────────────────────────────────────────────────────

  describe('배송지 선택', () => {
    it('배송지 목록을 렌더링한다', () => {
      setMockItems([mockCartItem()]);
      (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [mockAddress()],
        isLoading: false,
      });
      render(<CheckoutContent />);
      expect(screen.getByText('집')).toBeInTheDocument();
      expect(screen.getByText('홍길동 · 010-1234-5678')).toBeInTheDocument();
    });

    it('기본 배송지에 "기본" 뱃지를 표시한다', () => {
      setMockItems([mockCartItem()]);
      (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [mockAddress({ isDefault: true })],
        isLoading: false,
      });
      render(<CheckoutContent />);
      expect(screen.getByText('기본')).toBeInTheDocument();
    });

    it('등록된 배송지가 없으면 안내 메시지를 렌더링한다', () => {
      setMockItems([mockCartItem()]);
      (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [],
        isLoading: false,
      });
      render(<CheckoutContent />);
      expect(screen.getByText(/등록된 배송지가 없습니다/)).toBeInTheDocument();
    });

    it('배송지 로딩 중에는 스켈레톤을 렌더링한다', () => {
      setMockItems([mockCartItem()]);
      (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: true,
      });
      render(<CheckoutContent />);
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('다른 배송지를 클릭하면 선택이 변경된다', async () => {
      setMockItems([mockCartItem()]);
      const addr1 = mockAddress({ id: 'addr-1', name: '집', isDefault: true });
      const addr2 = mockAddress({ id: 'addr-2', name: '회사', isDefault: false });
      (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [addr1, addr2],
        isLoading: false,
      });
      render(<CheckoutContent />);

      const companyRadio = screen.getByRole('radio', { name: '회사 선택' });
      await userEvent.click(companyRadio);
      expect(companyRadio).toBeChecked();
    });
  });

  // ── 결제 방법 ────────────────────────────────────────────────────────────────

  describe('결제 방법 선택', () => {
    it('세 가지 결제 수단을 렌더링한다', () => {
      setMockItems([mockCartItem()]);
      render(<CheckoutContent />);
      expect(screen.getByText('카카오페이')).toBeInTheDocument();
      expect(screen.getByText('네이버페이')).toBeInTheDocument();
      expect(screen.getByText('신용카드')).toBeInTheDocument();
    });

    it('기본으로 카카오페이가 선택된다', () => {
      setMockItems([mockCartItem()]);
      render(<CheckoutContent />);
      const radio = screen.getByRole('radio', { name: '카카오페이' });
      expect(radio).toBeChecked();
    });

    it('네이버페이 클릭 시 선택이 변경된다', async () => {
      setMockItems([mockCartItem()]);
      render(<CheckoutContent />);
      const radio = screen.getByRole('radio', { name: '네이버페이' });
      await userEvent.click(radio);
      expect(radio).toBeChecked();
    });
  });

  // ── 결제 요약 ────────────────────────────────────────────────────────────────

  describe('결제 요약', () => {
    it('상품 합계 금액을 렌더링한다', () => {
      setMockItems([
        mockCartItem({ variantId: 'v1', price: 29000, quantity: 2 }),
        mockCartItem({ variantId: 'v2', price: 15000, quantity: 1 }),
      ]);
      render(<CheckoutContent />);
      // 58000 + 15000 = 73000
      const totals = screen.getAllByText('73,000원');
      expect(totals.length).toBeGreaterThanOrEqual(1);
    });

    it('결제하기 버튼을 렌더링한다', () => {
      setMockItems([mockCartItem()]);
      render(<CheckoutContent />);
      expect(screen.getByRole('button', { name: '결제하기' })).toBeInTheDocument();
    });
  });

  // ── 주문 제출 ────────────────────────────────────────────────────────────────

  describe('주문 제출', () => {
    it('배송지가 없으면 결제하기 클릭 시 에러 메시지를 표시한다', async () => {
      setMockItems([mockCartItem()]);
      (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [],
        isLoading: false,
      });
      render(<CheckoutContent />);
      await userEvent.click(screen.getByRole('button', { name: '결제하기' }));
      expect(screen.getByRole('alert')).toHaveTextContent('배송지를 선택해주세요.');
    });

    it('주문 생성 API를 올바른 데이터로 호출한다', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ id: 'order-1' });
      (useCreateOrder as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync,
        isPending: false,
      });
      setMockItems([mockCartItem({ variantId: 'var-1', quantity: 2 })]);
      (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [mockAddress({ id: 'addr-1', isDefault: true })],
        isLoading: false,
      });

      render(<CheckoutContent />);
      await userEvent.click(screen.getByRole('button', { name: '결제하기' }));

      expect(mutateAsync).toHaveBeenCalledWith({
        addressId: 'addr-1',
        items: [{ variantId: 'var-1', quantity: 2 }],
      });
    });

    it('주문 성공 시 완료 화면을 표시한다', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ id: 'order-abc-123' });
      (useCreateOrder as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync,
        isPending: false,
      });
      setMockItems([mockCartItem({ variantId: 'var-1', quantity: 2 })]);
      (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [mockAddress({ id: 'addr-1', isDefault: true })],
        isLoading: false,
      });

      render(<CheckoutContent />);
      await userEvent.click(screen.getByRole('button', { name: '결제하기' }));

      expect(screen.getByText('주문이 완료되었습니다!')).toBeInTheDocument();
      expect(screen.getByText('주문번호: order-abc-123')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '쇼핑 계속하기' })).toHaveAttribute(
        'href',
        '/products',
      );
    });

    it('주문 중에는 버튼이 비활성화된다', () => {
      (useCreateOrder as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });
      setMockItems([mockCartItem()]);
      render(<CheckoutContent />);
      expect(screen.getByRole('button', { name: '결제하기' })).toBeDisabled();
    });

    it('주문 API 실패 시 에러 메시지를 표시한다', async () => {
      const mutateAsync = vi.fn().mockRejectedValue(new Error('API Error'));
      (useCreateOrder as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync,
        isPending: false,
      });
      setMockItems([mockCartItem({ variantId: 'var-1', quantity: 2 })]);
      (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [mockAddress({ id: 'addr-1', isDefault: true })],
        isLoading: false,
      });

      render(<CheckoutContent />);
      await userEvent.click(screen.getByRole('button', { name: '결제하기' }));

      expect(screen.getByRole('alert')).toHaveTextContent(
        '주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
      );
    });
  });
});
