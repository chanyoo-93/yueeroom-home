import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/hooks/useNewArrivals');

import { useNewArrivals } from '@/lib/hooks/useNewArrivals';
import NewArrivals from './NewArrivals';

function mockProduct(id: string, name: string, basePrice: number) {
  return {
    id,
    categoryId: 'cat1',
    name,
    description: null,
    basePrice,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    category: { id: 'cat1', name: '상의', slug: 'top' },
    images: [],
  };
}

describe('NewArrivals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('로딩 중 스켈레톤 카드 8개를 렌더링한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);

    expect(screen.getAllByRole('status')).toHaveLength(8);
  });

  it('신상품 목록을 렌더링한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: {
        data: [
          mockProduct('1', '베이비 블루 롬퍼', 29000),
          mockProduct('2', '스트라이프 티셔츠', 19000),
        ],
        total: 2,
        page: 1,
        limit: 8,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);

    expect(screen.getByText('베이비 블루 롬퍼')).toBeInTheDocument();
    expect(screen.getByText('스트라이프 티셔츠')).toBeInTheDocument();
    expect(screen.getByText('29,000원')).toBeInTheDocument();
    expect(screen.getByText('19,000원')).toBeInTheDocument();
  });

  it('빈 상태 메시지를 표시한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 8, nextCursor: null },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);

    expect(screen.getByText('등록된 신상품이 없습니다.')).toBeInTheDocument();
  });

  it('에러 상태 메시지를 표시한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);

    expect(screen.getByText('상품을 불러오는 데 실패했습니다.')).toBeInTheDocument();
  });

  it('"신상품" 섹션 제목을 렌더링한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 8, nextCursor: null },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);

    expect(screen.getByRole('heading', { name: '신상품' })).toBeInTheDocument();
  });
});
