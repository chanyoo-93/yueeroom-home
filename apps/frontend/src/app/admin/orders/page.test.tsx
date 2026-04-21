import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/hooks/useAdminOrders', () => ({
  useAdminOrders: vi.fn(),
  useUpdateAdminOrderStatus: vi.fn(),
  useUpdateAdminOrderTracking: vi.fn(),
}));

import AdminOrdersPage from './page';
import {
  useAdminOrders,
  useUpdateAdminOrderStatus,
  useUpdateAdminOrderTracking,
} from '@/lib/hooks/useAdminOrders';
import type { AdminOrder } from '@/lib/types/admin';

function makeOrder(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 'order-1',
    status: 'PAID',
    totalAmount: 30000,
    shippingFee: 3000,
    carrier: null,
    trackingNumber: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    user: { id: 'user-1', email: 'user@test.com', name: '홍길동' },
    ...overrides,
  };
}

const mockUpdateStatusMutate = vi.fn();
const mockUpdateTrackingMutate = vi.fn();

describe('AdminOrdersPage', () => {
  beforeEach(() => {
    (useAdminOrders as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
    (useUpdateAdminOrderStatus as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockUpdateStatusMutate,
      isPending: false,
    });
    (useUpdateAdminOrderTracking as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockUpdateTrackingMutate,
      isPending: false,
    });
    mockUpdateStatusMutate.mockReset();
    mockUpdateTrackingMutate.mockReset();
  });

  it('로딩 중에는 로딩 표시를 보여준다', () => {
    (useAdminOrders as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    render(<AdminOrdersPage />);
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();
  });

  it('에러 발생 시 에러 메시지를 보여준다', () => {
    (useAdminOrders as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    render(<AdminOrdersPage />);
    expect(screen.getByText(/오류/)).toBeInTheDocument();
  });

  it('주문이 없을 때 빈 상태 메시지를 보여준다', () => {
    (useAdminOrders as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { items: [], total: 0, page: 1, limit: 20, totalPages: 0 },
      isLoading: false,
      isError: false,
    });
    render(<AdminOrdersPage />);
    expect(screen.getByText('주문이 없습니다.')).toBeInTheDocument();
  });

  it('주문 목록을 테이블로 렌더링한다 (회원명, 금액, 주문일)', () => {
    (useAdminOrders as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        items: [
          makeOrder({
            id: 'order-1',
            user: { id: 'u1', email: 'a@b.com', name: '홍길동' },
            totalAmount: 30000,
          }),
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
      isError: false,
    });
    render(<AdminOrdersPage />);
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText(/30,000/)).toBeInTheDocument();
  });

  it('DELIVERED 상태 주문에는 상태 변경 드롭다운이 비활성화된다', () => {
    (useAdminOrders as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        items: [makeOrder({ status: 'DELIVERED' })],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
      isError: false,
    });
    render(<AdminOrdersPage />);
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('PAID 상태에서 SHIPPING 선택 시 송장 입력 모달이 열린다', async () => {
    (useAdminOrders as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        items: [makeOrder({ status: 'PAID' })],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    render(<AdminOrdersPage />);
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'SHIPPING');
    expect(screen.getByText(/송장/)).toBeInTheDocument();
  });

  it('송장 모달에서 carrier와 trackingNumber 입력 후 확인을 누르면 updateStatus가 호출된다', async () => {
    (useAdminOrders as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        items: [makeOrder({ id: 'order-abc', status: 'PAID' })],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    render(<AdminOrdersPage />);
    await user.selectOptions(screen.getByRole('combobox'), 'SHIPPING');
    await user.type(screen.getByPlaceholderText(/택배사/), 'CJ대한통운');
    await user.type(screen.getByPlaceholderText(/송장번호/), '123456789');
    await user.click(screen.getByRole('button', { name: '확인' }));
    expect(mockUpdateStatusMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-abc',
        status: 'SHIPPING',
        carrier: 'CJ대한통운',
        trackingNumber: '123456789',
      }),
      expect.any(Object),
    );
  });

  it('"송장 입력" 버튼 클릭 시 기존 값이 채워진 모달이 열린다', async () => {
    (useAdminOrders as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        items: [makeOrder({ status: 'SHIPPING', carrier: 'CJ', trackingNumber: '111' })],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    render(<AdminOrdersPage />);
    await user.click(screen.getByRole('button', { name: /송장/ }));
    expect(screen.getByDisplayValue('CJ')).toBeInTheDocument();
  });

  it('송장 수정 모달 저장 시 updateTracking이 호출된다', async () => {
    (useAdminOrders as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        items: [
          makeOrder({ id: 'order-xyz', status: 'SHIPPING', carrier: 'CJ', trackingNumber: '111' }),
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    render(<AdminOrdersPage />);
    await user.click(screen.getByRole('button', { name: /송장/ }));
    const carrierInput = screen.getByDisplayValue('CJ');
    await user.clear(carrierInput);
    await user.type(carrierInput, '로젠택배');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(mockUpdateTrackingMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-xyz',
        carrier: '로젠택배',
      }),
      expect.any(Object),
    );
  });
});
