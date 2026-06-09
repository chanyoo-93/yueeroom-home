import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('@/lib/hooks/useNewArrivals');

import { useNewArrivals } from '@/lib/hooks/useNewArrivals';
import EditorialHero from './EditorialHero';

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
    brand: brandName ? { id: 'b1', name: brandName, slug: 'brand' } : undefined,
    images: [],
  };
}

describe('EditorialHero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('로딩 중 우측 패널에 스켈레톤 2개를 렌더링한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<EditorialHero />);
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  it('상위 2개 상품의 이름과 가격을 렌더링하고 3번째는 표시하지 않는다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: {
        data: [
          mockProduct('1', '여름 린넨 원피스', 45000),
          mockProduct('2', '스트라이프 티셔츠', 28000),
          mockProduct('3', '데님 자켓', 62000),
        ],
        total: 3,
        page: 1,
        limit: 100,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<EditorialHero />);

    expect(screen.getByText('여름 린넨 원피스')).toBeInTheDocument();
    expect(screen.getByText('45,000원')).toBeInTheDocument();
    expect(screen.getByText('스트라이프 티셔츠')).toBeInTheDocument();
    expect(screen.getByText('28,000원')).toBeInTheDocument();
    expect(screen.queryByText('데님 자켓')).not.toBeInTheDocument();
  });

  it('브랜드명이 있으면 표시하고 없으면 표시하지 않는다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: {
        data: [
          mockProduct('1', '여름 린넨 원피스', 45000, 'ZARA KIDS'),
          mockProduct('2', '스트라이프 티셔츠', 28000),
        ],
        total: 2,
        page: 1,
        limit: 100,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<EditorialHero />);
    expect(screen.getByText('ZARA KIDS')).toBeInTheDocument();
  });

  it('히어로 배너 이미지의 src가 /banner.jpg이다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 100, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<EditorialHero />);
    expect(screen.getByAltText('유이룸 배너')).toHaveAttribute('src', '/banner.jpg');
  });

  it('섹션에 aria-label이 있다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 100, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<EditorialHero />);
    expect(screen.getByRole('region', { name: '에디토리얼 히어로' })).toBeInTheDocument();
  });
});
