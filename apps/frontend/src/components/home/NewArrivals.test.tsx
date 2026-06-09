import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

vi.mock('@/lib/hooks/useNewArrivals');

import { useNewArrivals } from '@/lib/hooks/useNewArrivals';
import NewArrivals from './NewArrivals';

function mockProduct(id: string, name: string, basePrice: number, brandName?: string) {
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
    brand: brandName ? { id: 'b1', name: brandName } : undefined,
    images: [],
  };
}

describe('NewArrivals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('로딩 중 스켈레톤 카드 10개를 렌더링한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);
    expect(screen.getAllByRole('status')).toHaveLength(10);
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
        limit: 100,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);

    expect(screen.getByText('베이비 블루 롬퍼')).toBeInTheDocument();
    expect(screen.getByText('스트라이프 티셔츠')).toBeInTheDocument();
    expect(screen.getByText('29,000원')).toBeInTheDocument();
    expect(screen.getByText('19,000원')).toBeInTheDocument();
  });

  it('브랜드명이 있으면 표시한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: {
        data: [mockProduct('1', '베이비 블루 롬퍼', 29000, 'ZARA KIDS')],
        total: 1,
        page: 1,
        limit: 100,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);
    expect(screen.getByText('ZARA KIDS')).toBeInTheDocument();
  });

  it('상품 30개 이하이면 MORE 버튼이 없다', () => {
    const products = Array.from({ length: 30 }, (_, i) =>
      mockProduct(String(i), `상품 ${i}`, 10000),
    );
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: products, total: 30, page: 1, limit: 100, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);
    expect(screen.queryByRole('button', { name: 'MORE' })).not.toBeInTheDocument();
  });

  it('상품 31개이면 MORE 버튼이 표시되고 클릭 시 31번째 상품이 보인다', () => {
    const products = Array.from({ length: 31 }, (_, i) =>
      mockProduct(String(i), `상품 ${i}`, 10000),
    );
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: products, total: 31, page: 1, limit: 100, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);

    expect(screen.queryByText('상품 30')).not.toBeInTheDocument();
    const moreBtn = screen.getByRole('button', { name: 'MORE' });
    expect(moreBtn).toBeInTheDocument();

    fireEvent.click(moreBtn);
    expect(screen.getByText('상품 30')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'MORE' })).not.toBeInTheDocument();
  });

  it('빈 상태 메시지를 표시한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 100, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);
    expect(screen.getByText('등록된 신상품이 없습니다.')).toBeInTheDocument();
  });

  it('에러 상태 메시지를 표시한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);
    expect(screen.getByText('상품을 불러오는 데 실패했습니다.')).toBeInTheDocument();
  });

  it('"신상품" 섹션 제목을 렌더링한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 100, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);
    expect(screen.getByRole('heading', { name: '신상품' })).toBeInTheDocument();
  });
});
