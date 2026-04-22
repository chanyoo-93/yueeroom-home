import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/hooks/useAdminInventory', () => ({
  useAdminInventory: vi.fn(),
  useUpdateInventoryQuantity: vi.fn(),
  useUpdateInventoryThreshold: vi.fn(),
}));

import AdminInventoryPage from './page';
import {
  useAdminInventory,
  useUpdateInventoryQuantity,
  useUpdateInventoryThreshold,
} from '@/lib/hooks/useAdminInventory';
import type { InventoryItem } from '@/lib/types/inventory';

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-1',
    variantId: 'var-1',
    quantity: 10,
    lowStockThreshold: 5,
    updatedAt: '2026-04-21T00:00:00.000Z',
    variant: {
      id: 'var-1',
      sku: 'TSH-M-WHITE',
      size: 'M',
      color: '화이트',
      price: 29000,
      product: { id: 'prod-1', name: '기본 티셔츠' },
    },
    ...overrides,
  };
}

const mockUpdateQuantityMutate = vi.fn();
const mockUpdateThresholdMutate = vi.fn();

describe('AdminInventoryPage', () => {
  beforeEach(() => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
    (useUpdateInventoryQuantity as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockUpdateQuantityMutate,
      isPending: false,
    });
    (useUpdateInventoryThreshold as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockUpdateThresholdMutate,
      isPending: false,
    });
    mockUpdateQuantityMutate.mockReset();
    mockUpdateThresholdMutate.mockReset();
  });

  it('로딩 중에는 로딩 표시를 보여준다', () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    render(<AdminInventoryPage />);
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();
  });

  it('에러 발생 시 에러 메시지를 보여준다', () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    render(<AdminInventoryPage />);
    expect(screen.getByText(/오류/)).toBeInTheDocument();
  });

  it('재고 항목이 없을 때 빈 상태 메시지를 보여준다', () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    render(<AdminInventoryPage />);
    expect(screen.getByText('재고 항목이 없습니다.')).toBeInTheDocument();
  });

  it('재고 목록을 테이블로 렌더링한다 (상품명, SKU, 수량)', () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeItem()],
      isLoading: false,
      isError: false,
    });
    render(<AdminInventoryPage />);
    expect(screen.getByText('기본 티셔츠')).toBeInTheDocument();
    expect(screen.getByText('TSH-M-WHITE')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('임계값 이하 항목에 부족 배지를 표시한다', () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeItem({ quantity: 3, lowStockThreshold: 5 })],
      isLoading: false,
      isError: false,
    });
    render(<AdminInventoryPage />);
    expect(screen.getByText('부족')).toBeInTheDocument();
  });

  it('임계값 초과 항목에 정상 배지를 표시한다', () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeItem({ quantity: 10, lowStockThreshold: 5 })],
      isLoading: false,
      isError: false,
    });
    render(<AdminInventoryPage />);
    expect(screen.getByText('정상')).toBeInTheDocument();
  });

  it('임계값 이하 항목은 bg-red-50 행으로 강조 표시한다', () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeItem({ quantity: 2, lowStockThreshold: 5 })],
      isLoading: false,
      isError: false,
    });
    render(<AdminInventoryPage />);
    expect(screen.getByTestId('low-stock-row')).toBeInTheDocument();
  });

  it('임계값 초과 항목은 normal-stock-row 행으로 표시한다', () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeItem({ quantity: 10, lowStockThreshold: 5 })],
      isLoading: false,
      isError: false,
    });
    render(<AdminInventoryPage />);
    expect(screen.getByTestId('normal-stock-row')).toBeInTheDocument();
  });

  it('부족 재고가 있으면 상단에 건수를 표시한다', () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        makeItem({ variantId: 'var-1', quantity: 2, lowStockThreshold: 5 }),
        makeItem({ variantId: 'var-2', quantity: 1, lowStockThreshold: 5 }),
      ],
      isLoading: false,
      isError: false,
    });
    render(<AdminInventoryPage />);
    expect(screen.getByLabelText('부족 재고 건수')).toHaveTextContent('부족 2건');
  });

  it('수량 수정 버튼 클릭 시 수량 입력 필드가 열린다', async () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeItem()],
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    render(<AdminInventoryPage />);
    await user.click(screen.getByRole('button', { name: '수량 수정' }));
    expect(screen.getByLabelText('수량 입력')).toBeInTheDocument();
  });

  it('수량 입력 후 저장 시 updateQuantity가 호출된다', async () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeItem({ variantId: 'var-abc', quantity: 10 })],
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    render(<AdminInventoryPage />);
    await user.click(screen.getByRole('button', { name: '수량 수정' }));
    const input = screen.getByLabelText('수량 입력');
    await user.clear(input);
    await user.type(input, '25');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(mockUpdateQuantityMutate).toHaveBeenCalledWith(
      { variantId: 'var-abc', quantity: 25 },
      expect.any(Object),
    );
  });

  it('임계값 설정 버튼 클릭 시 임계값 입력 필드가 열린다', async () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeItem()],
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    render(<AdminInventoryPage />);
    await user.click(screen.getByRole('button', { name: '임계값 설정' }));
    expect(screen.getByLabelText('임계값 입력')).toBeInTheDocument();
  });

  it('임계값 입력 후 저장 시 updateThreshold가 호출된다', async () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeItem({ variantId: 'var-xyz', lowStockThreshold: 5 })],
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    render(<AdminInventoryPage />);
    await user.click(screen.getByRole('button', { name: '임계값 설정' }));
    const input = screen.getByLabelText('임계값 입력');
    await user.clear(input);
    await user.type(input, '10');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(mockUpdateThresholdMutate).toHaveBeenCalledWith(
      { variantId: 'var-xyz', lowStockThreshold: 10 },
      expect.any(Object),
    );
  });

  it('취소 버튼 클릭 시 편집 모드가 닫힌다', async () => {
    (useAdminInventory as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeItem()],
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    render(<AdminInventoryPage />);
    await user.click(screen.getByRole('button', { name: '수량 수정' }));
    expect(screen.getByLabelText('수량 입력')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.queryByLabelText('수량 입력')).not.toBeInTheDocument();
  });
});
