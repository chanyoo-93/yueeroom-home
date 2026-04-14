import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
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

vi.mock('@/lib/hooks/useProducts');
vi.mock('@/lib/hooks/useCategories');

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useProducts } from '@/lib/hooks/useProducts';
import { useCategories } from '@/lib/hooks/useCategories';
import ProductsPage from './page';

function mockSearchParams(params: Record<string, string> = {}) {
  return {
    get: (key: string) => params[key] ?? null,
  };
}

function mockProduct(id: string, name: string, price: number) {
  return {
    id,
    categoryId: 'cat-1',
    name,
    description: null,
    basePrice: price,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    category: { id: 'cat-1', name: '상의', slug: 'top' },
    images: [],
  };
}

function mockCategory(id: string, name: string, slug: string) {
  return {
    id,
    name,
    slug,
    parentId: null,
    displayOrder: 0,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    children: [],
  };
}

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearchParams).mockReturnValue(
      mockSearchParams() as unknown as ReturnType<typeof useSearchParams>,
    );
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue('/products');
    vi.mocked(useCategories).mockReturnValue({
      data: [mockCategory('cat-1', '상의', 'top'), mockCategory('cat-2', '하의', 'bottom')],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCategories>);
    vi.mocked(useProducts).mockReturnValue({
      data: {
        data: [mockProduct('p1', '롬퍼', 25000), mockProduct('p2', '청바지', 35000)],
        total: 2,
        page: 1,
        limit: 20,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProducts>);
  });

  it('페이지 제목을 렌더링한다', () => {
    render(<ProductsPage />);
    expect(screen.getByRole('heading', { name: '상품 목록' })).toBeInTheDocument();
  });

  it('상품 목록을 렌더링한다', () => {
    render(<ProductsPage />);
    expect(screen.getByText('롬퍼')).toBeInTheDocument();
    expect(screen.getByText('청바지')).toBeInTheDocument();
  });

  it('URL의 categoryId 파라미터를 useProducts에 전달한다', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      mockSearchParams({ categoryId: 'cat-1' }) as unknown as ReturnType<typeof useSearchParams>,
    );

    render(<ProductsPage />);

    expect(vi.mocked(useProducts)).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat-1' }),
    );
  });

  it('URL의 sort 파라미터를 useProducts에 전달한다', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      mockSearchParams({ sort: 'price_asc' }) as unknown as ReturnType<typeof useSearchParams>,
    );

    render(<ProductsPage />);

    expect(vi.mocked(useProducts)).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'price_asc' }),
    );
  });

  it('URL의 minPrice, maxPrice 파라미터를 useProducts에 숫자로 전달한다', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      mockSearchParams({ minPrice: '10000', maxPrice: '50000' }) as unknown as ReturnType<
        typeof useSearchParams
      >,
    );

    render(<ProductsPage />);

    expect(vi.mocked(useProducts)).toHaveBeenCalledWith(
      expect.objectContaining({ minPrice: 10000, maxPrice: 50000 }),
    );
  });

  it('URL의 size 파라미터를 useProducts에 전달한다', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      mockSearchParams({ size: '100' }) as unknown as ReturnType<typeof useSearchParams>,
    );

    render(<ProductsPage />);

    expect(vi.mocked(useProducts)).toHaveBeenCalledWith(expect.objectContaining({ size: '100' }));
  });

  it('카테고리 필터 변경 시 router.push에 categoryId를 포함한 URL을 전달한다', async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as unknown as ReturnType<typeof useRouter>);

    render(<ProductsPage />);

    await userEvent.click(screen.getByRole('button', { name: '하의' }));

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('categoryId=cat-2'));
  });

  it('정렬 변경 시 router.push에 sort를 포함한 URL을 전달한다', async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as unknown as ReturnType<typeof useRouter>);

    render(<ProductsPage />);

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '정렬 기준' }),
      'price_desc',
    );

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('sort=price_desc'));
  });

  it('로딩 중 스켈레톤을 렌더링한다', () => {
    vi.mocked(useProducts).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useProducts>);

    render(<ProductsPage />);

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('상품이 없을 때 빈 상태 메시지를 표시한다', () => {
    vi.mocked(useProducts).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 20, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProducts>);

    render(<ProductsPage />);

    expect(screen.getByText('조건에 맞는 상품이 없습니다.')).toBeInTheDocument();
  });

  it('에러 발생 시 에러 메시지를 표시한다', () => {
    vi.mocked(useProducts).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useProducts>);

    render(<ProductsPage />);

    expect(screen.getByText('상품을 불러오는 데 실패했습니다.')).toBeInTheDocument();
  });

  it('총 상품 수를 표시한다', () => {
    vi.mocked(useProducts).mockReturnValue({
      data: { data: [], total: 42, page: 1, limit: 20, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProducts>);

    render(<ProductsPage />);

    expect(screen.getByText('총 42개')).toBeInTheDocument();
  });

  it('페이지네이션: 총 40개, limit 20이면 2페이지 버튼이 렌더링된다', async () => {
    vi.mocked(useProducts).mockReturnValue({
      data: {
        data: [mockProduct('p1', '롬퍼', 25000)],
        total: 40,
        page: 1,
        limit: 20,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProducts>);

    render(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2페이지' })).toBeInTheDocument();
    });
  });

  it('페이지 변경 시 router.push에 page 파라미터를 전달한다', async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useProducts).mockReturnValue({
      data: {
        data: [mockProduct('p1', '롬퍼', 25000)],
        total: 40,
        page: 1,
        limit: 20,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProducts>);

    render(<ProductsPage />);

    await userEvent.click(screen.getByRole('button', { name: '2페이지' }));

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('page=2'));
  });
});
