import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    'aria-label': ariaLabel,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    'aria-label'?: string;
  }) => (
    <a href={href} className={className} aria-label={ariaLabel}>
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

vi.mock('@/lib/hooks/useOrders', () => ({
  useOrders: vi.fn(),
}));

import OrderList from './OrderList';
import { useOrders } from '@/lib/hooks/useOrders';
import type { Order } from '@/lib/types/order';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    userId: 'user-1',
    addressId: 'addr-1',
    status: 'PAID',
    totalAmount: 55000,
    shippingFee: 0,
    createdAt: '2026-04-10T12:00:00.000Z',
    updatedAt: '2026-04-10T12:00:00.000Z',
    items: [
      {
        id: 'item-1',
        orderId: 'order-1',
        variantId: 'var-1',
        quantity: 1,
        unitPrice: 55000,
        createdAt: '2026-04-10T12:00:00.000Z',
        variant: {
          id: 'var-1',
          size: '80',
          color: '블루',
          sku: 'SKU-001',
          product: {
            id: 'prod-1',
            name: '베이비 롬퍼',
            images: [{ url: 'https://example.com/image.jpg' }],
          },
        },
      },
    ],
    ...overrides,
  };
}

function makePaginatedResponse(orders: Order[], overrides = {}) {
  return {
    items: orders,
    total: orders.length,
    page: 1,
    limit: 10,
    totalPages: 1,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('OrderList', () => {
  beforeEach(() => {
    (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  // ── 로딩 ──────────────────────────────────────────────────────────────────────

  describe('로딩 상태', () => {
    it('로딩 중에는 스켈레톤을 렌더링한다', () => {
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });
      render(<OrderList />);
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ── 에러 ──────────────────────────────────────────────────────────────────────

  describe('에러 상태', () => {
    it('에러 시 에러 메시지를 렌더링한다', () => {
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });
      render(<OrderList />);
      expect(screen.getByRole('alert')).toHaveTextContent('주문 내역을 불러오는 데 실패했습니다.');
    });
  });

  // ── 주문 없음 ────────────────────────────────────────────────────────────────

  describe('주문이 없는 경우', () => {
    it('주문 없음 메시지를 렌더링한다', () => {
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([]),
        isLoading: false,
        isError: false,
      });
      render(<OrderList />);
      expect(screen.getByText('아직 주문 내역이 없어요.')).toBeInTheDocument();
    });

    it('쇼핑 시작하기 링크가 /products로 이동한다', () => {
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([]),
        isLoading: false,
        isError: false,
      });
      render(<OrderList />);
      expect(screen.getByRole('link', { name: '쇼핑 시작하기' })).toHaveAttribute(
        'href',
        '/products',
      );
    });
  });

  // ── 주문 목록 ─────────────────────────────────────────────────────────────────

  describe('주문 목록 표시', () => {
    it('주문 상품명을 렌더링한다', () => {
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makeOrder()]),
        isLoading: false,
        isError: false,
      });
      render(<OrderList />);
      expect(screen.getByText('베이비 롬퍼')).toBeInTheDocument();
    });

    it('주문 금액을 렌더링한다', () => {
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makeOrder()]),
        isLoading: false,
        isError: false,
      });
      render(<OrderList />);
      expect(screen.getByText('55,000원')).toBeInTheDocument();
    });

    it('주문 상태 뱃지를 렌더링한다', () => {
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makeOrder({ status: 'SHIPPING' })]),
        isLoading: false,
        isError: false,
      });
      render(<OrderList />);
      expect(screen.getByText('배송 중')).toBeInTheDocument();
    });

    it('여러 상품이 있으면 "외 N건"을 표시한다', () => {
      const order = makeOrder({
        items: [
          ...makeOrder().items,
          {
            id: 'item-2',
            orderId: 'order-1',
            variantId: 'var-2',
            quantity: 1,
            unitPrice: 30000,
            createdAt: '2026-04-10T12:00:00.000Z',
          },
        ],
      });
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([order]),
        isLoading: false,
        isError: false,
      });
      render(<OrderList />);
      expect(screen.getByText(/외 1건/)).toBeInTheDocument();
    });

    it('상품 이미지가 없으면 이모지 플레이스홀더를 표시한다', () => {
      const order = makeOrder({
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            variantId: 'var-1',
            quantity: 1,
            unitPrice: 55000,
            createdAt: '2026-04-10T12:00:00.000Z',
            variant: {
              id: 'var-1',
              size: '80',
              color: '블루',
              sku: 'SKU-001',
              product: { id: 'prod-1', name: '상품', images: [] },
            },
          },
        ],
      });
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([order]),
        isLoading: false,
        isError: false,
      });
      render(<OrderList />);
      expect(screen.getByText('🧸')).toBeInTheDocument();
    });

    it('주문 카드가 상세 페이지 링크를 갖는다', () => {
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makeOrder({ id: 'order-abc' })]),
        isLoading: false,
        isError: false,
      });
      render(<OrderList />);
      expect(screen.getByRole('link', { name: /주문 order-abc 상세 보기/ })).toHaveAttribute(
        'href',
        '/orders/order-abc',
      );
    });
  });

  // ── 페이지네이션 ───────────────────────────────────────────────────────────────

  describe('페이지네이션', () => {
    it('totalPages가 1이면 페이지네이션을 렌더링하지 않는다', () => {
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makeOrder()], { totalPages: 1 }),
        isLoading: false,
        isError: false,
      });
      render(<OrderList />);
      expect(screen.queryByRole('button', { name: '다음 페이지' })).not.toBeInTheDocument();
    });

    it('totalPages가 2이면 페이지네이션을 렌더링한다', () => {
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makeOrder()], { totalPages: 2, total: 15 }),
        isLoading: false,
        isError: false,
      });
      render(<OrderList />);
      expect(screen.getByRole('button', { name: '이전 페이지' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '다음 페이지' })).toBeInTheDocument();
    });

    it('첫 페이지에서는 이전 버튼이 비활성화된다', () => {
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makeOrder()], { totalPages: 2 }),
        isLoading: false,
        isError: false,
      });
      render(<OrderList />);
      expect(screen.getByRole('button', { name: '이전 페이지' })).toBeDisabled();
    });

    it('다음 페이지 버튼 클릭 시 page가 증가한다', async () => {
      (useOrders as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makeOrder()], { totalPages: 3, page: 1 }),
        isLoading: false,
        isError: false,
      });
      render(<OrderList />);
      await userEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
      expect(useOrders).toHaveBeenLastCalledWith(2, 10);
    });
  });
});
