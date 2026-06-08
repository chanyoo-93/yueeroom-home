import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/orders/order-1'),
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
  useOrderDetail: vi.fn(),
}));

import OrderDetail from './OrderDetail';
import { useOrderDetail } from '@/lib/hooks/useOrders';
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
        quantity: 2,
        unitPrice: 27500,
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
    address: {
      id: 'addr-1',
      userId: 'user-1',
      name: '집',
      recipient: '홍길동',
      phone: '010-1234-5678',
      zipCode: '12345',
      address1: '서울시 강남구 테헤란로 1',
      address2: null,
      isDefault: true,
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    },
    payment: {
      id: 'pay-1',
      orderId: 'order-1',
      status: 'COMPLETED',
      amount: 55000,
      paymentMethod: 'kakaopay',
      paymentKey: 'key-abc',
      paidAt: '2026-04-10T12:05:00.000Z',
      virtualAccountNumber: null,
      virtualBankName: null,
      virtualAccountExpiry: null,
      createdAt: '2026-04-10T12:00:00.000Z',
      updatedAt: '2026-04-10T12:05:00.000Z',
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('OrderDetail', () => {
  beforeEach(() => {
    (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  // ── 로딩 ──────────────────────────────────────────────────────────────────────

  describe('로딩 상태', () => {
    it('로딩 중에는 스켈레톤을 렌더링한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });
      render(<OrderDetail />);
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ── 에러 ──────────────────────────────────────────────────────────────────────

  describe('에러 상태', () => {
    it('에러 시 에러 메시지를 렌더링한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });
      render(<OrderDetail />);
      expect(screen.getByRole('alert')).toHaveTextContent('주문 정보를 불러오는 데 실패했습니다.');
    });
  });

  // ── 주문 정보 렌더링 ──────────────────────────────────────────────────────────

  describe('주문 정보 표시', () => {
    it('주문번호를 렌더링한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makeOrder(),
        isLoading: false,
        isError: false,
      });
      render(<OrderDetail />);
      expect(screen.getByText(/주문번호: order-1/)).toBeInTheDocument();
    });

    it('주문 상태를 렌더링한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makeOrder({ status: 'SHIPPING' }),
        isLoading: false,
        isError: false,
      });
      render(<OrderDetail />);
      expect(screen.getByRole('generic', { name: '주문 상태: 배송 중' })).toBeInTheDocument();
    });

    it('상품명을 렌더링한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makeOrder(),
        isLoading: false,
        isError: false,
      });
      render(<OrderDetail />);
      expect(screen.getByText('베이비 롬퍼')).toBeInTheDocument();
    });

    it('상품 옵션(색상/사이즈/수량)을 렌더링한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makeOrder(),
        isLoading: false,
        isError: false,
      });
      render(<OrderDetail />);
      expect(screen.getByText('블루 / 80 · 2개')).toBeInTheDocument();
    });

    it('상품 금액(단가 × 수량)을 렌더링한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makeOrder(),
        isLoading: false,
        isError: false,
      });
      render(<OrderDetail />);
      // 27500 × 2 = 55000
      expect(screen.getAllByText('55,000원').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 배송 정보 ─────────────────────────────────────────────────────────────────

  describe('배송 정보', () => {
    it('수령인과 전화번호를 렌더링한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makeOrder(),
        isLoading: false,
        isError: false,
      });
      render(<OrderDetail />);
      expect(screen.getByText('홍길동 · 010-1234-5678')).toBeInTheDocument();
    });

    it('주소를 렌더링한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makeOrder(),
        isLoading: false,
        isError: false,
      });
      render(<OrderDetail />);
      expect(screen.getByText(/서울시 강남구 테헤란로 1/)).toBeInTheDocument();
    });
  });

  // ── 결제 정보 ─────────────────────────────────────────────────────────────────

  describe('결제 정보', () => {
    it('결제 수단을 렌더링한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makeOrder(),
        isLoading: false,
        isError: false,
      });
      render(<OrderDetail />);
      expect(screen.getByText('카카오페이')).toBeInTheDocument();
    });

    it('결제 상태를 렌더링한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makeOrder(),
        isLoading: false,
        isError: false,
      });
      render(<OrderDetail />);
      // "결제 완료"는 주문 상태 뱃지와 결제 상태 두 곳에 나타날 수 있으므로 getAllByText 사용
      expect(screen.getAllByText('결제 완료').length).toBeGreaterThanOrEqual(1);
    });

    it('결제 정보가 없으면 안내 문구를 렌더링한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makeOrder({ payment: undefined }),
        isLoading: false,
        isError: false,
      });
      render(<OrderDetail />);
      expect(screen.getByText('결제 정보가 없습니다.')).toBeInTheDocument();
    });

    it('배송비 무료를 표시한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makeOrder({ shippingFee: 0 }),
        isLoading: false,
        isError: false,
      });
      render(<OrderDetail />);
      expect(screen.getByText('무료')).toBeInTheDocument();
    });
  });

  // ── 네비게이션 ────────────────────────────────────────────────────────────────

  describe('네비게이션', () => {
    it('주문 내역으로 돌아가기 링크가 /orders로 이동한다', () => {
      (useOrderDetail as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makeOrder(),
        isLoading: false,
        isError: false,
      });
      render(<OrderDetail />);
      expect(screen.getByRole('link', { name: '← 주문 내역으로 돌아가기' })).toHaveAttribute(
        'href',
        '/orders',
      );
    });
  });
});
